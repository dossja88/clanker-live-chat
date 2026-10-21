'use strict';
// Verify or explicitly sync the single-file offline embedded core with the Node module.
// Default: fail closed if out of sync. Run --write after intentionally editing the core.
const fs=require('node:fs'),path=require('node:path');
const base=path.resolve(__dirname,'..');
const appFile=path.join(base,'index.html'),coreFile=path.join(base,'src','2048-core.cjs');
const moduleSource=fs.readFileSync(coreFile,'utf8');
const appSource=fs.readFileSync(appFile,'utf8');
const start='  /* CLANKER2048_HEADLESS_CORE_BEGIN */';
const end='  /* CLANKER2048_HEADLESS_CORE_END */';
function locate(text,label){
  const a=text.indexOf(start),b=text.indexOf(end,a+start.length);
  if(a<0||b<a||text.indexOf(start,a+1)!==-1||text.indexOf(end,b+1)!==-1)
    throw Error('Core markers missing, reversed or duplicated in '+label);
  return {a,b:b+end.length,text:text.slice(a,b+end.length)};
}
const inModule=locate(moduleSource,coreFile),inApp=locate(appSource,appFile);
if(inModule.text===inApp.text){
  console.log('PASS headless core and offline browser embed are identical');
}else if(process.argv.slice(2).length===1&&process.argv[2]==='--write'){
  fs.writeFileSync(appFile,appSource.slice(0,inApp.a)+inModule.text+appSource.slice(inApp.b));
  console.log('Updated only the marked headless core in index.html; run node tests/regression.cjs');
}else{
  console.error('FAIL headless core drift. Review changes, then run node scripts/sync-2048-core.cjs --write');
  process.exitCode=1;
}
