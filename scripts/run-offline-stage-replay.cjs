'use strict';
// Manual, finite CLI demo for offline 2048 stage event production and replay.
// No timers, server, watcher, credentials, network, or external dependencies.

const Replay = require('../src/offline-stage-replay.cjs');

function authorizeOwner(context, action) {
  return context && context.role === 'owner' && (action === 'start' || action === 'stop');
}

console.log('=== Clanker Offline 2048 Stage Replay CLI Demo ===');

const result = Replay.runOfflineStageReplay({
  seed: 1,
  budget: 128,
  maxSteps: 5,
  authorizeOwner,
  ownerContext: { role: 'owner' },
  startTime: Date.now(),
  sequenceStart: 1
});

console.log(`Produced ${result.jsonEvents.length} sanitized stage-event JSON payload(s).`);
console.log(`Replayed ${result.receivedEvents.length} stage-event snapshot(s) through read-only receiver.`);
console.log('\nLatest Replayed Stage Snapshot:');
console.log(JSON.stringify(result.latest, null, 2));

console.log('\nSample Encoded Stage Event JSON Payload [0]:');
console.log(result.jsonEvents[0]);

console.log('\n=== Replay CLI Demo Complete ===');
