# Read-only committed stage observer (offline)

`src/read-only-stage-observer.cjs` is a small, synchronous, **manual-call** bridge between an owner-controlled local 2048 checkpoint reader and the existing `clanker.local2048.stage.v1` display protocol. It does not launch sessions, tick the game, schedule polls, expose HTTP/WebSocket endpoints, connect to Twitch, or authenticate owners.

A trusted host supplies only a `read()` callback to a store that implements the existing `read()/commit()` contract. The observer exposes **only** `sample(at)` and `status()`. The host explicitly invokes `sample` with a nonnegative integer timestamp. On a newly committed revision, the observer validates the supervisor checkpoint, uses the pre-existing Stage Protocol projector/encoder/receiver, and returns an immutable envelope containing an encoded JSON display event, revision, sequence and phase. Stable identical revisions return `null` and do not consume capacity. The observer rejects same-revision record mutation, rollback, disappearance of a previously observed checkpoint, invalid timestamps and exhausted capacity. A skipped revision is allowed: this is a **current-state sampler**, not an event-sourced record of every intermediate move.

```js
const Supervisor = require('./src/session-supervisor.cjs');
const { createReadOnlyStageObserver } = require('./src/read-only-stage-observer.cjs');
const store = Supervisor.createMemoryStore();
const OBS = createReadOnlyStageObserver({ read: () => store.read(), maxEvents: 128 });
// Later, after a separately authorized local supervisor has committed state:
// const event = OBS.sample(1000); // {json, revision, sequence, phase} or null
```

**Security boundary:** Only a trusted host owns the writer and `authorizeOwner` callback. Stage-event JSON and `status()` are **not authenticated**, confidential, or protected against replay after a receiver reset. A renderer must never use them to create owner commands. No viewer/session identifiers, credentials or raw RNG state are included. **Do not expose this adapter as a public API or treat it as a full cloud event relay.** The observer's in-memory sequence cursor is not durable; on restart, a host must negotiate a separately authorized new receiving epoch or persist a trusted cursor with proper fencing. This code alone does neither. A hard maximum of 1,024 emissions per observer protects against indefinite work, but does not enforce wall-clock CPU or network limits.

**Test:** `node tests/read-only-stage-observer.cjs`. For wider regression evidence run all existing offline suites, including the supervisor and Stage Protocol suites. No dependencies, scheduler, CI installation, network or hosting required.
