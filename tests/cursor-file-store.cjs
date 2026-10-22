'use strict';
// Native Node >=20, private temporary directory only. No credentials or network.
const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {spawnSync}=require('node:child_process');
const Cursor=require('../src/stage-reconnect.cjs');
const Protocol=require('../src/stage-protocol.cjs');
const Supervisor=require('../src/session-supervisor.cjs');
const Disk=require('../src/cursor-file-store.cjs');
let count=0;
function pass(message){count++;console.log('PASS '+message);}
const owner=Object.freeze({trusted:true});
const allowed=(context,action)=>context===owner&&
  ['restoreCheckpoint','rotateEpoch'].includes(action);
function source(){
  const store=Supervisor.createMemoryStore();
  const supervisor=Supervisor.createSupervisor({store,
    authorizeOwner:(ctx,act)=>ctx===owner&&['start','stop'].includes(act)});
  supervisor.start({seed:1,budget:128,ownerContext:owner});
  const emit=(at,sequence)=>Protocol.encodeStageEvent(
    Protocol.projectStageEvent(supervisor.status(),{at,sequence}));
  return {supervisor,emit};
}
function freshReceiver(epoch=1,maxEvents=128){
  return Cursor.createStageReconnectReceiver({epoch,maxEvents,authorizeOwner:allowed});
}
function receiverFor(store){
  const record=store.read();
  if(!record)return Disk.bindDurableReceiver({store,receiver:freshReceiver()});
  const saved=Cursor.parseReconnectCheckpoint(record.checkpoint);
  const receiver=freshReceiver(saved.epoch,saved.maxEvents);
  receiver.restoreCheckpoint(record.checkpoint,owner);
  return Disk.bindDurableReceiver({store,receiver});
}
const directory=fs.mkdtempSync(path.join(os.tmpdir(),'clanker-cursor-private-'));
const checkpointFile=path.join(directory,'cursor.json');
const cursorStore=Disk.createCursorFileStore(checkpointFile);
try{
  assert.equal(cursorStore.read(),null);
  assert.throws(()=>Disk.createCursorFileStore('cursor.json'),/absolute/);
  assert.throws(()=>Disk.createCursorFileStore(path.join(os.tmpdir(),'cursor-public.json')),
    /owner-only|private/i);
  const producer=source();
  let durable=receiverFor(cursorStore);
  const packet=(epoch,at,sequence)=>({epoch,json:producer.emit(at,sequence)});
  durable.receive(packet(1,100,1));
  const first=cursorStore.read();
  assert.equal(first.revision,1);
  assert.equal(Cursor.parseReconnectCheckpoint(first.checkpoint).totalAcceptedLifetime,1);
  assert.ok(!JSON.stringify(first).includes('trusted'));
  assert.ok(!JSON.stringify(first).includes('rngState'));
  assert.equal(durable.status().latestRevision,1);
  pass('private cursor pair created with exact canonical stage state and no auth/secrets');
  producer.supervisor.stop({ownerContext:owner});
  durable.receive(packet(1,110,2));
  const stopped=cursorStore.read();
  assert.equal(stopped.revision,2);
  assert.equal(Cursor.parseReconnectCheckpoint(stopped.checkpoint).stopEncountered,true);
  assert.equal(durable.getLatest().phase,'stopped');
  pass('receiver STOP floor and lifetime history committed atomically per logical CAS');
  const recovered=receiverFor(cursorStore);
  assert.equal(recovered.revision(),3); // persisted mustRotate after restore
  assert.equal(recovered.status().stopEncountered,true);
  const pending=cursorStore.read(),unsafe=JSON.parse(pending.checkpoint);
  unsafe.mustRotate=false;
  assert.throws(()=>cursorStore.commit(pending.revision,JSON.stringify(unsafe)),
    /Cursor rollback refused/);
  assert.deepEqual(cursorStore.read(),pending);
  assert.throws(()=>recovered.receive(packet(1,120,3)),/must rotate/);
  // A validation failure seals the wrapper, so construct another trusted instance.
  const rotated=receiverFor(cursorStore);
  rotated.rotateEpoch(2,owner);
  assert.equal(rotated.status().epoch,2);
  assert.equal(Cursor.parseReconnectCheckpoint(cursorStore.read().checkpoint).epoch,2);
  producer.supervisor.start({seed:2,budget:128,ownerContext:owner});
  rotated.receive(packet(2,130,1));
  assert.equal(rotated.status().stopEncountered,true);
  assert.equal(rotated.getLatest().phase,'running');
  pass('trusted reconstruction requires a new epoch and retains historical STOP');
  const before=cursorStore.read();
  const older=JSON.stringify(before);
  const oldVersion=before.revision-1;
  assert.equal(cursorStore.commit(oldVersion,before.checkpoint),false);
  assert.deepEqual(cursorStore.read(),before);
  pass('stale expected revisions cannot replace durable state');
  const parallelA=receiverFor(cursorStore);
  const parallelB=receiverFor(cursorStore);
  // both wrappers independently perform trusted restart rotation
  parallelA.rotateEpoch(3,owner);
  assert.throws(()=>parallelB.rotateEpoch(3,owner),/CAS conflict|Restore fence conflict/);
  assert.throws(()=>parallelB.status(),/sealed/);
  pass('simultaneous receiver instances cannot silently overwrite each other');
  assert.equal(cursorStore.read().revision,parallelA.revision());
  fs.writeFileSync(checkpointFile+'.lock','stale lock',{flag:'wx',mode:0o600});
  assert.throws(()=>cursorStore.read(),/locked/);
  assert.throws(()=>cursorStore.commit(before.revision,before.checkpoint),/EEXIST/);
  fs.unlinkSync(checkpointFile+'.lock');
  assert.ok(cursorStore.read());
  pass('stale exclusive locks block reads/writes until explicitly investigated');
  const savedMain=fs.readFileSync(checkpointFile,'utf8');
  fs.writeFileSync(checkpointFile,'{broken',{mode:0o600});
  assert.throws(()=>cursorStore.read(),/Corrupted/);
  fs.writeFileSync(checkpointFile,savedMain,{mode:0o600});
  assert.ok(cursorStore.read());
  pass('corrupted checkpoint is rejected without auto-reset');
  const fenceFile=checkpointFile+'.fence',savedFence=fs.readFileSync(fenceFile,'utf8');
  fs.writeFileSync(fenceFile,JSON.stringify({wrong:true}),{mode:0o600});
  assert.throws(()=>cursorStore.read(),/Invalid cursor fence|mismatch/);
  fs.writeFileSync(fenceFile,savedFence,{mode:0o600});
  pass('torn cursor/fence state refuses unsafe automatic recovery');
  if(process.platform!=='win32'){
    fs.chmodSync(checkpointFile,0o644);
    assert.throws(()=>cursorStore.read(),/Unsafe/);
    fs.chmodSync(checkpointFile,0o600);
    assert.ok(cursorStore.read());
  }
  const symlink=path.join(directory,'link.json');
  fs.symlinkSync(checkpointFile,symlink);
  assert.throws(()=>Disk.createCursorFileStore(symlink).read(),/Unsafe|Incomplete/);
  pass('group-readable and symlinked checkpoint files rejected');
  const now=cursorStore.read();
  const child=spawnSync(process.execPath,['-e',
    `const d=require('./src/cursor-file-store.cjs');const p=process.argv[1];
     const v=d.createCursorFileStore(p).read();
     if(!v||v.revision!==${now.revision})process.exit(9);
     process.stdout.write(JSON.stringify({rev:v.revision,epoch:
       require('./src/stage-reconnect.cjs').parseReconnectCheckpoint(v.checkpoint).epoch}));`,
    checkpointFile],{cwd:path.resolve(__dirname,'..'),encoding:'utf8',timeout:10000});
  assert.equal(child.status,0,child.stderr);
  assert.equal(JSON.parse(child.stdout).epoch,3);
  pass('genuine separate Node process reads durable trusted checkpoint');
  // Detect a one-sided rollback. A malicious rollback of BOTH files requires
  // a separate trusted monotonic counter outside this local directory.
  fs.writeFileSync(checkpointFile,older,{mode:0o600});
  assert.throws(()=>cursorStore.read(),/mismatch/);
  fs.writeFileSync(checkpointFile,savedMain,{mode:0o600});
  assert.deepEqual(cursorStore.read(),now);
  pass('one-file rollback refused against independent fence');
}finally{fs.rmSync(directory,{recursive:true,force:true});}
console.log('ALL '+count+' CURSOR FILE STORE CHECKS PASSED (offline single host only)');
