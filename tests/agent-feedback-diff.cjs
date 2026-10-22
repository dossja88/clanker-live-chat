#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const cp=require('node:child_process');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const script=path.resolve(__dirname,'../scripts/check-agent-feedback-diff.cjs');
const cwd=fs.mkdtempSync(path.join(os.tmpdir(),'clanker-feedback-check-'));
const git=(...args)=>cp.execFileSync('git',args,{cwd,encoding:'utf8',stdio:'pipe'}).trim();
const put=(name,content)=>{fs.mkdirSync(path.dirname(path.join(cwd,name)),{recursive:true});fs.writeFileSync(path.join(cwd,name),content)};
const run=(before,after)=>cp.spawnSync(process.execPath,[script,'--before',before,'--after',after],{cwd,encoding:'utf8'});
let count=0;
function expect(before,after,status,kind,changedName){const x=run(before,after);assert.equal(x.status,status,x.stderr+'\n'+x.stdout);if(status!==1){const o=JSON.parse(x.stdout);assert.equal(o.status,kind);assert.equal(o.advisoryOnly,true);if(changedName)assert.ok(o.changedPaths.includes(changedName));if(status===2)assert.equal(o.oldTree,o.newTree);}count++}
try{
  git('init','-qb','main');git('config','user.name','Offline Test');git('config','user.email','offline@invalid.example');
  put('src/thing.cjs','old\n');git('add','-A');git('commit','-qm','base');git('tag','base');
  git('commit','--allow-empty','-qm','empty review response');git('tag','empty');
  put('src/thing.cjs','fixed\n');git('add','-A');git('commit','-qm','real source change');git('tag','fixed');
  put('tests/spec.cjs','assert true\n');git('add','-A');git('commit','-qm','real test');git('tag','tested');
  expect('base','empty',2,'NO_CHANGE');
  expect('empty','fixed',0,'CHANGED','src/thing.cjs');
  expect('base','tested',0,'CHANGED','tests/spec.cjs');
  expect('fixed','empty',1);
  expect('not-real','fixed',1);
  const malformed=cp.spawnSync(process.execPath,[script,'--before','-danger','--after','fixed'],{cwd,encoding:'utf8'});
  assert.equal(malformed.status,1);count++;
  const usage=cp.spawnSync(process.execPath,[script,'--after','fixed'],{cwd,encoding:'utf8'});
  assert.equal(usage.status,1);count++;
  console.log('PASS '+count+'/'+count+' feedback diff scenarios (real Node.js and Git)');
}finally{fs.rmSync(cwd,{recursive:true,force:true})}
