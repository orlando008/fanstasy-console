# Operation Ironstorm's art: tiles.txt, palette.txt, map.txt, art.json and the ART block of code.js.
#   python3 carts/src/operation-ironstorm/art.py carts/src/operation-ironstorm
# Written with the art kit (tools/devkit/art/kit.py). A jungle at dusk in three parallax layers (BG2 the sky, the sun and
# the far mountains; BG1 the misty jungle with a waterfall; BG0 the near trees, the canopy overhead and the ferns), the
# title logo (shown on BG0 on the title screen), and the sprites: the commando (a body and, over it, the arm and rifle
# for each aim), the rifleman and the heavy trooper (four walking frames each), the fortress commander's gunship (64 x 64
# in four quarters, two frames) and a white palette for hit flashes. The overlay keeps the CGRAM entries 1 to 15 (the
# names in C in code.js), recoloured here to match, and named colours 113 and up for the ground, the pits and the planks.
import os, sys, math
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../../tools/devkit/art'))
from kit import *

art = Art()
art.region('bg', 1, 639)
art.region('spr', 640, 1023)


def disc(im, cx, cy, r, c):
    """A filled circle, only over its bounding box (Img.disc walks the whole picture)."""
    for y in range(max(0, int(cy - r - 1)), min(im.h, int(cy + r + 2))):
        for x in range(max(0, int(cx - r - 1)), min(im.w, int(cx + r + 2))):
            if (x - cx) ** 2 + (y - cy) ** 2 <= r * r: im.px[y][x] = c


def wrap_disc(im, cx, cy, r, c):
    """A circle on a picture that wraps left to right (a scrolling layer): drawn again across the seam."""
    for off in (-im.w, 0, im.w): disc(im, cx + off, cy, r, c)


def thick(im, pts, c, w=3):
    """A limb: a polyline `w` pixels wide."""
    for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
        n = max(abs(x1 - x0), abs(y1 - y0), 1)
        for k in range(n + 1):
            x, y = x0 + (x1 - x0) * k / n, y0 + (y1 - y0) * k / n
            for d in range(w):
                im.pset(round(x - (w - 1) / 2 + d), round(y), c)


# --- The overlay's colours: entries 1 to 15 (C in code.js), and named ones from 113 -------------------------------------
for i, hexc in enumerate(['0d0b14', '1e1a2e', '4a2f5e', '6b3e2a', '2f6b3a', 'd8383c', '6e6a80', '2b4a8c',
                          'f08a2c', 'c4c8d8', '8ccf4a', 'e8b088', '5ed0e8', 'ffd84a', 'f6f2e8'], start=1):
    art.color(i, hexc)
for i, (name, hexc) in enumerate([('grassHi', 'b8e05a'), ('grass', '5f9a38'), ('grassDk', '2f5a2c'), ('soilHi', '8a5434'),
                                  ('soil', '5c3426'), ('soilDk', '3a2020'), ('soilDeep', '1e1218'), ('stone', '6a6478'),
                                  ('stoneHi', 'a29cb0'), ('wood', '8a5a34'), ('woodHi', 'c8884a'), ('woodDk', '4a2c22'),
                                  ('pit', '120a14'), ('stake', 'b89a6a'), ('ember', 'ff6a2c')], start=113):
    art.color(i, hexc, name)

# --- BG2: the sky, the sun, the clouds and the far mountains (256 x 224, wraps; scrolls at 0.08) ---------------------
# Shapes repeat every 128 or 64 pixels where they can, so that the tiles are shared (the sheet holds 1,024).
SKY = art.palette(1, {'s0': '1b1638', 's1': '2e1f4f', 's2': '4b2763', 's3': '74306e', 's4': 'a83f6a', 's5': 'd65e5e',
                      's6': 'f08c5a', 's7': 'ffc07a', 'sun': 'fff0c0', 'sunmid': 'ffd27a', 'cl': 'ff9f7a', 'cm': 'b8506e',
                      'cd': '5a2c62', 'm1': '4a2d63', 'm2': '33204e'})
BANDS = [SKY.s0, SKY.s1, SKY.s2, SKY.s3, SKY.s4, SKY.s5, SKY.s6, SKY.s7]
HORIZON = 136
TAU = 2 * math.pi


def sky_px(x, y):
    t = min(max(y / HORIZON, 0), 0.999) * (len(BANDS) - 1)
    k, f = int(t), t - int(t)
    if f > 0.5 and dither(x, y, int((f - 0.5) * 2 * 16)): return BANDS[min(k + 1, len(BANDS) - 1)]
    return BANDS[k]


sky = Img.make(256, 224, sky_px)
for y in range(80, 132):                                             # the sun, low over the mountains, with a glow
    for x in range(170, 224):
        d = math.hypot(x - 196.5, y - 108.5)
        if d <= 12: sky.px[y][x] = SKY.sun
        elif d <= 15: sky.px[y][x] = SKY.sunmid
        elif d <= 21 and dither(x, y, int((21 - d) / 6 * 9)): sky.px[y][x] = SKY.s7
for cx, cy, w in [(44, 34, 64), (160, 22, 48), (112, 66, 80), (226, 58, 36)]:   # dusk clouds: puffs, dark above, lit beneath
    cloud = Img(w + 16, 24)
    for k in range(0, w, 10):
        r = 4 + 3 * math.sin(math.pi * (k + 5) / w)
        disc(cloud, 8 + k + 5, 16 - r * 0.6, r, SKY.cd)
    for x in range(cloud.w):
        col = [cloud.px[y][x] for y in range(24)]
        if not any(col): continue
        bottom = max(y for y in range(24) if col[y])
        for y in range(24):
            if cloud.px[y][x]: cloud.px[y][x] = SKY.cl if y >= bottom - 1 else SKY.cm if y >= bottom - 3 else SKY.cd
    for y in range(24):
        for x in range(cloud.w):
            if cloud.px[y][x]: sky.pset((cx - w // 2 - 8 + x) % 256, cy - 16 + y, cloud.px[y][x])
for x in range(256):                                                 # the far mountains: two ridges, the back one in the haze
    back = 120 + int(9 * math.sin(TAU * x / 128) + 5 * math.sin(TAU * x / 64 + 1) + 2 * math.sin(TAU * x / 32))
    front = 134 + int(7 * math.sin(TAU * x / 128 + 2) + 3 * math.sin(TAU * x / 32 + 0.5))
    for y in range(back, 224): sky.px[y][x] = SKY.m1 if y < front else SKY.m2
art.scene('sky', sky, pal=SKY, at=(0, 0), solid=True, region='bg')

# --- BG1: the misty jungle, with a cliff and a waterfall (512 x 224, wraps; scrolls at 0.3) ------------------------------
MID = art.palette(2, {'c1': '1f2a3e', 'c2': '27403f', 'c3': '345a48', 'c4': '4f7a4a', 'rim': 'c99a5a', 'mist': '8a5e86',
                      'mist2': 'b47a86', 'w1': '9fd8f0', 'w2': '5ea8d8', 'w3': 'e8fbff', 'r1': '2e2440', 'r2': '4a3a5e',
                      'trunk': '1a1a2c', 'foam': 'f4fbff'})
mid = Img(512, 224)
def crown(cx, cy, r, shade, body, lit, rim):
    """A round tree crown lit from the upper right (the sun): a shaded lower left, clumps of lit leaves, a warm rim."""
    for off in (-512, 0, 512):
        x0 = cx + off
        for y in range(max(0, int(cy - r - 1)), min(224, int(cy + r + 2))):
            for x in range(max(0, int(x0 - r - 1)), min(512, int(x0 + r + 2))):
                dx, dy = x - x0, y - cy
                d = math.hypot(dx, dy)
                if d > r: continue
                lightness = (dx - dy) / (r * 1.4)                    # -1 lower left .. 1 upper right
                col = shade if lightness < -0.35 else body
                if d > r - 1.5 and lightness > 0.45: col = rim
                elif lightness > 0.15 and dither(x, y, int(min(16, (lightness - 0.15) * 30))): col = lit
                mid.px[y][x] = col


for base, r, shade, body, lit, rim, off in [(134, 16, MID.c1, MID.c2, MID.c3, MID.c4, 0), (150, 13, MID.c2, MID.c3, MID.c4, MID.rim, 16),
                                            (166, 11, MID.c3, MID.c4, MID.rim, MID.rim, 8)]:
    for k in range(16):                                              # a row of round crowns, every 32 px, two heights
        crown(off + 32 * k + 16, base - 4 + (k % 2) * 7, r + (k % 2), shade, body, lit, rim)
    for y in range(base + 4, 224):
        for x in range(512):
            if mid.px[y][x] == 0: mid.px[y][x] = shade
for k in range(8):                                                   # trunks between the crowns
    for y in range(156, 224):
        mid.pset(64 * k + 30, y, MID.trunk); mid.pset(64 * k + 31, y, MID.c1)
WX0, WX1 = 336, 392                                                  # the cliff and the waterfall, tile-aligned
for y in range(104, 224):
    for x in range(WX0, WX1):
        if x < WX0 + 8 or x >= WX1 - 8:
            mid.px[y][x] = MID.r2 if x in (WX0 + 7, WX1 - 8) or (x + y // 8) % 8 == 0 else MID.r1
        else:
            mid.px[y][x] = [MID.w1, MID.w2, MID.w3][((y // 4) + (x - WX0) // 2) % 3]   # cycled in code.js: the water falls
for x in range(WX0, WX1):
    for y in range(104, 108): mid.px[y][x] = MID.c4 if y < 106 else MID.c3
for x in range(WX0 + 4, WX1 - 4):                                    # foam at the foot
    for y in range(168, 176): mid.px[y][x] = MID.foam if (x + y) % 3 else MID.w3
for y in range(176, 224):                                            # mist over the lower canopy, thicker lower down
    lvl = min(10, (y - 176) // 2)
    for x in range(512):
        if mid.px[y][x] and dither(x, y, lvl): mid.px[y][x] = MID.mist if y < 192 else MID.mist2
art.scene('mid', mid, pal=MID, at=(32, 0), region='bg')
art.colors['water1'], art.colors['water2'], art.colors['water3'] = MID.cgram('w1'), MID.cgram('w2'), MID.cgram('w3')

# --- BG0: the near jungle: the canopy overhead, lianas, two great trunks and ferns (512 x 224, wraps; scrolls at 0.6) ----
NEAR = art.palette(3, {'n1': '0f0d18', 'n2': '18241f', 'n3': '1f3a28', 'n4': '2c5430', 'n5': '4a7a36', 'warm': 'e0904a',
                       'b1': '24161c', 'b2': '3e2426', 'b3': '64382a', 'v1': '284628', 'v2': '5a8a3a'})
near = Img(512, 224)
for x in range(512):                                                 # the canopy overhead: a scalloped band of leaves
    h = 16 + int(5 * math.sin(TAU * x / 64) + 3 * math.sin(TAU * x / 32 + 1) + 2 * math.sin(TAU * x / 16))
    for y in range(h):
        near.px[y][x] = NEAR.n2 if y < h - 4 else NEAR.n3 if y < h - 1 else NEAR.n4
for k in range(8):                                                   # lianas
    x0 = 64 * k + 44
    for y in range(12, 60):
        x = int(x0 + 2 * math.sin(TAU * y / 24))
        near.pset(x, y, NEAR.v1)
        if y % 8 == 0: near.pset(x + 1, y, NEAR.v2); near.pset(x - 1, y + 1, NEAR.v2)
for x0, w in [(64, 16), (320, 24)]:                                  # two great trunks, lit warm on the right
    for y in range(10, 224):
        for d in range(w):
            col = NEAR.b1 if d < 3 else NEAR.b3 if d >= w - 2 else NEAR.b2
            if d == w - 1 and y % 16 < 5: col = NEAR.warm
            if 3 <= d < w - 2 and (d * 5 + y) % 16 == 0: col = NEAR.b1
            near.px[y][x0 + d] = col
    for d in range(-8, w + 8):                                       # roots
        if 0 <= d < w: continue
        top = 200 + abs(d - (w // 2)) - w // 2
        for y in range(max(top, 186), 224): near.pset(x0 + d, y, NEAR.b1 if (d + y) % 3 else NEAR.b2)
for k in range(16):                                                  # ferns along the bottom
    cx, base = 32 * k + 12 + (k % 2) * 6, 204
    for leaf in range(-3, 4):
        ang = leaf * 0.45 - math.pi / 2
        for t in range(16 - abs(leaf) * 2):
            x, y = cx + math.cos(ang) * t * 1.1, base + math.sin(ang) * t * 0.9 + t * t * 0.03
            near.pset(int(x) % 512, int(y), NEAR.n3 if t < 7 else NEAR.n4)
            if t % 3 == 0: near.pset(int(x + 1) % 512, int(y + 1), NEAR.n5)
for y in range(208, 224):
    for x in range(512):
        if near.px[y][x] == 0: near.px[y][x] = NEAR.n1
art.scene('near', near, pal=NEAR, at=(96, 0), region='bg')

# --- The title logo's colours (code.js draws it on the overlay from the console font, scaled up) -------------------------
for i, (name, hexc) in enumerate([('st1', 'f6f2e8'), ('st2', 'c8ccd8'), ('st3', '8a8fa8'), ('st4', '565a78'), ('em1', 'ffe08a'),
                                  ('em2', 'ffb040'), ('em3', 'f06a28'), ('em4', 'b8302a'), ('logoSh', '2a1630'), ('flash', 'fff8d0'),
                                  ('night', '141026')], start=97):
    art.color(i, hexc, name)

# --- Sprites --------------------------------------------------------------------------------------------------------------
HERO = art.sprite_palette(0, {'ol': '140f1e', 'skd': '9a5a3c', 'sk': 'd8925e', 'skl': 'f2c08c', 'bdd': '8c1c24', 'bd': 'ec3c3c',
                              'topd': '3c4a24', 'top': '5e7034', 'topl': '8a9a48', 'pd': '1e2a4a', 'p': '34467a', 'boot': '241a1a',
                              'md': '3a3e4e', 'm': '7a8098', 'ml': 'c8ccd8'})
RIF = art.sprite_palette(1, {'ol': '140f1e', 'skd': '9a5a3c', 'sk': 'd8925e', 'ud': '3e3a2a', 'u': '6b6440', 'ul': '9a9060',
                             'hd': '2c3424', 'h': '4a5636', 'vis': 'ff4040', 'visl': 'ffb0a0', 'boot': '241a1a', 'md': '3a3e4e',
                             'm': '7a8098', 'ml': 'c8ccd8'})
HVY = art.sprite_palette(2, {'ol': '140f1e', 'skd': '9a5a3c', 'sk': 'd8925e', 'ud': '3a2420', 'u': '6a3a2a', 'ul': 'a0583a',
                             'hd': '34303e', 'h': '5a5670', 'hl': '8e8aa8', 'vis': 'ffb000', 'boot': '241a1a', 'md': '3a3e4e',
                             'm': '7a8098', 'ml': 'c8ccd8'})
BOSS = art.sprite_palette(3, {'ol': '140f1e', 'hd': '2c2a3a', 'h': '4e4c66', 'hl': '7e7c9a', 'hh': 'b8b6d0', 'rust': '8a4a2a',
                              'orng': 'f08a2c', 'core': 'ffe060', 'corel': 'fff8d0', 'red': 'c8323c', 'eye': 'ff5050',
                              'gl': '5ed0e8', 'gld': '2b6a8c', 'th': 'ff9a3c', 'thl': 'ffe8a0'})
art.sprite_palette(4, {'w%d' % i: 'fff8f0' for i in range(1, 16)})      # the hit flash: every colour white


# Leg poses: (back hip, knee, foot), (front hip, knee, foot), in a 32 x 32 frame facing right; the feet stand on row 30.
POSES = {
    'idle':   (((13, 23), (13, 26), (12, 29)), ((17, 23), (17, 26), (18, 29))),
    'run0':   (((13, 23), (11, 26), (8, 28)), ((17, 23), (20, 26), (22, 29))),
    'run1':   (((13, 23), (16, 25), (14, 28)), ((17, 23), (17, 26), (16, 29))),
    'run2':   (((17, 23), (20, 26), (22, 29)), ((13, 23), (11, 26), (8, 28))),
    'run3':   (((17, 23), (17, 26), (16, 29)), ((13, 23), (16, 25), (14, 28))),
    'jump':   (((13, 23), (15, 25), (11, 27)), ((17, 23), (20, 24), (18, 28))),
}


def soldier(pal, legs, kind='hero', crouch=False, frame=0, wide=0):
    """A soldier facing right: head, torso, belt and legs (the commando's arm and rifle are a separate sprite)."""
    im = Img(32, 32)
    dy = 6 if crouch else 0
    back, front = legs
    if crouch:
        back, front = (((13, 29), (11, 30), (8, 30)), ((17, 28), (21, 27), (21, 30)))
    pd, p = (pal.pd, pal.p) if kind == 'hero' else (pal.ud, pal.u)
    for hip, knee, foot in (back, front):
        col = pd if (hip, knee, foot) == back else p
        thick(im, [hip, knee, foot], col, 3)
        fx, fy = foot
        im.rect(fx - 1, fy, 5, 2, pal.boot)
    # torso
    x0 = 12 - wide
    tw = 7 + 2 * wide
    if kind == 'hero':
        im.rect(x0, 15 + dy, tw, 7, pal.top)
        im.rect(x0, 15 + dy, 1, 7, pal.topd); im.rect(x0 + tw - 1, 15 + dy, 1, 6, pal.topl)
        im.rect(x0 - 1, 15 + dy, 2, 2, pal.sk); im.rect(x0 + tw - 1, 15 + dy, 2, 2, pal.skl)   # bare shoulders
        im.rect(x0, 22 + dy, tw, 1, pal.boot); im.pset(15, 22 + dy, pal.ml)                   # belt and buckle
        arm = [(x0, 16 + dy), (x0 - 2 + (frame % 2), 19 + dy), (x0 - 1, 21 + dy)]
        thick(im, arm, pal.skd, 2)
    else:
        im.rect(x0, 15 + dy, tw, 7, pal.u)
        im.rect(x0, 15 + dy, 1, 7, pal.ud); im.rect(x0 + tw - 1, 15 + dy, 1, 7, pal.ul)
        im.rect(x0 + 1, 17 + dy, tw - 2, 1, pal.ud)                                            # webbing
        im.rect(x0, 22 + dy, tw, 1, pal.boot)
        if wide:                                                                               # the heavy's pauldrons
            im.rect(x0 - 2, 14 + dy, 4, 4, pal.h); im.rect(x0 + tw - 2, 14 + dy, 4, 4, pal.hl)
    # head
    hx = 13
    im.rect(14, 14 + dy, 3, 1, pal.skd)                                                        # neck
    im.rect(hx, 8 + dy, 6, 6, pal.sk)
    im.rect(hx, 8 + dy, 1, 6, pal.skd); im.rect(hx + 5, 9 + dy, 1, 4, pal.skl if kind == 'hero' else pal.sk)
    if kind == 'hero':
        im.rect(hx, 7 + dy, 6, 2, pal.boot)                                                    # hair
        im.rect(hx, 9 + dy, 6, 2, pal.bd); im.rect(hx, 10 + dy, 6, 1, pal.bdd)                # the bandana
        tail = [(hx - 1, 9 + dy), (hx - 3, 10 + dy + frame % 2), (hx - 5, 9 + dy + (frame // 2) % 2)]
        for tx, ty in tail: im.pset(tx, ty, pal.bd); im.pset(tx, ty + 1, pal.bdd)
        im.pset(hx + 4, 11 + dy, pal.ol)                                                       # the eye
    else:
        im.rect(hx - 1, 6 + dy, 8, 4, pal.h); im.rect(hx - 1, 6 + dy, 8, 1, pal.hl if wide else pal.h)   # helmet
        im.rect(hx - 1, 9 + dy, 8, 1, pal.hd)
        im.rect(hx + 2, 10 + dy, 4, 2, pal.vis); im.pset(hx + 5, 10 + dy, pal.visl if 'visl' in pal.names() else pal.vis)
    if kind != 'hero':                                                                         # the enemy's rifle, held level
        gy = 17 + dy
        im.rect(x0 + tw - 2, gy + 1, 3, 2, pal.sk)                                             # hands
        length = 13 if not wide else 14
        im.rect(x0 + tw - 3, gy, length, 2 + (1 if wide else 0), pal.m)
        im.rect(x0 + tw - 3, gy, length, 1, pal.ml)
        im.rect(x0 + tw - 6, gy + 1, 4, 2, pal.md)                                             # stock
        if wide: im.rect(x0 + tw + 4, gy + 3, 4, 3, pal.md)                                   # the drum
    return im.outline(pal.ol)


def gun(angle, fire=False):
    """The commando's arm and rifle, 16 x 16, the shoulder at (3, 6): angle 0 level, -90 up, 90 down, +-45 diagonals."""
    im = Img(16, 16)
    a = math.radians(angle)
    sx, sy = 3, 6
    hand = (sx + round(math.cos(a) * 4), sy + 2 + round(math.sin(a) * 4))
    thick(im, [(sx, sy + 1), hand], HERO.sk, 2)
    L = 11 if angle in (0,) else 10
    for k in range(-3, L):
        x, y = hand[0] + math.cos(a) * k, hand[1] + math.sin(a) * k
        im.pset(round(x), round(y), HERO.m)
        im.pset(round(x - math.sin(a)), round(y + math.cos(a)), HERO.md if k > 0 else HERO.md)
        if 0 <= k < 4: im.pset(round(x + math.sin(a)), round(y - math.cos(a)), HERO.ml)
    return im.outline(HERO.ol)


body = {}
for name, legs in POSES.items():
    body[name] = art.sprite('b_' + name, soldier(HERO, legs, frame=int(name[-1]) if name[-1].isdigit() else 0), pal=HERO, region='spr')
art.sprite('b_crouch', soldier(HERO, POSES['idle'], crouch=True), pal=HERO, region='spr')
for name, ang in [('lvl', 0), ('up', -90), ('diu', -45), ('dn', 90), ('did', 45)]:
    art.sprite('g_' + name, gun(ang), pal=HERO, region='spr')
for k in range(4):
    legs = POSES['run%d' % k]
    art.sprite('rif%d' % k, soldier(RIF, legs, kind='enemy', frame=k), pal=RIF, region='spr')
    art.sprite('hvy%d' % k, soldier(HVY, legs, kind='enemy', frame=k, wide=1), pal=HVY, region='spr')


def gunship():
    """The fortress commander: a hovering gunship facing left, 64 x 64 (the hull's middle at (32, 30)). Its thruster flames
    are drawn by code.js on the overlay, and its core pulses by a palette change."""
    im = Img(64, 64)
    B = BOSS
    im.poly([(6, 22), (14, 14), (50, 14), (58, 22), (58, 40), (50, 46), (14, 46), (6, 40)], B.h)          # the hull
    im.poly([(6, 22), (14, 14), (50, 14), (58, 22), (58, 26), (6, 26)], B.hl)
    im.rect(14, 15, 36, 1, B.hh)
    im.poly([(6, 36), (58, 36), (58, 40), (50, 46), (14, 46), (6, 40)], B.hd)
    for x in range(12, 54, 8): im.pset(x, 30, B.hd); im.pset(x, 31, B.hh)                                # rivets
    im.rect(20, 33, 6, 2, B.rust); im.rect(40, 18, 5, 1, B.rust)
    disc(im, 32, 13, 9, B.gld); disc(im, 31, 12, 7, B.gl); disc(im, 29, 10, 2, B.hh)                       # the cockpit dome
    im.rect(22, 13, 20, 3, B.h); im.rect(22, 13, 20, 1, B.hl)
    disc(im, 14, 28, 4, B.hd); disc(im, 14, 28, 3, B.red); disc(im, 13, 27, 1.2, B.eye)                    # the sensor eye
    disc(im, 33, 32, 5, B.orng); disc(im, 33, 32, 3.5, B.core); disc(im, 32, 31, 1.5, B.corel)                       # the core
    for y0 in (20, 38):                                                                                    # twin cannons, to the left
        im.rect(0, y0, 10, 4, B.hd); im.rect(0, y0, 10, 1, B.hl); im.rect(0, y0 + 1, 2, 2, B.ol)
        im.rect(8, y0 - 1, 5, 6, B.h)
    for tx in (18, 40):                                                                                    # thrusters
        im.rect(tx, 46, 8, 4, B.hd); im.rect(tx + 1, 46, 6, 1, B.hl); im.rect(tx + 2, 49, 4, 1, B.th)
    return im.outline(B.ol)


ship = gunship()
for name, (qx, qy) in [('tl', (0, 0)), ('tr', (32, 0)), ('bl', (0, 32)), ('br', (32, 32))]:
    art.sprite('boss_' + name, ship.crop(qx, qy, 32, 32), pal=BOSS, region='spr')
art.colors['bossCore'] = BOSS.cgram('core')

art.write(sys.argv[1] if len(sys.argv) > 1 else os.path.dirname(os.path.abspath(__file__)))
