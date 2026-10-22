# Jules collaboration and concurrency contract — Clanker pilot

## Empty Jules feedback commits — diagnosis before retries

A known pattern across both local Clanker pilots: Jules acknowledges PR comments but pushes a **new Git SHA with the same exact tree** (four zero-file commits). The first pilot additionally lost independent fixes when Jules republished its old tree. See the proof, provider reports, support packet and uncertainty boundary in `docs/JULES_FEEDBACK_INCIDENT.md`.

When a response commit arrives, check a locally available reviewed SHA against the new SHA: `node scripts/check-agent-feedback-diff.cjs --before <reviewed> --after <candidate>`. Codes: 0 changed paths (still requires semantic review), 2 identical trees/no path changes (feedback not implemented), 1 invalid/non-descendant/error. Run `node tests/agent-feedback-diff.cjs` to verify its synthetic real-Git scenarios. If NO_CHANGE, don't repeat PR nudges; inspect the existing Jules session activity/diff and git staging/upload sequence in Jules (authenticated UI/API if already available) before deciding whether the provider can incorporate the change. Keep task/branch writer separation and preserve completed evidence; no paid plan, extra task or continuous monitor is authorized for diagnostics.


## Jules session utilization and coordination

**Single coordination lane:** During the Clanker integration pilot, only one steward-coordinated GitHub workstream launches coding tasks or integrates changes at a time. Another ChatGPT/Codex/Gemini conversation may discuss or review, but must check `main`, the canonical handoff and current task/PR receipts before writable work. Keep one writer per feature branch.

**Reuse-first lifecycle:** Inventory existing Jules task links, actual session status where available, scope, PR and branch SHA before starting a new Jules job. If Jules confirms an active/paused resumable task is suited to its original work, use the task conversation and existing PR feedback for corrections, offline tests and finishing work. Avoid wasting a new task on status checking or restarting an already completed step. Preserve task logs, patches and review findings when complete. A completed or closed PR is **not proof that Jules can still work in that session**, so do not treat it as an endlessly reusable agent; use one new scoped task only if the current task is unsuitable or finished. Never repeat the first pilot's issue-label trigger just to revive PR #2.

**First pilot receipt:** https://jules.google.com/task/7194871727713726446 → original issue #1 and PR #2 (closed, unmerged); corrected implementation was integrated through PR #3. Jules's independent session state is **unverified** by the GitHub read connection. No new Jules task, scheduler, proactivity feature or fee is authorized merely by this documentation.


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

**Accepted pilot outcome:** Jules's original PR #2 was closed unmerged after reviewer-owned PR #3 was corrected, independently tested and squash-merged as `e805ba3`. The latest `main` version of this document is accepted collaboration guidance, but **no GitHub branch protection or required CI job enforces it**. Jules did not reliably assimilate the earlier feedback automatically; future agents must use separate branches and steward reconciliation.


### Optional offline scope guard (accepted; advisory only)

From a clean local agent feature branch, run `node scripts/check-agent-scope.cjs --base <accepted-main-SHA> --role executor` to check for edits to `AGENTS.md`, `README.md`, `docs/PROJECT_HANDOFF.md`, and this collaboration guide. The executor role exits 2 if protected documentation was changed, 1 for an invalid/dirty checkout, 0 if the path check passes. The `steward` role reports these changes but exits 0 so a human/agent can review meaning and approvals. This is only an **advisory diff scope check**: it does not prove reviewer identity, prevent commits, enforce branch ownership, or resolve semantic conflicts. It must never substitute for the mandatory exact-SHA and cross-PR review.

`node tests/agent-scope-check.cjs` was independently executed against six temporary Git history scenarios on Node v22.16.0 with git v2.47.3 (6/6 passed in the independent local execution environment); the remainder of Clanker's tests were not executed there. This reusable guard is now included in `main` via PR #3; run it explicitly in a local checkout when needed. It is not an automatic GitHub check.

### Advisory two-branch overlap preflight (provider-neutral)

After fetching both candidate branches into an offline local Git checkout, run `node scripts/check-agent-overlap.cjs --base <common-accepted-main-SHA> --left <agent-branch> --right <reviewer-branch>`. The read-only script verifies both tips descend from the explicit common base, compares all paths changed on both sides (including both endpoints of file renames), and flags **any** same-file overlap and any change to canonical policy/status Markdown. Exit codes: 0 CLEAR, 2 NEEDS_REVIEW, 1 invalid refs/base/error. A CLEAR result is advisory, never a substitute for security, semantic conflicts or final tests.

`node tests/agent-overlap.cjs` independently ran **8/8 PASS** using real Node.js v22.16.0 and Git v2.47.3 in temporary synthetic Git histories on 2026-10-22. Committed source blob SHAs match the independently tested local files. It neither contacts Jules nor launches GitHub workflows. This protocol and script are accepted into **`main` via PR #3** but remain opt-in local checks without server enforcement.

## Pilot acceptance

The integration may be considered working for initial coding **only** after verified GitHub issue→Jules acceptance→PR. It may be considered reliable for two-way review only when PR comments lead to correctly incorporated feedback without losing reviewed changes. It may be considered autonomous across projects only after idempotent queue/trigger behavior, exact-SHA review, tested outcomes and hard gates are proven. Current outcome: **GitHub issue→Jules coding PR YES; independently corrected, Node-verified integration YES; Jules autonomous review-response loop NOT YET; unattended cross-project orchestration NOT YET**. The successful merge required an independent integration steward.
