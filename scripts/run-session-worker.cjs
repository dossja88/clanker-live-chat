'use strict';
// Manual foreground runner for an ALREADY owner-approved local 2048 session.
// No HTTP, listener, remote owner control, Twitch chat, RTMP, daemon or cron.
const fs=require('node:fs'),path=require('node:path');
const {performance}=require('node:perf_hooks');
const {createFileStore}=require('../src/supervisor-file-store.cjs');
const {createSupervisor}=require('../src/session-supervisor.cjs');
const {createWorker}=require('../src/headless-worker.cjs');
const argv=process.argv.slice(2),opts={};
for(const part of argv){
  const match=part.match(/^--(state|ticks|interval-ms|elapsed-ms|jsonl)=(.*)$/);
  if(!match||Object.hasOwn(opts,match[1]))throw Error('Unknown or repeated worker argument.');
  opts[match[1]]=match[2];
}
if(typeof opts.state!=='string'||!path.isAbsolute(opts.state))
  throw Error('Explicit --state=/absolute/private/session.json required.');
const parseNumber=(name,fallback,min,max)=>{
  if(opts[name]===undefined)return fallback;
  if(!/^(0|[1-9]\d*)$/.test(opts[name]))throw Error('Invalid '+name);
  const n=Number(opts[name]);
  if(!Number.isSafeInteger(n)||n<min||n>max)throw Error('Out-of-range '+name);
  return n;
};
const maxTicks=parseNumber('ticks',128,1,1024);
const intervalMs=parseNumber('interval-ms',1500,100,5000);
const maxElapsedMs=parseNumber('elapsed-ms',3600000,intervalMs,3600000);
if(opts.jsonl!==undefined&&opts.jsonl!=='true')throw Error('--jsonl=true required');
const store=createFileStore(opts.state);
const supervisor=createSupervisor({store,authorizeOwner:()=>false});
// This worker never starts a game. It can only advance a saved running session.
const status=supervisor.status();
if(!status||status.phase!=='running'){
  console.log(JSON.stringify({schema:'clanker.local2048.worker-run.v1',
    reason:status?'session_'+status.phase:'uninitialized',moves:0}));
}else{
  let worker=null;
  const now=()=>Math.floor(performance.timeOrigin+performance.now());
  worker=createWorker({supervisor,now,
    wait:ms=>new Promise(resolve=>setTimeout(resolve,ms)),
    emit:payload=>{if(opts.jsonl==='true')process.stdout.write(payload+'\n');}
  });
  // SIGTERM/SIGINT stop *this foreground worker*, not the persisted owner
  // STOP. To persist STOP, use local-session-supervisor --stop --owner-local.
  process.once('SIGINT',()=>worker.cancel());
  process.once('SIGTERM',()=>worker.cancel());
  worker.run({maxTicks,intervalMs,maxElapsedMs}).then(result=>{
    console.log(JSON.stringify({schema:'clanker.local2048.worker-run.v1',...result}));
  }).catch(err=>{
    console.error('Local worker halted safely: '+String(err&&err.message||err));
    process.exitCode=1;
  });
}
