'use strict';
// Offline read-only reconnect cursor checkpoint tests, actual Node 20+.
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const Supervisor = require('../src/session-supervisor.cjs');
const Protocol = require('../src/stage-protocol.cjs');
const Cursor = require('../src/stage-reconnect.cjs');
let total = 0;
function test(name, fn) { fn(); total++; console.log('PASS '+name); }
function setup(maxEvents=128) {
  const owner = Object.freeze({is:'trusted-owner'});
  const store = Supervisor.createMemoryStore();
  const supervisor = Supervisor.createSupervisor({
    store,authorizeOwner:(context,action)=>context===owner && ['start','stop'].includes(action)
  });
  supervisor.start({seed:1,budget:128,ownerContext:owner});
  const authorizeOwner=(context,action)=>context===owner &&
    (action==='restoreCheckpoint' || action==='rotateEpoch');
  const receiver=Cursor.createStageReconnectReceiver({epoch:1,maxEvents,authorizeOwner});
  const json=(at=100,sequence=1)=>Protocol.encodeStageEvent(
    Protocol.projectStageEvent(supervisor.status(),{at,sequence}));
  const envelope=(epoch,at,sequence)=>({epoch,json:json(at,sequence)});
  return {owner,store,supervisor,receiver,authorizeOwner,json,envelope,maxEvents};
}
function restore(f,checkpoint,epoch=1){
  const recovered=Cursor.createStageReconnectReceiver({epoch,maxEvents:f.maxEvents,authorizeOwner:f.authorizeOwner});
  recovered.restoreCheckpoint(checkpoint,f.owner);
  return recovered;
}
test('empty baseline serializes canonically and restore requires rotation',()=>{
  const f=setup();
  const text=f.receiver.exportCheckpoint();
  const parsed=Cursor.parseReconnectCheckpoint(text);
  assert.equal(parsed.schema,Cursor.CHECKPOINT_SCHEMA);
  assert.equal(parsed.totalAcceptedLifetime,0);
  assert.equal(parsed.latestAcceptedEvent,null);
  assert.ok(Object.isFrozen(parsed));
  const r=restore(f,text);
  assert.throws(()=>r.receive(f.envelope(1,100,1)),/must rotate/);
  r.rotateEpoch(2,f.owner);
  assert.equal(r.receive(f.envelope(2,100,1)).revision,1);
});
test('restart preserves revision/sequence/time and rejects old epoch',()=>{
  const f=setup();f.receiver.receive(f.envelope(1,100,1));f.supervisor.tick();
  f.receiver.receive(f.envelope(1,110,2));
  const checkpoint=f.receiver.exportCheckpoint();
  const r=restore(f,checkpoint);
  assert.equal(r.status().latestRevision,2);
  assert.equal(r.getLatest().sequence,2);
  assert.throws(()=>r.receive(f.envelope(1,120,3)),/must rotate/);
  r.rotateEpoch(2,f.owner);
  assert.throws(()=>r.receive(f.envelope(1,120,3)),/does not match current epoch/);
  assert.throws(()=>r.receive(f.envelope(2,105,1)),/Timestamp rollback/);
  assert.throws(()=>r.receive({epoch:2,json:f.json(120,1).replace('"revision":2','"revision":1')}),/Malformed|mismatch|rollback|Contradictory|Invalid/i);
  assert.equal(r.receive(f.envelope(2,120,1)).sequence,1);
  assert.equal(r.status().totalAcceptedLifetime,3);
});
test('same-revision state cannot change during restarted epoch',()=>{
  const f=setup();f.receiver.receive(f.envelope(1,100,1));
  const r=restore(f,f.receiver.exportCheckpoint());r.rotateEpoch(2,f.owner);
  const modified=JSON.parse(f.json(110,1));modified.score=2;
  assert.throws(()=>r.receive({epoch:2,json:Protocol.encodeStageEvent(modified)}),/Same-revision/);
  assert.equal(r.status().totalAcceptedLifetime,1);
  assert.equal(r.receive(f.envelope(2,110,1)).revision,1);
});
test('STOP history survives reconstruction; owner-controlled restart still possible',()=>{
  const f=setup();f.receiver.receive(f.envelope(1,100,1));
  f.supervisor.stop({ownerContext:f.owner});
  f.receiver.receive(f.envelope(1,101,2));
  const text=f.receiver.exportCheckpoint();
  const r=restore(f,text);
  assert.equal(r.status().stopEncountered,true);
  assert.equal(r.getLatest().phase,'stopped');
  assert.equal(f.supervisor.tick().phase,'stopped');
  assert.throws(()=>r.receive(f.envelope(1,102,3)),/must rotate/);
  r.rotateEpoch(2,f.owner);
  assert.equal(r.status().stopEncountered,true);
  const same=JSON.parse(f.json(105,1));
  same.phase='running';
  assert.throws(()=>r.receive({epoch:2,json:Protocol.encodeStageEvent(same)}),/Same-revision/);
  f.supervisor.start({seed:2,budget:128,ownerContext:f.owner});
  const active=r.receive(f.envelope(2,110,1));
  assert.equal(active.revision,3);
  assert.equal(active.phase,'running');
  assert.equal(r.status().stopEncountered,true);
});
test('lifetime event cap never resets after checkpoint restoration',()=>{
  const f=setup(2);
  f.receiver.receive(f.envelope(1,100,1));f.supervisor.tick();
  f.receiver.receive(f.envelope(1,110,2));
  const r=restore(f,f.receiver.exportCheckpoint());
  r.rotateEpoch(2,f.owner);
  f.supervisor.tick();
  assert.throws(()=>r.receive(f.envelope(2,120,1)),/Lifetime accepted event cap/);
  assert.equal(r.status().totalAcceptedLifetime,2);
});
test('fresh receiver required; existing cursor cannot be overwritten',()=>{
  const f=setup();
  const checkpoint=f.receiver.exportCheckpoint();
  f.receiver.receive(f.envelope(1,100,1));
  assert.throws(()=>f.receiver.restoreCheckpoint(checkpoint,f.owner),/requires a fresh receiver/);
  const fresh=setup();
  fresh.receiver.rotateEpoch(2,fresh.owner);
  assert.throws(()=>fresh.receiver.restoreCheckpoint(checkpoint,fresh.owner),/requires a fresh receiver/);
});
test('truthy and async authorization cannot restore',()=>{
  const f=setup();const checkpoint=f.receiver.exportCheckpoint();
  for(const authorizeOwner of [()=>false,()=>1,()=>({}),()=>Promise.resolve(true)]) {
    const r=Cursor.createStageReconnectReceiver({epoch:1,authorizeOwner});
    assert.throws(()=>r.restoreCheckpoint(checkpoint,f.owner),/authorization required/);
    assert.equal(r.status().totalAcceptedLifetime,0);
    assert.throws(()=>r.restoreCheckpoint(checkpoint,f.owner),/fresh receiver/);
  }
});
test('owner identity is not cloned, restored or embedded into checkpoint',()=>{
  const f=setup();f.receiver.receive(f.envelope(1,100,1));
  const text=f.receiver.exportCheckpoint();
  assert.ok(!text.includes('trusted-owner'));
  assert.ok(!text.includes('rngState'));
  assert.ok(!text.includes('"seed"'));
  const bad=Cursor.createStageReconnectReceiver({epoch:1,authorizeOwner:f.authorizeOwner});
  assert.throws(()=>bad.restoreCheckpoint(text,{is:'trusted-owner'}),/authorization required/);
  assert.equal(restore(f,text).getLatest().phase,'running');
});
test('strict checkpoint shape rejects additions, tampering, inconsistent floors',()=>{
  const f=setup();f.receiver.receive(f.envelope(1,100,1));
  const original=JSON.parse(f.receiver.exportCheckpoint());
  const variants=[
    {...original,schema:'something-else'},
    {...original,extra:'ignore'},
    {...original,epoch:0},
    {...original,epoch:1.1},
    {...original,maxEvents:1025},
    {...original,totalAcceptedLifetime:-1},
    {...original,totalAcceptedLifetime:129},
    {...original,currentEpochSequence:-1},
    {...original,currentEpochSequence:5},
    {...original,lastAcceptedAt:99},
    {...original,stopEncountered:false,latestAcceptedEvent:{...original.latestAcceptedEvent,phase:'stopped'}},
    {...original,latestAcceptedEvent:null},
    {...original,mustRotate:'false'},
    {...original,currentEpochSequence:1,latestAcceptedEvent:{...original.latestAcceptedEvent,board:[]}}
  ];
  for(const variant of variants)assert.throws(()=>Cursor.parseReconnectCheckpoint(JSON.stringify(variant)));
});
test('canonical JSON, size bounds and duplicate keys',()=>{
  const f=setup();const text=f.receiver.exportCheckpoint();
  assert.throws(()=>Cursor.parseReconnectCheckpoint(text.replace('"epoch":1','"epoch":1,"epoch":1')),/Noncanonical/);
  assert.throws(()=>Cursor.parseReconnectCheckpoint(' '.concat(text)),/Noncanonical/);
  assert.throws(()=>Cursor.parseReconnectCheckpoint('bad'),/Malformed/);
  assert.throws(()=>Cursor.parseReconnectCheckpoint('x'.repeat(Cursor.MAX_CHECKPOINT_BYTES+1)),/bounded/);
  assert.throws(()=>Cursor.parseReconnectCheckpoint({schema:'x'}),/bounded/);
});
test('restore refuses mismatched epoch/maxEvents and leaves empty receiver',()=>{
  const f=setup();const text=f.receiver.exportCheckpoint();
  const epoch=Cursor.createStageReconnectReceiver({epoch:2,maxEvents:128,authorizeOwner:f.authorizeOwner});
  assert.throws(()=>epoch.restoreCheckpoint(text,f.owner),/epoch or lifetime policy/);
  assert.equal(epoch.status().epoch,2);
  assert.equal(epoch.status().totalAcceptedLifetime,0);
  const max=Cursor.createStageReconnectReceiver({epoch:1,maxEvents:512,authorizeOwner:f.authorizeOwner});
  assert.throws(()=>max.restoreCheckpoint(text,f.owner),/epoch or lifetime policy/);
});
test('checkpoint export and restore enforce synchronous reentrancy',()=>{
  const f=setup();
  const text=f.receiver.exportCheckpoint();
  let receiver;
  receiver=Cursor.createStageReconnectReceiver({
    epoch:1,maxEvents:128,authorizeOwner:(context,action)=>{
      assert.equal(action,'restoreCheckpoint');
      assert.throws(()=>receiver.exportCheckpoint(),/Cannot export during/);
      assert.throws(()=>receiver.rotateEpoch(2,context),/Reentrant/);
      return context===f.owner;
    }
  });
  assert.equal(receiver.restoreCheckpoint(text,f.owner).epoch,1);
  assert.throws(()=>receiver.receive(f.envelope(1,100,1)),/must rotate/);
});
test('host-saved checkpoint can be consumed in a distinct Node process',()=>{
  const f=setup();f.receiver.receive(f.envelope(1,100,1));
  f.supervisor.stop({ownerContext:f.owner});
  f.receiver.receive(f.envelope(1,101,2));
  const script=String.raw`'use strict';
const fs=require('node:fs');
const c=require('./src/stage-reconnect.cjs');
const token={private:true};
const checkpoint=fs.readFileSync(0,'utf8');
const saved=c.parseReconnectCheckpoint(checkpoint);
const r=c.createStageReconnectReceiver({epoch:saved.epoch,maxEvents:saved.maxEvents,
  authorizeOwner:(ctx,act)=>ctx===token&&(act==='restoreCheckpoint'||act==='rotateEpoch')});
r.restoreCheckpoint(checkpoint,token);
if(r.status().latestRevision!==2||r.getLatest().phase!=='stopped'||!r.status().stopEncountered)process.exit(4);
try{r.receive({epoch:1,json:'{}'});process.exit(5);}catch(e){if(!/must rotate/.test(e.message))process.exit(6);}
r.rotateEpoch(2,token);
process.stdout.write(JSON.stringify(r.status()));`;
  const child=spawnSync(process.execPath,['-e',script],{
    cwd:require('node:path').resolve(__dirname,'..'),encoding:'utf8',
    input:f.receiver.exportCheckpoint(),timeout:10000
  });
  assert.equal(child.status,0,child.stderr);
  assert.equal(JSON.parse(child.stdout).epoch,2);
  assert.equal(JSON.parse(child.stdout).stopEncountered,true);
});
test('failed restore remains uninitialized and cannot be retried to bypass auth',()=>{
  const f=setup();
  const r=Cursor.createStageReconnectReceiver({epoch:1,authorizeOwner:f.authorizeOwner});
  assert.throws(()=>r.restoreCheckpoint('{bad',f.owner),/Malformed/);
  assert.equal(r.status().totalAcceptedLifetime,0);
  assert.throws(()=>r.restoreCheckpoint(f.receiver.exportCheckpoint(),f.owner),/fresh receiver/);
});
test('exported record after restore marks rotation pending even if saved again',()=>{
  const f=setup();f.receiver.receive(f.envelope(1,100,1));
  const r=restore(f,f.receiver.exportCheckpoint());
  assert.equal(Cursor.parseReconnectCheckpoint(r.exportCheckpoint()).mustRotate,true);
  r.rotateEpoch(2,f.owner);
  const out=Cursor.parseReconnectCheckpoint(r.exportCheckpoint());
  assert.equal(out.epoch,2);
  assert.equal(out.currentEpochSequence,0);
  assert.equal(out.mustRotate,false);
  const recovered=restore(f,r.exportCheckpoint(),2);
  assert.throws(()=>recovered.receive(f.envelope(2,110,2)),/must rotate/);
  recovered.rotateEpoch(3,f.owner);
  assert.equal(recovered.receive(f.envelope(3,110,1)).revision,1);
});
console.log('ALL '+total+' STAGE RECONNECT CHECKPOINT TESTS PASSED (trusted, offline; not durable storage/authentication)');
