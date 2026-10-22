'use strict';

const assert = require('assert');
const Supervisor = require('../src/session-supervisor.cjs');
const Observer = require('../src/read-only-stage-observer.cjs');
const Protocol = require('../src/stage-protocol.cjs');
const Reconnect = require('../src/stage-reconnect.cjs');

function runTests() {
  let passedCount = 0;

  function test(description, fn) {
    try {
      fn();
      passedCount++;
      console.log(`PASS ${description}`);
    } catch (err) {
      console.error(`FAIL ${description}`);
      console.error(err);
      process.exit(1);
    }
  }

  // Helper: setup supervisor and observer
  function setupPipeline(seed = 1) {
    const token = Object.freeze({ ticket: 'trusted-owner' });
    const store = Supervisor.createMemoryStore();
    const supervisor = Supervisor.createSupervisor({
      store,
      authorizeOwner: (ctx, action) => ctx === token && (action === 'start' || action === 'stop' || action === 'tick')
    });
    supervisor.start({ seed, budget: 128, ownerContext: token });
    const obs = Observer.createReadOnlyStageObserver({ read: () => store.read(), maxEvents: 128 });
    return { token, store, supervisor, obs };
  }

  // 1. Initial creation and invalid options
  test('initial creation and option validation', () => {
    const auth = (ctx, action) => ctx === 'SECRET_OWNER' && action === 'rotateEpoch';

    assert.throws(() => Reconnect.createStageReconnectReceiver({ epoch: 0, authorizeOwner: auth }), /positive safe integer/);
    assert.throws(() => Reconnect.createStageReconnectReceiver({ epoch: -1, authorizeOwner: auth }), /positive safe integer/);
    assert.throws(() => Reconnect.createStageReconnectReceiver({ epoch: 10, authorizeOwner: null }), /authorizeOwner callback required/);
    assert.throws(() => Reconnect.createStageReconnectReceiver({ epoch: 10, authorizeOwner: auth, maxEvents: 0 }), /maxEvents must be a safe integer/);
    assert.throws(() => Reconnect.createStageReconnectReceiver({ epoch: 10, authorizeOwner: auth, maxEvents: 2000 }), /maxEvents must be a safe integer/);

    const receiver = Reconnect.createStageReconnectReceiver({ epoch: 1, authorizeOwner: auth, maxEvents: 10 });
    assert.strictEqual(receiver.getLatest(), null);
    const st = receiver.status();
    assert.strictEqual(st.epoch, 1);
    assert.strictEqual(st.totalAcceptedLifetime, 0);
    assert.strictEqual(st.currentEpochSequence, 0);
    assert.strictEqual(st.maxEvents, 10);
    assert.strictEqual(st.latestRevision, null);
    assert.strictEqual(st.stopEncountered, false);
    assert.strictEqual(st.lastAt, null);
  });

  // 2. Successful observer-event receiving with real supervisor/projector/observer
  test('successful observer-event receiving', () => {
    const { obs } = setupPipeline(1);
    const sample1 = obs.sample(1000); // { json, revision: 1, sequence: 1, phase: 'running' }

    const auth = (ctx, action) => ctx === 'SECRET_OWNER' && action === 'rotateEpoch';
    const receiver = Reconnect.createStageReconnectReceiver({ epoch: 1, authorizeOwner: auth });

    const accepted1 = receiver.receive({ epoch: 1, json: sample1.json });
    assert.strictEqual(accepted1.revision, 1);
    assert.strictEqual(accepted1.sequence, 1);
    assert.strictEqual(accepted1.at, 1000);

    const latest = receiver.getLatest();
    assert.deepStrictEqual(latest, accepted1);

    const st = receiver.status();
    assert.strictEqual(st.totalAcceptedLifetime, 1);
    assert.strictEqual(st.currentEpochSequence, 1);
    assert.strictEqual(st.latestRevision, 1);
  });

  // 3. Reconnect with sequence restart across epoch rotation
  test('reconnect with sequence restart across epoch rotation', () => {
    const { supervisor, obs } = setupPipeline(1);

    const auth = (ctx, action) => ctx === 'SECRET_OWNER' && action === 'rotateEpoch';
    const receiver = Reconnect.createStageReconnectReceiver({ epoch: 10, authorizeOwner: auth });

    // Move 1
    const sample1 = obs.sample(1000);
    receiver.receive({ epoch: 10, json: sample1.json });

    // Move 2
    supervisor.tick();
    const sample2 = obs.sample(1010);
    receiver.receive({ epoch: 10, json: sample2.json });
    assert.strictEqual(receiver.status().currentEpochSequence, 2);

    // Reconnect simulation: rotate epoch to 11
    receiver.rotateEpoch(11, 'SECRET_OWNER');
    assert.strictEqual(receiver.status().epoch, 11);
    assert.strictEqual(receiver.status().currentEpochSequence, 0);

    // Observer emitted sample 3 with sequence 3, but in new epoch 11, any valid sequence is accepted as long as it's > currentEpochSequence (0)
    supervisor.tick();
    const sample3 = obs.sample(1020); // sequence 3 from observer
    const accepted3 = receiver.receive({ epoch: 11, json: sample3.json });
    assert.strictEqual(accepted3.sequence, 3);
    assert.strictEqual(receiver.status().currentEpochSequence, 3);

    // Future move in same epoch must strictly increase sequence in that epoch
    supervisor.tick();
    const sample4 = obs.sample(1030); // sequence 4
    receiver.receive({ epoch: 11, json: sample4.json });
    assert.strictEqual(receiver.status().currentEpochSequence, 4);
  });

  // 4. Old and future epoch refusal
  test('old and future epoch refusal', () => {
    const { obs } = setupPipeline(1);
    const sample1 = obs.sample(1000);

    const auth = (ctx) => ctx === 'OWNER';
    const receiver = Reconnect.createStageReconnectReceiver({ epoch: 5, authorizeOwner: auth });

    // Reject old epoch
    assert.throws(() => receiver.receive({ epoch: 4, json: sample1.json }), /does not match current epoch/);
    // Reject future epoch without rotation
    assert.throws(() => receiver.receive({ epoch: 6, json: sample1.json }), /does not match current epoch/);

    // State unchanged
    assert.strictEqual(receiver.status().epoch, 5);
    assert.strictEqual(receiver.status().totalAcceptedLifetime, 0);
    assert.strictEqual(receiver.getLatest(), null);
  });

  // 5. Unauthorized / truthy / async callback rotation rejection
  test('unauthorized / truthy / async callback rotation rejection', () => {
    const authFn = (ctx) => {
      if (ctx === 'EXACT_TRUE') return true;
      if (ctx === 'TRUTHY_STRING') return 'true';
      if (ctx === 'TRUTHY_NUM') return 1;
      if (ctx === 'ASYNC') return Promise.resolve(true);
      if (ctx === 'THROWS') throw new Error('Auth internal error');
      return false;
    };

    const receiver = Reconnect.createStageReconnectReceiver({ epoch: 1, authorizeOwner: authFn });

    // Reject non-greater epoch
    assert.throws(() => receiver.rotateEpoch(1, 'EXACT_TRUE'), /strictly greater/);
    assert.throws(() => receiver.rotateEpoch(0, 'EXACT_TRUE'), /positive safe integer/);

    // Reject truthy return values
    assert.throws(() => receiver.rotateEpoch(2, 'TRUTHY_STRING'), /must return exact boolean true/);
    assert.throws(() => receiver.rotateEpoch(2, 'TRUTHY_NUM'), /must return exact boolean true/);
    assert.throws(() => receiver.rotateEpoch(2, 'ASYNC'), /must return exact boolean true/);
    assert.throws(() => receiver.rotateEpoch(2, 'FALSE'), /must return exact boolean true/);
    assert.throws(() => receiver.rotateEpoch(2, 'THROWS'), /Auth internal error/);

    // Epoch remains unchanged
    assert.strictEqual(receiver.status().epoch, 1);

    // Exact true succeeds
    const rotatedStatus = receiver.rotateEpoch(2, 'EXACT_TRUE');
    assert.strictEqual(rotatedStatus.epoch, 2);
    assert.strictEqual(receiver.status().epoch, 2);
  });

  // 6. Revision rollback refusal
  test('revision rollback refusal across epochs or within epoch', () => {
    const { supervisor, obs } = setupPipeline(1);
    const sample1 = obs.sample(1000); // rev 1

    supervisor.tick();
    const sample2 = obs.sample(1010); // rev 2

    const auth = () => true;
    const receiver = Reconnect.createStageReconnectReceiver({ epoch: 1, authorizeOwner: auth });

    receiver.receive({ epoch: 1, json: sample2.json }); // rev 2 accepted

    // Try to receive sample1 (rev 1) in same epoch -> rejected sequence and revision
    assert.throws(() => receiver.receive({ epoch: 1, json: sample1.json }), /Sequence number must strictly increase|Revision rollback/);

    // Rotate epoch and attempt to receive rev 1 with a higher sequence number manually constructed
    receiver.rotateEpoch(2, null);
    const oldRevEvent = JSON.parse(sample1.json);
    oldRevEvent.sequence = 100;
    oldRevEvent.at = 1020;
    const oldRevJson = Protocol.encodeStageEvent(oldRevEvent);

    assert.throws(() => receiver.receive({ epoch: 2, json: oldRevJson }), /Revision rollback rejected/);

    // State remains rev 2
    assert.strictEqual(receiver.status().latestRevision, 2);
  });

  // 7. Same-revision tampering refusal
  test('same-revision state tampering refusal', () => {
    const { obs } = setupPipeline(1);
    const sample1 = obs.sample(1000); // rev 1, score 0, sequence 1

    const auth = () => true;
    const receiver = Reconnect.createStageReconnectReceiver({ epoch: 1, authorizeOwner: auth });
    receiver.receive({ epoch: 1, json: sample1.json });

    // Construct tampered payload with same revision 1, higher sequence 2, but altered score
    const tampered = JSON.parse(sample1.json);
    tampered.sequence = 2;
    tampered.at = 1010;
    tampered.score = 999;
    const tamperedJson = Protocol.encodeStageEvent(tampered);

    assert.throws(() => receiver.receive({ epoch: 1, json: tamperedJson }), /Same-revision game-state fields changed/);

    // Receiver state preserved
    assert.strictEqual(receiver.getLatest().score, 0);
    assert.strictEqual(receiver.status().currentEpochSequence, 1);
  });

  // 8. STOP preserved across epochs
  test('STOP preserved across epoch rotations', () => {
    const { token, supervisor, obs } = setupPipeline(1);

    supervisor.stop({ ownerContext: token });
    const sampleStop = obs.sample(1000); // rev 2, phase 'stopped'

    const auth = () => true;
    const receiver = Reconnect.createStageReconnectReceiver({ epoch: 1, authorizeOwner: auth });

    receiver.receive({ epoch: 1, json: sampleStop.json });
    assert.strictEqual(receiver.status().stopEncountered, true);

    // Rotate epoch
    receiver.rotateEpoch(2, null);
    assert.strictEqual(receiver.status().stopEncountered, true);

    // Start a new authorized game on the same supervisor (advances revision to 3)
    supervisor.start({ seed: 2, budget: 128, ownerContext: token });
    const sampleNew = obs.sample(2000); // rev 3, phase 'running'

    // Receiving new session with higher revision (rev 3) in rotated epoch succeeds
    const acceptedNew = receiver.receive({ epoch: 2, json: sampleNew.json });
    assert.strictEqual(acceptedNew.revision, 3);
    // STOP status remains preserved in status()
    assert.strictEqual(receiver.status().stopEncountered, true);
  });

  // 9. Higher authorized supervisor revision handling
  test('higher authorized supervisor revision handling', () => {
    const { supervisor, obs } = setupPipeline(1);
    supervisor.tick(); // rev 2
    supervisor.tick(); // rev 3

    const sample3 = obs.sample(1000); // rev 3, sequence 1

    const auth = () => true;
    const receiver = Reconnect.createStageReconnectReceiver({ epoch: 1, authorizeOwner: auth });

    const accepted = receiver.receive({ epoch: 1, json: sample3.json });
    assert.strictEqual(accepted.revision, 3);
    assert.strictEqual(receiver.status().latestRevision, 3);
  });

  // 10. Timestamp rollback refusal
  test('timestamp rollback refusal', () => {
    const { supervisor, obs } = setupPipeline(1);
    const sample1 = obs.sample(2000); // timestamp 2000

    supervisor.tick();
    // Create a custom envelope with timestamp 1500 (earlier than 2000) but higher sequence/revision
    const sample2Raw = obs.sample(2010);
    const sample2Parsed = JSON.parse(sample2Raw.json);
    sample2Parsed.at = 1500; // roll back timestamp
    const sample2RolledBackJson = Protocol.encodeStageEvent(sample2Parsed);

    const auth = () => true;
    const receiver = Reconnect.createStageReconnectReceiver({ epoch: 1, authorizeOwner: auth });

    receiver.receive({ epoch: 1, json: sample1.json });
    assert.throws(() => receiver.receive({ epoch: 1, json: sample2RolledBackJson }), /Timestamp rollback rejected/);

    // State preserved at 2000
    assert.strictEqual(receiver.status().lastAt, 2000);
  });

  // 11. Malformed / oversized / injected envelopes
  test('malformed / oversized / injected envelope rejection', () => {
    const auth = () => true;
    const receiver = Reconnect.createStageReconnectReceiver({ epoch: 1, authorizeOwner: auth });

    // Non-object
    assert.throws(() => receiver.receive('not-an-object'), /Envelope must be a non-null plain object/);
    assert.throws(() => receiver.receive(null), /Envelope must be a non-null plain object/);
    assert.throws(() => receiver.receive([1, 2]), /Envelope must be a non-null plain object/);

    // Prototype pollution attempt in envelope
    assert.throws(() => receiver.receive(JSON.parse('{"epoch":1,"json":"{}","__proto__":{}}')), /Envelope contains forbidden prototype property/);

    // Extra keys
    assert.throws(() => receiver.receive({ epoch: 1, json: '{}', extra: true }), /Envelope must contain exactly "epoch" and "json"/);
    assert.throws(() => receiver.receive({ epoch: 1 }), /Envelope must contain exactly "epoch" and "json"/);

    // Invalid epoch type
    assert.throws(() => receiver.receive({ epoch: '1', json: '{}' }), /Envelope epoch must be a positive safe integer/);

    // Malformed JSON string
    assert.throws(() => receiver.receive({ epoch: 1, json: 'invalid-json' }), /Malformed JSON payload/);

    // Oversized JSON payload (>2048 bytes)
    const oversized = JSON.stringify({ padding: 'a'.repeat(3000) });
    assert.throws(() => receiver.receive({ epoch: 1, json: oversized }), /exceeds maximum byte size limit/);

    // Instruction key injection in JSON string
    const injected = JSON.stringify({ action: 'execute', command: 'DROP TABLE' });
    assert.throws(() => receiver.receive({ epoch: 1, json: injected }), /Forbidden instruction field/);
  });

  // 12. Deep mutation and input aliasing protection
  test('deep mutation and input aliasing protection', () => {
    const { obs } = setupPipeline(1);
    const sample1 = obs.sample(1000);

    const auth = () => true;
    const receiver = Reconnect.createStageReconnectReceiver({ epoch: 1, authorizeOwner: auth });

    const envelope = { epoch: 1, json: sample1.json };
    const accepted = receiver.receive(envelope);

    // Attempt to mutate returned object
    assert.throws(() => { accepted.score = 999; }, TypeError);
    assert.throws(() => { accepted.board[0][0] = 999; }, TypeError);

    // Attempt to mutate getLatest()
    const latest = receiver.getLatest();
    assert.throws(() => { latest.board[0][0] = 999; }, TypeError);

    // Confirm stored state unchanged
    assert.strictEqual(receiver.getLatest().score, 0);
    assert.strictEqual(Array.isArray(receiver.getLatest().board), true);

    // Input envelope mutation after receive has no effect
    envelope.epoch = 999;
    assert.strictEqual(receiver.status().epoch, 1);
  });

  // 13. Failed-operation atomic state preservation
  test('failed-operation atomic state preservation', () => {
    const { obs } = setupPipeline(1);
    const sample1 = obs.sample(1000);

    const auth = () => true;
    const receiver = Reconnect.createStageReconnectReceiver({ epoch: 1, authorizeOwner: auth });

    receiver.receive({ epoch: 1, json: sample1.json });
    const statusBefore = receiver.status();

    // Attempt invalid receive (wrong epoch)
    assert.throws(() => receiver.receive({ epoch: 2, json: sample1.json }));

    // Status untouched
    assert.deepStrictEqual(receiver.status(), statusBefore);

    // Attempt invalid rotation (unauthorized)
    const badAuth = () => false;
    const receiver2 = Reconnect.createStageReconnectReceiver({ epoch: 1, authorizeOwner: badAuth });
    receiver2.receive({ epoch: 1, json: sample1.json });
    const st2Before = receiver2.status();

    assert.throws(() => receiver2.rotateEpoch(2, 'ctx'));
    assert.deepStrictEqual(receiver2.status(), st2Before);
  });

  // 14. Lifetime cap across rotations
  test('lifetime cap across rotations', () => {
    const { supervisor, obs } = setupPipeline(1);

    const auth = () => true;
    const receiver = Reconnect.createStageReconnectReceiver({ epoch: 1, authorizeOwner: auth, maxEvents: 3 });

    // Event 1 (Epoch 1)
    const s1 = obs.sample(1000);
    receiver.receive({ epoch: 1, json: s1.json });

    // Event 2 (Epoch 1)
    supervisor.tick();
    const s2 = obs.sample(1010);
    receiver.receive({ epoch: 1, json: s2.json });

    // Rotate to Epoch 2
    receiver.rotateEpoch(2, null);

    // Event 3 (Epoch 2)
    supervisor.tick();
    const s3 = obs.sample(1020);
    receiver.receive({ epoch: 2, json: s3.json });

    assert.strictEqual(receiver.status().totalAcceptedLifetime, 3);

    // Event 4 (exceeds maxEvents=3)
    supervisor.tick();
    const s4 = obs.sample(1030);
    assert.throws(() => receiver.receive({ epoch: 2, json: s4.json }), /Lifetime accepted event cap reached/);

    // Verify lifetime stayed at 3
    assert.strictEqual(receiver.status().totalAcceptedLifetime, 3);
  });

  console.log(`\nALL ${passedCount} STAGE RECONNECT TESTS PASSED.`);
}

runTests();
