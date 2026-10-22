'use strict';
// Deterministic, offline worker scheduling checks; no Node timers or network.
// Run: node tests/worker2048.cjs
const assert=require('node:assert/strict');
const S=require('../src/session-supervisor.cjs');
const W=require('../src/headless-worker.cjs');
const P=require('../src/stage-protocol.cjs');
const OWNER={authorized:true};
const make=seed=>{
  const store=S.createMemoryStore();
  const supervisor=S.createSupervisor({store,authorizeOwner:x=>x===OWNER});
  if(seed!==null)supervisor.start({seed,budget:1024,ownerContext:OWNER});
  return {store,supervisor};
};
const logs=[];const pass=msg=>{logs.push(msg);console.log('PASS '+msg)};
(async()=>{
  // No implicit session or consent, no game runs before explicitly authorized start.
  {
    const {supervisor}=make(null);let now=1000,emitted=[];
    const worker=W.createWorker({supervisor,now:()=>now,wait:async ms=>{now+=ms},
      emit:x=>emitted.push(x)});
    assert.deepEqual(await worker.run({maxTicks:4,intervalMs:100}),{
      moves:0,reason:'uninitialized',revision:null
    });
    assert.equal(emitted.length,0);
    for(const bad of [{maxTicks:0},{maxTicks:1025},{intervalMs:0},
      {intervalMs:5001},{maxElapsedMs:0},{maxElapsedMs:3600001}])
      await assert.rejects(()=>worker.run(bad),/Invalid bounded worker policy/);
    pass('default-deny with bounded count, interval and elapsed-time constraints');
  }
  {
    const {supervisor}=make(1);let now=1000,seen=[];
    const worker=W.createWorker({supervisor,now:()=>now,wait:async ms=>{now+=ms},
      emit:async payload=>seen.push(P.parseStageEvent(payload))});
    const result=await worker.run({maxTicks:3,intervalMs:100});
    assert.equal(result.moves,3);
    assert.equal(result.reason,'max_ticks');
    assert.equal(supervisor.status().game.turns,3);
    assert.deepEqual(seen.map(e=>e.turns),[1,2,3]);
    assert.deepEqual(seen.map(e=>e.sequence),[1,2,3]);
    assert.ok(seen.every(e=>e.schema===P.SCHEMA));
    assert.ok(seen.every(e=>!Object.hasOwn(e,'seed')&&
      !Object.hasOwn(e,'rngState')&&!Object.hasOwn(e,'ownerContext')));
    const receive=P.createStageReceiver();
    for(const msg of seen)receive.receive(msg);
    assert.equal(receive.getLatest().turns,3);
    pass('valid serialized read-only event stream follows exactly persisted moves');
  }
  {
    const {supervisor}=make(3);let now=1000,emitted=[];
    const worker=W.createWorker({supervisor,now:()=>now,wait:async ms=>{
      now+=ms;supervisor.stop({ownerContext:OWNER});
    },emit:x=>emitted.push(x)});
    const result=await worker.run({maxTicks:12,intervalMs:100});
    assert.equal(result.reason,'session_stopped');assert.equal(result.moves,0);
    assert.equal(supervisor.status().game.turns,0);assert.equal(emitted.length,0);
    pass('durable STOP during the worker delay prevents any subsequent step');
  }
  {
    const {supervisor}=make(1);let now=1000,emitted=[];
    const worker=W.createWorker({supervisor,now:()=>now,
      wait:async ms=>{
        now+=ms;
        supervisor.stop({ownerContext:OWNER});
        supervisor.start({seed:9,budget:128,ownerContext:OWNER});
      },emit:x=>emitted.push(x)});
    await assert.rejects(()=>worker.run({maxTicks:10,intervalMs:100}),
      /session revision changed/);
    assert.equal(supervisor.status().seed,9);
    assert.equal(supervisor.status().game.turns,0);
    assert.equal(emitted.length,0);
    pass('old worker cannot inherit a newly owner-authorized session after STOP');
  }
  {
    const {supervisor}=make(1);let now=1000;
    const worker=W.createWorker({supervisor,now:()=>now,
      wait:async ms=>{now+=ms;supervisor.tick();},
      emit:()=>{throw Error('must not emit')}});
    await assert.rejects(()=>worker.run({maxTicks:4,intervalMs:100}),
      /session revision changed/);
    assert.equal(supervisor.status().game.turns,1);
    pass('independent worker tick during delay fences off this stale worker');
  }
  {
    const {supervisor}=make(1);let now=1000;
    const worker=W.createWorker({supervisor,now:()=>now,
      wait:async ms=>{now=0;},emit:()=>{throw Error('must not emit')}});
    await assert.rejects(()=>worker.run({maxTicks:2,intervalMs:100}),
      /Clock regressed/);
    assert.equal(supervisor.status().game.turns,0);
    pass('clock reversal during delay refuses the pending move');
  }
  {
    const {supervisor}=make(1);let now=1000,emitted=[];
    let worker;worker=W.createWorker({supervisor,now:()=>now,
      wait:async ms=>{now+=ms;worker.cancel();},
      emit:x=>emitted.push(x)});
    const result=await worker.run({maxTicks:50,intervalMs:100});
    assert.equal(result.reason,'worker_cancelled');assert.equal(result.moves,0);
    assert.equal(supervisor.status().phase,'running');assert.equal(emitted.length,0);
    pass('worker cancellation does not impersonate a persisted owner STOP');
  }
  {
    const {supervisor}=make(1);let now=1000;
    const worker=W.createWorker({supervisor,now:()=>now,
      wait:async ms=>{now+=ms},
      emit:()=>{throw Error('sink failure')}});
    await assert.rejects(()=>worker.run({maxTicks:3,intervalMs:100}),/sink failure/);
    assert.equal(supervisor.status().game.turns,1);
    assert.equal(worker.isRunning(),false);
    pass('event sink faults stop immediately without silently retrying game moves');
  }
  {
    const {supervisor}=make(1);let now=1000;
    const worker=W.createWorker({supervisor,now:()=>now,
      wait:async ms=>{now+=ms},emit:()=>{}});
    const elapsed=await worker.run({maxTicks:99,intervalMs:100,maxElapsedMs:250});
    assert.equal(elapsed.moves,2);assert.equal(elapsed.reason,'elapsed_limit');
    assert.equal(supervisor.status().game.turns,2);
    pass('monotonic elapsed bound stops work without clearing approved session');
  }
  {
    const {supervisor}=make(1);let now=1000,resolveWait;
    const worker=W.createWorker({supervisor,now:()=>now,
      wait:()=>new Promise(resolve=>resolveWait=resolve),
      emit:()=>{}});
    const first=worker.run({maxTicks:4,intervalMs:100});
    await assert.rejects(()=>worker.run({maxTicks:4,intervalMs:100}),/already running/);
    worker.cancel();
    now+=100;resolveWait();
    const cancelled=await first;
    assert.equal(cancelled.moves,0);
    assert.equal(worker.isRunning(),false);
    pass('parallel invocation rejected and pending worker can be interrupted');
  }
  {
    const {supervisor}=make(1);let now=1000;
    const worker=W.createWorker({supervisor,now:()=>now,
      wait:async ms=>{now+=ms},emit:()=>{}});
    // As previously demonstrated: 1019-step local win with no new Start.
    const result=await worker.run({maxTicks:1024,intervalMs:100,maxElapsedMs:200000});
    assert.equal(result.moves,1019);
    assert.equal(result.reason,'session_won');
    assert.equal(supervisor.status().game.score,20792);
    assert.equal(supervisor.status().phase,'won');
    const again=await worker.run({maxTicks:4,intervalMs:100});
    assert.equal(again.moves,0);assert.equal(again.reason,'session_won');
    pass('long foreground worker reaches actual local 2048 win and stops terminally');
  }
  console.log('ALL '+logs.length+' WORKER CHECKS PASSED (offline local 2048 only)');
})().catch(e=>{console.error(e);process.exitCode=1});
