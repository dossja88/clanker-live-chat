# Bounded headless Clanker session supervisor

**Status: implemented local 2048 architecture milestone; not deployed.** This is a small, synchronous, Node-compatible controller for Clanker's original local 2048 puzzle. It is **not** Twitch streaming, an Xbox/Android dependency, an external-game actuator, a cloud provider, or an always-running daemon. The owner wants eventual cloud-first autonomous operation; these files make crash/resume and consent guardrails portable.

## Components

- `src/2048-core.cjs`: existing shared pure game rules, policy, deterministic RNG and checkpoint validation. The browser still embeds an exact synchronized copy for offline operation.
- `src/session-supervisor.cjs`: pure bounded game-session coordinator. Requires an explicitly supplied synchronous `authorizeOwner(context, action)` host callback and a transactional `read()/commit(expectedRevision,record)` storage adapter. **No default allow-all callback**. The coordinator itself never opens a socket, accesses an account or schedules a background task.
- `createMemoryStore()` in the supervisor: dependency-free in-memory CAS adapter for tests. Reconstructing the supervisor against the same adapter simulates process state loss, not disk persistence.
- `src/supervisor-file-store.cjs`: optional **local**, single-filesystem, privately-owned directory adapter. It stores only schema-versioned board/score/turn counts, seed, RNG state, budget, phase, revision. It uses exclusive `.lock` creation, checks revision while holding the lock, writes a new file at mode 0600, flushes that file and renames within the same directory. It does not automatically clear a stale lock, migrate corrupted checkpoints, guarantee hard-power-loss durability on every OS/filesystem, or perform distributed/multi-host transactions.
- `scripts/local-session-supervisor.cjs`: strictly bounded local operator CLI. This is an **offline reference interface**, NOT authenticated remote administration. `--owner-local` merely declares that the person who already controls the local process/path is invoking a privileged command. Never expose this flag as an HTTP/Twitch authorization mechanism.
- `tests/supervisor2048.cjs`: tests defaults, crash/resume, two-session boundaries, STOP, stale writes, ownership checks, file permissions, malformed state, and private local-file handling. Existing `tests/headless2048.cjs`, `tests/regression.cjs` and `tests/benchmark2048.cjs` are unchanged.

## State machine

```text
uninitialized
    │ [trusted owner approves seed + 128/512/1024 limit]
    ▼
 running ── legal move, persisted ───────────→ running
    │
    ├─ game reaches 2048 ────────────────────→ won
    ├─ no legal move ────────────────────────→ lost
    ├─ chosen move limit consumed ───────────→ capped
    └─ owner STOP saved ─────────────────────→ stopped

 won / lost / capped / stopped
    └─ no ticks; a NEW owner-approved session is required to start again
```

Every tick reads and validates the **persisted** previous record, reconstructs its PRNG from saved state, selects a legal move, produces a new immutable board and PRNG checkpoint, then commits board + RNG + phase + incremented revision as a single storage transaction. There is no uncommitted in-memory state that can advance a later move. The coordinator does not automatically start sessions, and there is **no unbounded retry** on I/O failure.

A restarted worker may continue a previously owner-approved `running` session *only within that saved game, budget and policy*. It cannot resume `stopped`, `capped`, `won`, or `lost` sessions. STOP is a durable state transition, not just cancellation of an in-memory timer. If STOP beats an in-flight tick to the revision lock, that stale tick fails closed. If a move commits just before STOP is accepted, STOP prevents further moves afterward.

The in-memory and optional local file adapters implement a revision compare-and-swap. An eventual cloud store must implement an **equivalent atomic conditional write**; arbitrary cloud object storage writes, naïve file overwrites, or simultaneous distributed workers do not satisfy the contract. External side effects such as Twitch chat or publisher game inputs are deliberately absent and require separate authorization and idempotency design.

## Manual, owner-private proof (optional Node 20+ environment)

Use any private future worker or test machine with Node installed. This is *not* a request to leave a personal PC or Xbox running.

```sh
mkdir -m 700 -p /tmp/clanker-private-proof
node scripts/local-session-supervisor.cjs --state=/tmp/clanker-private-proof/session.json --start --seed=1 --budget=1024 --owner-local
node scripts/local-session-supervisor.cjs --state=/tmp/clanker-private-proof/session.json --run=250
node scripts/local-session-supervisor.cjs --state=/tmp/clanker-private-proof/session.json --status
node scripts/local-session-supervisor.cjs --state=/tmp/clanker-private-proof/session.json --run=774
```

The local-puzzle seed 1 reaches tile 2048 on move 1,019, score 20,792, under the previous validated deterministic policy. The `--run` option accepts only **1–1024** synchronous ticks and cannot create a new session. To stop a running session:

```sh
node scripts/local-session-supervisor.cjs --state=/tmp/clanker-private-proof/session.json --stop --owner-local
```

Future `--run` invocations observe `stopped` and do nothing until a *new* authorized `--start`. The filesystem adapter **requires a pre-existing private directory** and an absolute file path. On POSIX, it rejects group/other-writable directories and files exposed to other users; it refuses symlinked checkpoint files. Do not choose a cloud-synced folder, web-served GitHub Pages folder, public repository, owner's personal Google Drive or shared storage.

If a crash leaves `session.json.lock`, **do not automatically delete it**. Confirm no writer is active, inspect the owning process and state, then resolve it through a trusted local operator. A corrupt JSON checkpoint also refuses to run rather than silently creating another game. Do not place private identities/tokens in any checkpoint.

## Boundaries and future integration

- **Authorization:** `authorizeOwner` is injected by a trusted host process; the CLI has no remote authentication and is only safe behind owner-controlled OS filesystem privileges. Do not invoke its `start/stop` functions from Twitch messages or public HTTP handlers. Browser chat is still receive-only/advisory, never a command executor.
- **No background hosting:** A CLI `--run` is a finite manual process, not a daemon, cron job, free cloud server, always-on bot, or public broadcast.
- **No remote production concurrency:** Exclusive lock + atomic rename are local filesystem primitives. Cloud storage requires stronger provider-specific conditional update guarantees, restart fencing, identity, encryption, expiry and owner controls before deployment.
- **No publisher-host input:** These are real steps on *Clanker's own local 2048 rules*, not automation of original 2048 website or an Xbox game. External game authorization remains separate.
- **No secret storage:** Saved records are bounded numerical game-only metadata. Owner callback context, Twitch/OAuth data, Gemini keys, viewer IDs/text, memory summaries and stream keys are never part of the state schema.
- **No spending or publishing:** No accounts, billing, cloud resources, scheduled Actions or new Twitch permissions are created.

## Tests and verification boundary

```sh
node tests/supervisor2048.cjs
node tests/headless2048.cjs
node tests/regression.cjs
node tests/benchmark2048.cjs
```

An isolated JS test harness exercised the exact candidate supervisor/store/test source with a mocked Node API and local file system. It verified seeded local win at turn 1,019 (score 20,792), owner STOP persistence, two-worker conflict ordering, 128-turn cap, invalid checkpoint refusal, local `.lock` and 0600/0700 privacy checks, and a split CLI start/run/stop/restart. This **does not** establish that `node tests/supervisor2048.cjs` ran in an actual Node process, or that real filesystem crash/atomicity, cloud, Xbox/Android, Twitch or video streams were tested. Actual Node and secure remote host tests remain to be done.

## Next technical step

Add a **minimal read-only headless event/status stream contract** that sends only aggregate public game state to a separate renderer, then a fail-closed private operator API with real host authentication and auditable session grants when a deployment environment is explicitly authorized. Give the persistent session worker a bounded timer/watchdog, resource measurements and graceful shutdown. Do not let a synthetic mock validation substitute for real system/device integration.
