# Clanker AI — current project handoff

**Updated:** October 23, 2026. **Repository:** [dossja88/clanker-live-chat](https://github.com/dossja88/clanker-live-chat), **PUBLIC main**. Branch was verified at `5c99c6b1f8b809bd58e72c8fb7705877a1f82480` **before this docs-only consolidation**; always fetch latest branch HEAD on resume. Read [AGENTS.md](../AGENTS.md) for local safety/agent rules, then targeted docs. Update this snapshot in place after meaningful changes.

## Goal and currently demonstrated capability

Owner's target: characterful independent, **cloud-first autonomous AI VTuber**, playing actual games, maintaining coherent safe Twitch interactions, speaking and rendering without depending on Xbox/PC hosting. The existing [Brain Lab / stage](https://dossja88.github.io/clanker-live-chat/) and local 2048 engine demonstrate **real local/prototype gameplay and offline behavior**, **not** a deployed autonomous Twitch broadcaster or authenticated cloud game operator. Approved robot/voice/personality remain unchanged by these docs. Existing live Twitch EventSub tests were owner-observed historically; no live test was re-run in this batch.

## Most recent accepted milestone

- [Trusted reconnect checkpoint/restore PR #10](https://github.com/dossja88/clanker-live-chat/pull/10) integrated via [commit `521d6afe`](https://github.com/dossja88/clanker-live-chat/commit/521d6afe445d3d176db7c537e38c3d14d7a3417d). Exports strictly bounded canonical JSON, requires `authorizeOwner(context,'restoreCheckpoint') === true`, pristine receiver, fenced epoch rotation, STOP/revision/lifetime counts, no viewer/private context. **No secure persistent store, authenticated network or anti-rollback host is implemented by that parser alone.**
- [One-time GitHub Actions proof](https://github.com/dossja88/clanker-live-chat/actions/runs/39731693417) reported **SUCCESS**, real Node v22.23.3 with **12/12 full offline suites**, including **15/15 checkpoint** tests and 24 reconnect tests, against tested commit `76f509827e5a58e44a1824d1939bdeaea329045b`. Verified source/test/docs matching blobs in original handoff; temporary one-off workflow was removed. This is offline/regression evidence **not** a cloud durability or live Twitch proof.
- The earlier **direct Work ↔ Jules Talk to Jules** pilot did genuinely resolve two exact-SHA corrections in [PR #8](https://github.com/dossja88/clanker-live-chat/pull/8) and a steward protocol in [PR #9](https://github.com/dossja88/clanker-live-chat/pull/9). Prior `read_pr_comments` missing-tool/empty-commit failures mean neither a message nor a new SHA alone proves source change. Existing pilot concluded; **no new Jules dispatch** inferred from `go`. Check active PR/task queue before new work.
- The October 23 [competitor research](COMPETITOR_RESEARCH_2026-10-23.md) is research only: real character/co-performance and real observable gameplay are differentiated possibilities, not verified demand/revenue forecasts. Preserve original robot design; clip-candidate, live Twitch output and account scopes require separate permission.

## Present blocker / next concrete work

A **draft PR #11** was recorded in the original handoff for private local durable cursor persistence, **not merged or accepted in this summary**. Inspect the current PR head and branch ownership, then independently review/execute real Node tests for safe **local, private, versioned atomic cursor/CAS storage**. Preserve STOP, epoch fencing, symlink refusal, stale writer, corruption/rollback and cross-process restart safeguards. The accepted reconnect checkpoint parser cannot itself prevent file rollback or establish reliable cloud persistence.

After passing local security/storage review, test actual game-event-to-persona behavior using source-labelled private events, and define truly observable progress + nonbinding safe Crew suggestions. Do not replace live gameplay with scripted stand-ins or expose private viewer data.

## Gates and reference

No automatic cloud host, broadcast, additional Twitch scopes, credentials, payment, real game automation, public deployment or new creator Drive action is authorized. **$0 additional recurring cost** and original-owner approval prevail. Previous detailed Jules rules preserved in [prior policy reference](AGENT_POLICY_REFERENCE.md). Complete earlier ~160 KB handoff and PR/tree/source receipts remain available at [the exact pre-consolidation commit](https://github.com/dossja88/clanker-live-chat/blob/5c99c6b1f8b809bd58e72c8fb7705877a1f82480/docs/PROJECT_HANDOFF.md) without forcing every agent to reread it. This docs refactor does not synchronize ChatGPT/Codex project settings; setting changes require full replacement + owner installation confirmation.
