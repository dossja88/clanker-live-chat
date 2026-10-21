# Clanker 2048 — reproducible policy benchmark (2026-10-21)

**Purpose:** Measure actual decision code on the project's own legal 2048 board mechanics. No external game, Twitch data, webcam, stream, device input, Gemini, real-viewer interaction or paid service is involved.

## Execution

From a checkout with Node.js 20+:

```sh
node tests/regression.cjs
node tests/benchmark2048.cjs
node tests/benchmark2048.cjs --json
```

`benchmark2048.cjs` uses only Node built-ins. It extracts the actual pure `slide2048`, `empty2048Spaces`, `hasLocal2048Move`, `rateLocal2048`, `scoreAfterChance2048` and `chooseLocal2048Action` functions from `index.html`; the current game logic is **not rewritten into a disconnected simulator**. The old rating heuristic is a deliberately frozen reference, otherwise using those same extracted movement and planning functions. All code runs in an isolated JavaScript context. Source validation and a same-seed repeatability check fail closed.

The game builder mirrors the current local rules: two starting tiles, legal directional movement, a merge occurring only once per pair, random empty spawn position, tile value 2 with probability 0.9 or 4 with probability 0.1, game end on no legal moves or reaching 2048, and at most **128 moves per game** to match the browser safety cap. Each seed uses a 32-bit LCG for spawns; the random-legal baseline uses a separate deterministic random stream for move selection. Same initial seed does **not** guarantee identical future tiles between diverging policies (occupied/empty locations differ).

There are two **distinct, predefined batches**: development seeds 1–24 and holdout seeds 101–124. Policies are (1) uniform random legal direction, (2) the frozen former Clanker policy, and (3) current Clanker. This is **48 games per policy**, 144 policy-game trials overall; any seed can be replayed by a future maintainer. The candidate was selected from several positional heuristic variants on the development range before checking holdout performance. The 24-game holdout is still small and is not a statistical guarantee of future wins.

## Results

These values were produced by the exact proposed GitHub source and exact benchmark runner in a connected **V8 isolate with Node-built-in API shims**, not by a real Node CLI, Android/Xbox hardware, live web game or Twitch session.

| Seed batch | Policy | Mean score | Median score | Mean highest tile | Reached tile 256 | Reached 2048 |
|---|---|---:|---:|---:|---:|---:|
| Development 1–24 | Random legal | 940 | 1,168 | 97 | 0/24 | 0/24 |
| Development 1–24 | Frozen previous | 1,487 | 1,356 | 165 | 7/24 | 0/24 |
| Development 1–24 | Improved candidate | **1,544** | **1,414** | **181** | **10/24** | 0/24 |
| Holdout 101–124 | Random legal | 1,020 | 1,236 | 100 | 0/24 | 0/24 |
| Holdout 101–124 | Frozen previous | 1,486 | 1,352 | 171 | 8/24 | 0/24 |
| Holdout 101–124 | Improved candidate | **1,542** | **1,402** | **181** | **10/24** | 0/24 |

Mean score increase versus previous: **+3.8% in both batches** after rounding. This is a **modest incremental improvement**, not mastery, learning, or a win rate improvement: nobody reached 2048 under this 128-move test horizon.

## Selected change and why

The retained two-step chance-aware policy still values open cells, immediate merge points and smoothness. The improved rating adds an **8-orientation snake-path positional score** (four possible corners, row- or column-first). Decreasing weights (`0.8 ^ index`) favor keeping larger values ordered together toward a corner. A corner bonus was increased from 70 to 120 and positional weighting added as `4 × best snake score`. Other planner weights, tie handling and owner-supplied advisory thresholds remain unchanged. This introduces **no new tools, account access, permissions, new persistent state, network requests, GPU support or external game control**.

## Limits and next decisions

- All outcomes are seeded offline games under a short move limit, not actual historical browser sessions. The separate in-browser evidence exporter records individual genuine local runs, not these synthetic benchmark trials.
- Results depend on the specified random generator, policy ties, seed set, move limit, and board heuristic. Future benchmark changes must document methodology and keep older results for comparison.
- Browsers on Xbox Edge and Android Brave may have different CPU and memory performance; no measurement of move-evaluation latency or speech animation has been made there.
- **Do not** claim a specific probability of winning 2048, generalized game-playing ability, neural learning or real-world account-game competence based on this data.
- Future no-cost work: benchmark longer horizons **separately** from the opt-in browser cap, add deterministic reference scenarios for tactical corner failures, and validate CPU responsiveness on target browsers when available. Avoid adding CI/scheduled costs or silently changing the cap.

Reversion is a normal code revert and restore of prior heuristic plus the corresponding handoff update, never a force push. This benchmark is a standalone, manual CLI tool; it is not a scheduled job.

## Extended 1,024-move horizon (2026-10-21)

Run the **separate** long-horizon mode:

```sh
node tests/benchmark2048.cjs --long
node tests/benchmark2048.cjs --long --json
```

The default command above (without `--long`) still runs exactly the historical **128 moves and 24+24 seeds per policy**, so the earlier evidence stays comparable. The extended run deliberately uses smaller **8 development + 8 holdout** seed batches per policy and a strict 1,024-move maximum. Both are non-billable offline model-free board simulations with identical rules to the in-page puzzle; the evaluator is extracted from the current `index.html`, and previous heuristic rating remains frozen. This does **not** start browser autoplay. Same-seed determinism is checked, and seeds use the existing independent game-spawn and random-baseline selection streams.

The table below was independently executed against the proposed app/benchmark blobs in the **connected V8 isolate with Node built-ins shimmed**, not actual Node CLI or a graphical browser. The seeds are few, the simulator does not measure Xbox CPU/TTS performance, and improvements on these particular seeds are not reliable population win-rate estimates.

| Seed group (8 games each) | Policy | Mean score | Mean turns | Mean highest tile | Reached 2048 |
|---|---|---:|---:|---:|---:|
| Development 1–8 | Random-legal baseline | 1,049 | 113 | 112 | 0/8 |
| Development 1–8 | Frozen previous strategy | 8,682 | 555 | 672 | 0/8 |
| Development 1–8 | Current positional strategy | **18,608** | 954 | 1,664 | **5/8** |
| Holdout 101–108 | Random-legal baseline | 1,180 | 125 | 112 | 0/8 |
| Holdout 101–108 | Frozen previous strategy | 10,716 | 658 | 832 | 0/8 |
| Holdout 101–108 | Current positional strategy | **15,265** | 868 | 1,088 | **1/8** |

The game UI now offers an explicit 1,024-move session because some trials genuinely reached the in-page 2048 goal with that horizon. It does not raise the default 128-move cap or bypass the STOP, tab-hide, account, streaming and external-game gates.

Additionally, `tests/regression.cjs` now verifies a **full game-rule autoplay** using deterministic seed 1: the browser game state actually accumulates legal moves and random spawns until 2048 at turn **1,019**, the timer stops, final status is won, and the evidence record is capped at 513 frames and correctly marked incomplete from the start. Other synthetic tests exercise the opt-in budget lock, invalid input falling back to 128, privacy-preserving selected Twitch advice, malicious and ambiguous vote rejection, forgetting, and disconnect handling. This is far stronger than a mere planning preview, but is still not an actual Xbox/Android browser run.

Long sessions may cause device heat, battery consumption and slow navigation; they only run while the owner keeps a page visible and have no pause-resume persistence after tab reload. Real-device performance requires an explicit smoke test, not inference from desktop or V8 results.
