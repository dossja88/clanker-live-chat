#!/usr/bin/env node
'use strict';
// Advisory, offline scope guard. Not GitHub permissions or a semantic merge checker.
const cp = require('node:child_process');

const PROTECTED = new Set([
  'AGENTS.md',
  'README.md',
  'docs/PROJECT_HANDOFF.md',
  'docs/JULES_COLLABORATION.md'
]);

function git(args) {
  return cp.execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}
function main(argv) {
  if (argv.length !== 4 || argv[0] !== '--base' || argv[2] !== '--role' || !['executor', 'steward'].includes(argv[3])) {
    throw new Error('Usage: node scripts/check-agent-scope.cjs --base <commit-or-ref> --role executor|steward');
  }
  const base = argv[1];
  if (!/^[A-Za-z0-9._/-]+$/.test(base) || base.startsWith('-')) {
    throw new Error('Invalid base ref');
  }
  const role = argv[3];
  const dirty = git(['status', '--porcelain', '--untracked-files=normal']);
  if (dirty) throw new Error('Uncommitted files detected; commit or clean your worktree before audit');
  const current = git(['rev-parse', '--verify', 'HEAD^{commit}']);
  git(['rev-parse', '--verify', base + '^{commit}']);
  const branch = git(['symbolic-ref', '--short', 'HEAD']);
  if (branch === 'main' || branch === 'master') throw new Error('Audit development branches, not the production branch');
  const changed = git(['diff', '--name-status', '--find-renames', base + '...HEAD']);
  const files = new Set();
  for (const line of changed.split('\n').filter(Boolean)) {
    const cols = line.split('\t');
    if (!/^[ACDMRTUXB][0-9]*$/.test(cols[0]) || cols.length < 2) {
      throw new Error('Unrecognized git diff status: ' + cols[0]);
    }
    // Renames/copies have two paths: source and destination must both be audited.
    for (const path of cols.slice(1)) files.add(path);
  }
  const protectedChanges = [...files].filter(path => PROTECTED.has(path)).sort();
  const outcome = {
    checkedHead: current,
    branch,
    base,
    role,
    changedPaths: [...files].sort(),
    protectedChanges,
    advisoryOnly: true,
    status: role === 'executor' && protectedChanges.length ? 'BLOCKED' : 'PASS'
  };
  console.log(JSON.stringify(outcome, null, 2));
  if (outcome.status === 'BLOCKED') process.exitCode = 2;
  return outcome;
}
try {
  main(process.argv.slice(2));
} catch (err) {
  console.error('AGENT_SCOPE_CHECK_FAILED: ' + err.message);
  process.exitCode = 1;
}
