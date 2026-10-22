'use strict';
// Offline 2048 Stage Protocol v1 producer->receiver replay test suite.
// Exercises end-to-end producer->encode->receive, same-seed repeatability,
// STOP persistence across supervisor reconstruction, finite turn caps,
// stale/out-of-order event rejection, same-revision state immutability,
// payload size limits, instruction-injection refusal, renderer non-actuation,
// input mutation isolation, and fail-closed boundaries.
//
// NOTE: These offline local tests verify deterministic CommonJS module behavior.
// They DO NOT establish internet security, network transport safety, or cloud deployment.

const assert = require('assert/strict');
const Supervisor = require('../src/session-supervisor.cjs');
const Protocol = require('../src/stage-protocol.cjs');
const Replay = require('../src/offline-stage-replay.cjs');

console.log('--- Running Stage Replay Tests ---');

// Helper trusted owner callback
function trustedAuthorizeOwner(context, action) {
  return context && context.role === 'owner' && (action === 'start' || action === 'stop');
}

// 1. End-to-end producer -> encode -> receive
{
  const result = Replay.runOfflineStageReplay({
    seed: 1,
    budget: 128,
    maxSteps: 10,
    authorizeOwner: trustedAuthorizeOwner,
    ownerContext: { role: 'owner' },
    startTime: 10000,
    sequenceStart: 1
  });

  assert.equal(result.jsonEvents.length, 11, 'Should produce initial + 10 step events');
  assert.equal(result.receivedEvents.length, 11, 'Should receive all 11 events');
  assert.equal(result.latest.sequence, 11, 'Final sequence should be 11');
  assert.equal(result.latest.revision, 11, 'Final revision should be 11');
  assert.equal(result.latest.turns, 10, 'Turns should equal 10');
  assert.equal(result.latest.phase, 'running', 'Phase should be running');
  assert.equal(result.latest.status, 'playing', 'Status should be playing');
  console.log('PASS end-to-end producer->encode->receive');
}

// 2. Same-seed repeatability
{
  const run1 = Replay.produceStageEvents({
    seed: 42,
    budget: 128,
    maxSteps: 20,
    authorizeOwner: trustedAuthorizeOwner,
    ownerContext: { role: 'owner' },
    startTime: 1000,
    sequenceStart: 1
  });

  const run2 = Replay.produceStageEvents({
    seed: 42,
    budget: 128,
    maxSteps: 20,
    authorizeOwner: trustedAuthorizeOwner,
    ownerContext: { role: 'owner' },
    startTime: 1000,
    sequenceStart: 1
  });

  assert.equal(run1.length, run2.length, 'Replay lengths should match');
  for (let i = 0; i < run1.length; i++) {
    assert.equal(run1[i], run2[i], `Event ${i} should be byte-identical across identical seeded runs`);
  }
  console.log('PASS same-seed repeatability');
}

// 3. STOP persistence across supervisor reconstruction
{
  const store = Supervisor.createMemoryStore();
  const sup1 = Supervisor.createSupervisor({ store, authorizeOwner: trustedAuthorizeOwner });

  sup1.start({ seed: 10, budget: 128, ownerContext: { role: 'owner' } });
  sup1.tick();
  sup1.tick();
  const stoppedRecord = sup1.stop({ ownerContext: { role: 'owner' } });
  assert.equal(stoppedRecord.phase, 'stopped');

  // Reconstruct supervisor over same store
  const sup2 = Supervisor.createSupervisor({ store, authorizeOwner: trustedAuthorizeOwner });
  const statusBefore = sup2.status();
  assert.equal(statusBefore.phase, 'stopped', 'STOP phase persists across supervisor reconstruction');

  // Attempting to tick a stopped supervisor produces no-op stopped state without advancing revision
  const tickResult = sup2.tick();
  assert.equal(tickResult.phase, 'stopped');
  assert.equal(tickResult.revision, stoppedRecord.revision, 'Revision remains unchanged on stopped tick');

  console.log('PASS STOP persistence across supervisor reconstruction');
}

// 4. Finite cap enforcement
{
  const runCap = Replay.runOfflineStageReplay({
    seed: 1,
    budget: 128,
    maxSteps: 5,
    authorizeOwner: trustedAuthorizeOwner,
    ownerContext: { role: 'owner' }
  });

  assert.equal(runCap.jsonEvents.length, 6, 'Should stop exactly at maxSteps (1 initial + 5 steps)');
  assert.equal(runCap.latest.turns, 5, 'Turn count bounded by maxSteps');
  console.log('PASS finite cap enforcement');
}

// 5. Stale / out-of-order event rejection
{
  const events = Replay.produceStageEvents({
    seed: 100,
    budget: 128,
    maxSteps: 5,
    authorizeOwner: trustedAuthorizeOwner,
    ownerContext: { role: 'owner' }
  });

  const receiver = Protocol.createStageReceiver();
  receiver.receive(events[0]);
  receiver.receive(events[1]);

  // Re-submitting event[0] (replayed sequence / revision)
  assert.throws(
    () => receiver.receive(events[0]),
    /Replayed or out-of-order sequence rejected|Out-of-order or replayed revision rejected/
  );

  // Re-submitting out-of-order event[4] before event[2] is ok if revision/seq increases, but skipping sequence on same revision:
  // If we try replaying events in reverse:
  assert.throws(
    () => receiver.receive(events[0]),
    /Out-of-order or replayed revision rejected|Replayed or out-of-order sequence rejected/
  );

  console.log('PASS stale/out-of-order event rejection');
}

// 6. Same-revision immutable state
{
  const events = Replay.produceStageEvents({
    seed: 5,
    budget: 128,
    maxSteps: 3,
    authorizeOwner: trustedAuthorizeOwner,
    ownerContext: { role: 'owner' }
  });

  const receiver = Protocol.createStageReceiver();
  const evtObj = JSON.parse(events[0]);

  receiver.receive(evtObj);

  // Create same-revision event with modified game state (e.g., score changed)
  const tamperedEvt = { ...evtObj, sequence: evtObj.sequence + 1, at: evtObj.at + 10, score: evtObj.score + 1000 };

  assert.throws(
    () => receiver.receive(tamperedEvt),
    /Same-revision snapshot changed committed game state/
  );

  console.log('PASS same-revision immutable state');
}

// 7. Oversized or instruction-injected payload refusal
{
  const receiver = Protocol.createStageReceiver();

  // Instruction key injection in raw JSON
  const injectedJson = JSON.stringify({
    at: Date.now(),
    board: [[2,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]],
    budget: 128,
    highestTile: 2,
    phase: 'running',
    revision: 1,
    schema: Protocol.SCHEMA,
    score: 0,
    sequence: 1,
    status: 'playing',
    turns: 0,
    action: 'execute_move_up' // forbidden instruction key
  });

  assert.throws(
    () => receiver.receive(injectedJson),
    /Forbidden instruction field "action" detected in payload|unexpected, missing, or nested fields/
  );

  // Oversized payload (> 2048 bytes)
  const oversizedJson = JSON.stringify({
    at: Date.now(),
    board: [[2,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]],
    budget: 128,
    highestTile: 2,
    phase: 'running',
    revision: 1,
    schema: Protocol.SCHEMA,
    score: 0,
    sequence: 1,
    status: 'playing',
    turns: 0,
    padding: 'x'.repeat(2500)
  });

  assert.throws(
    () => receiver.receive(oversizedJson),
    /exceeds maximum byte size limit/
  );

  console.log('PASS oversized or instruction-injected payload refusal');
}

// 8. Attempted renderer-to-supervisor actuation refusal
{
  const store = Supervisor.createMemoryStore();
  const supervisor = Supervisor.createSupervisor({ store, authorizeOwner: trustedAuthorizeOwner });

  // Renderer stage event snapshot or untrusted message
  const rendererPayload = {
    role: 'renderer',
    command: 'start_game',
    action: 'move_left',
    schema: Protocol.SCHEMA
  };

  // Attempt to pass renderer payload as ownerContext to start session
  assert.throws(
    () => supervisor.start({ seed: 1, budget: 128, ownerContext: rendererPayload }),
    /Owner authorization required for start/
  );

  // Attempt to pass renderer payload as ownerContext to stop session
  assert.throws(
    () => supervisor.stop({ ownerContext: rendererPayload }),
    /Owner authorization required for stop/
  );

  // Confirm store remains empty
  assert.equal(store.read(), null, 'Store remains uninitialized after refused actuation attempt');

  console.log('PASS attempted renderer-to-supervisor actuation refusal');
}

// 9. Input mutation isolation
{
  const mutableContext = { role: 'owner', meta: { tag: 'initial' } };
  const store = Supervisor.createMemoryStore();
  const supervisor = Supervisor.createSupervisor({ store, authorizeOwner: trustedAuthorizeOwner });

  supervisor.start({ seed: 7, budget: 128, ownerContext: mutableContext });

  // Mutate input object after call
  mutableContext.role = 'attacker';
  mutableContext.meta.tag = 'tampered';

  // Verify supervisor status is uncorrupted
  const record = supervisor.status();
  assert.equal(record.phase, 'running', 'Supervisor phase is still running');
  assert.equal(record.game.status, 'playing');

  // Verify stage event replay outputs are frozen and immune to external mutation
  const events = Replay.produceStageEvents({
    seed: 7,
    budget: 128,
    maxSteps: 3,
    authorizeOwner: trustedAuthorizeOwner,
    ownerContext: { role: 'owner' }
  });

  assert.throws(() => {
    events[0] = 'tampered';
  }, /Cannot assign to read only property/);

  const received = Replay.replayStageEvents(events);
  assert.throws(() => {
    received[0].score = 99999;
  }, /Cannot assign to read only property|Cannot add property|read-only/);

  console.log('PASS input mutation isolation');
}

// 10. Distinguish new explicitly authorized session vs un-stopping a stale stopped session
{
  const store = Supervisor.createMemoryStore();
  const sup = Supervisor.createSupervisor({ store, authorizeOwner: trustedAuthorizeOwner });

  // Session A: seed 1
  sup.start({ seed: 1, budget: 128, ownerContext: { role: 'owner' } });
  sup.tick();
  const stoppedA = sup.stop({ ownerContext: { role: 'owner' } });
  assert.equal(stoppedA.phase, 'stopped');

  // Receiver listening to Session A
  const receiver = Protocol.createStageReceiver();
  const evtA1 = Protocol.projectStageEvent(stoppedA, { sequence: 1, at: 1000 });
  receiver.receive(Protocol.encodeStageEvent(evtA1));

  // Attempting to inject a fake 'running' phase event on same revision (stale un-stop attempt)
  const staleUnstopEvt = { ...evtA1, phase: 'running', sequence: 2, at: 1050 };
  assert.throws(
    () => receiver.receive(staleUnstopEvt),
    /Same-revision snapshot changed committed game state|Cannot un-stop a stopped session/
  );

  // New explicitly owner-authorized session (Session B) on supervisor
  const startedB = sup.start({ seed: 2, budget: 128, ownerContext: { role: 'owner' } });
  assert.equal(startedB.phase, 'running');
  assert.equal(startedB.revision, stoppedA.revision + 1, 'Revision increments on new authorized session');

  const evtB1 = Protocol.projectStageEvent(startedB, { sequence: 2, at: 2000 });
  const receivedB = receiver.receive(Protocol.encodeStageEvent(evtB1));
  assert.equal(receivedB.phase, 'running');
  assert.equal(receivedB.revision, startedB.revision);

  console.log('PASS distinguish new authorized session vs un-stopping stale session');
}

// 11. Fail-closed behavior
{
  // Missing authorizeOwner
  assert.throws(
    () => Replay.produceStageEvents({ seed: 1 }),
    /Explicit authorizeOwner callback required/
  );

  // Invalid seed
  assert.throws(
    () => Replay.produceStageEvents({ seed: -1, authorizeOwner: trustedAuthorizeOwner }),
    /Invalid seed/
  );

  // Replaying non-array
  assert.throws(
    () => Replay.replayStageEvents('not an array'),
    /jsonEvents must be an array/
  );

  console.log('PASS fail-closed behavior');
}

console.log('ALL STAGE REPLAY TESTS PASSED (offline local CommonJS; not internet security or cloud deployment)');
