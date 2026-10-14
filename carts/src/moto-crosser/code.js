// Moto Crosser: a dirt-bike racer in the style of Excitebike (docs/carts/moto-crosser.md).
// So far (steps 1-3): a four-lane test course that scrolls past a camera that keeps the bike a third
// of the way across, the bike with gas, turbo and lane changes, ramps, bumps and hills with jumps and
// landings, hurdles, mud, arrow strips, cooling pads and the engine's heat, five CPU riders, the starting
// lights and gate, places, a timer, the finish line, a results card with the standings and a pause.

// --- Layout (SPEC 4) ---

const LANES = 4, LANE_H = 24, BASE0 = 128; // the lanes' baselines are y 128, 152, 176 and 200
const CAM_OFF = 85; // the bike's centre is this far from the left of the screen
const RING = 256; // the track's columns in Map RAM, written as the camera moves

// BG0: the track at map column 0, row 0 (a ring 256 columns wide); BG1: the stands at row 28 (64 wide); BG2: the hills at row 56 (32 wide).
const T_BAND = 12, T_DIRT = 16, T_LINE = 20, T_KERB = 22, T_TYRE = 24, T_FENCE = 26, T_PLANK = 27; // BG tiles
const T_BARRIER = 28, T_POST = 29, T_POSTTOP = 30, T_CHECK = 32, T_BANNER = 34;
const PAL_SKY = 0, PAL_TRACK = 1, PAL_GATE = 2, PAL_BAND = 3, PAL_TYRE = 5;
const bikeTile = (n) => 256 + 4 * (n % 4) + 64 * (n >> 2); // a 32 x 32 sprite
const S_BIKE = 0, S_SHADOW = 8; // sprite numbers

// --- The race's numbers (SPEC 3, 5) ---

const CRUISE = 2.6, GAS_ACC = CRUISE / 90, COAST = 0.012; // px a frame: 0 to cruising speed in 1.5 s
const TURBO = 3.6, TURBO_ACC = 0.04, BOOST = 4.0, BOOST_FRAMES = 90, EASE = 0.02; // the turbo's and an arrow's speeds; how fast a bike slows to a lower target
const MUD_CAP = 1.2, MUD_EASE = 0.08, DOWNHILL_CAP = 3.0, SLOPE_PULL = 0.08; // mud; hills pull the bike by the slope times this
const G = 0.055, TAKEOFF_EPS = 0.4, HURDLE_H = 12, HURDLE_HALF = 10; // gravity; the bike's half length for hurdles
const PITCH_FRAMES = 6, CRASH_FRAMES = 72, TUMBLE_FRAMES = 48;
const HEAT_RATE = 0.45, COOL_RATE = 0.1, PUSH_COOL = 0.5, PUSH_SPEED = 0.6, RESUME_HEAT = 50, PAD_COOL = 35, PAD_LOCK = 60; // the engine (% a frame)
const LANE_FRAMES = 20; // a lane change takes a third of a second
const START_X = 120, GATE_COL = 18; // the bike's centre on the grid; the barrier's column
let TRACK_LEN = 0, FINISH_X = 0, FIN_COL = 0; // the track's length, and where the finish line is (set by setTrack)
const CARD_FRAMES = 120, LIGHTS = [30, 70, 110], GO_FRAME = 150, STALL = 30, FINISH_COAST = 150;
const BIKE_HALF = 16; // half the bike's width, for the finish
const ROW_GAP = 36; // the second row of the grid is this far behind
const RIVAL_NAMES = ['YOU', 'RED', 'YELLOW', 'GREEN', 'BLUE', 'PURPLE'];
const GRID = [[2, 0], [3, 0], [1, 1], [0, 0], [2, 1]]; // the rivals' starting [lane, row], red to purple; the player is in lane 1 of the front row, and the quicker riders start in front
const CATCH_UP_DIST = 1000, CATCH_UP = 1.04; // a rival this far behind the leader goes 4% faster
const CONTACT_DX = 24, CONTACT_HIT = 20, CONTACT_SLOW = 0.7; // bikes touch when this close; the rear one keeps 70% of its speed
const SETTLE_FRAMES = 600; // riders who haven't finished 10 s after the player are placed by distance
const AI_LOOK = 60, AI_LOOK_V = 75; // how far ahead a rival looks: this plus this times its speed

// --- Colours (BG palette 7, for the overlay) ---

const BLACK = 113, WHITE = 114, GOLD = 115, RED = 116, CYAN = 117, PANEL = 118, GREEN = 119, DIM = 120, ORANGE = 121, DUST = 126, DUST2 = 127, PURPLE = 99;
const RIDER_COLOURS = [WHITE, RED, GOLD, GREEN, CYAN, PURPLE]; // each rider's colour in the HUD, as on the track
const SHADES = { [GOLD]: [123, 124], [GREEN]: [125, 119], [RED]: [97, 98], [WHITE]: [PANEL, WHITE] }; // [side, shine]

// --- Sound ---

const SFX = { beep: 0, go: 1, finish: 2, buzz: 3, select: 4, move: 5, pause: 6, takeoff: 7, land: 8, rough: 9, crash: 10, mud: 11, arrow: 12, cool: 13, overheat: 14, restart: 15, bump: 16 };
const SFX_CH = 1;
function fx(n) { sfx(n, SFX_CH); }

// --- State ---

let state; // 'card', 'grid' (the lights), 'race', 'finish' (coasting over the line), 'results'
let timer = 0, clock = 0;
let raceT = 0; // frames since GO
let finishT = 0; // the race time in frames, once over the line
let falseStart = false, stall = 0, gateDown = false;
let filled = -1; // the last track column written to Map RAM
let camX = 0;
let riders = []; // the player is riders[0]
let parts = []; // dust
let paused = false, pauseSel = 0;
let prevMask = 0, inputMask = 0;
let seed = 1, raceSeed = 1; // the race's own generator, so a race can be replayed
let order = []; // the riders' indexes, first place first
let autoPlayer = false; // the player's bike rides itself (for tests)

function rng() {
  seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
  return seed >>> 0;
}

function newRider(x, lane, pal) {
  const skill = pal ? TRACKS[track].skills[pal - 1] : 1; // the rivals' speed ratings (red, yellow, green, blue, purple)
  return {
    x, lane, tl: lane, v: 0, z: 0, vz: 0, air: false, pitch: 0, pt: 0, heat: 0, push: false, boost: 0, noHeat: 0, crash: 0, crashes: 0, pad: null, turbo: false, mud: false,
    pal, skill, k: skill, delay: pal ? 4 + (rng() & 15) : 0, fin: false, finishT: 0, hit: 0, cool: false, aiAir: false, aiPitch: 0, daring: pal ? (rng() & 3) === 0 : false,
  };
}

function init() {
  bg(0, { mx: 0, my: 0, mw: RING, mh: 28, wrap: true, show: true });
  bg(1, { mx: 0, my: 28, mw: 64, mh: 28, wrap: true, show: true });
  bg(2, { mx: 0, my: 56, mw: 32, mh: 28, wrap: true, show: true });
  startRace(true);
}

// --- The things on the track (SPEC 6) ---

// OBJECTS (written by art.py)
const OBJ = {"rampS":{"cols":4,"rows":1,"ids":[[140],[141],[142],[143]],"prof":[0.0,1.0,2.0,3.0,4.0,5.0,6.0,7.0,8.0]},"rampM":{"cols":6,"rows":2,"ids":[[144,145],[146,145],[147,145],[148,149],[150,151],[150,152]],"prof":[0.0,1.333,2.667,4.0,5.333,6.667,8.0,9.333,10.667,12.0,13.333,14.667,16.0]},"rampL":{"cols":8,"rows":3,"ids":[[153,145,145],[154,145,145],[155,156,145],[157,158,145],[150,159,145],[150,160,161],[150,162,163],[150,162,164]],"prof":[0.0,1.5,3.0,4.5,6.0,7.5,9.0,10.5,12.0,13.5,15.0,16.5,18.0,19.5,21.0,22.5,24.0]},"bump":{"cols":5,"rows":1,"ids":[[165],[166],[167],[168],[169]],"prof":[0.0,0.477,1.727,3.273,4.523,5.0,4.523,3.273,1.727,0.477,0.0]},"hill":{"cols":16,"rows":2,"ids":[[145,145],[170,145],[171,145],[146,145],[172,145],[173,145],[174,175],[176,177],[176,177],[178,179],[180,145],[181,145],[182,145],[183,145],[184,145],[145,145]],"prof":[0.0,0.096,0.381,0.843,1.464,2.222,3.087,4.025,5.0,5.975,6.913,7.778,8.536,9.157,9.619,9.904,10.0,9.904,9.619,9.157,8.536,7.778,6.913,5.975,5.0,4.025,3.087,2.222,1.464,0.843,0.381,0.096,0.0]},"hurdle":{"cols":2,"rows":2,"ids":[[185,186],[187,188]]},"mud":{"L":[189,190,191],"m0":[192,193,194],"m1":[195,196,197],"R":[198,199,200]},"arrow":{"ids":[[201,202,203],[204,205,206]]},"cool":{"ids":[[207,208,209],[210,211,212]]}};
const BIKE_OFF = [[5,7],[5,7],[2,5],[2,5],[2,3],[2,3],[2,1],[2,1],[1,3],[1,3],[0,5],[0,5],[0,6],[0,6],[0,0],[-1,3],[-2,1],[1,-1],[2,2],[0,4],[2,1],[2,1],[0,0],[0,0]];
// END OBJECTS

// The tracks: each has a name, a length in px, a par time, the rivals' speed ratings, a look (palette changes) and its things:
// [kind, lane (0 is the far one), x in px (a multiple of 8), n]. n is the columns of mud, or the 16 px modules of an arrow strip or cooling pad.
// Kinds: rampS, rampM, rampL (up to a lip), downS, downM, downL (the same, going down: for landing on), bump, hill, hurdle, mud, arrow, cool.
// TRACKS (written by tracks.py)
const TRACKS = [
  { name: "STADIUM DIRT", len: 9600, par: 3200, skills: [1.0, 0.97, 0.94, 1.02, 0.92], look: {}, objs: [["rampS",1,640],["arrow",2,1056,2],["rampM",3,1296],["hurdle",2,1728],["bump",0,1968],["bump",0,2016],["bump",0,2064],["rampM",1,2320],["mud",2,2752,6],["hurdle",1,3024],["hurdle",2,3024],["cool",2,3248,2],["rampL",2,3488],["downL",2,3632],["hill",1,4016],["hurdle",0,4352],["hurdle",1,4352],["arrow",0,4592,3],["rampL",0,4848],["hurdle",1,5296],["bump",3,5520],["bump",3,5568],["bump",3,5616],["rampM",2,5888],["arrow",1,6320,2],["hurdle",2,6560],["hurdle",3,6560],["arrow",2,6800,2],["rampL",1,7040],["downL",1,7184],["hurdle",2,7568],["hurdle",3,7568],["cool",1,7792,2],["rampM",0,8032],["hurdle",0,8464],["hurdle",1,8464],["bump",1,8704],["bump",1,8752],["bump",1,8800],["bump",1,8848],["rampL",2,9104]] },
  { name: "DESERT RUN", len: 12000, par: 4000, skills: [1.01, 0.98, 0.95, 1.03, 0.93], look: {"set": {"0": "f4c070", "1": "ffe0a0", "2": "fff4dc", "3": "9a6a40", "4": "c08850", "5": "c8a070", "6": "8a5a2c", "7": "d8a860", "8": "f0c880", "17": "8a5a2c", "18": "d8a860", "19": "f0c880", "21": "6a4020", "22": "f8e8b8", "9": "4a2810", "10": "c86a38", "11": "f0a068", "12": "9a4a20"}}, objs: [["rampM",2,640],["hill",1,1024],["arrow",2,1328,3],["mud",1,1552,10],["hurdle",0,1792],["hurdle",1,1792],["hurdle",3,1792],["cool",3,1984,2],["rampL",1,2192],["downL",1,2336],["hill",0,2656],["hill",1,2688],["mud",2,2992,8],["arrow",1,3232,2],["rampL",0,3424],["hurdle",0,3840],["hurdle",2,3840],["bump",2,4016],["bump",2,4064],["bump",2,4112],["bump",2,4160],["mud",3,4384,12],["arrow",2,4656,3],["cool",0,4864,2],["hurdle",0,5072],["hurdle",1,5072],["rampM",1,5264],["hill",2,5648],["arrow",0,5952,2],["mud",1,6144,8],["hurdle",2,6384],["hurdle",3,6384],["rampL",3,6576],["hill",1,6976],["hill",2,7008],["cool",2,7296,2],["hurdle",0,7504],["hurdle",2,7504],["hurdle",3,7504],["rampM",0,7696],["downM",0,7824],["mud",2,8144,10],["arrow",3,8384,3],["rampL",1,8608],["hurdle",0,9008],["hurdle",1,9008],["hill",0,9200],["bump",1,9504],["bump",1,9552],["bump",1,9600],["mud",0,9808,8],["arrow",1,10048,2],["rampL",2,10256],["downL",2,10400],["hurdle",2,10720],["hurdle",3,10720],["cool",3,10912,2],["rampM",2,11120],["hurdle",1,11504],["hurdle",2,11504],["arrow",3,11696,3]] },
  { name: "NIGHT MOUNTAIN", len: 14400, par: 4800, skills: [1.02, 0.99, 0.96, 1.04, 0.94], look: {"dim": 0.42, "set": {"0": "0a1030", "1": "101c40", "2": "404c78", "3": "18283a", "4": "24405a", "5": "1c2c48", "9": "2a1408", "10": "a07048", "11": "e0b078", "12": "785030", "26": "f8d838", "27": "906010", "28": "a8e0ff", "29": "4890d8", "30": "ffffff"}}, objs: [["rampM",1,640],["rampS",2,960],["rampM",2,1160],["arrow",1,1472,2],["hurdle",0,1600],["hurdle",1,1600],["hurdle",3,1600],["mud",3,1712,8],["rampL",0,1872],["hurdle",2,2224],["hurdle",3,2224],["hill",2,2336],["arrow",3,2576,3],["rampS",0,2720],["rampM",0,2920],["hurdle",0,3232],["hurdle",2,3232],["hurdle",3,3232],["rampL",1,3344],["downL",1,3488],["mud",2,3744,10],["cool",2,3920,2],["bump",0,4064],["bump",0,4112],["bump",0,4160],["bump",0,4208],["rampM",3,4352],["hurdle",0,4656],["hurdle",1,4656],["arrow",1,4768,3],["hill",2,4912],["hill",3,4944],["hurdle",2,5168],["hurdle",3,5168],["rampS",1,5280],["rampM",1,5480],["mud",3,5792,12],["hurdle",0,5984],["hurdle",1,5984],["rampL",1,6112],["hurdle",0,6496],["hurdle",3,6496],["arrow",2,6608,2],["rampL",0,6736],["downL",0,6880],["mud",1,7136,8],["hurdle",0,7296],["hurdle",1,7296],["hurdle",3,7296],["rampS",3,7408],["rampM",3,7608],["hill",1,7936],["arrow",0,8160,3],["hurdle",2,8304],["hurdle",3,8304],["rampM",2,8416],["hurdle",0,8736],["hurdle",1,8736],["cool",1,8848,2],["mud",2,8976,12],["hurdle",0,9168],["hurdle",2,9168],["hurdle",3,9168],["rampL",3,9280],["downL",3,9424],["bump",2,9696],["bump",2,9744],["bump",2,9792],["arrow",3,9936,2],["rampS",1,10064],["rampM",1,10264],["hurdle",0,10576],["hurdle",1,10576],["rampL",0,10688],["hurdle",2,11072],["hurdle",3,11072],["mud",1,11184,10],["hurdle",0,11376],["hurdle",1,11376],["hurdle",3,11376],["hill",0,11488],["hill",1,11520],["arrow",2,11744,3],["rampM",2,11888],["downM",2,12016],["hurdle",0,12256],["hurdle",2,12256],["hurdle",3,12256],["rampL",3,12368],["hurdle",0,12720],["hurdle",1,12720],["cool",0,12832,2],["rampS",2,12976],["rampM",2,13176],["hurdle",2,13488],["hurdle",3,13488],["mud",3,13600,8],["arrow",1,13760,3],["rampL",2,13904]] },
];
// END TRACKS
let track = 0, nextTrack = 0; // the track being raced; the one chosen for the next race
const lanes = [[], [], [], []]; // each lane's things, in order
const colTiles = new Map(); // track column -> { row: map entry } for the things on it

/** Set up a track: its length and finish, its things (in the lanes and as map tiles) and its colours. */
function setTrack(i) {
  track = i;
  const t = TRACKS[i];
  TRACK_LEN = t.len; FINISH_X = START_X + TRACK_LEN; FIN_COL = FINISH_X >> 3;
  buildCourse(t.objs);
  applyLook(t.look);
}

function col(i, hex) { const v = parseInt(hex, 16); color(i, v >> 19, (v >> 11) & 31, (v >> 3) & 31); }
const dimHex = (hex, f) => { const v = parseInt(hex, 16); return [16, 8, 0].map((sh) => flr(((v >> sh) & 255) * f).toString(16).padStart(2, '0')).join(''); };

// BASE_PAL (written by art.py)
const BASE_PAL = {"0":"58a0e0","1":"a8d8f0","2":"ffffff","3":"4a7a50","4":"6a9a5a","5":"7a8ab0","6":"6a3a1e","7":"a05a2c","8":"c88040","9":"3a1c0c","10":"d49458","11":"f8d8a0","12":"b0703c","13":"e8c860","14":"c8a038","15":"907020","17":"6a3a1e","18":"a05a2c","19":"c88040","20":"f0e8d8","21":"50301a","22":"e8c890","23":"3a2410","24":"5a3818","25":"8a6038","26":"f8d838","27":"906010","28":"a8e0ff","29":"4890d8","30":"ffffff","33":"1a1010","34":"e03028","35":"f8f8f8","36":"808890","37":"f8d030","49":"10141c","50":"24303c","51":"d8a830","65":"1a1828","66":"3a4058","67":"d83a3a","68":"3a6ad8","69":"e8c83a","70":"3ab850","71":"e8b890","72":"f0f0f0","73":"a8785a","74":"2848a8","75":"c82828","81":"181818","82":"383838","83":"585858","84":"e8e8e8","85":"8a5a30","86":"b07840"};
// END BASE_PAL

/** The track's colours: the base palette, then the track's own entries, and everything else dimmed by `dim` (the night). */
function applyLook(look) {
  const eff = Object.assign({}, BASE_PAL, look.set || {});
  for (const k in eff) col(+k, look.dim && !(look.set && k in look.set) ? dimHex(eff[k], look.dim) : eff[k]);
}

function buildCourse(list) {
  colTiles.clear();
  for (const l of lanes) l.length = 0;
  for (const [kind, lane, x, n] of list) {
    const down = kind.startsWith('down'), base = down ? 'ramp' + kind.slice(4) : kind, def = OBJ[base];
    const o = { kind, lane, x0: x, x1: x, prof: null };
    const put = (col, row, id, pal, fx) => {
      if (!colTiles.has(col)) colTiles.set(col, {});
      colTiles.get(col)[row] = tile(id, pal, fx);
    };
    const c0 = x >> 3, bottom = 15 + 3 * lane; // the lane strip's last row
    if (def.prof) { // ramps, bumps, hills: tiles stacked up from the strip's bottom
      o.prof = down ? def.prof.slice().reverse() : def.prof;
      o.x1 = x + (def.prof.length - 1) * 4;
      for (let i = 0; i < def.cols; i++) for (let r = 0; r < def.rows; r++) put(c0 + i, bottom - r, def.ids[down ? def.cols - 1 - i : i][r], PAL_SKY, down);
    } else if (base === 'hurdle') {
      o.x1 = x + 16;
      for (let i = 0; i < 2; i++) for (let r = 0; r < 2; r++) put(c0 + i, bottom - r, def.ids[i][r], PAL_SKY, false);
    } else if (base === 'mud') {
      o.x1 = x + 8 * n;
      for (let i = 0; i < n; i++) {
        const k = i === 0 ? 'L' : i === n - 1 ? 'R' : ((c0 + i) & 1) === 0 ? 'm0' : 'm1';
        for (let r = 0; r < 3; r++) put(c0 + i, 13 + 3 * lane + r, def[k][r], PAL_TRACK, false);
      }
    } else { // arrow strips and cooling pads, in modules two columns wide that start on an even column
      o.x1 = x + 16 * n;
      for (let m = 0; m < n; m++) for (let i = 0; i < 2; i++) for (let r = 0; r < 3; r++) put(c0 + 2 * m + i, 13 + 3 * lane + r, def.ids[i][r], PAL_TRACK, false);
    }
    lanes[lane].push(o);
  }
}

/** The height of the ground in a lane (px above its baseline) at track position x: ramps, bumps and hills (a ramp ends in a drop). */
function groundH(lane, x) {
  for (const o of lanes[lane]) {
    if (o.prof && x >= o.x0 && x < o.x1) {
      const t = (x - o.x0) / 4, i = t | 0;
      return o.prof[i] + (o.prof[i + 1] - o.prof[i]) * (t - i);
    }
  }
  return 0;
}
/** The ground under a bike that may be changing lane: the heights of the two lanes it is between, mixed, so it never jumps. */
function groundAt(r, x) {
  const l0 = Math.floor(r.lane), l1 = Math.ceil(r.lane), f = r.lane - l0;
  return l0 === l1 ? groundH(l0, x) : groundH(l0, x) * (1 - f) + groundH(l1, x) * f;
}
const slopeAt = (lane, x) => Math.max(-0.6, Math.min(0.6, (groundH(lane, x + 1) - groundH(lane, x - 1)) / 2));
/** A slope in the bike's pitch steps (15 degrees each, nose up positive). */
const slopeStep = (sl) => Math.max(-3, Math.min(3, Math.round(Math.atan(sl) * 180 / Math.PI / 15)));
const inThing = (lane, x, kind) => lanes[lane].find((o) => o.kind === kind && x >= o.x0 && x < o.x1);

// --- The track (SPEC 6): written to Map RAM a column at a time ---

function hash(n) {
  n = Math.imul(n ^ (n >>> 15), 0x2c1b3c6d);
  n = Math.imul(n ^ (n >>> 12), 0x297a2d39);
  return (n ^ (n >>> 15)) >>> 0;
}

/** The map entry for track column c, row `row` (0-27): the HUD band, the gate and finish, the tyre wall, the four lanes, the kerb and the fence. */
function trackEntry(c, row) {
  const atGate = c === GATE_COL, atFinish = c === FIN_COL || c === FIN_COL + 1, finishPost = c === FIN_COL - 1 || c === FIN_COL + 2;
  if (row < 3) return tile(T_BAND + row, PAL_BAND);
  if (row >= 9 && row <= 12) {
    if (atGate) return tile(row === 9 ? T_POSTTOP : T_POST, PAL_GATE);
    if (finishPost) return tile(row === 9 ? T_BANNER : T_POST, PAL_GATE);
    if (atFinish && row === 9) return tile(T_BANNER, PAL_GATE);
  }
  if (row < 12) return 0;
  if (row === 12) return tile(T_TYRE + (c & 1), PAL_TYRE);
  if (row <= 24) {
    if (atFinish) return tile(T_CHECK + ((c + row) & 1), PAL_GATE);
    if (atGate && !gateDown) return tile(T_BARRIER, PAL_GATE);
    const t = colTiles.get(c);
    if (t && t[row] !== undefined) return t[row];
    const k = ((row - 13) / 3) | 0, rs = (row - 13) % 3;
    if (rs === 2 && k < LANES - 1) return tile(T_LINE + (c & 1), PAL_TRACK);
    return tile(T_DIRT + (hash(c * 7 + row * 13) & 3), PAL_TRACK);
  }
  if (row === 25) return tile(T_KERB, PAL_TRACK);
  return tile(row === 26 ? T_FENCE : T_PLANK, PAL_TYRE);
}

function writeCol(c) {
  const x = c & (RING - 1);
  for (let row = 0; row < 28; row++) mset(x, row, trackEntry(c, row));
}

/** Write track columns up to column `last`, so the screen (and the ring beyond it) is drawn. */
function streamTo(last) {
  while (filled < last) writeCol(++filled);
}

// --- Starting a race ---

function startRace(withCard, newSeed = true, t = track) {
  if (newSeed) raceSeed = rndi(1, 0x7fffffff);
  setTrack(t);
  seed = raceSeed;
  riders = [newRider(START_X, 1, 0)];
  GRID.forEach(([lane, row], k) => riders.push(newRider(START_X - row * ROW_GAP, lane, k + 1)));
  raceT = 0; finishT = 0; falseStart = false; stall = 0; gateDown = false; parts = []; paused = false;
  standings();
  camX = START_X - CAM_OFF;
  filled = -1; streamTo((camX >> 3) + 40);
  state = withCard ? 'card' : 'grid'; timer = 0; nextTrack = track;
  music(-1);
}

// --- The bike (SPEC 5) ---

/** One frame for a bike: lane changes, then speed and heat on the ground (or the air's pitch), then movement and the ground. inp: { gas, turbo, up, down, left, right }. */
const rfx = (r, n) => { if (r === riders[0] || Math.abs(r.x - riders[0].x) < 130) fx(n); }; // a rival is only heard when it is near the player

function updateRider(r, inp) {
  if (r.hit > 0) r.hit--;
  if (r.crash === 0) {
    if (inp.up) r.tl = Math.max(0, r.tl - 1);
    if (inp.down) r.tl = Math.min(LANES - 1, r.tl + 1);
  }
  const d = r.tl - r.lane, step = 1 / LANE_FRAMES;
  r.lane = Math.abs(d) <= step ? r.tl : r.lane + Math.sign(d) * step;
  const lane = Math.round(r.lane);
  if (r.crash > 0) { updateCrash(r, lane); return; }
  if (r.boost > 0) r.boost--;
  r.turbo = false;
  if (!r.air) {
    r.mud = !!inThing(lane, r.x, 'mud');
    if (r.push) pushBike(r);
    else rideOnGround(r, inp, lane);
  }
  r.x += r.v;
  const h = groundAt(r, r.x);
  if (!r.air) {
    const zf = r.z + r.vz - G; // where the bike would be if it flew on
    if (r.v > 0.3 && h < zf - TAKEOFF_EPS) { // the ground fell away: take off
      r.air = true; r.z = zf; r.vz -= G; r.pitch = slopeStep(r.vz / Math.max(0.1, r.v)); r.pt = PITCH_FRAMES - 1;
      rfx(r, SFX.takeoff);
    } else {
      r.vz = h - r.z; r.z = h; r.pitch = slopeStep(slopeAt(lane, r.x));
      pickUp(r, lane);
    }
  } else {
    if (inp.left && !inp.right) { if (++r.pt >= PITCH_FRAMES) { r.pt = 0; r.pitch = Math.min(3, r.pitch + 1); } }
    else if (inp.right && !inp.left) { if (++r.pt >= PITCH_FRAMES) { r.pt = 0; r.pitch = Math.max(-3, r.pitch - 1); } }
    else r.pt = PITCH_FRAMES - 1;
    r.vz -= G; r.z += r.vz;
    if (r.z <= h && r.vz <= 0) land(r, lane, h);
  }
  if (r.crash === 0) hurdles(r);
}

/** Gas, turbo, mud, arrows and slopes decide the speed; the turbo heats the engine, and at 100% it cuts out. */
function rideOnGround(r, inp, lane) {
  const gas = inp.gas, turbo = gas && inp.turbo && !r.mud;
  r.turbo = turbo;
  let target = gas ? (turbo ? TURBO : CRUISE) * r.k : 0;
  if (r.boost > 0) target = Math.max(target, BOOST);
  if (r.mud) target = Math.min(target, MUD_CAP);
  const fast = turbo || r.boost > 0;
  const sl = slopeAt(lane, r.x), downhill = sl < -0.02 && r.v <= DOWNHILL_CAP && !r.mud; // going downhill, the bike keeps what the slope gives it
  if (r.v < target) r.v = Math.min(target, r.v + (fast ? TURBO_ACC : GAS_ACC));
  else if (r.v > target && !downhill) r.v = Math.max(target, r.v - (r.mud ? MUD_EASE : gas || fast ? EASE : COAST));
  // Hills pull the bike back going up and push it along going down, up to the cap.
  let dv = -sl * SLOPE_PULL;
  if (dv > 0) dv = Math.min(dv, Math.max(0, Math.max(target, DOWNHILL_CAP) - r.v));
  r.v = Math.max(0, r.v + dv);
  if (turbo) { if (r.noHeat === 0) r.heat = Math.min(100, r.heat + HEAT_RATE); }
  else r.heat = Math.max(0, r.heat - COOL_RATE);
  if (r.noHeat > 0) r.noHeat--;
  if (r.heat >= 100) { r.push = true; r.boost = 0; r.v = Math.min(r.v, 1.5); rfx(r, SFX.overheat); }
}

/** The engine is dead: the rider pushes the bike, which cools until the engine can start again. */
function pushBike(r) {
  r.v += (PUSH_SPEED - r.v) * 0.2;
  r.heat = Math.max(0, r.heat - PUSH_COOL);
  if (r.heat <= RESUME_HEAT) { r.push = false; rfx(r, SFX.restart); }
}

/** Arrow strips give a boost, and cooling pads cool the engine (once as the bike goes over them). */
function pickUp(r, lane) {
  const o = lanes[lane].find((q) => (q.kind === 'arrow' || q.kind === 'cool') && r.x >= q.x0 && r.x < q.x1);
  if (!o) { r.pad = null; return; }
  if (r.pad === o) return;
  r.pad = o;
  if (o.kind === 'arrow') { r.boost = BOOST_FRAMES; rfx(r, SFX.arrow); }
  else { r.heat = Math.max(0, r.heat - PAD_COOL); r.noHeat = PAD_LOCK; rfx(r, SFX.cool); }
}

/** Landing: the bike's pitch against the ground's slope decides a clean landing, a rough one or a crash (SPEC 5.3). */
function land(r, lane, h) {
  const want = slopeStep(slopeAt(lane, r.x)), diff = Math.abs(r.pitch - want);
  r.air = false; r.z = h; r.vz = slopeAt(lane, r.x) * r.v; r.pitch = want; r.pt = 0;
  burst(r.x, baseY(r) - 2, diff >= 3 ? 12 : 6, DUST);
  for (const b of riders) if (b !== r && b.crash === 0 && !b.air && Math.abs(b.lane - r.lane) < 0.6 && Math.abs(b.x - r.x) < 20) crash(b); // landing on a bike crashes it
  if (diff >= 3) crash(r);
  else if (diff === 2) { r.v *= 0.75; rfx(r, SFX.rough); }
  else rfx(r, SFX.land);
}

/** Hitting a hurdle on or near the ground is a crash, in either lane while changing between them. */
function hurdles(r) {
  if (r.z >= HURDLE_H - 1) return;
  for (let k = 0; k < LANES; k++) {
    if (Math.abs(k - r.lane) >= 0.6) continue;
    for (const o of lanes[k]) if (o.kind === 'hurdle' && r.x + HURDLE_HALF > o.x0 && r.x - HURDLE_HALF < o.x1) { crash(r); return; }
  }
}

function crash(r) {
  r.crash = CRASH_FRAMES; r.crashes++; r.boost = 0; r.push = false; r.turbo = false;
  burst(r.x, baseY(r) - 6, 10, DUST);
  rfx(r, SFX.crash);
}

/** The bike slides and tumbles to a stop; then the rider remounts where it lies, at a standstill. */
function updateCrash(r, lane) {
  r.v *= 0.95; r.x += r.v;
  const h = groundAt(r, r.x);
  if (r.air) { r.vz -= G; r.z += r.vz; if (r.z <= h) { r.z = h; r.air = false; r.vz = 0; } }
  else { r.z = h; r.vz = 0; }
  if (--r.crash === 0) { r.v = 0; r.air = false; r.z = h; r.pitch = 0; r.vz = 0; }
}

const baseY = (r) => flr(BASE0 + LANE_H * r.lane + 0.5);

// --- Update ---

const BIT = (b) => 1 << b;
function readPad() {
  let m = 0;
  for (const b of [UP, DOWN, LEFT, RIGHT, A, B, X, Y, L, R, START, SELECT]) if (btn(b)) m |= BIT(b);
  return m;
}
const pressed = (b) => (inputMask & BIT(b)) !== 0 && (prevMask & BIT(b)) === 0;

function update() {
  inputMask = readPad();
  clock++;
  if (paused) updatePause();
  else if (state === 'card') { if (++timer >= CARD_FRAMES) { state = 'grid'; timer = 0; } }
  else if (state === 'grid') updateGrid();
  else if (state === 'race') updateRace();
  else if (state === 'finish') updateFinish();
  else if (state === 'results') updateResults();
  prevMask = inputMask;
}

/** The lights come on one by one; at GO the barrier drops. Gas before GO is a false start. */
function updateGrid() {
  timer++;
  if (pressed(START)) { paused = true; pauseSel = 0; fx(SFX.pause); return; }
  if (btn(A)) falseStart = true;
  for (const t of LIGHTS) if (timer === t) fx(SFX.beep);
  if (timer === GO_FRAME) {
    gateDown = true; writeCol(GATE_COL);
    stall = falseStart ? STALL : 0;
    fx(falseStart ? SFX.buzz : SFX.go);
    state = 'race'; raceT = 0;
  }
}

const IDLE = { gas: false, turbo: false, up: false, down: false, left: false, right: false };

function updateRace() {
  if (pressed(START)) { paused = true; pauseSel = 0; fx(SFX.pause); return; }
  raceStep();
}

/** Over the line: the bike coasts to a stop on its own, then the results; the other riders race on. */
function updateFinish() {
  raceStep();
  if (++timer >= FINISH_COAST) state = 'results';
}

/** The results come up with the places so far; they are final when every rider is over the line, or 10 seconds after the player. */
const isFinal = () => riders.every((r) => r.fin) || timer >= SETTLE_FRAMES;
function updateResults() {
  raceStep(); timer++;
  if (!isFinal()) return;
  // (Until the title and the track select come in step 5: LEFT and RIGHT choose the next track.)
  if (pressed(RIGHT)) { nextTrack = (nextTrack + 1) % TRACKS.length; fx(SFX.move); }
  if (pressed(LEFT)) { nextTrack = (nextTrack + TRACKS.length - 1) % TRACKS.length; fx(SFX.move); }
  if (pressed(START) || pressed(A)) { fx(SFX.select); startRace(false, true, nextTrack); }
}

/** One frame of the race: every rider (the player by the pad, the rest by their own judgement), then contact, places and the camera. */
function raceStep() {
  raceT++;
  const leaderX = Math.max(...riders.map((r) => r.x));
  riders.forEach((r, i) => {
    let inp;
    if (r.fin) inp = IDLE;
    else if (i === 0 && !autoPlayer) {
      const gas = stall > 0 ? false : btn(A);
      if (stall > 0) stall--;
      inp = { gas, turbo: btn(B), up: pressed(UP), down: pressed(DOWN), left: btn(LEFT), right: btn(RIGHT) };
    } else inp = aiInput(r, i);
    r.k = r.skill * (i > 0 && leaderX - r.x >= CATCH_UP_DIST ? CATCH_UP : 1);
    updateRider(r, inp);
    if (r.fin) r.v = Math.max(0, r.v - 0.03);
    else if (r.x + BIKE_HALF >= FINISH_X) {
      r.fin = true; r.finishT = raceT;
      if (i === 0) { finishT = raceT; state = 'finish'; timer = 0; fx(SFX.finish); }
    }
  });
  contacts();
  standings();
  follow(riders[0]);
  for (const r of riders) emitDust(r);
  moveParts();
}

/** First place first: riders over the line by their time, then the rest by how far they have got. */
function standings() {
  order = riders.map((_, i) => i).sort((i, j) => {
    const a = riders[i], b = riders[j];
    if (a.fin !== b.fin) return a.fin ? -1 : 1;
    return (a.fin ? a.finishT - b.finishT : b.x - a.x) || i - j;
  });
}
const placeOf = (i) => order.indexOf(i) + 1;

/** A bike that catches the one ahead in its lane loses 30% of its speed, and the one ahead is shoved aside if it can be (SPEC 7). */
function contacts() {
  for (let i = 0; i < riders.length; i++) {
    for (let j = i + 1; j < riders.length; j++) {
      const a = riders[i], b = riders[j];
      if (a.crash || b.crash || a.z > 6 || b.z > 6 || Math.abs(a.lane - b.lane) > 0.6) continue;
      const rear = a.x < b.x ? a : b, front = rear === a ? b : a;
      if (front.x - rear.x >= CONTACT_DX || rear.hit > 0) continue;
      rear.hit = CONTACT_HIT; rear.v *= CONTACT_SLOW;
      const free = [front.tl - 1, front.tl + 1].filter((L) => L >= 0 && L < LANES && !riders.some((q) => q !== front && q.tl === L && Math.abs(q.x - front.x) < 30));
      if (free.length) front.tl = free.length > 1 ? free[rng() & 1] : free[0];
      if (i === 0) fx(SFX.bump);
    }
  }
}

// --- The rivals (SPEC 7) ---

/** How bad a lane looks to a rival: what is in it for a way ahead, and who is in the way. */
function laneCost(r, L) {
  const x0 = r.x - 12, x1 = r.x + AI_LOOK + r.v * AI_LOOK_V;
  let c = Math.abs(L - r.tl) * 15;
  for (const o of lanes[L]) {
    if (o.x1 < x0 || o.x0 > x1) continue;
    if (o.kind === 'hurdle') c += 600;
    else if (o.kind === 'mud') c += 90;
    else if (o.kind.startsWith('ramp')) c += r.daring ? -15 : 40;
    else if (o.kind.startsWith('down')) c += 200;
    else if (o.kind === 'arrow') c -= 50;
    else if (o.kind === 'cool') c -= r.heat > 50 ? 45 : 0;
    else c += 5;
  }
  for (const b of riders) if (b !== r && b.tl === L && b.x > r.x && b.x - r.x < 60 && b.v <= r.v + 0.2) c += 35;
  return c;
}

/** Where a bike in the air will come down, by flying it on. */
function predictLanding(r) {
  const lane = Math.round(r.lane);
  let x = r.x, z = r.z, vz = r.vz;
  for (let t = 0; t < 200; t++) {
    x += r.v; vz -= G; z += vz;
    if (z <= groundH(lane, x) && vz <= 0) break;
  }
  return slopeStep(slopeAt(lane, x));
}

/** The pad presses for a rival this frame: gas, the turbo when the engine can take it, the lane with least in it, and the landing it means to make. */
function aiInput(r, i) {
  const inp = { gas: raceT >= r.delay, turbo: false, up: false, down: false, left: false, right: false };
  if (r.crash > 0) return inp;
  if (r.air) {
    if (!r.aiAir) { // just took off: decide how well to land, by skill
      r.aiAir = true;
      const s01 = Math.max(0, Math.min(1, (r.skill - 0.92) / 0.1)), u = rng() / 4294967296;
      const err = u < 0.10 - 0.09 * s01 ? 3 : u < 0.35 - 0.29 * s01 ? 2 : 0;
      r.aiPitch = Math.max(-3, Math.min(3, predictLanding(r) + (rng() & 1 ? err : -err)));
    }
    if (r.pitch < r.aiPitch) inp.left = true; else if (r.pitch > r.aiPitch) inp.right = true;
    return inp;
  }
  r.aiAir = false;
  if (r.push) return inp;
  if ((raceT + i) % 4 === 0) { // look at the lanes ahead
    let best = r.tl, bestC = laneCost(r, r.tl) - 12;
    for (let L = 0; L < LANES; L++) { const c = laneCost(r, L); if (c < bestC) { bestC = c; best = L; } }
    if (best < r.tl) inp.up = true; else if (best > r.tl) inp.down = true;
  }
  if (r.cool && r.heat < 55) r.cool = false;
  if (!r.cool && r.heat >= 85) r.cool = true;
  inp.turbo = !r.cool && !r.mud && Math.abs(slopeAt(Math.round(r.lane), r.x)) < 0.1;
  return inp;
}

/** The camera keeps the bike a third of the way across; the track is written ahead of it. */
function follow(r) {
  camX = Math.max(0, flr(r.x) - CAM_OFF);
  streamTo((camX >> 3) + 40);
}

/** Dust kicked up behind a moving bike, mud thrown up in a patch, and the turbo's exhaust. */
function emitDust(r) {
  const h = hash(clock * 31 + 7 + r.pal * 977);
  const on = !r.air && r.crash === 0 && r.v > 0.8;
  if (on && ((clock + r.pal) & 3) === 0) puff(r.x - 12, baseY(r) - 3 - (h & 3), -r.v * 0.4 - ((h >> 4) & 7) * 0.05, -0.25 - ((h >> 8) & 7) * 0.06, 12 + ((h >> 12) & 7), r.mud ? DUST2 : DUST);
  if (on && r.mud && (clock & 1) === 0) puff(r.x - 8, baseY(r) - 5, -0.6 - ((h >> 4) & 3) * 0.1, -0.9 - ((h >> 8) & 3) * 0.15, 14, DUST2);
  if (r.turbo && (clock & 1) === 0) puff(r.x - 15, baseY(r) - 6 - r.z, -r.v * 0.5, -0.1 - ((h >> 6) & 3) * 0.04, 8, ORANGE);
}
function moveParts() {
  for (const q of parts) { q.x += q.vx; q.y += q.vy; q.vy += 0.03; q.t--; }
  parts = parts.filter((q) => q.t > 0);
  if (parts.length > 150) parts.splice(0, parts.length - 150);
}
const puff = (x, y, vx, vy, t, c) => parts.push({ x, y, vx, vy, t, c });
/** n specks thrown out in all directions, for a landing or a crash. */
function burst(x, y, n, c) {
  for (let k = 0; k < n; k++) {
    const h = hash(k * 131 + flr(x) * 7 + flr(y) * 13 + clock);
    const a = (h & 1023) / 1024 * 6.2832, v = 0.5 + ((h >> 10) & 255) / 255;
    puff(x, y, Math.cos(a) * v, Math.sin(a) * v - 0.5, 12 + ((h >> 18) & 7), c);
  }
}

function updatePause() {
  if (pressed(UP)) { pauseSel = (pauseSel + 1) % 2; fx(SFX.move); }
  if (pressed(DOWN)) { pauseSel = (pauseSel + 1) % 2; fx(SFX.move); }
  if (pressed(B) || pressed(START) && pauseSel === 0) { paused = false; fx(SFX.pause); }
  else if (pressed(A) || pressed(START)) {
    fx(SFX.select);
    if (pauseSel === 0) paused = false; else startRace(false, false); // the same race again
  }
}

// --- Draw ---

function draw() {
  cls();
  bgscroll(0, camX & (RING * 8 - 1), 0);
  bgscroll(1, (camX >> 1) & 511, 0);
  bgscroll(2, (camX >> 2) & 255, 0);
  // Bikes in the lower lanes draw on top of those above them, and each bike on top of its shadow.
  for (const r of [...riders].sort((a, b) => b.lane - a.lane || (a.pal === 0 ? -1 : b.pal === 0 ? 1 : 0))) if (r.x > camX - 40 && r.x < camX + 296) drawRider(r);
  for (const q of parts) rectfill(flr(q.x - camX), flr(q.y), q.t > 8 ? 2 : 1, q.t > 8 ? 2 : 1, q.c);
  drawHud();
  if (state === 'card') {
    panel(40, 84, 176, 52);
    ctxt(`TRACK ${track + 1}`, 92, DIM);
    ctxt(TRACKS[track].name, 108, GOLD);
    ctxt('GET READY', 122, WHITE);
  }
  if (state === 'grid' || (state === 'race' && raceT < 50)) drawLights();
  if (state === 'race' && riders[0].push && clock % 24 < 16) ctxt('ENGINE OVERHEATED!', 70, RED);
  if (state === 'results') drawResults();
  if (paused) {
    panel(72, 80, 112, 64);
    ctxt('PAUSED', 86, GOLD);
    ['RESUME', 'RESTART RACE'].forEach((t, i) => txt(`${pauseSel === i ? '>' : ' '} ${t}`, 84, 106 + 14 * i, pauseSel === i ? WHITE : DIM));
  }
}

function drawRider(r) {
  const y = baseY(r), x = flr(r.x) - camX - 16;
  let n;
  if (r.crash > 0) { const t = CRASH_FRAMES - r.crash; n = t < TUMBLE_FRAMES ? 15 + (flr(t / 6) & 3) : 19; }
  else if (r.push) n = 20 + ((clock >> 3) & 1);
  else n = (r.pitch + 3) * 2 + (flr(r.x / 6) & 1);
  const [dx, dy] = BIKE_OFF[n];
  spr(bikeTile(n), x + dx, y - 32 - flr(r.z) + dy, { size: 32, pal: r.pal, prio: 3 });
  spr(bikeTile(14), x, y - 32, { size: 32, pal: 6, prio: 2 });
}

/** The starting lights: a red one for each tick of the count, then GO. */
function drawLights() {
  panel(100, 40, 56, 26);
  for (let i = 0; i < 3; i++) {
    const on = state === 'race' ? 2 : timer >= LIGHTS[i] ? 1 : 0;
    circfill(114 + i * 14, 53, 5, on === 2 ? GREEN : on === 1 ? RED : PANEL);
    circ(114 + i * 14, 53, 5, BLACK);
  }
  if (state === 'race') ctxt(falseStart ? 'FALSE START!' : 'GO!', 72, falseStart ? RED : GREEN);
}

const fmtTime = (f) => `${flr(f / 3600)}:${String(flr(f / 60) % 60).padStart(2, '0')}.${String(flr((f % 60) * 100 / 60)).padStart(2, '0')}`;

/** Time, speed and place, what the bike is doing, the engine's heat, and a strip showing how far along the course each rider is. */
function drawHud() {
  const r = riders[0];
  print('TIME', 8, 3, DIM);
  print(fmtTime(state === 'race' ? raceT : finishT || 0), 48, 3, WHITE);
  print('SPD', 128, 3, DIM);
  print(String(flr(r.v * 40)).padStart(3, ' '), 156, 3, WHITE);
  print('POS', 192, 3, DIM);
  print(`${placeOf(0)}/${riders.length}`, 224, 3, placeOf(0) === 1 ? GOLD : WHITE);
  const word = r.crash > 0 ? ['CRASH', RED] : r.push ? (clock % 20 < 12 ? ['PUSH', RED] : null) : r.turbo ? ['TURBO', CYAN] : r.boost > 0 ? ['BOOST', GOLD] : r.mud ? ['MUD', ORANGE] : null;
  if (word) txt(word[0], 8, 26, word[1]);
  // The engine's heat: green, then yellow from 60%, then red from 85%.
  print('TEMP', 8, 12, DIM);
  rect(44, 11, 100, 9, BLACK);
  rectfill(45, 12, 98, 7, PANEL);
  const col = r.push || r.heat >= 85 ? (clock % 10 < 5 ? RED : ORANGE) : r.heat >= 60 ? GOLD : GREEN;
  rectfill(45, 12, flr(r.heat * 0.98), 7, col);
  rectfill(45 + 59, 12, 1, 7, BLACK); rectfill(45 + 83, 12, 1, 7, BLACK);
  // How far along the course each rider is: the player's mark is the big one, on top.
  rectfill(152, 14, 96, 3, PANEL);
  for (let k = riders.length - 1; k >= 0; k--) {
    const q = riders[k], f = Math.max(0, Math.min(1, (q.x - START_X) / TRACK_LEN));
    if (k === 0) { rectfill(152 + flr(f * 91), 12, 5, 7, BLACK); rectfill(153 + flr(f * 91), 13, 3, 5, WHITE); }
    else rectfill(153 + flr(f * 91), 13, 3, 5, RIDER_COLOURS[q.pal]);
  }
}

/** The finish card: your place and time, and the standings, which settle as the others cross the line. */
function drawResults() {
  panel(24, 54, 208, 146);
  big('FINISH!', 128, 60, 2, GOLD);
  const p = placeOf(0), fin = isFinal();
  ctxt(`YOU WERE ${p}${['ST', 'ND', 'RD'][p - 1] || 'TH'}   ${fmtTime(finishT)}`, 82, WHITE);
  order.forEach((i, k) => {
    const q = riders[i], y = 98 + k * 11;
    if (i === 0) rectfill(36, y - 1, 184, 10, PANEL);
    print(`${k + 1}`, 40, y, i === 0 ? GOLD : DIM);
    rectfill(56, y + 1, 8, 6, RIDER_COLOURS[q.pal]);
    print(RIVAL_NAMES[i], 72, y, WHITE);
    print(q.fin ? fmtTime(q.finishT) : fin ? '-----' : '...', 152, y, q.fin ? WHITE : DIM);
  });
  if (fin) {
    ctxt(`< TRACK ${nextTrack + 1}  ${TRACKS[nextTrack].name} >`, 172, DIM);
    if (timer % 60 < 40) ctxt('START: RACE', 185, GOLD);
  }
}

function panel(x, y, w, h) { rectfill(x, y, w, h, BLACK); rect(x, y, w, h, PANEL); }
function txt(s, x, y, c) { print(s, x + 1, y + 1, BLACK); print(s, x, y, c); }
const ctxt = (s, y, c) => txt(s, 128 - s.length * 4, y, c);

/**
 * Chunky letters: the text is printed in the overlay's spare rows, read back, and drawn again
 * `scale` times larger with a black edge, a darker side (down and right) and a shine along top edges.
 */
function big(s, cx, y, scale, c) {
  if (scale < 2) { txt(s, flr(cx - s.length * 4), y, c); return; }
  const w = s.length * 8, cells = new Uint8Array(w * 8);
  rectfill(0, 216, w, 8, 0);
  print(s, 0, 216, WHITE);
  const on = [];
  for (let gy = 0; gy < 8; gy++) for (let gx = 0; gx < w; gx++) if (pget(gx, 216 + gy)) { on.push(gx, gy); cells[gy * w + gx] = 1; }
  rectfill(0, 216, w, 8, 0);
  const x0 = flr(cx - w * scale / 2), at = (i) => [x0 + on[i] * scale, y + on[i + 1] * scale];
  const e = scale >= 3 ? 2 : 1, [side, shine] = SHADES[c] || [BLACK, c];
  for (let i = 0; i < on.length; i += 2) { const [x, yy] = at(i); rectfill(x - 1, yy - 1, scale + 2 + e, scale + 2 + e, BLACK); }
  for (let i = 0; i < on.length; i += 2) { const [x, yy] = at(i); rectfill(x + 1, yy + 1, scale + e - 1, scale + e - 1, side); }
  for (let i = 0; i < on.length; i += 2) {
    const [x, yy] = at(i), gx = on[i], gy = on[i + 1];
    rectfill(x, yy, scale, scale, c);
    if (gy === 0 || !cells[(gy - 1) * w + gx]) rectfill(x, yy, scale, 1, shine);
  }
}
