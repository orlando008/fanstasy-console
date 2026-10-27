# Flow State's art: carts/src/flow-state/tiles.txt, palette.txt, map.txt and art.json, and the ART block in code.js.
#   python3 carts/src/flow-state/art.py carts/src/flow-state
# Written with the art toolkit (tools/devkit/art/kit.py: its header explains the pieces). This cart owns those files:
# change the pictures here, not in them. Then look at the result with
#   node tools/devkit/art/sprites.mjs carts/flow-state.nova out.png      the sprites, at their real sizes and palettes
#   node tools/devkit/art/scene.mjs carts/flow-state.nova out.png --scene river --holes     a background, with gaps marked
#   node tools/devkit/tiles.mjs carts/flow-state.nova out.png --from 0 --count 64 --pal 1   the tiles, with their numbers
# (pack first: node tools/pack.js carts/src/flow-state carts/flow-state.nova). Pixel values are palette indices; 0 is transparent.
#
# The layers (spec sections 4 and 12): BG2 is the river, a 1024 x 1024 picture of water between two banks that code.js draws in
# perspective (affine, a new matrix on every line) and scrolls toward the frog; BG1 is the far bank and the stars; BG0 the near reeds.
# The sprites are the lily pads (three sizes, by distance), the frog (four frames) and the sun or moon. The five times of day are
# not separate pictures: code.js tints the palettes below (and the sky and the haze it sets line by line), so every colour here is
# the colour at noon.
import math, os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../../tools/devkit/art'))
from kit import *

art = Art()
art.region('bg', 1, 639)       # background tiles: the river is the most of them
art.region('spr', 640, 1023)   # sprites (a 16 px sprite takes four tiles)
art.backdrop('68a8e0')
art.color(200, '121a3a', 'GLASS')                                          # the panels' fill, seen through (blend() in code.js)
art.color(1, '10143a', 'SHADOW')                                           # the overlay's text shadow
art.color(3, '3a4c88', 'PANEL')                                            # its frames and rules
art.color(10, 'a8bcf0', 'DIM')                                             # its quiet text

# --- Palettes (BG 1 to 3, sprites 0 to 2); all in the light of noon ---
RIVER = art.palette(1, {'w': ramp('2a78a8', 5, at=2, step=0.08), 'leaf': ramp('3c9a44', 2), 'foam': 'd8f0f8', 'grass': ramp('4a8a2e', 3, at=1, step=0.1),
                        'dirt': ramp('7a5c3a', 2), 'bloom': ['f0e8a0', 'f4a8c8']})
FAR = art.palette(2, {'hill': recede(ramp('3a7a4a', 3), 0.5, '9cd0ec'), 'tree': recede(ramp('245a34', 3), 0.35, '9cd0ec'), 'star': 'ffffff'})
NEAR = art.palette(3, {'reed': ramp('6a9a32', 4, at=2, step=0.1), 'cat': ramp('6a4428', 2), 'dark': '1c3a1c'})
PAD = art.sprite_palette(0, {'edge': '15301c', 'pad': ramp('3d9a42', 4, at=2, step=0.1), 'hi': 'c8f090', 'flower': ramp('f0a0c0', 2), 'under': '1a4a58'})
FROG = art.sprite_palette(1, {'line': '10281a', 'skin': ramp('5cb040', 4, at=2, step=0.1), 'spot': '2e7a2c', 'eye': 'f8f0c0', 'toe': 'a8dc70'})
ORB = art.sprite_palette(2, {'halo': 'f8e8a0', 'body': 'fff4c0', 'core': 'ffffff'})


def lit(img, cx, cy, rx, ry, ramp_, light=(-0.45, -0.6, 0.66), bias=0.0):
    """An ellipsoid seen from the front, lit from the upper left, shaded along the ramp (dark to light)."""
    n = len(ramp_)
    for y in range(int(cy - ry) - 1, int(cy + ry) + 2):
        for x in range(int(cx - rx) - 1, int(cx + rx) + 2):
            nx, ny = (x + 0.5 - cx) / rx, (y + 0.5 - cy) / ry
            d = nx * nx + ny * ny
            if d > 1: continue
            L = light[0] * nx + light[1] * ny + light[2] * math.sqrt(1 - d) + bias
            img.pset(x, y, ramp_[max(0, min(n - 1, int(L * n * 0.95 + 0.25)))])


# --- The river (BG2): water between two banks, 1024 x 1024 pixels of which only the distinct 8 x 8 tiles are paid for ---
water_tex = texture('water', 64, 64, RIVER.w, seed=2)
bank_tex = texture('grass', 64, 64, RIVER.grass, seed=5)
for k in range(7):                                      # a few flowers in the grass (the 64 px patch repeats, so they do too)
    bank_tex.pset(int(hsh(k * 19 + 2) % 64), int(hsh(k * 23 + 5) % 64), RIVER.bloom[k % 2])
MID, HALF = 512, 150                                    # the river's middle and half width (world pixels)


def bank_line(py):                                      # the water's edge wanders, repeating every 64 lines
    return HALF + 5 * math.sin(py * 2 * math.pi / 64) + 3 * math.sin(py * 2 * math.pi / 32 + 1)


leaf_at = {}                                            # little leaves afloat: eight in every 256 x 256 (so the picture repeats and costs few tiles)
for k in range(8):
    lx, ly = 40 + int(hsh(k * 3 + 1) % 176), int(hsh(k * 5 + 7) % 256)
    for dy in range(-1, 2):
        for dx in range(-3, 4):
            if (dx / 3.3) ** 2 + (dy / 1.5) ** 2 <= 1: leaf_at[((lx + dx) % 256, (ly + dy) % 256)] = RIVER.leaf[1 if dy < 1 else 0]


def river(x, y):
    d, px, py = abs(x - MID), x % 64, y % 64
    e = bank_line(py)
    if d < e - 4:
        return leaf_at.get((x % 256, y % 256)) or water_tex.px[py][px]
    if d < e - 1: return RIVER.foam
    if d < e + 3: return RIVER.dirt[0] if (px * 7 + py * 3) % 5 else RIVER.dirt[1]
    if d < e + 7: return RIVER.dirt[1] if (px + py) % 4 else RIVER.dirt[0]
    return bank_tex.px[py][px]


art.scene('river', Img.make(1024, 1024, river), pal=RIVER, at=(128, 0), solid=True)

# --- The far bank and the stars (BG1, 256 x 64, wraps sideways): hills, then a line of trees, in front of the sky (transparent) ---
far = Img(256, 64)
for k in range(46):                                     # stars: the sky shows through; code.js makes them white only at night
    far.pset(int(hsh(k * 11 + 3) % 256), int(hsh(k * 7 + 9) % 36), FAR.star)
hills(far, FAR.hill, base=64, amp=16, period=256, seed=4)
treeline(far, FAR.tree, base=64, size=9, spacing=11, seed=3)
art.scene('far', far, pal=FAR, at=(0, 0))

# --- The near reeds (BG0, 256 x 224): clumps of blades and cattails rising from the two lower corners, the middle left clear ---
near = Img(256, 224)


def clump(bx, by, n, seed, lean):
    for b in range(n):
        h = 44 + int(hsh(seed * 17 + b * 5) % 56); l = lean + (hsh(seed * 3 + b) % 7) / 3 - 1
        x0 = bx + int(hsh(seed * 5 + b * 9) % 16) - 8
        for j in range(h):
            x = int(x0 + l * (j / h) ** 1.6 * 14); y = by - j
            c = NEAR.reed[3 if j > h * 0.85 else 2 if j > h * 0.5 else 1 if j > h * 0.2 else 0]
            for w in range(2 if j < h * 0.7 else 1):
                near.pset(x + w, y, c)
        if b % 4 == 0:                                  # a cattail
            tx, ty = int(x0 + l * 14), by - h
            for j in range(9): near.pset(tx, ty + j, NEAR.cat[0]); near.pset(tx + 1, ty + j, NEAR.cat[1])


for side, sgn in ((0, 1), (1, -1)):
    ox = 0 if side == 0 else 255
    for k, (dx, dy, n) in enumerate([(6, 224, 9), (24, 226, 7), (4, 168, 6), (18, 196, 7), (2, 128, 4), (34, 228, 5)]):
        clump(ox + sgn * dx, dy, n, k, sgn * 0.7)
art.scene('reeds', near, pal=NEAR, at=(0, 64))

# --- The lily pads (sprites, three sizes by distance): a flattened disc with a notch, lit from the upper left, a dark shadow of water under it ---


def pad(S, flower=False):
    im = Img(S, S)
    cx, cy, rx, ry = S / 2, S * 0.6, S * 0.47, S * 0.27
    lit(im, cx, cy + S * 0.04, rx, ry, [PAD.under], light=(0, 0, 1))                  # the shadow below
    for y in range(S):
        for x in range(S):
            nx, ny = (x + 0.5 - cx) / rx, (y + 0.5 - cy) / ry
            d = nx * nx + ny * ny
            if d > 1: continue
            ang = math.atan2(ny, nx)
            if abs(ang - (-0.6)) < 0.16 and d > 0.05: continue                           # the notch, a thin wedge to the upper right
            L = -0.5 * nx - 0.7 * ny + 0.5 * (1 - d)
            c = PAD.pad[3] if L > 0.62 else PAD.pad[2] if L > 0.1 else PAD.pad[1] if L > -0.45 else PAD.pad[0]
            if S >= 16 and d > 0.78 and c != PAD.pad[0]: c = PAD.pad[max(0, PAD.pad.index(c) - 1)]
            im.pset(x, y, c)
    if S >= 16:
        for k in range(5):                                                                # veins running from the middle
            a = k * 1.1 + 0.7
            for j in range(2, int(S * 0.4)):
                x, y = int(cx + math.cos(a) * j), int(cy + math.sin(a) * j * 0.55)
                if im.get(x, y) in PAD.pad[1:3]: im.pset(x, y, PAD.pad[0] if PAD.pad.index(im.get(x, y)) == 1 else PAD.pad[1])
    if S >= 32 and flower:
        for dx, dy, c in ((0, 0, PAD.flower[0]), (-3, 1, PAD.flower[1]), (3, 1, PAD.flower[1]), (0, -2, PAD.flower[1]), (0, 2, PAD.flower[1])): im.pset(int(cx) + dx, int(cy) + dy - 1, c)
    im.pset(int(cx) - 1, int(cy) - 2, PAD.hi)
    return im


for S in (32, 16, 8): art.sprite('pad%d' % S, pad(S), pal=PAD, region='spr')

# --- The frog (sprites, 32 x 32, seen from behind: back, hind legs, two eyes on top of the head): sit, crouch, air, land ---


def frog(kind):
    im = Img(32, 32)
    sk = FROG.skin
    if kind == 'sit': legs, body, head, eyes, spread = (7, 24, 6, 5), (16, 20, 10, 8), (16, 12.5, 7, 5), 8, 0
    elif kind == 'crouch': legs, body, head, eyes, spread = (6, 25, 7, 4), (16, 22, 11, 7), (16, 15, 7, 4.5), 8, 0
    elif kind == 'air': legs, body, head, eyes, spread = (9, 29, 3, 7), (16, 17, 7.5, 9), (16, 8.5, 6, 4.5), 7, 1
    else: legs, body, head, eyes, spread = (6, 26, 8, 4), (16, 23, 12, 6), (16, 16.5, 7.5, 4), 9, 0
    lx, ly, lrx, lry = legs
    if spread:                                                                          # legs stretched out behind
        for sgn in (-1, 1):
            for j in range(9): lit(im, 16 + sgn * (6 + j * 0.9), 25 + j * 0.45, 3.0, 2.0, sk)
            lit(im, 16 + sgn * 15, 31, 3.4, 1.6, [FROG.toe, FROG.toe, FROG.toe])
    else:
        for sgn in (-1, 1):
            lit(im, 16 + sgn * (16 - lx), ly, lrx, lry, sk)
            lit(im, 16 + sgn * (16 - lx + 1), ly + lry + 1.4, lrx * 0.8, 1.8, [FROG.toe, FROG.toe, FROG.toe])
    lit(im, *body, sk)
    for dx, dy in ((-4, 1), (3, -1), (-1, 4), (5, 4)):                                   # spots on the back
        im.pset(int(body[0]) + dx, int(body[1]) + dy, FROG.spot); im.pset(int(body[0]) + dx + 1, int(body[1]) + dy, FROG.spot)
    lit(im, *head, sk)
    ex = eyes                                                                           # the eyes: two bumps on top, a cream rim on their upper edge
    for sgn in (-1, 1):
        cx, cy = 16 + sgn * (head[2] - 2.2), head[1] - head[3] * 0.65
        lit(im, cx, cy, 3.6, 3.3, sk)
        for dx, dy in ((-1, -2), (0, -2), (1, -2), (sgn, -1)): im.pset(int(cx) + dx, int(cy) + dy, FROG.eye)
    im.outline(FROG.line)
    return im


for kind in ('sit', 'crouch', 'air', 'land'): art.sprite('frog_' + kind, frog(kind), pal=FROG, region='spr')

# --- The sun or the moon (a sprite, 32 x 32): code.js gives it the colour, the place and the size of each time of day ---
orb = Img(32, 32)
for y in range(32):
    for x in range(32):
        d = math.hypot(x - 15.5, y - 15.5)
        if d <= 7: orb.pset(x, y, ORB.core if d < 4 else ORB.body)
        elif d <= 11 and (x + y) % 2 == 0: orb.pset(x, y, ORB.halo)
        elif d <= 14 and (x % 2 == 0 and y % 2 == 0): orb.pset(x, y, ORB.halo)
art.sprite('orb', orb, pal=ORB, region='spr')

if len(sys.argv) > 1 and sys.argv[1].endswith('.png'):
    sh = Sheet(scale=6)
    for S in (32, 16, 8): sh.add('pad%d' % S, pad(S, True), PAD)
    for kind in ('sit', 'crouch', 'air', 'land'): sh.add('frog ' + kind, frog(kind), FROG)
    sh.add('orb', orb, ORB)
    sh.save(sys.argv[1])
else:
    art.write(sys.argv[1])
