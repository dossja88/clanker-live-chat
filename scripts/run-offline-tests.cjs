'use strict';
// Manual local orchestration only: no install, scheduler, CI, or agent dispatch.
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

if (process.argv.length !== 2) {
  console.error('Usage: node scripts/run-offline-tests.cjs');
  process.exit(2);
}
const root = path.resolve(__dirname, '..');
const suites = fs.readdirSync(path.join(root, 'tests'), { withFileTypes: true })
  .filter(entry => entry.isFile() && entry.name.endsWith('.cjs'))
  .map(entry => entry.name).sort();
if (suites.length === 0) {
  console.error('No offline test suites found; refusing an empty success.');
  process.exit(1);
}
console.log(`Runtime ${process.version}; ${suites.length} offline suites`);
for (let index = 0; index < suites.length; index++) {
  const relative = `tests/${suites[index]}`;
  console.log(`RUN ${index + 1}/${suites.length}: node ${relative}`);
  const result = spawnSync(process.execPath, [path.join(root, relative)], {
    cwd: root,
    encoding: 'utf8',
    timeout: 300000,
    maxBuffer: 16 * 1024 * 1024
  });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.error || result.signal || result.status !== 0) {
    console.error(`FAIL ${relative}: ${result.error?.message || result.signal || `exit ${result.status}`}`);
    process.exit(1);
  }
}
console.log(`PASS ${suites.length}/${suites.length} offline suites on ${process.version}`);
