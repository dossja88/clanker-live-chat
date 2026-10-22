#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict');
const cp = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const guard = path.resolve(__dirname, '..', 'scripts', 'check-agent-scope.cjs');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'clanker-agent-scope-'));
let cases = 0;
function git(args) { return cp.execFileSync('git', args, { cwd: temp, encoding: 'utf8' }).trim(); }
function put(name, text) {
  const dest = path.join(temp, name);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, text, 'utf8');
}
function commit(message) {
  git(['add', '-A']);
  git(['commit', '-qm', message]);
}
function audit(role) {
  return cp.spawnSync(process.execPath, [guard, '--base', 'baseline', '--role', role], { cwd: temp, encoding: 'utf8' });
}
function test(name, expectedCode, expectedPath) {
  const result = audit(name);
  assert.equal(result.status, expectedCode, result.stderr + result.stdout);
  if (expectedPath) assert.ok(JSON.parse(result.stdout).protectedChanges.includes(expectedPath));
  cases++;
}
try {
  git(['init', '-q', '-b', 'main']);
  git(['config', 'user.name', 'Test']);
  git(['config', 'user.email', 'test@invalid.example']);
  put('AGENTS.md', 'rules v1\n');
  put('README.md', 'readme v1\n');
  put('docs/PROJECT_HANDOFF.md', 'handoff v1\n');
  put('docs/JULES_COLLABORATION.md', 'collab v1\n');
  put('src/core.cjs', 'module.exports = 1;\n');
  commit('baseline');
  git(['tag', 'baseline']);
  git(['checkout', '-qb', 'agent/sample']);
  put('src/core.cjs', 'module.exports = 2;\n');
  commit('coding change');
  test('executor', 0);
  put('AGENTS.md', 'rules rewritten\n');
  commit('attempt policy change');
  test('executor', 2, 'AGENTS.md');
  test('steward', 0, 'AGENTS.md');
  put('docs/PROJECT_HANDOFF.md', 'handoff overwritten\n');
  commit('attempt status change');
  test('executor', 2, 'docs/PROJECT_HANDOFF.md');
  git(['mv', 'docs/JULES_COLLABORATION.md', 'docs/agent-manual.md']);
  commit('rename protected policy');
  test('executor', 2, 'docs/JULES_COLLABORATION.md');
  put('src/untracked.cjs', 'not committed\n');
  const dirty = audit('steward');
  assert.equal(dirty.status, 1);
  assert.match(dirty.stderr, /Uncommitted files detected/);
  cases++;
  console.log('PASS ' + cases + '/' + cases + ' agent-scope offline guard scenarios (real Node + Git)');
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
