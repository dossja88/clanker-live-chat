# Clanker — Xbox Edge / Android Brave device smoke test

This is an **optional owner-run manual checklist** for the existing Clanker site. It is NOT a test already completed by a developer or a prerequisite for the current GitHub commit.

**Open:** https://dossja88.github.io/clanker-live-chat/

Use the existing Clanker owner page on a browser where you ordinarily use it; no PC, second Twitch account, streamer app, screenshot upload, new API key, payment, new streaming permission or public broadcast needed.

## 1. Verify page and device speed (no game changes)

- Load the site normally and confirm the fixed v2.5 weathered cream/copper portrait with cyan eyes displays once without drifting.
- Find **CLANKER PLAYS 2048** and press **Check this browser**. The status should report a *median* and *slowest* time for **three read-only decisions** and should say no turns were executed. This deliberately times the browser currently running the page; results are **not** sent anywhere or stored.
- Check that the tile board has not started from the speed check alone.
- The timing is a very small CPU sample, not a guarantee of 26-minute autoplay, Twitch stability, battery/heat safety, FPS, networking or browser voice.

## 2. Check focused performance view (no broadcast)

- Press **Performance view**. The **same original SVG-faced portrait** and **local 2048 board** should be prominent, while unrelated lab/research/config panels are hidden *visually*. Score, real turns, commentary and **STOP** must remain visible.
- This is CSS presentation only. It does **not** purge credentials from the page, isolate other tabs, grant privacy security, create a second browser process, stream to Twitch, record media, or invite an audience.
- Click **Exit performance view** (or press Escape if that keyboard control is available). The normal lab returns; no game turns should change solely because of entering/exiting.
- On Xbox, use the pointer/remote focus controls if Escape is unavailable.

## 3. Confirm short game, STOP and portrait

- Press **New local game**; exactly two starting tile positions should be filled.
- Press **Clanker: one move**; actual turns should increase by one and the board should update. Check highest tile/open spaces.
- Leave **Occasional voice + expression** unchecked and confirm that gameplay text still changes. Major real milestones should update the existing nine-expression face without requiring sound.
- With **128 moves (default)** selected, click Start, then **STOP** after a few turns. The count must stop and remain still.
- Optionally set **512** or **1,024** only if you want a longer visible-tab test; you do not need to wait for a full marathon for the initial smoke. Hidden tabs intentionally stop autoplay.
- Enter the review panel to see older snapshots. It must never rewind the live playable board. Export of local session evidence is **optional** and remains on the device.

## 4. Voice and receive-only Twitch (separate)

- If testing TTS, use the established Voice on preference plus the puzzle's separate opt-in narration box. Voice selection depends on installed browser voices; deeper Xbox Edge voice and Android Brave cannot be assumed identical. Speaking face should not drift.
- You do not need to connect Twitch just to test local gameplay. If an already-authorized Twitch broadcaster connection is used, its chat integration remains **receive-only**. The Crew consensus option is off by default; it requires two selected live viewer suggestions to *influence* only legal near-tie moves. Do not create a second account to manufacture a test.
- **Do not** show or copy a Twitch access token, private Gemini key, OAuth callback fragment or account recovery information while testing.

## Reporting and expected evidence

Record, locally and only if convenient, the **browser/device**, whether the page loaded, whether portrait and board fit, whether STOP worked, whether one manual/AI move advanced, and the median/slowest device-check times. There is no automatic telemetry upload. A device check alone does not demonstrate long-run stability, Twitch deliveries, speech quality or broadcasts.

If the page does not display the new control, GitHub Pages may not have propagated the latest commit; compare the current `main` HEAD recorded in `docs/PROJECT_HANDOFF.md` and refresh once, without force-redeploying, uploading secrets or changing account settings.

## Current verified versus unverified

**Verified in source/mock tests:** JS parse, DOM element IDs, safe local game moves, STOP and hidden-tab handling, stage toggle/Escape behavior, game outcome facial reaction, device probe does not execute a move, Twitch synthetic privacy and queues.

**Not verified yet:** physical Xbox Edge or Android Brave rendering and button/focus behavior, installed browser voice, precise device timing, real third-party Twitch viewer consensus, uninterrupted long game, screen capture/public broadcasting, or production hosting.
