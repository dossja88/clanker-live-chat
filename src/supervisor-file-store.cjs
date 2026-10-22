'use strict';
// Optional local filesystem adapter, only after host explicitly chooses an ABSOLUTE path.
// It stores game/PRNG metadata, never accounts/chat/secrets. No background worker.
// Fail closed if an exclusive lock is already held (or left by a crash). Do not
// automatically delete a stale lock: a real writer could still be running.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {validate}=require('./session-supervisor.cjs');
function createFileStore(filename){
  if(typeof filename!=='string'||!path.isAbsolute(filename)||filename.length>4096)
    throw Error('Explicit absolute checkpoint filename required');
  const dir=path.dirname(filename),lock=filename+'.lock';
  if(!fs.existsSync(dir)||!fs.statSync(dir).isDirectory())
    throw Error('Checkpoint directory must already exist and be owner-controlled');
  const directory=fs.statSync(dir);
  if(process.platform!=='win32'&&((directory.mode&0o022)!==0||
    typeof process.getuid==='function'&&directory.uid!==process.getuid()))
    throw Error('Checkpoint directory is not privately controlled by this process');
  if(fs.lstatSync(dir).isSymbolicLink())throw Error('Symlinked checkpoint directory refused');
  function read(){
    if(!fs.existsSync(filename))return null;
    const info=fs.lstatSync(filename);
    if(!info.isFile()||info.isSymbolicLink()||info.size>8192||
      process.platform!=='win32'&&(info.mode&0o077)!==0)
      throw Error('Unsafe or oversized checkpoint file');
    const bytes=fs.readFileSync(filename,'utf8');
    if(bytes.length>8192)throw Error('Checkpoint too large');
    return validate(JSON.parse(bytes));
  }
  function commit(expectedRevision,next){
    if(!Number.isSafeInteger(expectedRevision)||expectedRevision<0)
      throw Error('Invalid expected revision');
    const candidate=validate(next);
    if(candidate.revision!==expectedRevision+1)throw Error('Revision mismatch');
    // Exclusive same-directory lock serializes revisions across local processes.
    const lockFd=fs.openSync(lock,'wx',0o600);
    let tmp=null;
    try{
      const current=read(),actual=current?.revision||0;
      if(actual!==expectedRevision)return false;
      tmp=filename+'.tmp-'+process.pid+'-'+crypto.randomBytes(8).toString('hex');
      const data=JSON.stringify(candidate);
      fs.writeFileSync(tmp,data,{flag:'wx',mode:0o600});
      const fileFd=fs.openSync(tmp,'r');
      try{fs.fsyncSync(fileFd);}finally{fs.closeSync(fileFd);}
      fs.renameSync(tmp,filename);tmp=null;
      // fsync of a directory is platform-specific; file content was flushed.
      return true;
    }finally{
      if(tmp){try{fs.unlinkSync(tmp);}catch(e){}}
      fs.closeSync(lockFd);
      fs.unlinkSync(lock);
    }
  }
  return Object.freeze({read,commit});
}
module.exports=Object.freeze({createFileStore});
