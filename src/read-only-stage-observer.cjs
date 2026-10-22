'use strict';
// Manual, synchronous, read-only observer of committed local-2048 supervisor state.
// A trusted host owns the store and session authorization; observer cannot tick/start/stop.
// No network, filesystem, timers, credentials, or unbounded queue.
const Supervisor = require('./session-supervisor.cjs');
const Protocol = require('./stage-protocol.cjs');

const MAX_EVENTS_PER_OBSERVER = 1024;

function createReadOnlyStageObserver({read, maxEvents = 128, sequenceStart = 1} = {}) {
  if (typeof read !== 'function') throw Error('Trusted read-only checkpoint callback required');
  if (!Number.isSafeInteger(maxEvents) || maxEvents < 1 || maxEvents > MAX_EVENTS_PER_OBSERVER)
    throw Error('Invalid observer event limit');
  if (!Number.isSafeInteger(sequenceStart) || sequenceStart < 1 ||
      sequenceStart > 100000000 - maxEvents + 1)
    throw Error('Invalid observer starting sequence');

  let lastRevision = null, lastRecord = null, lastAt = null, emitted = 0;
  const receiver = Protocol.createStageReceiver();

  function sample(at) {
    if (!Number.isSafeInteger(at) || at < 0)
      throw Error('Explicit non-negative integer timestamp required');
    if (emitted >= maxEvents) throw Error('Observer event limit reached; fail closed');
    const raw = read();
    if (raw === null) {
      if (lastRevision !== null) throw Error('Previously observed checkpoint disappeared');
      return null;
    }
    // Validate before comparing or exposing anything. Includes board, budget and RNG checks.
    const record = Supervisor.validate(raw);
    const canonical = JSON.stringify(record);

    if (lastRevision !== null) {
      if (record.revision < lastRevision)
        throw Error('Checkpoint revision rollback rejected');
      if (record.revision === lastRevision) {
        if (canonical !== lastRecord)
          throw Error('Same-revision checkpoint mutation rejected');
        return null; // no duplicate emissions; does not consume capacity
      }
      if (at <= lastAt) throw Error('Observer timestamp must advance');
    }
    // A skipped revision is allowed: sampling reads a snapshot, not a full event log.
    const sequence = sequenceStart + emitted;
    const event = Protocol.projectStageEvent(record, {at, sequence});
    const json = Protocol.encodeStageEvent(event);
    receiver.receive(json); // enforce the existing stage receiver invariants
    const result = Object.freeze({
      json, revision: record.revision, sequence, phase: event.phase
    });
    // Commit cursor only after projection, encoding and receiver validation succeed.
    lastRevision = record.revision;
    lastRecord = canonical;
    lastAt = at;
    emitted++;
    return result;
  }

  function status() {
    return Object.freeze({
      emitted, limit: maxEvents, lastRevision,
      lastSequence: emitted === 0 ? null : sequenceStart + emitted - 1,
      lastAt
    });
  }

  return Object.freeze({sample, status});
}

module.exports = Object.freeze({MAX_EVENTS_PER_OBSERVER, createReadOnlyStageObserver});
