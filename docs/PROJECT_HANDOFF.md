# Clanker AI — canonical project handoff

**Updated:** 2026-10-20 (documentation alignment).
**Repository:** https://github.com/dossja88/clanker-live-chat
**Branch:** `main` (the only branch returned by GitHub on audit).
**Verified app baseline HEAD before this docs-only change:** `75623cff5ae221699850993c4c9350c99985700a` — “Fix reactive avatar drift and align expression overlay (v2.5).”
**Visibility:** GitHub API reported **public**, despite past descriptions as private. Do not silently change visibility or disclose secrets.
**Other canonical references:** [`../AGENTS.md`](../AGENTS.md), [`../README.md`](../README.md), [`../index.html`](../index.html). This is the **single handoff**; do not create alternates.

## Scope and nonnegotiable decisions

Clanker is the original weathered off-white/copper/amber robotic gaming VTuber with cyan digital eyes, dark face, articulated antenna and asymmetrical details. The Crew advises, never directs gameplay. Personality: 60% innocent curiosity, 25% theatrical confidence, 15% dry sarcasm. Motto: “Gaming competency: unverified. Confidence: maximum.”

Pursue practical autonomous reasoning/gameplay/community interaction at $0 additional recurring cost, with native GitHub/browser tools and mobile/Xbox access. Billing disabled. Preserve v2.5 artwork/behavior, files, storage/recovery, privacy, history and approved safeguards. No Twitch broadcast, public uploads, new paid services, accounts/permissions, secret placement, production code changes or real game-control authorizations granted by this documentation update.

## Verified source and device evidence

- At audit, remote `main` contained **only** `index.html`. There were no existing `AGENTS.md`, `README.md`, `docs/` handoff, checked-in CI workflows or separate external test harness files. Docs added by this alignment fill those verified gaps without altering application code.
- `index.html` title/UI says **Clanker Brain Lab v2.5**; baseline application commit `75623cff5ae221699850993c4c9350c99985700a`. Avatar is a fixed portrait with SVG overlay; idle/talking/happy/smug/confused/surprised/panic/deadpan/glitch are implemented. Older CSS comment about “sprite frames” and the footer “V2.4” are stale text; **not** corrected in docs-only scope.
- In the prior project workflow, the nine expressions were reportedly checked in Chromium with consistent image dimensions and without JavaScript errors; treat this as historical report, **not** a fresh independent browser test.
- **Owner device observation 2026-10-20:** v2.5 looked “so much better” when opened in **Xbox Edge**. This validates perceived appearance on that device, not every Android layout. Prior **Android Brave** version had a higher/feminine-sounding voice; Xbox Edge voice was deeper and **preferred**. Current source uses device-default `speechSynthesis` with rate `0.96` and pitch `0.83`; specific installed voice is not selected. Do not claim cross-browser voice parity.
- In-app `runTests()` defines **25 checks**, including face selection, reaction tiers, suspicious viewer input, action allowlist, model-output validation, research/policy limits, analytics and backup validation. They are source-inspected, **not run in this documentation task**, and specifically exclude live APIs, Twitch and TTS. Live GitHub Pages deployment was not independently retrieved by the assistant; owner's Xbox Edge observation demonstrates page access on that device.

## Implemented versus missing functionality

**Code present, not equivalent to verified production:** offline scripted fallback; optional Gemini JSON responses and grounded game research with safeguards; browser voice; local memory with export/import and viewer-forget; synthetic chat tests; game-neutral encounter/regression simulator; optional auto loop while tab visible; reaction previews/soundboard, analytics, and channel-specific Twitch OAuth/EventSub WebSocket receive-only subscription with reconnect and message filters.

**Not live-verified / pending:** Twitch broadcaster account and Twitch developer application setup (owner confirmed **pending** at last check); broadcaster authentication/authorization, EventSub subscriptions and real incoming chat; optional Cheer/Points events; durable always-on hosting; any real game adapter or controls; voice consistency across devices. Twitch code does not post chat or initiate broadcasting. Android background tabs can be suspended.

**OAuth registration compatibility check (2026-10-20):** The current in-app guidance at `index.html`:116 recommends a **Public** app, but Twitch's current OAuth documentation says a Public client uses device-code flow and cannot use implicit grant; Clanker's code currently uses `response_type=token` implicit grant. This is **an unresolved real-integration mismatch, not a tested error**. Before registering the app, reconcile the app type and flow against official Twitch documentation. Do not put a client secret in browser source; do not assume the current “Public” tip works. Official reference: https://dev.twitch.tv/docs/authentication/getting-tokens-oauth.

**Security/privacy:** GitHub Pages is public; never commit Gemini API keys, Twitch tokens/client secrets, viewer data, local memory backups or streaming account data. Existing app uses local browser storage for nonsecret state and session-only user inputs for credentials. The user approved **documentation-only repo changes** for this synchronization; no workflow, application, billing, account or permissions changes.

## Automation audit — 2026-10-20

| Priority | Repetitive intervention / observed state | $0 route and status |
| --- | --- | --- |
| P1 | Context lost between ChatGPT sessions / manual pasted handoff; no prior GitHub docs | **Implemented in repo docs:** this one canonical handoff + README + AGENTS; future agents read/write through connected GitHub; test new-session reuse later. This does not make autonomous cross-chat messaging possible. |
| P1 | Manual upload/download bridge previously needed for code changes | GitHub connector can read and commit directly; verified available, and documentation write/remote verification completed in this sync (see commit history). Existing Pages remains the demo; no new deployment automation installed. |
| P2 | Repeated manual browser geometry/safety checks | **Proposed only:** Playwright/Chromium smoke + DOM/expression checks on ordinary free standard GitHub Actions public-repo runner (confirm present usage/billing/settings). No workflow authorized or installed. Keep one owner Xbox/Android perceptual sign-off for creative/audio. |
| P2 | Manual Twitch reconnect/account credential gate | Browser already has OAuth state validation, EventSub reconnect and filtering; real account and authorized app are required. No service/permissions automation can bypass owner's login/consent. Persistent host architecture requires separate feasibility/cost/security/approval review. |
| P3 | Manual checks of project/chat/Codex completion and repeat prompt exchange | Reuse GitHub as evidence/handoff; prepare Codex prompts + execution estimate only when truly needed. ChatGPT, Codex/Work, and plugin automations are **not verified** as bidirectionally connected; no schedule, polling or paid agent activated. |
| P3 | Manual backups/recovery | Existing local export/import requires owner action; future private sync would require provider permissions/security/design review and may not fit $0. Do not place personal backups in the public repo. |

**Tool choice:** Native connected GitHub operations fit existing scope without additional hosting, accounts or credit-consuming Codex/Work execution. Consider optional Actions after approval; potential cloud-browser plugins, Codex Automations, scheduled tasks, and free open-source hosts are **not presently configured/tested**. Do not rely on previously failing Codex Goals or assume zero-dollar always-on inference/streaming. No new recurring job authorized.

## Documentation synchronization record — 2026-10-20

- Before documentation update: source at baseline `75623cff...` with only `index.html`. Inspection performed via connected GitHub repo metadata, remote branch/commits, recursive file tree, index source and app regression definitions.
- Added `README.md`, `AGENTS.md`, and this **only** `docs/PROJECT_HANDOFF.md`, without editing `index.html`. This handoff records the pre-documentation baseline deliberately; use GitHub's latest commit/remote HEAD to identify the documentation commit itself.
- Tests applicable to documentation: inspect resulting tree/files and changed-path diff, verify only Markdown additions and fast-forward remote branch advancement. Browser/CI/live API tests were **not executed** by documentation alignment.
- Preserve this record on future handoff updates; append newer verified milestones and reclassify pending claims only with dated evidence.

## Next authorized step

**Owner-only blocker:** create Clanker broadcaster Twitch account and register its application as **Confidential** for the existing implicit-flow browser demo, using the exact app-shown redirect URI; keep credentials private. After owner confirms completion, check current `main` and Twitch developer docs, then perform **owner-consented receive-only** `user:read:chat` OAuth and EventSub test in an active browser, record real incoming-message evidence (no personal content), then update this handoff. Do not start broadcasting, grant optional scopes, or assume real game control.

## OAuth registration readiness — 2026-10-20 (source/documentation only)

- **Resolution of the earlier mismatch:** Official Twitch docs document implicit OAuth for browser-only JavaScript, but state that **Public client type is restricted to Device Code Flow**. Twitch's developer-forum guidance explicitly identifies **Confidential client type** as compatible with implicit grant. Sources: https://dev.twitch.tv/docs/authentication/getting-tokens-oauth and https://discuss.dev.twitch.com/t/what-type-of-client-to-choose/63638 .
- **Narrow source change:** The in-app Twitch developer registration guidance in `index.html` now says **Confidential**, not Public, for the **existing** `response_type=token` path. The authorization logic itself, existing state/nonce validation, `user:read:chat` default scope, EventSub code, avatar, CSS, models, local-storage keys, simulator and UI controls have not changed. No new secret, token, permission, scheduled job, host, dependency or paid tool was added.
- **Proof scope:** Static source comparison, JavaScript parse, DOM-ID references, expression/scope/auth invariants as applicable; GitHub diff and final HEAD verified after commit. **No actual Twitch developer account, live OAuth callback or EventSub delivery tested.** Browser-run regression, Android/Xbox voice, and live Pages propagation are separately unverified.
- **Minimum-scope initial setup:** Owner creates/verifies Twitch account and completes required 2FA, then registers the app in Twitch developer console as **Confidential** with exact OAuth redirect `https://dossja88.github.io/clanker-live-chat/`. A **Client ID** is public; **do not generate or submit a Client Secret** for this demo. Disable optional Bits/Points scope checkboxes for first receive-only chat test. User authorizes OAuth on their own browser; keep any access token out of chat/repo/screenshots.
- **Known limitation:** This fixes registration guidance, not operational proof. Implicit-flow tokens are session-only in current code; reconnect after token expiry is a user action. Real unattended operation, account-created state and any actual broadcast remain separate goals.
