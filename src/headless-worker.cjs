'use strict';
// Foreground-only, bounded headless 2048 session worker.
// No start privilege, network, Twitch, credentials, timers or side effects
// until an explicitly authorized already-running supervisor is supplied.
const Protocol=require('./stage-protocol.cjs');
const Supervisor=require('./session-supervisor.cjs');
const LIMITS=Object.freeze({minIntervalMs:100,maxIntervalMs:5000,maxTicks:1024,maxElapsedMs:3600000});
function createWorker({supervisor,wait,now,emit}={}){
  if(!supervisor||typeof supervisor.status!=='function'||typeof supervisor.tick!=='function')
    throw Error('Validated supervisor required.');
  if(typeof wait!=='function'||typeof now!=='function'||typeof emit!=='function')
    throw Error('Explicit clock, delay and read-only event sink required.');
  let running=false,interrupt=false,sequence=0;
  function cancel(){interrupt=true;} // worker halt ONLY; not owner STOP in durable game store
  async function run({maxTicks=128,intervalMs=1500,maxElapsedMs=3600000}={}){
    if(running)throw Error('Worker already running.');
    if(!Number.isSafeInteger(maxTicks)||maxTicks<1||maxTicks>LIMITS.maxTicks||
      !Number.isSafeInteger(intervalMs)||intervalMs<LIMITS.minIntervalMs||
      intervalMs>LIMITS.maxIntervalMs||
      !Number.isSafeInteger(maxElapsedMs)||maxElapsedMs<intervalMs||
      maxElapsedMs>LIMITS.maxElapsedMs)
      throw Error('Invalid bounded worker policy.');
    running=true;interrupt=false;sequence=0;
    let moves=0,reason='max_ticks',lastRevision=null;
    try{
      const started=now();
      if(!Number.isSafeInteger(started)||started<0)
        throw Error('Monotonic-safe nonnegative timestamp required.');
      // A worker can resume only a saved *running* session; it never starts one.
      let state=supervisor.status();
      if(!state){return {moves,reason:'uninitialized',revision:null};}
      state=Supervisor.validate(state);
      if(state.phase!=='running')
        return {moves,reason:'session_'+state.phase,revision:state.revision};
      let expectedRevision=state.revision;
      while(moves<maxTicks){
        if(interrupt){reason='worker_cancelled';break;}
        const elapsed=now()-started;
        if(!Number.isFinite(elapsed)||elapsed<0)
          throw Error('Clock regressed or became invalid.');
        if(elapsed>=maxElapsedMs){reason='elapsed_limit';break;}
        // Wait before the first step so an owner has time to STOP.
        await wait(intervalMs);
        if(interrupt){reason='worker_cancelled';break;}
        const afterWait=now()-started;
        if(!Number.isFinite(afterWait)||afterWait<0)
          throw Error('Clock regressed or became invalid.');
        if(afterWait>=maxElapsedMs){reason='elapsed_limit';break;}
        // Re-read persisted state AFTER delay, never act on a stale cached game.
        state=supervisor.status();
        if(!state){reason='checkpoint_missing';break;}
        state=Supervisor.validate(state);
        if(state.phase!=='running'){
          reason='session_'+state.phase;lastRevision=state.revision;break;
        }
        // If another worker committed, or STOP + new Start happened while
        // asleep, never inherit its new consent or continue a foreign session.
        if(state.revision!==expectedRevision)
          throw Error('Supervisor session revision changed during delay; failing closed.');
        const next=supervisor.tick(); // CAS will fail if STOP wins a race
        state=Supervisor.validate(next);
        moves++;lastRevision=state.revision;expectedRevision=state.revision;
        // Display is projection-only: no seed, PRNG, owner auth, raw viewer data.
        const event=Protocol.projectStageEvent(state,{at:now(),sequence:++sequence});
        const published=Protocol.encodeStageEvent(event);
        await emit(published);
        if(state.phase!=='running'){reason='session_'+state.phase;break;}
      }
      return Object.freeze({moves,reason,revision:lastRevision});
    }finally{running=false;interrupt=false;}
  }
  return Object.freeze({run,cancel,isRunning:()=>running});
}
module.exports=Object.freeze({LIMITS,createWorker});
