# Clanker cloud-first autonomous VTuber architecture

**Owner-directed objective (2026-10-21):** Clanker's final system should run independently without the Xbox, Android browser or a PC being left on. The owner's devices are optional access and emergency controls, not production infrastructure. Routine running, bounded game decision-making, session recovery and community-facing behavior should require minimal human intervention. This is a **target architecture**, not evidence of a cloud deployment or permission to broadcast.

## Current reality

- `index.html` is the public GitHub Pages browser lab with real **self-contained local** 2048 play, receive-only Twitch WebSocket EventSub, offline fallback, optional Gemini, original v2.5 portrait and nine reactive expressions, local recovery and safety checks.
- `stage.html` is an independent **read-only same-browser companion**. It mirrors sanitized local game data over BroadcastChannel. It is not a persistent runtime or stream encoder. Its separate UI does not by itself make a private, tamper-proof production server.
- Source/game/session state and speech still depend on a browser session being visible. Hiding it stops autoplay by design. This cannot be the production dependency.
- Existing seed tests and connected V8 mock regression runs are useful development verification but are not authentic cloud, physical device, third-party Twitch, TTS, or broadcast proof.
- GitHub Pages serves static content, not a perpetual agent process. GitHub Actions jobs are bounded, not a substitute for always-on streaming.

## Intended separated components

```text
          Optional owner dashboard (Xbox Edge / Android / PC)
                      │ authenticated control + emergency STOP
                      ▼
   ┌───────────────────────────────────────────────┐
   │ Cloud autonomous runtime (not GitHub Pages)   │
   │                                               │
   │ Supervisor: lifecycle, limits, health,        │
   │ restart/recovery, scheduled approved sessions │
   │                                               │
   │  Game engine / observations → AI/policy       │
   │          → rules guard → approved actuator    │
   │                                               │
   │  Twitch receive-only EventSub                 │
   │          → filter/privacy → advisory Crew     │
   │                                               │
   │  Minimal persistent game state, encrypted     │
   │  owner settings, protected secrets            │
   └───────────────────┬───────────────────────────┘
                       │ sanitized and authenticated state
                       ▼
              Render + locally approved voice
                       │ (optional dedicated media worker)
                       ▼
            Video/audio encoder → Twitch ingest
                    [separate go-live gate]
```

The current `stage.html` can inform the renderer, but origin-scoped BroadcastChannel is not the protocol for a cross-host production connection. Never bridge Twitch tokens, raw viewer records, Gemini keys, OAuth callback fragments or full local memory to the stage or a public spectator dashboard. A future remote state link needs strict schema/versioning, authenticated **owner** controls and a separately designed public sanitized display feed.

## Engineering phases and acceptance evidence

### A. Headless core — next in-scope development

Extract pure local 2048 board initialization, deterministic replay, strategy, and game step into a dependency-free module that can run with no document/window/DOM. Preserve the existing local browser application and all current test behavior. Use a thin browser adapter, not a second divergent rules implementation. Regression and seeded benchmark results must remain reproducible under **actual Node CLI** once source is locally available.

**Accept when:** identical seeded score/move traces in browser adapter and headless Node module, verified win/loss and no illegal actions, no network calls, preserved local memory formats, no need to keep any browser tab open for the headless engine.

### B. Autonomous session supervisor — development before public operation

A bounded state machine controls approved game selection, session start/stop, rate limits, game state and deterministic recovery after a process crash. A watchdog/restart flow can reconnect without losing track of active permissions. Owner-initiated STOP disables game actuation fail-closed; a fresh explicit approved session policy (duration/schedule/allowed game) must exist before production auto-start or auto-resume. Viewer input remains **advisory only**. Use no simulated encounters as false claims of real gameplay.

**Accept when:** a local test can crash/restart a mocked supervisor, restore a game checkpoint, replay consistently, uphold session budget, clear/forget viewer information, and never exceed allowed actions. No new cloud account or broadcast required.

### C. Cloud readiness — explicit future access gate

Compare genuinely free, no-billing-compatible hosting models on: reliable uptime, CPU/memory, storage, secure secret handling, networking/WebSocket/webhook reliability, deployment ergonomics and availability for a permanent process. A short-lived serverless handler might support event handling but cannot be assumed to host a heavy, continuously running renderer/encoder.

Candidate technologies require up-to-date feasibility checking. As of 2026-10-21, GitHub Pages is static; Cloudflare Workers Free has a **10 ms CPU-per-request** limit; Google Cloud free VM service requires a billing account, excluded by the owner's billing-disabled setting. Never create an account or activate billing solely to test an idea. Avoid metered/limited-credit browser agents and GitHub Actions perpetual loops under the rubric of free production hosting.

**Accept when:** an explicitly approved free hosting solution demonstrably meets the tested intended uptime and resource budget without incurring charges or exposing secrets. If not, report the no-$0-24/7 finding; keep working on offline cloud-ready source rather than silently provisioning.

### D. Protected service interface and optional offline/low-cost speech

Add secured owner-only status and emergency controls; keep a narrow read-only spectator/renderer data contract. Plan native/server-compatible speech synthesis, not a dependency on browser-specific Xbox TTS. Clanker's deeper, warm, slightly mechanical voice and nine original expressions must persist; new animation/voice machinery must respect the character. The language engine needs an offline fallback and conservative bounded model usage, not an unverified free unlimited AI API. Support per-viewer forgetting and data minimization in server-side storage.

**Accept when:** external unauthorized requests cannot influence gameplay, owner STOP works after reconnect/restart, memory recovery is deterministic and privacy tests pass, voice/render offline prototype remains $0 and does not leak private data.

### E. Media encoding and Twitch public stream — separate owner/platform gate

Video/audio encoding to the Twitch RTMP ingest endpoint consumes sustained CPU and outbound bandwidth and requires a protected Twitch stream key or appropriately scoped account grant. Merely receiving chat via EventSub does **not** make Clanker live on Twitch; the clean stage does not broadcast. Check Twitch and game publisher/host policy, owner game/mode authorizations and any production security controls **before** actual external-game automation or a public stream. Follow original content and monetization standards.

**Accept when:** a separately approved non-public end-to-end media test proves real encoded picture/audio and recovery with resource measurement, then distinct public go-live authorization and verified publisher rules. Never publish private channel credentials, Twitch tokens, Gemini keys, raw viewer records or owner cloud files to this public repository.

## Human intervention policy

**Do automatically** within previously approved constraints: select legal game moves, synthesize bounded Clanker commentary from observed game outcomes, recover from transient process failures, avoid viewer prompt injection, log health without PII, retry safely within limits, and stop on policy/security faults.

**Escalate only when necessary:** new publisher/host authorization, credentials or account linking, any payment or paid free-tier overage risk, streaming/publishing permission, expanded Twitch permissions, sensitive personal data/forget failures, irreversible changes, or repeated unresolvable operations. An emergency stop and a periodic review/status option should remain even if all normal sessions are hands-off.

Autonomy means reliable **approved** operation, not universal access, unsupervised purchasing, bypassing site rules, or viewers directing game controls. Not every game will permit automation; maintain the local approved 2048 case until other games are individually checked.

## Cost and architectural decisions (2026-10-21)

- Preserve **$0 additional recurring expense** and **billing disabled**; no automatic provisioning, new accounts, CI jobs, deployment, streaming, tokens, secrets or OAuth scope expansion from this plan.
- Prefer splitting light decision/chat/control plane from heavier optional renderer/encoder; cost and uptime depend mostly on sustained rendering, AI inference and outbound video.
- A PC can serve as a temporary private fallback test host **if later useful**, but it is not required and must not become the final architecture's dependency. Neither Xbox nor phone is a production server.
- Continue using public `dossja88/clanker-live-chat` `main` and existing `docs/PROJECT_HANDOFF.md` as canonical current state. Keep this file as the **strategy**, not a duplicate transient status handoff.

## Authoritative external constraints (checked 2026-10-21)

- GitHub Pages is static: https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site
- Twitch EventSub transports and subscription expectations: https://dev.twitch.tv/docs/eventsub/
- Twitch video ingest/encoder requirements: https://dev.twitch.tv/docs/video-broadcast/
- Cloudflare Workers Free CPU limits: https://developers.cloudflare.com/workers/platform/limits/
- Google Cloud Free Tier billing prerequisites: https://docs.cloud.google.com/free/docs/free-cloud-features

## Phase A implementation notes: headless pure game core (2026-10-21)

The reusable `src/2048-core.cjs` defines `createGame(random)`, `advanceGame(checkpoint, direction, random)`, `assertGame(checkpoint)`, `seededRng(seed)` (including a serializable `checkpoint()` of deterministic RNG state), `chooseLocal2048Action()`, and the original pure movement/scoring functions. Board and score transition return new state rather than changing the caller's object. The Core applies only Clanker's own approved **local 2048**, not a publisher game or general-purpose external automation. Invalid checkpoint shapes, contradiction of game status, out-of-range tiles and illegal directions fail closed.

**Offline single-file compatibility:** The browser continues to include the *same marked module code inline*, checked byte-for-byte against `src/2048-core.cjs` by the regression runner. This is intentional code embedding instead of a second independent algorithm. `scripts/sync-2048-core.cjs` has a default compare-only mode and a separately explicit `--write` path. The browser adapter consumes the shared `createGame/advanceGame` methods and keeps UI, owner STOP, voice and history separately.

The headless CLI `scripts/run-headless2048.cjs` is **manual and bounded**, not a daemon. The next part of Phase A/B is a bounded session coordinator that can consume these serializable board/PRNG checkpoints, prove fail-closed recovery, enforce owner STOP across restarts and later integrate an actual approved game and rendering host. Do not mistake a single manual CLI run or deterministic local puzzle victory for 24/7 cloud autonomy.

## Phase B implementation: bounded recoverable local supervisor (2026-10-21)

`src/session-supervisor.cjs` is a portable, synchronous orchestrator built on the pure 2048 engine. `createSupervisor({store,authorizeOwner})` requires explicit host-managed authorization and a transactional store interface: `read()` plus `commit(expectedRevision,nextState)`. No default owner permission is granted. `start` requires a trusted callback response and one of the existing 128/512/1024-move budgets. A live `running` session stores its RNG and whole game atomically after **every** legal move. A reconstructed supervisor may resume that bounded session, but a persisted STOP, loss, win or cap prevents continuation. A stale concurrent worker cannot overwrite a STOP because the revision CAS fails. Neither Twitch viewer opinions nor CLI argument text are accepted as owner credentials.

The memory adapter verifies restart semantics; `src/supervisor-file-store.cjs` provides an optional owner-controlled **single-filesystem** lock + atomic rename checkpoint adapter for a later private Node host. It fails closed on unknown owner paths, unsafe permissions, corrupted state, stale locks and concurrent revisions. Its local-disk semantics are **not** sufficient by themselves for distributed cloud storage: the future deployment must provide host-authenticated owner controls, strong conditional writes/fencing, encrypted storage if sensitive data is ever added, crash recovery policies, secrets handling, and tested shutdown under actual Node. Source is free/dependency-free; this update provisions no server or account.

The manual `scripts/local-session-supervisor.cjs` demonstrates finite start/status/run/STOP processes without background jobs, and `tests/supervisor2048.cjs` exercises failure/race cases. `docs/SESSION_SUPERVISOR.md` owns detailed operational cautions. **This is a Phase B code foundation, not continuous cloud autonomy or a broadcasting pipeline**. Production hosting, authenticated remote operator controls, Twitch ingest, voice/media and real publisher game inputs remain distinct proof/authorization gates.
