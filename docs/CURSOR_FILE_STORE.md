# Clanker read-only replay cursor: private single-host persistence candidate

**Candidate, not yet merged or deployed.** This design supplements accepted offline `stage-reconnect.cjs` checkpoints with a privately owned, single-host filesystem and a revision-guarded receiver wrapper. It is **not** authentication, a general cloud database, a remote browser transport, an encoder, a public stream, or durable owner permissions. The controlling Clanker game remains its approved bounded local 2048 engine.

## Files

- `src/cursor-file-store.cjs`: zero-dependency CommonJS `createCursorFileStore(absolutePath)` with `read()` and `commit(expectedRevision, canonicalCheckpoint)`. A record contains the strict checkpoint string, revision, SHA-256 integrity digest and versioned schema. A separate `.fence` file mirrors the logical revision/digest and latest epoch, lifetime, stage-revision, STOP floors.
- `bindDurableReceiver({store,receiver})`: wraps an already host-constructed `stage-reconnect.cjs` receiver and exposes only `receive()`, `rotateEpoch()`, `getLatest()`, `status()`, `revision()`. It atomically commits the **logical** cursor after each successful receive/rotation. If validation, storage, lock, CAS or output persistence fails, the in-memory wrapper is permanently sealed. The caller must reconstruct from verified private storage with a trusted host after investigating the failure.
- `tests/cursor-file-store.cjs`: creates only its own temporary POSIX-private directory using Node's OS temporary directory, tests first checkpoint, accepted STOP, restored epoch rotation, replay floors, stale revisions/writers, stale locks, corrupt JSON, torn fence pair, permission/symlink defenses, one-sided rollback, and a separate Node child process. Cleans only the directory it created. The test does not access the user's personal files or create credentials.

## Trusted lifecycle

1. The host supplies an existing private absolute filepath in a **pre-created owner-only (0700)** directory. No path is inferred from Drive, browser uploads, Twitch data or untrusted messages.
2. For an initial receiver, a trusted host initializes `stage-reconnect.cjs` with its existing explicit `authorizeOwner` callback, then binds the file store. The first accepted event persists version 1.
3. For a restart, read the private validated checkpoint, parse it using `parseReconnectCheckpoint`, construct a **fresh** receiver with the matching epoch and event limit, and call its **one-shot authorized** `restoreCheckpoint(checkpoint, trustedOwnerContext)` before binding. The bridge persists restored `mustRotate: true` to disk before it makes any incoming operation available.
4. The trusted owner authorizes `rotateEpoch(nextEpoch > previousEpoch)` on the bound receiver. Only then can the host pass offline sanitised `{epoch,json}` events to `receive()`. Each accepted event advances a monotonic cursor and persists its revision, counter and STOP history. A rejected event seals the wrapper; it does **not** automatically reset or allow a fresh start.
5. A stale writer with an older expected revision fails compare-and-swap. The local `.lock` uses exclusive creation and is not automatically removed after a process crash. On conflict or a torn `.fence` pair, stop and investigate; never auto-clear the lock, reinitialize or rewind counters.

## Crash/integrity boundary

Each file is written to a random same-directory 0600 temporary file, flushed and atomically renamed. Both checkpoint and fence receive validated canonical JSON, and a directory fsync is attempted on POSIX after the pair is written. **Two renames are not an atomic two-file transaction**: a power/process crash between them produces an unusable mismatch. This intentionally requires trusted manual recovery rather than automatic playback from an uncertain floor.

The companion fence detects an *accidental or one-sided* rollback, wrong digest or mismatched revision. **It cannot defeat replacement of both files by a same-user attacker or restore of an old full-disk backup.** A real cloud deployment needs an independently protected monotonic epoch/high-water counter, strong provider CAS with fencing, authenticated operator identity, encryption where private data is added, power-loss testing, and coordinated durable game STOP. The SHA-256 checksum here is integrity detection, *not an HMAC or proof of authenticity*.

Other limits: directory-level symlink check and per-file `lstat` are not a complete defense against a malicious concurrent process with the same OS-user privileges; on Windows, filesystem ACL ownership must be validated separately. This is not multi-host locking, a remote service, unattended task runner, or evidence of uptime. It is a local persistence reference until independent Node filesystem proof and hosting controls are accepted.

## Tests and acceptance gate

```sh
node tests/cursor-file-store.cjs
node scripts/run-offline-tests.cjs
```

**Verification update (2026-10-25):** An initial one-time GitHub Actions checkout of candidate commit `ac4034743f6a091bc3c8b884afc73f8a99d674bf` ran actual Node **v22.23.3**, passed **11/11 cursor filesystem tests** including a real child Node process, and **13/13 offline suites** ([run #40169755326](https://github.com/dossja88/clanker-live-chat/actions/runs/40169755326)). The earlier 11/11 synthetic harness checks remain valid but are no longer the strongest evidence for that original candidate.

**Verified security correction (2026-10-25):** `fs.existsSync()` follows symlinks, so a dangling checkpoint/fence or lock link could previously be mistaken for a missing file. The updated implementation now uses `lstatSync` for existence inspection and fails closed on dangling symlinks. Tests also inject a failure **between the two real filesystem renames** and verify that subsequent reads refuse a torn pair. [One-time native Node run #40169971590](https://github.com/dossja88/clanker-live-chat/actions/runs/40169971590) succeeded on source/test commit `76563247193384a19c00f377c90fbcfb33431b57`: **13/13 new cursor checks** and **13/13 existing offline suites** passed under Node **22.23.3**, including the genuine separate Node-process test. Exact tested source blob `403482fa6ce03b8c1dc4f4ea570da019b4e5b13e`; tests blob `d31a56ae8824fdce21007f9594073ef93f2d0d3b`. The temporary branch-only GitHub Actions workflow was deleted immediately after the successful run; no recurring CI or deployment was retained.

**Remaining scope and future requirements:** This is a tested **single-host local disk primitive**, not verified power-loss durability, tamper-resistant rollback protection against replacement of **both** files, distributed cloud storage, Windows ACL hardening, authenticated owner remote control, unattended deployment, or Twitch broadcasting. A trusted owner process must still resolve stale locks/torn pairs; never auto-reset them. Before a cloud host is approved, independently protect monotonic history, design distributed CAS/fencing and authenticated private controls, and measure real workload and storage under the approved platform.
