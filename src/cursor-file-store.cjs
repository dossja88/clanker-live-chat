'use strict';
// PRIVATE single-host offline cursor store and receiver bridge. Not a remote
// authorization service, distributed lock, or cryptographic rollback anchor.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const Cursor=require('./stage-reconnect.cjs');
const SCHEMA='clanker.local2048.cursor-file-store.v1';
const MAX_RECORD_BYTES=8192;
const clone=x=>JSON.parse(JSON.stringify(x));
const hash=s=>crypto.createHash('sha256').update(s,'utf8').digest('hex');
const strictlyFinite=n=>Number.isSafeInteger(n)&&n>=0;
function validateRecord(obj){
  if(!obj||typeof obj!=='object'||Array.isArray(obj)||
    Object.keys(obj).sort().join(',')!=='checkpoint,digest,revision,schema'||
    obj.schema!==SCHEMA||!strictlyFinite(obj.revision)||obj.revision<1||
    typeof obj.checkpoint!=='string'||obj.checkpoint.length>Cursor.MAX_CHECKPOINT_BYTES||
    typeof obj.digest!=='string'||!/^[0-9a-f]{64}$/.test(obj.digest))
    throw Error('Invalid durable cursor record.');
  Cursor.parseReconnectCheckpoint(obj.checkpoint);
  if(hash(obj.checkpoint)!==obj.digest)throw Error('Cursor checkpoint digest mismatch.');
  return obj;
}
function fenceFor(record){
  const cursor=Cursor.parseReconnectCheckpoint(record.checkpoint);
  return {revision:record.revision,digest:record.digest,epoch:cursor.epoch,
    totalAcceptedLifetime:cursor.totalAcceptedLifetime,
    latestStageRevision:cursor.latestAcceptedEvent?.revision||0,
    stopEncountered:cursor.stopEncountered};
}
function validateFence(value,record){
  if(!value||typeof value!=='object'||Array.isArray(value)||
    Object.keys(value).sort().join(',')!==
      'digest,epoch,latestStageRevision,revision,stopEncountered,totalAcceptedLifetime')
    throw Error('Invalid cursor fence shape.');
  if(JSON.stringify(value)!==JSON.stringify(fenceFor(record)))
    throw Error('Durable cursor and revision fence mismatch: manual recovery required.');
}
function checkProgress(oldText,newText){
  const next=Cursor.parseReconnectCheckpoint(newText);
  if(oldText===null)return;
  const prev=Cursor.parseReconnectCheckpoint(oldText);
  if(next.epoch<prev.epoch||
    next.totalAcceptedLifetime<prev.totalAcceptedLifetime||
    prev.stopEncountered&&!next.stopEncountered||
    (next.latestAcceptedEvent?.revision||0)<(prev.latestAcceptedEvent?.revision||0)||
    next.lastAcceptedAt<prev.lastAcceptedAt||
    next.epoch===prev.epoch&&next.currentEpochSequence<prev.currentEpochSequence||
    prev.mustRotate&&!next.mustRotate&&next.epoch<=prev.epoch)
    throw Error('Cursor rollback refused.');
  if(next.maxEvents!==prev.maxEvents)throw Error('Cursor lifetime policy changed.');
  if(next.epoch===prev.epoch&&next.totalAcceptedLifetime===prev.totalAcceptedLifetime&&
    next.currentEpochSequence!==prev.currentEpochSequence)
    throw Error('Cursor sequence changed without event acceptance.');
}
function createCursorFileStore(filename){
  if(typeof filename!=='string'||!path.isAbsolute(filename)||
    filename.length>4096)throw Error('Private absolute cursor path required.');
  const directory=path.dirname(filename),fence=filename+'.fence',lock=filename+'.lock';
  if(!fs.existsSync(directory)||!fs.lstatSync(directory).isDirectory()||
    fs.lstatSync(directory).isSymbolicLink())
    throw Error('Existing non-symlinked private cursor directory required.');
  const dir=fs.statSync(directory);
  if(process.platform!=='win32'&&((dir.mode&0o077)!==0||
    typeof process.getuid==='function'&&dir.uid!==process.getuid()))
    throw Error('Cursor directory must be owner-only (0700).');
  function existingEntry(file){
    // existsSync follows symlinks and reports false for a dangling link.
    // lstat must distinguish that unsafe entry from a truly missing file.
    try{return fs.lstatSync(file);}
    catch(e){if(e?.code==='ENOENT')return null;throw e;}
  }
  function secureRead(file){
    const meta=existingEntry(file);
    if(meta===null)return null;
    if(!meta.isFile()||meta.isSymbolicLink()||meta.size>MAX_RECORD_BYTES||
      process.platform!=='win32'&&((meta.mode&0o077)!==0||
        typeof process.getuid==='function'&&meta.uid!==process.getuid()))
      throw Error('Unsafe cursor checkpoint/fence file.');
    const data=fs.readFileSync(file,'utf8');
    if(Buffer.byteLength(data)>MAX_RECORD_BYTES)throw Error('Oversized cursor file.');
    return data;
  }
  function readPair(locked=false){
    if(!locked&&existingEntry(lock)!==null)
      throw Error('Cursor store locked; refuse partial read.');
    const raw=secureRead(filename),anchor=secureRead(fence);
    if(raw===null&&anchor===null)return null;
    if(raw===null||anchor===null)
      throw Error('Incomplete cursor/fence pair; manual recovery required.');
    let record,anchorObject;
    try{record=JSON.parse(raw);anchorObject=JSON.parse(anchor);}
    catch(_){throw Error('Corrupted durable cursor JSON.');}
    validateRecord(record);validateFence(anchorObject,record);
    if(JSON.stringify(record)!==raw||JSON.stringify(anchorObject)!==anchor)
      throw Error('Noncanonical durable cursor pair.');
    return clone(record);
  }
  function durableReplace(file,text){
    const temp=file+'.tmp-'+process.pid+'-'+crypto.randomBytes(8).toString('hex');
    let exists=false;
    try{
      fs.writeFileSync(temp,text,{flag:'wx',mode:0o600});exists=true;
      const fd=fs.openSync(temp,'r');
      try{fs.fsyncSync(fd);}finally{fs.closeSync(fd);}
      fs.renameSync(temp,file);exists=false;
    }finally{if(exists){try{fs.unlinkSync(temp);}catch(_){}}}
  }
  function commit(expectedRevision,newCheckpoint){
    if(!strictlyFinite(expectedRevision)||expectedRevision>100000000)
      throw Error('Invalid cursor CAS revision.');
    if(typeof newCheckpoint!=='string')throw Error('Canonical checkpoint text required.');
    Cursor.parseReconnectCheckpoint(newCheckpoint);
    const lockFd=fs.openSync(lock,'wx',0o600);
    try{
      const old=readPair(true),actual=old?.revision||0;
      if(actual!==expectedRevision)return false;
      if(expectedRevision>=100000000)throw Error('Cursor revision cap reached.');
      checkProgress(old?.checkpoint||null,newCheckpoint);
      const record={schema:SCHEMA,revision:expectedRevision+1,
        digest:hash(newCheckpoint),checkpoint:newCheckpoint};
      const anchor=fenceFor(record);
      // Two files are NOT an atomic multi-file transaction. A crash between
      // renames yields a mismatch that MUST stop on next read, not reset.
      durableReplace(filename,JSON.stringify(record));
      durableReplace(fence,JSON.stringify(anchor));
      if(process.platform!=='win32'){
        const fd=fs.openSync(directory,'r');
        try{fs.fsyncSync(fd);}finally{fs.closeSync(fd);}
      }
      return true;
    }finally{
      fs.closeSync(lockFd);
      fs.unlinkSync(lock);
    }
  }
  return Object.freeze({read:()=>readPair(false),commit});
}
function bindDurableReceiver({store,receiver}={}){
  if(!store||typeof store.read!=='function'||typeof store.commit!=='function'||
    !receiver||!['receive','rotateEpoch','exportCheckpoint','status'].every(
      key=>typeof receiver[key]==='function'))
    throw Error('Explicit transactional cursor store and receiver required.');
  const prior=store.read();
  let revision=prior?.revision||0,poisoned=false;
  const current=receiver.exportCheckpoint();
  const state=Cursor.parseReconnectCheckpoint(current);
  if(prior){
    let expected=Cursor.parseReconnectCheckpoint(prior.checkpoint);
    if(expected.epoch!==state.epoch||
      JSON.stringify({...expected,mustRotate:true})!==current)
      if(prior.checkpoint!==current)
        throw Error('Receiver and durable cursor checkpoint disagree.');
    if(prior.checkpoint!==current){
      // RestoreCheckpoint deliberately forces mustRotate: true. Persist that
      // fail-closed state before exposing rotateEpoch on the new process.
      if(store.commit(revision,current)!==true)
        throw Error('Restore fence conflict; refusing receiver activation.');
      revision++;
    }
  }else if(state.totalAcceptedLifetime!==0||state.latestAcceptedEvent!==null)
    throw Error('Existing receiver history cannot initialize an empty store.');
  function transaction(name,args){
    if(poisoned)throw Error('Durable receiver sealed after prior failure.');
    try{
      const result=receiver[name](...args);
      const after=receiver.exportCheckpoint();
      if(store.commit(revision,after)!==true)
        throw Error('Durable cursor CAS conflict.');
      revision++;
      return result;
    }catch(e){
      // Receive/rotate can mutate in-memory state BEFORE disk commit.
      // Never reuse this instance following ANY exception.
      poisoned=true;
      throw e;
    }
  }
  return Object.freeze({
    receive:envelope=>transaction('receive',[envelope]),
    rotateEpoch:(epoch,ownerContext)=>transaction('rotateEpoch',[epoch,ownerContext]),
    status:()=>{if(poisoned)throw Error('Durable receiver sealed.');return receiver.status();},
    getLatest:()=>{if(poisoned)throw Error('Durable receiver sealed.');return receiver.getLatest();},
    revision:()=>revision
  });
}
module.exports=Object.freeze({SCHEMA,createCursorFileStore,bindDurableReceiver});
