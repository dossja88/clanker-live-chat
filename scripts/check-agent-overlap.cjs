#!/usr/bin/env node
'use strict';
// Read-only, provider-neutral advisory gate for comparing two coding branches.
// Never merges refs or changes a working tree; exit 2 requires human/steward review.
const cp = require('node:child_process');
const PROTECTED = new Set(['AGENTS.md', 'README.md', 'docs/PROJECT_HANDOFF.md', 'docs/JULES_COLLABORATION.md']);
function git(args) {
  return cp.execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}
function parseArgs(argv) {
  if (argv.length !== 6 || argv[0] !== '--base' || argv[2] !== '--left' || argv[4] !== '--right') {
    throw Error('Usage: node scripts/check-agent-overlap.cjs --base <ref> --left <ref> --right <ref>');
  }
  const values = [argv[1], argv[3], argv[5]];
  if (values.some(v => !/^[A-Za-z0-9_.\/-]{1,128}$/.test(v) || v.startsWith('-') || v.includes('..'))) {
    throw Error('Invalid Git reference');
  }
  return values;
}
function resolveRef(ref) {
  return git(['rev-parse', '--verify', ref + '^{commit}']).trim();
}
function pathsChanged(base, head) {
  const tokens = git(['diff', '--name-status', '-z', '--find-renames', base + '..' + head]).split('\0');
  const files = new Set();
  for (let i = 0; i < tokens.length - 1;) {
    const status = tokens[i++];
    if (!/^[ACDMRTUXB][0-9]*$/.test(status)) throw Error('Unsupported Git diff status: ' + status);
    const count = /^[RC]/.test(status) ? 2 : 1;
    for (let n = 0; n < count; n++) {
      if (i >= tokens.length - 1 || !tokens[i]) throw Error('Malformed Git name-status output');
      files.add(tokens[i++]);
    }
  }
  return [...files].sort();
}
function main(argv) {
  const [base, left, right] = parseArgs(argv);
  const [b, l, r] = [base, left, right].map(resolveRef);
  for (const h of [l, r]) {
    try { git(['merge-base', '--is-ancestor', b, h]); }
    catch { throw Error('Base is not an ancestor of both branches; refresh/reconcile'); }
  }
  const leftPaths = pathsChanged(b, l), rightPaths = pathsChanged(b, r);
  const shared = new Set(rightPaths);
  const overlap = leftPaths.filter(p => shared.has(p));
  const protectedEdits = [...new Set([...leftPaths, ...rightPaths])].filter(p => PROTECTED.has(p)).sort();
  const result = {
    schema: 'clanker.agent-branch-overlap.v1',
    base: b, left: l, right: r, leftPaths, rightPaths,
    overlap, protectedEdits,
    advisoryOnly: true,
    status: overlap.length || protectedEdits.length ? 'NEEDS_REVIEW' : 'CLEAR'
  };
  console.log(JSON.stringify(result, null, 2));
  if (result.status !== 'CLEAR') process.exitCode = 2;
}
try { main(process.argv.slice(2)); }
catch (err) { console.error('OVERLAP_CHECK_FAILED: ' + err.message); process.exitCode = 1; }
