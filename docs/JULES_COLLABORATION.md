# Jules collaboration and concurrency contract — Clanker pilot

**Scope:** This is a reusable execution/safety procedure for the single Jules task tied to GitHub issue #1 and PR #2. Canonical project decisions, permissions and current status remain in `AGENTS.md` and **only** `docs/PROJECT_HANDOFF.md`.

## Proven end-to-end components

1. A permitted GitHub issue marked `jules` was accepted by Google Jules and linked to task `7194871727713726446`; no owner paste or separate Work run was needed.
2. Jules produced an offline 2048 stage-protocol implementation, claimed Node test results, and opened PR #2 to `main`.
3. A separate ChatGPT/GitHub reviewer identified an actual correctness flaw and tested the negative case against fetched source; a corrective patch `0ca6455` was committed directly to the Jules branch.
4. Jules's later commit `e653639` **removed that corrective patch**, proving that mixed branch writers can lose changes, even without a force push. Do not infer that PR feedback was independently processed.
5. The corrective commit is preserved on `review/clanker-stage-protocol-v1`. Neither branch was merged into `main`.

## Mandatory single-writer workflow

- **Dispatcher:** Check current task receipts, live `main` and active PRs before creating new Jules tasks. Never create duplicates. A `go` continuation is not permission to start a second Jules task, scheduled job, paid operation, or deploy.
- **Executor:** Jules alone modifies its current task branch until Jules work is definitely completed and ownership of the branch is explicitly transferred. All other agents review **read-only** at known SHA and post feedback rather than pushing onto that branch.
- **Reviewer:** Reproduce bugs with exact paths, failing inputs, code-level reasoning and test commands. Store proposed repairs on independently owned `review/` branches. Do not assume a GitHub comment is a guaranteed trigger.
- **Reconciler:** If Jules responds to feedback, check that its new SHA is a descendant of the last accepted work; diff it against the protected review branch, and explicitly preserve or reimplement the accepted repairs. If Jules appears finished and autonomous feedback is unproven, do not silently combine branches: create a separate review PR only as a bounded, authorized handoff, with no auto-merge.
- **Verifier:** Require actual Node.js 20+ runs of `node tests/regression.cjs`, `node tests/headless2048.cjs`, `node tests/supervisor2048.cjs`, `node tests/benchmark2048.cjs` and `node tests/protocol2048.cjs` on the **candidate SHA**. Distinguish Jules's attested runs, independent actual runs, and V8 shims. Confirm no credential/network/browser-deploy changes.
- **Gatekeeper:** Keep production branch, GitHub Pages, OAuth, private data, creator Drive, Twitch/broadcast and real game automation unchanged unless separately approved. Never bypass billing-disabled policy, history preservation, STOP semantics, rights approvals or privacy safeguards.

## Pilot acceptance

The integration may be considered working for initial coding **only** after verified GitHub issue→Jules acceptance→PR. It may be considered reliable for two-way review only when PR comments lead to correctly incorporated feedback without losing reviewed changes. It may be considered autonomous across projects only after idempotent queue/trigger behavior, exact-SHA review, tested outcomes and hard gates are proven. Current outcome: **initial coding YES; bidirectional safe review NO; unattended cross-project orchestration NOT YET**.
