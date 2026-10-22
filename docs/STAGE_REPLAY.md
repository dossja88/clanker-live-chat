# Offline 2048 Stage Event Replay Harness v1

## Overview

`src/offline-stage-replay.cjs` provides a dependency-free, synchronous CommonJS producer-to-receiver replay harness for local 2048 stage status event protocol v1. It combines:
1. `src/session-supervisor.cjs` (owner-authorized bounded 2048 session supervisor)
2. `src/stage-protocol.cjs` (Stage Protocol v1 projector, sorted JSON encoder, and versioned receiver)

The replay harness safely produces a deterministic, ordered sequence of sanitized stage-event JSON strings from an explicitly owner-authorized local game, and feeds those events into a fresh read-only receiver.

## Architecture & Replay Pipeline

```
 [ Owner Authorized Session ]
             │
             ▼
  ┌──────────────────────┐
  │  Session Supervisor  │  (2048-core + session supervisor)
  └──────────┬───────────┘
             │ Record Checkpoint
             ▼
  ┌──────────────────────┐
  │  projectStageEvent   │  (Stage Protocol v1 projector)
  └──────────┬───────────┘
             │ Sanitized Event Object
             ▼
  ┌──────────────────────┐
  │   encodeStageEvent   │  (Sorted JSON encoder, <= 2048 bytes)
  └──────────┬───────────┘
             │ Raw JSON String
             ▼
  ┌──────────────────────┐
  │ createStageReceiver  │  (Read-only receiver with revision checks)
  └──────────────────────┘
```

## Security & Safety Boundaries

- **Read-only renderer boundary, not owner authentication:** Stage-event payloads are sanitized display-only outputs; the replay receiver cannot execute commands. **The trusted host-supplied `authorizeOwner` callback alone decides start/stop authority.** The replay harness deliberately passes its caller's original `ownerContext` unchanged to that callback. A remote or renderer-supplied object that merely claims `role: 'owner'` is NOT authenticated or inherently rejected by the harness; the host must keep the authorization callback and its trusted context inaccessible to untrusted inputs. The included CLI's simple role check is a local demonstration only and must never be exposed as a remote access-control mechanism.
- **Instruction Injection Refusal:** Payloads containing forbidden operator or instruction keys (`action`, `command`, `operator`, `payload`, etc.) are rejected pre-parse and by the receiver.
- **Same-Revision Immutability:** Any attempt to alter non-sequence/non-timestamp game state within a same-revision event is rejected by the receiver.
- **STOP Persistence:** A stopped session cannot be un-stopped by replaying stale events or crafting same-revision payloads.
- **Copy & Immutability Protection:** Input contexts and produced event arrays/objects are deep-copied and frozen to prevent external state tampering.
- **Offline Safeguard Disclaimer:** These offline tests verify local CommonJS module mechanics. They **do not** establish internet security, network transport safety, or cloud deployment readiness.

## Verification & Usage

Run the offline test suite:
```sh
node tests/stage-replay.cjs
```

Run the short CLI demo:
```sh
node scripts/run-offline-stage-replay.cjs
```
