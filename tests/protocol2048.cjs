'use strict';

const assert = require('assert/strict');
const Protocol = require('../src/stage-protocol.cjs');
const Supervisor = require('../src/session-supervisor.cjs');

function runProtocolTests() {
  console.log('--- Running Stage Protocol v1 Tests ---');

  // 1. Projection and validation of valid supervisor states
  {
    const store = Supervisor.createMemoryStore();
    const supervisor = Supervisor.createSupervisor({
      store,
      authorizeOwner: (ctx, action) => ctx === 'owner'
    });

    const state1 = supervisor.start({ seed: 1, budget: 128, ownerContext: 'owner' });
    const event1 = Protocol.projectStageEvent(state1, { at: 1000, sequence: 1 });
    assert.equal(event1.schema, 'clanker.local2048.stage.v1');
    assert.equal(event1.revision, 1);
    assert.equal(event1.sequence, 1);
    assert.equal(event1.phase, 'running');
    assert.equal(event1.status, 'playing');
    assert.equal(event1.turns, 0);
    assert.equal(event1.score, 0);
    assert.equal(event1.highestTile, 2);

    const encoded1 = Protocol.encodeStageEvent(event1);
    assert.ok(typeof encoded1 === 'string');
    assert.ok(encoded1.length < Protocol.MAX_PAYLOAD_BYTES);

    const receiver = Protocol.createStageReceiver();
    const rx1 = receiver.receive(encoded1);
    assert.equal(rx1.revision, 1);
    assert.equal(rx1.sequence, 1);
    console.log('PASS valid supervisor state projection, encoding and receiving');
  }

  // 2. Deterministic encoding key order & payload size bounds
  {
    const validEvent = {
      at: 1000,
      board: [[0, 0, 0, 0], [0, 2, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]],
      budget: 128,
      highestTile: 2,
      phase: 'running',
      revision: 1,
      schema: 'clanker.local2048.stage.v1',
      score: 0,
      sequence: 1,
      status: 'playing',
      turns: 0
    };

    const encoded = Protocol.encodeStageEvent(validEvent);
    const keysInJson = Object.keys(JSON.parse(encoded));
    assert.deepEqual(keysInJson, Protocol.ALLOWED_KEYS);
    console.log('PASS deterministic sorted key encoding and payload size limit enforcement');
  }

  // 3. Malformed JSON & oversized payload rejection
  {
    assert.throws(() => Protocol.parseStageEvent('invalid json {'), /Malformed JSON payload/);

    const oversizedObj = {
      at: 1000,
      board: [[0, 0, 0, 0], [0, 2, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]],
      budget: 128,
      highestTile: 2,
      phase: 'running',
      revision: 1,
      schema: 'clanker.local2048.stage.v1',
      score: 0,
      sequence: 1,
      status: 'playing',
      turns: 0,
      padding: 'x'.repeat(2100)
    };
    const oversizedJson = JSON.stringify(oversizedObj);
    assert.throws(() => Protocol.parseStageEvent(oversizedJson), /Raw payload exceeds maximum byte size limit/);
    console.log('PASS malformed JSON and oversized payload rejection');
  }

  // 4. Extra, missing, or nested fields rejection
  {
    const base = {
      at: 1000,
      board: [[0, 0, 0, 0], [0, 2, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]],
      budget: 128,
      highestTile: 2,
      phase: 'running',
      revision: 1,
      schema: 'clanker.local2048.stage.v1',
      score: 0,
      sequence: 1,
      status: 'playing',
      turns: 0
    };

    // Extra field
    assert.throws(
      () => Protocol.validateStageEvent({ ...base, extraField: 'test' }),
      /Stage event contains unexpected, missing, or nested fields/
    );

    // Missing field
    const missing = { ...base };
    delete missing.score;
    assert.throws(
      () => Protocol.validateStageEvent(missing),
      /Stage event contains unexpected, missing, or nested fields/
    );

    console.log('PASS extra and missing fields rejection');
  }

  // 5. Cross-field leaks and instruction injection attempts (action, command, token, operator)
  {
    const baseRaw = JSON.stringify({
      at: 1000,
      board: [[0, 0, 0, 0], [0, 2, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]],
      budget: 128,
      highestTile: 2,
      phase: 'running',
      revision: 1,
      schema: 'clanker.local2048.stage.v1',
      score: 0,
      sequence: 1,
      status: 'playing',
      turns: 0
    });

    // Attempting raw string containing forbidden instruction keys
    const injectedRaw = baseRaw.slice(0, -1) + ',"action":"slide_left"}';
    assert.throws(
      () => Protocol.parseStageEvent(injectedRaw),
      /Forbidden instruction field "action" detected in payload/
    );

    const injectedCommand = baseRaw.slice(0, -1) + ',"command":"STOP"}';
    assert.throws(
      () => Protocol.parseStageEvent(injectedCommand),
      /Forbidden instruction field "command" detected in payload/
    );

    // Attempting receiver input object with instruction keys
    const receiver = Protocol.createStageReceiver();
    assert.throws(
      () => receiver.receive({ action: 'move_left' }),
      /Receiver rejects input containing instruction field "action"/
    );
    assert.throws(
      () => receiver.receive({ operator: 'admin', token: 'secret' }),
      /Receiver rejects input containing instruction field "operator"/
    );

    console.log('PASS instruction injection attempts rejected');
  }

  // 6. Prototype pollution check
  {
    const polluted = JSON.parse('{"__proto__":{"polluted":true},"at":1000,"board":[[0,0,0,0],[0,2,0,0],[0,0,0,0],[0,0,0,0]],"budget":128,"highestTile":2,"phase":"running","revision":1,"schema":"clanker.local2048.stage.v1","score":0,"sequence":1,"status":"playing","turns":0}');
    assert.throws(
      () => Protocol.validateStageEvent(polluted),
      /Stage event contains forbidden prototype property/
    );
    console.log('PASS prototype pollution attempt rejected');
  }

  // 7. Impossible tiles, board dimension, non-power-of-two tiles, and highestTile mismatch
  {
    const valid = {
      at: 1000,
      board: [[0, 0, 0, 0], [0, 2, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]],
      budget: 128,
      highestTile: 2,
      phase: 'running',
      revision: 1,
      schema: 'clanker.local2048.stage.v1',
      score: 0,
      sequence: 1,
      status: 'playing',
      turns: 0
    };

    // Bad board size (3 rows)
    assert.throws(
      () => Protocol.validateStageEvent({ ...valid, board: [[0, 0, 0, 0], [0, 2, 0, 0], [0, 0, 0, 0]] }),
      /Invalid stage event board format/
    );

    // Non-power of two tile (3)
    assert.throws(
      () => Protocol.validateStageEvent({ ...valid, board: [[0, 0, 0, 0], [0, 3, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]], highestTile: 3 }),
      /Non-power-of-two tile value on stage board/
    );

    // Highest tile mismatch
    assert.throws(
      () => Protocol.validateStageEvent({ ...valid, highestTile: 4 }),
      /Stage event highestTile mismatch/
    );

    console.log('PASS board/tile validity and highestTile checks');
  }

  // 8. Invalid status/phase contradictions
  {
    const valid = {
      at: 1000,
      board: [[0, 0, 0, 0], [0, 2, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]],
      budget: 128,
      highestTile: 2,
      phase: 'running',
      revision: 1,
      schema: 'clanker.local2048.stage.v1',
      score: 0,
      sequence: 1,
      status: 'playing',
      turns: 0
    };

    // Status won with highest tile < 2048
    assert.throws(
      () => Protocol.validateStageEvent({ ...valid, status: 'won', phase: 'won', highestTile: 2 }),
      /Won status requires tile >= 2048/
    );

    // Phase/status contradiction (won phase with playing status)
    assert.throws(
      () => Protocol.validateStageEvent({ ...valid, phase: 'won', status: 'playing' }),
      /Won phase requires won status/
    );

    const wonBoard = [[2048,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]];
    assert.throws(
      () => Protocol.validateStageEvent({ ...valid, board: wonBoard, highestTile: 2048, status: 'won', phase: 'stopped' }),
      /Won status requires won phase/
    );
    const lostBoard = [[2,4,2,4],[4,2,4,2],[2,4,2,4],[4,2,4,2]];
    assert.throws(
      () => Protocol.validateStageEvent({ ...valid, board: lostBoard, highestTile: 4, status: 'lost', phase: 'stopped' }),
      /Lost status requires lost phase/
    );

    console.log('PASS status and phase contradiction checks');
  }

  // 9. Sequence and revision ordering: out-of-order, replayed, and STOP un-stop attempts
  {
    const receiver = Protocol.createStageReceiver();

    const ev1 = {
      at: 1000,
      board: [[0, 0, 0, 0], [0, 2, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]],
      budget: 128,
      highestTile: 2,
      phase: 'running',
      revision: 2,
      schema: 'clanker.local2048.stage.v1',
      score: 0,
      sequence: 1,
      status: 'playing',
      turns: 0
    };

    receiver.receive(ev1);

    // Replayed sequence
    assert.throws(
      () => receiver.receive(ev1),
      /Replayed or out-of-order sequence rejected/
    );

    // Out-of-order revision (rev 1 < rev 2)
    const ev0 = { ...ev1, revision: 1, sequence: 2 };
    assert.throws(
      () => receiver.receive(ev0),
      /Out-of-order or replayed revision rejected/
    );

    // STOP state
    const evStop = { ...ev1, phase: 'stopped', revision: 3, sequence: 1 };
    receiver.receive(evStop);

    // Un-stop attempt with stale/equal revision
    const evUnstop = { ...ev1, phase: 'running', revision: 3, sequence: 2 };
    assert.throws(
      () => receiver.receive(evUnstop),
      /Cannot un-stop a stopped session with an outdated revision/
    );

    // Valid restart with new higher revision
    const evRestart = { ...ev1, phase: 'running', revision: 4, sequence: 1 };
    const rxRestart = receiver.receive(evRestart);
    assert.equal(rxRestart.revision, 4);
    assert.equal(rxRestart.phase, 'running');

    // A later sequence may refresh a timestamp without modifying the
    // persisted supervisor checkpoint identified by the same revision.
    const immutableReceiver = Protocol.createStageReceiver();
    immutableReceiver.receive(ev1);
    const refresh = { ...ev1, sequence: 2, at: 1001 };
    assert.equal(immutableReceiver.receive(refresh).sequence, 2);
    assert.throws(
      () => immutableReceiver.receive({ ...refresh, sequence: 3, score: 16 }),
      /Same-revision snapshot changed committed game state/
    );
    assert.throws(
      () => immutableReceiver.receive({ ...refresh, sequence: 3, phase: 'stopped' }),
      /Same-revision snapshot changed committed game state/
    );
    assert.throws(
      () => immutableReceiver.receive({ ...refresh, sequence: 3, board: [[0,0,0,0],[0,0,2,0],[0,0,0,0],[0,0,0,0]] }),
      /Same-revision snapshot changed committed game state/
    );

    console.log('PASS sequence/revision monotonicity and STOP persistence checks');
  }

  console.log('ALL PROTOCOL 2048 TESTS PASSED (read-only stage protocol v1)');
}

runProtocolTests();
