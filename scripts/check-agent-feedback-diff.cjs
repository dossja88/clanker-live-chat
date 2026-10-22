#!/usr/bin/env node
'use strict';
// Advisory read-only check: a new Git commit SHA is not proof that a coding agent fixed anything.
// Usage: node scripts/check-agent-feedback-diff.cjs --before <reviewed-sha> --after <current-sha>
// 0=at least one changed path; 2=no changed paths; 1=bad refs/ancestry/git error.
const cp = require('node:child_process');
function git(args) {
  return cp.execFileSync('git', args, {encoding:'utf8', stdio:['ignore','pipe','pipe']}).trim();
}
function parse(argv) {
  if(argv.length!==4 || argv[0]!=='--before' || argv[2]!=='--after')
    throw Error('Usage: node scripts/check-agent-feedback-diff.cjs --before <ref> --after <ref>');
  const args=[argv[1],argv[3]];
  if(args.some(s=>typeof s!=='string'||s.length<1||s.length>128||s.startsWith('-')||s.includes('..')||!/^[a-zA-Z0-9_./-]+$/.test(s)))
    throw Error('Invalid Git reference');
  return args;
}
function main(argv) {
  const [beforeRef,afterRef]=parse(argv);
  const [before,after]=[beforeRef,afterRef].map(ref=>git(['rev-parse','--verify',ref+'^{commit}']));
  try { git(['merge-base','--is-ancestor',before,after]); }
  catch { throw Error('Reviewed before commit is not an ancestor of current after commit'); }
  const [oldTree,newTree]=[before,after].map(sha=>git(['rev-parse',sha+'^{tree}']));
  const changed = git(['diff','--name-only','-z',before+'..'+after]).split('\0').filter(Boolean).sort();
  const status = changed.length ? 'CHANGED' : 'NO_CHANGE';
  if((oldTree===newTree)!==(changed.length===0))throw Error('Inconsistent Git tree / diff state');
  console.log(JSON.stringify({schema:'clanker.agent-feedback-diff.v1',before,after,oldTree,newTree,status,changedPaths:changed,advisoryOnly:true},null,2));
  if(status==='NO_CHANGE')process.exitCode=2;
}
try{main(process.argv.slice(2));}
catch(err){console.error('AGENT_FEEDBACK_DIFF_FAILED: '+err.message);process.exitCode=1;}
