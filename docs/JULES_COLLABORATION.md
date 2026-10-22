# Jules collaboration and concurrency contract — Clanker pilot

## Verified coding/review/integration path

The pilot #3 task proved direct in-task review incorporation **twice**, followed by independent actual Node verification and accepted PR #8 integration. Exact commits, trees, merge receipts and limits are in the canonical handoff. Both prior PR-feedback failures remain valid historical evidence; the successful path supplied the actual review text through Talk to Jules rather than relying on `read_pr_comments`.

Use the operating procedure below for future suitable authorized assignments. Keep one writer per Jules branch; pin review and merge to exact GitHub heads. A changed tree must contain the intended source/test correction and pass semantic review, not merely documentation changes. Use `node scripts/run-offline-tests.cjs` for the full local suite and require both exit 0 and the explicit final `PASS n/n offline suites` summary. Focused negative probes remain necessary when existing green tests miss a defect.

This is an active-session steward workflow. No persistent dispatcher, automatic PR-feedback retrieval, required GitHub check or unattended merge worker is installed. Check current included/free quota before creating a task; the account-wide session meter is not a per-task cost ledger. Native Project Instructions have only a reviewable draft at `docs/PROJECT_INSTRUCTIONS_DRAFT.md`.


## Direct browser collaboration — verified operating procedure

The 2026-10-22 diagnostic exchange in existing task `7200037830362515152` proved direct ChatGPT Work → Talk to Jules → Jules report retrieval without owner prompt/answer relay. That initial diagnostic exchange alone did **not** prove corrective coding or unattended orchestration; pilot #3 subsequently proved two direct corrective cycles, while unattended orchestration remains unverified. Evidence and limits: [JULES_FEEDBACK_INCIDENT.md](JULES_FEEDBACK_INCIDENT.md); current status remains in the canonical handoff.

1. **Recover:** Read live main instructions/handoff and exact task/PR receipts. Confirm the task suits the original scope, current authorization, branch ownership and free-use limits. A closed superseded PR is diagnosis-only unless separately authorized; never recreate a job to repeat integrated fixes.
2. **Send once:** Use an existing authenticated cloud-browser task. Include a unique receipt, reviewed SHA, complete non-sensitive review text, reproduction, expected behavior, allowed paths, and explicit action limits. A link or notification alone may omit the actual feedback. Never send secrets, private viewer records or credentials.
3. **Wait and inspect:** Allow several minutes. Check the task's latest activity and **Ready for review / Commit message** cards, not only chat bubbles. In the verified exchange, Thinking ended before the delayed answer appeared. Its ending, the unchanged original diff count, or a short silent interval is not a failure gate. Do not send duplicate nudges while awaiting a response. There is no established SLA; record actual elapsed time where observable and leave an outstanding receipt for recovery if interrupted.
4. **Read without publishing:** A diagnostic report may be displayed inside the disabled commit-message field with the original +536/-0. Read it there; do not press publish/View publish options to obtain an answer. Verify acknowledgement of the actual receipt and instructions, distinguishing declarations from observed commands and backend inference.
5. **For separately authorized coding:** Require Jules's own scoped source/test changes, targeted and full applicable genuine Node results, local head/tree and nonempty diff before publication. Independently inspect the resulting GitHub head/tree, ancestry and semantic changes before accepting the response. A local/internal SHA may differ from exported GitHub SHA; compare content/tree rather than assuming identity.
6. **Recover safely:** On continuation, inspect the outstanding receipt and remote head before sending another instruction. Stop repeated no-change submissions. Keep one writer per Jules branch and steward-owned canonical documentation. If the existing task cannot provide required evidence, preserve the unresolved state; no new task, permission or credential change is implied.

### Reusable diagnostic message shape

Use only within an authorized existing-task investigation; replace placeholders with verified public/task data:

> Diagnostic receipt: <unique ID>. Task <existing ID>, PR <number>, reviewed GitHub HEAD <SHA>. Read the following exact question: <question/reproduction>. Acknowledge the receipt and restate the issue. Report available relevant tools and read-only Git status/head/tree/diff evidence if accessible. Label self-report, directly observed output, inference and unknown separately. Do not edit, stage, commit, push, publish, reopen PRs, create tasks or change accounts/settings. Respond in the task's normal report mechanism; no code publication is requested.

For future authorized implementation, replace the diagnostic-only limits with that task's specifically authorized paths/actions and test acceptance. Do not reuse this template to grant authority that the owner has not provided.

**Cost/automation boundary:** This reuses the existing signed-in browser and existing task; no API key, new service, recurring workflow or subscription was introduced. It saves owner prompt/answer transfers during active Work execution. No background worker, response-time guarantee, session persistence guarantee, or autonomous merge service is installed.

## PR feedback fallback — direct in-task message before accepting changes

**Task-specific root-cause evidence:** In pilot #2's authenticated task chat, Jules stated that it received a generic PR-comment notification requesting `read_pr_comments`, **without the comment bodies**, and the named tool was **not available**. Its local repo stayed clean at `da9b938...`; three separate platform submissions left the GitHub PR at the same code tree. This is Jules's task-level self-report corroborated by remote no-change commits, not a generalized conclusion about all Jules installations. See `docs/JULES_FEEDBACK_INCIDENT.md`.

**Required fallback for future scoped work:** If a GitHub comment is acknowledged but not incorporated, do **not** assume the comment contents reached Jules. In the **same Jules task's Talk to Jules**, paste the precise bug, test/reproduction, expected correction, and reviewed SHA; ask the agent to confirm visibility and report `git status`, source/test diff, actual test results and distinct new tree. Never accept `Ready for review`, 👀 or a new commit SHA as proof of a modification; use the opt-in `scripts/check-agent-feedback-diff.cjs` and review new content. If the source feature is already integrated by the steward, perform **diagnosis only**, not republish or duplicate the obsolete task. No account/settings changes, recurring CI, billing, developer tokens or new Jules job are justified.


## Empty Jules feedback commits — diagnosis before retries

A known pattern across both local Clanker pilots: Jules acknowledges PR comments but pushes a **new Git SHA with the same exact tree** (four zero-file commits). The first pilot additionally lost independent fixes when Jules republished its old tree. See the proof, provider reports, support packet and uncertainty boundary in `docs/JULES_FEEDBACK_INCIDENT.md`.

When a response commit arrives, check a locally available reviewed SHA against the new SHA: `node scripts/check-agent-feedback-diff.cjs --before <reviewed> --after <candidate>`. Codes: 0 changed paths (still requires semantic review), 2 identical trees/no path changes (feedback not implemented), 1 invalid/non-descendant/error. Run `node tests/agent-feedback-diff.cjs` to verify its synthetic real-Git scenarios. If NO_CHANGE, don't repeat PR nudges; inspect the existing Jules session activity/diff and git staging/upload sequence in Jules (authenticated UI/API if already available) before deciding whether the provider can incorporate the change. Keep task/branch writer separation and preserve completed evidence; no paid plan, extra task or continuous monitor is authorized for diagnostics.


## Jules session utilization and coordination

**Single coordination lane:** During the Clanker integration pilot, only one steward-coordinated GitHub workstream launches coding tasks or integrates changes at a time. Another ChatGPT/Codex/Gemini conversation may discuss or review, but must check `main`, the canonical handoff and current task/PR receipts before writable work. Keep one writer per feature branch.

**Reuse-first lifecycle:** Inventory existing Jules task links, actual session status where available, scope, PR and branch SHA before starting a new Jules job. If Jules confirms an active/paused resumable task is suited to its original work, use the task conversation and existing PR feedback for corrections, offline tests and finishing work. Avoid wasting a new task on status checking or restarting an already completed step. Preserve task logs, patches and review findings when complete. A completed or closed PR is **not proof that Jules can still work in that session**, so do not treat it as an endlessly reusable agent; use one new scoped task only if the current task is unsuitable or finished. Never repeat the first pilot's issue-label trigger just to revive PR #2.

**First pilot receipt:** https://jules.google.com/task/7194871727713726446 → original issue #1 and PR #2 (closed, unmerged); corrected implementation was integrated through PR #3. Jules's independent session state is **unverified** by the GitHub read connection. No new Jules task, scheduler, proactivity feature or fee is authorized merely by this documentation.


**Scope:** Reusable execution/safety guidance derived from both Clanker pilots (issue #1/PR #2 and issue #4/PR #5) and the direct diagnostic exchange. Historical pilot receipts do not authorize new tasks. Canonical project decisions, permissions and current status remain in `AGENTS.md` and **only** `docs/PROJECT_HANDOFF.md`.

## Proven end-to-end components

1. A permitted GitHub issue marked `jules` was accepted by Google Jules and linked to task `7194871727713726446`; no owner paste or separate Work run was needed.
2. Jules produced an offline 2048 stage-protocol implementation, claimed Node test results, and opened PR #2 to `main`.
3. A separate ChatGPT/GitHub reviewer identified an actual correctness flaw and tested the negative case against fetched source; a corrective patch `0ca6455` was committed directly to the Jules branch.
4. Jules's later commit `e653639` **removed that corrective patch**, proving that mixed branch writers can lose changes, even without a force push. Do not infer that PR feedback was independently processed.
5. The corrective commit is preserved on `review/clanker-stage-protocol-v1`. The original Jules PR #2 was closed unmerged; corrected reviewer-owned PR #3 was subsequently integrated as `e805ba3`. This list records the first pilot's history.

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

The integration may be considered working for initial coding **only** after verified GitHub issue→Jules acceptance→PR. It may be considered reliable for two-way review only when PR comments lead to correctly incorporated feedback without losing reviewed changes. It may be considered autonomous across projects only after idempotent queue/trigger behavior, exact-SHA review, tested outcomes and hard gates are proven. Current outcome: **GitHub issue→Jules coding PR YES; direct browser task dispatch YES; same-task direct-chat review→Jules corrective commits YES (two verified rounds); independent Node verification and steward integration YES; automatic GitHub-comment retrieval NOT RELIABLE; unattended cross-project orchestration NOT VERIFIED**. The successful merge required an independent integration steward.
