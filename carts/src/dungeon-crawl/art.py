# Dungeon Crawl Pinball's art: carts/src/dungeon-crawl/tiles.txt, palette.txt, map.txt and art.json, and the ART block in code.js.
#   python3 carts/src/dungeon-crawl/art.py carts/src/dungeon-crawl
# Written with the art toolkit (tools/devkit/art/kit.py: its header explains the pieces). This cart owns those files:
# change the pictures here, not in them. Then look at the result with
#   node tools/devkit/art/sprites.mjs carts/dungeon-crawl.nova out.png      the sprites, at their real sizes and palettes
#   node tools/devkit/art/scene.mjs carts/dungeon-crawl.nova out.png --scene decor --holes     the walls, with gaps marked
#   node tools/devkit/tiles.mjs carts/dungeon-crawl.nova out.png --from 0 --count 64 --pal 1   the tiles, with their numbers
# (pack first: node tools/pack.js carts/src/dungeon-crawl carts/dungeon-crawl.nova). Pixel values are palette indices; 0 is transparent.
#
# The table is drawn from the very numbers the ball bounces off, as Star Cadet's is: this script runs the physics block of code.js
# (the walls, the bumpers, the ramps ...) in node and reads them back, so the picture cannot drift from the game. The look is the user's
# picture (docs/reference/dungeon-crawl-table.webp): a dungeon in reds, oranges, grays and blacks. The layers:
#   BG2  the lava, 32 x 32 px repeating, seen only through the pit; it scrolls slower than the table (it lies deeper) and code.js
#        turns its colours round each few frames, so it flows and glows
#   BG1  the floor: worn cobbled flagstones, the pit's hole and its rim of steps, the banner with the logo and the sword, the arrows of the
#        guided way (their colours are lamps: code.js sets them each frame)
#   BG0  the walls: dark brick outside the playfield, iron rails along every wall of the physics, the slots' alcoves, the upper
#        flipper's plate, the torches' sconces, the lane; the playfield ramps' glowing ribbons have the high-priority bit (a ball on the
#        floor goes under them, a ball on a ramp over), and the launch ramps are wire ramps (two thin rails, high priority too)
#   Sprites: the ball (icy blue, with a halo of blue light), the flippers, the bumpers, the slingshots, the targets, the chest, the portcullises, the keys, the plaques, the
#        torches' flames and the embers (in a palette that adds light), the Pit Lord, the plunger, the logo
import json, math, os, subprocess, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../../tools/devkit/art'))
from kit import *
from lettering import big_text

HERE = os.path.dirname(os.path.abspath(__file__))


def geometry():
    """The table's numbers, from the physics block of code.js (the one place they are written)."""
    js = open(os.path.join(HERE, 'code.js'), encoding='utf8').read()
    a, b = js.index('// --- The table and its physics'), js.index('// --- Input')
    prog = ('const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));let score=0,spell=null;const SFX={};function fx(){};' + js[a:b] +
            ';console.log(JSON.stringify({WALLS,LAUNCH,RAMPS,SLOTS,CUBBIES,BUMPERS,SLINGS,STANDUPS,CHEST,PIT,KICKBACK,LANE_GATE,SLOT_GATE,GUIDE,'
            'TABLE_W,TABLE_H,LANE_X,LANE_FLOOR,UF,BR,FLEN,UFLEN,FR,REST_A,UP_A,BUMP_R,BOSS_R,HOLE_R,CUBBY_R}))')
    return json.loads(subprocess.run(['node', '-e', prog], check=True, capture_output=True, text=True).stdout)


G = geometry()
TW, TH = G['TABLE_W'], G['TABLE_H']

art = Art()
art.region('bg', 1, 599)       # background tiles: the floor, the walls, the lava (597 used)
art.region('spr', 600, 1023)   # sprites
art.backdrop('000000')
art.gradient('glow', ['000000', '0c0201', '2a0804', '4a1006'], y0=0, y1=223)    # behind the panel (the backdrop shows only there): a low fire's glow, line by line

# --- Palettes ---
art.color(200, '1a0c08', 'GLASS')                                          # the panels' fill, seen through (code.js turns blend on)
art.color(117, '120806', 'SLAB'); art.color(118, '8a2010', 'RIM')         # the menus' solid slabs and their rims
art.color(113, '1c0604', 'LED_OFF'); art.color(114, 'ff5a1c', 'LED_ON'); art.color(115, 'ffc890', 'LED_HI'); art.color(116, '050101', 'LED_BG')
floor = art.palette(1, {'stone': ramp('3e3230', 5), 'mortar': '141010', 'red': ramp('a01c18', 3), 'gold': ramp('d08a28', 2),
                        'arrow': ['4a1406', 'ff9a2c'], 'soot': '060404'})
art.color(floor.base + floor.arrow[0], floor.hexes['arrow0'], 'ARROW0'); art.color(floor.base + floor.arrow[1], floor.hexes['arrow1'], 'ARROW1')
deco = art.palette(2, {'edge': '080606', 'iron': ramp('5c5a64', 4), 'brick': ramp('3c2c28', 4), 'glow': ramp('c03a08', 4), 'gold': ramp('e0a030', 2)})
lava = art.palette(3, {'lava': ramp('b02008', 6)})
for i in range(6): art.color(lava.base + lava.lava[i], lava.hexes['lava%d' % i], 'LAVA%d' % i)
# The ball is icy blue, the one cold colour on a table of reds, oranges and greys (the user: a grey ball was not legible enough)
steel = art.sprite_palette(0, {'edge': '040818', 'ball': ramp('4a9cf0', 5), 'white': 'ffffff', 'iron': ramp('4c4a54', 3)})
red = art.sprite_palette(1, {'edge': '080404', 'red': ramp('c02820', 4), 'hot': ramp('ff8a28', 3), 'iron': ramp('5c5a64', 3), 'gold': ramp('e0a030', 2)})
fiend = art.sprite_palette(2, {'edge': '060202', 'skin': ramp('7c1810', 4), 'bone': ramp('b4a490', 3), 'eye': ramp('ffb020', 2), 'wood': ramp('5c3418', 3)})
parts = art.sprite_palette(3, {'edge': '060404', 'gold': ramp('e0a030', 3), 'stone': ramp('6a6260', 3), 'iron': ramp('4c4a54', 3), 'amber': ramp('ff7a18', 2), 'dark': '2a1a14'})
fire = art.sprite_palette(4, {'warm': ramp('e05010', 3)})                  # palettes 4 to 7 add their light (code.js: blend)
halo = art.sprite_palette(5, {'cold': ramp('1c4cb0', 3)})                # the ball's halo: blue light added under it

# --- Drawing helpers ---
def put(img, x, y, c):
    if 0 <= x < img.w and 0 <= y < img.h: img.px[y][x] = c


def seg_t(px, py, x0, y0, x1, y1):
    dx, dy = x1 - x0, y1 - y0
    L2 = dx * dx + dy * dy
    return max(0.0, min(1.0, ((px - x0) * dx + (py - y0) * dy) / L2)) if L2 else 0.0


def capsule(img, x0, y0, x1, y1, r, colour):
    """Fill the pixels within r of the segment with colour (a function (x, y, t, d, side) -> index or None, or an index)."""
    L = math.hypot(x1 - x0, y1 - y0) or 1
    for y in range(int(min(y0, y1) - r - 1), int(max(y0, y1) + r + 2)):
        for x in range(int(min(x0, x1) - r - 1), int(max(x0, x1) + r + 2)):
            px, py = x + 0.5, y + 0.5
            t = seg_t(px, py, x0, y0, x1, y1)
            cx, cy = x0 + (x1 - x0) * t, y0 + (y1 - y0) * t
            d = math.hypot(px - cx, py - cy)
            if d > r: continue
            side = ((px - x0) * -(y1 - y0) + (py - y0) * (x1 - x0)) / L
            c = colour(x, y, t, d, side) if callable(colour) else colour
            if c: put(img, x, y, c)


def disc(img, cx, cy, r, colour):
    for y in range(int(cy - r - 1), int(cy + r + 2)):
        for x in range(int(cx - r - 1), int(cx + r + 2)):
            d = math.hypot(x + 0.5 - cx, y + 0.5 - cy)
            if d <= r:
                c = colour(x, y, d) if callable(colour) else colour
                if c: put(img, x, y, c)


def sphere(img, cx, cy, r, ramp_, spec=None, edge=None, light=(-0.55, -0.7)):
    """A ball lit from the upper left: lambert along the ramp, a specular dot, a dark edge."""
    lz = math.sqrt(max(0.01, 1 - light[0] ** 2 - light[1] ** 2))
    def c(x, y, d):
        nx, ny = (x + 0.5 - cx) / r, (y + 0.5 - cy) / r
        nz = math.sqrt(max(0.0, 1 - nx * nx - ny * ny))
        I = max(0.0, nx * light[0] + ny * light[1] + nz * lz)
        if edge is not None and d > r - 1.0: return edge
        if spec is not None and I > 0.93: return spec
        return ramp_[min(len(ramp_) - 1, int(0.12 * len(ramp_) + I * (len(ramp_) - 0.4)))]
    disc(img, cx, cy, r, c)


def rail(img, x0, y0, x1, y1, w=1.5):
    """An iron rail, lit from the upper left, with a dark edge underneath for depth."""
    capsule(img, x0 + 1, y0 + 1.2, x1 + 1, y1 + 1.2, w + 0.1, deco.edge)
    nx, ny = -(y1 - y0), (x1 - x0)
    L = math.hypot(nx, ny) or 1
    lit = (nx * -0.6 + ny * -0.8) / L
    def c(x, y, t, d, side):
        s = side * (1 if lit >= 0 else -1)
        return deco.iron[3] if s > 0.5 else deco.iron[1] if s < -0.5 else deco.iron[2]
    capsule(img, x0, y0, x1, y1, w, c)


def path_len(P):
    return sum(math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]) for i in range(1, len(P)))


def along(P, d):
    for i in range(1, len(P)):
        L = math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1])
        if d <= L:
            t = d / L if L else 0
            return P[i - 1][0] + (P[i][0] - P[i - 1][0]) * t, P[i - 1][1] + (P[i][1] - P[i - 1][1]) * t, (P[i][0] - P[i - 1][0]) / (L or 1), (P[i][1] - P[i - 1][1]) / (L or 1)
        d -= L
    q = P[-1]; return q[0], q[1], 0, 1


def inside_play(x, y):
    """Is (x, y) on the playfield (inside the arch and the side walls, out of the lane)? Outside it, the walls are brick."""
    if y < 96: return math.hypot(x - 96, y - 96) < 96
    return 0 <= x < TW


# ===================================================================================================================
# The lava (BG2): 32 x 32, repeating, seen through the pit. Bands of heat that wander; code.js turns the colours round.
# ===================================================================================================================
lv = Img(32, 32)
for y in range(32):
    for x in range(32):
        v = 0.5 + 0.25 * math.sin((x + 5 * math.sin(y * 2 * math.pi / 32)) * 2 * math.pi / 32) + 0.25 * math.sin((y + 4 * math.sin(x * 2 * math.pi / 32)) * 2 * math.pi / 16)
        v += 0.12 * (hsh(x * 31 + y * 17) % 100) / 100
        lv.px[y][x] = lava.lava[min(5, max(0, int(v * 6)))]
art.scene('lava', lv, pal=lava, at=(48, 0), solid=True, region='bg')

# ===================================================================================================================
# The floor (BG1): flagstones over the whole table, the pit cut out of it, its rim and steps, the banner and the logo, the arrows
# ===================================================================================================================
flag = texture('stone', 64, 64, floor.stone, seed=3, size=13)                # worn flagstones: rounded stones, dark joints
for y in range(64):
    for x in range(64):
        if flag.px[y][x] == floor.stone[0]: flag.px[y][x] = floor.mortar        # the joints, near black
fl = Img(TW, TH)
for y in range(0, TH, 64):
    for x in range(0, TW, 64): fl.blit(flag, x, y)
P = G['PIT']
for y in range(int(P['y'] - P['r'] - 10), int(P['y'] + P['r'] + 11)):        # the pit: steps going down (three rings), then the hole
    for x in range(int(P['x'] - P['r'] - 10), int(P['x'] + P['r'] + 11)):
        d = math.hypot(x + 0.5 - P['x'], y + 0.5 - P['y'])
        if d < P['r'] - 6: fl.px[y][x] = 0                                    # the hole: the lava shows
        elif d < P['r'] + 6:
            ring = int((d - (P['r'] - 6)) / 4)                               # 0 the lowest step (darkest, lit by the lava) .. 2 the rim
            lit = (y + 0.5 - P['y']) / (d or 1)                             # the steps facing up catch the glow
            c = [floor.red[0], floor.stone[1], floor.stone[2]][ring]
            if ring == 0 and lit < -0.2: c = floor.red[1]
            if abs((d - (P['r'] - 6)) % 4) < 0.8: c = floor.mortar
            fl.px[y][x] = c
# the banner and the logo, on the floor above the pit, under the chest and its sword
bx0, by0, bw_, bh_ = 56, 318, 80, 60
for y in range(by0, by0 + bh_):
    for x in range(bx0, bx0 + bw_):
        tear = (y > by0 + bh_ - 8) and (hsh(x * 13) % 7 < (y - (by0 + bh_ - 8)))   # a torn hem
        if tear: continue
        edge = x in (bx0, bx0 + bw_ - 1) or y == by0
        fl.px[y][x] = floor.mortar if edge else (floor.red[0] if (x + y) % 9 == 0 else floor.red[1] if (x - bx0) % 12 < 10 else floor.red[0])
capsule(fl, 96, by0 - 14, 96, by0 + bh_ + 6, 1.6, lambda x, y, t, d, side: floor.stone[4] if side < 0 else floor.stone[2])   # the sword
capsule(fl, 88, by0 - 4, 104, by0 - 4, 1.6, floor.gold[1]); disc(fl, 96, by0 - 16, 2.4, floor.gold[1])
for i, word in enumerate(('DUNGEON', 'CRAWL')):
    t = big_text(word, (floor.gold[0], floor.gold[1]), scale=1, outline=floor.mortar)
    fl.blit(t, 96 - t.w // 2, by0 + 8 + i * 13)
t = big_text('PINBALL', (floor.red[1], floor.red[2]), scale=1, outline=floor.mortar)
fl.blit(t, 96 - t.w // 2, by0 + 38)
# the guided way: chevrons up the right ramp's side and round to the slots (their colours are lamps)
def chevron(img, cx, cy, ux, uy, c, w=4):
    nx, ny = -uy, ux
    for k in range(-w, w + 1):
        for j in range(2):
            put(img, int(cx + nx * k - ux * (abs(k) * 0.8 - j)), int(cy + ny * k - uy * (abs(k) * 0.8 - j)), c)
for (cx, cy) in ((148, 380), (148, 352), (148, 324), (150, 296)):
    chevron(fl, cx, cy, 0, -1, floor.arrow[1])
for (cx, cy) in ((60, 104), (124, 104)):
    chevron(fl, cx, cy, 0, -1, floor.arrow[1], w=5)
art.scene('floor', fl, pal=floor, at=(0, 0), region='bg')

# ===================================================================================================================
# The walls (BG0): brick outside the playfield, iron rails on every wall, the slots' alcoves, the lane, the ramps
# ===================================================================================================================
decor = Img(TW, TH)
hi = Img(TW, TH)                     # the ramps' cells: high priority
brick = texture('brick', 32, 16, deco.brick, bw=16, bh=8)
for y in range(TH):
    for x in range(TW):
        if not inside_play(x + 0.5, y + 0.5): decor.px[y][x] = brick.px[y % 16][x % 32]
for y in range(120, G['LANE_FLOOR']):                                       # the plunger lane: a dark channel
    for x in range(G['LANE_X'] + 2, TW - 1): decor.px[y][x] = deco.edge
for w in G['WALLS']:
    x0, y0, x1, y1 = w[:4]
    rail(decor, x0, y0, x1, y1)
for s in G['SLOTS']:                                                         # the slots' alcoves: stone inside, iron arches
    for y in range(48, G['SLOT_GATE']):
        for x in range(s['l'] + 2, s['r'] - 1):
            if decor.px[y][x] == 0: decor.px[y][x] = deco.brick[0] if (x + y) % 5 else deco.edge
    disc(decor, s['x'], s['y'], G['HOLE_R'] - 1, lambda x, y, d: deco.edge if d < G['HOLE_R'] - 2.4 else deco.glow[1])
for c in G['CUBBIES']:                                                       # the cubbies: a dark hole with a glowing lip in the wall
    disc(decor, c['x'], c['y'], G['CUBBY_R'] - 1, lambda x, y, d: deco.edge if d < G['CUBBY_R'] - 2.6 else deco.glow[2])
rail(decor, *G['LANE_GATE'], w=0.8)                                          # the lane's one-way gate: a thin wire
rail(decor, G['LANE_X'], 214, G['UF']['x'] + 2, G['UF']['y'] - 1, w=2.5)     # the upper flipper's plate
for (tx, ty) in ((5, 160), (171, 160), (5, 250), (171, 250), (5, 350), (171, 350)):   # the torches' sconces (the flames are sprites)
    capsule(decor, tx - 2, ty, tx + 2, ty, 1.5, deco.iron[2]); capsule(decor, tx, ty, tx, ty + 6, 1.2, deco.iron[1])
# the playfield ramps: glowing ribbons, a rail on each side, chevrons up them
HW = 6.5
def ribbon(P, img, mask, inner=True):
    L = path_len(P)
    d = 0.0
    while d <= L:
        x, y, ux, uy = along(P, d)
        nx, ny = -uy, ux
        for k in range(-int(HW) - 2, int(HW) + 3):
            px, py = int(round(x + nx * k)), int(round(y + ny * k))
            if not (0 <= px < TW and 0 <= py < TH): continue
            a = abs(k)
            c = deco.edge if a > HW + 0.6 else deco.iron[3 if k * (nx * -0.6 + ny * -0.8) > 0 else 1] if a > HW - 1.6 else \
                (deco.glow[3] if a < 1.5 else deco.glow[2] if a < 3.5 else deco.glow[1])
            if inner and int(y) % 16 in (3, 4) and a < 4: c = deco.gold[1]   # (every 16 px down the table: the vertical runs repeat by the tile)
            img.px[py][px] = c; mask.px[py][px] = 1
        d += 0.5
ramp_mask = Img(TW, TH)
for r in G['RAMPS']: ribbon(r['path'], hi, ramp_mask)
ribbon_mask = Img(TW, TH); ribbon_mask.px = [row[:] for row in ramp_mask.px]
# the launch ramps: wire ramps, two thin rails each (a ball rides between them, over the table)
for k in ('A', 'B'):
    Pth = G['LAUNCH'][k]['path']
    L = path_len(Pth); d = 0.0
    while d <= L:
        x, y, ux, uy = along(Pth, d)
        nx, ny = -uy, ux
        for off in (-4.5, 4.5):
            px, py = int(round(x + nx * off)), int(round(y + ny * off))
            if 0 <= px < TW and 0 <= py < TH and not ribbon_mask.px[py][px]: hi.px[py][px] = deco.iron[3] if off < 0 else deco.iron[1]; ramp_mask.px[py][px] = 1  # (under a ribbon the wire is hidden)
        d += 0.5
# split: the ramps' cells are high priority (over a ball on the floor), the rest low
lo, hiS = Img(TW, TH), Img(TW, TH)
for cy in range(TH // 8):
    for cx in range(TW // 8):
        high = any(ramp_mask.px[cy * 8 + j][cx * 8 + i] for j in range(8) for i in range(8))
        for j in range(8):
            for i in range(8):
                v = hi.px[cy * 8 + j][cx * 8 + i] or decor.px[cy * 8 + j][cx * 8 + i]
                if high: hiS.px[cy * 8 + j][cx * 8 + i] = v
                else: lo.px[cy * 8 + j][cx * 8 + i] = v
art.scene('decor', lo, pal=deco, at=(24, 0), region='bg')
art.scene('decor_hi', hiS, pal=deco, at=(24, 0), prio=1, region='bg')

# ===================================================================================================================
# Sprites
# ===================================================================================================================
b = Img(16, 16); sphere(b, 8, 8, 5, steel.ball, spec=steel.white, edge=steel.edge)
art.sprite('ball', b, pal=steel, region='spr')
im = Img(16, 16)                                                             # the halo: a soft ring of blue light round the ball
disc(im, 8, 8, 7.6, lambda x, y, d: None if d < 4.6 else halo.cold[1] if d < 6 else halo.cold[0])
art.sprite('halo', im, pal=halo, region='spr')

# the pop bumpers: an iron rim, a red cap with a rune, at rest and lit
R = G['BUMP_R']
for name, ramp_, rune in (('bump', red.red, red.hot[0]), ('bump_hit', red.hot, red.gold[1])):
    im = Img(32, 32)
    disc(im, 16, 16, R + 0.5, red.edge)
    disc(im, 16, 16, R - 0.3, lambda x, y, d: red.iron[2] if d > R - 2.4 and (x - y) < 0 else red.iron[0] if d > R - 2.4 else None)
    sphere(im, 16, 16, R - 2.6, ramp_, edge=red.edge)
    for k in range(5):                                                       # a five-pointed rune
        a0, a1 = math.radians(-90 + k * 144), math.radians(-90 + (k + 1) * 144)
        capsule(im, 16 + 5 * math.cos(a0), 16 + 5 * math.sin(a0), 16 + 5 * math.cos(a1), 16 + 5 * math.sin(a1), 0.5, rune)
    art.sprite(name, im, pal=red, region='spr')

# the flippers: five frames from rest to up (a swing lasts 4 frames up and 6 down: five are enough), two lengths (the lower ones and the
# upper one); red over an iron pivot
PIVOT = (10, 24)
FLIP_FRAMES = 5
for name, length in (('flip', G['FLEN']), ('uflip', G['UFLEN'])):
    frames = []
    for k in range(FLIP_FRAMES):
        a = G['REST_A'] + (G['UP_A'] - G['REST_A']) * k / (FLIP_FRAMES - 1)
        tx, ty = PIVOT[0] + length * math.cos(a), PIVOT[1] + length * math.sin(a)
        im = Img(48, 48)
        FR = G['FR']
        capsule(im, PIVOT[0], PIVOT[1], tx, ty, FR + 0.2, red.edge)
        def body(x, y, t, d, side, FR=FR):
            s = side / FR
            if d > FR - 1.0: return red.red[0]
            return red.hot[2] if s < -0.62 and d < FR - 1.2 else red.red[3] if s < -0.2 else red.red[2] if s < 0.35 else red.red[1]
        capsule(im, PIVOT[0], PIVOT[1], tx, ty, FR - 0.3, body)
        disc(im, PIVOT[0], PIVOT[1], 2.4, lambda x, y, d: red.gold[1] if d < 1.2 else red.iron[1])
        frames.append(im)
    art.animation(name, frames, pal=red, region='spr')

# the slingshots: an iron wedge with a red band along its face, at rest and hit (32 x 96, the right one mirrored)
for name, ramp_ in (('sling', red.red), ('sling_hit', red.hot)):
    im = Img(32, 96)
    s = G['SLINGS'][0]
    x0, y0, x1, y1 = s['x0'] - 22, s['y0'] - 476, s['x1'] - 22, s['y1'] - 476
    for y in range(96):
        for x in range(32):
            px, py = x + 0.5, y + 0.5
            if y0 <= py <= 545 - 476 and x >= x0 - 0.5:
                fx_ = x0 + (x1 - x0) * (py - y0) / (y1 - y0)
                if px <= fx_ - 2.2: put(im, x, y, red.iron[0] if px > x0 + 2.5 else red.iron[1])
    capsule(im, x0 + 0.5, y0, x1 + 0.5, y1, 2.4, red.edge)
    capsule(im, x0 + 0.5, y0, x1 + 0.5, y1, 1.8, lambda x, y, t, d, side: ramp_[min(len(ramp_) - 1, 2)] if side < -0.7 else ramp_[1] if side < 0.8 else ramp_[0])
    for (px_, py_) in ((x0 + 0.5, y0), (x1 + 0.5, y1)): disc(im, px_, py_, 2.6, lambda x, y, d: red.edge if d > 1.8 else red.gold[1])
    art.big_sprite(name, im, pal=red, region='spr')

# the targets: amber teeth on an iron foot, dark and lit (16 x 16, drawn over each slanted bar)
for name, lit in (('target', False), ('target_lit', True)):
    im = Img(16, 16)
    for y in range(4, 13):
        w = (y - 4) * 0.6 + 1
        for x in range(16):
            if abs(x + 0.5 - 8) <= w: put(im, x, y, parts.edge if abs(x + 0.5 - 8) > w - 1 or y == 12 else (parts.amber[1] if lit else parts.dark) if x < 8 else (parts.amber[0] if lit else parts.iron[0]))
    art.sprite(name, im, pal=parts, region='spr')

# the chest: wood and gold, shut; and open (a glow of gold inside)
for name, open_ in (('chest', False), ('chest_open', True)):
    im = Img(16, 16)
    for y in range(4, 14):
        for x in range(2, 14):
            edge = x in (2, 13) or y in (4, 13) or (y == 8 and not open_)
            c = fiend.edge if edge else fiend.wood[2] if y < 8 else fiend.wood[1]
            if x in (5, 10) and not edge: c = fiend.bone[1]                  # iron bands
            if open_ and 5 <= y <= 7 and 3 <= x <= 12: c = fiend.eye[1]
            put(im, x, y, c)
    put(im, 7, 9, fiend.eye[1]); put(im, 8, 9, fiend.eye[1])                 # the lock
    art.sprite(name, im, pal=fiend, region='spr')

# the portcullis on a shut slot: iron bars with points (32 x 16: the alcove's mouth)
im = Img(32, 16)
for x in range(4, 28, 4):
    capsule(im, x, 1, x, 13, 1.1, lambda X, Y, t, d, side: parts.iron[2] if side < 0 else parts.iron[0])
    put(im, x, 14, parts.iron[2]); put(im, x, 15, parts.iron[1])
capsule(im, 3, 4, 28, 4, 0.9, parts.iron[1]); capsule(im, 3, 10, 28, 10, 0.9, parts.iron[1])
art.big_sprite('portcullis', im, pal=parts, region='spr')

# a key (gold), in a cubby that still has one, and in the panel
im = Img(16, 16)
disc(im, 5, 8, 3.4, lambda x, y, d: parts.edge if d > 2.6 else None if d < 1.4 else parts.gold[2] if y < 8 else parts.gold[1])
capsule(im, 8, 8, 14, 8, 1.2, lambda x, y, t, d, side: parts.gold[2] if side < 0 else parts.gold[1])
capsule(im, 12, 9, 12, 11, 0.8, parts.gold[1]); capsule(im, 14, 9, 14, 12, 0.8, parts.gold[1])
art.sprite('key', im, pal=parts, region='spr')

# the plaques on the pit's steps: a stone tablet with the level's number (I to IV) or a skull for the Boss, dark and lit
for k in range(5):
    for lit in (False, True):
        im = Img(16, 16)
        for y in range(3, 14):
            for x in range(3, 13):
                put(im, x, y, parts.edge if x in (3, 12) or y in (3, 13) else (parts.amber[0] if lit else parts.stone[0]) if (x + y) % 7 else parts.stone[1])
        mark = parts.gold[2] if lit else parts.edge
        if k < 4:
            n = k + 1
            numer = {1: 'I', 2: 'II', 3: 'III', 4: 'IV'}[n]
            xs = 8 - len(numer) * 1.5
            for i, ch in enumerate(numer):
                cx = int(xs + i * 3)
                if ch == 'I': capsule(im, cx + 0.5, 6, cx + 0.5, 10, 0.5, mark)
                else: capsule(im, cx - 0.5, 6, cx + 1, 10, 0.5, mark); capsule(im, cx + 1, 10, cx + 2.5, 6, 0.5, mark)
        else:
            disc(im, 8, 8, 3, mark); put(im, 7, 8, parts.edge if lit else parts.stone[1]); put(im, 9, 8, parts.edge if lit else parts.stone[1])
            capsule(im, 7, 11, 9, 11, 0.5, mark)
        art.sprite('plaque%d%s' % (k + 1, '_lit' if lit else ''), im, pal=parts, region='spr')

# light that adds: a torch's flame (three frames), an ember, a glow
for k in range(3):
    im = Img(16, 16)
    sway = (k - 1) * 0.8
    for y in range(2, 15):
        h = (y - 2) / 12
        w = 3.2 * math.sin(h * math.pi * 0.95) + 0.3
        for x in range(16):
            dx = x + 0.5 - (8 + sway * (1 - h))
            if abs(dx) <= w: put(im, x, y, fire.warm[2] if abs(dx) < w * 0.4 and y > 7 else fire.warm[1] if abs(dx) < w * 0.75 else fire.warm[0])
    art.sprite('flame%d' % k, im, pal=fire, region='spr')
im = Img(8, 8); disc(im, 4, 4, 1.6, lambda x, y, d: fire.warm[2] if d < 0.8 else fire.warm[1]); art.sprite('ember', im, pal=fire, region='spr')
im = Img(16, 16); disc(im, 8, 8, 7.5, lambda x, y, d: fire.warm[2] if d < 3 else fire.warm[1] if d < 5.5 else fire.warm[0]); art.sprite('glow', im, pal=fire, region='spr')

# the plunger: a knob and a coil
im = Img(16, 16); capsule(im, 3, 4, 12, 4, 3.5, steel.edge); capsule(im, 3, 4, 12, 4, 2.8, lambda x, y, t, d, side: steel.iron[2] if side < -0.8 else steel.iron[1])
art.sprite('plunger', im, pal=steel, region='spr')
im = Img(8, 8)
for y in range(8):
    for x in range(1, 7): im.px[y][x] = steel.iron[1] if (x + y) % 4 < 2 else steel.edge
art.sprite('spring', im, pal=steel, region='spr')

# The Pit Lord: a horned demon's head, 48 x 48, rising from the lava; glaring, and roaring (when hit)
for name, roar in (('boss', False), ('boss_roar', True)):
    im = Img(48, 48)
    cx, cy = 24, 26
    for (sx, d) in ((-1, 1), (1, 1)):                                        # the horns: curving up and out
        pts = [(cx + sx * (9 + 4 * t + 8 * t * t), cy - 8 - 16 * t) for t in [i / 12 for i in range(13)]]
        for i in range(12):
            r_ = 3.2 * (1 - i / 13) + 0.6
            capsule(im, *pts[i], *pts[i + 1], r_ + 0.8, fiend.edge)
        for i in range(12):
            r_ = 3.2 * (1 - i / 13) + 0.6
            capsule(im, *pts[i], *pts[i + 1], r_, lambda x, y, t, d_, side, i=i: fiend.bone[2] if side * -sx < -0.5 else fiend.bone[1] if i < 8 else fiend.bone[0])
    for y in range(48):                                                      # the head: a broad skull narrowing to the jaw
        for x in range(48):
            u, v = (x + 0.5 - cx) / 15, (y + 0.5 - cy) / 16
            inside = u * u + max(v, -0.2) ** 2 * (1.0 if v < 0 else 1.6) < 1 and v < 1.1
            if not inside: continue
            edge = u * u + max(v, -0.2) ** 2 * (1.0 if v < 0 else 1.6) > 0.82
            shade = -0.6 * u - 0.5 * v
            put(im, x, y, fiend.edge if edge else fiend.skin[3] if shade > 0.35 else fiend.skin[2] if shade > 0 else fiend.skin[1] if shade > -0.4 else fiend.skin[0])
    for sx in (-1, 1):                                                       # the brow and the eyes, glowing
        capsule(im, cx + sx * 3, cy - 5, cx + sx * 11, cy - 8, 1.6, fiend.edge)
        disc(im, cx + sx * 7, cy - 2, 2.8 if not roar else 3.4, fiend.edge)
        disc(im, cx + sx * 7, cy - 2, 1.8 if not roar else 2.4, lambda x, y, d: fiend.eye[1] if d < 1 else fiend.eye[0])
    capsule(im, cx - 1.5, cy + 3, cx + 1.5, cy + 3, 1.0, fiend.edge)            # the nose
    mh = 7 if roar else 3                                                    # the mouth: a grin of teeth, wide open when it roars
    for y in range(cy + 7, cy + 8 + mh):
        for x in range(cx - 8, cx + 9):
            if abs(x + 0.5 - cx) < 8 - (y - cy - 7) * 0.5: put(im, x, y, fiend.edge)
    for x in range(cx - 7, cx + 8, 2):
        put(im, x, cy + 7, fiend.bone[2]); put(im, x, cy + 8, fiend.bone[1])
        if roar: put(im, x, cy + 7 + mh, fiend.bone[1])
    art.big_sprite(name, im, pal=fiend, region='spr')

# The logo for the title: three lines, gold and red, outlined in black
art.big_sprite('logo_dungeon', big_text('DUNGEON', parts.gold, scale=2, outline=parts.edge), pal=parts, region='spr')
art.big_sprite('logo_crawl', big_text('CRAWL', parts.gold, scale=2, outline=parts.edge), pal=parts, region='spr')
art.big_sprite('logo_pinball', big_text('PINBALL', red.red, scale=2, outline=red.edge), pal=red, region='spr')

art.write(sys.argv[1])
