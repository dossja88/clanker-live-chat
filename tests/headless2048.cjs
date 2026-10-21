'use strict';
// One-command headless Clanker local 2048 test. Offline, no browser, account or host.
// Run: node tests/headless2048.cjs
const assert=require('node:assert/strict');
const C=require('../src/2048-core.cjs');
const directions=['left','down','up','right'];
const seeded=()=>C.seededRng(1);
assert.deepEqual(C.PUZZLE_DIRECTIONS,directions);
const firstSeed=seeded();
const initial=C.createGame(firstSeed),checkpoint=initial.game;
assert.equal(checkpoint.status,'playing');
assert.equal(checkpoint.turns,0);
assert.equal(checkpoint.score,0);
assert.equal(checkpoint.board.flat().filter(n=>n!==0).length,2);
assert.ok(initial.spawns.every(v=>v&&[2,4].includes(v.value)));
const untouched=JSON.stringify(checkpoint);
const invalidDir=()=>C.advanceGame(checkpoint,'HACK',firstSeed);
assert.throws(invalidDir,/Unknown direction/);
assert.equal(JSON.stringify(checkpoint),untouched);
for(const bad of [
  null,{}, {...checkpoint,score:-1},{...checkpoint,turns:'0'},
  {...checkpoint,status:'won'}, {...checkpoint,status:'lost'},
  {...checkpoint,board:[[2,4],[8,16]]},
  {...checkpoint,board:checkpoint.board.map(r=>r.map(n=>n===2?3:n))}
])assert.throws(()=>C.assertGame(bad));
const copy=C.assertGame(checkpoint);copy.board[0][0]=8192;
assert.equal(JSON.stringify(checkpoint),untouched);
console.log('PASS headless core validates checkpoint shape and preserves input');
const starting=checkpoint.board,possible=directions.map(d=>C.slide2048(starting,d));
assert.ok(possible.some(p=>p.legal));
assert.equal(C.chooseLocal2048Action(starting,'NONE')?.direction!==undefined,true);
const illegal=possible.find(p=>!p.legal);
if(illegal){
  const stalled=C.advanceGame(checkpoint,illegal.direction,firstSeed);
  assert.equal(stalled.changed,false);
  assert.equal(JSON.stringify(checkpoint),untouched);
}
console.log('PASS headless core legal/illegal actions are deterministic and immutable');
function runOne(seed,restoreTurn=null){
  let rng=C.seededRng(seed),state=C.createGame(rng).game;
  let last=null, saved=null;
  while(state.status==='playing'&&state.turns<1024){
    const d=C.chooseLocal2048Action(state.board,'none')?.direction;
    assert.ok(directions.includes(d));
    const previous=JSON.stringify(state);
    const result=C.advanceGame(state,d,rng);
    assert.equal(result.changed,true);
    assert.equal(JSON.stringify(state),previous,'Headless step mutated caller board');
    assert.equal(result.game.turns,state.turns+1);
    assert.equal(result.game.score,state.score+result.merge_points);
    assert.ok([2,4].includes(result.spawn.value));
    assert.deepEqual(C.assertGame(result.game),result.game);
    state=result.game;last=result;
    if(restoreTurn!==null&&state.turns===restoreTurn){
      saved={game:JSON.parse(JSON.stringify(state)),prngState:rng.checkpoint()};
      rng=C.seededRng(saved.prngState);
      state=C.assertGame(saved.game);
    }
  }
  return {state,last,saved};
}
const direct=runOne(1),resumed=runOne(1,250),again=runOne(1);
assert.deepEqual(direct.state,again.state);
assert.deepEqual(direct.state,resumed.state);
assert.equal(resumed.saved.game.turns,250);
assert.equal(direct.state.status,'won');
assert.equal(direct.state.turns,1019);
assert.ok(Math.max(...direct.state.board.flat())>=2048);
console.log('PASS seeded independent headless game wins local 2048 on move 1019');
console.log('PASS serialized game + PRNG checkpoint resumes with identical outcome');
console.log('ALL HEADLESS 2048 TESTS PASSED (offline local puzzle; not live Twitch or cloud)');
