# Offline Stage Reconnect & Epoch Fencing Protocol

`src/stage-reconnect.cjs` provides a synchronous, dependency-free CommonJS wrapper around stage event receivers (`createStageReconnectReceiver`). It enables offline fenced renderer reconnection across distinct hosting sessions or epoch boundaries without allowing stale or replayed events to corrupt stage display state.

## Specification & Contract

### Factory Function
```js
const { createStageReconnectReceiver } = require('./src/stage-reconnect.cjs');

const receiver = createStageReconnectReceiver({
  epoch: 1,                          // Positive safe integer (>= 1)
  authorizeOwner: (context, action) => context === mySecretToken && action === 'rotateEpoch',
  maxEvents: 128                     // Safe integer 1..1024 (default: 128)
});
```

- **`epoch`**: Initial numeric fencing epoch. Envelopes matching this epoch are accepted.
- **`authorizeOwner(ownerContext, action)`**: Explicit trusted callback invoked during epoch rotation. Must return exact boolean `true` (promises, truthy strings/numbers are rejected).
- **`maxEvents`**: Hard lifetime accepted event limit across all rotations (1..1024).

### Receiver API Methods

#### `receive({ epoch, json })`
Validates and ingests a fenced envelope containing an encoded Stage Protocol event (`clanker.local2048.stage.v1`).
- **Envelope structure**: Plain object with *exactly* `epoch` (positive safe integer) and `json` (UTF-8 string parsed and size-bounded by Stage Protocol).
- **Epoch Fencing**: Rejects envelopes with `epoch !== currentEpoch` without altering state.
- **Monotonicity & Rollback Protection**:
  - Rejects revision rollback (`revision < highestAcceptedRevision`).
  - Rejects timestamp rollback (`at < lastAcceptedAt`).
  - Same epoch sequence cursor strictly increases.
  - Same-revision game-state fields must remain identical across duplicate emissions (ignoring `sequence` and `at`).
- **Reentrancy Protection**: Synchronous reentrant calls to `receive` or `rotateEpoch` while a mutation is in progress throw an error without altering receiver state.
- **Deep Immutability**: Returns a deeply frozen, detached copy of the accepted event.
- **Atomicity**: Failed operations throw an Error and leave all cursor/epoch/lifetime state completely untouched.

#### `rotateEpoch(nextEpoch, ownerContext)`
Rotates the active epoch to a strictly greater numeric value after owner authorization.
- Requires `nextEpoch > currentEpoch`.
- Invokes `authorizeOwner(ownerContext, 'rotateEpoch')`. Rotation proceeds ONLY if callback returns exact boolean `true`.
- **Reentrancy Protection**: Shared mutation-in-progress guard prevents reentrant calls to `rotateEpoch` or `receive` during `authorizeOwner` callback execution. Reentrant mutators throw without changing state; outer failure leaves initial state intact. Read-only methods (`status()` and `getLatest()`) remain accessible.
- **Cursor Reset**: Resets per-epoch sequence cursor to 0. Lifetime count, accepted revision floor, timestamp floor, and STOP protection are strictly preserved.
- Returns a frozen `status()` object.

#### `getLatest()`
Returns a deeply frozen, detached copy of the latest accepted event, or `null` if no event has been accepted yet.

#### `status()`
Returns a frozen snapshot of receiver state:
```js
{
  epoch: 1,
  totalAcceptedLifetime: 0,
  currentEpochSequence: 0,
  maxEvents: 128,
  latestRevision: null,
  stopEncountered: false,
  lastAt: null
}
```

---

## Security Boundaries & Caller Responsibilities

1. **NOT Authentication or Transport**: This wrapper does NOT authenticate network endpoints, encrypt communications, provide transport reliability, or manage network sockets.
2. **Synchronous Reentrancy Boundary**:
   - The receiver guarantees internal state atomicity and reentrancy safety by throwing if `receive` or `rotateEpoch` is invoked synchronously from within an `authorizeOwner` callback.
   - Any external side effects or state changes triggered within an `authorizeOwner` callback or object property getter before a receiver failure occurs are outside this wrapper's control and cannot be rolled back by this guard.
3. **Caller Responsibilities**:
   - The trusted host caller is strictly responsible for providing a **durable, monotonic epoch source** and securing the `authorizeOwner` context.
   - Caller must ensure envelopes originate from verified local observer projections.
4. **Display Protocol Only**: Stage envelopes never actuate the session supervisor or alter gameplay state.
5. **Offline Isolation**: Operates entirely offline with zero network, server, timer, or cloud dependencies.
