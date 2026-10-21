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

## Safe local review

1. Open the Pages URL on Android or Xbox browser; confirm the displayed version and expression controls. The owner's Xbox Edge visual review of v2.5 was favorable; Android Brave v2.5 remains untested separately.
2. Use the **Preview** selector and **Test voice + mouth**. Browser TTS voice depends on the device. The owner prefers the deeper voice heard on Xbox Edge; retain voice continuity, do not assume the same voice is available on Brave.
3. Run the in-app **Run safety checks** / regression button when appropriate. These checks are browser-executed assertions, not proof of live Twitch, real game control, real TTS behavior or security.
4. For any future feature change, verify JavaScript parse/DOM targets, nine-expression geometry and no-drift, safety tests, and supported browser flows. Log the date/device/results and unavailable checks in the canonical handoff. Do not invent execution results.

## Privacy, costs and approval gates

Target practical automation with **$0 added recurring operating cost**. Billing remains disabled. No paid API, expanded permission, secret upload, third-party account, new background job, broadcasting/publication, monetization or game automation permission may be enabled without specific approval. Protect approved character continuity, viewer privacy, existing local-storage keys and exported-memory recovery. Test read-only Twitch first using only needed scopes; account creation and developer authorization are owner gates.

## Next milestone

**Real Twitch broadcaster delivery: owner reported PASS on 2026-10-20.** The opt-in self-test confirms a single matching broadcaster-authored `channel.chat.message` EventSub notification arrived at the live Clanker page. It does not count as normal Crew chat or validate response generation. Next prioritize the existing in-app regression suite and safe dialogue tests, followed by genuine third-party viewer-message validation when an independently consenting viewer naturally becomes available. No second account or public broadcast is needed just to repeat the self-test. See `docs/PROJECT_HANDOFF.md` for evidence and next actions.
