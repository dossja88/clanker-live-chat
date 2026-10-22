'use strict';
// Manual offline fail-closed supervisor test suite.
// Usage: node tests/supervisor2048.cjs
const assert=require('node:assert/strict');
const {createSupervisor,createMemoryStore,validate}=require('../src/session-supervisor.cjs');
const {createFileStore}=require('../src/supervisor-file-store.cjs');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const OWNER=Object.freeze({localTrustedOwner:true});
const authorizeOwner=(context,operation)=>context===OWNER&&['start','stop'].includes(operation);
const create=(store)=>createSupervisor({store,authorizeOwner});
let total=0;
const pass=message=>{total++;console.log('PASS '+message);};

// Default-deny: no owner authorization callback is silently assumed.
assert.throws(()=>createSupervisor({store:createMemoryStore()}),/authorization/);
const memory=createMemoryStore();
let supervisor=create(memory);
assert.equal(supervisor.status(),null);
assert.equal(supervisor.tick(),null);
assert.throws(()=>supervisor.start({seed:1,budget:128}),/Owner authorization/);
assert.throws(()=>supervisor.stop(),/Owner authorization/);
assert.throws(()=>supervisor.start({seed:1,budget:127,ownerContext:OWNER}),/Invalid approved/);
assert.throws(()=>supervisor.start({seed:-1,budget:128,ownerContext:OWNER}),/Invalid approved/);
const consent=supervisor.start({seed:1,budget:1024,ownerContext:OWNER});
assert.equal(consent.phase,'running');assert.equal(consent.budget,1024);
assert.equal(consent.revision,1);
assert.equal(consent.game.turns,0);
assert.doesNotMatch(JSON.stringify(memory.read()),/localTrustedOwner|ownerContext|twitch|token|viewer/i);
assert.throws(()=>supervisor.start({seed:2,budget:1024,ownerContext:OWNER}),/already active/);
pass('only owner-authorized bounded sessions start; no credentials or owner context persisted');

// A supervisor re-created over the SAME persistent store resumes an approved
// bounded session, preserving PRNG state and every move after a crash.
for(let n=0;n<250;n++)supervisor.tick();
const beforeCrash=supervisor.status();
assert.equal(beforeCrash.game.turns,250);
const saved=JSON.parse(JSON.stringify(beforeCrash));
supervisor=create(memory); // simulates the process losing all in-memory state
assert.deepEqual(supervisor.status(),saved);
while(supervisor.status().phase==='running')supervisor.tick();
const won=supervisor.status();
assert.equal(won.phase,'won');assert.equal(won.game.status,'won');
assert.equal(won.game.turns,1019);assert.equal(won.game.score,20792);
assert.equal(Math.max(...won.game.board.flat()),2048);
const finalRev=won.revision;
assert.deepEqual(supervisor.tick(),won);assert.equal(supervisor.status().revision,finalRev);
pass('restarted bounded session reaches seeded local win at turn 1019 with exact score 20792');

// STOP survives supervisor destruction. Viewers cannot undo it, and a fresh
// owner-approved start (not mere restart) is required for a new session.
const stoppedStore=createMemoryStore(),run=create(stoppedStore);
run.start({seed:5,budget:512,ownerContext:OWNER});
for(let i=0;i<17;i++)run.tick();
const stopped=run.stop({ownerContext:OWNER});
assert.equal(stopped.phase,'stopped');
const restart=create(stoppedStore);
assert.deepEqual(restart.tick(),stopped);
assert.deepEqual(restart.status(),stopped);
assert.throws(()=>restart.start({seed:3,budget:128,ownerContext:{viewer:'crew'}}),/Owner authorization/);
assert.throws(()=>restart.stop({ownerContext:{viewer:'crew'}}),/Owner authorization/);
const fresh=restart.start({seed:3,budget:128,ownerContext:OWNER});
assert.equal(fresh.game.turns,0);assert.equal(fresh.phase,'running');
assert.equal(fresh.revision,stopped.revision+1);
pass('durable STOP blocks recovery; new owner authorization creates new bounded session');

// At 128, the game is capped rather than silently starting another one.
const cappedStore=createMemoryStore(),capped=create(cappedStore);
capped.start({seed:1,budget:128,ownerContext:OWNER});
for(let i=0;i<132;i++)capped.tick();
assert.equal(capped.status().game.turns,128);
assert.equal(capped.status().phase,'capped');
const cappedRevision=capped.status().revision;
for(let i=0;i<5;i++)capped.tick();
assert.equal(capped.status().revision,cappedRevision);
pass('hard turn cap and terminal states prevent silent session restarts');

// Optimistic transactional revisions fail closed on concurrent writes or failed disk commits.
const conflictedStore=createMemoryStore();
const collision=create(conflictedStore);
collision.start({seed:7,budget:512,ownerContext:OWNER});
let conflict=true;
const storeProxy={
  read:()=>conflictedStore.read(),
  commit:(r,s)=>{if(conflict){conflict=false;return false;}return conflictedStore.commit(r,s);}
};
const contested=create(storeProxy),preConflict=conflictedStore.read();
assert.throws(()=>contested.tick(),/revision conflict/);
assert.deepEqual(conflictedStore.read(),preConflict);
assert.equal(contested.tick().game.turns,1);
assert.equal(conflictedStore.commit(0,preConflict),false);
pass('save failure does not consume a move or random tile');
// Simulate a real interleaving: another authorized supervisor commits STOP
// after this tick read its snapshot but before its CAS commit.
const stoppingStore=createMemoryStore();
create(stoppingStore).start({seed:17,budget:512,ownerContext:OWNER});
let stopInjected=false;
const raceStore={
  read:()=>stoppingStore.read(),
  commit:(expected,next)=>{
    if(!stopInjected){
      stopInjected=true;
      create(stoppingStore).stop({ownerContext:OWNER});
    }
    return stoppingStore.commit(expected,next);
  }
};
assert.throws(()=>create(raceStore).tick(),/revision conflict/);
assert.equal(stoppingStore.read().phase,'stopped');
assert.equal(stoppingStore.read().game.turns,0);
assert.deepEqual(create(stoppingStore).tick(),stoppingStore.read());
pass('concurrent owner STOP wins over an in-flight stale worker tick');
const clone=conflictedStore.read();
clone.game.board[0][0]=8192;
assert.notDeepEqual(clone,conflictedStore.read());
assert.throws(()=>validate({...conflictedStore.read(),phase:'won'}),/Contradictory/);
const invalidStore={read:()=>({...conflictedStore.read(),rngState:1.7}),commit:()=>{throw Error('must not write')}};
assert.throws(()=>create(invalidStore).tick(),/Invalid supervisor/);
pass('state corruption, contradictory status and input aliasing fail closed');

// Real Node tests only: private temporary local JSON checkpoint. No personal
// files, credentials or configured cloud storage are read or written.
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'clanker2048-supervisor-'));
try{
  const filename=path.join(dir,'session.json');
  assert.throws(()=>createFileStore('session.json'),/absolute/);
  let diskStore=createFileStore(filename),disk=create(diskStore);
  disk.start({seed:11,budget:128,ownerContext:OWNER});
  for(let i=0;i<12;i++)disk.tick();
  const snapshot=disk.status();
  assert.equal(fs.existsSync(filename),true);
  assert.equal(JSON.parse(fs.readFileSync(filename,'utf8')).revision,snapshot.revision);
  const restartDisk=create(createFileStore(filename));
  assert.deepEqual(restartDisk.status(),snapshot);
  const stoppedDisk=restartDisk.stop({ownerContext:OWNER});
  assert.equal(create(createFileStore(filename)).status().phase,'stopped');
  assert.equal(create(createFileStore(filename)).tick().revision,stoppedDisk.revision);
  assert.equal(createFileStore(filename).commit(snapshot.revision,stoppedDisk),false);
  fs.writeFileSync(filename+'.lock','owner-review-required',{flag:'wx',mode:0o600});
  assert.throws(()=>create(createFileStore(filename)).start({seed:1,budget:128,ownerContext:OWNER}),/EEXIST/);
  fs.unlinkSync(filename+'.lock');
  assert.equal(createFileStore(filename).read().phase,'stopped');
  const original=fs.readFileSync(filename,'utf8');
  fs.writeFileSync(filename,'{corrupted-json');
  assert.throws(()=>create(createFileStore(filename)).tick());
  fs.writeFileSync(filename,original);
  assert.equal(createFileStore(filename).read().phase,'stopped');
  if(process.platform!=='win32'){
    fs.chmodSync(filename,0o644);
    assert.throws(()=>createFileStore(filename).read(),/Unsafe/);
    fs.chmodSync(filename,0o600);
    assert.throws(()=>createFileStore(path.join(os.tmpdir(),'insecure-root.json')),
      /privately controlled/);
  }
  pass('real local file checkpoint survives restart, enforces lock and retains STOP');
}finally{
  fs.rmSync(dir,{recursive:true,force:true});
}
console.log('ALL '+total+' SUPERVISOR CHECKS PASSED (local 2048 only; not cloud/Twitch/broadcast)');
