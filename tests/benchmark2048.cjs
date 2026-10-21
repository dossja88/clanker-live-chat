'use strict';
// Reproducible, zero-dependency offline 2048 policy comparison.
// Run: node tests/benchmark2048.cjs
// Runs actual pure movement/planning functions extracted from index.html.
// No browser, network, files written, credentials, Twitch, voice or external game.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const html=fs.readFileSync(path.resolve(__dirname,'..','index.html'),'utf8');
const match=html.match(/<script>([\s\S]*?)<\/script>/);
assert.ok(match,'Missing inline game source');
const source=match[1];
const names=['slide2048','empty2048Spaces','hasLocal2048Move',
  'rateLocal2048','scoreAfterChance2048','chooseLocal2048Action'];
function extract(name){
  const start=source.indexOf('  function '+name+'(');
  assert.ok(start>=0,'Game function absent: '+name);
  assert.equal(source.indexOf('  function '+name+'(',start+1),-1,'Duplicate game function '+name);
  const end=source.indexOf('\n  }\n',start);
  assert.ok(end>start,'Cannot extract game function '+name);
  return source.slice(start,end+5);
}
const liveFns=Object.fromEntries(names.map(n=>[n,extract(n)]));
const snakeStart=source.indexOf('  const LOCAL2048_SNAKE_WEIGHTS=');
const snakeEnd=source.indexOf('  function rateLocal2048(',snakeStart);
assert.ok(snakeStart>=0&&snakeEnd>snakeStart,'Missing positional heuristic weights');
const liveSnake=source.slice(snakeStart,snakeEnd);
// Frozen 2026-10-21 baseline: previous in-page heuristic, not a claimed independent algorithm.
const previousRating=`function rateLocal2048(board){
    const values=board.flat(),empty=values.filter(v=>v===0).length;
    const max=Math.max(...values),corners=[board[0][0],board[0][3],board[3][0],board[3][3]];
    let smoothness=0;
    for(let r=0;r<4;r++)for(let c=0;c<4;c++){
      if(c<3&&board[r][c]&&board[r][c+1])
        smoothness-=Math.abs(Math.log2(board[r][c])-Math.log2(board[r][c+1]))*2;
      if(r<3&&board[r][c]&&board[r+1][c])
        smoothness-=Math.abs(Math.log2(board[r][c])-Math.log2(board[r+1][c]))*2;
    }
    return 110*empty+(corners.includes(max)?70:0)+smoothness;
  }`;
function compile(strategy){
  const code=`(()=>{'use strict';
    const PUZZLE_DIRECTIONS=['left','down','up','right'];
    ${strategy==='improved'?liveSnake:''}
    ${names.map(n=>n==='rateLocal2048'&&strategy==='previous'?
      previousRating:liveFns[n]).join('\n')}
    return {slide2048,empty2048Spaces,hasLocal2048Move,chooseLocal2048Action};
  })()`;
  return vm.runInNewContext(code,Object.create(null),{timeout:5000});
}
const engine={random:compile('previous'),previous:compile('previous'),improved:compile('improved')};
function seeded(seed){
  let state=seed>>>0;
  return ()=>((state=(Math.imul(state,1664525)+1013904223)>>>0)/4294967296);
}
const DIRECTIONS=['left','down','up','right'];
function oneGame(policy,seed){
  assert.ok(['random','previous','improved'].includes(policy));
  const f=engine[policy],spawnRng=seeded(seed),choiceRng=seeded(seed^0x9e3779b9);
  const board=Array.from({length:4},()=>[0,0,0,0]);
  function spawn(){
    const spaces=f.empty2048Spaces(board);
    if(!spaces.length)return null;
    const index=Math.floor(spawnRng()*spaces.length),[r,c]=spaces[index];
    board[r][c]=spawnRng()<.9?2:4;
    return [r,c];
  }
  spawn();spawn();
  let score=0,turns=0;
  while(turns<128){
    const legal=DIRECTIONS.filter(direction=>f.slide2048(board,direction).legal);
    if(!legal.length)break;
    const direction=policy==='random'?
      legal[Math.floor(choiceRng()*legal.length)]:
      f.chooseLocal2048Action(board,'none')?.direction;
    assert.ok(legal.includes(direction),'Policy selected illegal move');
    const result=f.slide2048(board,direction);
    assert.ok(result.legal);
    for(let r=0;r<4;r++)board[r]=result.board[r];
    score+=result.merge_points;turns++;
    const highest=Math.max(...board.flat());
    if(highest>=2048)break;
    spawn();
    if(!f.hasLocal2048Move(board))break;
  }
  const highest=Math.max(...board.flat());
  assert.ok(Number.isFinite(score)&&score>=0&&turns<=128&&turns>=0);
  return {seed,score,turns,highest,reached256:highest>=256,reached2048:highest>=2048};
}
function summarize(runs){
  const n=runs.length,sorted=runs.map(r=>r.score).sort((a,b)=>a-b);
  return {games:n,mean_score:Math.round(runs.reduce((s,r)=>s+r.score,0)/n),
    median_score:n%2?sorted[Math.floor(n/2)]:(sorted[n/2-1]+sorted[n/2])/2,mean_turns:Math.round(runs.reduce((s,r)=>s+r.turns,0)/n),
    mean_highest_tile:Math.round(runs.reduce((s,r)=>s+r.highest,0)/n),
    reached_256:runs.filter(r=>r.reached256).length,
    reached_2048:runs.filter(r=>r.reached2048).length};
}
function batch(start,count=24){
  const seeds=Array.from({length:count},(_,i)=>start+i),results={};
  for(const policy of ['random','previous','improved'])
    results[policy]=summarize(seeds.map(seed=>oneGame(policy,seed)));
  return results;
}
assert.deepEqual(oneGame('improved',101),oneGame('improved',101),'Seed replay mismatch');
const report={schema:'clanker.2048.benchmark.v1',
  source:'index.html pure game functions, isolated offline replay',
  max_moves_per_game:128,seed_generator:'LCG 32-bit, per-game independent policy/spawn streams',
  comparison:'random legal / frozen previous heuristic / current page heuristic',
  development:{seeds:'1..24',results:batch(1)},
  holdout:{seeds:'101..124',results:batch(101)}};
assert.ok(report.holdout.results.improved.mean_score>=report.holdout.results.previous.mean_score,
  'Current strategy regressed below frozen previous policy in holdout batch');
assert.ok(report.development.results.improved.mean_score>=report.development.results.random.mean_score,
  'Current strategy below random legal baseline in development');
if(process.argv.includes('--json'))console.log(JSON.stringify(report,null,2));
else {
  console.log('Clanker local 2048: 128 moves/game; 24 development + 24 holdout seeds.');
  for(const [name,group] of [['Development',report.development],['Holdout',report.holdout]]){
    console.log(name+' ('+group.seeds+')');
    for(const [policy,data] of Object.entries(group.results))
      console.log('  '+policy+': mean score '+data.mean_score+
        ', median '+data.median_score+', mean high tile '+data.mean_highest_tile+
        ', reached 256 '+data.reached_256+'/'+data.games);
  }
  console.log('PASS reproducible seeded benchmark (offline source functions only)');
}
