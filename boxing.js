/* =====================================================================================================================
   PRO BOXING (spin-off of the wrestling game): the same men, ring, entrances, music and menus - but no grapples, throws,
   pins, ring-outs or running. Just boxing: JAB, CROSS, BLOCK, knockdowns with a referee's 10-count, rounds, decisions.
   Loaded after game.js: everything here overrides the wrestling match code (the wrapped originals are renamed *_W).
   ===================================================================================================================== */
var ROUNDS = 3, ROUND_SECS = 30;          // (the user) 3 rounds of 0:30 (was 12), then the judges' scorecards
var KD_HP = [60, 45, 30];                 // health after beating the count (1st / 2nd / 3rd knockdown)
var TKO_KDS = 3;                          // 3 knockdowns in one round = TKO

/* ---- THE ROSTER: three boxers (the wrestlers are gone). Sheets built by tools/build_boxers.py from the base body:
   bare chest, trunks to mid-thigh, bare legs, boxing boots; *_alt = other trunks for a mirror match. */
var BOXERS = [
  { name:'DOUG SMITH',     key:'carson', nation:'', ht:'', wt:'', pw:4, sp:1.0,  base:'BASE', spec:'' },
  { name:'BENNY THE BELL', key:'dawson', nation:'', ht:'', wt:'', pw:4, sp:0.85, base:'BASE', spec:'' },
  { name:'JEAN CLAUDE',    key:'claude', nation:'', ht:'', wt:'', pw:4, sp:1.2,  base:'BASE', spec:'' }
];
// FIGHTING STYLES (the user's pick, 2026-11-09). sp above = foot speed. dmg = his punches, tough = divides what he takes, stay = how
// often he stays down. As the CPU: block / cross add to the difficulty's chances, think scales his reaction time, counter =
// how often he punches straight back after a block. Created boxers have no entry: everything neutral.
var BOX_STYLE = {
  'DOUG SMITH':     { tag:'BALANCED BEGINNER',     dmg:0.9, tough:1,   stay:1.2, block:-0.1,  cross:0,     think:1.25, counter:0 },
  'BENNY THE BELL': { tag:'SLOW BUT TOUGH',        dmg:1.05, tough:1.1, stay:0.4, block:0,    cross:0.2,   think:1.3,  counter:0 },
  'JEAN CLAUDE':    { tag:'FAST COUNTER PUNCHER',  dmg:1,   tough:0.9, stay:1,   block:0.05, cross:-0.05, think:0.9,  counter:0.4 }
};
var STYLE_NONE = { tag:'', dmg:1, tough:1, stay:1, block:0, cross:0, think:1, counter:0 };
function styleOf(e){ return BOX_STYLE[e.def.name] || STYLE_NONE; }
ROSTER = BOXERS;
ALT_SHEET = {};
// body-blow frames (tools/build_boxers.py): BDIP = the dip (knees bent, guard low), BODYP = the arm driven down into the belly
// JABL / BODYL = the LEFT hand: the far arm punching out from behind the body, the right hand stays up in guard
var BODY_FRAMES = { BDIP:[2,1412,18,56], BODYP:[20,1412,24,56], JABL:[48,1412,23,56], BODYL:[75,1412,24,56], CRSR:[102,1412,24,56],
  GRD:[128,1412,18,56], GW0:[148,1412,18,56], GW1:[168,1412,18,55], GW2:[188,1412,18,57], GW3:[208,1412,18,56], BLKH:[228,1412,20,56], BLKL:[250,1412,20,56],
  // in-between frames (wind-up W + half-way M) so every punch reads differently while it comes
  JABW:[2,1472,18,56], JABM:[22,1472,20,56], CRSW:[44,1472,18,56], CRSM:[64,1472,20,56],
  BDLW:[86,1472,18,56], BDLM:[106,1472,20,56], BDRW:[128,1472,18,56], BDRM:[148,1472,20,56] };
ARENA.src = 'sprites/ring_deluxe.png?v=1';   // (2026-11-09 graphics pass, tools/build_ring_deluxe.py; ring_only.png = the plain ring)
// (the user, 2026-11-08: 'remove the background - just have the ring, ref and boxers for now'): the ring on black
// (sprites/ring_only.png, tools/build_ring_style.py); the full gym art is still built as ring_boxing.png to switch back.
// No cameraman, no commentators either.
function drawCameraman(){}
function drawCommentators(){}
// (the user: 'a smaller venue with less people, like a training centre'): the art is a gym now (tools/build_gym.py) -
// the real game's waving-crowd patches would paint the old packed crowd back over it, so they're off
function drawCrowdAnim(){}   // the ring with boxing logos (tools/build_ring.py)
// (the user: 'redraw the ring smaller'): the ring art is 32 px narrower each side (tools/build_ring.py, SH) - the ropes now
// run world x 39-215, so the fighters / ref keep 32 px further in on each side, and the near ropes re-blit only that span
// (the user, 2026-11-08: 'shrink ring size 15% smaller'): SH 45 + 12 rows less deep (tools/build_ring.py) - ropes world
// x 53-202, the front ropes + apron 12 px higher (APRON_DY moves the clock in game.js)
var RING_SH = 45, APRON_DY = -12;
RING.x1 = 24+RING_SH; RING.x2 = 232-RING_SH; RING.y2 = 136+APRON_DY;
FRONT_ROPE_ROWS = FRONT_ROPE_ROWS.map(function(y){ return y+APRON_DY; });
function drawFrontRopes(){
  if (!imgOk(ARENA)) return;
  var lx=(typeof RING_MODE!=='undefined' && RING_MODE==='lane') ? LANE_DX : 0, x0=40+(RING_SH-32)-lx, w=176-2*(RING_SH-32)+2*lx;
  for (var i=0;i<FRONT_ROPE_ROWS.length;i++){ var y=FRONT_ROPE_ROWS[i]; g.drawImage(ARENA, CAM_MAX+x0,y,w,1, x0,y,w,1); }
}
BOXERS.forEach(function(b){
  ALT_SHEET[b.name] = b.key;
  [['', 'sprites/boxer_'+b.key+'_keyed.png?v=21'], ['#ALT', 'sprites/boxer_'+b.key+'_alt_keyed.png?v=21']].forEach(function(v){
    var nm = b.name + v[0];
    ATLAS_DATA[nm] = { sheet:v[1], frames:Object.assign({}, ATLAS_DATA['BASE'].frames, BODY_FRAMES) }; ATLAS[nm] = ATLAS_DATA[nm].frames;
    var im = new Image(); im.onload = function(){ READY[nm] = true; }; im.src = v[1]; SHEET[nm] = im;
    SEQ[nm] = Object.assign({}, SEQ['BASE']);
  });
  PORTRAIT[b.name] = load('sprites/portrait_boxer_'+b.key+'.png?v=8');
  FACE[b.name] = [43, 16];
});
// walk-out themes (original chiptunes - drop a real song in as music/entrance_carson.mp3 / entrance_dawson.mp3 to replace)
ENT_THEMES['DOUG SMITH']  = { bpm:138, wave:'square', lead:[67,0,71,0,74,0,71,67, 69,0,72,0,76,0,72,69, 67,0,71,0,74,76,79,76, 74,72,71,69,67,0,0,0], bass:[43,45,43,38], drum:'K.H.S.H.K.KHS.H.' };
ENT_THEMES['BENNY THE BELL'] = { bpm:96,  wave:'sawtooth', lv:0.05, lead:[48,0,48,51,0,48,53,51, 48,0,48,51,0,55,53,51, 48,0,48,51,0,48,53,55, 56,55,53,51,48,0,0,0], bass:[36,36,39,34], drum:'K..SK.K.S..HK.S.' };
ENT_THEMES['JEAN CLAUDE'] = ENT_THEMES['DOUG SMITH'];
ENT_STYLE = {};
CAW_OUT = [];
MENU_ITEMS = ['NEW BOXER', '2 PLAYERS', 'OPTIONS', 'CONTROLS'];   // NEW BOXER: create one, then fight the CPU   // (no tournament with 2 boxers)
CHAMP_OPT = null;

// punches (ticks): start..end = when the glove can land, rec = when you can act again
// (the user, 2026-11-08: 'punches need more frames, blocking is too hard'): every wind-up ~5 ticks longer so a guard can
// react - the body shots show the knee dip (BDIP) first, the jab a small pull back, the cross its cock back
MOVES = {
  jab:   { start:8,  end:14, rec:22, range:22, dmg:3, pose:'jab',   snd:sfx.whoosh, stun:9 },               // LEFT to the face
  cross: { start:15, end:21, rec:36, range:27, dmg:8, pose:'cross', snd:sfx.whoosh, stun:15, push:5 },     // RIGHT to the face
  bodyL: { start:9,  end:15, rec:24, range:21, dmg:3, pose:'bodyL', snd:sfx.whoosh, stun:11, lo:true },     // LEFT to the body
  bodyR: { start:16, end:22, rec:38, range:25, dmg:7, pose:'bodyR', snd:sfx.whoosh, stun:18, push:3, lo:true }   // RIGHT to the body
};
for (var _sn in SEQ){ if (!SEQ[_sn].idle || _sn==='TODD MANAGER' || _sn==='RIGOR VON SLASHER') continue;
  SEQ[_sn] = Object.assign({}, SEQ[_sn], {
    jab:   { seq:['JABW','JABM','JABL','JABM'], durs:[5,3,8,6], dx:[-1,1,4,1], loop:false },        // left hand
    cross: { seq:['CRSW','CRSM','CRSR','CRSR','CRSM'], durs:[11,4,4,9,8], dx:[-3,2,7,9,3], loop:false },   // cock back, lunge, hold, recover
    bodyL: { seq:['BDLW','BDLM','BODYL','BDLM'], durs:[6,3,8,7], dx:[0,1,2,1], loop:false },      // left hand
    bodyR: { seq:['BDRW','BDRM','BODYP','BODYP','BDRM'], durs:[12,4,4,9,9], dx:[-3,2,5,7,2], loop:false },
    idle:  { seq:['GRD'], loop:true, dur:20 },                  // guard: LEFT hand out front (dark), RIGHT hand at the chin (bright)
    walk:  { seq:['GW0','GW1','GW2','GW3'], loop:true, dur:6 },
    block: { seq:['BLKH'], loop:true, dur:20 },          // high guard: both gloves up in front of the face
    blockLo: { seq:['BLKL'], loop:true, dur:20 },        // low guard: both gloves down over the body
    hurtb: { seq:['4.3'], loop:false, dur:8 }            // doubled over from a body shot
  }); }

/* ---- boxing gloves, drawn over the fists. [x, y] = fist centre in the frame (the shared base body), front + back hand */
var GLOVES = {
  '1.0':[[12,11],[9,14]], '0.0':[[12,12],[9,14]], '0.1':[[12,12],[9,14]], '0.2':[[12,12],[9,14]], '0.3':[[12,12],[9,14]],
  '1.1':[[20,8],[10,6]],  '16.1':[[12,16],[5,15]], '16.0':[[12,15],[6,21]], 'KNOCKB':[[6,22]], '14.0':[[18,11],[10,16]], 'BDIP':[[8,14],[15,14]], 'BODYP':[[21,25],[15,14]], 'JABL':[[8,10],[22,8]], 'CRSR':[[22,9],[13,16]], 'GRD':[[8,10],[15,10]], 'GW0':[[8,10],[15,10]], 'GW1':[[8,10],[15,10]], 'GW2':[[8,10],[15,10]], 'GW3':[[8,10],[15,10]], 'BLKH':[[12,9],[14,6]], 'BLKL':[[12,25],[15,22]],
  'JABW':[[8,10],[12,11]], 'JABM':[[8,10],[16,8]], 'CRSW':[[4,13],[15,10]], 'CRSM':[[14,9],[13,16]],
  'BDLW':[[8,14],[12,22]], 'BDLM':[[8,14],[16,22]], 'BDRW':[[4,23],[15,14]], 'BDRM':[[15,23],[15,14]], 'BODYL':[[8,14],[21,25]], '4.6':[[14,16],[12,12]], '4.3':[[11,8]], '12.6':[[15,19]],
  'LIEFLAT':[[22,11]], '19.2':[[1,28],[17,28]], '19.3':[[2,2],[16,2]]
};
var GLOVE_SKIP = { 'TODD MANAGER':1, 'RIGOR VON SLASHER':1 };
// a shaded pixel glove: dark outline, highlight, shade, white cuff (the back hand drawn darker)
var GLOVE_PX = ['.OOOO..', 'OHHFFO.', 'OHFFFFO', 'OFFFFDO', 'OFFFDDO', '.OWWWO.', '..OOO..'];
var GLOVE_COL = { front:{O:'#2a0404',H:'#ff8c78',F:'#dc2222',D:'#9a1014',W:'#f2f2f2'}, back:{O:'#140101',H:'#a83434',F:'#861414',D:'#560808',W:'#a0a0a0'},
  // blue corner (player 2) wears BLUE gloves - matches the corner posts + the apron, and you can tell whose hands are whose
  bfront:{O:'#040a2a',H:'#8cb4ff',F:'#2856dc',D:'#14309a',W:'#f2f2f2'}, bback:{O:'#010214',H:'#3a58a8',F:'#18308a',D:'#0a1656',W:'#a0a0a0'} };
var GLOVE_BLUE = false, GLOVE_CAW = false;
function isBlue(name){ return !!(match && p1 && typeof artKey==='function' && name===artKey(p1) && name!==artKey(p2)); }   // (player 1 = the blue corner)
function drawGlove(x, y, back){
  x=Math.round(x)-3; y=Math.round(y)-3; var C = GLOVE_CAW ? (back ? GLOVE_COL.cback : GLOVE_COL.cfront) : GLOVE_BLUE ? (back ? GLOVE_COL.bback : GLOVE_COL.bfront) : (back ? GLOVE_COL.back : GLOVE_COL.front);
  for (var r=0;r<7;r++){ var row=GLOVE_PX[r]; for (var c=0;c<7;c++){ var ch=row[c]; if (ch==='.') continue; g.fillStyle=C[ch]; g.fillRect(x+c,y+r,1,1); } }
}
function drawGlovesAt(name, fid, left, top){        // in the frame's own (possibly mirrored) space
  if (GLOVE_SKIP[name.split('#')[0]]) return;
  var gl = GLOVES[fid]; if (!gl) return;
  if (ORTHO_NOW && ORTHO_GUARD[fid] && gl.length>1) gl = [gl[1], gl[0]];   // (always orthodox: his left glove forward)
  GLOVE_BLUE = isBlue(name); GLOVE_CAW = typeof cawIsMine==='function' && cawIsMine(name) && !!GLOVE_COL.cfront;
  var behind = ORTHO_NOW && ORTHO_GUARD[fid];       // (always orthodox, facing left: his RIGHT hand is the far one - behind his body)
  for (var i=gl.length-1;i>=0;i--){
    // (the user: 'the left hand seems bare'): the rear glove sits just behind the lead one, over the arm, clear of his face
    if (behind && i>0) drawGlove(left+gl[i][0]+ORTHO_REAR_DX+0.5, top+gl[i][1]+0.5, true);
    else drawGlove(left+gl[i][0]+0.5, top+gl[i][1]+0.5, i>0);
  }
  GLOVE_BLUE = false; GLOVE_CAW = false;
}
function drawWrestler(name, px, py, face, pose, f){
  drawWrestler_W(name, px, py, face, pose, f);
  if (!READY[name] || GLOVE_SKIP[name.split('#')[0]]) return;
  var seqs=SEQ[name], a=seqs[pose]||seqs.idle, i;
  if (a.durs){ var acc=0; i=a.seq.length-1; for (var k=0;k<a.durs.length;k++){ acc+=a.durs[k]; if ((f||0)<acc){ i=k; break; } } }
  else { i=Math.floor((f||0)/a.dur); i = a.loop ? (i % a.seq.length) : Math.min(a.seq.length-1, i); }
  var fid=a.seq[i], fr=ATLAS[name][fid]; if (!fr) return;
  px=Math.round(px); py=Math.round(py);
  if (a.dx) px += a.dx[i]*face; if (a.dy) py += a.dy[i]; if (a.flip && a.flip[i]) face=-face;
  var topY=-fr[3]; if (a.head && a._refH) topY=-a._refH;
  g.save(); g.translate(px, py); if (face<0) g.scale(-1,1);
  drawGlovesAt(name, fid, -Math.round(fr[2]/2), topY);
  g.restore();
}
function drawRel(e, fid, L, dy){
  drawRel_W(e, fid, L, dy);
  var r=ATLAS[e.def.name][fid]; if (!r) return;
  g.save(); g.translate(Math.round(e.x), Math.round(e.y)+dy); if (e.face>0) g.scale(-1,1);
  drawGlovesAt(artKey(e), fid, L, -r[3]);
  g.restore();
}

/* ---- controls: Z jab, X cross, C (or pad B / bumpers) block */
// GUARD (the user, 2026-11-08, after Sega's Greatest Heavyweights: 'default is blocking something, a button blocks the
// other'): standing / walking covers the BODY (it looks like the normal stance), the face is open. HOLD LB or RB (keyboard
// C / Shift / V) to cover the FACE - then the body is open. Punching, hurt: open everywhere.
function kbBlock(){ return CTL===0 && (keys['c']||keys['C']||keys['Shift']||keys['v']||keys['V']); }
function pBlock(){ return kbBlock() || pad.LB || pad.RB; }
// (the user) X = LEFT hand, A = RIGHT hand - on the pad AND the keyboard; hold DOWN with it for the body shot
PAD_KEY.P = 'x'; PAD_KEY.K = 'a'; PAD_KEY.Y = 'PadY'; PAD_KEY.B = 'Backspace';
function pLeft(){ return pressed['x']||pressed['X']; }
function pRight(){ return pressed['a']||pressed['A']; }
function pFaceL(){ return pLeft() && !kD(); }
function pFaceR(){ return pRight() && !kD(); }
function pBodyL(){ return pLeft() && kD(); }
function pBodyR(){ return pRight() && kD(); }
function pAnyPunch(){ return pFaceL()||pFaceR()||pBodyL()||pBodyR(); }

function startMatch(idx, opp, twoP){
  if (twoP) LADDER=null;
  startMatch_W(idx, opp, twoP);
  entSkip();                                              // (the user: 'remove entrances') - straight to the intro + bell
  refSel = REF_CLASSIC;                                   // (the user) boxing uses just the one ref for now: the generic NES ref
  match.round = 1; match.time = ROUND_SECS*60; match.kd = null; match.roCount = 0;
  p1.pts = p2.pts = 0; p1.kdN = p2.kdN = 0; p1.kdR = p2.kdR = 0; p1.rPts = p2.rPts = 0;
  match.cards = [[0,0],[0,0],[0,0]]; match.cardsShow = false;
  statsStart();
  [p1,p2].forEach(fightReset);
  toCorners();
}
/* ---- ROUND STATS (the user, 2026-11-08: 'a stat list after each round for jabs, straights, body jab, body straight -
   percentage thrown vs landed'): counted per round. Thrown = every punch started; landed = connected and not blocked
   (a miss or a blocked punch is thrown only). The screen shows after every bell, the last one too (before the cards). */
var STAT_ROWS = [['JAB','jab'],['STRAIGHT','cross'],['BODY JAB','bodyL'],['BODY STRAIGHT','bodyR']];
// (the user: 'a mini menu of seeing for round and fight total, cleaner, and you click continue after you're done reading'):
// LEFT / RIGHT picks ROUND n, FIGHT TOTAL or CONTINUE; X / A / ENTER on CONTINUE moves on. No timer, and it starts away from
// CONTINUE so punches still being mashed at the bell can't skip it.
function statsNew(){ return { jab:[0,0], cross:[0,0], bodyL:[0,0], bodyR:[0,0] }; }
function statsReset(){ p1.rs = statsNew(); p2.rs = statsNew(); }
function statsStart(){ statsReset(); p1.ft = statsNew(); p2.ft = statsNew(); }
function statCount(e, mv, i){
  if (!e.rs) e.rs = statsNew(); if (!e.ft) e.ft = statsNew();
  if (e.rs[mv]){ e.rs[mv][i]++; e.ft[mv][i]++; }
}
function updateStats(){
  var M=match; updateFX();
  M.re++; updateRoundEndWalk();                           // (the boxers keep walking back to their corners under the stats)
  if (pressed['ArrowLeft']||pressed['ArrowUp']){ M.stSel=(M.stSel+2)%3; sfx.select(); }
  if (pressed['ArrowRight']||pressed['ArrowDown']){ M.stSel=(M.stSel+1)%3; sfx.select(); }
  if (M.stSel<2) M.stView=M.stSel;                         // (on CONTINUE: the last list picked stays up)
  if (M.stSel===2 && (pLeft()||pRight()||pressed['Enter']||pressed['PadStart'])){
    sfx.select(); statsReset(); if (ref) ref.handUp=false;
    toCorners(); [p1,p2].forEach(function(e){ e.state='idle'; e.t=0; });
    if (M.round>=ROUNDS){ startCards(); return; }          // the final bell: to the scorecards
    M.phase='rest'; M.rt=119;                              // (straight to 'ROUND n', then the bell)
  }
}
function oText(t, x, y, c){                       // text with a black outline (readable over the ring, no backing box)
  var D=[[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[1,-1],[-1,1],[1,1]];
  for (var i=0;i<D.length;i++) drawText_O(t, x+D[i][0], y+D[i][1], '#000');
  drawText_O(t, x, y, c);
}
function drawText_O(t, x, y, c){ drawText(t, x, y, c); }
function drawStats(){
  var M=match, PY=56, cols=[[138,168],[206,236]], WH='#ffffff', GR='#8c8c94';
  var drawText=oText, drawTextFit=function(t,x,y,c,w){ oText(t, x, y, c); };
  var drawTextC=function(t,x,y,c){ oText(t, Math.round(x-textW(t)/2), y, c); };
  var rAlign=function(t,x,y,c){ oText(t, x-textW(t), y, c); };
  drawTextC('END OF ROUND '+M.round, 128, PY-8, WH);
  var y=PY+10;
  drawText('LANDED/THROWN', 20, y, '#6c6c74');
  drawTextFit(p1.def.name.split(' ').pop(), 138, y, '#4a80f0', 62);
  drawTextFit(p2.def.name.split(' ').pop(), 206, y, '#e02424', 62);
  y+=14;
  var row=function(label, th, la, col){
    drawText(label, 20, y, col);
    return function(j){ rAlign(la+'/'+th, cols[j][0], y, col); rAlign((th ? Math.round(100*la/th) : 0)+'%', cols[j][1], y, col); };
  };
  STAT_ROWS.forEach(function(r){
    drawText(r[0], 20, y, GR);
    [p1,p2].forEach(function(e, j){
      var n=((M.stView===1 ? e.ft : e.rs)||statsNew())[r[1]];
      rAlign(n[1]+'/'+n[0], cols[j][0], y, GR); rAlign((n[0] ? Math.round(100*n[1]/n[0]) : 0)+'%', cols[j][1], y, GR);
    });
    y+=12;
  });
  y+=4;
  drawText('TOTAL PUNCHES', 20, y, WH);
  [p1,p2].forEach(function(e, j){
    var L=((M.stView===1 ? e.ft : e.rs)||statsNew()), th=0, la=0;
    STAT_ROWS.forEach(function(r){ th+=L[r[1]][0]; la+=L[r[1]][1]; });
    rAlign(la+'/'+th, cols[j][0], y, WH); rAlign((th ? Math.round(100*la/th) : 0)+'%', cols[j][1], y, WH);
  });
  y+=24;
  var items=['ROUND '+M.round,'FIGHT TOTAL','CONTINUE'], tw=0, gap=22;
  items.forEach(function(t){ tw+=textW(t); });
  var x=Math.round(128-(tw+gap*2)/2);
  items.forEach(function(t, i){
    drawText(t, x, y, M.stSel===i ? WH : i===M.stView ? GR : '#6c6c74');
    if (M.stSel===i) menuGlove(x+textW(t)+4, y-4, 2);
    x+=textW(t)+gap;
  });
}
FONT['%'] = ['11001','11010','00010','00100','01000','01011','10011'].map(function(r){ return r.split('').map(Number); });
// (the user, 2026-11-08: 'have them start in their corner, blue or red' / 'you start in the blue corner'): player 1 =
// the BLUE corner (back left post), player 2 = the RED corner (front right post), diagonally opposite - each round starts there
function toCorners(){
  p1.x=RING.x1+4; p1.y=RING.y1+4; p1.face=1;
  p2.x=RING.x2-4; p2.y=RING.y2-4; p2.face=-1;
}
function poseOf(e){
  switch(e.state){
    case 'walk': return 'walk';
    case 'atk': return MOVES[e.move] ? MOVES[e.move].pose : 'idle';
    case 'block': return e.low ? 'blockLo' : 'block';
    case 'hurt': return e.hurtLo ? 'hurtb' : 'hurt';
    case 'down': return 'down';
    case 'getup': return 'getup';
    case 'win': return 'win';
    default: return 'idle';
  }
}
function checkClinch(){}
function neutral(e){ return e.state==='idle'||e.state==='walk'; }
function canHit(f){ return f.state==='idle'||f.state==='walk'||f.state==='block'||f.state==='atk'; }

function updateMatch(){
  var M=match; M.t++;
  updateCrowd(); updateCameraman();
  if (M.msgT>0) M.msgT--;
  if (M.phase==='entrance'){ updateRef(); updateEntrance(); clearPress(); return; }
  if (M.phase==='intro'){
    updateRef();
    if (M.t===90) sfx.bell();
    if (M.t===138) startMusic();
    if (M.t>140){ M.phase='fight'; M.msg='BOX!'; M.msgT=50; }
    clearPress(); mash=0; MASHC[1]=0; return;
  }
  if (M.phase==='end'){
    M.t2=(M.t2||0)+1; updateRef();
    if (M.winner){
      if (M.t2===44) stopMusic();
      if (M.t2===55||M.t2===78||M.t2===101) sfx.bell();
      if (M.t2===END_ROAR) sfx.roar();
      M.winner.state='win'; M.winner.anim++;
    }
    if (M.t2>200){ scene='winner'; T=0; if (M.winner) entMusicStart(M.winner.def.name); }
    return;
  }
  if (M.phase==='cards'){ updateCards(); clearPress(); return; }
  if (M.phase==='roundend'){ updateRoundEnd(); clearPress(); mash=0; MASHC[1]=0; return; }
  if (M.phase==='stats'){ updateStats(); clearPress(); mash=0; MASHC[1]=0; return; }
  if (M.phase==='rest'){                                   // between rounds
    M.rt++; updateRef(); updateFX();
    [p1,p2].forEach(function(e){ e.anim++; if (e.state==='getup'){ e.t++; if (e.t>22){ e.state='idle'; e.t=0; } } else e.state='idle'; });
    if (M.rt===120){
      M.round++; M.time=ROUND_SECS*60;
      toCorners();
      [p1,p2].forEach(function(e){ e.kdR=0; e.state='idle'; e.t=0; e.inv=0; e.aiBlockT=0;
        e.hpMax=Math.min(100, (e.hpMax||100)+REST_CEIL); e.hp=e.hpMax; e.hpTrail=e.hp;          // (the corner: refilled to the ceiling,
        e.staMax=Math.min(100, (e.staMax||100)+REST_CEIL); e.sta=e.staMax; e.rocked=0; e.rockImm=0; });   //  + a little of it back)
    }
    if (M.rt===195) sfx.bell();
    if (M.rt>=205){ M.phase='fight'; M.msg='BOX!'; M.msgT=50; }
    clearPress(); mash=0; MASHC[1]=0; return;
  }

  /* fight */
  updateFX();
  if (!M.kd) M.time -= 1/GAME_SPEED;                      // the clock stops during a count
  if (freeze>0){ freeze--; clearPress(); return; }
  updateRef();
  if (M.time<=0 && !M.kd && p1.state!=='hurt' && p2.state!=='hurt'){ roundOver(); clearPress(); return; }
  if (M.kd){ if (updateCount()){ clearPress(); return; } }
  useCtl(p1.ctl); updateEntity(p1); useCtl(p2.cpu ? 0 : p2.ctl); updateEntity(p2); useCtl(0);
  aiThink(p2);
  keepApart();
  clearPress();
}
function keepApart(){                                      // gloves touch, bodies don't overlap
  if (!nearY(p1,p2,8)) return;
  if (p1.state==='down' || p2.state==='down') return;
  var dx=p2.x-p1.x, d=Math.abs(dx); if (d>=12) return;
  var s = dx>=0 ? 1 : -1, push=(12-d)/2;
  p1.x -= s*push; p2.x += s*push; clamp(p1); clamp(p2);
}
// the judges (10-point must system): each judge sees the round's damage a little differently; the man who did more takes it
// 10-9 (a close round can go either way or 10-10), every knockdown suffered in the round costs that man a point
function scoreRound(){
  var M=match;
  for (var j=0;j<3;j++){
    var a=(p1.rPts||0)*(0.8+Math.random()*0.4), b=(p2.rPts||0)*(0.8+Math.random()*0.4);
    var s1=10, s2=10;
    if (Math.abs(a-b) >= 2){ if (a>b) s2=9; else s1=9; }                // (clean-punch points: 2 clear = his round)
    else if (a!==b && Math.random()<0.5){ if (a>b) s2=9; else s1=9; }
    s1 -= (p1.kdR||0); s2 -= (p2.kdR||0);
    M.cards[j][0] += Math.max(6,s1); M.cards[j][1] += Math.max(6,s2);
  }
  p1.rPts = p2.rPts = 0;
}
// (the user, 2026-11-09: 'after the round have the ref stand in the middle and raise a hand and it says ROUND OVER, both
// fighters return to their corner, then the stat screen, then it says ROUND 2'): ref + boxers walk, then the stat menu
var RE_HOLD = 90;                                 // steps the ref holds his hand up once everyone is in place
var STATS_AFTER = 45;                             // steps of ROUND OVER before the stats come up
function updateRoundEnd(){
  var M=match, R=ref; M.re++; updateFX();
  updateRoundEndWalk();
  if (M.re>=STATS_AFTER){ M.phase='stats'; M.stSel=0; M.stView=0; }
}
function updateRoundEndWalk(){
  var M=match, R=ref;
  var home=[[p1, RING.x1+4, RING.y1+4], [p2, RING.x2-4, RING.y2-4]], moving=false;
  home.forEach(function(v){
    var e=v[0], dx=v[1]-e.x, dy=v[2]-e.y; e.anim++;
    if (e.state==='getup'){ e.t++; if (e.t>22){ e.state='idle'; e.t=0; } moving=true; return; }
    e.t=0; e.inv=0;
    if (Math.abs(dx)>1 || Math.abs(dy)>1){
      e.x += Math.max(-1.2, Math.min(1.2, dx)); e.y += Math.max(-0.9, Math.min(0.9, dy));
      e.state='walk'; moving=true;
      if ((e.anim % 16)===0) sfx.step();
    } else { e.x=v[1]; e.y=v[2]; e.state='idle'; }
    e.face = foe(e).x>=e.x ? 1 : -1;                   // always facing the other man
  });
  var there=true;
  if (R){ R.mode='patrol'; R.pause=999; there=!refStep(128, RING_MODE==='lane' ? laneMid() : 92, 1); R.face=1; }
  if (there) M.reUp++;
  if (R) R.handUp = there;
  // (the user, 2026-11-10: 'when it shows the fight totals no black background overlay, and show the boxers walk back to
  // the corners during it'): the stats come up after a short ROUND OVER beat (updateRoundEnd), the walk carries on under them
}
function roundOver(){
  var M=match; sfx.bell(); scoreRound();
  M.phase='roundend'; M.re=0; M.reUp=0; M.msg=''; M.msgT=0;   // ROUND OVER, back to the corners, the stat list, then the next round / the scorecards
}
/* ---- THE SCORECARDS (the user: 'after 12 it goes to score cards ... both to their sides ... slowly shown before the winner'):
   the boxers go to either side of the ring, the ref stands between them, the three judges' cards are read out one at a
   time, then the decision and the winner */
var CARD_T = { title:70, c1:170, c2:270, c3:370, dec:480, win:580 };
function startCards(){
  var M=match, n1=0, n2=0;
  M.phase='cards'; M.ct=0; M.cardsShow=true; M.msg=''; M.msgT=0; stopMusic();
  for (var j=0;j<3;j++){ if (M.cards[j][0]>M.cards[j][1]) n1++; else if (M.cards[j][1]>M.cards[j][0]) n2++; }
  var even=3-n1-n2, w = n1>=2 ? p1 : n2>=2 ? p2 : null;
  M.cardWin = w;
  if (w){ var wn=Math.max(n1,n2), ln=Math.min(n1,n2); M.cardDec = wn===3 ? 'UNANIMOUS DECISION' : ln===1 ? 'SPLIT DECISION' : 'MAJORITY DECISION'; }
  else M.cardDec = even===3 ? 'UNANIMOUS DRAW' : even===2 ? 'MAJORITY DRAW' : 'SPLIT DRAW';
  [p1,p2].forEach(function(e){ e.state='idle'; e.t=0; e.inv=0; });
}
function updateCards(){
  var M=match; M.ct++;
  // the boxers walk to their sides, then face the middle
  [[p1, RING.x1+26], [p2, RING.x2-26]].forEach(function(v){
    var e=v[0], tx=v[1]; e.anim++;
    if (Math.abs(e.x-tx)>1){ e.face = tx>e.x?1:-1; e.x += e.face; e.state='walk'; }
    else { e.state='idle'; e.face = e===p1 ? 1 : -1; }
  });
  if (ref){ refStep(128, RING_MODE==='lane' ? laneMid() : 104, 1); ref.face = 1; ref.mode='patrol'; ref.pause=999; }
  var C=CARD_T;
  if (M.ct===C.title) sfx.bell();
  if (M.ct===C.c1 || M.ct===C.c2 || M.ct===C.c3) sfx.count(1);
  if (M.ct===C.dec) sfx.count(3);
  if (M.ct===C.win){
    endMatch(M.cardWin); M.endMsg = M.cardDec; M.cardsShow = true;
    if (M.cardWin){ sfx.roar(); if (sfx.cheer) sfx.cheer(0.3); }
  }
}
function endMatch(winner){
  match.phase='end'; match.winner=winner; match.t2=0; match.lock=null; match.pin=null; match.kd=null; match.roCount=0;
  if (!winner){ stopMusic(); }
  if (winner){ winner.state='win'; winner.t=0; }
}

function hit(e, f, dmg, mv){
  // (the user, 2026-11-08: 'you auto block the body when neutral, looking like the default stance, and the block button
  // covers the head'): standing / walking = the BODY is covered, the face is open; holding block = the FACE is covered
  var guardBody = (f.state==='idle' || f.state==='walk') && !(f.rocked>0);     // (rocked: his body guard is gone too)
  var blocked = f.face===-e.face && ((f.state==='block' && !mv.lo) || (guardBody && !!mv.lo));
  var power = mv===MOVES.cross || mv===MOVES.bodyR, broke=false;
  if (blocked){                                          // STAMINA: blocking costs wind; a power punch into an empty tank goes through
    f.sta = Math.max(0, (f.sta==null ? 100 : f.sta) - (power ? STA_BLOCK_PWR : STA_BLOCK));
    if (power && f.sta<=0){ blocked=false; broke=true; }
  }
  e.comboOK = false;
  // COUNTER (the user, 2026-11-10: 'change countering - I want this game to be fair'): only a READ counts - you have to
  // start your punch at least COUNTER_LEAD steps AFTER he started his, and land it before his comes out. Both throwing
  // at the same moment is just an exchange (no bonus). Same rule for the CPU.
  var counter = f.state==='atk' && !f.hitDone && f.t < MOVES[f.move].start && (f.atkAt||0) <= (e.atkAt||0) - COUNTER_LEAD;
  var cx=f.x - e.face*2, cy=f.y-40;
  if (blocked){
    // (the user: 'if they block it doesn't punch through'): a blocked punch does NO damage - the guard only covers the
    // face OR the body, so the other one is open to pick your shots
    f.x += e.face*(mv.push ? 4 : 2); clamp(f);
    // MAKE BLOCKING MATTER (the user, 2026-11-10 - in every recorded fight they held block 0% of the time): a blocked
    // punch leaves the puncher OPEN (his recovery runs BLOCK_OPEN longer - longer still after a power punch) and gives
    // the blocker a PUNISH window: land a punch inside it = BLOCK + COUNTER (bonus damage + a judges' point)
    e.recExtra = power ? BLOCK_OPEN_PWR : BLOCK_OPEN; if (power) e.flurryN = 99;   // (a blocked power shot ends his flurry)
    f.punishT = PUNISH_WIN;
    if (f.cpu && Math.random() < Math.max(styleOf(f).counter, ((BOX_AI[diff]||BOX_AI[0]).punish||0)*0.6)) f.aiCounter = 5;   // punches straight back
    sfx.step(); addSpark(cx,cy,4,'#a0a0c0',0.8); return;
  }
  if (e.cpu) dmg = dmg*((BOX_AI[diff]||BOX_AI[0]).dmg);         // harder CPU punches harder
  dmg = dmg*styleOf(e).dmg/styleOf(f).tough;
  dmg = dmg*(1 - 0.35*tiredOf(e));                       // a tired man's punches are weaker
  if (broke){ dmg = dmg*0.6; match.msg='GUARD BROKEN!'; match.msgT=40; }
  if (counter){ dmg = Math.round(dmg*1.5); match.msg='COUNTER!'; match.msgT=40; }
  var punished = e.punishT>0 && !counter; e.punishT = 0;
  if (punished){ dmg = dmg*PUNISH_DMG; match.msg='BLOCK + COUNTER!'; match.msgT=40; }
  // ---- 2. MOVING INTO PUNCHES COSTS: caught walking = more damage, caught stepping IN = more again
  if (f.state==='walk'){ var into = (f.vx||0)*(e.x-f.x) > 0.2; dmg = dmg*(into ? CAUGHT_IN : CAUGHT_MOVING); }
  statCount(e, e.move, 1);
  f.hp = Math.max(0, f.hp - dmg); f.hpMax = Math.max(HP_CEIL_MIN, (f.hpMax||100) - dmg*HP_PERM*(styleOf(e).permMul||1)*(styleOf(f).permRes||1)); f.hitT = 0; e.pts = (e.pts||0) + dmg; e.rPts = (e.rPts||0) + ((mv===MOVES.cross || mv===MOVES.bodyR) ? 2 : 1) + (punished ? 1 : 0); f.inv = 6;   // (judges: clean punches)
  f.face = -e.face;
  if (mv.lo){ f.bodyDmg = (f.bodyDmg||0) + dmg; f.sta = Math.max(0, (f.sta==null ? 100 : f.sta) - dmg*STA_BODY_HIT);   // BODY: takes his wind
    f.staMax = Math.max(STA_CEIL_MIN, (f.staMax||100) - dmg*STA_PERM); }                                            // ... and some of it for good
  if (!broke) e.comboOK = true;                          // a clean shot: the one-two is on
  if (f.hp<=0){                                           // down goes ...!
    shake=7; freeze=6; sfx.kick(); addSpark(cx,cy,14,'#ffffff',1.7);
    f.fallDelay=19;
    if (ATLAS[f.def.name] && ATLAS[f.def.name]['KNOCKB']){ f.knock='KNOCKB'; f.lie='LIEFLAT'; } else { f.knock=null; f.lie=null; }
    f.hurtLo=false; f.state='hurt'; f.t=0; f.willFall=true;   // (the KNOCKDOWN! banner shows once he lands)
    return;
  }
  var big = mv===MOVES.cross;
  shake=3; freeze = big ? 4 : 2; if (big) sfx.kick(); else sfx.hit();
  addSpark(cx,cy, big ? 10 : 6, '#fff0c0', big ? 1.4 : 1.0);
  if (mv.push){ f.x += e.face*mv.push; clamp(f); }
  f.hurtLo=!!mv.lo; f.state='hurt'; f.t=0; f.willFall=false; f.knock=null; f.stun=(mv.stun||9) + (counter ? 6 : 0);
  // ROCKED: a counter STRAIGHT always (a counter jab doesn't), a clean straight to the head sometimes (more on a hurt man)
  if (!mv.lo && !(f.rocked>0) && !(f.rockImm>0) && ((counter && big && Math.random() < (styleOf(f).rockRes||1)) || (big && Math.random() < ROCK_CHANCE*(f.hp<50 ? 1.6 : 1)*(styleOf(e).rockMul||1)*(styleOf(f).rockRes||1)))){
    f.rocked = ROCK_T; f.rockImm = ROCK_T + ROCK_IMMUNE; match.msg='ROCKED!'; match.msgT=45; addStars(f.x, f.y-50, 5);
  }
}
function knockDown(f){
  f.downPose=f.lie||null; f.lie=null; f.state='down'; f.t=0; f.inv=999;
  f.kdN=(f.kdN||0)+1; f.kdR=(f.kdR||0)+1;
  addStars(f.x,f.y-18,6); addDust(f.x,f.y,8);
  var K = { v:f, t:0, count:0, taps:0, need: 9 + 7*(Math.min(3,f.kdR)-1), tko: f.kdR>=TKO_KDS };
  if (f.cpu){                                              // the CPU: beats the count, or doesn't
    var stay=[0.04,0.3,0.6][Math.min(2,f.kdN-1)] * ((BOX_AI[diff]||BOX_AI[0]).stay) * styleOf(f).stay;
    K.cpuUp = Math.random()<stay ? 99 : 3 + Math.floor(Math.random()*4) + f.kdN;
  }
  match.kd = K; if (sfx.cheer) sfx.cheer(0.3);
  var a=foe(f); if (a.state==='atk' || a.state==='block'){ a.state='idle'; a.t=0; }
}
// the referee's count: returns true = the fighters don't act this step
function updateCount(){
  var K=match.kd, v=K.v; if (v.state!=='down') return false;   // still falling
  K.t++;
  var a=foe(v);
  // (the user: 'force the fighter to walk away'): the other man is sent to the NEUTRAL CORNER - he walks all the way to the
  // corner on his side, backs away facing the fallen man and waits there till the count is over
  if (a.state==='idle'||a.state==='walk'||a.state==='atk'||a.state==='hurt'){
    // (the user, 2026-11-08): a WHITE neutral corner (back right / front left) - the one furthest from the man down
    if (K.corner===undefined){
      var NC=[[RING.x2-4, RING.y1+4], [RING.x1+4, RING.y2-4]];
      var d0=Math.pow(NC[0][0]-v.x,2)+Math.pow(NC[0][1]-v.y,2), d1=Math.pow(NC[1][0]-v.x,2)+Math.pow(NC[1][1]-v.y,2);
      K.corner = d0>=d1 ? NC[0] : NC[1];
    }
    var tx=K.corner[0], ty=K.corner[1], ddx=tx-a.x, ddy=ty-a.y;
    a.face = v.x>=a.x ? 1 : -1;      // (the user: 'always facing the opponent - walk backwards facing them to the corner')
    if (Math.abs(ddx)>1.2 || Math.abs(ddy)>1.2){
      a.x += Math.max(-1.2, Math.min(1.2, ddx)); a.y += Math.max(-0.9, Math.min(0.9, ddy)); a.state='walk';
    }
    else { a.state='idle'; K.inCorner=true; }   // waits in the corner, eyes on the man down
    a.anim++; clamp(a);
  }
  // (the user) counted like the NES Pro Wrestling 20-count: first number 57 frames in, +1 every 60, the count blip, the
  // red number on the apron under the clock (game.js draws match.roCount there)
  // TKO (the user, 2026-11-10: 'when the ref waves off the fight he just counts, it looks like - fix that'): no count -
  // he gets over the man, the bell rings and he WAVES IT OFF (sprites/ref_waveoff.png: both arms up / down, fast)
  if (K.tko){
    if (K.t===WAVE_AT) sfx.bell();
    if (K.t>=WAVE_END){ endMatch(a); match.endMsg='TKO'; return true; }
    return true;
  }
  if (K.t>=57 && (K.t-57)%60===0){
    K.count++; match.roCount=K.count; sfx.count(1);
    if (K.tko && K.count>=3){ endMatch(a); match.endMsg='TKO'; return true; }
    if (K.count>=10){ endMatch(a); match.endMsg='KO'; return true; }
  }
  if (!K.tko){
    var human = !v.cpu;
    if (human){ useCtl(v.ctl); if (pAnyPunch()) K.taps++; useCtl(0); }
    var up = human ? (K.taps>=K.need && K.count>=2) : (K.count>=K.cpuUp && (K.t-57)%60===30);
    if (up){
      v.state='getup'; v.t=0; v.inv=40; v.downPose=null; v.hpMax=Math.max(HP_CEIL_MIN, (v.hpMax||100) - KD_CEIL*(styleOf(v).kdRes||1)); v.hp=Math.min(v.hpMax, Math.max(v.hp, KD_HP[Math.min(2,v.kdN-1)])); v.hpTrail=v.hp;
      match.kd=null; match.roCount=0; match.msg='BACK UP!'; match.msgT=50; if (sfx.cheer) sfx.cheer(0.12);
    }
  }
  return true;
}

function updateEntity(e){
  e.anim++;
  if (e.inv>0 && e.state!=='down') e.inv--;
  var f=foe(e);
  staTick(e);
  switch(e.state){
    case 'idle': case 'walk': case 'block': {
      if (match.kd){ if (e.state==='block') e.state='idle'; break; }
      e.face = f.x>=e.x ? 1 : -1;
      var mx=0,my=0, blk=false, low=false, mv=null;
      if (e.cpu){ mx=e.aiMoveX; my=e.aiMoveY; blk=e.aiBlockT>0 && !e.aiLow; low=false; mv=e.aiMove||null; e.aiMove=null; }   // (a body punch: its stance already covers it)
      else { if(kL())mx=-1; if(kR())mx=1; if(kU())my=-1; if(kD())my=1; blk=pBlock(); low=false;
        mv = pFaceR() ? 'cross' : pBodyR() ? 'bodyR' : pFaceL() ? 'jab' : pBodyL() ? 'bodyL' : null; }
      if (e.rocked>0) blk=false;                         // ROCKED: can't get the gloves up
      if (blk && !mv){ e.state='block'; e.low=low; break; }   // holding the face guard: can't move
      var sp=1.1*e.def.sp*(e.rocked>0 ? 0.5 : 1);
      // (the user, 2026-11-08: 'use the full ring and walk up and down - it makes more sense in a smaller ring'): back to
      // moving all over the ring (up/down a bit slower: the ring is shallow), punches still need you level (nearY 10)
      e.x+=mx*sp; e.y+=my*sp*0.75; clamp(e);
      e.state=(mx||my)?'walk':'idle';
      if (e.state==='walk' && (e.anim % 16)===0) sfx.step();
      if (mv){
        startPunch(e, mv, -1);
      }
      break;
    }
    case 'atk': {
      var M=MOVES[e.move]; e.t += punchRate(e);
      if (e.t>=M.start && e.t<=M.end && !e.hitDone){
        if (dist(e,f)<M.range && nearY(e,f,10) && sameSide(e,f) && f.inv<=0 && canHit(f)){ hit(e,f,M.dmg,M); e.hitDone=true; }
      }
      if (e.t>M.end && !e.hitDone && !e.missPaid){ e.missPaid=true; e.sta=Math.max(0, e.sta - STA_COST[e.move]*STA_MISS); }   // a miss: more wind
      if (comboTry(e, M)) break;
      if (cpuFlurry(e, M)) break;
      if (e.t>M.rec+(e.recExtra||0)){ e.state='idle'; e.t=0; e.recExtra=0; }
      break;
    }
    case 'hurt': e.t++;
      if (e.willFall){ if (e.t>(e.fallDelay||19)){ e.willFall=false; e.knock=null; knockDown(e); } }
      else if (e.t>(e.stun||9)){ e.state='idle'; e.t=0; e.inv=4; }
      break;
    case 'down': e.t++; break;                     // the count (updateCount) gets him up
    case 'getup': e.t++; if (e.t>22){ e.state='idle'; e.t=0; e.inv=30; } break;
    default: e.state='idle'; e.t=0; break;         // (anything left over from the wrestling code)
  }
}

/* ---- the CPU boxer ---- */
var BOX_AI = [   // (the user: 'difficulties easy, normal, hard - what it is right now is easy'): block chance vs your punches,
  // cross share, hesitation, think time, wrong-guard guess, CPU punch damage, how often he stays down on the count
  { block:0.3,  cross:0.35, hes:0.15, think:[18,22], wrong:0.25, dmg:1.0,  stay:1.0, combo:0.25, read:0.12, punish:0.2,  work:1.0, disc:0.3, flurry:0.05 },   // EASY   = the old default game
  { block:0.45, cross:0.42, hes:0.05, think:[11,14], wrong:0.14, dmg:1.15, stay:0.75, combo:0.4, read:0.28, punish:0.35, work:0.85, disc:0.6, flurry:0.2 },  // NORMAL
  { block:0.62, cross:0.5,  hes:0,    think:[6,9],   wrong:0.06, dmg:1.3,  stay:0.5,  combo:0.55, read:0.45, punish:0.5, work:0.7, disc:0.9, flurry:0.4 }    // HARD
];
// the 3 boxing difficulties replace the wrestling game's 4 (the rest of each entry is the wrestling table it is based on)
DIFFS = [
  Object.assign({}, DIFFS[1], { name:'EASY',   col:'#40e040', desc:'SLOW TO REACT - GUESSES THE WRONG GUARD' }),
  Object.assign({}, DIFFS[2], { name:'NORMAL', col:'#ffd020', desc:'QUICKER HANDS - BLOCKS MORE - HITS HARDER' }),
  Object.assign({}, DIFFS[3], { name:'HARD',   col:'#e02020', desc:'FAST - READS YOUR PUNCHES - HITS HARD' })
];
DIFF_GRAD.NORMAL = GOLD;
diff = 1; try { var _bd = localStorage.getItem('box_diff'); for (var _i=0;_i<DIFFS.length;_i++) if (DIFFS[_i].name===_bd) diff=_i; } catch(err){}
function saveDiff(){ try { localStorage.setItem('box_diff', DIFFS[diff].name); } catch(err){} }
var optRowB = 0;
function drawDiff(){                       // OPTIONS: the difficulty + the RING mode (UP / DOWN picks the row, LEFT / RIGHT changes it)
  menuBG(); menuHead('OPTIONS', 18);
  var rows=[['DIFFICULTY', DIFFS[diff].name, DIFFS[diff].desc], ['RING', RING_MODES[RING_MODE].name, RING_MODES[RING_MODE].desc]];
  rows.forEach(function(r, i){
    var sel=i===optRowB, y=46+i*66;
    fancyC(r[0], 128, y, 'bold', 1, MT_G, null, null);
    var tw=fancyC(r[1], 128, y+18, 'bold', 2, sel ? MT_W : MT_G, null, null);
    if (sel) menuGlove(128+tw/2+8, y+15, 3);
    fancyC(r[2], 128, y+40, 'reg', 1, sel ? MT_W : MT_G, null, null, W-16);
  });
}
function updateDiff(){
  if (pressed['ArrowUp']){ optRowB=(optRowB+1)%2; sfx.select(); }
  if (pressed['ArrowDown']){ optRowB=(optRowB+1)%2; sfx.select(); }
  var d = pressed['ArrowLeft'] ? -1 : pressed['ArrowRight'] ? 1 : 0;
  if (d){
    if (optRowB===0){ var n=DIFFS.length; diff=(diff+n+d)%n; }
    else { RING_MODE = RING_MODE==='lane' ? 'full' : 'lane'; saveRingMode(); applyRingMode(); }
    sfx.select();
  }
  if (pressed['Backspace'] || pStart()){ saveDiff(); sfx.select(); scene='title'; diffOpt=false; T=0; }
  pressed={};
}
function aiThink(e){
  if (!e.cpu || match.demo) return;
  var A=BOX_AI[diff]||BOX_AI[0], f=foe(e), ST=styleOf(e);
  if (e.aiBlockT>0) e.aiBlockT--;
  if (match.kd || !(e.state==='idle'||e.state==='walk'||e.state==='block')){ e.aiMoveX=e.aiMoveY=0; if (match.kd) e.aiCounter=0; return; }
  var dx=f.x-e.x, dy=f.y-e.y, ad=Math.abs(dx);
  var fvx = f.x - (f._aiX==null ? f.x : f._aiX); f._aiX = f.x;      // your step this tick
  var away = fvx*(dx>0?1:-1) > 0.3;                                   // you're backing off
  var toward = fvx*(dx>0?1:-1) < -0.3;                                // you're stepping in
  var fvy = f.y - (f._aiY==null ? f.y : f._aiY); f._aiY = f.y;
  var moving = Math.abs(fvx) > 0.3 || Math.abs(fvy) > 0.3;            // you're on the move
  if (e.aiCounter>0 && --e.aiCounter===0 && Math.abs(dy)<10){     // the counter punch, into the man who just threw
    var cm = Math.random()<0.6 ? 'jab' : 'cross';
    if (ad < MOVES[cm].range){ e.aiMove=cm; e.aiBlockT=0; e.aiMoveX=0; return; }
  }
  // sees your punch coming: covers up (one roll per punch)
  // (balance 3: the one-two's right starts part-way in, so 't<=2' never saw it - it could never be blocked)
  if (f.state==='atk' && f.t<=(f.t0==null ? -1 : f.t0)+3 && !f.aiSeen && ad<32 && Math.abs(dy)<12){
    f.aiSeen=true;
    var bp = A.block + ST.block + (e.hp<35 ? 0.15 : 0);
    if (Math.random()<bp){ var lo=!!MOVES[f.move].lo; if (Math.random()<A.wrong) lo=!lo;   // (it can guess the wrong guard)
      e.aiLow=lo; e.aiBlockT = (f.move==='cross'||f.move==='bodyR') ? 28 : 16; e.aiMoveX=e.aiMoveY=0; return; }
    // (playtest balance 2026-11-10: the CPU kept throwing INTO your punches and getting beaten to it): no guard up ->
    // a slow punch (straight / body straight) can be READ - a quick jab inside it (a real counter); otherwise it holds
    // its punches until yours is over instead of walking into it
    var slow = f.move==='cross' || f.move==='bodyR';
    // (test 4: his read jab went off 1-3 steps after your punch started - too soon to count as a COUNTER, so a counter
    // puncher never landed one): he now waits for the beat - jabs once your punch is COUNTER_LEAD in (still lands first)
    if (slow && ad < MOVES.jab.range && Math.random() < (A.read||0)){ e.aiRead = true; e.aiMoveX=0; return; }
    e.aiHold = Math.max(0, MOVES[f.move].end - f.t + 2);
  }
  // you threw and MISSED: he punishes the opening with a straight
  if (f.state==='atk' && !f.hitDone && f.t > MOVES[f.move].end && !f.aiPun){
    f.aiPun = true;
    if (ad < MOVES.cross.range && Math.abs(dy)<10 && Math.random() < (A.punish||0)){ e.aiMove='cross'; e.aiMoveX=0; e.aiHold=0; return; }
  }
  if (e.aiRead){                                             // the read: jab on the beat, inside the straight
    if (f.state!=='atk' || f.t >= MOVES[f.move].start-1) e.aiRead = false;
    else if (f.t - (f.t0==null ? -1 : f.t0) >= COUNTER_LEAD+1){ e.aiRead=false; e.aiMove='jab'; e.aiMoveX=0; e.aiHold=0; return; }
    else { e.aiMoveX=0; return; }
  }
  if (f.state!=='atk'){ f.aiSeen=false; f.aiPun=false; }
  if (e.aiHold>0){ e.aiHold--; if (e.aiHold>0) return; }
  if (e.aiBlockT>0){ e.aiMoveX=e.aiMoveY=0; return; }
  if (--e.ai>0) return;
  e.ai = Math.round((A.think[0] + Math.floor(Math.random()*A.think[1]))*ST.think);
  if (ad < 30) e.ai = Math.max(3, Math.round(e.ai*(A.work||1)));   // in range: busier (the better ones throw more)
  if (f.rocked>0) e.ai = Math.min(e.ai, 4);              // a rocked man: goes after him
  var want = 18 + (Math.random()<0.3 ? 8 : 0);           // the range it likes to fight at
  e.aiMoveY = Math.abs(dy)>3 ? (dy>0?1:-1) : 0;
  if (ad>want+3) e.aiMoveX = dx>0?1:-1;
  else if (ad<12) e.aiMoveX = dx>0?-1:1;                 // too close: step back
  else e.aiMoveX = (Math.random()<0.2) ? (dx>0?-1:1) : 0; // now and then a step out
  if (tiredOf(e) > 0.4 && !(f.rocked>0) && Math.random()<0.6){ e.aiMoveX = dx>0?-1:1; return; }   // gassed: backs off to get his wind
  var disc = A.disc==null ? 0.5 : A.disc;                       // DISCIPLINE: how well he picks his moments
  // saves his wind: low on stamina he boxes, not swings (unless you're hurt)
  if (e.sta < 28 && f.state!=='hurt' && !(f.rocked>0) && Math.random() < disc){ e.aiMoveX = (ad<22) ? (dx>0?-1:1) : 0; return; }
  // TIMING (Razor Robbins test 3: 22 of his 34 misses came while the user was moving - his straight takes too long to
  // reach a moving man): you step IN -> a disciplined man throws early so it lands as you arrive (a straight from
  // further out, a jab up close)
  if (toward && ad > 14 && ad < MOVES.cross.range+8 && Math.abs(dy) < 8 && !e.aiTimed && Math.random() < disc*0.8){
    e.aiTimed = 20; e.aiMove = ad > 20 ? 'cross' : 'jab'; e.aiMoveX = 0; return;
  }
  if (e.aiTimed>0) e.aiTimed--;
  // you're backing off: he walks you down instead of swinging at air
  if (away && ad > 16 && Math.random() < disc){ e.aiMoveX = dx>0?1:-1; e.ai = Math.min(e.ai, 6); return; }
  if (ad<26 && Math.abs(dy) < 10-4*disc){
    if (Math.random()<A.hes && !(f.rocked>0)) return;
    var power = (f.state==='hurt' && Math.random()<0.5) || (f.rocked>0 && Math.random()<0.6) || Math.random()<A.cross+ST.cross;
    var body = Math.random()<0.4;
    if (f.state==='block') body = true;                                // face covered: go to the body
    else if (f.state==='idle' || f.state==='walk') body = Math.random()<0.2;   // body covered: mostly to the face
    else if (f.state==='hurt') body = !!f.hurtLo ? Math.random()<0.5 : Math.random()<0.3;
    var m = power ? (body ? 'bodyR' : 'cross') : (body ? 'bodyL' : 'jab');
    // RANGE: a disciplined man only throws what will reach - a few px inside his reach (more if you're moving away);
    // a straight that won't reach becomes a jab, otherwise he steps in
    var margin = disc*(away ? 10 : 5);
    if (moving && (m==='cross'||m==='bodyR') && f.state!=='hurt' && !(f.rocked>0) && Math.random() < disc) m = (m==='cross') ? 'jab' : 'bodyL';   // a moving target: the quick hand
    if (ad > MOVES[m].range - margin && (m==='cross'||m==='bodyR')) m = (m==='cross') ? 'jab' : 'bodyL';
    if (ad < MOVES[m].range - margin){ e.aiMove=m; e.aiMoveX=0; }
    else { e.aiMoveX = dx>0?1:-1; e.ai = Math.min(e.ai, 5); }
  }
}

/* ---- the referee: stands over a downed man and counts, otherwise patrols as before */
function updateRef(){
  var K=match && match.kd, R=ref;
  if (R && K && K.v.state==='down'){
    R.t++; R.mode='patrol';
    var side = K.v.x < 128 ? 1 : -1, gx = Math.round(Math.max(RING.x1+8, Math.min(RING.x2-8, K.v.x + side*26))), gy = RING_MODE==='lane' ? REF_BACK_Y+2 : Math.round(Math.max(RING.y1+6, K.v.y-4));   // (lane: he counts from behind)
    R.kdAt = !refStep(gx, gy, 2); R.face = K.v.x>=R.x ? 1 : -1; R.fleeing=false;
    return;
  }
  if (R) R.kdAt = false;
  updateRef_W();
}
// the ref COUNTING (the user: 'the motion the ref makes with his hand counting each one'): standing over the man on the
// mat, his arm comes DOWN on every number and goes back UP for the next (tools/build_ref_count.py: [UP | DOWN] per ref)
// (the user: 'this is how he counts - look at the exact way it's done'): replaced by the REAL NES ref's ring-out count,
// captured frame by frame from the ROM (tools/captures/ro8_ref_count.lua): FIST UP beside his head (mouth open) for 30
// frames, then hands-on-hips stance for 30 - the number lands as the fist comes down. sprites/refcount_nes.png = [UP | STANCE]
var REF_CLASSIC = 0; for (var _rc=0;_rc<REFS.length;_rc++) if (REFS[_rc].name==='CLASSIC REF') REF_CLASSIC=_rc;
var REFCNT_NES = load('sprites/refcount_nes.png?v=1');
var REF_WAVE = load('sprites/ref_waveoff.png?v=1'), WAVE_AT = 40, WAVE_END = 150;
function drawRef(){
  var R=ref, K=match && match.kd;
  if (R && K && K.tko && K.t>=WAVE_AT && imgOk(REF_WAVE)){
    var wx=Math.round(R.x), wy=Math.round(R.y), ws=SHADOW_G||g;
    ws.fillStyle='rgba(0,0,30,0.28)'; ws.beginPath(); ws.ellipse(wx, wy, 8, 2, 0, 0, 6.2832); ws.fill();
    g.save(); g.translate(wx,wy); if (R.face<0) g.scale(-1,1);
    g.drawImage(REF_WAVE, ((T>>3)&1) ? 0 : 16, 0, 16, 48, -8, -48, 16, 48);
    g.restore(); return;
  }
  if (R && R.handUp && match && match.phase==='roundend' && imgOk(REFCNT_NES)){
    var hx=Math.round(R.x), hy=Math.round(R.y), hs=SHADOW_G||g;
    hs.fillStyle='rgba(0,0,30,0.28)'; hs.beginPath(); hs.ellipse(hx, hy, 8, 2, 0, 0, 6.2832); hs.fill();
    g.save(); g.translate(hx,hy); if (R.face<0) g.scale(-1,1);
    g.drawImage(REFCNT_NES, 0, 0, 16, 48, -8, -48, 16, 48);
    g.restore(); return;
  }
  if (R && K && R.kdAt && K.v.state==='down'){
    var im=REFCNT_NES;
    if (imgOk(im)){
      var up = (((K.t-57)%60)+60)%60 >= 30;                  // up the 30 frames before each number, stance the 30 after
      var x=Math.round(R.x), y=Math.round(R.y);
      var sg=SHADOW_G||g; sg.fillStyle='rgba(0,0,30,0.28)'; sg.beginPath(); sg.ellipse(x, y, 8, 2, 0, 0, 6.2832); sg.fill();
      g.save(); g.translate(x,y); if (R.face<0) g.scale(-1,1);
      g.drawImage(im, up ? 0 : 16, 0, 16, 48, -8, -48, 16, 48);
      g.restore(); return;
    }
  }
  drawRef_W();
}

/* ---- HUD: round, knockdowns, the count */
function drawHUD(){
  // (the user, 2026-11-09: 'enhance the overall graphics' -> a boxing-style top bar): one dark plate across the top, a
  // corner-coloured edge under each half, long framed health bars (the white chunk = the damage just taken), knockdown
  // dots under each name's bar, and the ROUND + CLOCK box in the middle (the clock is off the apron now)
  var M=match; if (!M) return;
  g.save(); g.translate(Math.round(camX),-Math.round(camY));
  g.fillStyle='rgba(4,6,14,0.88)'; g.fillRect(-VX,0,VW,25);
  g.fillStyle='#2050c8'; g.fillRect(-VX,25,VX+128,1);   // (the user: player 1 / left = BLUE, right = RED)
  g.fillStyle='#b82020'; g.fillRect(128,25,VW-VX-128,1);
  var BW=92, n1=p1.def.name, n2=p2.def.name;
  drawTextFit(n1, 8+Math.min(BW,textW(n1))/2, 3, '#ffffff', BW);          // (drawTextFit centres)
  drawTextFit(n2, W-8-Math.min(BW,textW(n2))/2, 3, '#ffffff', BW);
  var keep=HPB.w; HPB.w=BW;
  energyBar(8,13,p1,false,'#3070f0');
  energyBar(W-8-BW,13,p2,true,'#e83030');
  HPB.w=keep;
  deadZone(8,13,BW,HPB.h,false,p1.hpMax); deadZone(W-8-BW,13,BW,HPB.h,true,p2.hpMax);
  staBar(8,21,p1,false,BW); staBar(W-8-BW,21,p2,true,BW);
  function pips(e, x0, dir){
    for (var i=0;i<(e.kdN||0);i++){ var x=x0+dir*i*7; g.fillStyle='#000'; g.fillRect(x,2,6,7); g.fillStyle='#ff3030'; g.fillRect(x+1,3,4,5); g.fillStyle='#ff9090'; g.fillRect(x+1,3,4,1); }
  }
  pips(p1, 8+Math.min(BW,textW(n1))+4, 1); pips(p2, W-8-Math.min(BW,textW(n2))-10, -1);
  if (!M.demo){
    var bx=106, bw=44;
    g.fillStyle='#000'; g.fillRect(bx-1,0,bw+2,25);
    g.fillStyle='#c8a040'; g.fillRect(bx,0,bw,1); g.fillRect(bx,23,bw,1); g.fillRect(bx,0,1,24); g.fillRect(bx+bw-1,0,1,24);
    g.fillStyle='#14161e'; g.fillRect(bx+1,1,bw-2,22);
    drawTextC('ROUND '+(M.round||1), 128, 3, '#ffd020');
    var sec=Math.max(0,Math.ceil(M.time/60)), mm=Math.floor(sec/60), ss=sec%60, ts=mm+':'+(ss<10?'0':'')+ss;
    drawClock(ts, 128, 13, (sec<=10 && M.phase==='fight' && (T>>3)&1) ? '#ff5050' : '#ffffff');
  }
  g.restore();
}
var _drawMatchW = drawMatch;
drawMatch = function(){
  _drawMatchW();
  var M=match; if (!M) return;
  if (M.cardsShow && (M.phase==='cards' || M.phase==='end')){ drawCards(); return; }
  if (M.phase==='stats'){ drawStats(); return; }
  if (M.phase==='roundend') fancyC('ROUND OVER', 128, 180, 'reg', 2, ['#ffffff'], null, null);
  if ((M.phase==='rest' && M.rt>=120) || (M.phase==='intro' && M.t>=60)) fancyC('ROUND '+M.round, 128, 180, 'reg', 2, ['#ffffff'], null, null);
  if (!M.kd || M.phase!=='fight') return;
  var K=M.kd;
  // KNOCKDOWN! - a big flashing banner as he hits the mat, then 'TO THE NEUTRAL CORNER!' while the other man is sent away
  if (K.t<80){
    // (the user: 'the word knockdown looks too good quality for this game, make it look 8 bit'): one flat colour, flashing
    var cols = (T>>2)&1 ? ['#ffffff'] : ['#e02424'];
    fancyC('KNOCKDOWN!', 128, 180, 'reg', 2, cols, null, null);   // (on the floor under the ring: the ropes made it unreadable)
  } else if (!K.inCorner && !K.tko){ drawTextC('TO THE NEUTRAL CORNER!', 128, 184, (T>>3)&1 ? '#ffffff' : '#ffd020'); }
  // THE COUNT (the user, 2026-11-10: 'when a boxer is down SHOW the number count'): big, under the top bar, each new
  // number flashes in as the ref's fist comes down
  if (K.count>0 && !K.tko){ var since=(K.t-57)%60, cc = since<8 ? ['#ffd020'] : ['#ffffff'];
    fancyC(String(K.count), 128, 36, 'bold', 4, cc, '#000', null); }
  if (K.tko){ drawTextC('THE REF IS WAVING IT OFF', 128, 96, '#ff6060'); return; }
  if (!K.v.cpu && K.v.state==='down'){
    var pct=Math.min(1, K.taps/K.need);
    drawTextC('MASH X / A TO GET UP!', 128, 96, (T>>3)&1 ? '#ffd020' : '#ffffff');
    g.fillStyle='#000'; g.fillRect(88,106,80,6); g.fillStyle='#40e040'; g.fillRect(89,107,Math.round(78*pct),4);
  }
};
// the three judges' cards, read out one at a time (each slides down from the top), then the decision + the winner
function drawCards(){
  var M=match, t=M.phase==='cards' ? M.ct : 99999, C=CARD_T;
  var n1=p1.def.name.split(' ').pop(), n2=p2.def.name.split(' ').pop();
  if (t>=C.title){
    g.fillStyle='rgba(0,0,0,0.75)'; g.fillRect(20,24,216,13);
    drawTextC(t<C.c1 ? 'LADIES AND GENTLEMEN...' : 'THE JUDGES SCORECARDS', 128, 27, '#ffd020');
  }
  var at=[C.c1,C.c2,C.c3], cx=[52,128,204];
  for (var j=0;j<3;j++){
    if (t<at[j]) continue;
    var k=Math.min(1,(t-at[j])/18), y=Math.round(184 + (1-k)*(1-k)*60);   // on the floor below the ring, rising into place
    var a=M.cards[j][0], b=M.cards[j][1], hi=Math.max(a,b), lo=Math.min(a,b);
    var who = a>b ? n1 : b>a ? n2 : 'EVEN', col = a>b ? '#d02020' : b>a ? '#2050d0' : '#404040';
    var x0=cx[j]-36;
    g.fillStyle='#1a1a1a'; g.fillRect(x0-1,y-1,74,44);
    g.fillStyle='#f4ecd8'; g.fillRect(x0,y,72,42);
    g.fillStyle=col; g.fillRect(x0,y,72,9);
    drawTextC('JUDGE '+'ABC'[j], cx[j], y+1, '#ffffff');
    drawTextC(hi+'-'+lo, cx[j], y+15, '#202020');
    drawTextC(who, cx[j], y+29, col);
  }
  if (t>=C.dec){
    g.fillStyle='rgba(0,0,0,0.85)'; g.fillRect(14,150,228,32);                   // over the apron: the ring stays clear
    drawTextC(M.cardWin ? 'THE WINNER BY' : 'THIS FIGHT IS A', 128, 152, '#ffffff');
    drawTextC(M.cardDec, 128, 162, '#ffd020');
  }
  if (t>=C.win && M.cardWin){
    var wc = M.cardWin===p1 ? ['#4a80f0'] : ['#e02424'];
    fancyC(M.cardWin.def.name, 128, 172, 'bold', 1, wc, null, null, 220);
  }
}


/* ---- CREATE A BOXER (the user: 'create a boxer - skin tone, hair colour, head model etc' / 'no select - you just create
   a boxer and then face the computer' / 'each RUN is your new boxer'): NEW BOXER on the main menu opens this screen with a
   fresh random boxer, FIGHT! puts him in the ring against a CPU boxer (Doug Smith, Benny The Bell or Jean Claude). Nothing is kept: the
   next run is a new boxer. tools/build_caw.py makes one base sheet per HEAD (the user-painted heads of Nick / Lokombo /
   Adonis / Todd / Shawn on the boxer body) + a material map (R: 40 skin, 80 hair, 120 trunks, 160 boots, 200 waistband)
   + a white-boots copy; here each material is re-tinted to the picks (shading kept: each pixel's brightness relative to
   the reference colour). */
// (the user: 'new faces that look like generic people, not wrestlers'): tools/build_generic_heads.py, all on one body
var CAW_HEADS = []; for (var _gi=1;_gi<=16;_gi++) CAW_HEADS.push({ key:'g'+_gi, skin:[226,160,118], hair:[92,56,28] });   // Star (HAIR = the mask), Cremator
var CAW_REF_TR = [200,40,40], CAW_REF_BT = [232,232,238], CAW_REF_BAND = [245,245,245];
var CAW_SKIN = [[255,222,200],[250,210,186],[242,184,162],[226,160,118],[206,140,96],[176,112,72],[140,84,50],[100,56,32],[234,190,140],[190,128,84],[120,70,42],[76,42,26]];
var CAW_HAIR = [['BLACK',[30,26,26]],['DARK BROWN',[60,36,20]],['BROWN',[92,56,28]],['AUBURN',[150,66,32]],['GINGER',[196,96,40]],['BLOND',[216,176,90]],
  ['PLATINUM',[240,228,180]],['GREY',[150,150,156]],['WHITE',[228,228,232]],['BLUE',[50,80,200]],['GREEN',[50,150,60]],['PINK',[230,90,170]],['RED',[190,36,36]],['PURPLE',[120,60,190]],['TEAL',[30,150,150]],['SILVER',[190,190,200]]];
var CAW_TRUNKS = [['RED',[200,40,40]],['MAROON',[120,20,30]],['ORANGE',[230,110,30]],['GOLD',[214,168,40]],['GREEN',[40,160,60]],['TEAL',[30,150,150]],
  ['BLUE',[44,90,230]],['NAVY',[26,36,110]],['PURPLE',[120,50,180]],['PINK',[230,90,170]],['SILVER',[170,170,180]],['BLACK',[52,52,60]],['WHITE',[232,232,236]],['CRIMSON',[160,20,50]],['BROWN',[110,70,36]],['TAN',[200,160,110]],['LIME',[130,210,50]],['SKY',[90,170,240]],['MAGENTA',[200,40,150]],['VIOLET',[170,120,230]],['CREAM',[240,226,180]]];
var CAW_BAND = [['WHITE',[245,245,245]],['GOLD',[240,196,50]],['BLACK',[40,40,46]],['RED',[210,40,40]],['BLUE',[50,90,230]],['GREEN',[40,170,70]],['SILVER',[180,180,190]],['PINK',[236,100,180]],['ORANGE',[236,120,30]],['PURPLE',[130,60,200]],['TEAL',[30,160,160]],['NAVY',[30,40,120]],['MAROON',[130,24,36]],['SKY',[100,180,245]]];
var CAW_BOOTS = [['BLACK',null],['WHITE',[232,232,238]],['RED',[200,36,36]],['BLUE',[44,80,210]],['GOLD',[214,168,40]],['GREEN',[40,150,60]],['PINK',[230,90,170]],['SILVER',[170,170,180]],['MAROON',[120,24,34]],['ORANGE',[230,110,30]],['PURPLE',[120,50,180]],['NAVY',[26,36,110]],['TEAL',[30,150,150]],['BROWN',[110,70,36]],['SKY',[90,170,240]]];
var CAW_GLOVES = [['RED',[220,34,34]],['BLACK',[44,44,50]],['WHITE',[236,236,236]],['GOLD',[226,176,40]],['GREEN',[40,160,60]],['PINK',[232,90,170]],['PURPLE',[124,54,190]],['BLUE',[40,86,220]],['MAROON',[130,24,36]],['ORANGE',[236,120,30]],['NAVY',[26,36,110]],['TEAL',[30,150,150]],['SILVER',[176,176,186]],['BROWN',[110,70,36]],['SKY',[90,170,240]]];
var CAW_IMG = CAW_HEADS.map(function(h){ return { base:load('sprites/caw_'+h.key+'.png?v=12'), mat:load('sprites/caw_'+h.key+'_mat.png?v=12'), bw:load('sprites/caw_'+h.key+'_bw.png?v=12') }; });
var CAW_DATA = {};
var CAW = { name:'ROOKIE', head:0, skin:2, hair:2, trunks:0, band:0, boots:0, gloves:0 }, CAW_B = null;
function cawReady(h){ var I=CAW_IMG[h]; return imgOk(I.base) && imgOk(I.mat) && imgOk(I.bw); }
function cawPix(im){ var c=document.createElement('canvas'); c.width=im.naturalWidth; c.height=im.naturalHeight; var x=c.getContext('2d'); x.drawImage(im,0,0); return x.getImageData(0,0,c.width,c.height); }
function cawLum(r,g2,b){ return 0.3*r+0.59*g2+0.11*b; }
function cawTint(d, i, r, g2, b, ref, t){       // keep the shade: brightness relative to the reference colour
  var L0=cawLum(ref[0],ref[1],ref[2]), f=cawLum(r,g2,b)/Math.max(1,L0);
  if (f<=1){ d[i]=t[0]*f; d[i+1]=t[1]*f; d[i+2]=t[2]*f; return; }
  var k=Math.min(1,(f-1)*L0/Math.max(1,255-L0));
  d[i]=t[0]+(255-t[0])*k; d[i+1]=t[1]+(255-t[1])*k; d[i+2]=t[2]+(255-t[2])*k;
}
// (the user's painted boot: red (200,36,36) -> a centre of pure (255,0,0)): the picked colour at full strength
function cawBootHi(t){
  var a=Math.max(t[0],t[1],t[2]), b=Math.min(t[0],t[1],t[2]);
  if (a-b<12) return [Math.min(255,a+45),Math.min(255,a+45),Math.min(255,a+45)];     // white, silver
  var top=Math.min(255,a*1.275);                                                    // (a little brighter than the boot: 200 -> 255, a dark colour stays dark)
  return t.map(function(v){ return Math.round((v-b)*top/(a-b)); });
}
function cawSheet(cfg, trunkIdx){
  var h=cfg.head, H=CAW_HEADS[h], I=CAW_IMG[h];
  if (!CAW_DATA[h]) CAW_DATA[h] = { base:cawPix(I.base), mat:cawPix(I.mat).data, bw:cawPix(I.bw).data };
  var D=CAW_DATA[h], W2=D.base.width, H2=D.base.height;
  var c=document.createElement('canvas'); c.width=W2; c.height=H2; var x=c.getContext('2d');
  var out=x.createImageData(W2,H2), d=out.data, s=D.base.data, m=D.mat, bw=D.bw;
  d.set(s);
  var sk=CAW_SKIN[cfg.skin], hr=CAW_HAIR[cfg.hair][1], tr=CAW_TRUNKS[trunkIdx][1], bd=CAW_BAND[cfg.band][1], bt=CAW_BOOTS[cfg.boots][1];
  for (var i=0;i<d.length;i+=4){
    var mm=m[i]; if (!mm) continue;
    if (mm===170){ if (bt){ var hb=cawBootHi(bt); d[i]=hb[0]; d[i+1]=hb[1]; d[i+2]=hb[2]; d[i+3]=255; } continue; }   // the boot's bright centre
    if (mm===160){ if (bt && bw[i+3]){ d[i+3]=bw[i+3]; cawTint(d,i,bw[i],bw[i+1],bw[i+2],CAW_REF_BT,bt); } continue; }
    if (!s[i+3]) continue;
    if (mm===40) cawTint(d,i,s[i],s[i+1],s[i+2],H.skin,sk);
    else if (mm===80) cawTint(d,i,s[i],s[i+1],s[i+2],H.hair,hr);
    else if (mm===120) cawTint(d,i,s[i],s[i+1],s[i+2],CAW_REF_TR,tr);
    else if (mm===200) cawTint(d,i,s[i],s[i+1],s[i+2],CAW_REF_BAND,bd);
  }
  x.putImageData(out,0,0);
  c.complete=true; c.naturalWidth=W2; c.naturalHeight=H2;   // (so imgOk() takes it like a loaded image)
  return c;
}
// his own glove colour: a front + back palette from one colour (the same shading steps as the red pair)
function cawHex(c, f){ return 'rgb('+c.map(function(v){ return Math.round(Math.min(255, f>1 ? v+(255-v)*(f-1) : v*f)); }).join(',')+')'; }
function cawGlovePal(){ var c=CAW_GLOVES[CAW.gloves][1];
  GLOVE_COL.cfront={O:cawHex(c,0.18),H:cawHex(c,1.5),F:cawHex(c,1),D:cawHex(c,0.68),W:'#f2f2f2'};
  GLOVE_COL.cback={O:cawHex(c,0.08),H:cawHex(c,0.75),F:cawHex(c,0.6),D:cawHex(c,0.38),W:'#a0a0a0'}; }
function cawPortrait(sheet){                    // 86x64 like the others: the front guard pose (1.4) x3 + gloves up
  var r=ATLAS_DATA['BASE'].frames['1.4'], c=document.createElement('canvas'); c.width=86; c.height=64;
  var x=c.getContext('2d'); x.imageSmoothingEnabled=false;
  var ox=Math.floor((86-r[2]*3)/2);
  x.drawImage(sheet, r[0], r[1], r[2], 22, ox, 0, r[2]*3, 66);
  var C=GLOVE_COL.cfront;
  [1,12].forEach(function(gx){ var cx=ox+gx*3+1, cy=45;
    for (var rr=0;rr<7;rr++) for (var cc=0;cc<7;cc++){ var ch=GLOVE_PX[rr][cc]; if (ch==='.') continue; x.fillStyle=C[ch]; x.fillRect(cx-10+cc*3, cy-10+rr*3, 3, 3); } });
  c.complete=true; c.naturalWidth=86; c.naturalHeight=64;
  return c;
}
function cawName(){                              // never the same name as another boxer
  var n=(CAW.name||'').trim()||'ROOKIE';
  for (var i=0;i<BOXERS.length;i++) if (BOXERS[i]!==CAW_B && BOXERS[i].name===n) n+=' II';
  return n;
}
function cawUnregister(nm){
  [nm, nm+'#ALT'].forEach(function(k){ delete ATLAS_DATA[k]; delete ATLAS[k]; delete SHEET[k]; delete READY[k]; delete SEQ[k]; });
  delete PORTRAIT[nm]; delete FACE[nm]; delete ALT_SHEET[nm];
}
function cawRegister(){                          // (re)build the sheets for the current picks
  if (!cawReady(CAW.head)) return false;
  var old=CAW_B && CAW_B.name, nm=cawName();
  if (old) cawUnregister(old);
  if (!CAW_B) CAW_B = { name:nm, key:'caw', nation:'', ht:'', wt:'', pw:4, sp:1.0, base:'BASE', spec:'' };
  CAW_B.name = nm;
  cawGlovePal();
  var main=cawSheet(CAW, CAW.trunks), alt=cawSheet(CAW, (CAW.trunks+1)%CAW_TRUNKS.length);
  [['',main],['#ALT',alt]].forEach(function(v){
    var k=nm+v[0];
    ATLAS_DATA[k] = { sheet:'caw', frames:Object.assign({}, ATLAS_DATA['BASE'].frames, BODY_FRAMES) }; ATLAS[k]=ATLAS_DATA[k].frames;
    SHEET[k]=v[1]; READY[k]=true; SEQ[k]=Object.assign({}, SEQ[BOXERS[0].name]);
  });
  PORTRAIT[nm]=cawPortrait(main); FACE[nm]=[43,16]; ALT_SHEET[nm]='caw';
  ENT_THEMES[nm]=ENT_THEMES['DOUG SMITH'];
  if (BOXERS.indexOf(CAW_B)<0) BOXERS.push(CAW_B);
  CAW_OUT=[nm];                                  // (not on the 2 PLAYERS select screen)
  return true;
}
function cawIsMine(name){ return !!(CAW_B && name && name.split('#')[0]===CAW_B.name); }
function cawRandom(){
  function r(n){ return Math.floor(Math.random()*n); }
  CAW.head=r(CAW_HEADS.length); CAW.skin=r(CAW_SKIN.length); CAW.hair=r(9);   // (random hair: the natural colours)
  CAW.trunks=r(CAW_TRUNKS.length); CAW.band=r(CAW_BAND.length); CAW.boots=r(CAW_BOOTS.length); CAW.gloves=r(CAW_GLOVES.length);
}

var cawOpen=false, cawRow=0, cawEdit=false, cawCur=0, cawDirty=true, cawTyped=[];
var CAW_ROWS=['NAME','HEAD','SKIN','HAIR','TRUNKS','WAISTBAND','BOOTS','GLOVES','RANDOM','FIGHT!'];
var CAW_OPT={HEAD:['head',CAW_HEADS],SKIN:['skin',CAW_SKIN],HAIR:['hair',CAW_HAIR],TRUNKS:['trunks',CAW_TRUNKS],WAISTBAND:['band',CAW_BAND],BOOTS:['boots',CAW_BOOTS],GLOVES:['gloves',CAW_GLOVES]};
var CAW_CH=' ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.-';
function openCaw(){ cawRandom(); CAW.name='ROOKIE'; cawOpen=true; cawRow=0; cawEdit=false; cawDirty=true; T=0; }   // each run: a new boxer
addEventListener('keydown', function(e){ if (cawOpen && cawEdit && e.key.length===1) cawTyped.push(e.key); });
function cawFight(){                             // you vs a CPU boxer
  if (!cawRegister()) return;
  var me=BOXERS.indexOf(CAW_B);
  cawOpen=false; selMode='EXHIBITION'; selIdx=me;
  LADDER={ me:me, i:0, won:0 }; scene='tour'; T=0; pressed={};
}
function updateCaw(){
  if (cawEdit){                                  // typing the name (keyboard) / up-down letters (pad)
    var nm=CAW.name.split('');
    while (cawTyped.length){                     // real key presses only (the pad's buttons arrive as letters too)
      var k=cawTyped.shift();
      if (/[a-zA-Z0-9 .\-]/.test(k) && nm.length<12){
        if (k==='m'||k==='M') toggleMusic();      // (M is the mute key: put the music back)
        nm.splice(cawCur,0,k.toUpperCase()); cawCur++;
      }
    }
    if (pressed['Backspace'] && cawCur>0){ nm.splice(cawCur-1,1); cawCur--; }
    if (pressed['Delete']) nm.splice(cawCur,1);
    if (pressed['ArrowLeft']) cawCur=Math.max(0,cawCur-1);
    if (pressed['ArrowRight']) cawCur=Math.min(Math.min(11,nm.length),cawCur+1);
    if (pressed['ArrowUp']||pressed['ArrowDown']){
      var ci=CAW_CH.indexOf(nm[cawCur]||' '); ci=(ci+(pressed['ArrowUp']?1:-1)+CAW_CH.length)%CAW_CH.length;
      if (cawCur>=nm.length) nm.push(CAW_CH[ci]); else nm[cawCur]=CAW_CH[ci];
    }
    CAW.name=nm.join('').slice(0,12);
    if (pressed['Enter']||pressed['PadStart']){ cawEdit=false; CAW.name=CAW.name.trim()||'ROOKIE'; cawDirty=true; sfx.select(); }
    pressed={}; return;
  }
  var n=CAW_ROWS.length, row=CAW_ROWS[cawRow];
  if (pressed['ArrowUp']){ cawRow=(cawRow+n-1)%n; sfx.select(); }
  if (pressed['ArrowDown']){ cawRow=(cawRow+1)%n; sfx.select(); }
  var lr = pressed['ArrowLeft'] ? -1 : pressed['ArrowRight'] ? 1 : 0, L=CAW_OPT[row];
  if (lr && L){ CAW[L[0]]=(CAW[L[0]]+lr+L[1].length)%L[1].length; cawDirty=true; sfx.select(); }
  if (pStart()){
    if (row==='NAME'){ cawEdit=true; if (CAW.name==='ROOKIE') CAW.name=''; cawCur=CAW.name.length; cawTyped=[]; sfx.select(); }
    else if (row==='RANDOM'){ cawRandom(); cawDirty=true; sfx.select(); }
    else if (row==='FIGHT!'){ sfx.select(); pressed={}; cawFight(); return; }
  }
  else if (pressed['Backspace']){ cawOpen=false; sfx.select(); T=0; }
  pressed={};
}
function cawSwatch(x, y, c){ g.fillStyle='#000'; g.fillRect(x-1,y-1,12,10); g.fillStyle='rgb('+c[0]+','+c[1]+','+c[2]+')'; g.fillRect(x,y,10,8); }
function drawCaw(){
  menuBG(); menuHead('CREATE A BOXER', 6);
  if (cawDirty && cawRegister()) cawDirty=false;
  var pulse=(T>>3)&1;
  for (var i=0;i<CAW_ROWS.length;i++){
    var row=CAW_ROWS[i], sel=i===cawRow, y=30+i*18, vx=60, tcol=sel ? '#ffffff' : '#6c6c74';
    if (row==='FIGHT!' || row==='RANDOM'){
      drawText(row, 8, y, tcol);
      if (sel) menuGlove(8+textW(row)+6, y-4, 2);
      continue;
    }
    drawText(row==='WAISTBAND' ? 'BAND' : row, 8, y, tcol);
    var val='', L=CAW_OPT[row];
    if (row==='NAME'){
      val=CAW.name;
      if (cawEdit && pulse){ g.fillStyle='#ffffff'; g.fillRect(vx+cawCur*6, y+8, 5, 1); }
    }
    else if (row==='HEAD') val='MODEL '+(CAW.head+1)+'/'+CAW_HEADS.length;
    else if (row==='SKIN'){ cawSwatch(vx, y-1, CAW_SKIN[CAW.skin]); val='   TONE '+(CAW.skin+1); }
    else { var o=L[1][CAW[L[0]]]; cawSwatch(vx, y-1, o[1]||[24,24,28]); val='   '+o[0]; }
    drawText(val, vx, y, sel ? '#ffffff' : '#a0a0a8');
    if (sel) menuGlove(vx+textW(val)+5, y-4, 2);
  }
  // the preview: the boxer himself, x3, shadow-boxing
  var px0=164, py0=27, pw2=88, ph2=178;
  var nm=CAW_B && CAW_B.name;
  if (nm && READY[nm]){
    var POSES=['idle','jab','idle','cross','block','bodyL','idle','walk'], ph=Math.floor(T/50)%POSES.length;
    g.save(); g.beginPath(); g.rect(px0,py0,pw2,ph2); g.clip();
    g.translate(px0+pw2/2-3, py0+ph2-10); g.scale(3,3); g.imageSmoothingEnabled=false;
    drawWrestler(nm, 0, 0, 1, POSES[ph], T%50);
    g.restore();
  } else drawTextC('LOADING', px0+pw2/2, py0+80, '#6c6c74');
  drawTextC(cawEdit ? 'TYPE A NAME - ENTER WHEN DONE' : 'UP DOWN PICK - LEFT RIGHT CHANGE', 128, 213, '#6c6c74');
  if (!cawEdit) drawTextC('ENTER / A SELECT - B BACK', 128, 225, '#6c6c74');
}

/* ---- THE MENUS (the user, 2026-11-09: 'change the menu graphics, completely new style' / 'black screen, pixel art text and
   boxing gloves to the right of each as you go up and down the menu'): no boxes, gradients or stripes any more */
var MT_W=['#ffffff'], MT_G=['#6c6c74'], MT_R=['#e02424'], MT_B=['#4a80f0'];
function menuBG(){ g.fillStyle='#000'; g.fillRect(0,0,W,H); }
function menuHead(text, y){ fancyC(text, 128, y===undefined ? 8 : y, 'bold', 2, MT_W, null, null, 244); }
function menuGlove(x, y, s){                 // the glove beside the picked item, throwing little jabs at it
  x=Math.round(x + (((T>>3)&1) ? 0 : s)); y=Math.round(y);
  var C=GLOVE_COL.front;
  for (var r=0;r<7;r++){ var row=GLOVE_PX[r]; for (var c=0;c<7;c++){ var ch=row[6-c]; if (ch==='.') continue; g.fillStyle=C[ch]; g.fillRect(x+c*s, y+r*s, s, s); } }
}
function drawTitle_W(){
  if (moveList){ drawMoves(); return; }
  menuBG();
  fancyC('PRO BOXING', 128, 44, 'bold', 3, MT_W, null, null);
  for (var m=0;m<MENU_ITEMS.length;m++){
    var sel=m===menuSel, y=108+m*24, tw=fancyC(MENU_ITEMS[m], 128, y, 'bold', 2, sel ? MT_W : MT_G, null, null);
    if (sel) menuGlove(128+tw/2+8, y-3, 3);
  }
}
function drawControls(){
  menuBG(); menuHead('CONTROLS', 18);
  var L=[['D-PAD / ARROWS','MOVE ROUND THE RING'],['X','LEFT TO THE FACE'],['A','RIGHT TO THE FACE'],['DOWN + X','LEFT TO THE BODY'],
         ['DOWN + A','RIGHT TO THE BODY'],['STANDING','BODY IS SAFE'],['LB / RB / C','HOLD - COVER THE FACE'],['MASH X / A','GET UP OFF THE MAT'],['3 ROUNDS','KO TKO OR SCORECARDS']];
  for (var i=0;i<L.length;i++){ drawText(L[i][0], 12, 50+i*15, '#ffffff'); drawText(L[i][1], 106, 50+i*15, '#8c8c94'); }
  drawTextC('PRESS ANY BUTTON', 128, 204, (T>>4)&1 ? '#6c6c74' : '#ffffff');
}
function bigPortrait(i, x, y, w, h, red, mirror){
  g.fillStyle=red ? '#e02424' : '#4a80f0'; g.fillRect(x-1,y-1,w+2,1); g.fillRect(x-1,y+h,w+2,1); g.fillRect(x-1,y-1,1,h+2); g.fillRect(x+w,y-1,1,h+2);
  var im=PORTRAIT[ROSTER[i].name];
  g.save(); g.beginPath(); g.rect(x,y,w,h); g.clip();
  if (imgOk(im)){
    if (mirror){ g.translate(x+w/2,0); g.scale(-1,1); g.translate(-(x+w/2),0); }
    g.drawImage(im, Math.round(x+w/2-im.naturalWidth/2), y+h-im.naturalHeight);
  }
  g.restore();
}
function drawSelect(){
  menuBG();
  menuHead(selMode==='2P' ? (selStep ? 'PLAYER 2 - CHOOSE' : 'PLAYER 1 - CHOOSE') : selStep ? 'CHOOSE YOUR OPPONENT' : 'CHOOSE YOUR BOXER');
  var bw=86, bh=64, by=36;
  bigPortrait(selIdx, 8, by, bw, bh, true, false);
  bigPortrait(oppIdx, W-8-bw, by, bw, bh, false, true);
  fancyC(ROSTER[selIdx].name, 8+bw/2, by+bh+8, 'bold', 1, MT_W, null, null, bw+10);
  fancyC(ROSTER[oppIdx].name, W-8-bw/2, by+bh+8, 'bold', 1, MT_W, null, null, bw+10);
  fancyC('VS', 128, by+bh/2-7, 'bold', 2, MT_W, null, null);
  var POOL=selPool(), n=POOL.length, per=selLayout().per, rows=Math.ceil(n/per), gap=4, pulse=(T>>3)&1;
  var gx0=Math.round((W-(per*TILE+(per-1)*gap))/2), gy0=136;
  for (var pi=0;pi<n;pi++){
    var i=POOL[pi], r=Math.floor(pi/per), c=pi-r*per, inRow=Math.min(per, n-r*per);
    var x=gx0+c*(TILE+gap)+Math.round((per-inRow)*(TILE+gap)/2), y=gy0+r*(TILE+gap);
    var im=PORTRAIT[ROSTER[i].name], f=FACE[ROSTER[i].name]||[38,18];
    if (imgOk(im)){ var sx=Math.max(0, Math.min(im.naturalWidth-TILE, f[0]-TILE/2)), sy=Math.max(0, Math.min(im.naturalHeight-TILE, f[1]-TILE/2));
      g.drawImage(im, sx, sy, TILE, TILE, x, y, TILE, TILE); }
    var sel=i===selIdx, opp=i===oppIdx;
    if (!sel && !opp){ g.fillStyle='rgba(0,0,0,0.55)'; g.fillRect(x,y,TILE,TILE); }
    if (sel || opp){
      var both=sel&&opp;
      if (sel){ g.fillStyle=(!selStep && pulse) ? '#ffffff' : '#e02424'; g.fillRect(x-2,y-2,both?TILE/2+2:TILE+4,2); g.fillRect(x-2,y+TILE,both?TILE/2+2:TILE+4,2); g.fillRect(x-2,y-2,2,TILE+4); if (!both) g.fillRect(x+TILE,y-2,2,TILE+4); }
      if (opp){ g.fillStyle=(selStep && pulse) ? '#ffffff' : '#4a80f0'; var ox=both?x+TILE/2:x-2; g.fillRect(ox,y-2,both?TILE/2+2:TILE+4,2); g.fillRect(ox,y+TILE,both?TILE/2+2:TILE+4,2); g.fillRect(x+TILE,y-2,2,TILE+4); if (!both) g.fillRect(x-2,y-2,2,TILE+4); }
    }
    if (sel) fancyC('1P', x+TILE/2+0.5, y+1, 'bold', 1, MT_W, '#000', null);
    if (opp) fancyC(selMode==='2P' ? '2P' : 'CPU', x+TILE/2+0.5, y+TILE-8, 'bold', 1, MT_W, '#000', null);
  }
}
function drawWinner(){
  menuBG();
  var M=match, win = M && M.winner, youWon = win && win===p1, lose = !TWO_P && win && !youWon;
  var title = TWO_P ? (win ? (win===p1 ? '1P WINS' : '2P WINS') : 'DRAW') : (!win ? 'DRAW' : youWon ? 'YOU WIN' : 'YOU LOSE');
  menuHead(title, 10);
  function idxOf(e){ for (var i=0;i<ROSTER.length;i++) if (ROSTER[i].name===e.def.name) return i; return 0; }
  var how = M && M.endMsg ? M.endMsg : win ? 'BY KO' : 'DRAW';
  if (win){
    bigPortrait(idxOf(win), 128-43, 34, 86, 64, win===p1, win!==p1);
    fancyC(win.def.name, 128, 106, 'bold', 2, MT_W, null, null, 240);
    fancyC('WINS '+(M && M.endMsg ? 'BY ' : '')+how, 128, 124, 'bold', 1, MT_G, null, null);
    drawWrestler(artKey(win), 128, 196, 1, 'win', T);
  } else if (p1 && p2){
    bigPortrait(idxOf(p1), 30, 40, 86, 64, true, false); bigPortrait(idxOf(p2), 140, 40, 86, 64, false, true);
    fancyC(how, 128, 124, 'bold', 2, MT_W, null, null, 240);
    fancyC('NO WINNER', 128, 146, 'bold', 1, MT_G, null, null);
  }
  if ((T>>4)&1) fancyC('PUSH START', 128, 214, 'reg', 1, MT_G, null, null);
}
function drawPause(){
  g.fillStyle='rgba(0,0,0,0.88)'; g.fillRect(-VX,0,VW,H);
  fancyC('PAUSED', 128, 30, 'bold', 2, MT_W, null, null);
  var x0=40;
  for (var i=0;i<PAUSE_ITEMS.length;i++){
    var it=PAUSE_ITEMS[i], sel=i===pauseSel, y=62+i*16, vx=x0+90, end=x0+textW(it);
    drawText(it, x0, y, sel?'#ffffff':'#6c6c74');
    if (it==='MUSIC' || it==='SOUND FX'){
      var lv = it==='MUSIC' ? VOL.music : VOL.sfx; end=vx+60;
      if (it==='MUSIC' && MUS.muted){ drawText('MUTED', vx, y, '#e02424'); end=vx+30; }
      else for (var s=0;s<10;s++){ g.fillStyle = s<lv ? (sel?'#ffffff':'#6c6c74') : '#26262c'; g.fillRect(vx+s*6, y+1, 5, 6); }
    } else if (it==='CPU'){ drawText(DIFFS[diff].name, vx, y, sel?'#ffffff':'#6c6c74'); end=vx+textW(DIFFS[diff].name); }
    else if (it==='FULLSCREEN'){ drawText(isFS()?'ON':'OFF', vx, y, sel?'#ffffff':'#6c6c74'); end=vx+18; }
    if (sel) menuGlove(end+6, y-4, 2);
  }
  drawTextC('LEFT/RIGHT CHANGE', 128, 188, '#6c6c74');
  drawTextC('START OR P TO RESUME', 128, 200, '#6c6c74');
}

/* ---- THE LADDER (the user's pick, 2026-11-09): each new boxer fights Doug, then Benny, then Jean Claude, one after the other.
   Beat all three = CHAMPION. A loss ends the run (each run is a new boxer). A draw = fight him again. Uses the game's
   spare scenes: 'tour' = next opponent, 'tourcont' = the run is over, 'champ' = champion. */
var LADDER = null, LADDER_ORDER = [0, 1, 2];
function ladderOpp(){ return LADDER_ORDER[LADDER.i]; }
function updateWinner(){
  if (!pStart()){ pressed={}; return; }
  entMusicStop(); pressed={}; T=0;
  if (!LADDER || TWO_P){ scene='title'; return; }
  var w=match && match.winner;
  if (!w) scene='tour';                                    // a draw: the same man again
  else if (w!==p1){ LADDER.lostTo=p2.def.name; scene='tourcont'; }
  else { LADDER.i++; LADDER.won++; if (LADDER.i>=LADDER_ORDER.length){ scene='champ'; if (sfx.cheer) sfx.cheer(0.5); sfx.roar(); } else scene='tour'; }
}
function ladderGo(){ return T>20 && (pStart()||pLeft()||pRight()); }
function updateTour(){
  if (ladderGo()){ sfx.select(); var o=ladderOpp(); oppIdx=o; pressed={}; startMatch(LADDER.me, o, false); return; }
  pressed={};
}
function ladderEnd(){ LADDER=null; scene='title'; T=0; menuSel=0; pressed={}; }
function updateTourCont(){ if (ladderGo()){ sfx.select(); ladderEnd(); return; } pressed={}; }
function updateChamp(){ if (ladderGo()){ sfx.select(); ladderEnd(); return; } pressed={}; }
function drawTour(){
  menuBG();
  menuHead('FIGHT '+(LADDER.i+1)+' OF '+LADDER_ORDER.length, 10);
  var bw=86, bh=64, by=36, o=ladderOpp();
  bigPortrait(LADDER.me, 8, by, bw, bh, true, false);
  bigPortrait(o, W-8-bw, by, bw, bh, false, true);
  fancyC(ROSTER[LADDER.me].name, 8+bw/2, by+bh+8, 'bold', 1, MT_W, null, null, bw+10);
  fancyC(ROSTER[o].name, W-8-bw/2, by+bh+8, 'bold', 1, MT_W, null, null, bw+10);
  fancyC('VS', 128, by+bh/2-7, 'bold', 2, MT_W, null, null);
  drawTextC((BOX_STYLE[ROSTER[o].name]||STYLE_NONE).tag, 128, 122, '#8c8c94');
  for (var i=0;i<LADDER_ORDER.length;i++){
    var y=144+i*14, nm=ROSTER[LADDER_ORDER[i]].name, cur=i===LADDER.i, tw=textW(nm);
    drawTextC(nm, 128, y, cur ? '#ffffff' : '#6c6c74');
    if (i<LADDER.i) drawText('WON', 128+tw/2+8, y, '#6c6c74');
    if (cur) menuGlove(128+tw/2+6, y-4, 2);
  }
  if ((T>>4)&1) drawTextC('PRESS START', 128, 208, '#6c6c74');
}
function drawTourCont(){
  menuBG();
  menuHead('YOUR RUN IS OVER', 30);
  bigPortrait(LADDER.me, 85, 58, 86, 64, true, false);
  fancyC(ROSTER[LADDER.me].name, 128, 130, 'bold', 1, MT_W, null, null, 240);
  drawTextC('LOST TO '+LADDER.lostTo, 128, 146, '#8c8c94');
  drawTextC('BEAT '+LADDER.won+' OF '+LADDER_ORDER.length, 128, 160, '#8c8c94');
  if ((T>>4)&1) drawTextC('PRESS START', 128, 200, '#6c6c74');
}
function drawChamp(){
  menuBG();
  fancyC('CHAMPION', 128, 18, 'bold', 3, MT_W, null, null);
  fancyC(ROSTER[LADDER.me].name, 128, 56, 'bold', 2, MT_W, null, null, 240);
  drawTextC('BEAT ALL '+LADDER_ORDER.length, 128, 74, '#8c8c94');
  var nm=ROSTER[LADDER.me].name;
  if (READY[nm]){ g.save(); g.translate(128,204); g.scale(2,2); g.imageSmoothingEnabled=false; drawWrestler(nm, 0, 0, 1, 'win', T); g.restore(); }
  if ((T>>4)&1) drawTextC('PRESS START', 128, 222, '#6c6c74');
}

/* ---- GRAPHICS PASS (the user, 2026-11-09: 'enhance the overall graphics' -> ring look, dark arena, HUD, hit effects) */
// camera flashes popping in the dark crowd (lots of them when someone goes down), and the overhead lights' faint beams
var CROWD_FLASH = [], flashWait = 40;
function crowdFlash(n){
  for (var i=0;i<n;i++){
    var left=Math.random()<0.5;
    CROWD_FLASH.push({ x: left ? -84+Math.random()*104 : 232+Math.random()*106, y: 30+Math.random()*156, t:0 });
  }
}
var _updateFX_W = updateFX;
updateFX = function(){
  _updateFX_W();
  for (var i=CROWD_FLASH.length-1;i>=0;i--) if (++CROWD_FLASH[i].t>6) CROWD_FLASH.splice(i,1);
  if (scene==='match' && --flashWait<=0){ crowdFlash(1); flashWait = 25+Math.floor(Math.random()*90); }
  for (var j=IMPACTS.length-1;j>=0;j--) if (++IMPACTS[j].t>IMPACTS[j].max) IMPACTS.splice(j,1);
};
var _drawArena_W = drawArena;
drawArena = function(){
  _drawArena_W();
  // the lights hanging over the ring: two soft beams down onto the canvas
  g.save(); g.globalAlpha=0.05; g.fillStyle='#dfe8ff';
  g.beginPath(); g.moveTo(84,0); g.lineTo(118,0); g.lineTo(150,128); g.lineTo(72,128); g.closePath(); g.fill();
  g.beginPath(); g.moveTo(138,0); g.lineTo(172,0); g.lineTo(184,128); g.lineTo(106,128); g.closePath(); g.fill();
  g.restore();
  CROWD_FLASH.forEach(function(f){
    var x=Math.round(f.x), y=Math.round(f.y), k=f.t;
    g.globalAlpha = k<2 ? 0.35 : 0.15; g.fillStyle='#fff6d0'; g.fillRect(x-2,y-2,5,5);
    g.globalAlpha = k<3 ? 1 : 0.5; g.fillStyle='#ffffff'; g.fillRect(x,y,1,1);
    if (k<2){ g.fillRect(x-2,y,5,1); g.fillRect(x,y-2,1,5); }
    g.globalAlpha=1;
  });
};
// HIT EFFECTS: a pixel starburst where a clean punch lands (bigger for a straight / a knockdown punch), sweat flying off
// the head on face shots, a blue spark + flash on the gloves for a blocked punch, a dust puff off the canvas on a knockdown
var IMPACTS = [];
function addImpact(x, y, size, cols){ IMPACTS.push({ x:Math.round(x), y:Math.round(y), t:0, max: size>1 ? 9 : 6, size:size, cols:cols }); }
function addSweat(x, y, dir, n){
  for (var i=0;i<n;i++) FX.push({ x:x, y:y-2+Math.random()*4, vx:dir*(0.8+Math.random()*2.2), vy:-0.6-Math.random()*1.4,
    life:12+Math.random()*10, max:22, col: Math.random()<0.5 ? '#e8f6ff' : '#a8d4f4', g:0.14, r:1 });
}
var _drawFX_W = drawFX;
drawFX = function(){
  _drawFX_W();
  g.globalAlpha=1;
  IMPACTS.forEach(function(p){
    var k=p.t, L=(p.size>1 ? 3 : 2) + k*(p.size>1 ? 1.4 : 1), r0=Math.max(1, k*0.8), c=p.cols[Math.min(p.cols.length-1, Math.floor(k/3))];
    g.fillStyle=c;
    if (k<2){ g.fillRect(p.x-1,p.y-1,3,3); if (p.size>1){ g.fillStyle='#ffffff'; g.fillRect(p.x-2,p.y,5,1); g.fillRect(p.x,p.y-2,1,5); g.fillStyle=c; } }
    var D=[[1,0],[-1,0],[0,1],[0,-1],[0.7,0.7],[-0.7,0.7],[0.7,-0.7],[-0.7,-0.7]];
    for (var d=0; d<D.length; d++){
      if (d>=4 && p.size<1) break;                    // a blocked punch: just a little + flash
      var len = d<4 ? L : L*0.7;
      for (var q=r0; q<=len; q+=1) g.fillRect(Math.round(p.x+D[d][0]*q), Math.round(p.y+D[d][1]*q*0.8), 1, 1);
    }
  });
};
// hooks on the punch: wrap hit() and knockDown() (the fight code stays as it was)
var _hit_B = hit;
hit = function(e, f, dmg, mv){
  var hp0=f.hp, st0=f.state, cx=f.x - e.face*2, cy=f.y-40;
  _hit_B(e, f, dmg, mv);
  if (f.hp < hp0){                                         // landed clean
    var big = mv===MOVES.cross || f.hp<=0;
    addImpact(cx, cy + (mv.lo ? 12 : 0), big ? 2 : 1, big ? ['#ffffff','#fff080','#ffb030'] : ['#ffffff','#ffe8a0','#f0b060']);
    if (!mv.lo) addSweat(f.x - e.face*1, f.y-44, e.face, big ? 9 : 5);
    if (f.hp<=0) crowdFlash(8);
  } else if (f.hp===hp0 && f.state!=='hurt' && st0!=='hurt' && f.face===-e.face){   // blocked
    addImpact(cx, cy + (mv.lo ? 12 : 0), 0.5, ['#ffffff','#a8c8ff','#5080e0']);
    addSpark(cx, cy + (mv.lo ? 12 : 0), 3, '#80b0ff', 0.9);
  }
};
var _knockDown_B = knockDown;
knockDown = function(f){
  _knockDown_B(f);
  for (var i=0;i<12;i++){ var dir=i%2 ? 1 : -1, s=0.6+Math.random()*1.4;
    FX.push({ x:f.x+dir*(4+Math.random()*12), y:f.y-1, vx:dir*s, vy:-(0.2+Math.random()*0.6), life:16+Math.random()*10, max:26, col: Math.random()<0.5 ? '#c4d2f4' : '#8ea4dc', g:0.03, r:2+Math.random()*2 }); }
  crowdFlash(6);
};

/* ---- THE BOXERS (the user, 2026-11-10: 'make the boxers look better' -> picked SWEAT SHEEN, DAMAGE ON THE FACE, BETTER
   SHADOWS; effects only, the painted sprites are untouched). Each boxer is already drawn alone onto the outline layer
   (drawOutlined), so the effects are done there, on his own pixels, before he's stamped onto the screen:
   - sweat: glints on the lit skin that build up over the fight (none at the first bell, plenty by round 3), stuck to the
     body (sprite-local positions), a few sparkling
   - damage: as his health drops the front cheek goes red, then a purple swollen eye under the brow (it eases off when
     he gets health back between rounds / after getting up)
   - shadows: a soft wide shadow + a darker contact patch under the feet, stretched toward a thrown punch */
var BOXFX_ON = true, BOXFX_E = null;
var _drawEntity_B = drawEntity;
// ALWAYS ORTHODOX (the user, 2026-11-10: 'when you face the other way your stance changes from orthodox to southpaw - keep
// the left arm forward'): the art faces RIGHT (far arm = his LEFT = the jab); facing left it's mirrored, so the far arm
// became his right. Facing LEFT: the punches use the other arm's frames (jab = the near-arm frames, cross = the far-arm
// ones) and in the guard the near glove (now his left) is held forward. (The legs stay as painted.)
var ORTHO_ON = true, ORTHO_NOW = false, ORTHO_REAR_DX = 4;
var ORTHO_SWAP = { JABW:'CRSW', JABM:'CRSM', JABL:'CRSR', CRSW:'JABW', CRSM:'JABM', CRSR:'JABL',
                   BDLW:'BDRW', BDLM:'BDRM', BODYL:'BODYP', BDRW:'BDLW', BDRM:'BDLM', BODYP:'BODYL' };
var ORTHO_GUARD = { GRD:1, GW0:1, GW1:1, GW2:1, GW3:1 };
var ORTHO_POSES = ['jab','cross','bodyL','bodyR'];
drawEntity = function(e){
  if (e===p1 || e===p2) BOXFX_E = e;
  var sw = ORTHO_ON && (e===p1 || e===p2) && e.face<0, seqs = sw && SEQ[artKey(e)], keep = [];
  if (seqs) ORTHO_POSES.forEach(function(k, i){ var a=seqs[k]; if (!a) return; keep[i]=a.seq; a.seq=a.seq.map(function(f){ return ORTHO_SWAP[f]||f; }); });
  ORTHO_NOW = !!sw;
  try { return _drawEntity_B(e); }
  finally { ORTHO_NOW = false; if (seqs) ORTHO_POSES.forEach(function(k, i){ if (keep[i]) seqs[k].seq = keep[i]; }); }
};
function boxFxHash(x, y, k){ var h = (x*374761393 + y*668265263 + k*2147483647) | 0; h = (h ^ (h >>> 13)) * 1274126177 | 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
function isSkin(r, gg, b){ return r >= 70 && r > gg && gg > b && gg >= r*0.45 && gg <= r*0.88 && r - b >= 30; }
function boxFxSweat(){                       // 0 at the first bell -> 1 at the end of the last round
  var M=match; if (!M || !M.round) return 0;
  var done = (M.round-1)*ROUND_SECS + (ROUND_SECS - Math.max(0, M.time/60));
  return Math.max(0, Math.min(1, done / (ROUNDS*ROUND_SECS)));
}
function boxFxApply(e, ctx, tf){
  var standing = !(e.state==='down' || e.state==='getup' || e.willFall || e.fallDelay>0);
  var sx = Math.round(tf.e + e.x) - 32, sy = Math.round(tf.f + e.y) - 66, w = 64, h = 70;
  if (sx < 0){ w += sx; sx = 0; } if (sy < 0){ h += sy; sy = 0; }
  if (w <= 0 || h <= 0) return;
  var img = ctx.getImageData(sx, sy, w, h), d = img.data;
  var sweat = boxFxSweat(), hurt = Math.max(0, Math.min(1, (100 - e.hp) / 85));
  if (sweat < 0.04 && hurt < 0.15) return;
  // the skin's brightness range on this frame, and the top of his head
  var maxL = 0, top = -1, cols = [];
  for (var y=0; y<h; y++) for (var x=0; x<w; x++){
    var i = (y*w + x)*4; if (d[i+3] < 200) continue;
    if (top < 0) top = y;
    if (isSkin(d[i], d[i+1], d[i+2])){ var L = d[i]*0.3 + d[i+1]*0.59 + d[i+2]*0.11; if (L > maxL) maxL = L; }
  }
  if (top < 0 || maxL < 40) return;
  var ex = Math.round(tf.e + e.x), ey = Math.round(tf.f + e.y), fx = e.face || 1, spark = Math.floor(T/6);
  // the face: the head's skin rows, the front edge of the face per row
  var headTop = top, front = {};
  if (standing && hurt >= 0.15){
    for (var y2=headTop+2; y2<=headTop+11 && y2<h; y2++){
      var best = null;
      for (var x2=0; x2<w; x2++){
        var j = (y2*w + x2)*4; if (d[j+3] < 200 || !isSkin(d[j], d[j+1], d[j+2])) continue;
        if (best===null || (fx>0 ? x2>best : x2<best)) best = x2;
      }
      if (best!==null) front[y2] = best;
    }
  }
  for (var y=0; y<h; y++) for (var x=0; x<w; x++){
    var i = (y*w + x)*4; if (d[i+3] < 200) continue;
    var r = d[i], gg = d[i+1], b = d[i+2];
    if (!isSkin(r, gg, b)) continue;
    var L = r*0.3 + gg*0.59 + b*0.11;
    var lx = (sx + x - ex) * fx, ly = sy + y - ey;          // sprite-local (same spot whichever way he faces)
    // DAMAGE: cheek (rows 6-9 of the head, the 4 px nearest his front) red; swollen eye (rows 3-5) purple
    if (front[y] !== undefined){
      var dx = Math.abs(x - front[y]), row = y - headTop;
      if (row >= 6 && row <= 9 && dx <= 3 && dx >= 1){
        var a = Math.min(0.75, (hurt - 0.15) * 1.1);
        r = r + (225 - r)*a; gg = gg*(1 - a*0.6); b = b*(1 - a*0.5);
      } else if (row >= 3 && row <= 5 && dx >= 1 && dx <= 3 && hurt >= 0.5){
        var a2 = Math.min(0.65, (hurt - 0.5) * 1.6);
        r = r*(1 - a2*0.35) + 40*a2; gg = gg*(1 - a2*0.6); b = b*(1 - a2*0.1) + 60*a2;
      }
    }
    // SWEAT: glints on the lit skin (the upper half of its brightness), more of them as the fight goes on
    // (upper body only: forehead, shoulders, chest, arms - the lit tones get a wet shine, a few pixels sparkle)
    if (sweat >= 0.04 && ly <= -28 && L >= maxL*0.8){
      var sh = sweat*0.28;                                                 // the sheen: lit skin a touch brighter + cooler
      r = r + (255 - r)*sh*0.6; gg = gg + (245 - gg)*sh*0.7; b = b + (235 - b)*sh;
      if (L >= maxL*0.9 && boxFxHash(lx, ly, 1) < sweat*0.22 && boxFxHash(lx, ly, spark) < 0.35){ r = 255; gg = 255; b = 248; }
    }
    d[i] = r; d[i+1] = gg; d[i+2] = b;
  }
  ctx.putImageData(img, sx, sy);
}
// ALWAYS ORTHODOX - THE FEET (the user, 2026-11-10: 'make sure the feet are orthodox too'): facing left the mirror puts
// his far (RIGHT) leg in front. The legs' outline is right; only which leg is nearer is wrong. So row by row from the
// knees down: the far leg's sliver at the front edge (split at the dark outline between the legs) and the near leg
// swap places - the near (LEFT) leg leads, the right one peeks out behind it. (Rows with no clear split stay as drawn.)
var ORTHO_LEG_ROWS = 23, ORTHO_FOOT_ROWS = 5;     // (the feet / soles - their toes already point the right way - are left as drawn)
function orthoLegs(e, ctx, tf){
  if (e.state==='down' || e.state==='getup' || e.willFall || e.fallDelay>0) return;
  var ex=Math.round(tf.e + e.x), ey=Math.round(tf.f + e.y), sx=ex-16, sy=ey-ORTHO_LEG_ROWS, w=32, h=ORTHO_LEG_ROWS-ORTHO_FOOT_ROWS;
  if (sx<0 || sy<0) return;
  var img=ctx.getImageData(sx, sy, w, h), d=img.data;
  function L(i){ return d[i]*0.3 + d[i+1]*0.59 + d[i+2]*0.11; }
  for (var y=0; y<h; y++){
    var a=-1, b=-1, x;
    for (x=0; x<w; x++) if (d[(y*w+x)*4+3]>0){ if (a<0) a=x; b=x; }
    if (a<0 || b-a<3) continue;
    var c=-1;
    for (x=a+1; x<=Math.min(b-2, a+5); x++){
      var i=(y*w+x)*4;
      if (d[i+3]>0 && L(i)<34){ var lit=false; for (var k=x+1;k<b;k++) if (L((y*w+k)*4)>=34){ lit=true; break; } if (lit){ c=x; break; } }
    }
    if (c<0) continue;
    var row=[], n;
    for (x=c; x<=b; x++) row.push(d.slice((y*w+x)*4, (y*w+x)*4+4));     // the near leg (with its outline) to the front
    for (x=a; x<c; x++) row.push(d.slice((y*w+x)*4, (y*w+x)*4+4));      // the far leg's sliver behind it
    for (n=0, x=a; x<=b; x++, n++){ var o=(y*w+x)*4; d[o]=row[n][0]; d[o+1]=row[n][1]; d[o+2]=row[n][2]; d[o+3]=row[n][3]; }
  }
  ctx.putImageData(img, sx, sy);
}
drawOutlined = function(fn){
  if (!OUTLINE_ON) return fn();
  var main = g===OL_LG ? CV_G : g;
  OL_LG.setTransform(1,0,0,1,0,0); OL_LG.clearRect(0,0,VW,H);
  OL_LG.setTransform(main.getTransform());
  var tf = main.getTransform();
  g = OL_LG; SHADOW_G = main; BOXFX_E = null;
  try { fn(); } finally { g = main; SHADOW_G = null; OL_LG.setTransform(1,0,0,1,0,0); }
  if (BOXFX_E && ORTHO_ON && BOXFX_E.face<0 && scene==='match'){ try { orthoLegs(BOXFX_E, OL_LG, tf); } catch(err){} }
  if (BOXFX_ON && BOXFX_E && scene==='match'){ try { boxFxApply(BOXFX_E, OL_LG, tf); } catch(err){} }
  BOXFX_E = null;
  OL_SG.globalCompositeOperation='source-over'; OL_SG.clearRect(0,0,VW,H); OL_SG.drawImage(OL_LAYER,0,0);
  OL_SG.globalCompositeOperation='source-in'; OL_SG.fillStyle=OUTLINE_COL; OL_SG.fillRect(0,0,VW,H);
  OL_SG.globalCompositeOperation='source-over';
  main.save(); main.setTransform(1,0,0,1,0,0);
  main.drawImage(OL_SIL,-1,0); main.drawImage(OL_SIL,1,0); main.drawImage(OL_SIL,0,-1); main.drawImage(OL_SIL,0,1);
  main.drawImage(OL_LAYER,0,0);
  main.restore();
};
// SHADOWS: a soft wide one + a dark contact patch under the feet; a punch stretches it toward the punch, lying = long
var _drawShadow_B = drawShadow;
drawShadow = function(e){
  if (!(e===p1 || e===p2) || !BOXFX_ON) return _drawShadow_B(e);
  var sg = SHADOW_G || g, x = Math.round(e.x), y = Math.round(e.y);
  var down = e.state==='down', lean = e.state==='atk' ? (e.face||1)*3 : 0;
  var W1 = down ? 40 : 26 + Math.abs(lean), H1 = down ? 7 : 6, W2 = down ? 30 : 13, H2 = down ? 4 : 3;
  sg.fillStyle='rgba(0,0,24,0.16)'; sg.beginPath(); sg.ellipse(x + lean/2, y, W1/2, H1/2, 0, 0, 6.2832); sg.fill();
  sg.fillStyle='rgba(0,0,24,0.20)'; sg.beginPath(); sg.ellipse(x + lean/3, y, (W1-8)/2, (H1-2)/2, 0, 0, 6.2832); sg.fill();
  sg.fillStyle='rgba(0,0,16,0.38)'; sg.beginPath(); sg.ellipse(x, y, W2/2, H2/2, 0, 0, 6.2832); sg.fill();
};

/* ---- main menu: CONTROLS replaces the move list */
var ctlScreen = false;
function drawTitle(){
  if (cawOpen){ drawCaw(); return; }
  drawTitle_W();
  if (ctlScreen) drawControls();
}
function updateTitle(){
  if (cawOpen){ updateCaw(); return; }
  if (pStart() && MENU_ITEMS[menuSel]==='NEW BOXER'){ openCaw(); sfx.select(); pressed={}; return; }
  if (ctlScreen){ if (pStart()||pAnyPunch()){ ctlScreen=false; sfx.select(); } pressed={}; return; }
  if (pStart() && MENU_ITEMS[menuSel]==='CONTROLS'){ ctlScreen=true; sfx.select(); pressed={}; return; }
  updateTitle_W();
}

/* no steel chair in boxing */
function resetChair(){ CHAIR = null; }

/* no wrestling move list (Y / L on the select screen did open it) */
function openMoves(){}


/* ---- RING MODE (the user, 2026-11-10: 'two modes just to test what I like - you can't switch sides but you can walk up
   and down maybe a couple spaces, mostly back and forth - make a ring like that and a mode and I'll judge'):
   OPTIONS > RING: FULL RING = the ring as it was (move anywhere, turn round each other)
                   LANE      = a longer, shallower ring (sprites/ring_lane.png, LANE=1 python tools/build_ring_deluxe.py):
                               player 1 always on the left, player 2 always on the right - you can't get past each other -
                               a band of LANE_Y2-LANE_Y1 px to step up / down in, the ref walks the back of the ring */
var RING_MODES = { full:{ name:'FULL RING', desc:'MOVE ALL ROUND THE RING' }, lane:{ name:'LANE', desc:'SIDES LOCKED - MOSTLY BACK AND FORTH' } };
var RING_MODE = 'full'; try { if (localStorage.getItem('box_ring')==='lane') RING_MODE='lane'; } catch(err){}
function saveRingMode(){ try { localStorage.setItem('box_ring', RING_MODE); } catch(err){} }
var LANE_DX = 24, LANE_DY = 20, LANE_Y1 = 78, LANE_Y2 = 90, LANE_GAP = 14;
var RING_FULL = { x1:RING.x1, x2:RING.x2, y1:RING.y1, y2:RING.y2 };
var FRONT_ROPE_FULL = FRONT_ROPE_ROWS.slice(), REF_BACK_FULL = REF_BACK_Y;
var ARENA_FULL = ARENA, ARENA_LANE = new Image(); ARENA_LANE.src = 'sprites/ring_lane.png?v=2';
function laneMid(){ return Math.round((LANE_Y1+LANE_Y2)/2); }
function applyRingMode(){
  var L = RING_MODE==='lane';
  RING.x1 = RING_FULL.x1 - (L ? LANE_DX : 0); RING.x2 = RING_FULL.x2 + (L ? LANE_DX : 0);
  RING.y1 = L ? LANE_Y1 : RING_FULL.y1;       RING.y2 = L ? LANE_Y2 : RING_FULL.y2;
  FRONT_ROPE_ROWS = FRONT_ROPE_FULL.map(function(y){ return L ? y-LANE_DY : y; });
  REF_BACK_Y = L ? 62 : REF_BACK_FULL;
  ARENA = L ? ARENA_LANE : ARENA_FULL;
}
applyRingMode();
var _startMatch_L = startMatch;
startMatch = function(idx, opp, twoP){ applyRingMode(); _startMatch_L(idx, opp, twoP); if (RING_MODE==='lane' && ref){ ref.y = laneMid(); } };
var _toCorners_L = toCorners;
toCorners = function(){ _toCorners_L(); if (RING_MODE==='lane'){ p1.y = p2.y = laneMid(); } };
// sides locked: player 1 can never get past player 2 (whatever the up / down), even with a man on the mat
var _keepApart_L = keepApart;
keepApart = function(){
  if (RING_MODE!=='lane') return _keepApart_L();
  var d = p2.x - p1.x; if (d >= LANE_GAP) return;
  var push = (LANE_GAP - d)/2; p1.x -= push; p2.x += push; clamp(p1); clamp(p2);
  if (p2.x - p1.x < LANE_GAP){ if (p1.x <= RING.x1) p2.x = p1.x + LANE_GAP; else p1.x = p2.x - LANE_GAP; }
};
// a knockdown: the man still standing backs off to HIS end of the ring (never past the man down)
var _knockDown_L = knockDown;
knockDown = function(f){
  _knockDown_L(f);
  if (RING_MODE==='lane' && match.kd){ var a = foe(f); match.kd.corner = [a===p1 ? RING.x1+4 : RING.x2-4, laneMid()]; }
};


/* ---- FIGHT MECHANICS (the user, 2026-11-10: 'what should be added, just fight mechanics' -> picked all four of:
   1 STAMINA   - every punch costs wind (a miss costs more), it comes back while you stand / walk (half while blocking);
                 under STA_TIRED your punches come slower + weaker, and blocking a power punch with an empty tank breaks
                 the guard (it goes through at 60%). The thin bar under each health bar.
   2 BODY      - landed body shots take wind straight away AND add body damage, which slows how fast the wind comes back
                 for the rest of the fight (it eases 30% between rounds)
   3 ROCKED    - a counter to the head, or sometimes a clean straight: he wobbles for ROCK_T steps - no guard (face or
                 body), half speed on his feet, slower punches; can't be re-rocked for ROCK_IMMUNE steps after
   4 ONE-TWO   - a LEFT (jab / body jab) that lands clean can be followed straight away by a RIGHT (straight / body
                 straight) that skips most of its wind-up; press the right any time during the left (it's buffered).
                 The CPU does it too (more on harder levels). */
var STA_COST = { jab:5, bodyL:5, cross:11, bodyR:11 }, STA_MISS = 0.6, STA_REGEN = 0.2, STA_TIRED = 30;
var STA_BLOCK = 2, STA_BLOCK_PWR = 4, STA_BODY_HIT = 1.2, BODY_SLOW = 60;   // (STA_BLOCK_PWR 7 -> 4: blocking matters - a covering-up man's guard broke ~9 times a fight)
var ROCK_T = 90, ROCK_IMMUNE = 120, ROCK_CHANCE = 0.25;   // (balance 3: was 0.35)
/* HEALTH + STAMINA CEILINGS (the user, 2026-11-10: 'look at Greatest Heavyweights - the bar goes down but over time it
   has areas it can no longer get to'): both bars refill on their own, but every clean hit also takes part of it away for
   good - the dark hatched end of the bar it can't refill past. Head + body hits -> health ceiling, body hits -> stamina
   ceiling too, a knockdown -> health ceiling. Between rounds both refill to the ceiling and get REST_CEIL of it back. */
var HP_PERM = 0.4, HP_REGEN = 0.04, HP_REGEN_WAIT = 75, HP_CEIL_MIN = 20, KD_CEIL = 10;
var STA_PERM = 0.8, STA_CEIL_MIN = 30, REST_CEIL = 8;
var COMBO_SKIP = 4;
var BLOCK_OPEN = 6, BLOCK_OPEN_PWR = 14, PUNISH_WIN = 30, PUNISH_DMG = 1.3;   // blocking pays
var CAUGHT_MOVING = 1.1, CAUGHT_IN = 1.3, WALK_REGEN = 0.5;                   // footwork has a cost
var FLURRY_T0 = 2, FLURRY_MAX = 3;                                             // CPU flurries: up to 3 more punches
// ---- 3. FLURRIES: a sharp CPU keeps punching (left, right, left...) mostly to the head - whether they land or you block
// them; covering up takes them (and each blocked power shot ends it + leaves him open), walking into one hurts
function cpuFlurry(e, M){
  if (!e.cpu || e.flurryRolled===e.atkAt || e.t <= M.end || e.hitDone===false && !e.missPaid) return false;
  e.flurryRolled = e.atkAt;
  var A=BOX_AI[diff]||BOX_AI[0], f=foe(e), n=e.flurryN||0;
  if (n >= FLURRY_MAX || !(A.flurry>0) || Math.abs(f.x-e.x) > 24 || Math.abs(f.y-e.y) > 8 || f.state==='down') return false;
  if (tiredOf(e) > 0.3) return false;
  if (Math.random() > A.flurry*(f.state==='block' ? 1.3 : 1)) return false;
  var left = e.move==='jab' || e.move==='bodyL', body = Math.random() < 0.2;
  var mv = left ? (body ? 'bodyR' : 'cross') : (body ? 'bodyL' : 'jab');
  startPunch(e, mv, FLURRY_T0); e.flurryN = n+1; e.flurryRolled = e.atkAt;
  return true;
}                                       // (balance 3: was 7 - the right landed inside the jab's stun, a sure thing)
var COUNTER_LEAD = 4;                                     // a counter = started this many steps after his punch (a read, not a trade)                                       // the right after a landed left starts this far into its wind-up
function fightReset(e){ e.sta=100; e.staMax=100; e.hpMax=100; e.hitT=999; e.bodyDmg=0; e.rocked=0; e.rockImm=0; e.comboOK=false; e.comboBuf=null; }
function tiredOf(e){ var s=e.sta==null ? 100 : e.sta; return s>=STA_TIRED ? 0 : 1 - s/STA_TIRED; }
function staTick(e){
  e.vx = e.x - (e._px==null ? e.x : e._px); e._px = e.x;            // his step this tick
  if (e.punishT>0) e.punishT--;
  if (e.state!=='atk') e.flurryN = 0;
  if (e.sta==null) fightReset(e);
  if (e.rocked>0){ e.rocked--; if (e.rocked%24===0 && e.state!=='down') addStars(e.x, e.y-52, 2); }
  else if (e.rockImm>0) e.rockImm--;
  if (e.state==='down' || e.state==='getup') e.rocked=0;
  var regen = STA_REGEN, cap = e.staMax==null ? 100 : e.staMax;
  if (e.state==='idle') e.sta=Math.min(cap, e.sta+regen);
  else if (e.state==='walk') e.sta=Math.min(cap, e.sta+regen*WALK_REGEN);   // (on the move: half the wind back)
  else if (e.state==='block') e.sta=Math.min(cap, e.sta+regen*0.5);
  if (e.sta > cap) e.sta = cap;
  // HEALTH comes back too (Greatest Heavyweights style), a while after the last clean hit, but only up to his ceiling
  e.hitT = (e.hitT||0) + 1;
  var hcap = e.hpMax==null ? 100 : e.hpMax;
  if (e.hitT > HP_REGEN_WAIT && e.hp > 0 && e.state!=='down' && e.state!=='hurt' && e.hp < hcap) e.hp = Math.min(hcap, e.hp + HP_REGEN*(styleOf(e).hpRegen||1));
}
function punchRate(e){ return (1 - 0.35*tiredOf(e)) * (e.rocked>0 ? 0.75 : 1); }
function startPunch(e, mv, t0){
  e.recExtra=0;
  e.state='atk'; e.t=t0; e.t0=t0; e.aiSeen=false; e.aiPun=false; e.hitDone=false; e.missPaid=false; e.comboOK=false; e.comboBuf=null; e.comboRolled=false;
  e.move=mv; e.atkAt=match.t; statCount(e, mv, 0); e.sta=Math.max(0, (e.sta==null ? 100 : e.sta) - STA_COST[mv]);
  MOVES[mv].snd();
}
function comboTry(e, M){
  if (e.move!=='jab' && e.move!=='bodyL') return false;
  if (!e.cpu){                                            // buffer the right hand pressed during the left
    var b = pFaceR() ? 'cross' : pBodyR() ? 'bodyR' : null;
    if (b && e.t>=M.start-3) e.comboBuf=b;
  } else if (e.comboOK && !e.comboRolled){
    e.comboRolled=true;
    var A=BOX_AI[diff]||BOX_AI[0], f=foe(e);
    if (Math.random() < A.combo + (f.rocked>0 ? 0.2 : 0)) e.comboBuf = f.state==='block' ? 'bodyR' : (Math.random()<0.75 ? 'cross' : 'bodyR');
  }
  if (e.comboOK && e.comboBuf && e.t>M.end){ startPunch(e, e.comboBuf, COMBO_SKIP); return true; }
  return false;
}
function staBar(x, y, e, flip, w){
  var s=Math.max(0, Math.min(100, e.sta==null ? 100 : e.sta)), fw=Math.round(w*s/100), tired=s<STA_TIRED;
  g.fillStyle='#000'; g.fillRect(x-1, y-1, w+2, 4);
  g.fillStyle='#10202a'; g.fillRect(x, y, w, 2);
  g.fillStyle = tired ? ((T>>3)&1 ? '#ff7020' : '#c04010') : '#38c8e8';
  if (fw>0) g.fillRect(flip ? x+w-fw : x, y, fw, 2);
  deadZone(x, y, w, 2, flip, e.staMax);
}
function deadZone(x, y, w, h, flip, max){             // the part of a bar that can't be refilled: dark, hatched
  if (max==null || max>=100) return;
  var cw=Math.round(w*Math.max(0,max)/100), dw=w-cw; if (dw<=0) return;
  var x0 = flip ? x : x+cw;
  // (the user: 'have the area it can't gain back a filled-in colour to make it obvious'): solid grey
  g.fillStyle='#6c6c78'; g.fillRect(x0, y, dw, h);
  if (h>2){ g.fillStyle='#9a9aa8'; g.fillRect(x0, y, dw, 1); g.fillStyle='#4a4a54'; g.fillRect(x0, y+h-1, dw, 1); }
  g.fillStyle='#000'; g.fillRect(flip ? x0+dw-1 : x0, y, 1, h);                      // a dark edge at the ceiling
}
// rocked: he sways on his feet
var _drawEntity_R = drawEntity;
drawEntity = function(e){
  if (!(e && e.rocked>0 && e.state!=='down')) return _drawEntity_R(e);
  var x0=e.x; e.x = x0 + Math.round(Math.sin(T*0.35)*1.6);
  try { return _drawEntity_R(e); } finally { e.x = x0; }
};

/* ---- (playtest fix 2026-11-10): the top bar is drawn UNDER the people, so a boxer at the back ropes / the ref on the
   back line covered the names, bars + clock with his head. The whole ring scene sits BOX_CAMY px lower on screen now
   (the HUD stays put; game.js's camY already does this shift for the old top-rope pan) - there was spare floor at the bottom */
var BOX_CAMY = 22;
var _drawMatch_Y = drawMatch;
drawMatch = function(){
  var c = camY; if (scene==='match' && !c) camY = BOX_CAMY;
  try { return _drawMatch_Y.apply(this, arguments); } finally { camY = c; }
};
// (playtest fix) LANE: the ref walks the back line BEHIND the boxers, so the 'too close - get clear' check goes by
// side-to-side distance only there (he used to park right behind them, half hidden, cluttering the two of them)
var _refCrowded_L = refCrowded;
refCrowded = function(R){
  if (RING_MODE!=='lane') return _refCrowded_L(R);
  var w=[p1,p2];
  for (var i=0;i<2;i++){ var e=w[i]; if (e && e.state!=='down' && Math.abs(e.x-R.x)<24) return e; }
  return null;
};
