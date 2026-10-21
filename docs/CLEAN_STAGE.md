# Clanker read-only clean stage

## Purpose and entry point

The optional `stage.html` page is a **standalone visual companion** to `index.html` on the already-existing GitHub Pages origin:

- Controller: `https://dossja88.github.io/clanker-live-chat/`
- Clean stage: `https://dossja88.github.io/clanker-live-chat/stage.html`

The Brain Lab has a link **Open read-only clean stage ↗** in the local 2048 panel. This opens a separate page with Clanker's existing fixed portrait and all nine reactive SVG expressions, the real **in-page** 2048 board and its game-authored commentary. Its WebP image data is **byte-for-byte identical** to the original fixed portrait asset embedded in `index.html`; it is not a new character/sprite or third-party image.

This page has **no Twitch sign-in form, Gemini key input, owner memory backup, chat transcript, localStorage, sessionStorage, WebSocket, Twitch API, stream/video recorder, or game-control buttons**. It cannot perform gameplay actions. It does not automatically launch, schedule or authorize a public stream or provide a persistent host.

## Data-flow boundary

```text
Owner's index.html Brain Lab (active, visible browser page)
  ├─ original v2.5 face + local2048 game state
  ├─ Twitch receive-only and existing privacy controls remain here
  └─ BroadcastChannel("clanker.stage.v1")
      → clanker.stage.state.v1 [whitelisted local board and authored display data only]
          → stage.html [read-only visual renderer, no game actuator]
      ← clanker.stage.request.v1 [version-only harmless snapshot request]
```

Only the whitelisted fields are sent: message `type`, `version`, `at`, fixed `origin:local2048`, 4×4 tiles or null, current game score, move count, local game phase, running indicator, face name from the existing nine approved expressions, speaking boolean and at most **220 characters of local-game-authored commentary**. No viewer/user identifiers, raw Twitch messages, OAuth fragments, tokens, Gemini keys, account identifiers, private creator folder paths, memory/analytics/research summaries or secrets are added to this event. The game itself is unchanged; its executor remains in `index.html` only.

The stage validates the schema and recency (30-second window), face/phase enums, safe integer bounds and precisely sixteen zero-or-power-of-two tiles before rendering. It uses **`textContent` for all content** and a pre-defined SVG face generator; it does not execute HTML or instructions supplied through the channel. Invalid state cannot update its display. It sends only a versioned snapshot request every four seconds while open. A **12-second silence warning** labels stale state rather than pretending continuous connectivity. The source broadcasts on game board updates, authored commentary updates and face changes.

**Trust qualification:** BroadcastChannel works for supporting browsers on the same **origin**, not as authentication or end-to-end integrity. On GitHub Pages, other same-origin scripts from the owner's own sites or browser extensions can potentially transmit on that channel. The stage is therefore a **visualization, not authoritative audit evidence**. Do not treat it as a tamperproof display of the official external 2048 site. Its tiny public local-game payload intentionally contains no secrets or viewer details.

## Browser and streaming boundaries

Both pages must run under the **same origin and compatible browser browsing context** that supports `BroadcastChannel`. Source and stage do not need new OAuth scopes or account permissions. When switching away from Brain Lab, document visibility may stop the already running opt-in autoplay; a stage page cannot bypass this. No background agent is implied. Keeping the control page actively visible and on a supported device is still required, and no real Xbox Edge or Android Brave inter-tab validation has been completed.

The stage is **silent**: it renders the avatar's speaking indicator but does not synthesize speech. Audio continues to belong to the existing browser voice system in the source tab. Do not claim stage.html provides synchronized audio to a capture pipeline or live broadcast. Streaming/recording and persistent production operation still need separate owner authorization, publisher/platform review, privacy-safe architecture and an actual permitted host.

If a clean stage cannot connect, check that both links are served at the same site, the browser supports BroadcastChannel, the Brain Lab page is open, and the owner has not hidden/suspended that tab. No login or new account is necessary. The render-only page can safely show a disconnected/stale label rather than misleading activity.

## Evidence and testing

- `tests/regression.cjs` checks the **exact same portrait WebP bytes** in both pages, both inline scripts parse, the stage omits credential fields and sensitive APIs, controlled dummy BroadcastChannel requests cannot actuate the game, source message schema excludes viewer/secret data, malformed payloads cannot replace the rendered board, and visual elements are set through text rather than network or unsafe HTML insertion.
- All earlier in-page portrait, real local 2048 seeded win, game budget/STOP, Twitch receive-only/forget/race, memory and fallback checks remain.
- Tests executed so far only under the connector JavaScript V8/DOM/Node-built-in shim. **No genuine Node CLI, physical Xbox/Android browser, Pages delivery, real third-party viewer, TTS, OBS integration or live broadcast is verified.**

## Next meaningful milestone

Run actual Node/Chromium validation on exact files from the committed GitHub tree, then physically test the same-origin multi-tab link on Xbox Edge/Android Brave where available. Record whether the source is suspended when stage receives focus. If an owner later approves stream production, use an appropriate authorized persistent host and capture route that does **not** share OAuth token/owner memory UI with the public scene. Avoid adding credentials or livestream controls to `stage.html`.
