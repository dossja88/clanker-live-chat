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
