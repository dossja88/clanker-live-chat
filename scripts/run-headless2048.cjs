'use strict';
// Bounded, manual, browser-independent proof of Clanker's *local* 2048 gameplay.
// No Twitch, game host, cloud, persistence, secrets, jobs or network.
const C=require('../src/2048-core.cjs');
const args=process.argv.slice(2);
let seed=1,moves=128,json=false;
for(const token of args){
  if(token==='--json'){json=true;continue;}
  const part=token.match(/^--(seed|moves)=(\d+)$/);
  if(!part)throw Error('Only --seed=0..4294967295, --moves=1..1024, --json allowed');
  const number=Number(part[2]);
  if(!Number.isSafeInteger(number))throw Error('Invalid number');
  if(part[1]==='seed')seed=number;else moves=number;
}
if(seed>4294967295||moves<1||moves>1024)throw Error('Out-of-bounds session; no gameplay started');
const random=C.seededRng(seed),started=C.createGame(random);
let game=started.game,reason='bounded_limit';
while(game.status==='playing'&&game.turns<moves){
  const choice=C.chooseLocal2048Action(game.board,'none');
  if(!choice){reason='blocked';break;}
  const step=C.advanceGame(game,choice.direction,random);
  if(!step.changed)throw Error('Planner unexpectedly proposed an illegal local move');
  game=step.game;
}
if(game.status!=='playing')reason=game.status;
const result={schema:'clanker.local2048.headless-run.v1',origin:'offline_local_game',
  seed,maxMoves:moves,turns:game.turns,score:game.score,
  highestTile:Math.max(...game.board.flat()),status:game.status,
  stopReason:reason,board:game.board,
  // Checkpoint data is deterministic game/PRNG state only, never a Twitch or owner token.
  checkpoint:{game:C.assertGame(game),rngState:random.checkpoint()}};
if(json)console.log(JSON.stringify(result,null,2));
else console.log('Clanker headless local 2048: seed '+seed+', '+game.turns+
  '/'+moves+' moves, score '+game.score+', highest tile '+result.highestTile+
  ', '+reason+'. No browser, network, stream or external game inputs.');
