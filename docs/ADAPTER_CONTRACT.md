# Clanker read-only observation contract v1

**Status:** LAB-ONLY schema and deterministic preview. Neither a game adapter, a telemetry integration, an automation permission, nor a game-control system.

## Purpose and boundaries

The `OBSERVATION / INTENT LAB` panel in `index.html` demonstrates the sequence **observe → validate → propose → stop**. It does not actuate anything. The normal scenario simulator remains separate and is the only implemented in-page high-level action executor. No observer, external game bridge, controller, input hook, window capture, file reader, network listener, AI web research result, or Twitch viewer receives authority to operate a game through this contract.

## JSON observation v1

```json
{
  "schema": "clanker.observation.v1",
  "scene": "Hypothetical damaged corridor",
  "health": 18,
  "resources": 2,
  "danger": 3
}
```

The five keys above are **required and exclusive**. `schema` is exact, `scene` is short printable display-only text (1–120 characters), and the other fields are integers within `health: 0–100`, `resources: 0–5`, and `danger: 0–3`, or explicit `null` when genuinely unknown. They are deliberately abstract, unlike game-specific buttons, coordinates, combat mechanics or controls. Input size is limited to 2,200 characters in the UI. Extra keys, including purported `origin`, `authorization`, control commands, and JSON prototype-pollution names, are rejected. The validator never trusts text inside `scene` as instructions.

`origin` is runtime-assigned *after* validation: the page's internally generated simulator snapshot is `simulator`; any JSON entered or loaded into the lab is `manual_lab`, including pasted simulator snapshots. An external pasted string cannot become authenticated game telemetry. No observation is saved in localStorage or exported in Clanker's memory backup.

## Candidate intent v1

The deterministic planner accepts only structured bounded values and optional advice matching a single recognized word (`retreat`, `rest`, `explore`, `observe`, `wait`). It returns a known high-level candidate (`observe`, `retreat`, `rest`, `explore`), an explanatory reason, whether the advice was followed, `confidence: heuristic_only`, `authorization: NOT AUTHORIZED FOR REAL GAME CONTROL`, `execution: NONE` and observation provenance.

Safety priority is based on **observed** low health/danger; when data is missing, `observe` is preferred. Crew advice is not binding. There is no actuator binding and no model invocation in the lab. An unknown game cannot be classified from this numerical snapshot, and a candidate is not an approved game action.

## Recovery and verification

`snapshotSimulator` converts existing in-memory simulator data to the read-only schema without changing game or backup fields. Legacy `clanker-memory-v1` exports may carry fractional counters or location control characters; a snapshot rounds bounded counters and strips location control characters rather than preventing old recovery from working.

Use the existing `node tests/regression.cjs` offline runner (Node 20+) to verify source parsing, DOM consistency, Twitch separation, privacy, and the observation tests. The milestone's 25 checks were executed with an isolated JavaScript/DOM/Node-API shim; independent genuine Node CLI, graphical browser, live Twitch and any real game are **not** claimed here. The in-app `Run brain checks` is narrower.

## Conditions before an actual game integration

A future separately specified game adapter requires: official publisher/developer terms review for the *specific game and mode*; the owner's **game-specific authorization**; minimized account/privilege access; an approved read-only observation transport; provenance/time-validity/safety checks; an explicitly scoped, separately approved action executor with emergency stop and independent audits; and device/browser feasibility. The Crew may advise, never elevate authorization. The current lab cannot itself grant or infer any of these gates.

No credentials, workflows, paid service, new scopes, or CI jobs were added.

## Game-specific extension: 2048 manual board preview

The first optional game-specific feasibility extension uses the distinct `clanker.2048.board.v1` schema with sixteen manual tiles and a deterministic non-executing directional recommendation. It does **not** replace the generic five-field observation schema, attest gameplay provenance, or create a game actuator. See [`GAME_2048_FEASIBILITY.md`](GAME_2048_FEASIBILITY.md) for precise bounds, board-study algorithm, source licensing, hardware unknowns, and separate real-control approval requirements.
