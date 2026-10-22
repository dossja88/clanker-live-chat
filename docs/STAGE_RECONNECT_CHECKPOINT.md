# Offline reconnect cursor checkpoint v1

**Status: accepted only after independent tests. This is a source-only, trusted-host recovery contract, not a cloud deployment, production persistence service, authentication system or live Twitch capability.**

The existing \`src/stage-reconnect.cjs\` receiver now exposes two operations:
- \`receiver.exportCheckpoint()\`: emits a bounded, deterministic, versioned JSON snapshot of the accepted receiver cursor, including current epoch, monotonic revision/timestamp floors through its last sanitized stage event, STOP history, per-epoch sequence and lifetime event count. No owner context, RNG or viewer identifiers are included.
- \`receiver.restoreCheckpoint(raw, trustedOwnerContext)\`: **one shot on a pristine receiver**, requires the existing trusted \`authorizeOwner(context, 'restoreCheckpoint')\` callback to return exact \`true\`. Import strictly validates the schema and stage event, full set of fields, numeric constraints, counter/board consistency, and must match the receiver's \`epoch\` and \`maxEvents\` policy. Invalid import permanently closes restore on that instance; create a new receiver only after a trusted host repairs the source. It is not an unauthenticated API.
- \`parseReconnectCheckpoint(raw)\`: strict, read-only metadata parser for a trusted host reading its private stored record. **Parsing is not authentication or proof the bytes are current.**

**Mandatory reconnect sequence:** A host must load a checkpoint from its protected trusted checkpoint store, validate it, construct a receiver with the stored epoch/limit, restore with genuinely authenticated owner context, then explicitly authorize \`rotateEpoch(nextEpoch > previousEpoch)\` **before processing any newly received stage events**. The module rejects any data before this rotation and preserves revisions, immutable same-revision board/score, STOP and lifetime caps across the reconstruction. An epoch rotation itself neither starts nor resumes Clanker's puzzle; only the owner-approved supervisor may create a new session. Multiple receiver instances cannot safely coordinate solely with this JSON export.

\`\`\`js
const reconnect = require('./src/stage-reconnect.cjs');
const savedJson = trustedHostStore.readPrivateCheckpoint(); // conceptual host-controlled operation
const saved = reconnect.parseReconnectCheckpoint(savedJson);
const receiver = reconnect.createStageReconnectReceiver({
  epoch: saved.epoch, maxEvents: saved.maxEvents,
  authorizeOwner: privateHostAuthorizationCallback
});
receiver.restoreCheckpoint(savedJson, privateHostContext);
receiver.rotateEpoch(trustedHostNextMonotonicEpoch(), privateHostContext);
\`\`\`

**Critical deployment conditions:** JSON is **not signed, encrypted, durable, or replay-resistant** on its own. Neither callback name nor a secret-looking owner object constitutes remote authentication. Do not allow untrusted viewer, Twitch, browser or remote renderer data to choose an epoch, restore bytes or invoke the authorization callback. A real host must guarantee secure/private file permissions, authenticated storage access, atomic conditional writes with fencing, monotonic revisions across crashes and competing workers, no rollback/replay to an older checkpoint, and a safe STOP synchronization strategy between the game checkpoint and display checkpoint. A crash between state mutation and checkpoint persistence could otherwise reopen replay exposure. If any of these are unproven, fail closed and pause reconnect rather than silently reset the cursor. This module intentionally **does not write files, open sockets, start timers, configure CI or host continuous processes**.

**Verification:** Run \`node tests/stage-reconnect-checkpoint.cjs\` and \`node scripts/run-offline-tests.cjs\` on Node.js 20+. Includes a genuine separate child Node process restoration probe (with in-memory bytes passed through stdin), deliberate malformed/checkpoint tampering, owner identity and STOP checks, replay refusal and bounded lifetime. A spawned child is not proof of crash-consistent filesystem or distributed host operation.
