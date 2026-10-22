#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict');
const cp = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const script = path.resolve(__dirname, '../scripts/check-agent-overlap.cjs');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'clanker-overlap-'));
let count = 0;
function git(...a) { return cp.execFileSync('git', a, {cwd: dir, encoding: 'utf8', stdio: 'pipe'}).trim(); }
function put(name, content) { const p = path.join(dir, name); fs.mkdirSync(path.dirname(p), {recursive:true}); fs.writeFileSync(p, content); }
function commit(label) { git('add','-A'); git('commit','-qm',label); }
function branch(name, fn) { git('checkout','-qb',name,'baseline'); fn(); commit(name); }
function run(left, right, base='baseline') {
  return cp.spawnSync(process.execPath, [script,'--base',base,'--left',left,'--right',right], {cwd:dir,encoding:'utf8'});
}
function expect(left,right,status,contains,base='baseline') {
  const r=run(left,right,base);assert.equal(r.status,status,r.stderr+'\n'+r.stdout);
  if (status!==1) {
    const d=JSON.parse(r.stdout);if(contains)assert.ok(d.overlap.includes(contains)||d.protectedEdits.includes(contains));
    if(status===0)assert.equal(d.status,'CLEAR');
    if(status===2)assert.equal(d.status,'NEEDS_REVIEW');
    assert.equal(d.advisoryOnly,true);
  }
  count++;
}
try {
  git('init','-qb','main');git('config','user.name','Tester');git('config','user.email','tester@invalid.example');
  put('src/a.cjs','a0\n');put('src/b.cjs','b0\n');put('AGENTS.md','rules\n');put('README.md','docs\n');
  put('docs/PROJECT_HANDOFF.md','handoff\n');put('docs/JULES_COLLABORATION.md','process\n');
  commit('baseline');git('tag','baseline');
  branch('agent/a',()=>put('src/a.cjs','a1\n'));
  branch('agent/b',()=>put('src/b.cjs','b1\n'));
  branch('agent/a2',()=>put('src/a.cjs','a2\n'));
  branch('agent/policy',()=>put('AGENTS.md','new policy\n'));
  branch('agent/rename',()=>git('mv','docs/JULES_COLLABORATION.md','docs/removed-policy.md'));
  branch('agent/noop',()=>put('src/other.cjs','new\n'));
  expect('agent/a','agent/b',0);
  expect('agent/a','agent/a2',2,'src/a.cjs');
  expect('agent/b','agent/policy',2,'AGENTS.md');
  expect('agent/a','agent/rename',2,'docs/JULES_COLLABORATION.md');
  expect('agent/noop','agent/b',0);
  expect('agent/a','does-not-exist',1);
  expect('agent/a','agent/b',1,null,'agent/a');
  const malformed=cp.spawnSync(process.execPath,[script,'--base','--left','agent/a','--right','agent/b'],{cwd:dir,encoding:'utf8'});
  assert.equal(malformed.status,1);count++;
  console.log('PASS '+count+'/'+count+' agent-overlap scenarios under Node and Git');
} finally { fs.rmSync(dir,{recursive:true,force:true}); }
