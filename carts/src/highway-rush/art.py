# Highway Rush's art: carts/src/highway-rush/tiles.txt, palette.txt, map.txt and art.json, and the ART block in code.js.
#   python3 carts/src/highway-rush/art.py carts/src/highway-rush
# Written with the art toolkit (tools/devkit/art/kit.py). Set HR_PREVIEW=<folder> to also write contact sheets of the pieces.
#
# What is here (the concept board is the reference, not an atlas: every piece is drawn on its own, with no labels or frames):
#   the floor     BG2, drawn in Mode 7 perspective by scanline(): asphalt, dashes, kerbs, guardrail strip and grass, in two bands that
#                 alternate every 32 units so the road reads as moving; the green and red pads and the oil slick are stamps copied
#                 into the floor's map as the road scrolls in, so they lie on the road and every sprite sorts in front of them
#   the sky       a gradient on the backdrop; the far layer (BG2 above the horizon) has the sun, clouds and mountains, the near layer
#                 (BG1) the hills and the tree line
#   the cars      one sports car drawn from vector shapes at eight widths (56 to 8 px) and three poses (left, straight, right) for the
#                 two nearest; four sprite palettes give the red player and the blue, yellow, green and white rivals
#   the props     mystery cubes (ray-cast, rotating, four frames), cones and guardrail posts, each at six or more sizes
#   the effects   tire smoke, boost exhaust and pick-up sparkles; the HUD panels (BG0) and the item and digit icons
import os, sys, math
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from cars import car, tiers
from kit import *
from draw import Canvas, oval, poly, blob

PREVIEW = os.environ.get('HR_PREVIEW')
def budget(what):
    if os.environ.get('HR_BUDGET'): print('%-12s %4d tiles used' % (what, len(art.used)))
sheet = Sheet(scale=3) if PREVIEW else None

art = Art()
art.region('bg', 1, 519)       # background tiles: the road, the sky layers, the HUD, the title
art.region('spr', 520, 1023)   # sprites

# --- Colours ------------------------------------------------------------------------------------------------------------------
# The sky: deep indigo at the top, through magenta and orange to a pale gold at the horizon (line 96)
art.gradient('sky', ['1a1248', '3c2288', '8a3a9a', 'd8584e', 'f89448', 'ffd078', 'ffe8a0'], y0=0, y1=95)

road = art.palette(1, {'a': ['34323f', '444250', '4e4c5c', '5e5c6e'], 'line': 'ece6d6', 'red': 'c8342c',
                       'gr': ['2a5a22', '387030', '468a3a', '5aa04a'], 'rail': ['4a4e66', '9498b0', 'dcdff0']})
pads = art.palette(2, {'a': ['444250', '4e4c5c'], 'g': ['0e4a1c', '1c8a2c', '3cdc3c', 'b8ff90'], 'r': ['4a0e14', 'a02020', 'e8483c', 'ffb0a0'],
                       'white': 'ece6d6', 'oil': ['14101c', '241c34', '44385e'], 'sheen': '8a6cc8'})
hud = art.palette(3, {'navy': ['120e2c', '1c1848', '28235e', '372f7a'], 'rim': ['6a58c0', 'a898f0', 'e0d8ff'], 'gold': ['b07818', 'f0b830', 'ffe078'],
                      'dark': '0a0820', 'white': 'f4f0ff', 'green': '48e048', 'lime': 'b8ff60', 'dgreen': '1c6a28'})
logo_p = art.palette(4, {'gold': ramp('f0b030', 5), 'edge': '160c28', 'shade': '3a2468', 'wing': ramp('7a52e0', 3), 'white': 'f4f0ff', 'lav': ['6a58c0', 'a898f0', 'd8d0ff']})
sky_p = art.palette(5, {'mtn': recede(ramp('5a3a8a', 5), 0.45, 'e8905a'), 'sun': ['ff7a38', 'ffa840', 'ffd060', 'fff0a8'],
                        'cloud': ['b8508a', 'e8785e', 'ffa06a', 'ffd29a'], 'snow': ['f0b098', 'ffe0c0']})
hill_p = art.palette(6, {'hill': recede(ramp('2c6a3a', 4), 0.35, 'e8a060'), 'leaf': recede(ramp('24552e', 4), 0.3, 'e8a060')})

CAR_ROLES = lambda body, shade=None: {'edge': '1a0f24', 'body': ramp(body, 4), 'glass': ['2a3558', '7a92c8'], 'tyre': ['1a1620', '5a5666'],
                                      'lamp': ['d83a20', 'ff9a30', 'fff0b0'], 'chrome': ['8a90a4', 'e8ecf4'], 'shadow': '2a2036'}
car_pal = [art.sprite_palette(0, CAR_ROLES('d03a2c'))]                 # 0 the player: red
for sub, body in ((1, '2f6fe0'), (2, 'f0c020'), (3, '2fbf5a')):          # 1 blue, 2 yellow, 3 green rivals
    car_pal.append(art.sprite_palette(sub, CAR_ROLES(body)))
props = art.sprite_palette(4, {'edge': '1a0f24', 'purple': ['3a1a78', '6a32c8', 'a066ff'], 'gold': ['b07818', 'f0b830', 'ffe890'],
                               'orange': ['c04a10', 'f07820', 'ffa850'], 'white': ['b8b4c8', 'f8f4ff'], 'steel': ['4a4e66', '9498b0', 'dcdff0']})
fx = art.sprite_palette(5, {'edge': '1a0f24', 'flame': ['1c5ad0', '3c8cff', '8cd0ff', 'e8f8ff'], 'spark': ['ff9a20', 'ffe060', 'fff8c0'],
                            'smoke': ['6a6678', '9a96ac', 'c8c4d8', 'f0ecfa']})
items = items_palette(art, 6, gold='ffd23c', grey='dfe4f0')                                          # 6: red, gold, blue, green, grey ramps of 3 (icons, digits, effects)
car_pal.append(art.sprite_palette(7, CAR_ROLES('e4e4f0')))             # 7 the white rival

budget('start')
# --- The floor tiles (BG palette 1): 8 x 8, drawn so the road, kerbs and rail run along the map's columns ----------------------
def noisy(base, specks, seed, share=7):
    """An 8 x 8 tile of `base` with a few specks of other colours, from a hash."""
    img = Img(8, 8, base)
    for y in range(8):
        for x in range(8):
            h = hsh(x * 31 + y * 17 + seed * 101)
            if h % share == 0: img.px[y][x] = specks[(h >> 5) % len(specks)]
    return img

A = road.a                                                              # the four asphalt shades, dark to light
BAND = [dict(base=A[1], sp=[A[0], A[2]], dark=A[0], light=A[2]), dict(base=A[2], sp=[A[1], A[3]], dark=A[1], light=A[3])]
GRASS = [dict(base=road.gr[1], sp=[road.gr[0], road.gr[2]]), dict(base=road.gr[2], sp=[road.gr[1], road.gr[3]])]
for b in (0, 1):
    n = 'AB'[b]
    for v in range(3): art.tile('asph%s%d' % (n, v), noisy(BAND[b]['base'], BAND[b]['sp'], v + 5 * b, 6), pal=road)
    for v in range(4): art.tile('gr%s%d' % (n, v), noisy(GRASS[b]['base'], GRASS[b]['sp'], v + 11 * b, 4), pal=road)
    for v in range(2):
        art.tile('sh%s%d' % (n, v), noisy(BAND[b]['dark'], [BAND[b]['base']], v + 3 + 7 * b, 5), pal=road)
    # a lane line is 2 px wide across a tile boundary: the right column of one tile and the left column of the next
    r = noisy(BAND[b]['base'], BAND[b]['sp'], 1 + 5 * b, 6); r.rect(7, 0, 1, 8, road.line); art.tile('dashR%s' % n, r, pal=road)
    l = noisy(BAND[b]['base'], BAND[b]['sp'], 2 + 5 * b, 6); l.rect(0, 0, 1, 8, road.line); art.tile('dashL%s' % n, l, pal=road)
    e = noisy(BAND[b]['base'], BAND[b]['sp'], 4 + 5 * b, 6); e.rect(0, 0, 2, 8, road.line); art.tile('edgeL%s' % n, e, pal=road)
    e = noisy(BAND[b]['base'], BAND[b]['sp'], 5 + 5 * b, 6); e.rect(6, 0, 2, 8, road.line); art.tile('edgeR%s' % n, e, pal=road)
    # the guardrail seen from above: a lit steel band with a dark foot, grass beside it. Left one; the right is its mirror.
    g = noisy(GRASS[b]['base'], GRASS[b]['sp'], 9 + b, 4)
    g.rect(2, 0, 1, 8, road.rail[0]); g.rect(3, 0, 2, 8, road.rail[2]); g.rect(5, 0, 1, 8, road.rail[1]); g.rect(6, 0, 1, 8, road.rail[0])
    art.tile('rail%s' % n, g, pal=road)
    g2 = g.copy(); g2.rect(1, 2, 7, 3, road.rail[0]); g2.rect(2, 3, 5, 1, road.rail[1]); art.tile('post%s' % n, g2, pal=road)
# kerb: alternating red and white blocks, one tile each
k = Img(8, 8, road.red); k.rect(0, 0, 8, 1, road.red); k.rect(7, 0, 1, 8, A[0]); art.tile('kerbR', k, pal=road)
k = Img(8, 8, road.line); k.rect(7, 0, 1, 8, A[1]); art.tile('kerbW', k, pal=road)

for n, (c0, c1) in (('chkA', (road.line, A[0])), ('chkB', (A[0], road.line))):    # the finish line: 4 px squares, white and black
    k = Img(8, 8, c0)
    k.rect(4, 0, 4, 4, c1); k.rect(0, 4, 4, 4, c1)
    art.tile(n, k, pal=road)
budget('floor')
# --- Stamps: the pads and the oil slick, 32 px wide (one lane) so they lie on whole tiles of the floor ---------------------------
def pad_img(up, ramp_, white):
    im = Img(32, 48, pads.a[0])
    im.rect(1, 1, 30, 46, ramp_[0]); im.rect(1, 1, 30, 1, ramp_[2]); im.rect(1, 46, 30, 1, ramp_[2])
    im.rect(1, 1, 1, 46, ramp_[2]); im.rect(30, 1, 1, 46, ramp_[2]); im.rect(2, 2, 28, 1, ramp_[1]); im.rect(2, 45, 28, 1, ramp_[1])
    im.rect(2, 2, 1, 44, ramp_[1]); im.rect(29, 2, 1, 44, ramp_[1])
    for k in range(3):
        y0 = 4 + k * 14
        chev = [(16, y0), (28, y0 + 9), (28, y0 + 13), (16, y0 + 4), (4, y0 + 13), (4, y0 + 9)]
        edge = [(16, y0 - 1), (29, y0 + 9), (29, y0 + 14), (16, y0 + 5), (3, y0 + 14), (3, y0 + 9)]
        if not up:   # a slow pad: chevrons point back down the road
            chev = [(x, 2 * (y0 + 6.5) - y) for x, y in chev]; edge = [(x, 2 * (y0 + 6.5) - y) for x, y in edge]
        im.poly([(int(x), int(y)) for x, y in edge], ramp_[1]); im.poly([(int(x), int(y)) for x, y in chev], ramp_[2])
        hi = [(16, y0 + 1), (27, y0 + 9)] if up else [(16, y0 + 12), (27, y0 + 4)]
        im.line(hi[0][0], hi[0][1], hi[1][0], hi[1][1], ramp_[3]); im.line(hi[0][0], hi[0][1], 5, hi[1][1], ramp_[3])
    return im
art.scene('padG', pad_img(True, pads.g, pads.white), pal=pads, at=(128, 30), solid=True)
art.scene('padR', pad_img(False, pads.r, pads.white), pal=pads, at=(132, 30), solid=True)
oil = Img(32, 32, pads.a[0])
for cx, cy, rr in ((16, 16, 11), (8, 13, 6), (24, 20, 7), (13, 24, 6), (21, 9, 6), (27, 14, 4)): oil.disc(cx, cy, rr, pads.oil[0])
for cx, cy, rr in ((15, 15, 7), (21, 20, 4), (9, 14, 3)): oil.disc(cx, cy, rr, pads.oil[1])
oil.line(10, 11, 18, 9, pads.sheen); oil.line(11, 12, 17, 10, pads.oil[2]); oil.line(20, 18, 24, 19, pads.sheen); oil.line(8, 15, 9, 17, pads.oil[2])
oil.pset(14, 13, pads.sheen)
art.scene('oil', oil, pal=pads, at=(136, 30), solid=True)

budget('stamps')
# --- The sky layers ---------------------------------------------------------------------------------------------------------------
# Far layer (BG2 above the horizon), 256 x 96 (as wide as the screen, so it wraps while it scrolls): a low sun between two peaks, a bank of clouds, mountains standing on the horizon.
far = Img(256, 96)
orb(far, 124, 78, 16, sky_p.sun, kind='sun')
clouds(far, sky_p.cloud, count=3, y0=22, y1=56, size=(34, 64), seed=4)
mountains(far, sky_p.mtn, base=95, height=40, seed=3, snow=sky_p.snow, snowline=0.5, jag=0.9)
art.scene('far', far, pal=sky_p, at=(128, 0))
# Near layer (BG1), 256 x 96: rolling green hills and a tree line, hugging the horizon (lines 76 to 95)
near = Img(256, 96)
hills(near, hill_p.hill, base=94, amp=14, period=256, seed=2)
treeline(near, hill_p.leaf, base=96, size=6, seed=5)
art.scene('near', near, pal=hill_p, at=(128, 12))

budget('sky')
# --- The HUD (BG0 palette 3): a position panel, the held-item box, the speed panel and the race-progress strip ----------------------
def panel(w, h):
    return frame(w, h, hud.rim, fill=hud.navy[1], border=2)
H0 = Img(256, 56)
H0.blit(panel(56, 30), 4, 4); H0.blit(panel(34, 30), 64, 4); H0.blit(panel(124, 30), 128, 4); H0.blit(panel(248, 11), 4, 38)
H0.rect(6, 6, 52, 3, hud.navy[2]); H0.rect(130, 6, 120, 3, hud.navy[2])
for x in (4, 64, 128):                                   # rounded corners: knock out the square ones
    pass
art.scene('hud', H0, pal=hud, at=(192, 0))

# --- The title: HIGHWAY RUSH in slanted bevelled letters between purple speed wings, NOVA-16 over it ---------------------------------
def slant(img, k):
    out = Img(img.w + int(img.h * k) + 1, img.h)
    for y in range(img.h):
        off = int((img.h - 1 - y) * k)
        for x in range(img.w): out.px[y][x + off] = img.px[y][x]
    return out
t1 = big_text('HIGHWAY', logo_p.gold, scale=3, outline=logo_p.edge, shadow=logo_p.shade)
t2 = big_text('RUSH', logo_p.gold, scale=3, outline=logo_p.edge, shadow=logo_p.shade)
logo = Img(256, 96)
t1 = slant(t1, 0.22); t2 = slant(t2, 0.22)
logo.blit(t1, max(0, (256 - t1.w) // 2), 22); logo.blit(t2, max(0, (256 - t2.w) // 2), 50)
nova = big_text('NOVA-16', logo_p.lav, scale=2, outline=logo_p.edge, shadow=logo_p.shade)
logo.blit(nova, (256 - nova.w) // 2, 2)
for k in range(4):                                       # speed wings either side of the small title
    w = 52 - k * 9
    logo.rect(8 + k * 5, 4 + k * 3, w, 2, logo_p.wing[2 - min(2, k)]); logo.rect(248 - w - k * 5, 4 + k * 3, w, 2, logo_p.wing[2 - min(2, k)])
art.scene('logo', logo, pal=logo_p, at=(192, 8))

budget('hud+title')
# --- Sprites: the cars. Eight widths; the nearest has a left, a straight and a right pose --------------------------------------
TIERS = tiers()
for ti, w in enumerate(TIERS):
    if ti < 1:
        for lean, tag in ((-1, 'L'), (0, 'C'), (1, 'R')): art.big_sprite('car%d%s' % (ti, tag), car(car_pal[0], w, lean), pal=car_pal[0], region='spr')
    else:
        art.big_sprite('car%d' % ti, car(car_pal[0], w, 0), pal=car_pal[0], region='spr')

budget('cars')
# --- Sprites: mystery cubes. A ray-cast cube turning about its vertical axis (four frames make a quarter turn, which is a whole
# turn of a cube), gold-bordered purple with a '?' on its sides ---------------------------------------------------------------------
QM = ['.###.', '#...#', '....#', '..##.', '..#..', '.....', '..#..']
def cube_img(size, frame):
    A_ = math.radians(10 + frame * 20.0); E = math.radians(30)
    f = (math.sin(A_) * math.cos(E), -math.sin(E), math.cos(A_) * math.cos(E))
    r = (math.cos(A_), 0.0, -math.sin(A_))
    u = (f[1] * r[2], f[2] * r[0] - f[0] * r[2], -f[1] * r[0])
    scale = (size / 2.0 - 1.0) / 1.38
    S = 3
    out = Img(size, size)
    for py in range(size):
        for px in range(size):
            votes = {}
            for sy in range(S):
                for sx in range(S):
                    x = ((px + (sx + 0.5) / S) - size / 2.0) / scale
                    y = -((py + (sy + 0.5) / S) - size / 2.0 - size * 0.02) / scale
                    o = [r[i] * x + u[i] * y - f[i] * 10 for i in range(3)]
                    t0, t1, face = -1e9, 1e9, None
                    for ax in range(3):
                        if abs(f[ax]) < 1e-9: continue
                        ta, tb = (-1 - o[ax]) / f[ax], (1 - o[ax]) / f[ax]
                        lo, hi = min(ta, tb), max(ta, tb)
                        if lo > t0: t0, face = lo, (ax, -1 if f[ax] > 0 else 1)
                        t1 = min(t1, hi)
                    if t0 >= t1 or face is None: continue
                    h = [o[i] + f[i] * t0 for i in range(3)]
                    ax, sg = face
                    if ax == 1:    # the top
                        uu, vv, shade = h[0], h[2], 2
                    else:
                        n = [0, 0, 0]; n[ax] = sg
                        uu, vv = h[0] * n[2] + h[2] * -n[0], h[1]
                        shade = 1 if (n[0] * 0.8 + n[2] * -0.6) > 0 else 0
                    b = max(abs(uu), abs(vv))
                    if b > 0.72: c = props.gold[2] if (b > 0.9 and (uu + vv) * 0.5 < -0.3) else props.gold[1] if shade else props.gold[0] if b > 0.9 else props.gold[1]
                    elif ax == 1: c = props.purple[2]
                    else:
                        c = props.purple[1 if shade else 0]
                        gx, gy = int((uu / 0.62 + 1) * 0.5 * 5), int((-vv / 0.62 * 0.9 + 1) * 0.5 * 7)
                        if abs(uu) < 0.62 and abs(vv) < 0.64 and 0 <= gx < 5 and 0 <= gy < 7 and QM[gy][gx] == '#': c = props.gold[2]
                    votes[c] = votes.get(c, 0) + 1
            if votes and sum(votes.values()) * 2 > S * S: out.px[py][px] = max(votes, key=lambda c: (votes[c], c))
    # a 1 px outline
    res = out.copy()
    for y in range(size):
        for x in range(size):
            if out.px[y][x]: continue
            if any(out.get(x + dx, y + dy) for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))): res.px[y][x] = props.edge
    return res
CUBES = [30, 22, 14, 9]             # px across: tiers 0 and 1 turn through four frames, the small ones two
for ci, sz in enumerate(CUBES):
    for fr in range(4 if ci < 2 else 2): art.big_sprite('cube%d_%d' % (ci, fr), cube_img(sz + 2, fr * (1 if ci < 2 else 2)), pal=props, region='spr')

budget('cubes')
# --- Sprites: cones (six heights) and guardrail posts ---------------------------------------------------------------------------------
def cone_img(h):
    w = max(4, int(round(h * 0.78)))
    d = Canvas(w, h, ss=6)
    cx = w / 2.0
    d.fill([(cx - w * 0.5, h), (cx + w * 0.5, h), (cx + w * 0.5, h - h * 0.14), (cx - w * 0.5, h - h * 0.14)], props.orange[0], part='base', pri=2)
    d.fill([(cx - w * 0.5, h * 0.96), (cx + w * 0.5, h * 0.96), (cx + w * 0.5, h * 0.86), (cx - w * 0.5, h * 0.86)], props.orange[0], pri=2)
    d.fill([(cx - w * 0.17, 0.0), (cx + w * 0.17, 0.0), (cx + w * 0.44, h * 0.88), (cx - w * 0.44, h * 0.88)], props.orange[1], part='body', pri=3)
    d.fill([(cx - w * 0.17, 0.0), (cx - w * 0.04, 0.0), (cx - w * 0.2, h * 0.88), (cx - w * 0.44, h * 0.88)], props.orange[2], inside='body', pri=3)
    d.fill([(cx - w * 0.28, h * 0.34), (cx + w * 0.28, h * 0.34), (cx + w * 0.34, h * 0.52), (cx - w * 0.34, h * 0.52)], props.white[1], inside='body', pri=4)
    return d.render(outline=props.edge)
CONES = [26, 20, 15, 11, 8, 6]
for ci, hh in enumerate(CONES): art.big_sprite('cone%d' % ci, cone_img(hh), pal=props, region='spr')

def post_img(h):
    w = max(3, int(h * 0.55)) | 1
    im = Img(w, h)
    pw = max(1, int(h * 0.16))
    cx = w // 2
    im.rect(cx - pw // 2, max(1, int(h * 0.2)), pw if pw % 2 else pw + 1, h - max(1, int(h * 0.2)), props.steel[1])
    im.rect(cx - pw // 2, max(1, int(h * 0.2)), 1, h - max(1, int(h * 0.2)), props.steel[2])
    im.rect(0, 0, w, max(1, int(h * 0.22)), props.steel[2]); im.rect(0, max(1, int(h * 0.22)) - 1, w, 1, props.steel[0]) if h > 6 else None
    return im
POSTS = [20, 14, 10, 7, 5, 4]
for ci, hh in enumerate(POSTS): art.big_sprite('post%d' % ci, post_img(hh), pal=props, region='spr')

budget('cones+posts')
# --- Sprites: effects. Boost exhaust: a blue-white starburst that pulses (three sizes, two frames); smoke and sparkles come from the
# icon library; the item icons for the HUD box -------------------------------------------------------------------------------------
def flame_img(size, fr, k=1.0):
    im = Img(size, size)
    c = (size - 1) / 2.0
    R = (size / 2.0 - 0.5) * k
    for y in range(size):
        for x in range(size):
            dx, dy = x - c, y - c
            d = math.hypot(dx, dy)
            ang = math.atan2(dy, dx)
            spike = 1.0 + 0.32 * math.cos(ang * (4 if fr == 0 else 5) + fr)
            t = d / (R * spike)
            if t < 0.28: im.px[y][x] = fx.flame[3]
            elif t < 0.55: im.px[y][x] = fx.flame[2]
            elif t < 0.8: im.px[y][x] = fx.flame[1]
            elif t < 1.0 and hsh(x * 7 + y * 13 + fr) % 2: im.px[y][x] = fx.flame[0]
    return im
for si, (sz, kk) in enumerate(((8, 1.0), (16, 0.72), (16, 1.0))):
    for fr in range(2): art.sprite('flame%d_%d' % (si, fr), flame_img(sz, fr, kk), pal=fx, region='spr')
for k, frm in enumerate(anim('puff', 16, items)): art.sprite('puff%d' % k, frm, pal=items, region='spr')
for k, frm in enumerate(anim('sparkle', 16, items)): art.sprite('spark%d' % k, frm, pal=items, region='spr')
for k, frm in enumerate(digits(items, 16, 'gold')): art.sprite('dg%d' % k, frm, pal=items, region='spr')
art.sprite('iBolt', icon('bolt', 16, items, colour='gold'), pal=items, region='spr')
art.sprite('iShield', icon('shield', 16, items, colour='blue'), pal=items, region='spr')
art.sprite('iFlag', icon('flag', 8, items), pal=items, region='spr')
oilicon = Img(16, 16)
oilicon.poly([(8, 1), (13, 8), (13, 11), (11, 14), (5, 14), (3, 11), (3, 8)], items.grey[0]); oilicon.poly([(8, 3), (12, 8), (12, 11), (10, 13), (6, 13), (4, 11), (4, 8)], items.blue[0])
oilicon.line(6, 9, 6, 11, items.blue[2]); oilicon.line(7, 7, 8, 6, items.blue[2]); oilicon.rect(5, 14, 7, 1, items.grey[0])
art.sprite('iOil', oilicon, pal=items, region='spr')

budget('effects')
# big item icons for the HUD box are the 16 px ones doubled in code (two sprites would cost more than they are worth)
# --- Overlay colours the code names ---------------------------------------------------------------------------------------------------------
art.color(200, '1a1648', 'GLASS')

if PREVIEW:
    os.makedirs(PREVIEW, exist_ok=True)
    s = Sheet(scale=3)
    for lean in (-1, 0, 1): s.add('car0%s' % 'LCR'[lean + 1], car(car_pal[0], 56, lean), car_pal[0])
    s.row()
    for sub in range(4): s.add('pal%d' % sub, car(car_pal[sub], 44, 0), car_pal[sub])
    s.row()
    for ci, sz in enumerate(CUBES[:4]):
        for fr in range(4): s.add('c%d.%d' % (ci, fr), cube_img(sz + 2, fr), props, scale=4 if sz < 20 else 3)
        s.row()
    for ci, hh in enumerate(CONES): s.add('cone%d' % ci, cone_img(hh), props, scale=3)
    for ci, hh in enumerate(POSTS): s.add('post%d' % ci, post_img(hh), props, scale=3)
    s.row()
    s.save(os.path.join(PREVIEW, 'sprites.png'))
    s = Sheet(scale=2)
    s.add('far', far, sky_p, scale=1); s.row(); s.add('near', near, hill_p, scale=1); s.row(); s.add('hud', H0, hud, scale=2); s.row(); s.add('logo', logo, logo_p, scale=2)
    s.save(os.path.join(PREVIEW, 'layers.png'))
    s = Sheet(scale=4)
    s.add('padG', pad_img(True, pads.g, pads.white), pads); s.add('padR', pad_img(False, pads.r, pads.white), pads); s.add('oil', oil, pads); s.row()
    for n in ('asphA0', 'asphB0', 'dashRA', 'dashLA', 'edgeLA', 'edgeRB', 'railA', 'postA', 'grA0', 'grB1', 'shA0'):
        pass
    s.save(os.path.join(PREVIEW, 'stamps.png'))

art.write(sys.argv[1])
