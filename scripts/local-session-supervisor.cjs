'use strict';
// Local-only, manual CLI proof of resumable bounded game operation.
// No networking, background task, Twitch/RTMP, privileged daemon or paid service.
// The --owner-local flag represents the HOST operator terminal, NOT authentication
// for a remote service. Never expose this as an unauthenticated HTTP endpoint.
const {createSupervisor}=require('../src/session-supervisor.cjs');
const {createFileStore}=require('../src/supervisor-file-store.cjs');
const args=process.argv.slice(2), opts={};
for(const arg of args){
  const match=arg.match(/^--([a-z-]+)(?:=(.*))?$/);
  if(!match||Object.hasOwn(opts,match[1]))throw Error('Duplicate or malformed supervisor argument');
  opts[match[1]]=match[2]===undefined?true:match[2];
}
const actions=['start','run','stop','status'].filter(action=>Object.hasOwn(opts,action));
const keys=['state','start','run','stop','status','owner-local','seed','budget'];
if(Object.keys(opts).some(k=>!keys.includes(k))||actions.length!==1||
  typeof opts.state!=='string'||!opts.state)
  throw Error('Specify --state=/absolute/private/path.json and ONE of --start, --run=N, --stop or --status');
const action=actions[0];
const owner=Object.freeze({});
const localOwner=opts['owner-local']===true;
if((action==='start'||action==='stop')&&!localOwner)
  throw Error('Explicit --owner-local required (local-only operator; not remote authentication)');
if(action==='start'&&(opts.start!==true||
  !/^(0|[1-9]\d*)$/.test(String(opts.seed||''))||
  !['128','512','1024'].includes(String(opts.budget||'128'))))
  throw Error('Start requires --seed=<uint32>, optional --budget=128|512|1024');
if(action==='run'&&(!/^[1-9]\d*$/.test(String(opts.run))||
  Number(opts.run)>1024))throw Error('--run must be 1..1024 ticks');
if((action==='stop'&&opts.stop!==true)||(action==='status'&&opts.status!==true))
  throw Error('Invalid flag syntax');
if(action!=='start'&&(opts.seed!==undefined||opts.budget!==undefined))
  throw Error('Seed and budget only permitted when starting');
const allowed=new Set(action==='start'?['state','start','owner-local','seed','budget']:
  action==='stop'?['state','stop','owner-local']:['state',action]);
if(Object.keys(opts).some(k=>!allowed.has(k)))throw Error('Unneeded arguments refused');
const store=createFileStore(opts.state);
const worker=createSupervisor({
  store,authorizeOwner:(context,operation)=>context===owner&&localOwner&&
    (operation==='start'||operation==='stop')
});
if(action==='start')worker.start({seed:Number(opts.seed),budget:Number(opts.budget||128),ownerContext:owner});
if(action==='stop')worker.stop({ownerContext:owner});
if(action==='run'){
  // A one-shot bounded pass over a PREVIOUSLY approved session, not a daemon.
  // Each tick atomically saves its state; an intervening owner STOP or another
  // writer causes this invocation to end, never auto-retry a revision conflict.
  for(let i=0;i<Number(opts.run);i++){
    if(worker.status()?.phase!=='running')break;
    worker.tick();
  }
}
const state=worker.status();
console.log(JSON.stringify(state?{
  schema:'clanker.local2048.supervisor-status.v1',phase:state.phase,
  revision:state.revision,budget:state.budget,turns:state.game.turns,
  score:state.game.score,highestTile:Math.max(...state.game.board.flat()),
  remaining:Math.max(0,state.budget-state.game.turns)
}:{schema:'clanker.local2048.supervisor-status.v1',phase:'uninitialized'}));
