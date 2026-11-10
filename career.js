/* =====================================================================================================================
   CAREER MODE (the user, 2026-11-10: 'add these 29 / have a career mode / you start ranked 30th / you can pick fights -
   usually only fighters close to your ranking - they get better as you go further / after fights you have training options')
   Loaded after boxing.js.
   - You make a boxer (the CREATE A BOXER screen) and start at RANK 30, under the user's 29 ranked boxers (1 = CHAMPION).
   - PICK A FIGHT: only men close to you - up to CAR_UP ranks above you and CAR_DOWN below.
   - Beat a man ranked above you = you take his spot (everyone between moves down one). Lose to a man ranked below you =
     he takes your spot. Lose to a man above = you drop one. A draw changes nothing.
   - The ranked men get better toward the top: their stats, and the CPU level (rank 20+ EASY, 10-19 NORMAL, top 9 HARD).
   - After every fight: TRAINING - pick a session (+1 to that stat, max 10): 2 sessions after a win, 1 otherwise.
   - Saved in localStorage 'box_career' after every step. CONTINUE / NEW CAREER on the menu.
   The scenes: everything runs inside the game's spare 'tour' scene (updateTour / drawTour are wrapped) while CAR.on.
   ===================================================================================================================== */
var CAR_NAMES = ['MIKE DIXON','TOMMY DUNN','BIG ED ROONEY','JUMPY MALONE','SLEEPY CROWE','AL DUKENCOFER','STINKY COOPER',
  'RAZOR ROBBINS','FIREMAN JONES','DUKE FOSTER','SMOKE SPITZ','OSCAR OGG','P.J. JACKSON','SWIFTY GISH','MARCUS KELLY',
  'T.J. SHARKEY','ALFREDO OZAR','LLOYD MCADOO','JEROME MURPHY','EUGENE GREEN','LIGHTNING LOU','A.J. MOTLEY','WILD BILL IVY',
  'FREDDY MULLER','KENNY BIGGS','ALEX ROYSTER','RED WILLIAMS','CLAYTON WEST','JIMMY WHEELER'];        // the starting rankings, 1..29
// ROUNDS (the user, 2026-11-10: 'after you reach a certain rank your matches are longer than 3 rounds - like 5, 8, 10 and
// finally 12'): by YOUR rank going in - [best rank this tier starts at, rounds]; a title fight (you or him #1) = 12
var CAR_ROUNDS = [[20, 5], [13, 8], [7, 10]], CAR_TITLE_ROUNDS = 12, CAR_BASE_ROUNDS = ROUNDS;
function carRoundsFor(me, them){ if (me===1 || them===1) return CAR_TITLE_ROUNDS; var n=CAR_BASE_ROUNDS; CAR_ROUNDS.forEach(function(t){ if (me<=t[0]) n=t[1]; }); return n; }
var CAR_UP = 2, CAR_DOWN = 2, CAR_STAT_MAX = 10, CAR_START_STAT = 3;   // (CAR_UP 3 -> 2 after the playtest: 11 fights to the title was too quick)
var CAR_HARD_FROM = 6;            // training a stat that's already this high takes 2 sessions per point
// fighting styles: stat offsets + how the CPU fights (block / cross / counter add to the difficulty's numbers)
var CAR_ARCH = {
  BALANCED: { tag:'BALANCED',        p:0,  s:0,  st:0,  c:0,  block:0,     cross:0,    counter:0 },
  SLUGGER:  { tag:'SLUGGER',         p:2,  s:-2, st:0,  c:1,  t:1,  block:-0.05, cross:0.2,  counter:0 },
  SPEED:    { tag:'SPEEDSTER',       p:-1, s:2,  st:1,  c:-1, t:-1, block:0.05,  cross:-0.1, counter:0.1 },
  COUNTER:  { tag:'COUNTER PUNCHER', p:0,  s:1,  st:0,  c:-1, block:0.1,   cross:0,    counter:0.45 },
  BRAWLER:  { tag:'BRAWLER',         p:1,  s:-1, st:0,  c:1,  t:2,  block:-0.1,  cross:0.15, counter:0 },
  PRESSURE: { tag:'PRESSURE FIGHTER',p:0,  s:0,  st:2,  c:0,  t:1,  block:-0.05, cross:0.05, counter:0 },
  CHIN:     { tag:'IRON CHIN',       p:0,  s:-1, st:0,  c:3,  t:1,  block:0,     cross:0.05, counter:0 },
  DEFENSE:  { tag:'DEFENSIVE BOXER', p:-1, s:1,  st:0,  c:0,  block:0.15,  cross:-0.1, counter:0.2 }
};
var CAR_STYLE_OF = { 'MIKE DIXON':'BALANCED', 'TOMMY DUNN':'DEFENSE', 'BIG ED ROONEY':'SLUGGER', 'JUMPY MALONE':'SPEED',
  'SLEEPY CROWE':'CHIN', 'AL DUKENCOFER':'PRESSURE', 'STINKY COOPER':'BRAWLER', 'RAZOR ROBBINS':'COUNTER', 'FIREMAN JONES':'PRESSURE',
  'DUKE FOSTER':'DEFENSE', 'SMOKE SPITZ':'SPEED', 'OSCAR OGG':'SLUGGER', 'P.J. JACKSON':'BALANCED', 'SWIFTY GISH':'SPEED',
  'MARCUS KELLY':'COUNTER', 'T.J. SHARKEY':'COUNTER', 'ALFREDO OZAR':'BRAWLER', 'LLOYD MCADOO':'CHIN', 'JEROME MURPHY':'BALANCED',
  'EUGENE GREEN':'DEFENSE', 'LIGHTNING LOU':'SPEED', 'A.J. MOTLEY':'BRAWLER', 'WILD BILL IVY':'BRAWLER', 'FREDDY MULLER':'PRESSURE',
  'KENNY BIGGS':'SLUGGER', 'ALEX ROYSTER':'BALANCED', 'RED WILLIAMS':'PRESSURE', 'CLAYTON WEST':'CHIN', 'JIMMY WHEELER':'BALANCED' };
var CAR_TRAIN = [ ['HEAVY BAG',     'pow', 'POWER',     'HARDER PUNCHES - ROCKS MORE'],
                  ['SPEED BAG',     'spd', 'SPEED',     'QUICKER FEET AND HANDS'],
                  ['ROADWORK',      'sta', 'STAMINA',   'MORE WIND - TIRES LATER'],
                  ['SPARRING',      'chn', 'CHIN',      'HARDER TO ROCK - UP QUICKER'],
                  ['MEDICINE BALL', 'tgh', 'TOUGHNESS', 'TAKES LESS DAMAGE - HEALS'] ];
var CAR_STATS = ['pow','spd','sta','chn','tgh'];

var CAR = { on:false, view:'hub', sel:0, fighting:false, save:null, opp:null, res:null, trainLeft:0, scroll:0, create:false };
function carSeed(s){ var h=2166136261; for (var i=0;i<s.length;i++){ h^=s.charCodeAt(i); h=Math.imul(h,16777619); } return function(){ h=Math.imul(h^(h>>>15),2246822507); h=Math.imul(h^(h>>>13),3266489909); h^=h>>>16; return (h>>>0)/4294967296; }; }
function carClamp(v){ return Math.max(1, Math.min(CAR_STAT_MAX, Math.round(v))); }
// the ranked men: their stats come from where they stand now (better toward the top) + their style
// BALANCE (the user, 2026-11-10: 'make the first people 29, 28, 27 bums, push-overs, super low stats - have the guys get
// progressively better'): base = 1 at rank 29 rising on a gentle curve to ~9.2 for the champion; the style offsets grow in
// as they get better (a bum's 'speciality' barely shows); ranks 27-29 never go above BUM_MAX
var BUM_RANK = 27, BUM_MAX = 2;
function carSkill(rank){ return Math.max(0, Math.min(1, (29-rank)/28)); }
function carOppStats(name, rank){
  var L=carSkill(rank), A=CAR_ARCH[CAR_STYLE_OF[name]||'BALANCED'], base=1+9*Math.pow(L, 1.25), k=Math.min(1, 0.3+L);
  var o = { pow:carClamp(base+A.p*k), spd:carClamp(base+A.s*k), sta:carClamp(base+A.st*k), chn:carClamp(base+A.c*k), tgh:carClamp(base+(A.t||0)*k) };
  if (rank>=BUM_RANK) CAR_STATS.forEach(function(s){ o[s]=Math.min(BUM_MAX, o[s]); });
  return o;
}
// how well the CPU fights (reads, blocks, hesitates, combos) - from his rank, nudged by OPTIONS > DIFFICULTY
function carAI(rank){
  var S=Math.max(0, Math.min(1, Math.pow(carSkill(rank), 0.95) + (diff-1)*0.15));   // (balance test: a straighter climb - the middle had too little bite)   // (eases in: the top few are the sharp ones)
  // (balance test 2026-11-10: rank 25 threw 10 punches in 3 rounds - the low ones are a bit busier now; disc = range +
  // stamina discipline)
  return { block:0.1+0.62*S, cross:0.25+0.1*S,   /* (title test: the champ threw 80 straights to 36 jabs and got out-boxed - the good ones jab more) */ hes:0.3*(1-S)*(1-S), think:[Math.round(22-16*S), Math.round(18-11*S)],
           wrong:0.45-0.4*S, dmg:1+0.25*S, stay:1, combo:0.1+0.6*S, read:0.05+0.55*S, punish:0.1+0.6*S, work:1-0.6*S,   /* (test 4 rematch: busier, more one-twos) */ flurry:0.5*S*S,   /* (flurries worth covering up for) */ disc:0.25+0.75*S };
}
// stats -> how he fights (the same scale for you and for them)
function carStyle(st, A, cpuRank){
  // POWER (the user: 'when you add power I didn't notice a difference' -> 'make it count'): ~7% damage a point (POW 3 = 0.89,
  // 10 = 1.38), a big straight rocks more often (rockMul) and takes more of his health for good (permMul)
  // CHIN = knockdown resistance (rocks, the count, the stay-down roll, the ceiling a knockdown costs); TOUGHNESS = punch
  // resistance (damage taken, the ceiling each hit costs, how fast health comes back)
  var t = st.tgh || CAR_START_STAT;
  var o = { tag: A ? A.tag : '', dmg: 0.8+0.05*(st.pow-1), rockMul: 0.7+0.07*(st.pow-1), permMul: 0.75+0.05*(st.pow-1),   // (toned down after the playtest: POWER-first won everything)
    pspd: 0.93+0.017*(st.spd-1),
    staCost: 1.2-0.04*(st.sta-1), staRegen: 0.8+0.05*(st.sta-1),
    rockRes: 1.6-0.12*(st.chn-1), getup: 1.3-0.06*(st.chn-1), stay: Math.max(0.4, 1.5-0.11*(st.chn-1)), kdRes: 1.3-0.07*(st.chn-1),
    tough: 0.8+0.05*(t-1), permRes: 1.3-0.07*(t-1), hpRegen: 0.7+0.07*(t-1),
    block: A ? A.block : 0, cross: A ? A.cross : 0, counter: A ? A.counter : 0, think: 1 };
  if (cpuRank){ var S=carSkill(cpuRank); o.counter *= 0.3+0.7*S; o.block *= 0.3+0.7*S; }
  return o;
}
function carSpeed(st){ return 0.88+0.04*(st.spd-1); }
function carOvr(st){ var n=0; CAR_STATS.forEach(function(s){ n+=(st[s]||CAR_START_STAT); }); return Math.round(n*2); }

/* ---- the save */
function carLoad(){ try { var s=JSON.parse(localStorage.getItem('box_career')||'null'); if (s && s.ranks && s.ranks.length===30){ if (s.stats && s.stats.tgh==null) s.stats.tgh=CAR_START_STAT; return s; } } catch(err){} return null; }
function carStore(){ try { localStorage.setItem('box_career', JSON.stringify(CAR.save)); } catch(err){} }
function carNew(){
  var rec={};
  CAR_NAMES.forEach(function(n, i){ var r=carSeed(n+'#rec'), rank=i+1; rec[n]=[8+Math.round((29-rank)*0.9+r()*6), Math.round(r()*5+(rank>20?3:0)), Math.round(r()*2), 0]; rec[n][3]=Math.round(rec[n][0]*(0.4+r()*0.4)); });
  rec['@ME']=[0,0,0,0];
  CAR.save = { cfg:Object.assign({}, CAW), name:CAW_B ? CAW_B.name : CAW.name, stats:{ pow:CAR_START_STAT, spd:CAR_START_STAT, sta:CAR_START_STAT, chn:CAR_START_STAT, tgh:CAR_START_STAT },
    ranks:CAR_NAMES.concat(['@ME']), rec:rec, fights:0, champ:false, best:30 };
  carStore();
}
function carRank(name){ return CAR.save.ranks.indexOf(name)+1; }
function carMyRank(){ return carRank('@ME'); }
function carShown(n){ return n==='@ME' ? CAR.save.name : n; }
// who you can fight now: up to CAR_UP above, CAR_DOWN below (the champion: his top challengers)
function carChoices(){
  var me=carMyRank(), R=CAR.save.ranks, out=[];
  for (var r=Math.max(1, me-CAR_UP); r<=Math.min(30, me+CAR_DOWN + (me===1 ? 1 : 0)); r++) if (r!==me) out.push(R[r-1]);
  return out;
}

/* ---- the boxers' looks: the user's 29 are created-boxer bodies (the CREATE A BOXER parts), picked per name */
var CAR_REG = {};
function carCfg(name){
  var r=carSeed(name), f=function(n){ return Math.floor(r()*n); };
  return { name:name, head:f(CAW_HEADS.length), skin:f(CAW_SKIN.length), hair:f(9), trunks:f(CAW_TRUNKS.length), band:f(CAW_BAND.length), boots:f(CAW_BOOTS.length), gloves:0 };
}
function carDef(name){ for (var i=0;i<BOXERS.length;i++) if (BOXERS[i].name===name) return BOXERS[i]; return null; }
function carRegister(name){
  if (CAR_REG[name]) return true;
  var cfg=carCfg(name); if (!cawReady(cfg.head)) return false;
  var keep=GLOVE_COL.cfront; GLOVE_COL.cfront=GLOVE_COL.front;           // (their portraits: the standard red gloves)
  var main=cawSheet(cfg, cfg.trunks);
  [name, name+'#ALT'].forEach(function(k){
    ATLAS_DATA[k] = { sheet:'caw', frames:Object.assign({}, ATLAS_DATA['BASE'].frames, BODY_FRAMES) }; ATLAS[k]=ATLAS_DATA[k].frames;
    SHEET[k]=main; READY[k]=true; SEQ[k]=Object.assign({}, SEQ[BOXERS[0].name]);
  });
  PORTRAIT[name]=cawPortrait(main); FACE[name]=[43,16];
  GLOVE_COL.cfront=keep;
  ENT_THEMES[name]=ENT_THEMES['BENNY THE BELL'];
  if (!carDef(name)) BOXERS.push({ name:name, key:'caw', nation:'', ht:'', wt:'', pw:4, sp:1.0, base:'BASE', spec:'', career:true });
  CAR_REG[name]=true;
  return true;
}
function carIdx(name){ for (var i=0;i<ROSTER.length;i++) if (ROSTER[i].name===name) return i; return -1; }
// the ranked men stay out of the exhibition / 2 player select screens
var _selPool_C = selPool;
selPool = function(){ return _selPool_C().filter(function(i){ return !ROSTER[i].career; }); };
// your boxer: the CREATE A BOXER sheets from the saved picks
function carMine(){
  Object.assign(CAW, CAR.save.cfg); CAW.name = CAR.save.name;
  if (!cawRegister()) return false;
  CAR.save.name = CAW_B.name; return true;
}

/* ---- stamina / speed / chin hooks (styleOf(e) carries the career numbers; everyone else = 1) */
var _startPunch_C = startPunch;
startPunch = function(e, mv, t0){
  var s0 = e.sta==null ? 100 : e.sta; _startPunch_C(e, mv, t0);
  var k = styleOf(e).staCost; if (k && k!==1) e.sta = Math.max(0, s0 - STA_COST[mv]*k);
};
var _punchRate_C = punchRate;
punchRate = function(e){ return _punchRate_C(e) * (styleOf(e).pspd || 1); };
var _staTick_C = staTick;
staTick = function(e){
  var s0 = e.sta; _staTick_C(e);
  var k = styleOf(e).staRegen; if (k && k!==1 && e.sta > s0) e.sta = Math.min(e.staMax==null ? 100 : e.staMax, s0 + (e.sta - s0)*k);
};
var _knockDown_C = knockDown;
knockDown = function(f){
  _knockDown_C(f);
  var k = styleOf(f).getup; if (k && match.kd && !f.cpu) match.kd.need = Math.max(4, Math.round(match.kd.need*k));
};

/* ---- starting a career fight */
var CAR_AI_KEEP = null;
function carFight(name){
  if (!carRegister(name) || !carMine()) return false;
  var me=carMyRank(), them=carRank(name), st=carOppStats(name, them), A=CAR_ARCH[CAR_STYLE_OF[name]||'BALANCED'];
  BOX_STYLE[name] = carStyle(st, A, them);
  carDef(name).sp = carSpeed(st);
  BOX_STYLE[CAW_B.name] = carStyle(CAR.save.stats, null, 0);
  CAW_B.sp = carSpeed(CAR.save.stats);
  if (!CAR_AI_KEEP) CAR_AI_KEEP = BOX_AI.slice();
  var ai = carAI(them); BOX_AI = [ai, ai, ai];
  ROUNDS = carRoundsFor(me, them);
  CAR.opp = { name:name, rank:them, myRank:me };
  CAR.fighting = true;
  var a=carIdx(CAW_B.name), b=carIdx(name);
  selIdx=a; oppIdx=b; selMode='EXHIBITION'; LADDER=null;
  startMatch(a, b, false);
  return true;
}
function carEndFightStyles(){
  if (CAW_B) delete BOX_STYLE[CAW_B.name];
  if (CAR_AI_KEEP){ BOX_AI = CAR_AI_KEEP; CAR_AI_KEEP = null; }
  ROUNDS = CAR_BASE_ROUNDS;
}
// after the fight: the result, the rankings move, then training
function carResult(){
  var M=match, w=M && M.winner, S=CAR.save, O=CAR.opp, me='@ME', R=S.ranks;
  var res = !w ? 'D' : w===p1 ? 'W' : 'L', ko = /KO/.test(M.endMsg||'') && !/DECISION/.test(M.endMsg||'');
  var r0=carMyRank(), them=carRank(O.name);
  if (res==='W' && them<r0){ R.splice(r0-1,1); R.splice(them-1,0,me); }               // take his spot
  else if (res==='L' && them>r0){ R.splice(them-1,1); R.splice(r0-1,0,O.name); }        // he takes yours
  else if (res==='L' && r0<30){ R[r0-1]=R[r0]; R[r0]=me; }                               // drop one
  var mine=S.rec[me], his=S.rec[O.name]||(S.rec[O.name]=[0,0,0,0]);
  if (res==='W'){ mine[0]++; his[1]++; if (ko) mine[3]++; }
  else if (res==='L'){ mine[1]++; his[0]++; if (ko) his[3]++; }
  else { mine[2]++; his[2]++; }
  S.fights++;
  var r1=carMyRank(), newChamp = r1===1 && !S.champ, lostTitle = S.champ && r1!==1;
  if (r1===1) S.champ = true; else if (lostTitle) S.champ = false;
  S.best = Math.min(S.best||30, r1);
  CAR.res = { res:res, ko:ko, how:M.endMsg||'', opp:O.name, from:r0, to:r1, newChamp:newChamp, lostTitle:lostTitle };
  CAR.trainLeft = res==='W' ? 2 : 1;                             // (balance 3: no KO bonus session any more)
  carStore();
}

/* ---- menus: CAREER on the main menu */
MENU_ITEMS = ['CAREER'].concat(MENU_ITEMS.filter(function(m){ return m!=='CAREER'; }));
var carMenu = null;                                      // the CONTINUE / NEW CAREER box on the main menu
var _updateTitle_C = updateTitle;
updateTitle = function(){
  if (carMenu){
    var n=carMenu.items.length;
    if (pressed['ArrowUp']){ carMenu.sel=(carMenu.sel+n-1)%n; sfx.select(); }
    if (pressed['ArrowDown']){ carMenu.sel=(carMenu.sel+1)%n; sfx.select(); }
    if (pressed['Backspace']){ carMenu=null; sfx.select(); pressed={}; return; }
    if (pStart()||pLeft()){
      var it=carMenu.items[carMenu.sel]; sfx.select();
      if (it==='CONTINUE'){ CAR.save=carLoad(); carMenu=null; carOpen(); }
      else if (it==='NEW CAREER'){ if (carMenu.sure || !carLoad()){ carMenu=null; carCreate(); } else { carMenu.sure=true; carMenu.items=['NEW CAREER','BACK']; carMenu.sel=1; } }
      else carMenu=null;
    }
    pressed={}; return;
  }
  if (!cawOpen && !ctlScreen && pStart() && MENU_ITEMS[menuSel]==='CAREER'){
    sfx.select(); pressed={};
    if (carLoad()) carMenu={ items:['CONTINUE','NEW CAREER','BACK'], sel:0 };
    else carCreate();
    return;
  }
  _updateTitle_C();
};
var _drawTitle_C = drawTitle;
drawTitle = function(){
  _drawTitle_C();
  if (!carMenu) return;
  g.fillStyle='rgba(0,0,0,0.9)'; g.fillRect(0,0,W,H);
  if (carMenu.sure){ fancyC('START OVER?', 128, 60, 'bold', 2, MT_W, null, null); drawTextC('YOUR SAVED CAREER WILL BE LOST', 128, 84, '#8c8c94'); }
  else { fancyC('CAREER', 128, 50, 'bold', 3, MT_W, null, null); var s=carLoad(); if (s){ var rk=s.ranks.indexOf('@ME')+1; drawTextC(s.name+' - '+(rk===1?'CHAMPION':'RANK '+rk), 128, 84, '#8c8c94'); } }
  for (var i=0;i<carMenu.items.length;i++){
    var sel=i===carMenu.sel, y=112+i*24, tw=fancyC(carMenu.items[i], 128, y, 'bold', 2, sel ? MT_W : MT_G, null, null);
    if (sel) menuGlove(128+tw/2+8, y-3, 3);
  }
};
// NEW CAREER: make your boxer on the CREATE A BOXER screen; its last row starts the career
function carCreate(){ CAR.create=true; openCaw(); }
var _cawFight_C = cawFight;
cawFight = function(){
  if (!CAR.create) return _cawFight_C();
  if (!cawRegister()) return;
  CAR.create=false; cawOpen=false; carNew(); carOpen();
};
var _updateCaw_C = updateCaw;
updateCaw = function(){ _updateCaw_C(); if (!cawOpen) { if (CAR.create && scene==='title') CAR.create=false; } };
var _drawCaw_C = drawCaw;
drawCaw = function(){
  if (!CAR.create) return _drawCaw_C();
  _drawCaw_C();
  var k=CAW_ROWS.length-1, y=30+k*18, sel=cawRow===k;      // the last row reads START CAREER (its logic is still 'FIGHT!')
  g.fillStyle='#000'; g.fillRect(0, y-6, 160, 16);
  drawText('START CAREER', 8, y, sel ? '#ffffff' : '#6c6c74');
  if (sel) menuGlove(8+textW('START CAREER')+6, y-4, 2);
};
// (the CREATE screen only acts on 'FIGHT!' - draw says START CAREER, the row underneath is still 'FIGHT!')

function carOpen(){ CAR.on=true; CAR.view='hub'; CAR.sel=0; CAR.fighting=false; carEndFightStyles(); scene='tour'; T=0; pressed={}; carMine(); }
function carQuit(){ CAR.on=false; CAR.fighting=false; carEndFightStyles(); scene='title'; T=0; menuSel=0; pressed={}; }

/* ---- the career screens (inside the 'tour' scene) */
var _updateTour_C = updateTour, _drawTour_C = drawTour;
updateTour = function(){ if (!CAR.on) return _updateTour_C(); carUpdate(); };
drawTour = function(){ if (!CAR.on) return _drawTour_C(); carDraw(); };
// the end of a career fight: winner screen -> START -> the result
var _updateWinner_C = updateWinner;
updateWinner = function(){
  if (!(CAR.on && CAR.fighting)) return _updateWinner_C();
  if (!pStart()){ pressed={}; return; }
  entMusicStop(); pressed={}; T=0;
  carResult(); carEndFightStyles(); CAR.fighting=false;
  scene='tour'; CAR.view='result'; CAR.sel=0;
  if (CAR.res.newChamp){ if (sfx.cheer) sfx.cheer(0.5); sfx.roar(); }
};
// the pause menu's MAIN MENU in a career fight: no result, back to the main menu (the save is as it was before the fight)
var _tourEnd_C = typeof tourEnd==='function' ? tourEnd : function(){};
tourEnd = function(){ if (CAR.on){ CAR.on=false; CAR.fighting=false; carEndFightStyles(); } return _tourEnd_C(); };

var CAR_HUB = ['PICK A FIGHT', 'RANKINGS', 'MAIN MENU'];
function carNav(n){
  if (pressed['ArrowUp']){ CAR.sel=(CAR.sel+n-1)%n; sfx.select(); }
  if (pressed['ArrowDown']){ CAR.sel=(CAR.sel+1)%n; sfx.select(); }
}
function carOK(){ return T>12 && (pStart()||pLeft()||pRight()); }
function carUpdate(){
  var V=CAR.view;
  if (V==='hub'){
    carNav(CAR_HUB.length);
    if (carOK()){ sfx.select(); var it=CAR_HUB[CAR.sel];
      if (it==='PICK A FIGHT'){ CAR.view='pick'; CAR.sel=0; T=0; carChoices().forEach(carRegister); }
      else if (it==='RANKINGS'){ CAR.view='rank'; CAR.scroll=Math.max(0, carMyRank()-8); T=0; }
      else { carQuit(); return; } }
    else if (pressed['Backspace']){ carQuit(); return; }
  }
  else if (V==='pick'){
    var C=carChoices(); carNav(C.length);
    C.forEach(carRegister);
    if (carOK()){ sfx.select(); CAR.view='vs'; CAR.pick=C[CAR.sel]; T=0; }
    else if (pressed['Backspace']){ sfx.select(); CAR.view='hub'; CAR.sel=0; T=0; }
  }
  else if (V==='vs'){
    if (carOK()){ sfx.select(); pressed={}; if (carFight(CAR.pick)) return; }
    else if (pressed['Backspace']){ sfx.select(); CAR.view='pick'; T=0; }
  }
  else if (V==='rank'){
    if (pressed['ArrowUp']) CAR.scroll=Math.max(0, CAR.scroll-1);
    if (pressed['ArrowDown']) CAR.scroll=Math.min(30-CAR_RANK_ROWS, CAR.scroll+1);
    if (pressed['Backspace'] || carOK()){ sfx.select(); CAR.view='hub'; CAR.sel=1; T=0; }
  }
  else if (V==='result'){
    if (carOK()){ sfx.select(); CAR.view='train'; CAR.sel=0; T=0; }
  }
  else if (V==='train'){
    carNav(CAR_TRAIN.length);
    if (carOK()){
      var k=CAR_TRAIN[CAR.sel][1], S=CAR.save.stats;
      var PR = CAR.save.prog || (CAR.save.prog = {});
      if (S[k]>=CAR_STAT_MAX){ sfx.select(); }
      else { var half = S[k]>=CAR_HARD_FROM && !PR[k];
        if (half){ PR[k]=1; CAR.lastTrain=CAR_TRAIN[CAR.sel][2]+' HALF WAY'; } else { S[k]++; PR[k]=0; CAR.lastTrain=CAR_TRAIN[CAR.sel][2]+' UP'; }
        CAR.trainLeft--; CAR.trainFlash=40; sfx.select(); carStore();
        if (CAR.trainLeft<=0 || CAR_TRAIN.every(function(t){ return S[t[1]]>=CAR_STAT_MAX; })){ CAR.view='hub'; CAR.sel=0; T=0; } }
    }
  }
  if (CAR.trainFlash>0) CAR.trainFlash--;
  pressed={};
}

/* ---- drawing */
var CAR_RANK_ROWS = 13;
function carRecStr(n){ var r=CAR.save.rec[n]||[0,0,0,0]; return r[0]+'-'+r[1]+'-'+r[2]; }
function carRankStr(r){ return r===1 ? 'CHAMPION' : 'RANK '+r; }
function carBar(x, y, v, w, col){
  g.fillStyle='#000'; g.fillRect(x-1,y-1,w+2,6); g.fillStyle='#1c1c24'; g.fillRect(x,y,w,4);
  var fw=Math.round(w*v/CAR_STAT_MAX); g.fillStyle=col||'#38c8e8'; g.fillRect(x,y,fw,4); g.fillStyle='rgba(255,255,255,0.35)'; g.fillRect(x,y,fw,1);
  g.fillStyle='rgba(0,0,0,0.5)'; for (var k=1;k<CAR_STAT_MAX;k++) g.fillRect(x+Math.round(w*k/CAR_STAT_MAX), y, 1, 4);
}
function carPortrait(name, x, y, red, mirror){ var i=carIdx(name); if (i>=0) bigPortrait(i, x, y, 86, 64, red, mirror); }
function carStatsBlock(st, x, y, w){
  CAR_TRAIN.forEach(function(t, i){ var yy=y+i*13, v=st[t[1]]||CAR_START_STAT; drawText(t[2]==='TOUGHNESS' ? 'TOUGH' : t[2], x, yy, '#a0a0a8'); carBar(x+48, yy+1, v, w, '#38c8e8'); drawText(String(v), x+52+w, yy, '#ffffff'); });
}
function carDraw(){
  menuBG();
  var V=CAR.view, S=CAR.save; if (!S) return;
  var me=carMyRank(), myName=S.name;
  if (V==='hub'){
    menuHead('CAREER', 6);
    carPortrait(myName, 12, 34, false, false);
    fancyC(myName, 55, 104, 'bold', 1, MT_W, null, null, 100);
    drawTextC(carRankStr(me), 55, 118, me===1 ? '#ffd020' : '#ffffff');
    drawTextC('RECORD '+carRecStr('@ME'), 55, 130, '#8c8c94');
    drawTextC(S.rec['@ME'][3]+' KO', 55, 142, '#8c8c94');
    carStatsBlock(S.stats, 112, 38, 70);
    drawText('OVERALL', 112, 110, '#a0a0a8'); drawText(String(carOvr(S.stats)), 164, 110, '#ffffff');
    drawText('BEST RANK', 112, 124, '#a0a0a8'); drawText(S.best===1 ? 'CHAMP' : String(S.best||30), 172, 124, '#ffffff');
    for (var i=0;i<CAR_HUB.length;i++){
      var sel=i===CAR.sel, y=162+i*20, tw=fancyC(CAR_HUB[i], 128, y, 'bold', 1, sel ? MT_W : MT_G, null, null);
      if (sel) menuGlove(128+tw/2+8, y-4, 2);
    }
  }
  else if (V==='pick'){
    menuHead('PICK A FIGHT', 6);
    drawTextC('YOU ARE '+carRankStr(me)+' - YOU CAN FIGHT MEN CLOSE TO YOUR RANK', 128, 28, '#8c8c94');
    var C=carChoices();
    for (var j=0;j<C.length;j++){
      var n=C[j], r=carRank(n), sel=j===CAR.sel, y=46+j*30, st=carOppStats(n, r), A=CAR_ARCH[CAR_STYLE_OF[n]];
      if (sel){ g.fillStyle='#14161e'; g.fillRect(6, y-4, W-12, 28); g.fillStyle='#c8a040'; g.fillRect(6, y-4, 2, 28); }
      drawText(r===1 ? 'CHAMP' : String(r), 14, y+5, r<me ? '#ffd020' : '#8c8c94');
      var im=PORTRAIT[n], f=FACE[n]||[43,16];
      if (imgOk(im)) g.drawImage(im, f[0]-11, f[1]-9, 22, 22, 44, y-2, 22, 22);
      drawText(n, 72, y, sel ? '#ffffff' : '#a0a0a8');
      drawText(A.tag, 72, y+11, '#6c6c74');
      drawText(carRecStr(n), 176, y, '#8c8c94');
      drawText('OVR '+carOvr(st), 176, y+11, carOvr(st) > carOvr(S.stats)+8 ? '#ff7050' : carOvr(st) < carOvr(S.stats)-8 ? '#60d060' : '#ffd020');
      if (sel) menuGlove(232, y+3, 2);
    }
    drawTextC(r ? 'BEAT A MAN RANKED ABOVE YOU TO TAKE HIS SPOT' : '', 128, 210, '#6c6c74');
    drawTextC('B BACK', 128, 224, '#6c6c74');
  }
  else if (V==='vs'){
    var o=CAR.pick, orank=carRank(o), ost=carOppStats(o, orank);
    menuHead(orank===1 ? 'TITLE FIGHT' : me===1 ? 'TITLE DEFENCE' : 'FIGHT NIGHT', 6);
    carPortrait(myName, 8, 32, false, false); carPortrait(o, W-94, 32, true, true);
    fancyC('VS', 128, 56, 'bold', 2, MT_W, null, null);
    fancyC(myName, 51, 102, 'bold', 1, MT_W, null, null, 96); fancyC(o, W-51, 102, 'bold', 1, MT_W, null, null, 96);
    drawTextC(carRankStr(me), 51, 116, '#8c8c94'); drawTextC(carRankStr(orank), W-51, 116, '#8c8c94');
    drawTextC(carRecStr('@ME'), 51, 128, '#6c6c74'); drawTextC(carRecStr(o), W-51, 128, '#6c6c74');
    drawTextC(CAR_ARCH[CAR_STYLE_OF[o]].tag, W-51, 140, '#a0a0a8');
    fancyC(carRoundsFor(me, orank)+' ROUNDS', 128, 84, 'bold', 1, ['#ffd020'], null, null);
    carStatsBlock(S.stats, 6, 150, 40); carStatsBlock(ost, 134, 150, 40);
    if ((T>>4)&1) drawTextC('PRESS START', 128, 226, '#ffffff');
  }
  else if (V==='rank'){
    menuHead('RANKINGS', 6);
    for (var k=0;k<CAR_RANK_ROWS;k++){
      var rr=CAR.scroll+k+1; if (rr>30) break;
      var nm=S.ranks[rr-1], mine=nm==='@ME', y2=32+k*14;
      if (mine){ g.fillStyle='#1a2440'; g.fillRect(8, y2-3, W-16, 13); }
      drawText(rr===1 ? 'C' : String(rr), 14, y2, rr===1 ? '#ffd020' : '#8c8c94');
      drawText(carShown(nm), 36, y2, mine ? '#ffffff' : rr===1 ? '#ffd020' : '#c0c0c8');
      drawText(carRecStr(nm), 180, y2, '#6c6c74');
    }
    if (CAR.scroll>0) drawTextC('UP', 128, 22, '#6c6c74');
    if (CAR.scroll<30-CAR_RANK_ROWS) drawTextC('DOWN', 128, 216, '#6c6c74');
  }
  else if (V==='result'){
    var R=CAR.res, col = R.res==='W' ? MT_W : MT_G;
    menuHead(R.newChamp ? 'NEW CHAMPION' : R.res==='W' ? 'VICTORY' : R.res==='L' ? 'DEFEAT' : 'DRAW', 14);
    carPortrait(myName, 85, 42, false, false);
    drawTextC((R.res==='W' ? 'BEAT ' : R.res==='L' ? 'LOST TO ' : 'DREW WITH ')+R.opp, 128, 118, '#ffffff');
    if (R.how) drawTextC(R.how, 128, 130, '#8c8c94');
    var mv = R.to<R.from ? 'UP TO '+carRankStr(R.to) : R.to>R.from ? 'DOWN TO '+carRankStr(R.to) : 'STILL '+carRankStr(R.to);
    if (R.newChamp) mv='THE WORLD CHAMPION'; if (R.lostTitle) mv='LOST THE TITLE - NOW '+carRankStr(R.to);
    fancyC(mv, 128, 150, 'bold', 1, R.to<R.from||R.newChamp ? ['#ffd020'] : col, null, null, 240);
    drawTextC('RECORD '+carRecStr('@ME'), 128, 168, '#8c8c94');
    drawTextC(CAR.trainLeft+' TRAINING SESSION'+(CAR.trainLeft>1?'S':'')+' NEXT', 128, 190, '#6c6c74');
    if ((T>>4)&1) drawTextC('PRESS START', 128, 214, '#ffffff');
  }
  else if (V==='train'){
    menuHead('TRAINING', 6);
    drawTextC('PICK '+CAR.trainLeft+' MORE SESSION'+(CAR.trainLeft>1?'S':''), 128, 30, '#8c8c94');
    for (var t=0;t<CAR_TRAIN.length;t++){
      var T_=CAR_TRAIN[t], sel2=t===CAR.sel, y3=46+t*30, v=S.stats[T_[1]]||CAR_START_STAT, full=v>=CAR_STAT_MAX;
      if (sel2){ g.fillStyle='#14161e'; g.fillRect(8, y3-4, W-16, 27); g.fillStyle='#c8a040'; g.fillRect(8, y3-4, 2, 27); }
      drawText(T_[0], 18, y3, sel2 ? '#ffffff' : '#a0a0a8');
      var pr=(S.prog||{})[T_[1]], hard=v>=CAR_HARD_FROM;
      drawText(full ? 'MAXED' : hard ? (pr ? T_[2]+' +1 NOW' : T_[2]+' HALF') : T_[2]+' +1', 18, y3+12, full ? '#6c6c74' : hard && !pr ? '#ffd020' : '#60d060');
      if (pr && !full){ g.fillStyle='#ffd020'; g.fillRect(100+Math.round(100*v/CAR_STAT_MAX), y3+1, Math.round(50/CAR_STAT_MAX), 4); }
      drawText(T_[3], 100, y3+12, '#6c6c74');
      carBar(100, y3+1, v, 100, '#38c8e8'); drawText(String(v), 206, y3, '#ffffff');
      if (sel2) menuGlove(226, y3, 2);
    }
    if (CAR.trainFlash>0) fancyC(CAR.lastTrain, 128, 204, 'bold', 1, ['#ffd020'], null, null);
  }
}
