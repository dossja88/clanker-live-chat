'use strict';
// Sanitized read-only local-2048 stage status event protocol v1.
// Independent of DOM, Twitch, network, and operator instruction execution.
// Sanitized display projection is NOT authentication and may NOT accept instructions.

const Core = require('./2048-core.cjs');
const Supervisor = require('./session-supervisor.cjs');

const SCHEMA = 'clanker.local2048.stage.v1';
const MAX_PAYLOAD_BYTES = 2048;
const ALLOWED_KEYS = Object.freeze([
  'at',
  'board',
  'budget',
  'highestTile',
  'phase',
  'revision',
  'schema',
  'score',
  'sequence',
  'status',
  'turns'
]);
const ALLOWED_KEYS_JOINED = ALLOWED_KEYS.join(',');

const FORBIDDEN_INSTRUCTION_KEYS = Object.freeze([
  'action',
  'command',
  'control',
  'do',
  'eval',
  'execute',
  'instruction',
  'move',
  'op',
  'operator',
  'payload',
  'script',
  'start',
  'stop',
  'token'
]);

function copy(val) {
  return val === null ? null : JSON.parse(JSON.stringify(val));
}

function getByteLength(str) {
  return typeof Buffer !== 'undefined'
    ? Buffer.byteLength(str, 'utf8')
    : new TextEncoder().encode(str).length;
}

function validateStageEvent(event) {
  if (!event || typeof event !== 'object' || Array.isArray(event)) {
    throw Error('Stage event must be a non-null plain object.');
  }

  // Prototype pollution check
  if (Object.prototype.hasOwnProperty.call(event, '__proto__') ||
      Object.prototype.hasOwnProperty.call(event, 'constructor')) {
    throw Error('Stage event contains forbidden prototype property.');
  }

  const keys = Object.keys(event).sort();
  if (keys.join(',') !== ALLOWED_KEYS_JOINED) {
    throw Error('Stage event contains unexpected, missing, or nested fields.');
  }

  if (event.schema !== SCHEMA) {
    throw Error('Invalid stage event schema.');
  }

  if (!Number.isSafeInteger(event.revision) || event.revision < 1 || event.revision > 100000000) {
    throw Error('Invalid stage event revision.');
  }

  if (!Number.isSafeInteger(event.sequence) || event.sequence < 1 || event.sequence > 100000000) {
    throw Error('Invalid stage event sequence.');
  }

  if (!Number.isSafeInteger(event.at) || event.at < 0) {
    throw Error('Invalid stage event timestamp.');
  }

  if (!Supervisor.BUDGETS.includes(event.budget)) {
    throw Error('Invalid stage event budget.');
  }

  if (!['running', 'stopped', 'capped', 'won', 'lost'].includes(event.phase)) {
    throw Error('Invalid stage event phase.');
  }

  if (!['playing', 'won', 'lost'].includes(event.status)) {
    throw Error('Invalid stage event status.');
  }

  if (!Number.isSafeInteger(event.score) || event.score < 0 || event.score > 1000000000) {
    throw Error('Invalid stage event score.');
  }

  if (!Number.isSafeInteger(event.turns) || event.turns < 0 || event.turns > event.budget) {
    throw Error('Invalid stage event turns.');
  }

  if (!Array.isArray(event.board) || event.board.length !== 4) {
    throw Error('Invalid stage event board format.');
  }

  let highestTile = 0;
  for (let r = 0; r < 4; r++) {
    const row = event.board[r];
    if (!Array.isArray(row) || row.length !== 4) {
      throw Error('Invalid stage event board row.');
    }
    for (let c = 0; c < 4; c++) {
      const tile = row[c];
      if (!Number.isSafeInteger(tile) || tile < 0 || tile > 131072) {
        throw Error('Invalid stage event tile value.');
      }
      if (tile !== 0 && (tile & (tile - 1)) !== 0) {
        throw Error('Non-power-of-two tile value on stage board.');
      }
      if (tile > highestTile) highestTile = tile;
    }
  }

  if (event.highestTile !== highestTile) {
    throw Error('Stage event highestTile mismatch.');
  }

  const hasMoves = Core.hasLocal2048Move(event.board);
  if (event.status === 'won' && highestTile < 2048) {
    throw Error('Won status requires tile >= 2048.');
  }
  if (event.status === 'lost' && hasMoves) {
    throw Error('Lost status requires board with no legal moves.');
  }
  if (event.status === 'playing' && (highestTile >= 2048 || !hasMoves)) {
    throw Error('Playing status contradicts board state.');
  }

  if (event.phase === 'won' && event.status !== 'won') {
    throw Error('Won phase requires won status.');
  }
  if (event.phase === 'lost' && event.status !== 'lost') {
    throw Error('Lost phase requires lost status.');
  }
  // Match the supervisor's bidirectional status/phase mapping.
  if (event.status === 'won' && event.phase !== 'won') {
    throw Error('Won status requires won phase.');
  }
  if (event.status === 'lost' && event.phase !== 'lost') {
    throw Error('Lost status requires lost phase.');
  }
  if (event.status === 'playing' && !['running', 'stopped', 'capped'].includes(event.phase)) {
    throw Error('Playing status requires a nonterminal phase.');
  }
  if (event.phase === 'running' && (event.status !== 'playing' || event.turns >= event.budget)) {
    throw Error('Running phase requires active game within budget.');
  }
  if (event.phase === 'capped' && (event.turns !== event.budget || event.status !== 'playing')) {
    throw Error('Capped phase requires consumed budget.');
  }

  return copy(event);
}

function projectStageEvent(supervisorRecord, { at = Date.now(), sequence = 1 } = {}) {
  const record = Supervisor.validate(supervisorRecord);

  if (!Number.isSafeInteger(sequence) || sequence < 1) {
    throw Error('Sequence must be a positive safe integer.');
  }
  if (!Number.isSafeInteger(at) || at < 0) {
    throw Error('Timestamp at must be a non-negative safe integer.');
  }

  const game = record.game;
  const board = game.board.map(r => r.slice());
  const highestTile = Math.max(...board.flat());

  const event = {
    at,
    board,
    budget: record.budget,
    highestTile,
    phase: record.phase,
    revision: record.revision,
    schema: SCHEMA,
    score: game.score,
    sequence,
    status: game.status,
    turns: game.turns
  };

  return validateStageEvent(event);
}

function encodeStageEvent(event) {
  const validated = validateStageEvent(event);
  // Canonical key ordering
  const ordered = {};
  for (const k of ALLOWED_KEYS) {
    ordered[k] = validated[k];
  }
  const json = JSON.stringify(ordered);
  if (getByteLength(json) > MAX_PAYLOAD_BYTES) {
    throw Error('Encoded stage event exceeds maximum byte size limit.');
  }
  return json;
}

function parseStageEvent(raw) {
  if (typeof raw !== 'string') {
    throw Error('Stage event payload must be a string.');
  }
  if (getByteLength(raw) > MAX_PAYLOAD_BYTES) {
    throw Error('Raw payload exceeds maximum byte size limit.');
  }

  // Pre-parse check for instruction key injection in raw text
  for (const key of FORBIDDEN_INSTRUCTION_KEYS) {
    if (new RegExp(`"${key}"\\s*:`).test(raw)) {
      throw Error(`Forbidden instruction field "${key}" detected in payload.`);
    }
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw Error('Malformed JSON payload.');
  }

  return validateStageEvent(parsed);
}

function createStageReceiver() {
  let currentEvent = null;

  function receive(input) {
    if (input && typeof input === 'object' && !Array.isArray(input)) {
      for (const key of FORBIDDEN_INSTRUCTION_KEYS) {
        if (Object.prototype.hasOwnProperty.call(input, key)) {
          throw Error(`Receiver rejects input containing instruction field "${key}".`);
        }
      }
    }

    const event = typeof input === 'string' ? parseStageEvent(input) : validateStageEvent(input);

    if (currentEvent !== null) {
      if (event.revision < currentEvent.revision) {
        throw Error('Out-of-order or replayed revision rejected.');
      }
      if (event.revision === currentEvent.revision && event.sequence <= currentEvent.sequence) {
        throw Error('Replayed or out-of-order sequence rejected.');
      }
      if (currentEvent.phase === 'stopped' && event.phase === 'running' && event.revision <= currentEvent.revision) {
        throw Error('Cannot un-stop a stopped session with an outdated revision.');
      }
      // New sequence/timestamp can refresh a committed snapshot. The
      // game-state fields of that revision must remain immutable.
      if (event.revision === currentEvent.revision) {
        for (const key of ALLOWED_KEYS) {
          if (key === 'at' || key === 'sequence') continue;
          if (JSON.stringify(event[key]) !== JSON.stringify(currentEvent[key])) {
            throw Error('Same-revision snapshot changed committed game state.');
          }
        }
      }
    }

    currentEvent = copy(event);
    return Object.freeze(copy(currentEvent));
  }

  function getLatest() {
    return currentEvent === null ? null : Object.freeze(copy(currentEvent));
  }

  return Object.freeze({ receive, getLatest });
}

module.exports = Object.freeze({
  SCHEMA,
  MAX_PAYLOAD_BYTES,
  ALLOWED_KEYS,
  validateStageEvent,
  projectStageEvent,
  encodeStageEvent,
  parseStageEvent,
  createStageReceiver
});
