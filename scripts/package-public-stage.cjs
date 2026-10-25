'use strict';

// Creates a LOCAL review candidate from the currently public read-only stage.
// It does not publish, share, deploy, grant access or package the Brain Lab.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const {createHash} = require('node:crypto');

const checks = [
  ['network access', /\b(?:fetch|WebSocket|EventSource|XMLHttpRequest)\s*\(/],
  ['credential or persistent storage access', /\b(?:localStorage|sessionStorage|indexedDB|document\.cookie)\b/],
  ['password input', /<input\b[^>]*\btype\s*=\s*['"]?password\b/i],
  ['external resource', /<(?:script|link|img|iframe)\b[^>]*\b(?:src|href)\s*=\s*['"]https?:/i],
  ['service worker', /\bnavigator\.serviceWorker\b/],
  ['dynamic code execution', /\b(?:eval|Function)\s*\(/],
];

function assertPublicStage(html) {
  if (typeof html !== 'string' || html.length < 1000 || html.length > 512 * 1024) {
    throw new Error('Missing or unreasonably sized stage source');
  }
  if (!html.includes('<title>Clanker // Read-only local gameplay stage</title>')) {
    throw new Error('Expected read-only stage identity is absent');
  }
  if (!html.includes("new BroadcastChannel('clanker.stage.v1')") ||
      !html.includes('channel.onmessage') ||
      !html.includes("channel.postMessage({type:'clanker.stage.request.v1'")) {
    throw new Error('Expected same-origin read-only channel contract is absent');
  }
  if ((html.match(/channel\.postMessage\s*\(/g) || []).length !== 1) {
    throw new Error('Stage must send only the existing snapshot request');
  }
  if ((html.match(/<script\b/gi) || []).length !== 1 ||
      (html.match(/<\/script>/gi) || []).length !== 1) {
    throw new Error('Expected one inline stage script with no dependencies');
  }
  for (const [label, pattern] of checks) {
    if (pattern.test(html)) throw new Error('Reject public stage: ' + label);
  }
  return {sha256:createHash('sha256').update(html).digest('hex'),bytes:Buffer.byteLength(html)};
}

function packageStage(sourcePath, tempParent = os.tmpdir()) {
  const html = fs.readFileSync(sourcePath, 'utf8');
  const checked = assertPublicStage(html);
  const directory = fs.mkdtempSync(path.join(tempParent, 'clanker-public-stage-CANDIDATE-'));
  const manifest = {
    status:'LOCAL_CANDIDATE_NOT_PUBLISHED',
    source:'clanker-live-chat/stage.html',
    file:'index.html',
    ...checked,
    exposesSourceJavaScript:true,
    readsLocalSameOriginBroadcastChannelOnly:true,
    requiresActiveSameOriginBrainLab:true,
    retainsFullBrainLabFunctionality:false,
    networkBackend:false,
    ownerPublicReleaseApproved:false
  };
  fs.writeFileSync(path.join(directory,'index.html'),html,{encoding:'utf8',mode:0o600,flag:'wx'});
  fs.writeFileSync(path.join(directory,'manifest.json'),JSON.stringify(manifest,null,2)+'\n',
    {encoding:'utf8',mode:0o600,flag:'wx'});
  return {directory,manifest};
}

if (require.main === module) {
  if (process.argv.length !== 2) throw new Error('No deployment or output path accepted');
  const built=packageStage(path.resolve(__dirname,'../stage.html'));
  process.stdout.write(JSON.stringify(built,null,2)+'\n');
}

module.exports={assertPublicStage,packageStage};
