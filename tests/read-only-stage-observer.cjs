'use strict';
// Offline observer tests: actual Node + existing local supervisor/stage protocol.
const assert = require('node:assert/strict');
const Supervisor = require('../src/session-supervisor.cjs');
const Protocol = require('../src/stage-protocol.cjs');
const Observer = require('../src/read-only-stage-observer.cjs');
let checks = 0;
function test(name, fn) { fn(); checks++; console.log('PASS '+name); }
function fixture() {
  const token = Object.freeze({ticket:'trusted-owner'});
  const store = Supervisor.createMemoryStore();
  const supervisor = Supervisor.createSupervisor({
    store, authorizeOwner:(ctx,action)=>ctx===token&&(action==='start'||action==='stop')
  });
  return {token,store,supervisor};
}
const start = f => f.supervisor.start({seed:1,budget:128,ownerContext:f.token});

test('no implicit start, read-only empty store and duplicate snapshot',()=>{
  const f=fixture();
  let reads=0;
  const obs=Observer.createReadOnlyStageObserver({read:()=>{reads++;return f.store.read();}});
  assert.equal(obs.sample(100),null);
  assert.equal(f.store.read(),null);
  start(f);
  const e=obs.sample(101);
  assert.equal(e.revision,1);
  assert.equal(e.sequence,1);
  assert.equal(e.phase,'running');
  assert.equal(Protocol.parseStageEvent(e.json).revision,1);
  assert.equal(obs.sample(101),null);
  assert.equal(reads,3);
  assert.deepEqual(obs.status(),{emitted:1,limit:128,lastRevision:1,lastSequence:1,lastAt:101});
  assert.equal(f.supervisor.status().revision,1);
  assert.ok(Object.isFrozen(e));
  assert.ok(Object.isFrozen(obs.status()));
});
test('monotonic encoding, no control methods, and read-only receiver compatibility',()=>{
  const f=fixture(); start(f);
  const obs=Observer.createReadOnlyStageObserver({read:()=>f.store.read(),sequenceStart:9});
  const receiver=Protocol.createStageReceiver();
  const a=obs.sample(200);
  assert.equal(receiver.receive(a.json).sequence,9);
  f.supervisor.tick();
  const b=obs.sample(201);
  const accepted=receiver.receive(b.json);
  assert.equal(accepted.sequence,10);
  assert.equal(accepted.revision,2);
  assert.equal(obs.sample(202),null);
  assert.deepEqual(Object.keys(obs).sort(),['sample','status']);
  assert.equal(f.supervisor.status().revision,2);
});
test('persisted STOP visible, no stale un-stop, new authorized start visible',()=>{
  const f=fixture(); start(f);
  const obs=Observer.createReadOnlyStageObserver({read:()=>f.store.read()});
  const receiver=Protocol.createStageReceiver();
  receiver.receive(obs.sample(100).json);
  f.supervisor.stop({ownerContext:f.token});
  const stopped=obs.sample(101);
  assert.equal(receiver.receive(stopped.json).phase,'stopped');
  assert.equal(obs.sample(102),null);
  assert.equal(f.supervisor.tick().phase,'stopped');
  assert.equal(obs.sample(103),null);
  f.supervisor.start({seed:2,budget:128,ownerContext:f.token});
  const renewed=obs.sample(104);
  assert.equal(receiver.receive(renewed.json).phase,'running');
  assert.equal(renewed.revision,3);
  assert.equal(obs.status().emitted,3);
});
test('stale checkpoint rollback rejected without cursor corruption',()=>{
  const f=fixture(); start(f);
  let stale=null;
  const obs=Observer.createReadOnlyStageObserver({read:()=>stale??f.store.read()});
  const original=f.store.read();
  obs.sample(100);
  f.supervisor.tick();
  obs.sample(101);
  stale=original;
  assert.throws(()=>obs.sample(102),/rollback/);
  assert.equal(obs.status().emitted,2);
  stale=null;
  f.supervisor.tick();
  assert.equal(obs.sample(103).revision,3);
});
test('same-revision checkpoint tampering and missing checkpoint fail closed',()=>{
  const f=fixture(); start(f);
  let substitute=undefined;
  const obs=Observer.createReadOnlyStageObserver({read:()=>substitute===undefined?f.store.read():substitute});
  obs.sample(100);
  substitute=f.store.read();
  substitute.rngState=(substitute.rngState+1)>>>0;
  assert.throws(()=>obs.sample(101),/Same-revision/);
  substitute=null;
  assert.throws(()=>obs.sample(101),/disappeared/);
  assert.equal(obs.status().emitted,1);
  substitute=undefined;
  f.supervisor.tick();
  assert.equal(obs.sample(102).sequence,2);
});
test('malformed store snapshots and read errors do not consume cursor',()=>{
  const f=fixture(); start(f);
  let mode='throw';
  const obs=Observer.createReadOnlyStageObserver({read:()=>{
    if(mode==='throw')throw Error('read unavailable');
    if(mode==='corrupt')return {phase:'running',revision:1};
    return f.store.read();
  }});
  assert.throws(()=>obs.sample(100),/read unavailable/);
  mode='corrupt';
  assert.throws(()=>obs.sample(100),/Invalid supervisor checkpoint/);
  assert.equal(obs.status().emitted,0);
  mode='ok';
  assert.equal(obs.sample(100).sequence,1);
});
test('timestamp rollback fails closed and observer can resume later',()=>{
  const f=fixture();start(f);
  const obs=Observer.createReadOnlyStageObserver({read:()=>f.store.read()});
  obs.sample(100);
  f.supervisor.tick();
  assert.throws(()=>obs.sample(100),/timestamp must advance/);
  assert.throws(()=>obs.sample(99),/timestamp must advance/);
  assert.equal(obs.status().emitted,1);
  assert.equal(obs.sample(101).sequence,2);
});
test('bounded emissions and no unbounded reads after cap',()=>{
  const f=fixture();start(f);
  let count=0;
  const obs=Observer.createReadOnlyStageObserver({read:()=>{count++;return f.store.read();},maxEvents:2});
  obs.sample(1);
  assert.equal(obs.sample(2),null);
  f.supervisor.tick();
  obs.sample(3);
  const before=count;
  assert.throws(()=>obs.sample(4),/event limit reached/);
  assert.equal(count,before);
  assert.equal(obs.status().emitted,2);
  assert.equal(obs.status().lastSequence,2);
});
test('invalid configuration, read-only interface, bad timestamps',()=>{
  const f=fixture();
  for(const options of [
    {},{read:null},{read:()=>null,maxEvents:0},{read:()=>null,maxEvents:1025},
    {read:()=>null,maxEvents:1.5},{read:()=>null,sequenceStart:0},
    {read:()=>null,sequenceStart:100000001}
  ])assert.throws(()=>Observer.createReadOnlyStageObserver(options));
  const obs=Observer.createReadOnlyStageObserver({read:()=>f.store.read()});
  for(const at of [-1,1.3,NaN,Infinity,'today',undefined])assert.throws(()=>obs.sample(at));
  assert.equal(obs.status().emitted,0);
  assert.ok(Object.isFrozen(obs));
});
test('skipped revisions visible as snapshots, not fictitious event history',()=>{
  const f=fixture();start(f);
  const obs=Observer.createReadOnlyStageObserver({read:()=>f.store.read()});
  obs.sample(1);
  f.supervisor.tick();f.supervisor.tick();f.supervisor.tick();
  const next=obs.sample(2);
  assert.equal(next.revision,4);
  assert.equal(next.sequence,2);
  assert.equal(obs.status().emitted,2);
});
test('observer never leaks owner context or private checkpoint data',()=>{
  const f=fixture();start(f);
  const obs=Observer.createReadOnlyStageObserver({read:()=>f.store.read()});
  const emitted=obs.sample(100);
  assert.ok(!emitted.json.includes('trusted-owner'));
  assert.ok(!emitted.json.includes('rngState'));
  assert.ok(!emitted.json.includes('seed'));
  const encoded=JSON.parse(emitted.json);
  assert.deepEqual(Object.keys(encoded).sort(),Protocol.ALLOWED_KEYS);
});
console.log('ALL '+checks+' READ-ONLY STAGE OBSERVER TESTS PASSED (offline-only, not authentication or hosting)');
