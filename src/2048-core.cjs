'use strict';
// Canonical headless 2048 rules, solver and deterministic checkpoint helpers.
// This exact marked core block is embedded in index.html for single-file offline use.
// Tests fail if the two copies drift. No browser, network or game-host dependencies.
  /* CLANKER2048_HEADLESS_CORE_BEGIN */
  const Clanker2048Core=(()=>{
  const PUZZLE_DIRECTIONS=['left','down','up','right'];
  function slide2048(board,dir){
    if(!PUZZLE_DIRECTIONS.includes(dir))throw Error('Unknown direction.');
    const after=board.map(r=>r.slice());let mergePoints=0;
    for(let k=0;k<4;k++){
      const spots=[];
      for(let n=0;n<4;n++)spots.push(dir==='left'?[k,n]:
        dir==='right'?[k,3-n]:dir==='up'?[n,k]:[3-n,k]);
      const nonempty=spots.map(([r,c])=>board[r][c]).filter(Boolean),joined=[];
      for(let n=0;n<nonempty.length;n++){
        if(n+1<nonempty.length&&nonempty[n]===nonempty[n+1]){
          joined.push(nonempty[n]*2);mergePoints+=nonempty[n]*2;n++;
        }else joined.push(nonempty[n]);
      }
      spots.forEach(([r,c],n)=>{after[r][c]=joined[n]||0;});
    }
    return {direction:dir,legal:after.some((r,i)=>r.some((v,j)=>v!==board[i][j])),
      board:after,merge_points:mergePoints};
  }

  function empty2048Spaces(board){
    const spaces=[];for(let r=0;r<4;r++)for(let c=0;c<4;c++)if(board[r][c]===0)spaces.push([r,c]);
    return spaces;
  }

  function spawnLocal2048Tile(board,random=Math.random){
    const empty=empty2048Spaces(board);if(!empty.length)return false;
    const n=empty[Math.floor(random()*empty.length)];
    const tile=random()<.9?2:4;board[n[0]][n[1]]=tile;
    return {row:n[0],column:n[1],value:tile};
  }

  function hasLocal2048Move(board){
    return PUZZLE_DIRECTIONS.some(direction=>slide2048(board,direction).legal);
  }

  const LOCAL2048_SNAKE_WEIGHTS=Array.from({length:16},(_,i)=>Math.pow(.8,i));
  const LOCAL2048_SNAKES=(()=>{
    const paths=[];
    for(let orientation=0;orientation<2;orientation++)
      for(let flipRow=0;flipRow<2;flipRow++)
        for(let flipCol=0;flipCol<2;flipCol++){
          const path=[];
          for(let i=0;i<4;i++)for(let j=0;j<4;j++){
            const row=flipRow?3-i:i;
            const col=flipCol?(i%2?j:3-j):(i%2?3-j:j);
            path.push(orientation?[col,row]:[row,col]);
          }
          paths.push(path);
        }
    return paths;
  })();
  function rateLocal2048(board){
    const values=board.flat(),empty=values.filter(v=>v===0).length;
    const max=Math.max(...values),corners=[board[0][0],board[0][3],board[3][0],board[3][3]];
    let smoothness=0;
    for(let r=0;r<4;r++)for(let c=0;c<4;c++){
      if(c<3&&board[r][c]&&board[r][c+1])
        smoothness-=Math.abs(Math.log2(board[r][c])-Math.log2(board[r][c+1]))*2;
      if(r<3&&board[r][c]&&board[r+1][c])
        smoothness-=Math.abs(Math.log2(board[r][c])-Math.log2(board[r+1][c]))*2;
    }
    let snakeBest=-Infinity;
    for(const path of LOCAL2048_SNAKES){
      let position=0;
      for(let i=0;i<16;i++){
        const [r,c]=path[i];
        position+=board[r][c]*LOCAL2048_SNAKE_WEIGHTS[i];
      }
      snakeBest=Math.max(snakeBest,position);
    }
    return 110*empty+(corners.includes(max)?120:0)+smoothness+4*snakeBest;
  }

  function scoreAfterChance2048(board){
    const spaces=empty2048Spaces(board);
    if(!spaces.length)return hasLocal2048Move(board)?rateLocal2048(board):-100000;
    let weighted=0;
    for(const [r,c] of spaces){
      for(const tile of [2,4]){
        const spawn=board.map(row=>row.slice());spawn[r][c]=tile;
        let best=-100000;
        for(const dir of PUZZLE_DIRECTIONS){
          const move=slide2048(spawn,dir);
          if(move.legal)best=Math.max(best,rateLocal2048(move.board)+move.merge_points*.5);
        }
        weighted+=(tile===2?.9:.1)*best/spaces.length;
      }
    }
    return weighted;
  }

  function chooseLocal2048Action(board,advice='none'){
    const options=PUZZLE_DIRECTIONS.map(direction=>slide2048(board,direction))
      .filter(m=>m.legal)
      .map(m=>({direction:m.direction,quality:rateLocal2048(m.board)+m.merge_points*.7+
        scoreAfterChance2048(m.board)*.45}));
    options.sort((a,b)=>b.quality-a.quality||
      PUZZLE_DIRECTIONS.indexOf(a.direction)-PUZZLE_DIRECTIONS.indexOf(b.direction));
    const lead=options[0]||null,suggestion=options.find(o=>o.direction===advice);
    return suggestion&&lead&&suggestion.quality>=lead.quality-15?suggestion:lead;
  }

  function createGame(random=Math.random){
    const board=Array.from({length:4},()=>[0,0,0,0]);
    const first=spawnLocal2048Tile(board,random),second=spawnLocal2048Tile(board,random);
    return {game:{board,score:0,turns:0,status:'playing'},spawns:[first,second]};
  }
  function assertGame(game){
    if(!game||typeof game!=='object'||Array.isArray(game)||
      Object.keys(game).sort().join(',')!=='board,score,status,turns'||
      !Number.isSafeInteger(game.score)||game.score<0||game.score>1000000000||
      !Number.isSafeInteger(game.turns)||game.turns<0||game.turns>100000||
      !['playing','won','lost'].includes(game.status))throw Error('Invalid game checkpoint.');
    if(!Array.isArray(game.board)||game.board.length!==4||
      game.board.some(row=>!Array.isArray(row)||row.length!==4||
        row.some(tile=>!Number.isSafeInteger(tile)||tile<0||tile>131072||
          tile!==0&&(tile&(tile-1))!==0)))throw Error('Invalid 2048 checkpoint board.');
    const highest=Math.max(...game.board.flat()),hasMoves=hasLocal2048Move(game.board);
    if(game.status==='won'&&highest<2048||
       game.status==='lost'&&hasMoves||
       game.status==='playing'&&(highest>=2048||!hasMoves))
      throw Error('Contradictory 2048 checkpoint status.');
    return {board:game.board.map(row=>row.slice()),score:game.score,turns:game.turns,status:game.status};
  }
  function advanceGame(checkpoint,direction,random=Math.random){
    const game=assertGame(checkpoint);
    if(game.status!=='playing')return {changed:false,game};
    const move=slide2048(game.board,direction);
    if(!move.legal)return {changed:false,game};
    const previousHigh=Math.max(...game.board.flat());
    game.board=move.board;game.score+=move.merge_points;game.turns++;
    const spawn=spawnLocal2048Tile(game.board,random);
    const highest_tile=Math.max(...game.board.flat());
    game.status=highest_tile>=2048?'won':!hasLocal2048Move(game.board)?'lost':'playing';
    return {changed:true,game,direction,merge_points:move.merge_points,
      spawn,previousHigh,highest_tile,open_spaces:empty2048Spaces(game.board).length};
  }
  function seededRng(seed){
    if(!Number.isSafeInteger(seed)||seed<0||seed>4294967295)throw Error('Invalid seed.');
    let state=seed>>>0;
    const next=()=>((state=(Math.imul(state,1664525)+1013904223)>>>0)/4294967296);
    next.checkpoint=()=>state;
    return next;
  }
  return Object.freeze({PUZZLE_DIRECTIONS,slide2048,empty2048Spaces,spawnLocal2048Tile,
    hasLocal2048Move,rateLocal2048,scoreAfterChance2048,chooseLocal2048Action,
    createGame,assertGame,advanceGame,seededRng});
  })();
  /* CLANKER2048_HEADLESS_CORE_END */
module.exports=Clanker2048Core;
