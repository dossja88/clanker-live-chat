'use strict';
// Bounded local-2048 session supervisor, independent of browsers/cloud/Twitch.
// Owners and storage are supplied by the future host. No host authorization is
// implied by source code; authorizeOwner is an explicit trusted host boundary.
const Core=require('./2048-core.cjs');
const SCHEMA='clanker.local2048.supervisor.v1';
const BUDGETS=Object.freeze([128,512,1024]);
const PHASES=Object.freeze(['running','stopped','capped','won','lost']);
const copy=v=>v===null?null:JSON.parse(JSON.stringify(v));
function validate(record){
  if(!record||typeof record!=='object'||Array.isArray(record)||
     Object.keys(record).sort().join(',')!=='budget,game,phase,revision,rngState,schema,seed'||
     record.schema!==SCHEMA||!Number.isSafeInteger(record.revision)||record.revision<1||
     record.revision>100000000||!Number.isSafeInteger(record.seed)||record.seed<0||
     record.seed>4294967295||!Number.isSafeInteger(record.rngState)||
     record.rngState<0||record.rngState>4294967295||
     !BUDGETS.includes(record.budget)||!PHASES.includes(record.phase))
    throw Error('Invalid supervisor checkpoint; refusing to run.');
  const game=Core.assertGame(record.game);
  if(game.turns>record.budget||
    (record.phase==='won')!==(game.status==='won')||
    (record.phase==='lost')!==(game.status==='lost')||
    (['running','stopped','capped'].includes(record.phase))!==(game.status==='playing')||
    record.phase==='running'&&game.turns>=record.budget||
    record.phase==='capped'&&game.turns!==record.budget)
    throw Error('Contradictory supervisor checkpoint; refusing to run.');
  return copy(record);
}
function createMemoryStore(initial=null){
  let value=initial===null?null:validate(copy(initial));
  return Object.freeze({
    read(){return copy(value);},
    commit(expectedRevision,next){
      const current=value?.revision||0;
      if(current!==expectedRevision)return false;
      const candidate=validate(next);
      if(candidate.revision!==expectedRevision+1)throw Error('Bad revision increment');
      value=copy(candidate);
      return true;
    }
  });
}
function createSupervisor({store,authorizeOwner}={}){
  if(!store||typeof store.read!=='function'||typeof store.commit!=='function')
    throw Error('Explicit transactional store required');
  // No default allowing anonymous UI/chat messages to act as the owner.
  if(typeof authorizeOwner!=='function')throw Error('Trusted owner authorization callback required');
  const read=()=>{
    const raw=store.read();
    return raw===null?null:validate(raw);
  };
  function write(previous,next){
    const expected=previous?.revision||0;
    const candidate=validate({...next,schema:SCHEMA,revision:expected+1});
    if(store.commit(expected,candidate)!==true)
      throw Error('Supervisor revision conflict; failing closed');
    return copy(candidate);
  }
  function demandOwner(context,action){
    // Promise, truthy object, viewer text, or missing auth are never sufficient.
    if(authorizeOwner(context,action)!==true)
      throw Error('Owner authorization required for '+action);
  }
  function start({seed,budget=128,ownerContext}={}){
    demandOwner(ownerContext,'start');
    if(!Number.isSafeInteger(seed)||seed<0||seed>4294967295||
       !BUDGETS.includes(budget))throw Error('Invalid approved local session policy');
    const previous=read();
    if(previous?.phase==='running')throw Error('Session already active; stop first');
    const random=Core.seededRng(seed);
    const {game}=Core.createGame(random);
    return write(previous,{seed,budget,rngState:random.checkpoint(),game,phase:'running'});
  }
  function stop({ownerContext}={}){
    demandOwner(ownerContext,'stop');
    const before=read();
    if(!before||before.phase!=='running')return before;
    return write(before,{...before,phase:'stopped'});
  }
  function tick(){
    const before=read();
    if(!before)return null;
    if(before.phase!=='running')return before;
    // No in-memory PRNG or game state survives across transactions. Every
    // decision is based on validated persisted state, so restart = continuity.
    const random=Core.seededRng(before.rngState);
    const chosen=Core.chooseLocal2048Action(before.game.board,'none');
    if(!chosen||!Core.PUZZLE_DIRECTIONS.includes(chosen.direction))
      throw Error('Planner declined or proposed an unsafe local move; failing closed');
    const step=Core.advanceGame(before.game,chosen.direction,random);
    if(!step.changed)throw Error('Illegal move proposed by planner; failing closed');
    const game=step.game;
    const phase=game.status!=='playing'?game.status:
      game.turns>=before.budget?'capped':'running';
    return write(before,{...before,game,rngState:random.checkpoint(),phase});
  }
  function status(){return read();}
  return Object.freeze({start,stop,tick,status});
}
module.exports=Object.freeze({SCHEMA,BUDGETS,createMemoryStore,createSupervisor,validate});
