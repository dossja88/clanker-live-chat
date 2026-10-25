'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {assertPublicStage,packageStage}=require('../scripts/package-public-stage.cjs');

const stagePath=path.resolve(__dirname,'../stage.html');
const stage=fs.readFileSync(stagePath,'utf8');
const checked=assertPublicStage(stage);
assert.match(checked.sha256,/^[a-f0-9]{64}$/);
assert.equal(checked.bytes,fs.statSync(stagePath).size);

const rejected=[
  ['network',stage.replace('</script>','fetch("https://example.invalid");</script>')],
  ['password',stage.replace('</body>','<input type="password"></body>')],
  ['local storage',stage.replace('</script>','localStorage.getItem("key");</script>')],
  ['external image',stage.replace('</body>','<img src="https://example.invalid/x.png"></body>')],
  ['extra post',stage.replace('</script>',"channel.postMessage({type:'test'});</script>")],
  ['missing receive',stage.replace('channel.onmessage','channel.noMessage')],
  ['missing channel',stage.replace("new BroadcastChannel('clanker.stage.v1')","new BroadcastChannel('other')")],
  ['extra script',stage.replace('</body>','<script>console.log(1)</script></body>')]
];
for(const [label,html] of rejected){
  assert.throws(()=>assertPublicStage(html),Error,'must reject '+label);
}
const parent=fs.mkdtempSync(path.join(os.tmpdir(),'clanker-test-parent-'));
let created;
try{
  const built=packageStage(stagePath,parent);
  created=built.directory;
  const names=fs.readdirSync(created).sort();
  assert.deepEqual(names,['index.html','manifest.json']);
  const html=fs.readFileSync(path.join(created,'index.html'),'utf8');
  assert.equal(html,stage,'packaged HTML must preserve exact source bytes');
  const manifest=JSON.parse(fs.readFileSync(path.join(created,'manifest.json'),'utf8'));
  assert.equal(manifest.status,'LOCAL_CANDIDATE_NOT_PUBLISHED');
  assert.equal(manifest.sha256,checked.sha256);
  assert.equal(manifest.ownerPublicReleaseApproved,false);
  assert.equal(manifest.requiresActiveSameOriginBrainLab,true);
  assert.equal(manifest.networkBackend,false);
  assert.equal(manifest.retainsFullBrainLabFunctionality,false);
}finally{
  fs.rmSync(parent,{recursive:true,force:true});
}
console.log('PASS Clanker read-only stage packaging: genuine source, 8 hostile changes, local candidate and no live publish');
