# Star Cadet Pinball's art: carts/src/star-cadet/tiles.txt, palette.txt, map.txt and art.json, and the ART block in code.js.
#   python3 carts/src/star-cadet/art.py carts/src/star-cadet
# Written with the art toolkit (tools/devkit/art/kit.py: its header explains the pieces). This cart owns those files:
# change the pictures here, not in them. Then look at the result with
#   node tools/devkit/art/sprites.mjs carts/star-cadet.nova out.png      the sprites, at their real sizes and palettes
#   node tools/devkit/art/scene.mjs carts/star-cadet.nova out.png --scene decor --holes     the background, with gaps marked
#   node tools/devkit/tiles.mjs carts/star-cadet.nova out.png --from 0 --count 64 --pal 1   the tiles, with their numbers
# (pack first: node tools/pack.js carts/src/star-cadet carts/star-cadet.nova). Pixel values are palette indices; 0 is transparent.
#
# The table is drawn from the very numbers the ball bounces off: this script runs the physics block of code.js (the walls, the
# bumpers, the ramps ...) in node and reads them back, so the picture cannot drift from the game. The layers:
#   BG1  the deck: a glass playfield, 24 x 80 tiles (192 x 640 px): a dotted holo-grid and the painted inserts (the lane and gate
#        arrows, whose colours code.js sets each frame, so they light like lamps without a tile swap; the sockets of the rank
#        lamps), and nothing else, so deep space shows through it
#   BG0  the decor: rails, posts, the gate's hole, the ramps' ribbons, arrows and the logo, with holes where the floor shows;
#        the ramps' cells have the high-priority bit, so a ball on the floor (sprite priority 2) goes under a ramp and a ball on
#        a ramp (sprite priority 3) goes over it
#   BG2  deep space, 128 x 256 px, repeating: sparse stars, a far galaxy and a small moon, behind the deck and the panel; it scrolls
#        at under half the camera's speed (parallax), over a nebula that code.js sets line by line in the backdrop (scanline())
import json, math, os, subprocess, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../../tools/devkit/art'))
from kit import *
from lettering import big_text

HERE = os.path.dirname(os.path.abspath(__file__))


def geometry():
    """The table's numbers, from the physics block of code.js (the one place they are written)."""
    js = open(os.path.join(HERE, 'code.js'), encoding='utf8').read()
    a, b = js.index('// --- The table and its physics'), js.index('// --- Input')
    prog = ('const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));let score=0;const SFX={};function fx(){};' + js[a:b] +
            ';console.log(JSON.stringify({WALLS,ONEWAY,BUMPERS,SLINGS,STANDUPS,DROPS,RAMPS,GATE,SPIN,LANE_XS,LANE_Y,BR,FLEN,FR,REST_A,UP_A,'
            'TABLE_W,TABLE_H,LANE_X,LANE_FLOOR,KICKBACK,BUMP_R,TARGET_R}))')
    return json.loads(subprocess.run(['node', '-e', prog], check=True, capture_output=True, text=True).stdout)


G = geometry()
TW, TH = G['TABLE_W'], G['TABLE_H']

art = Art()
art.region('bg', 1, 479)       # background tiles: the floor, the decor, the stars
art.region('spr', 480, 1023)   # sprites
art.backdrop('0a0c24')

# --- Palettes ---
art.color(200, '141c3c', 'GLASS')                                          # the panel's fill, seen through (code.js turns blend on)
# The deck's palette. The grid, the plates and the rim (17 to 22) take the rank's light (code.js: applyRankLight); the insert lamps (23 to 28) are
# set each frame by code.js (lit, blinking or dark), and their names go in the manifest for it.
floor = art.palette(1, {'grid': ramp('2c3c90', 3), 'plate': ramp('121838', 2), 'rim': '070818',
                        'lampL': ['5a2a08', 'f0a030'], 'lampR': ['5a2a08', 'f0a030'], 'lampG': ['4a0c30', 'f04aa0'], 'socket': '1e2650'})
for role in ('lampL0', 'lampL1', 'lampR0', 'lampR1', 'lampG0', 'lampG1'): art.color(floor.base + getattr(floor, role), floor.hexes[role], 'INS_' + role[4:].upper())
# The LED scoreboard in the panel (overlay colours: BG palette 7 is free)
art.color(113, '1c0e06', 'LED_OFF'); art.color(114, 'ff9a20', 'LED_ON'); art.color(115, 'ffe0a0', 'LED_HI'); art.color(116, '050302', 'LED_BG')
deco = art.palette(2, {'edge': '0c0e24', 'steel': ramp('8e9cc0', 4), 'teal': ramp('2a9ab8', 4), 'amber': ramp('d8901c', 3), 'red': 'd04658', 'cyan': '7ee0f0'})
stars = art.palette(3, {'star': 'e8f0ff', 'cyan': '7ee0f0', 'gold': 'f0c860', 'dim': '4a5ab0', 'faint': '2a3070',
                        'gal': ramp('a05ab0', 3), 'moon': ramp('5a3048', 4)})
ballp = art.sprite_palette(0, {'edge': '0c0e24', 'ball': ramp('9aa8d0', 5), 'white': 'ffffff'})
flipp = art.sprite_palette(1, {'edge': '0c0e24', 'body': ramp('d04658', 4), 'light': 'f8c0a8', 'steel': ramp('8e9cc0', 3)})
bump = art.sprite_palette(2, {'edge': '0c0e24', 'rest': ramp('c03a5c', 4), 'hot': ramp('f09a3c', 4), 'cap': ramp('8e9cc0', 3), 'white': 'ffffff'})
parts = art.sprite_palette(3, {'edge': '0c0e24', 'green': ramp('3aa860', 3), 'gold': ramp('f0c040', 3), 'steel': ramp('8e9cc0', 3),
                               'dim': ramp('6a5a30', 2), 'cyan': ramp('5ad0e8', 2)})
glow = art.sprite_palette(4, {'warm': ramp('f0a040', 3)})                  # palettes 4 to 7 can be translucent: lights add up
cool = art.sprite_palette(5, {'blue': ramp('3a90e0', 3)})                  # the ball's trail and the gate's swirl, added too

# --- Drawing helpers ---
def put(img, x, y, c):
    if 0 <= x < img.w and 0 <= y < img.h: img.px[y][x] = c


def seg_t(px, py, x0, y0, x1, y1):
    dx, dy = x1 - x0, y1 - y0
    L2 = dx * dx + dy * dy
    return max(0.0, min(1.0, ((px - x0) * dx + (py - y0) * dy) / L2)) if L2 else 0.0


def capsule(img, x0, y0, x1, y1, r, colour):
    """Fill the pixels within r of the segment with colour (a function (x, y, t, d, side) -> index or None, or an index)."""
    for y in range(int(min(y0, y1) - r - 1), int(max(y0, y1) + r + 2)):
        for x in range(int(min(x0, x1) - r - 1), int(max(x0, x1) + r + 2)):
            px, py = x + 0.5, y + 0.5
            t = seg_t(px, py, x0, y0, x1, y1)
            cx, cy = x0 + (x1 - x0) * t, y0 + (y1 - y0) * t
            d = math.hypot(px - cx, py - cy)
            if d > r: continue
            L = math.hypot(x1 - x0, y1 - y0) or 1
            side = ((px - x0) * -(y1 - y0) + (py - y0) * (x1 - x0)) / L   # signed distance across the segment
            c = colour(x, y, t, d, side) if callable(colour) else colour
            if c: put(img, x, y, c)


def rail(img, x0, y0, x1, y1):
    """A wire rail 3 px wide, chrome, lit from the upper left, with a dark edge underneath for depth."""
    capsule(img, x0 + 1, y0 + 1.2, x1 + 1, y1 + 1.2, 1.6, deco.edge)
    nx, ny = -(y1 - y0), (x1 - x0)
    L = math.hypot(nx, ny) or 1
    lit = (nx * -0.6 + ny * -0.8) / L          # which side of the rail the light is on
    def c(x, y, t, d, side):
        s = side * (1 if lit >= 0 else -1)
        return deco.steel[3] if s > 0.5 else deco.steel[1] if s < -0.5 else deco.steel[2]
    capsule(img, x0, y0, x1, y1, 1.5, c)


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


# ===================================================================================================================
# The deck (BG1): glass. A dotted grid every 32 px with a small cross where the lines meet, the painted inserts, and holes elsewhere
# ===================================================================================================================
fl = Img(TW, TH)
for y in range(TH):
    for x in range(TW):
        gx, gy = x % 32, y % 32
        if gx == 0 and gy == 0: fl.px[y][x] = floor.grid[2]
        elif (gx == 0 and gy in (1, 31)) or (gy == 0 and gx in (1, 31)): fl.px[y][x] = floor.grid[1]
        elif (gx == 0 or gy == 0) and (x + y) % 3 == 0: fl.px[y][x] = floor.grid[0]

def chevrons(img, cx, ay, w, n, pitch, body, core, t=4, slope=0.8):
    """An arrow insert: n chevrons pointing up, apex of the first at (cx, ay), each w px wide and t thick, on a dark plate with a rim.
    body/core: the lamp's two roles (core is the middle line of each chevron)."""
    shape = {}
    for k in range(n):
        top = ay + k * pitch
        for y in range(int(top), int(top + w * slope / 2 + t + 1)):
            for x in range(int(cx - w / 2), int(cx + w / 2) + 1):
                dx = abs(x + 0.5 - cx)
                if dx > w / 2: continue
                v = y + 0.5 - (top + dx * slope)            # how far into the chevron's band
                if 0 <= v < t: shape[(x, y)] = core if abs(v - t / 2) < 0.8 and dx < w / 2 - 1.5 else body
    ys = [y for (_, y) in shape]; xs = [x for (x, _) in shape]
    for y in range(min(ys) - 3, max(ys) + 4):                                 # the plate: a rounded box behind the chevrons
        for x in range(min(xs) - 3, max(xs) + 4):
            ex = max(0, min(xs) - 1 - x, x - max(xs) - 1); ey = max(0, min(ys) - 1 - y, y - max(ys) - 1)
            d = math.hypot(ex, ey)
            if d <= 2.2: put(img, x, y, floor.rim if d > 1.2 else floor.plate[1] if (x + y) % 2 else floor.plate[0])
    for (x, y), c in shape.items():
        put(img, x, y, c)
        for ddx, ddy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            if (x + ddx, y + ddy) not in shape and img.px[y + ddy][x + ddx] in (floor.plate[0], floor.plate[1]): put(img, x + ddx, y + ddy, floor.rim)

chevrons(fl, 15, 442, 20, 3, 10, floor.lampL[0], floor.lampL[1])          # the left lane: under its ramp's mouth and lamp
chevrons(fl, 161, 442, 20, 3, 10, floor.lampR[0], floor.lampR[1])         # the right lane
chevrons(fl, 88, 230, 24, 3, 11, floor.lampG[0], floor.lampG[1])          # the gate, up past the bumpers

# The sockets of the nine rank lamps (code.js: RANK_LAMPS, sprites), a smile under the ringed planet
for k in range(9):
    a = math.radians(160 - k * 17.5)
    lx, ly = round(96 + 52 * math.cos(a)), round(336 + 30 * math.sin(a))
    disc(fl, lx, ly, 5.6, lambda x, y, d: floor.rim if d > 4.6 else floor.socket)
art.scene('floor', fl, pal=floor, at=(0, 0))

# ===================================================================================================================
# The decor (BG0): everything that is drawn on the table but is not a moving part
# ===================================================================================================================
decor = Img(TW, TH)
ramp_mask = Img(TW, TH)         # where the ramps' ribbons are: those cells get the high-priority bit

def chevron(img, cx, cy, up, c, w=5, t=2):
    """An arrow head pointing up (up=1) or down, w px wide each side."""
    for k in range(w):
        for j in range(t):
            y = cy + (k if up < 0 else -k) + j
            put(img, cx - k, y, c); put(img, cx + k, y, c)

# The plunger lane: a dark channel with chevrons pointing up
for y in range(0, TH):
    for x in range(G['LANE_X'] + 2, TW - 2):
        if y > 96 and y < G['LANE_FLOOR'] - 2: put(decor, x, y, deco.edge)
for y in range(150, G['LANE_FLOOR'] - 30, 56):
    chevron(decor, 184, y, 1, deco.amber[1], w=4)

# Orbit lanes: cyan chevrons up the lane
for (x0, x1) in ((12, 12), (164, 164)):
    for y in range(200, 340, 40): chevron(decor, x0, y, 1, deco.teal[1], w=4)

# The rails: every wall of the physics, exactly where it is
for w in G['WALLS']:
    x0, y0, x1, y1 = w[:4]
    if len(w) > 4 and w[4]:                                                   # a post: a round steel cap with a highlight
        for (a, b) in ((x0, y0), (x1, y1)):
            pass
        capsule(decor, x0 + 1, y0 + 1, x1 + 1, y1 + 1, w[4] + 0.6, deco.edge)
        def post(x, y, t, d, side, w=w):
            return deco.steel[3] if side < -0.5 else deco.steel[2] if d < w[4] - 0.3 else deco.steel[1]
        capsule(decor, x0, y0, x1, y1, w[4] + 0.3, post)
    else:
        rail(decor, x0, y0, x1, y1)

# The wire gates (a rail that stops a ball only one way): thin, amber, with a bead at each end
for x0, y0, x1, y1 in G['ONEWAY']:
    capsule(decor, x0, y0, x1, y1, 0.8, deco.amber[1])
    for (bx, by) in ((x0, y0), (x1, y1)): disc(decor, bx, by, 1.6, deco.amber[2])

# The gate: a hole with a lit rim
g = G['GATE']
disc(decor, g['x'], g['y'], g['r'] + 2, lambda x, y, d: deco.amber[1] if d > g['r'] + 0.8 else deco.steel[2])
disc(decor, g['x'], g['y'], g['r'] - 0.5, lambda x, y, d: deco.edge if d < g['r'] - 2.2 else deco.steel[0])

# The bumpers' bases: a dark ring on the floor under each (the bumper itself is a sprite)
for b in G['BUMPERS']:
    disc(decor, b['x'], b['y'], G['BUMP_R'] + 3, lambda x, y, d: deco.edge if d > G['BUMP_R'] + 1.5 else deco.steel[0] if d > G['BUMP_R'] + 0.5 else None)

# The ramps: a ribbon from the mouth to the exit, rails along both sides, a teal surface with chevrons running up it
HW = 6.6
for r in G['RAMPS']:
    ex, ey, tx, ty = r['ex'], r['ey'], r['tx'], r['ty']
    L = math.hypot(tx - ex, ty - ey)
    ux, uy = (tx - ex) / L, (ty - ey) / L
    nx, ny = -uy, ux
    for y in range(int(min(ey, ty)) - 10, int(max(ey, ty)) + 11):
        for x in range(int(min(ex, tx)) - 12, int(max(ex, tx)) + 13):
            px, py = x + 0.5, y + 0.5
            along = (px - ex) * ux + (py - ey) * uy
            across = (px - ex) * nx + (py - ey) * ny
            if along < 0 or along > L or abs(across) > HW + 1.2: continue
            ramp_mask.px[y][x] = 1 if 0 <= x < TW and 0 <= y < TH else 0
            if abs(across) > HW + 0.4: c = deco.edge                                         # the shadow line outside
            elif abs(across) > HW - 2.0: c = deco.steel[3] if across * (nx * -0.6 + ny * -0.8) > 0 else deco.steel[1]   # the rails
            else:
                c = deco.teal[2] if abs(across) < 2.2 else deco.teal[1]
                if int(along) % 26 in (4, 5) and abs(across) < 3.6 + 0.0:                    # chevrons, a V pointing up the ramp
                    k = abs(across)
                    if abs((int(along) % 26) - 4 - k * 0.7) < 1.2: c = deco.teal[3]
                if along < 3: c = deco.amber[2]                                              # the mouth's lip
            put(decor, x, y, c)

# Arrows and inserts painted on the floor (the lamps are sprites)
for x in (52, 88, 124): chevron(decor, x, 76, -1, deco.amber[0], w=4)       # under the top lanes: arrows down
for sx in (30, 146):                                                         # inlane arrows
    chevron(decor, sx + 8, 512, -1, deco.teal[0], w=3)
# the logo, set into the floor between the ramps and the flippers
for i, word in enumerate(('STAR', 'CADET')):
    t = big_text(word, deco.amber, scale=2, outline=deco.edge)
    decor.blit(t, 96 - t.w // 2, 432 + i * 20)
# a ringed planet on the floor, in the shadow of the bumpers: just a decoration
cx_, cy_ = 96, 336
for y in range(-26, 27):
    for x in range(-34, 35):
        d = math.hypot(x, y)
        if d <= 16:
            nx_, ny_ = x / 16, y / 16
            I = max(0.0, nx_ * -0.6 + ny_ * -0.7 + math.sqrt(max(0, 1 - nx_ * nx_ - ny_ * ny_)) * 0.5)
            put(decor, cx_ + x, cy_ + y, deco.steel[min(3, int(I * 3.6))] if d < 15 else deco.edge)
# the ring: an ellipse in front of and behind the planet
for k in range(360):
    a = math.radians(k)
    rx, ry = 31 * math.cos(a), 7 * math.sin(a)
    X, Y = cx_ + rx, cy_ + ry + 3
    front = ry > 0
    if front or abs(rx) > 15: put(decor, int(X), int(Y), deco.amber[1] if front else deco.amber[0])

# Split the decor into the low-priority cells and the ramps' cells (high priority: over a ball on the floor)
lo, hi = Img(TW, TH), Img(TW, TH)
for cy in range(TH // 8):
    for cx in range(TW // 8):
        high = any(ramp_mask.px[cy * 8 + j][cx * 8 + i] for j in range(8) for i in range(8))
        dst = hi if high else lo
        for j in range(8):
            for i in range(8): dst.px[cy * 8 + j][cx * 8 + i] = decor.px[cy * 8 + j][cx * 8 + i]
art.scene('decor', lo, pal=deco, at=(24, 0))
art.scene('decor_hi', hi, pal=deco, at=(24, 0), prio=1)

# ===================================================================================================================
# Deep space (BG2): 128 x 256, repeating both ways. Most cells are empty (the nebula in the backdrop shows); the stars are a few
# kinds of tile scattered by a hash, so a big field costs few tiles; a far galaxy and a small moon
# ===================================================================================================================
SW, SH = 128, 256
sf = Img(SW, SH)
kinds = []                                       # the star tiles: one or two specks each, a few bright ones with a cross
for k in range(14):
    t = Img(8, 8)
    x, y = 1 + hsh(k * 13 + 5) % 6, 1 + hsh(k * 7 + 11) % 6
    if k < 3:
        t.px[y][x] = stars.star
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)): t.px[y + dy][x + dx] = stars.dim
    else:
        t.px[y][x] = (stars.star, stars.cyan, stars.gold, stars.dim, stars.faint, stars.faint)[k % 6]
        if k % 3 == 0: t.px[(y + 4) % 8][(x + 3) % 8] = stars.faint
    kinds.append(t)
for cy in range(SH // 8):
    for cx in range(SW // 8):
        h = hsh(cx * 131 + cy * 977 + 3)
        if h % 100 < 34: sf.blit(kinds[(h >> 8) % len(kinds)], cx * 8, cy * 8)
# a far spiral galaxy: an ellipse of dust with a bright core
gx_, gy_ = 30, 60                                # (x 0 to 63 of the field: the table shows it, the panel shows x 64 to 127)
for y in range(-7, 8):
    for x in range(-15, 16):
        u, v = x * 0.9 + y * 0.6, -x * 0.25 + y * 0.9          # tilted
        d = math.hypot(u / 13, v / 4.5)
        arm = math.sin(math.atan2(v, u) * 2 + d * 5)
        if d < 0.35: c = stars.gal[2]
        elif d < 0.7: c = stars.gal[1] if arm > -0.3 else stars.gal[0]
        elif d < 1.0 and arm > 0.2 and (x + y) % 2: c = stars.gal[0]
        else: continue
        put(sf, gx_ + x, gy_ + y, c)
put(sf, gx_, gy_, stars.star)
# a far planet, dim and rusty (nothing grey and round in the background: that is the ball's look), lit from the upper left
sphere(sf, 40, 186, 12, stars.moon, edge=None)
for (mx_, my_, r_) in ((36, 190, 2.0), (44, 181, 1.4), (33, 182, 1.1)): disc(sf, mx_, my_, r_, stars.moon[0])
art.scene('stars', sf, pal=stars, at=(48, 0))

# ===================================================================================================================
# Sprites
# ===================================================================================================================
# The ball: 16 x 16, a polished steel sphere, 10 px across
b = Img(16, 16)
sphere(b, 8, 8, 5, ballp.ball, spec=ballp.white, edge=ballp.edge)
art.sprite('ball', b, pal=ballp, region='spr')

# The pop bumper: 32 x 32, a round cap on a skirt, at rest and lit
for name, ramp_ in (('bump', bump.rest), ('bump_hit', bump.hot)):
    im = Img(32, 32)
    R = G['BUMP_R']
    sphere(im, 16, 16, R, ramp_, edge=bump.edge)
    disc(im, 16, 16, R - 4, lambda x, y, d: bump.cap[2] if d < 3.2 else bump.cap[1] if d < R - 5 else bump.cap[0])
    sphere(im, 16, 16, 3.4, bump.cap, spec=bump.white, edge=bump.edge)
    art.sprite(name, im, pal=bump, region='spr')

# The flippers: nine frames from rest (30 degrees down) to up (28 degrees up), each 48 x 48 with the pivot at (10, 24). The right
# flipper is the left one mirrored (bigSprite's fx).
PIVOT = (10, 24)
frames = []
for k in range(9):
    a = G['REST_A'] + (G['UP_A'] - G['REST_A']) * k / 8
    tx, ty = PIVOT[0] + G['FLEN'] * math.cos(a), PIVOT[1] + G['FLEN'] * math.sin(a)
    im = Img(48, 48)
    FR = G['FR']
    capsule(im, PIVOT[0], PIVOT[1], tx, ty, FR + 0.2, flipp.edge)
    def body(x, y, t, d, side, FR=FR):
        s = side / FR                      # -1 on the light side (upper left) to 1 on the dark side
        if d > FR - 1.0: return flipp.body[0]
        return flipp.light if s < -0.62 and d < FR - 1.2 else flipp.body[3] if s < -0.2 else flipp.body[2] if s < 0.35 else flipp.body[1]
    capsule(im, PIVOT[0], PIVOT[1], tx, ty, FR - 0.3, body)
    disc(im, PIVOT[0], PIVOT[1], 2.4, lambda x, y, d: flipp.steel[2] if d < 1.2 else flipp.steel[1])
    frames.append(im)
art.animation('flip', frames, pal=flipp, region='spr')

# The slingshots: a dark wedge with a rubber band stretched along its face between two steel posts, 32 x 96, at rest (red) and hit (hot orange);
# the right one is mirrored
for name, ramp_ in (('sling', bump.rest), ('sling_hit', bump.hot)):
    im = Img(32, 96)
    s = G['SLINGS'][0]
    x0, y0, x1, y1 = s['x0'] - 22, s['y0'] - 476, s['x1'] - 22, s['y1'] - 476       # the face, placed in the picture
    for y in range(96):                                                              # the wedge: the triangle between the face and the vertical back
        for x in range(32):
            px, py = x + 0.5, y + 0.5
            if y0 <= py <= 545 - 476 and x >= x0 - 0.5:
                fx_ = x0 + (x1 - x0) * (py - y0) / (y1 - y0)
                if px <= fx_ - 2.2: put(im, x, y, bump.cap[0] if px > x0 + 2.5 else bump.cap[1])
    capsule(im, x0 + 0.5, y0, x1 + 0.5, y1, 2.4, bump.edge)                            # the rubber: an ink edge, the band, a highlight
    capsule(im, x0 + 0.5, y0, x1 + 0.5, y1, 1.8, lambda x, y, t, d, side: ramp_[3] if side < -0.7 else ramp_[2] if side < 0.8 else ramp_[1])
    for (px_, py_) in ((x0 + 0.5, y0), (x1 + 0.5, y1)): sphere(im, px_, py_, 2.6, bump.cap, spec=bump.white, edge=bump.edge)   # the posts
    art.big_sprite(name, im, pal=bump, region='spr')

# The standup targets: 32 x 32, a bar 22 px tall on the left (a left guide's, facing right; mirrored for the right guide), dark and lit
for name, hot in (('stand', False), ('stand_hit', True)):
    im = Img(32, 32)
    capsule(im, 3, 5.5, 3, 26.5, 3.0, parts.edge)
    capsule(im, 3, 5.5, 3, 26.5, 2.3, (lambda x, y, t, d, side: (parts.gold[2] if x < 3 else parts.gold[1]) if hot else (parts.green[2] if x < 3 else parts.green[1])))
    art.sprite(name, im, pal=parts, region='spr')

# The drop targets: 16 x 16, a slanted bar standing up, and the same lying flat (down)
for name, up in (('drop', True), ('drop_down', False)):
    im = Img(16, 16)
    x0, y0, x1, y1 = 3, 6, 12, 9
    if up:
        capsule(im, x0, y0, x1, y1, 3.4, parts.edge)
        capsule(im, x0, y0, x1, y1, 2.7, lambda x, y, t, d, side: parts.cyan[1] if side < -0.9 else parts.steel[2] if side < 0.6 else parts.steel[0])
    else:
        capsule(im, x0, y0 + 1, x1, y1 + 1, 1.6, parts.edge)
        capsule(im, x0, y0 + 1, x1, y1 + 1, 0.9, parts.steel[0])
    art.sprite(name, im, pal=parts, region='spr')

# Lamps: 8 x 8, off and on, and a glow (palette 4, drawn translucent) behind a lit one
for name, on in (('lamp', False), ('lamp_on', True)):
    im = Img(8, 8)
    disc(im, 4, 4, 3.4, parts.edge)
    disc(im, 4, 4, 2.5, lambda x, y, d: (parts.gold[2] if d < 1.0 else parts.gold[1]) if on else (parts.dim[1] if d < 1.4 else parts.dim[0]))
    art.sprite(name, im, pal=parts, region='spr')
gl = Img(16, 16)
disc(gl, 8, 8, 7.5, lambda x, y, d: glow.warm[2] if d < 3 else glow.warm[1] if d < 5.5 else glow.warm[0])
art.sprite('glow', gl, pal=glow, region='spr')

# Light that adds (palettes 4 and 5): a bumper's ring when it is hit (two sizes, as it spreads), sparks (bright, then fading), the ball's
# trail (three sizes, each smaller and dimmer behind it)
for name, r0, r1 in (('ring0', 9.5, 13), ('ring1', 12.5, 15.5)):
    im = Img(32, 32)
    disc(im, 16, 16, r1, lambda x, y, d, r0=r0, r1=r1: None if d < r0 else glow.warm[2] if abs(d - (r0 + r1) / 2) < 0.9 else glow.warm[1] if abs(d - (r0 + r1) / 2) < 1.6 else glow.warm[0])
    art.sprite(name, im, pal=glow, region='spr')
for name, arm, core in (('spark0', 3, 1), ('spark1', 2, 0)):      # a twinkle: a cross with a hot middle, then a smaller one
    im = Img(8, 8)
    for k in range(-arm, arm + 1):
        c = glow.warm[2] if abs(k) <= core else glow.warm[1] if abs(k) < arm else glow.warm[0]
        put(im, 4 + k, 4, c); put(im, 4, 4 + k, c)
    if core: put(im, 3, 3, glow.warm[0]); put(im, 5, 5, glow.warm[0]); put(im, 3, 5, glow.warm[0]); put(im, 5, 3, glow.warm[0])
    art.sprite(name, im, pal=glow, region='spr')
for k, rr in enumerate((4.6, 3.6, 2.6)):
    im = Img(16, 16)
    disc(im, 8, 8, rr, lambda x, y, d, k=k: cool.blue[max(0, 2 - k)] if d < 1.6 else cool.blue[max(0, 1 - k)])
    art.sprite('trail%d' % k, im, pal=cool, region='spr')

# The nine rank badges for the panel, 16 x 16: a steel disc with the rank's insignia in gold, chevrons for the first three ranks, bars for
# the next three, stars for the last three (Fleet Admiral's disc is gold)
def star5(img, cx, cy, r, c):
    pts = [(cx + (r if i % 2 == 0 else r * 0.45) * math.sin(math.pi * i / 5), cy - (r if i % 2 == 0 else r * 0.45) * math.cos(math.pi * i / 5)) for i in range(10)]
    for y in range(int(cy - r) - 1, int(cy + r) + 2):
        for x in range(int(cx - r) - 1, int(cx + r) + 2):
            px, py, inside = x + 0.5, y + 0.5, False
            for i in range(10):
                (x0, y0), (x1, y1) = pts[i], pts[(i + 1) % 10]
                if (y0 > py) != (y1 > py) and px < x0 + (py - y0) * (x1 - x0) / (y1 - y0): inside = not inside
            if inside: put(img, x, y, c)
for k in range(9):
    im = Img(16, 16)
    top = k == 8
    disc(im, 8, 8, 7.5, parts.edge)
    disc(im, 8, 8, 6.6, lambda x, y, d: (parts.gold[0] if top else parts.steel[0]) if (x - y) > 3 else (parts.gold[1] if top else parts.steel[1]))
    ink = parts.edge if top else parts.gold[2]
    n = k % 3 + 1
    if k < 3:                                    # chevrons, pointing up
        for j in range(n):
            y0 = 5 + j * 3 + (3 - n) * 1.5
            for x in range(4, 12):
                yy = int(y0 + abs(x + 0.5 - 8) * 0.6)
                put(im, x, yy, ink); put(im, x, yy + 1, ink)
    elif k < 6:                                  # bars
        for j in range(n):
            y0 = 8 - n * 1.5 + j * 3
            for x in range(4, 12): put(im, x, int(y0), ink); put(im, x, int(y0) + 1, ink)
    else:                                        # stars
        for j in range(n):
            sx = 8 + (j - (n - 1) / 2) * (4.2 if n == 3 else 5)
            star5(im, sx, 8.2, 2.8 if n == 3 else 3.4, ink)
    art.sprite('badge%d' % k, im, pal=parts, region='spr')

# The spinner: 16 x 16, four frames of a blade turning (seen from above: wide, narrowing to an edge and back)
for k, wd in enumerate((7, 5, 1, 5)):
    im = Img(16, 16)
    capsule(im, 8 - wd, 8, 8 + wd, 8, 2.0, parts.edge)
    capsule(im, 8 - wd, 8, 8 + wd, 8, 1.3, lambda x, y, t, d, side: parts.gold[2] if side < 0 else parts.gold[1])
    disc(im, 8, 8, 1.6, parts.steel[2])
    art.sprite('spin%d' % k, im, pal=parts, region='spr')

# The plunger: a knob (16 x 16) and a coil of spring (8 x 8, repeated under it)
im = Img(16, 16)
capsule(im, 3, 4, 12, 4, 3.5, parts.edge)
capsule(im, 3, 4, 12, 4, 2.8, lambda x, y, t, d, side: parts.steel[2] if side < -0.8 else parts.steel[1])
art.sprite('plunger', im, pal=parts, region='spr')
im = Img(8, 8)
for y in range(8):
    for x in range(1, 7):
        im.px[y][x] = parts.steel[1] if (x + y) % 4 < 2 else parts.edge
art.sprite('spring', im, pal=parts, region='spr')

# The logo on the title, in three lines, as big sprites in the 'parts' palette (gold with an ink outline)
for name, word, sc in (('logo_star', 'STAR', 3), ('logo_cadet', 'CADET', 3), ('logo_pinball', 'PINBALL', 2)):
    art.big_sprite(name, big_text(word, parts.gold, scale=sc, outline=parts.edge), pal=parts, region='spr')

art.write(sys.argv[1])
