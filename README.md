# Clanker AI — Brain Lab

Clanker is an original, endearing, slightly battered, confidently curious robot learning to play games and interact with **The Crew**. Motto: **“Gaming competency: unverified. Confidence: maximum.”**

## Canonical project records

- **Application:** [`index.html`](index.html). GitHub Pages serves this single-file HTML/CSS/JavaScript prototype at https://dossja88.github.io/clanker-live-chat/.
- **Contributor/agent instructions:** [`AGENTS.md`](AGENTS.md). Read before any development.
- **Single canonical dated handoff:** [`docs/PROJECT_HANDOFF.md`](docs/PROJECT_HANDOFF.md). Consult latest state, decisions, evidence, blockers and next action before each task.
- **Current development branch:** `main` unless the handoff and the GitHub branch HEAD explicitly establish otherwise. Confirm rather than assuming.

This GitHub repository is **public** as verified on 2026-10-20. Never commit access tokens, API keys, client secrets, personal viewer data, private source media, session backups, or other secrets. Public GitHub Pages is a demo, not an always-on bot service.

## Technical architecture and current capability

- The entire application and embedded portrait asset are in `index.html`. No package manager, build pipeline, checked-in external test runner or GitHub Actions workflow was present at the 2026-10-20 audit.
- Version 2.5 uses Clanker's fixed approved portrait and SVG face overlay with nine expressions: idle, talking, happy, smug, confused, surprised, panic, deadpan and glitch.
- Browser speech synthesis, local memory and export/import, offline scripted fallback, optional user-supplied Gemini API dialogue/research, chat filtering, analytics, Crew reactions and a **game-neutral regression simulator** exist.
- Twitch **receive-only** EventSub WebSocket / OAuth implementation is present in source. After onboarding the `ClankerLiveAI` account and `ClankerAI` developer application, the owner reported a **PASS** for real broadcaster-authored chat delivery through the opt-in self-test on 2026-10-20. This is an owner-observed browser test, not independent capture of Twitch API data or validation of normal third-party viewer chat. Clanker does not post messages to Twitch, broadcast or control a real game.
- The “autonomous” browser loop only advances the simulator while the page remains active. It is not unattended game control, a persistent live streamer or an approved game adapter.

## Reproducible safety and behavior tests

Run `node tests/regression.cjs` from the repository root using Node.js 20+ (no `npm install`, environment variables, credentials, network, or third-party packages). The script reads `index.html` and executes its real inline JavaScript with a **synthetic browser DOM**, then runs the built-in safety checks, five offline Crew/dialogue cases, and mocked Twitch EventSub WebSocket and manual-reply paths. An uncaught failure exits nonzero. The tool does **not** prove physical voice playback, real Twitch viewer delivery, browser geometry, Gemini output, real game control, or GitHub Pages deployment.

**Safety:** The fake Twitch token and IDs exist only inside the test process; outbound network calls are blocked/explicitly mocked. It never posts to Twitch or stores user data. It does not add a recurring job or CI infrastructure.

## Safe local review

1. Open the Pages URL on Android or Xbox browser; confirm the displayed version and expression controls. The owner's Xbox Edge visual review of v2.5 was favorable; Android Brave v2.5 remains untested separately.
2. Use the **Preview** selector and **Test voice + mouth**. Browser TTS voice depends on the device. The owner prefers the deeper voice heard on Xbox Edge; retain voice continuity, do not assume the same voice is available on Brave.
3. Run the in-app **Run safety checks** / regression button when appropriate. These checks are browser-executed assertions, not proof of live Twitch, real game control, real TTS behavior or security.
4. For any future feature change, verify JavaScript parse/DOM targets, nine-expression geometry and no-drift, safety tests, and supported browser flows. Log the date/device/results and unavailable checks in the canonical handoff. Do not invent execution results.

## Privacy, costs and approval gates

Target practical automation with **$0 added recurring operating cost**. Billing remains disabled. No paid API, expanded permission, secret upload, third-party account, new background job, broadcasting/publication, monetization or game automation permission may be enabled without specific approval. Protect approved character continuity, viewer privacy, existing local-storage keys and exported-memory recovery. Test read-only Twitch first using only needed scopes; account creation and developer authorization are owner gates.

## Next milestone

**Real Twitch broadcaster delivery: owner reported PASS on 2026-10-20.** The opt-in self-test confirms a single matching broadcaster-authored `channel.chat.message` EventSub notification arrived at the live Clanker page. It does not count as normal Crew chat or validate response generation. Next prioritize the existing in-app regression suite and safe dialogue tests, followed by genuine third-party viewer-message validation when an independently consenting viewer naturally becomes available. No second account or public broadcast is needed just to repeat the self-test. See `docs/PROJECT_HANDOFF.md` for evidence and next actions.

## Live/offline queue isolation (2026-10-20)

The read-only Twitch response queue is now separated from the simulated game chat queue. While Twitch is connected, **Reply to next selected message** uses only an eligible real Twitch message; normal simulator turns consume only offline requests. Disconnecting or losing the Twitch socket drops pending live viewer requests but preserves unrelated simulator input, avoiding accidental simulator actions and stale replies. The existing dependency-free regression runner now covers mixed-source queues and disconnection with mock EventSub traffic. These synthetic checks do **not** establish a new real Twitch response test.

## Local viewer-forget scope

The **Forget viewer** control (exact public username, owner initiated) clears a matched Twitch handle from the current live message list and reply queue, per-viewer memory/profile, on-device session rate-limit maps, and matching generated response labels/clip candidates. Its success diagnostic never repeats the forgotten handle. It does **not** delete Twitch-hosted messages or undo anonymous historical aggregate trend counts, which have no individual identifiers to target. The regression suite includes a synthetic live-message forget/privacy check. No additional OAuth scopes are needed.

## In-flight live-reply lifecycle guard

A live Twitch response is invalidated if the selected viewer is forgotten or the Twitch connection disconnects while a model request is still pending. The late output is not displayed, spoken, saved as a clip, or retained as a memory, and an error from that request cannot re-log the forgotten handle. The automatic live-response timer ignores simulator-only queue items. Offline synthetic regression tests cover these races; real browser, external model and third-party Twitch delivery still need separate validation.

## Post-reply privacy and queue fairness

When an owner forgets a viewer, Clanker also stops queued/current synthetic speech and clears the last saved and displayed response, which may contain viewer information even in old backups without attribution. This intentionally sacrifices only the last response for privacy; other game state and Crew records remain. Local simulator input has its own 15-entry bound and cannot evict up to six waiting live Twitch selections, and expired requests are pruned before live admission. These paths are covered by synthetic EventSub tests, not yet by a physical browser or a live third-party viewer.

## Observation and intent laboratory (read-only)

An expandable **Observation / Intent Lab** panel can copy bounded telemetry from the existing **simulator** or load a hypothetical example, accept a strictly validated manual JSON observation, consider a single-word Crew suggestion, and show a high-level candidate intent with reasons. The lab **never executes that candidate**, speaks it, sends it to an LLM, calls a game or API, changes the simulator, or saves the observation. Manual JSON cannot spoof a trusted game origin, and unknown signals bias the candidate toward observation. The contract, bounds, threat assumptions, security exclusions and future approval requirements are in [`docs/ADAPTER_CONTRACT.md`](docs/ADAPTER_CONTRACT.md).

**More natural Crew conversation:** Chat-only scripted fallback now answers greetings, wellbeing, game/play questions, tactical advice, praise, and self-deprecating teasing without implying that Clanker is actually in a playable game. Simulator turns retain their existing scripts and action permissions. Legacy memory backup imports remain compatible.

## First game-specific feasibility prototype — 2048

The manual **2048 board analysis** section under Observation / Intent Lab accepts a strictly validated 4×4 tile array, renders it, predicts all legal slides with merge-once scoring, ranks legal candidate directions with an explicitly simple one-step heuristic, and accounts for nonbinding Crew advice. A blocked board has no candidate. This does **not** read an external game's screen/DOM, transmit a key or swipe, advance a playable board, spawn a random tile, post to Twitch, or call a model; the printed outcome always says `execution: NONE`. Technical and rights research, limitations, and next authorization requirements are recorded in [`docs/GAME_2048_FEASIBILITY.md`](docs/GAME_2048_FEASIBILITY.md). This is a reviewable planning milestone, not real autonomous gameplay.

## Opt-in local 2048 gameplay — first actual playable puzzle

**CLANKER PLAYS 2048** adds a working 4×4 puzzle to the existing browser app. This is independently implemented local gameplay inspired by Gabriele Cirulli's MIT-licensed 2048, not an automation hook into the original hosted game. Click **New local game** to spawn two tiles. Use four on-screen direction buttons to play manually, **Clanker: one move** for an independently selected AI move, or **Start Clanker** for up to 128 automated legal turns (1.5 seconds apart). Each valid move merges pairs once, adds the earned score, and spawns a 2/4 tile. The game recognizes a 2048 win and a no-moves loss. Clanker's two-ply chance-aware heuristic is a simple experiment, not a proven winning strategy.

Start is opt-in; **STOP** immediately cancels autoplay, and hiding the page, starting a new board, winning/losing, or reaching the 128-turn cap also stops it. Manual owner-entered Crew advice may influence a near-tie but never executes viewer commands. Only the game's own in-memory board is changed. No game actions or gameplay data are stored in Clanker's local recovery schema, transmitted to Twitch, sent to Gemini or written to GitHub. Refreshing loses that game. The publicly served source code does **not** mean a remote party can see or control a browser session.

This is genuine gameplay against the puzzle code **embedded in this page**, not proof of manipulating a separate copyrighted/external game, Xbox/Android browser compatibility, unattended streaming, broadcaster operations, or model-based learning. A user must keep the page visible. The earlier manual Observation/Intent Lab and its `execution: NONE` outputs remain separate. See [2048 feasibility and execution boundary](docs/GAME_2048_FEASIBILITY.md) and the single canonical handoff.

## Gameplay evidence, actual-outcome commentary and optional speech (2026-10-21)

While **Clanker Plays 2048** runs, its real in-page puzzle state now shows **highest tile** and **open spaces** alongside score/turns. Every successful game turn records its direction, source (`Clanker` or `Owner`), merge points, random tile spawn, score, highest tile, open spaces and exact after-move grid in bounded tab-local history. An initial frame records both starting tile spawns. Use **Review actual moves** → Previous/Next/Show latest to examine *snapshots*, without rewinding or changing the active playable board. The browser holds at most 513 recent frames and visibly labels any truncated earlier history.

**Export local-game evidence (JSON)** is an explicit local download only; it contains no Twitch viewer text, API keys, accounts or memory backup and no external upload. Browser refresh or New local game discards that game's history. An exported log is proof of the current **local puzzle's reported sequence**, not authenticated footage, an external game session, or an independently verified Twitch stream.

Clanker's puzzle dialogue now reflects actual moves, merged points, board congestion and newly reached high tiles. **Occasional voice + expression** requires *both* its separate opt-in checkbox and the existing Voice on setting; commentary prioritizes significant milestones and avoids competing with an active chat response. Routine turns remain on-screen only. When asked about playing, the local chat fallback now truthfully acknowledges the active local puzzle, while messages and Twitch viewers still cannot issue moves. The old simulator's narratives, nine original v2.5 faces, existing TTS/voice preferences and memory schemas remain unchanged.

The expanded offline regression suite verifies replay immutability, genuinely spawned tile records, voluntary export and reset, chat truthfulness, zero extra game-network calls and privacy isolation. Actual physical Xbox Edge/Android Brave tests remain separate work.

## Measured 2048 strategy adjustment — 2026-10-21

Clanker's local 2048 move evaluator now considers how well high-value tiles align along one of eight corner-origin *snake* paths, in addition to open cells, merges, smoothness and probable next tile positions. A zero-dependency, **manual** benchmark command, `node tests/benchmark2048.cjs`, pulls the real game/planning functions from `index.html` and measures 24 development and 24 holdout seeds against the preceding policy and a random-legal baseline. It has no game/device/network privileges.

The improvement is **small but measurable in those synthetic seeds**: average 128-move score rose from 1,487 to 1,544 (development) and from 1,486 to 1,542 (holdout); the number reaching tile 256 rose from 7 to 10 and 8 to 10, respectively. **No policy reached 2048 in either 24-game batch.** The browser gameplay STOP, 128-move cap, per-session evidence, Crew boundaries and privacy controls are unchanged. Exact reproducible protocol, full three-policy table, limitations and environment are in [`docs/2048_BENCHMARK.md`](docs/2048_BENCHMARK.md). Real Node/target-device execution remains an independent verification gate.

## Marathon 2048 and opt-in live Crew advice — 2026-10-21

The in-page puzzle can now attempt a full 2048 game in an **explicitly started** session. Under **Clanker Plays 2048**, set the next-run budget to **128 (default)**, **512**, or **1,024** legal moves, then press Start. At the existing 1.5-second interval the 1,024 choice can occupy about 26 minutes if it does not terminate sooner. A run's budget is fixed at Start; changing the selector midrun cannot extend it. It stops on **STOP**, game won/lost, hidden tab, or the selected move cap. The game remains in the same local browser tab with session-only review and manual JSON export; starting again after the limit requires another owner click. No background/always-on agent, public broadcast or external game control is created.

**Experimentally demonstrated:** On seed 1, the full local autoplay path reached the actual 2048 tile on move **1,019**, reported the win, canceled its timer and kept only the last 513 review frames (export reports `completeFromStart:false`). This passed in an isolated JavaScript/DOM harness, not a physical Xbox/Android browser. A newly added `node tests/benchmark2048.cjs --long` command compares 1,024-move offline sessions across development and holdout seeds. In development seeds 1–8 the improved strategy won **5/8**; in separate holdout seeds 101–108 it won **1/8**. These *small synthetic cohorts* must not be described as a general win rate or live-stream record. The ordinary 128-move benchmark is unchanged; see [benchmark evidence](docs/2048_BENCHMARK.md).

**Optional Crew influence (still receive-only):** A separate unchecked **Consider consensus from eligible live Twitch Crew** box accepts *only* direction recommendations extracted from already-selected authentic EventSub chat entries; two different eligible viewers must agree on a single direction within 120 seconds. An explicit "go/move/slide LEFT/RIGHT/UP/DOWN" is required. Ambiguous, injected, unselected, broadcaster and stale events do not cast votes. Owner-selected advisory dropdown takes priority. Clanker can take the community direction only when the move is legal and close enough to his own preferred choice under the existing 15-point heuristic rule. **No viewer can invoke a turn, start/stop autoplay, alter settings, or control devices directly.** Temporary viewer IDs stay in tab memory only; forgetting a viewer, ending a run, starting a new game, opting out or disconnecting Twitch clears relevant votes. No extra OAuth scope, Twitch chat posting, persistent private data or paid provider was added.

Manual tests to complete when a physical device and a consenting external viewer are available: Xbox Edge/Android responsiveness for long sessions; actual EventSub third-party eligible-message vote delivery; browser TTS scheduling. Regression and benchmark harness success is *not* proof of those user/device journeys.

## Gameplay performance view and on-device timing check — 2026-10-21

A new **Performance view** button in **Clanker Plays 2048** switches the *existing* page into a focused layout: Clanker's approved v2.5 portrait remains the original SVG-faced DOM element beside the playable local board, real score/turns, commentary and STOP. Other lab, setup and credential panels are hidden from normal **visual display**, but no streaming, screen sharing, recording, new browser origin or secure credential isolation is created. Press the same button or Escape to return. This mode neither starts nor stops autoplay by itself and does not alter game state. STOP remains functional while focused.

Real puzzle milestones now drive Clanker's facial expression even if puzzle narration and global Voice are off, unless a live response or support reaction takes precedence. Spoken puzzle lines still require explicit opt-in. A separate **Check this browser** button performs three *read-only* calls to the actual 2048 move planner using the current board or a fixed sample and reports median/slowest local decision timing. It does not execute a move, persist device analytics, contact services or perform a long stress test. A small on-device check is not proof of full browser/voice compatibility. See [`docs/DEVICE_SMOKE_TEST.md`](docs/DEVICE_SMOKE_TEST.md) for an optional quick Xbox Edge/Android Brave checklist and precise verification exclusions.

## Separate clean display page for future VTuber capture — 2026-10-21

An optional [**read-only clean stage**](stage.html) mirrors the **actual local 2048 board and the original v2.5 reactive portrait**, along with score, turn count and bounded game-authored commentary, through a same-origin `BroadcastChannel`. Find **Open read-only clean stage ↗** next to the performance-view button in the Brain Lab. Unlike CSS-only focus mode, `stage.html` is a separate minimal HTML app with **no credential inputs, viewer identities, full chat log, Twitch calls, Gemini setup, local-memory backup or game-action code**. The cloned WebP portrait bytes and nine facial expressions exactly match the approved original source. The stage is a passive visual mirror—not a stream, game controller, persistent host, or secure attestation. Browser extensions and other same-origin pages are not cryptographically excluded from this display-only channel.

The source Brain Lab must remain active and visible; a hidden source tab may stop autoplay. The stage warns when updates become stale, refuses malformed snapshots and never executes inbound commands. Its face 'speaking' indicator does **not** generate audio; speech remains in the source page. No new Twitch scopes, app permissions, accounts, services, stored game state or monthly fees are introduced. See [clean stage architecture and limitations](docs/CLEAN_STAGE.md). Genuine same-browser/multi-tab and Xbox Edge/Android Brave verification is still required; passing the regression harness is not a public broadcasting signoff.

## Long-term destination: autonomous cloud-first Clanker (owner direction, 2026-10-21)

**This browser lab and clean stage are not the final operating architecture.** The finished Clanker should run approved gaming sessions, make decisions, remember safely, interact with The Crew, speak/render and recover from routine failures **without depending on a running Xbox, Android tab or owner's PC**. Those devices should be optional remote dashboards/owner emergency controls. A PC remains an acceptable temporary fallback for approved testing, not a required production host. The source engine and supervisor should evolve into a headless portable runtime, with a separate privacy-safe display/render/audio layer and—only under distinct Twitch/publisher/owner authorization—an encoder for a public stream.

This is a forward architecture decision, **not an existing cloud deployment or an authorization to broadcast**. Preserve $0 additional recurring cost, billing-disabled, receive-only Twitch, private viewer data, original v2.5 portrait and nine faces, existing local browser testing and safe owner approval gates. A permanent cloud video encoder may not be possible on a genuinely no-billing free tier; do not assume otherwise. See the phased [cloud-first autonomy architecture](docs/CLOUD_AUTONOMY_PLAN.md) for components, acceptance evidence and hosting tradeoffs. Current live implementation status remains in [`docs/PROJECT_HANDOFF.md`](docs/PROJECT_HANDOFF.md).

## Headless reusable 2048 engine — first cloud-independent game component (2026-10-21)

Clanker's actual local 2048 rules, tile spawning, chance-aware strategy, checkpoint validation and deterministic step logic now live in [`src/2048-core.cjs`](src/2048-core.cjs), **without any `window`, `document`, Twitch, model, network or host-game dependency**. The existing `index.html` still includes an *exact synchronized inlined copy* of the module to preserve its original downloadable, single-file, offline browser behavior. Its own game buttons now call `Clanker2048Core.createGame()` and `Clanker2048Core.advanceGame()` rather than maintaining a parallel second game implementation. The read-only manual observation lab shares pure slides but never actuates a real external game.

For a future Node/cloud worker, a **manual, bounded** CLI proof runs without a graphical browser:

```sh
node scripts/run-headless2048.cjs --seed=1 --moves=1024
node scripts/run-headless2048.cjs --seed=1 --moves=1024 --json
node tests/headless2048.cjs
node tests/regression.cjs
node tests/benchmark2048.cjs
```

The CLI has a strict 1–1024 turn bound per invocation, runs only Clanker's own independent 2048 rules, and sends **no** network requests, Twitch chat, game inputs, video or audio. JSON output includes game tiles, score and a game/seeded-PRNG checkpoint but **no account, private viewer or API fields**. The headless game test validates pure game state, illegal move fail-closed behavior, seed reproducibility, and identical outcomes after serializing/restoring both the board and PRNG state. A seeded 1024-turn run reached the 2048 tile on **turn 1019, score 20792** in the isolated JavaScript test harness; this is a test of a local puzzle, not external play or a real Node process.

For maintenance, **edit only `src/2048-core.cjs`'s marked engine block**. Then update the offline browser copy explicitly with `node scripts/sync-2048-core.cjs --write` and run `node scripts/sync-2048-core.cjs` to check exact parity. `tests/regression.cjs` additionally fails if the two copies diverge. No new dependencies, scheduling, accounts, billing, permissions, or cloud deployment. This is **Phase A groundwork**, not yet a persistent autonomous session supervisor. The canonical milestone status is in `docs/PROJECT_HANDOFF.md`.
