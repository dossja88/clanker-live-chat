'use strict';
// Synchronous CommonJS offline producer->receiver stage event replay harness.
// Composed of Supervisor (session-supervisor.cjs) and Stage Protocol v1 (stage-protocol.cjs).
// Strictly bounded, deterministic, copy/immutability safe.
// Sanitized display projection is NOT authentication; renderer data cannot actuate game.

const Supervisor = require('./session-supervisor.cjs');
const Protocol = require('./stage-protocol.cjs');

function copy(val) {
  return val === null || val === undefined ? val : JSON.parse(JSON.stringify(val));
}

function produceStageEvents({
  seed,
  budget = 128,
  maxSteps = 1024,
  authorizeOwner,
  ownerContext,
  startTime = Date.now(),
  sequenceStart = 1
} = {}) {
  if (typeof authorizeOwner !== 'function') {
    throw Error('Explicit authorizeOwner callback required.');
  }
  if (!Number.isSafeInteger(seed) || seed < 0 || seed > 4294967295) {
    throw Error('Invalid seed; must be non-negative safe integer <= 4294967295.');
  }
  if (!Supervisor.BUDGETS.includes(budget)) {
    throw Error('Invalid budget.');
  }
  if (!Number.isSafeInteger(maxSteps) || maxSteps < 0 || maxSteps > 2048) {
    throw Error('Invalid maxSteps; must be safe integer between 0 and 2048.');
  }
  if (!Number.isSafeInteger(startTime) || startTime < 0) {
    throw Error('Invalid startTime.');
  }
  if (!Number.isSafeInteger(sequenceStart) || sequenceStart < 1) {
    throw Error('Invalid sequenceStart.');
  }

  const store = Supervisor.createMemoryStore();
  const supervisor = Supervisor.createSupervisor({ store, authorizeOwner });

  // Start owner-authorized session
  supervisor.start({ seed, budget, ownerContext: copy(ownerContext) });

  const jsonEvents = [];
  let currentSeq = sequenceStart;
  let currentAt = startTime;

  let currentRecord = store.read();
  let event = Protocol.projectStageEvent(currentRecord, { at: currentAt, sequence: currentSeq });
  jsonEvents.push(Protocol.encodeStageEvent(event));

  let steps = 0;
  while (currentRecord.phase === 'running' && steps < maxSteps) {
    steps++;
    currentSeq++;
    currentAt += 100; // deterministic timestamp tick

    supervisor.tick();
    currentRecord = store.read();
    event = Protocol.projectStageEvent(currentRecord, { at: currentAt, sequence: currentSeq });
    jsonEvents.push(Protocol.encodeStageEvent(event));
  }

  return Object.freeze(jsonEvents);
}

function replayStageEvents(jsonEvents) {
  if (!Array.isArray(jsonEvents)) {
    throw Error('jsonEvents must be an array of JSON strings.');
  }

  const receiver = Protocol.createStageReceiver();
  const receivedEvents = [];

  for (let i = 0; i < jsonEvents.length; i++) {
    const raw = jsonEvents[i];
    const received = receiver.receive(raw);
    receivedEvents.push(received);
  }

  return Object.freeze(receivedEvents);
}

function runOfflineStageReplay(options = {}) {
  const jsonEvents = produceStageEvents(options);
  const receivedEvents = replayStageEvents(jsonEvents);
  return Object.freeze({
    jsonEvents,
    receivedEvents,
    latest: receivedEvents.length > 0 ? receivedEvents[receivedEvents.length - 1] : null
  });
}

module.exports = Object.freeze({
  produceStageEvents,
  replayStageEvents,
  runOfflineStageReplay
});
