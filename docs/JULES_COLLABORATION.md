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

## Markdown conflict protocol (applies to all project agents after reviewed adoption)

**Maintainer/integration steward is the sole canonical Markdown reconciler.** The repository default branch carries the official `AGENTS.md` policy and the one canonical `docs/PROJECT_HANDOFF.md`. This is role-based, not exclusive to a particular AI provider. An agent's development branch contains only a candidate version.

1. **Before edits:** Read current `main` versions and record the target HEAD SHA, file blob SHA, branch ownership, and specific heading/section intended to change. Do not copy a stale handoff forward wholesale.
2. **During autonomous coding:** Jules/other executors edit source and task-scoped docs only on their own feature branches. Prefer a structured PR comment with `task/branch/HEAD/test result/blockers/proposed handoff text`; when required by task instructions, put a clearly marked *proposed* handoff update in that PR rather than presenting it as accepted project state.
3. **During integration:** The steward reads the latest main plus *each competing PR* (including any reviewer branch) and resolves handoff status/decisions by meaning and provenance, not by git line order. For conflicting edits to a common header, NEXT ACTION, gate, test claim or owner instruction, leave the PR pending until one version is explicitly selected, preserving any unresolved evidence.
4. **Safe write:** Minimal section-scoped edit, check file SHA before update and branch HEAD before commit, use expected-HEAD fast-forward without force. If either SHA moved or a semantic conflict appears, fetch and reconcile again; do not automatically overwrite or replay whole files. Git mergeable does not mean logically conflict-free.
5. **Commit evidence:** Record accepted merge/commit SHA, source PR/test evidence, authoritative NEXT ACTION and skipped/declined proposals in the single canonical handoff. A draft PR is not a published handoff. Never create a second canonical handoff to avoid conflicts.
6. **Hard gates:** Policy changes, authorization changes, visibility, private storage, credentials, fees and deployments are never automatically merged. No server-enforced rule, bot, scheduled scan, workflow, or Jules setting change is claimed until separately configured and tested.

For the present pilot: PR #2 is Jules-owned and PR #3 is reviewer-owned. Neither is integrated. The canonical `main` documents **do not yet include these rules**. This procedure is a proposal for adoption, not proof that GitHub will enforce it.

## Pilot acceptance

The integration may be considered working for initial coding **only** after verified GitHub issue→Jules acceptance→PR. It may be considered reliable for two-way review only when PR comments lead to correctly incorporated feedback without losing reviewed changes. It may be considered autonomous across projects only after idempotent queue/trigger behavior, exact-SHA review, tested outcomes and hard gates are proven. Current outcome: **initial coding YES; bidirectional safe review NO; unattended cross-project orchestration NOT YET**.
