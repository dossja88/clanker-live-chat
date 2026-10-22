'use strict';
// Dependency-free synchronous CommonJS offline stage reconnect & epoch fencing wrapper.
// Strictly offline, dependency-free display event receiver with owner-authorized epoch rotation.
// NOT authentication, encryption, transport, persistent cursor, or an always-on host.

const Protocol = require('./stage-protocol.cjs');

const MAX_LIFETIME_EVENTS_LIMIT = 1024;

function copy(val) {
  return val === null ? null : JSON.parse(JSON.stringify(val));
}

function deepFreeze(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  Object.freeze(obj);
  for (const key of Object.getOwnPropertyNames(obj)) {
    const val = obj[key];
    if (val !== null && (typeof val === 'object' || typeof val === 'function') && !Object.isFrozen(val)) {
      deepFreeze(val);
    }
  }
  return obj;
}

function isValidEpoch(epoch) {
  return Number.isSafeInteger(epoch) && epoch > 0;
}

function createStageReconnectReceiver({ epoch, authorizeOwner, maxEvents = 128 } = {}) {
  if (!isValidEpoch(epoch)) {
    throw Error('Initial epoch must be a positive safe integer.');
  }
  if (typeof authorizeOwner !== 'function') {
    throw Error('Explicit trusted authorizeOwner callback required.');
  }
  if (!Number.isSafeInteger(maxEvents) || maxEvents < 1 || maxEvents > MAX_LIFETIME_EVENTS_LIMIT) {
    throw Error('maxEvents must be a safe integer between 1 and 1024.');
  }

  let currentEpoch = epoch;
  let totalAcceptedLifetime = 0;
  let currentEpochSequence = 0;

  // Track accepted state across rotations
  let latestAcceptedEvent = null; // Stage event object (schema clanker.local2048.stage.v1)
  let latestAcceptedRevisionFloor = 0;
  let stopEncountered = false;
  let lastAcceptedAt = -1;

  // Shared reentrancy guard for mutating operations (receive and rotateEpoch)
  let mutationInProgress = false;

  function status() {
    return Object.freeze({
      epoch: currentEpoch,
      totalAcceptedLifetime,
      currentEpochSequence,
      maxEvents,
      latestRevision: latestAcceptedEvent ? latestAcceptedEvent.revision : null,
      stopEncountered,
      lastAt: latestAcceptedEvent ? latestAcceptedEvent.at : null
    });
  }

  function getLatest() {
    return latestAcceptedEvent === null ? null : deepFreeze(copy(latestAcceptedEvent));
  }

  function receive(envelope) {
    if (mutationInProgress) {
      throw Error('Reentrant mutation rejected.');
    }
    mutationInProgress = true;
    try {
      // Envelope must be a non-null plain object or null-prototype object
      if (!envelope || typeof envelope !== 'object' || Array.isArray(envelope)) {
        throw Error('Envelope must be a non-null plain object.');
      }

      // Prototype check: prototype must be Object.prototype or null
      const proto = Object.getPrototypeOf(envelope);
      if (proto !== Object.prototype && proto !== null) {
        throw Error('Envelope prototype must be Object.prototype or null.');
      }

      // ReflectorownKeys retrieves all string and symbol own property keys
      const ownKeys = Reflect.ownKeys(envelope);
      if (ownKeys.length !== 2) {
        throw Error('Envelope must contain exactly two own properties ("epoch" and "json").');
      }

      const keySet = new Set(ownKeys);
      if (!keySet.has('epoch') || !keySet.has('json')) {
        throw Error('Envelope must contain exactly "epoch" and "json" properties.');
      }

      // Inspect property descriptors before accessing values
      const epochDesc = Object.getOwnPropertyDescriptor(envelope, 'epoch');
      const jsonDesc = Object.getOwnPropertyDescriptor(envelope, 'json');

      if (!epochDesc || !jsonDesc) {
        throw Error('Missing own property descriptors for envelope keys.');
      }

      // Must be enumerable data properties (not getters/setters)
      if (!epochDesc.enumerable || !jsonDesc.enumerable) {
        throw Error('Envelope keys "epoch" and "json" must be enumerable own data properties.');
      }

      if (Object.prototype.hasOwnProperty.call(epochDesc, 'get') ||
          Object.prototype.hasOwnProperty.call(epochDesc, 'set') ||
          Object.prototype.hasOwnProperty.call(jsonDesc, 'get') ||
          Object.prototype.hasOwnProperty.call(jsonDesc, 'set')) {
        throw Error('Envelope properties cannot be accessors/getters.');
      }

      const envEpoch = epochDesc.value;
      const envJson = jsonDesc.value;

      if (!isValidEpoch(envEpoch)) {
        throw Error('Envelope epoch must be a positive safe integer.');
      }

      if (typeof envJson !== 'string') {
        throw Error('Envelope json must be a string.');
      }

      // Reject old or future epoch
      if (envEpoch !== currentEpoch) {
        throw Error(`Envelope epoch ${envEpoch} does not match current epoch ${currentEpoch}.`);
      }

      // Check lifetime cap before parsing or mutating
      if (totalAcceptedLifetime >= maxEvents) {
        throw Error('Lifetime accepted event cap reached.');
      }

      // Parse and validate stage protocol event
      // Protocol.parseStageEvent throws if json is malformed, oversized, or contains forbidden/invalid fields
      const parsedEvent = Protocol.parseStageEvent(envJson);

      // Sequence monotonicity check for the SAME epoch:
      // "Same epoch global sequence strictly increases even across newer revisions."
      if (currentEpochSequence > 0 && parsedEvent.sequence <= currentEpochSequence) {
        throw Error('Sequence number must strictly increase within the same epoch.');
      }

      // Across rotations / revisions check
      if (latestAcceptedEvent !== null) {
        // Reject revision rollback
        if (parsedEvent.revision < latestAcceptedRevisionFloor) {
          throw Error('Revision rollback rejected.');
        }

        // Timestamp rollback check: "timestamps must not roll back"
        if (parsedEvent.at < lastAcceptedAt) {
          throw Error('Timestamp rollback rejected.');
        }

        // "same-revision game-state fields must remain identical (ignore only sequence/at)"
        if (parsedEvent.revision === latestAcceptedEvent.revision) {
          for (const key of Protocol.ALLOWED_KEYS) {
            if (key === 'at' || key === 'sequence') continue;
            if (JSON.stringify(parsedEvent[key]) !== JSON.stringify(latestAcceptedEvent[key])) {
              throw Error('Same-revision game-state fields changed unexpectedly.');
            }
          }
        }
      }

      // Atomic state update
      latestAcceptedEvent = copy(parsedEvent);
      latestAcceptedRevisionFloor = Math.max(latestAcceptedRevisionFloor, parsedEvent.revision);
      if (parsedEvent.phase === 'stopped') {
        stopEncountered = true;
      }
      lastAcceptedAt = parsedEvent.at;
      currentEpochSequence = parsedEvent.sequence;
      totalAcceptedLifetime++;

      return deepFreeze(copy(latestAcceptedEvent));
    } finally {
      mutationInProgress = false;
    }
  }

  function rotateEpoch(nextEpoch, ownerContext) {
    if (mutationInProgress) {
      throw Error('Reentrant mutation rejected.');
    }
    mutationInProgress = true;
    try {
      if (!isValidEpoch(nextEpoch)) {
        throw Error('Next epoch must be a positive safe integer.');
      }

      if (nextEpoch <= currentEpoch) {
        throw Error('Next epoch must be strictly greater than current epoch.');
      }

      // Explicit trusted authorizeOwner callback required, exact true only (no promises/truthy)
      let authResult;
      try {
        authResult = authorizeOwner(ownerContext, 'rotateEpoch');
      } catch (err) {
        throw Error(`Owner authorization callback failed: ${err.message}`);
      }

      if (authResult !== true) {
        throw Error('Owner authorization rejected (must return exact boolean true).');
      }

      // Successful rotation
      currentEpoch = nextEpoch;
      currentEpochSequence = 0; // Reset per-epoch sequence cursor

      return deepFreeze(status());
    } finally {
      mutationInProgress = false;
    }
  }

  return Object.freeze({
    receive,
    rotateEpoch,
    getLatest,
    status
  });
}

module.exports = Object.freeze({
  MAX_LIFETIME_EVENTS_LIMIT,
  createStageReconnectReceiver
});
