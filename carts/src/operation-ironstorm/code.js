// OPERATION IRONSTORM — Jungle Breach
// Original NOVA-16 run-and-gun cartridge. All gameplay and drawing are self-contained.
// Controls: arrows move/aim, X jump, Z fire, S cycle weapon, Enter pause/start.

const C = { black:1, shadow:2, purple:3, brown:4, green:5, red:6, grey:7, blue:8, orange:9, silver:10, lime:11, skin:12, cyan:13, yellow:14, white:15 };
const WORLD_W = 2240, FLOOR = 190, GRAVITY = 0.30;
const JUMP_VELOCITY = -6.1;
const WEAPONS = [
  {name:'RIFLE', rate:9, speed:4.4, damage:1, color:C.yellow, kind:'normal'},
  {name:'SPREAD', rate:18, speed:3.8, damage:1, color:C.orange, kind:'spread'},
  {name:'RAPID', rate:3, speed:5.2, damage:1, color:C.cyan, kind:'rapid'},
  {name:'LASER', rate:12, speed:7.5, damage:2, color:C.white, kind:'laser'},
  {name:'ROCKET', rate:28, speed:3.2, damage:4, color:C.red, kind:'rocket'}
];
const platforms = [
  {x:220,y:151,w:76},{x:360,y:145,w:70},{x:505,y:157,w:95},{x:690,y:148,w:90},
  {x:850,y:155,w:76},{x:1070,y:146,w:100},{x:1240,y:157,w:90},{x:1430,y:144,w:100},
  {x:1590,y:155,w:84},{x:1770,y:145,w:100},
  // Intentional stepping bridges: every major pit has a reachable route across it.
  {x:435,y:158,w:40,bridge:true},{x:775,y:158,w:40,bridge:true},{x:980,y:158,w:40,bridge:true},
  {x:1330,y:158,w:40,bridge:true},{x:1690,y:158,w:40,bridge:true}
];
const pits = [[430,480],[770,820],[970,1025],[1320,1375],[1680,1735]];
const enemySeeds = [
  [280,190,'rifle'],[405,190,'rifle'],[555,190,'heavy'],[645,190,'rifle'],[735,190,'rifle'],
  [895,190,'heavy'],[1110,190,'rifle'],[1190,190,'rifle'],[1285,190,'heavy'],[1480,190,'rifle'],
  [1540,190,'rifle'],[1635,190,'heavy'],[1810,190,'rifle'],[1900,190,'rifle']
];
let state='title', paused=false, frame=0, cam=0, score=0, lives=3, checkpoint=0, boss=null, wasPaused=false;
let p, enemies=[], bullets=[], ebullets=[], pickups=[], particles=[], fireT=0, weapon=0, invuln=0, message='', messageT=0, deathT=0;

function freshPlayer(x=36) { return {x,y:156,vx:0,vy:0,w:12,h:20,health:5,face:1,onGround:false,crouch:false}; }
function startGame(fromCheckpoint=false) {
  if (!fromCheckpoint) { score=0; lives=3; checkpoint=0; weapon=0; }
  p=freshPlayer(fromCheckpoint?checkpoint:36); cam=Math.max(0,p.x-70); bullets=[]; ebullets=[]; particles=[]; fireT=0; invuln=48; wasPaused=false;
  music(0);
  enemies=enemySeeds.filter(e=>e[0]>=p.x+20).map((e,i)=>({x:e[0],y:e[1],type:e[2],health:e[2]==='heavy'?6:3,dir:i%2? -1:1,shot:35+(i*13)%70,alive:true,home:e[0],hit:0}));
  pickups=[{x:330,y:115,weapon:1,taken:false},{x:735,y:118,weapon:2,taken:false},{x:1175,y:117,weapon:3,taken:false},{x:1510,y:112,weapon:4,taken:false}];
  boss=null; state='play'; paused=false; message='JUNGLE BREACH'; messageT=90;
}
function setMessage(s,n=90){message=s;messageT=n;}
function key(b){return btn(b);}
function pressed(b){return btnp(b);}
function hitBox(a,b){return a.x < b.x+b.w && a.x+a.w > b.x && a.y < b.y+b.h && a.y+a.h > b.y;}
function groundedAt(x,y){
  if (y>=FLOOR && !pits.some(q=>x+p.w/2>q[0]&&x+p.w/2<q[1])) return FLOOR;
  for(const q of platforms) if(x+p.w>q.x&&x<q.x+q.w&&y<=q.y&&y+5>=q.y) return q.y;
  return null;
}
function shoot(){
  if(fireT>0)return; const w=WEAPONS[weapon]; fireT=w.rate;
  sfx(weapon===4?6:weapon===3?7:weapon===1?8:weapon===2?9:0);
  const sx=p.x+p.w/2+p.face*8, sy=p.y+9;
  let dx=p.face,dy=0;
  if(key(UP)) {dy=-1; if(key(p.face>0?RIGHT:LEFT)) {dx=p.face;dy=-0.65;} else dx=0;}
  else if(key(DOWN)&&!p.onGround){dy=1; if(key(p.face>0?RIGHT:LEFT)){dx=p.face;dy=0.65;}else dx=0;}
  if(key(DOWN)&&p.onGround){p.crouch=true;}
  const add=(vx,vy)=>bullets.push({x:sx,y:sy,vx,vy,damage:w.damage,color:w.color,kind:w.kind,life:90});
  if(w.kind==='spread'){add(dx*w.speed,dy*w.speed-0.34);add(dx*w.speed,dy*w.speed);add(dx*w.speed,dy*w.speed+0.34);}
  else add(dx*w.speed,dy*w.speed);
  if(weapon===4) particles.push({x:sx,y:sy,life:9,color:C.orange});
}
function hurt(amount=1){if(invuln>0||state!=='play')return;p.health-=amount;invuln=70;sfx(2);for(let i=0;i<9;i++)particles.push({x:p.x+6,y:p.y+10,vx:(Math.random()-.5)*2,vy:(Math.random()-.8)*2,life:22,color:C.red});if(p.health<=0){lives--;state='dying';deathT=55;sfx(5);setMessage('WOUNDED',55);}}
function fallIntoPit(){if(state!=='play')return; lives--;p.health=0;state='dying';deathT=55;invuln=0;sfx(5);spawnExplosion(p.x+6,p.y+12,true);setMessage('LOST IN THE PIT',55);}
function spawnExplosion(x,y,big=false){for(let i=0;i<(big?20:8);i++)particles.push({x,y,vx:(Math.random()-.5)*(big?4:2.5),vy:(Math.random()-.5)*(big?4:2.5),life:big?32:18,color:[C.yellow,C.orange,C.red,C.white][i%4]});}
function update(){frame++;
  if(state==='title'){if(pressed(A)||pressed(B)||pressed(START)||pressed(SELECT))startGame();return;}
  if(state==='victory'||state==='gameover'){if(pressed(A)||pressed(B)||pressed(START)||pressed(SELECT)){state='title';}return;}
  if(state==='dying'){deathT--;updateParticles();if(deathT<=0){if(lives<=0){state='gameover';}else startGame(true);}return;}
  if(pressed(START)){paused=!paused;if(paused){music(-1);wasPaused=true;}else music(0);}
  if(paused){return;}
  if(state!=='play')return;
  if(fireT>0)fireT--; if(invuln>0)invuln--; if(messageT>0)messageT--;
  p.crouch=key(DOWN)&&p.onGround;
  p.vx=0; if(key(LEFT)){p.vx=-1.65;p.face=-1;} if(key(RIGHT)){p.vx=1.65;p.face=1;}
  if(pressed(A)&&p.onGround){p.vy=JUMP_VELOCITY;p.onGround=false;sfx(1);}
  if(pressed(X)||pressed(SELECT)||pressed(Y)){weapon=(weapon+1)%WEAPONS.length;setMessage('WEAPON: '+WEAPONS[weapon].name,45);}
  if(key(B))shoot();
  p.x=Math.max(0,Math.min(WORLD_W-p.w,p.x+p.vx));
  const oldY=p.y; p.vy=Math.min(6.5,p.vy+GRAVITY);p.y+=p.vy;p.onGround=false;
  if(p.vy>=0){let landing=null; if(p.y+p.h>=FLOOR&&!pits.some(q=>p.x+p.w/2>q[0]&&p.x+p.w/2<q[1]))landing=FLOOR;
    for(const q of platforms)if(p.x+p.w>q.x&&p.x<q.x+q.w&&oldY+p.h<=q.y+2&&p.y+p.h>=q.y&&(!landing||q.y<landing))landing=q.y;
    if(landing!==null){p.y=landing-p.h;p.vy=0;p.onGround=true;}
  }
  // Pit falls bypass temporary damage invulnerability: a fall is always fatal.
  if(p.y>FLOOR+24){fallIntoPit();return;}
  p.x=Math.min(WORLD_W-p.w,p.x);cam=Math.max(0,Math.min(WORLD_W-256,p.x-72));
  // Collect weapons and activate checkpoint.
  for(const q of pickups)if(!q.taken&&Math.abs((p.x+6)-q.x)<13&&Math.abs((p.y+10)-q.y)<20){q.taken=true;weapon=q.weapon;setMessage('PICKUP: '+WEAPONS[weapon].name,75);score+=100;}
  if(p.x>=1035&&checkpoint<1035){checkpoint=1035;sfx(4);setMessage('CHECKPOINT ACTIVATED',100);}
  // Enemies patrol locally and fire aimed shots.
  for(const e of enemies){if(!e.alive)continue;e.hit=Math.max(0,e.hit-1);
    // Aggressive: chase when player is close, otherwise patrol
    const dist=Math.abs(e.x-p.x);
    const heavy=e.type==='heavy';
    if(dist<160){
      // chase / face player
      e.dir = p.x < e.x ? -1 : 1;
      e.x += e.dir * (heavy ? 0.55 : 0.85);
      // keep near home a bit so they don't all clump
      if(Math.abs(e.x-e.home)>80) e.x += (e.home-e.x)*0.02;
    } else {
      e.x += e.dir * (heavy ? 0.35 : 0.55);
      if(Math.abs(e.x-e.home)>32) e.dir *= -1;
    }
    // Shoot faster, more accurately, sometimes bursts
    e.shot--;
    if(e.shot<=0 && dist<250){
      let dx=p.x-e.x, dy=(p.y+8)-(e.y-8);
      let d=Math.max(1,Math.hypot(dx,dy));
      // lead the target slightly when player is moving
      dx += p.vx * 8;
      d=Math.max(1,Math.hypot(dx,dy));
      const spd = heavy ? 1.7 : 2.1;
      ebullets.push({x:e.x+(e.dir>0?12:0), y:e.y-10, vx:dx/d*spd, vy:dy/d*spd, life:160});
      // heavy sometimes fires a 3-round burst
      if(heavy && Math.random()<0.45){
        ebullets.push({x:e.x+(e.dir>0?12:0), y:e.y-12, vx:dx/d*spd*0.9, vy:dy/d*spd-0.25, life:140});
        ebullets.push({x:e.x+(e.dir>0?12:0), y:e.y-8,  vx:dx/d*spd*0.9, vy:dy/d*spd+0.25, life:140});
      }
      e.shot = heavy ? (35 + Math.floor(Math.random()*25)) : (48 + Math.floor(Math.random()*35));
    }
    if(hitBox({x:p.x,y:p.y,w:p.w,h:p.h},{x:e.x-5,y:e.y-20,w:18,h:22}))hurt();
  }
  for(const b of bullets){b.x+=b.vx;b.y+=b.vy;b.life--;for(const e of enemies){if(!e.alive)continue;if(b.x>e.x-5&&b.x<e.x+13&&b.y>e.y-20&&b.y<e.y){e.health-=b.damage;e.hit=5;b.life=0;if(e.health<=0){e.alive=false;score+=e.type==='heavy'?250:100;sfx(3);spawnExplosion(e.x+5,e.y-10);}}}
    if(b.kind==='rocket'&&b.life<=0){for(const e of enemies)if(e.alive&&Math.hypot(e.x-b.x,e.y-b.y)<30){e.health-=2;if(e.health<=0){e.alive=false;score+=150;}}spawnExplosion(b.x,b.y);}
    if(b.x<cam-20||b.x>cam+280||b.y<0||b.y>230)b.life=0;
  }
  bullets=bullets.filter(b=>b.life>0);
  for(const b of ebullets){b.x+=b.vx;b.y+=b.vy;b.life--;if(hitBox({x:b.x-2,y:b.y-2,w:4,h:4},p)){b.life=0;hurt();}if(b.x<cam-20||b.x>cam+280)b.life=0;}ebullets=ebullets.filter(b=>b.life>0);
  // The boss enters once the player reaches the fortress.
  if(p.x>1940&&!boss){boss={x:2055,y:133,health:55,max:55,shot:40,phase:0,hit:0};enemies.forEach(e=>e.alive=false);setMessage('FORTRESS COMMANDER',100);}
  if(boss){boss.hit=Math.max(0,boss.hit-1);boss.shot--;boss.phase++;
    // hover + occasional dive
    const dive = (boss.phase % 180) > 140;
    boss.y = dive ? (120 + Math.sin(boss.phase/6)*18) : (128 + Math.sin(boss.phase/20)*8);
    // face / track player a bit
    if(p.x < boss.x - 10) boss.x -= 0.4;
    else if(p.x > boss.x + 10) boss.x += 0.35;
    boss.x = Math.max(1900, Math.min(2100, boss.x));
    if(boss.shot<=0){
      const hpRatio = boss.health / boss.max;
      // spread aimed at player
      let dx=p.x-boss.x, dy=(p.y+6)-boss.y;
      let d=Math.max(1,Math.hypot(dx,dy));
      const baseSpd = 2.0 + (1-hpRatio)*0.8;
      for(let i=-2;i<=2;i++){
        ebullets.push({x:boss.x-8, y:boss.y+12, vx:(dx/d)*baseSpd + i*0.35, vy:(dy/d)*baseSpd + i*0.15, life:200});
      }
      // low health: extra ring + faster fire
      if(hpRatio < 0.45){
        for(let i=0;i<6;i++){
          const a = (boss.phase/10 + i*1.05);
          ebullets.push({x:boss.x, y:boss.y+10, vx:Math.cos(a)*1.8, vy:Math.sin(a)*1.8, life:150});
        }
      }
      boss.shot = hpRatio < 0.3 ? 22 : (hpRatio < 0.6 ? 34 : 48);
    }
    for(const b of bullets)if(b.life>0&&b.x>boss.x-27&&b.x<boss.x+24&&b.y>boss.y-18&&b.y<boss.y+35){boss.health-=b.damage;b.life=0;boss.hit=4;if(b.kind==='rocket')spawnExplosion(b.x,b.y);}
    if(boss.health<=0){spawnExplosion(boss.x,boss.y,true);score+=5000;sfx(10);music(-1);boss=null;state='victory';}
    if(boss&&hitBox(p,{x:boss.x-24,y:boss.y-18,w:48,h:52}))hurt();
  }
  updateParticles();
}
function updateParticles(){for(const a of particles){a.x+=(a.vx||0);a.y+=(a.vy||0);a.vy=(a.vy||0)+.04;a.life--;}particles=particles.filter(a=>a.life>0);}
function draw(){cls();
  if(state==='title'){drawTitle();return;}
  drawWorld();
  if(state==='dying'){if(frame%8<4)txt('DOWN!',103,95,C.white);}
  if(state==='victory'){panel(31,65,194,95);ctxt('MISSION COMPLETE',82,C.yellow);ctxt('JUNGLE BREACH CLEARED',101,C.white);ctxt('SCORE '+score,119,C.cyan);ctxt('PRESS X TO TITLE',141,C.white);}
  if(state==='gameover'){panel(45,72,166,78);ctxt('MISSION FAILED',89,C.red);ctxt('SCORE '+score,109,C.white);ctxt('PRESS X TO TITLE',130,C.white);}
  if(paused){panel(72,77,112,70);ctxt('PAUSED',91,C.yellow);ctxt('ENTER TO RESUME',112,C.white);ctxt('S / X TO CHANGE WEAPON',128,C.grey);}
}
function drawTitle(){
  rectfill(0,0,256,224,C.blue);rectfill(0,30,256,70,C.cyan);circfill(211,42,17,C.yellow);
  for(let i=0;i<7;i++){let x=i*42-12;rectfill(x,87+(i%3)*7,48,88,C.green);rectfill(x+7,75+(i%3)*7,34,28,C.lime);rectfill(x+14,67+(i%3)*7,18,18,C.green);}
  for(let i=0;i<8;i++){let x=i*37-8;rectfill(x,128,3,45,C.brown);rectfill(x-7,130,18,5,C.lime);rectfill(x+2,141,16,4,C.green);}
  rectfill(0,176,256,48,C.brown);for(let x=0;x<256;x+=16){rectfill(x,176,16,4,C.lime);rectfill(x+3,185,7,2,C.orange);}
  panel(16,19,224,123);
  let sh=16+Math.floor(((frame*2)%200)); // shine sweep behind the logo
  rectfill(sh,40,3,30,C.white);
  ctxt('OPERATION',45,C.blue);ctxt('OPERATION',43,C.silver);ctxt('OPERATION',42,C.white); // chrome
  ctxt('IRONSTORM',67,C.red);ctxt('IRONSTORM',65,C.orange);ctxt('IRONSTORM',64,C.yellow); // ember chrome
  rectfill(58,82,140,2,C.red);
  ctxt('JUNGLE BREACH',94,C.lime);
  drawCommando(119,127,1,false);
  ctxt('ARROWS / D-PAD MOVE + AIM',157,C.white);ctxt('A/X JUMP   B/Z FIRE   S WEAPON',173,C.white);
  if(frame%60<42)ctxt('PRESS X OR ENTER',198,C.yellow);
}
// ===== IRONSTORM v2 sprite data (generated) =====
function drawRuns(x,y,runs,face,w){for(let i=0;i<runs.length;i++){const r=runs[i];rectfill(x+(face>0?r[0]:w-r[0]-r[2]),y+r[1],r[2],1,r[3]);}}
function drawRunsC(x,y,runs,face,w,c){for(let i=0;i<runs.length;i++){const r=runs[i];rectfill(x+(face>0?r[0]:w-r[0]-r[2]),y+r[1],r[2],1,c);}}
// ===== IRONSTORM v5.4 sprites =====
const SPR={};
SPR.prun0=[[7,0,8,1],[6,1,9,6],[6,2,11,6],[6,3,6,6],[12,3,1,1],[13,3,4,6],[7,4,8,12],[6,5,10,12],[3,6,13,12],[16,6,8,2],[3,7,10,12],[13,7,4,4],[17,7,7,7],[3,8,10,12],[13,8,4,4],[17,8,7,7],[3,9,10,12],[13,9,4,4],[17,9,7,7],[3,10,10,12],[13,10,4,4],[17,10,7,2],[5,11,12,4],[5,12,12,4],[5,13,12,4],[4,14,5,5],[11,14,5,5],[4,15,5,5],[11,15,5,5],[4,16,5,5],[11,16,5,5],[4,17,5,5],[11,17,5,5],[4,18,5,5],[11,18,5,5],[4,19,5,2],[11,19,5,4],[4,20,5,2],[11,20,5,4],[4,21,5,2],[11,21,5,4]];
SPR.prun1=[[7,0,8,1],[6,1,9,6],[6,2,11,6],[6,3,6,6],[12,3,1,1],[13,3,4,6],[7,4,8,12],[6,5,13,12],[6,6,10,12],[16,6,8,2],[3,7,10,12],[13,7,4,4],[17,7,7,7],[3,8,10,12],[13,8,4,4],[17,8,7,7],[3,9,10,12],[13,9,4,4],[17,9,7,7],[3,10,10,12],[13,10,4,4],[17,10,7,2],[3,11,4,12],[7,11,10,4],[5,12,12,4],[5,13,12,4],[5,14,10,5],[5,15,10,5],[5,16,10,5],[5,17,10,5],[5,18,10,5],[5,19,5,2],[10,19,5,4],[5,20,5,2],[10,20,5,4],[5,21,5,2],[10,21,5,4]];
SPR.prun0m=[[7,0,8,1],[6,1,9,6],[6,2,11,6],[6,3,6,6],[12,3,1,1],[13,3,4,6],[7,4,8,12],[6,5,10,12],[3,6,13,12],[16,6,8,2],[3,7,10,12],[13,7,4,4],[17,7,7,7],[3,8,10,12],[13,8,4,4],[17,8,7,7],[3,9,10,12],[13,9,4,4],[17,9,7,7],[3,10,10,12],[13,10,4,4],[17,10,7,2],[5,11,12,4],[5,12,12,4],[3,13,2,5],[5,13,12,4],[3,14,5,5],[12,14,5,5],[3,15,5,5],[12,15,5,5],[3,16,5,5],[12,16,5,5],[3,17,5,5],[12,17,5,5],[3,18,5,5],[12,18,5,5],[3,19,5,2],[12,19,5,4],[3,20,5,2],[12,20,5,4],[3,21,5,2],[12,21,5,4]];
SPR.pjump=[[7,0,8,1],[6,1,9,6],[6,2,9,6],[6,3,6,6],[12,3,1,1],[13,3,2,6],[7,4,8,12],[7,5,8,12],[3,6,13,12],[16,6,6,2],[3,7,13,12],[16,7,1,2],[17,7,5,7],[3,8,13,12],[16,8,1,2],[17,8,5,7],[3,9,13,12],[16,9,1,2],[17,9,5,7],[3,10,13,12],[16,10,6,2],[3,11,16,12],[5,12,12,4],[5,13,12,4],[5,14,12,4],[5,15,12,5],[5,16,12,5],[5,17,12,5],[5,18,12,5],[5,19,6,2],[11,19,6,4],[5,20,6,2],[11,20,6,4],[5,21,6,2],[11,21,6,4],[5,22,6,2],[11,22,6,4]];
SPR.pidle=[[7,0,8,1],[6,1,9,6],[6,2,11,6],[6,3,6,6],[12,3,1,1],[13,3,4,6],[7,4,8,12],[17,4,5,14],[6,5,9,12],[17,5,5,14],[3,6,4,12],[7,6,1,2],[8,6,7,12],[15,6,2,2],[17,6,5,14],[3,7,5,12],[8,7,1,2],[9,7,3,12],[12,7,4,4],[16,7,6,7],[3,8,6,12],[9,8,1,2],[10,8,2,12],[12,8,4,4],[16,8,6,7],[3,9,7,12],[10,9,1,2],[11,9,1,12],[12,9,4,4],[16,9,6,7],[3,10,9,12],[12,10,4,4],[16,10,6,2],[5,11,1,4],[6,11,6,12],[12,11,4,4],[5,12,3,4],[8,12,4,9],[12,12,4,4],[5,13,3,4],[8,13,4,9],[12,13,4,4],[6,14,9,5],[6,15,9,5],[6,16,9,5],[6,17,9,5],[6,18,9,5],[6,19,9,5],[5,20,1,2],[6,20,9,5],[15,20,1,4],[5,21,5,2],[10,21,6,4],[5,22,5,2],[10,22,6,4],[5,23,5,2],[10,23,6,4]];
SPR.pcrouch=[[6,0,8,1],[5,1,9,6],[5,2,6,6],[11,2,1,1],[12,2,2,6],[6,3,8,12],[5,4,11,12],[5,5,9,12],[14,5,8,2],[5,6,9,12],[14,6,1,2],[15,6,7,7],[5,7,9,12],[14,7,1,2],[15,7,7,7],[5,8,9,12],[14,8,1,2],[15,8,7,7],[4,9,10,4],[14,9,8,2],[4,10,13,4],[17,10,1,5],[4,11,13,4],[17,11,1,5],[4,12,14,5],[4,13,14,5],[4,14,7,2],[11,14,7,4],[4,15,7,2],[11,15,7,4],[4,16,7,2],[11,16,7,4],[4,17,7,2],[11,17,7,4]];
SPR.rlvl=[[1,3,14,2],[0,4,3,4],[3,4,11,7],[14,4,7,2],[0,5,3,4],[3,5,11,7],[14,5,7,2],[0,6,3,4],[3,6,11,7],[14,6,7,2],[0,7,3,4],[3,7,12,2],[0,8,3,4]];
SPR.rlvf=[[20,1,3,14],[19,2,5,14],[1,3,14,2],[18,3,3,14],[21,3,1,15],[22,3,2,14],[0,4,3,4],[3,4,11,7],[14,4,4,2],[18,4,2,14],[20,4,3,15],[23,4,1,14],[0,5,3,4],[3,5,11,7],[14,5,4,2],[18,5,2,14],[20,5,3,15],[23,5,1,14],[0,6,3,4],[3,6,11,7],[14,6,4,2],[18,6,3,14],[21,6,1,15],[22,6,2,14],[0,7,3,4],[3,7,12,2],[19,7,5,14],[0,8,3,4],[20,8,3,14]];
SPR.rup=[[8,0,5,2],[8,1,1,2],[9,1,3,7],[12,1,1,2],[8,2,1,2],[9,2,3,7],[12,2,1,2],[8,3,1,2],[9,3,3,7],[12,3,1,2],[8,4,1,2],[9,4,3,7],[12,4,1,2],[8,5,1,2],[9,5,3,7],[12,5,1,2],[8,6,1,2],[9,6,3,7],[12,6,1,2],[8,7,1,2],[9,7,3,7],[12,7,1,2],[8,8,1,2],[9,8,3,7],[12,8,1,2],[8,9,5,2]];
SPR.rupf=[[8,0,5,14],[7,1,7,14],[7,2,7,14],[8,3,5,14],[8,4,1,2],[9,4,3,7],[12,4,1,2],[8,5,1,2],[9,5,3,7],[12,5,1,2],[8,6,1,2],[9,6,3,7],[12,6,1,2],[8,7,1,2],[9,7,3,7],[12,7,1,2],[8,8,1,2],[9,8,3,7],[12,8,1,2],[8,9,5,2]];
SPR.rdn=[[8,3,5,2],[8,4,1,2],[9,4,3,7],[12,4,1,2],[8,5,1,2],[9,5,3,7],[12,5,1,2],[8,6,1,2],[9,6,3,7],[12,6,1,2],[8,7,1,2],[9,7,3,7],[12,7,1,2],[8,8,1,2],[9,8,3,7],[12,8,1,2],[8,9,1,2],[9,9,3,7],[12,9,1,2],[8,10,1,2],[9,10,3,7],[12,10,1,2],[8,11,5,2]];
SPR.rdnf=[[8,3,5,2],[8,4,1,2],[9,4,3,7],[12,4,1,2],[8,5,1,2],[9,5,3,7],[12,5,1,2],[8,6,1,2],[9,6,3,7],[12,6,1,2],[8,7,1,2],[9,7,3,7],[12,7,1,2],[8,8,1,2],[9,8,3,7],[12,8,1,2],[8,9,5,14],[7,10,7,14],[7,11,7,14]];
SPR.etr0=[[6,0,10,1],[6,1,10,1],[5,2,11,6],[5,3,4,6],[9,3,4,1],[13,3,6,6],[5,4,6,6],[11,4,1,1],[12,4,7,6],[6,5,10,12],[6,6,10,12],[7,7,8,12],[5,8,3,5],[8,8,6,12],[14,8,1,5],[5,9,4,5],[9,9,4,12],[13,9,1,5],[14,9,10,2],[5,10,6,5],[11,10,5,2],[16,10,8,7],[5,11,6,5],[11,11,5,2],[16,11,8,7],[5,12,6,5],[11,12,5,2],[16,12,8,7],[5,13,6,5],[11,13,13,2],[5,14,5,5],[11,14,5,2],[5,15,5,5],[11,15,5,5],[5,16,5,5],[11,16,5,5],[5,17,5,5],[11,17,5,5],[5,18,5,5],[11,18,5,5],[5,19,5,5],[11,19,5,5],[5,20,5,1],[11,20,5,1],[5,21,5,1],[11,21,5,1],[5,22,5,1],[11,22,5,1],[5,23,5,1],[11,23,5,1]];
SPR.etr1=[[6,0,10,1],[6,1,10,1],[5,2,11,6],[5,3,4,6],[9,3,4,1],[13,3,6,6],[5,4,6,6],[11,4,1,1],[12,4,7,6],[6,5,10,12],[6,6,10,12],[7,7,8,12],[5,8,3,5],[8,8,6,12],[14,8,1,5],[5,9,4,5],[9,9,4,12],[13,9,1,5],[14,9,10,2],[5,10,6,5],[11,10,5,2],[16,10,8,7],[5,11,6,5],[11,11,5,2],[16,11,8,7],[5,12,6,5],[11,12,5,2],[16,12,8,7],[5,13,6,5],[11,13,13,2],[5,14,5,5],[11,14,5,2],[16,14,2,5],[5,15,5,5],[13,15,5,5],[5,16,5,5],[13,16,5,5],[5,17,5,5],[13,17,5,5],[5,18,5,5],[13,18,5,5],[5,19,5,5],[13,19,5,5],[5,20,5,1],[13,20,5,1],[5,21,5,1],[13,21,5,1],[5,22,5,1],[13,22,5,1],[5,23,5,1],[13,23,5,1]];
SPR.etr2=[[6,0,10,1],[6,1,10,1],[5,2,11,6],[5,3,4,6],[9,3,4,1],[13,3,6,6],[5,4,6,6],[11,4,1,1],[12,4,7,6],[6,5,10,12],[6,6,10,12],[7,7,8,12],[5,8,3,5],[8,8,6,12],[14,8,1,5],[5,9,4,5],[9,9,4,12],[13,9,1,5],[14,9,10,2],[5,10,6,5],[11,10,5,2],[16,10,8,7],[5,11,6,5],[11,11,5,2],[16,11,8,7],[5,12,6,5],[11,12,5,2],[16,12,8,7],[5,13,6,5],[11,13,13,2],[5,14,5,5],[11,14,5,2],[5,15,5,5],[11,15,5,5],[5,16,5,5],[11,16,5,5],[5,17,5,5],[11,17,5,5],[5,18,5,5],[11,18,5,5],[5,19,5,5],[11,19,5,5],[5,20,5,1],[11,20,5,1],[5,21,5,1],[11,21,5,1],[5,22,5,1],[11,22,5,1],[5,23,5,1],[11,23,5,1]];
SPR.etr3=[[6,0,10,1],[6,1,10,1],[5,2,11,6],[5,3,4,6],[9,3,4,1],[13,3,6,6],[5,4,6,6],[11,4,1,1],[12,4,7,6],[6,5,10,12],[6,6,10,12],[7,7,8,12],[5,8,3,5],[8,8,6,12],[14,8,1,5],[5,9,4,5],[9,9,4,12],[13,9,1,5],[14,9,10,2],[5,10,6,5],[11,10,5,2],[16,10,8,7],[5,11,6,5],[11,11,5,2],[16,11,8,7],[5,12,6,5],[11,12,5,2],[16,12,8,7],[5,13,6,5],[11,13,13,2],[5,14,6,5],[11,14,5,2],[5,15,10,5],[5,16,10,5],[5,17,10,5],[5,18,10,5],[5,19,10,5],[5,20,10,1],[5,21,10,1],[5,22,10,1],[5,23,10,1]];
SPR.ehv0=[[6,0,10,1],[6,1,10,1],[5,2,11,6],[5,3,4,6],[9,3,4,1],[13,3,6,6],[5,4,6,6],[11,4,1,1],[12,4,7,6],[6,5,10,12],[6,6,10,12],[7,7,8,12],[4,8,4,2],[8,8,6,12],[14,8,3,5],[4,9,4,2],[8,9,1,5],[9,9,4,12],[13,9,1,5],[14,9,10,2],[4,10,12,2],[16,10,8,7],[4,11,4,2],[8,11,3,4],[11,11,5,2],[16,11,8,7],[5,12,1,5],[6,12,1,2],[7,12,4,4],[11,12,5,2],[16,12,8,7],[5,13,1,5],[6,13,1,2],[7,13,4,4],[11,13,13,2],[5,14,1,5],[6,14,1,2],[7,14,4,4],[11,14,5,2],[16,14,1,5],[5,15,1,5],[6,15,8,2],[14,15,3,5],[5,16,5,5],[11,16,5,5],[5,17,5,5],[11,17,5,5],[5,18,5,5],[11,18,5,5],[5,19,5,5],[11,19,5,5],[5,20,5,5],[11,20,5,5],[5,21,5,5],[11,21,5,5],[5,22,5,1],[11,22,5,1],[5,23,5,1],[11,23,5,1],[5,24,5,1],[11,24,5,1],[5,25,5,1],[11,25,5,1]];
SPR.ehv1=[[6,0,10,1],[6,1,10,1],[5,2,11,6],[5,3,4,6],[9,3,4,1],[13,3,6,6],[5,4,6,6],[11,4,1,1],[12,4,7,6],[6,5,10,12],[6,6,10,12],[7,7,8,12],[4,8,4,2],[8,8,6,12],[14,8,3,5],[4,9,4,2],[8,9,1,5],[9,9,4,12],[13,9,1,5],[14,9,10,2],[4,10,12,2],[16,10,8,7],[4,11,4,2],[8,11,3,4],[11,11,5,2],[16,11,8,7],[5,12,1,5],[6,12,1,2],[7,12,4,4],[11,12,5,2],[16,12,8,7],[5,13,1,5],[6,13,1,2],[7,13,4,4],[11,13,13,2],[5,14,1,5],[6,14,1,2],[7,14,4,4],[11,14,5,2],[16,14,1,5],[5,15,1,5],[6,15,8,2],[14,15,4,5],[5,16,5,5],[13,16,5,5],[5,17,5,5],[13,17,5,5],[5,18,5,5],[13,18,5,5],[5,19,5,5],[13,19,5,5],[5,20,5,5],[13,20,5,5],[5,21,5,5],[13,21,5,5],[5,22,5,1],[13,22,5,1],[5,23,5,1],[13,23,5,1],[5,24,5,1],[13,24,5,1],[5,25,5,1],[13,25,5,1]];
SPR.ehv2=[[6,0,10,1],[6,1,10,1],[5,2,11,6],[5,3,4,6],[9,3,4,1],[13,3,6,6],[5,4,6,6],[11,4,1,1],[12,4,7,6],[6,5,10,12],[6,6,10,12],[7,7,8,12],[4,8,4,2],[8,8,6,12],[14,8,3,5],[4,9,4,2],[8,9,1,5],[9,9,4,12],[13,9,1,5],[14,9,10,2],[4,10,12,2],[16,10,8,7],[4,11,4,2],[8,11,3,4],[11,11,5,2],[16,11,8,7],[5,12,1,5],[6,12,1,2],[7,12,4,4],[11,12,5,2],[16,12,8,7],[5,13,1,5],[6,13,1,2],[7,13,4,4],[11,13,13,2],[5,14,1,5],[6,14,1,2],[7,14,4,4],[11,14,5,2],[16,14,1,5],[5,15,1,5],[6,15,8,2],[14,15,3,5],[5,16,5,5],[11,16,5,5],[5,17,5,5],[11,17,5,5],[5,18,5,5],[11,18,5,5],[5,19,5,5],[11,19,5,5],[5,20,5,5],[11,20,5,5],[5,21,5,5],[11,21,5,5],[5,22,5,1],[11,22,5,1],[5,23,5,1],[11,23,5,1],[5,24,5,1],[11,24,5,1],[5,25,5,1],[11,25,5,1]];
SPR.ehv3=[[6,0,10,1],[6,1,10,1],[5,2,11,6],[5,3,4,6],[9,3,4,1],[13,3,6,6],[5,4,6,6],[11,4,1,1],[12,4,7,6],[6,5,10,12],[6,6,10,12],[7,7,8,12],[4,8,4,2],[8,8,6,12],[14,8,3,5],[4,9,4,2],[8,9,1,5],[9,9,4,12],[13,9,1,5],[14,9,10,2],[4,10,12,2],[16,10,8,7],[4,11,4,2],[8,11,3,4],[11,11,5,2],[16,11,8,7],[5,12,1,5],[6,12,1,2],[7,12,4,4],[11,12,5,2],[16,12,8,7],[5,13,1,5],[6,13,1,2],[7,13,4,4],[11,13,13,2],[5,14,1,5],[6,14,1,2],[7,14,4,4],[11,14,5,2],[16,14,1,5],[5,15,1,5],[6,15,8,2],[14,15,3,5],[5,16,10,5],[5,17,10,5],[5,18,10,5],[5,19,10,5],[5,20,10,5],[5,21,10,5],[5,22,10,1],[5,23,10,1],[5,24,10,1],[5,25,10,1]];
SPR.boss=[[12,0,2,1],[14,0,13,5],[27,0,2,1],[11,1,3,2],[14,1,4,5],[18,1,5,6],[23,1,4,5],[27,1,3,2],[11,2,3,2],[14,2,4,5],[18,2,5,6],[23,2,4,5],[27,2,3,2],[11,3,3,2],[14,3,4,5],[18,3,5,6],[23,3,4,5],[27,3,3,2],[11,4,19,2],[11,5,19,2],[12,6,3,12],[15,6,4,1],[19,6,2,12],[21,6,4,1],[25,6,4,12],[12,7,4,12],[16,7,1,1],[17,7,6,12],[23,7,1,1],[24,7,5,12],[12,8,17,12],[12,9,17,12],[12,10,5,12],[17,10,7,1],[24,10,5,12],[5,11,8,2],[13,11,4,12],[17,11,7,1],[24,11,4,12],[28,11,8,2],[5,12,9,2],[14,12,13,12],[27,12,9,2],[5,13,10,2],[15,13,11,12],[26,13,10,2],[3,14,6,12],[9,14,5,2],[14,14,2,7],[16,14,9,12],[25,14,2,7],[27,14,5,2],[32,14,1,12],[33,14,7,14],[3,15,6,12],[9,15,5,2],[14,15,4,7],[18,15,5,12],[23,15,4,7],[27,15,5,2],[32,15,1,12],[33,15,7,14],[3,16,6,12],[9,16,5,2],[14,16,4,7],[18,16,5,6],[23,16,4,7],[27,16,6,2],[33,16,7,14],[3,17,6,12],[9,17,5,2],[14,17,4,7],[18,17,5,6],[23,17,4,7],[27,17,13,2],[3,18,6,12],[9,18,5,2],[14,18,4,7],[18,18,5,6],[23,18,4,7],[27,18,13,2],[3,19,6,12],[9,19,5,2],[14,19,4,7],[18,19,5,6],[23,19,4,7],[27,19,13,2],[3,20,6,12],[9,20,5,2],[14,20,4,7],[18,20,5,6],[23,20,4,7],[27,20,13,2],[3,21,6,12],[9,21,5,2],[14,21,13,7],[27,21,13,2],[3,22,6,12],[9,22,5,2],[14,22,13,7],[27,22,13,2],[3,23,6,12],[9,23,31,2],[3,24,6,12],[9,24,31,2],[8,25,25,2],[8,26,25,2],[11,27,8,2],[22,27,8,5],[11,28,8,2],[22,28,8,5],[11,29,8,2],[22,29,8,5],[11,30,8,2],[22,30,8,5],[11,31,8,2],[22,31,8,5],[11,32,8,2],[22,32,8,5],[11,33,8,2],[22,33,8,5],[11,34,8,2],[22,34,8,5],[11,35,8,2],[22,35,8,5],[10,36,1,1],[11,36,8,2],[22,36,8,5],[30,36,1,1],[10,37,9,1],[22,37,9,1],[10,38,9,1],[22,38,9,1],[10,39,9,1],[22,39,9,1],[10,40,9,1],[22,40,9,1],[10,41,9,1],[22,41,9,1]];

function drawWorld(){
  const t=frame;
  // smooth dusk sky gradient bands
  rectfill(0,0,256,40,C.blue);
  rectfill(0,40,256,26,C.purple);
  rectfill(0,66,256,18,C.red);
  rectfill(0,84,256,12,C.orange);
  // soft sun
  circfill(195,72,16,C.red); circfill(195,72,11,C.orange); circfill(195,72,6,C.yellow);
  // drifting clouds
  for(let i=0;i<6;i++){
    let x=Math.floor(((i*49-t*0.1)%320+320)%320)-35, y=10+(i%3)*12;
    rectfill(x,y,38,5,C.shadow); rectfill(x+6,y-3,26,4,C.purple);
    rectfill(x+4,y+4,30,2,C.orange);
  }
  // far soft ridge
  for(let i=0;i<10;i++){
    let x=Math.floor(((i*68-cam*0.06)%360+360)%360)-40;
    let h=24+((i*23)%4)*8;
    rectfill(x+12,98-h,16,h,C.shadow);
    rectfill(x+4,98-h+8,32,h-8,C.shadow);
    rectfill(x,98-h+16,40,Math.max(1,h-16),C.shadow);
  }
  // distant jungle wall (soft)
  rectfill(0,95,256,48,C.green);
  for(let i=0;i<18;i++){
    let x=Math.floor(((i*28-cam*0.14)%300+300)%300)-12;
    let h=16+((i*11)%4)*6;
    rectfill(x,140-h,20,h,C.green);
    circfill(x+10,140-h,6,C.green);
  }
  rectfill(0,95,256,4,C.shadow);
  // mid canopy - overlapping soft masses
  for(let i=0;i<12;i++){
    let x=Math.floor(((i*41-cam*0.30)%340+340)%340)-30;
    let y=108+(i%3)*6, w=34+(i%2)*10, h=26+(i%3)*5;
    rectfill(x,y,w,h,C.green);
    rectfill(x+3,y-3,w-6,5,C.lime);
    for(let b=0;b<4;b++) circfill(x+6+b*7,y-1+(b%2)*2,3,C.lime);
    rectfill(x+5,y+8,6,h-12,C.shadow);
  }
  // tree trunks + soft vines
  for(let i=0;i<8;i++){
    let x=Math.floor(((i*55+12-cam*0.45)%350+350)%350)-14;
    rectfill(x,95,6,85,C.brown);
    rectfill(x+1,98,2,78,C.shadow);
    rectfill(x+4,100,1,60,C.orange);
    let sw=Math.floor(Math.sin(t/18+i*1.5)*2);
    rectfill(x+8+sw,100,2,40,C.green);
    rectfill(x+9+sw,115,2,3,C.lime);
    rectfill(x-3-sw,108,2,32,C.green);
  }
  // gentle waterfall
  {
    let x=Math.floor(((300-cam*0.2)%440+440)%440)-70;
    rectfill(x,58,24,50,C.shadow); rectfill(x+60,58,24,50,C.shadow);
    rectfill(x,58,24,3,C.green); rectfill(x+60,58,24,3,C.green);
    rectfill(x+24,60,36,44,C.blue);
    for(let s=0;s<4;s++){
      let wy=60+((t*1.8+s*18)%42);
      rectfill(x+28,wy,6,8,C.cyan);
      rectfill(x+40,60+((wy+20)%42),5,6,C.white);
    }
    rectfill(x+24,102,36,5,C.cyan);
  }
  // soft god rays
  for(let r=0;r<3;r++){
    let x=48+r*70-Math.floor(cam*0.35)%40;
    for(let k=0;k<28;k+=3) if((k+r)%2===0) pset(x+Math.floor(k*0.5),100+k,C.yellow);
  }
  // ground fog
  for(let i=0;i<10;i++){
    let x=Math.floor(((i*33+t*0.06)%290+290)%290)-15;
    rectfill(x,FLOOR-14,36,6,C.shadow);
  }
  // birds + fireflies
  for(let i=0;i<5;i++){
    let x=Math.floor(((i*59-t*0.22)%280+280)%280);
    let y=58+(i%3)*12+Math.floor(Math.sin(t/12+i)*2);
    pset(x,y,C.white); pset(x+1,y-1,C.white);
  }
  for(let i=0;i<12;i++){
    let x=Math.floor(((i*39+t*0.3)%280+280)%280);
    let y=148+((i*17)%28);
    if(Math.floor(t/13+i)%3) pset(x,y,C.yellow);
  }
  // ground
  rectfill(0,FLOOR,256,34,C.brown);
  rectfill(0,FLOOR+7,256,27,C.shadow);
  rectfill(0,FLOOR+7,256,2,C.black);
  for(let x=0;x<272;x+=14){
    let wx=x+cam, pit=pits.some(q=>wx+14>q[0]&&wx<q[1]);
    if(!pit){
      rectfill(x,FLOOR,14,4,C.green); rectfill(x,FLOOR+3,14,2,C.lime);
      rectfill(x+2,FLOOR+10,2,8,C.shadow); rectfill(x+9,FLOOR+12,2,8,C.brown);
      if(((wx/14)|0)%2===0){rectfill(x+4,FLOOR+15,6,4,C.grey);}
    }else{
      rectfill(x,FLOOR,14,34,C.black);
      let gl=Math.floor(t/14)%2;
      rectfill(x,FLOOR,14,3,gl?C.red:C.orange);
      rectfill(x,FLOOR+3,14,2,C.orange);
    }
  }
  for(const q of pits){
    let x=q[0]-cam;
    if(x>-20&&x<270) for(let k=0;k<3;k++){
      rectfill(x+k*6,FLOOR-6,3,4,C.yellow); rectfill(x+1+k*6,FLOOR-3,2,2,C.red);
    }
  }
  for(const q of platforms){
    let sx=q.x-cam;
    if(sx>-q.w&&sx<256){
      rectfill(sx,q.y,q.w,5,C.brown);
      rectfill(sx,q.y,q.w,2,C.green);
      if(q.bridge){rectfill(sx,q.y+1,q.w,1,C.yellow); for(let b=0;b<q.w;b+=6) rectfill(sx+b,q.y-1,2,2,C.brown);}
    }
  }
  for(const e of enemies){if(!e.alive)continue; drawEnemy(e.x-cam,e.y,e.type,e.dir,e.hit);}
  if(boss){
    let bx=boss.x-cam, by=boss.y;
    // use detailed boss sprite if available
    if(SPR.boss){
      drawRuns(bx-12, by-20, SPR.boss, 1, 40);
      if(boss.hit) drawRunsC(bx-12, by-20, SPR.boss, 1, 40, C.white);
    } else {
      rectfill(bx-20,by-10,48,50,C.shadow);
      rectfill(bx-16,by-6,40,42,C.brown);
    }
    rectfill(bx-22,by-24,48,4,C.black);
    rectfill(bx-21,by-23,Math.floor(46*(boss.health/boss.max)),2,C.red);
  }
  for(const b of bullets){
    if(b.kind==='rocket'){circfill(b.x-cam,b.y,3,C.orange);circfill(b.x-cam,b.y,1,C.yellow);}
    else if(b.kind==='laser'){rectfill(b.x-cam-1,b.y-1,6,3,C.white);}
    else{rectfill(b.x-cam,b.y,3,2,b.color);}
  }
  for(const b of ebullets){circfill(b.x-cam,b.y,2,C.red); pset(b.x-cam,b.y,C.yellow);}
  for(const a of particles){pset(a.x-cam,a.y,a.color); if(a.life%3===0) pset(a.x-cam+1,a.y-1,C.white);}
  if(state!=='dying'||frame%8<4) drawCommando(p.x-cam,p.y,p.face,p.crouch,invuln>0&&frame%8<4);
  for(let i=0;i<20;i++){
    let x=Math.floor(((i*17-cam)%280+280)%280); let wx=x+cam;
    if(!pits.some(q=>wx>q[0]&&wx<q[1])){
      rectfill(x,FLOOR-3,2,3,C.green); rectfill(x+2,FLOOR-2,2,2,C.lime);
    }
  }
  for(let i=0;i<7;i++){
    let x=Math.floor(((i*43-cam*1.2)%310+310)%310)-14;
    let h=12+(i%3)*7;
    rectfill(x,224-h,3,h,C.black); rectfill(x+4,224-h+5,2,h-8,C.shadow);
  }
  drawHud();
  if(messageT>0&&message){panel(59,46,138,19);ctxt(message,52,C.yellow);}
}

function drawCommando(x,y,face,crouch,blink=false){
  if(blink)return;
  const airborne=!(p&&p.onGround), moving=(key(LEFT)||key(RIGHT))&&(p&&p.onGround);
  let fr,fh=24,yy=y+20-24;
  if(crouch){fr=SPR.pcrouch;fh=16;yy=y+20-16;}
  else if(airborne){fr=SPR.pjump;}
  else if(moving){const s=Math.floor(frame/6)%4;fr=s===0?SPR.prun0:s===1?SPR.prun1:s===2?SPR.prun0m:SPR.prun1;}
  else{fr=SPR.pidle;yy+=Math.floor(frame/30)%2;}
  const ox=x-4;
  rectfill(ox+3,yy+fh-2,14,2,C.shadow);
  drawRuns(ox,yy,fr,face,22);
  let aim=0;
  if(key(UP))aim=1; else if(key(DOWN)&&airborne)aim=2;
  const firing=key(B)&&frame%6<3;
  const rs=aim===0?(firing?SPR.rlvf:SPR.rlvl):aim===1?(firing?SPR.rupf:SPR.rup):(firing?SPR.rdnf:SPR.rdn);
  drawRuns(ox,yy,rs,face,22);
}
function drawEnemy(x,y,type,dir,hit){
  const heavy=type==='heavy', w=heavy?20:18, h=heavy?26:24;
  const set=heavy?[SPR.ehv0,SPR.ehv1,SPR.ehv2,SPR.ehv3]:[SPR.etr0,SPR.etr1,SPR.etr2,SPR.etr3];
  const fr=set[Math.floor(frame/8)%4];
  rectfill(x-3,y-1,18,2,C.shadow);
  if(hit){drawRunsC(x-2,y-h,fr,dir,w,C.white);return;}
  drawRuns(x-2,y-h,fr,dir,w);
}
function drawBoss(x,y,hit){
  rectfill(x-28,y+31,56,3,C.shadow);
  if(hit){drawRunsC(x-28,y-18,SPR.boss,1,60,C.white);return;}
  drawRuns(x-28,y-18,SPR.boss,1,60);
  if(Math.floor(frame/12)%2){rectfill(x-2,y+6,8,6,C.yellow);rectfill(x,y+8,4,2,C.white);} // core pulse
}
function drawHud(){rectfill(0,0,256,17,C.black);txt('HP',5,5,C.white);for(let i=0;i<5;i++)rectfill(24+i*10,5,7,6,i<p.health?C.red:C.grey);txt('LIVES '+lives,82,5,C.white);txt('SCORE '+score,148,5,C.yellow);txt(WEAPONS[weapon].name,202,207,C.cyan);}
function txt(s,x,y,c){print(s,x+1,y+1,C.black);print(s,x,y,c);}function ctxt(s,y,c){txt(s,128-s.length*4,y,c);}function panel(x,y,w,h){rectfill(x,y,w,h,C.black);rect(x,y,w,h,C.silver);}
function init(){bg(0,{mx:0,my:0,mw:32,mh:28,show:false});state='title';}
