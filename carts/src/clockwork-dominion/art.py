# Clockwork Dominion's art: carts/src/clockwork-dominion/tiles.txt, palette.txt, map.txt and art.json, and the ART block in code.js.
#   python3 carts/src/clockwork-dominion/art.py carts/src/clockwork-dominion
# Written with the art toolkit (tools/devkit/art/kit.py: its header explains the pieces). This cart owns those files:
# change the pictures here, not in them. Look at the result with
#   node tools/devkit/art/sprites.mjs carts/clockwork-dominion.nova out.png
#   node tools/devkit/art/scene.mjs carts/clockwork-dominion.nova out.png --scene wall
#   node tools/devkit/shots.mjs carts/clockwork-dominion.nova out/ --at 120 --extra "skipTitle = true;"
# (pack first: node tools/pack.js carts/src/clockwork-dominion carts/clockwork-dominion.nova).
#
# The view (lines 0 to 91, spec section 12), one for each act, all in the one tile sheet:
#   Act I    the workshop: BG2 the town of Rotella seen through the arched window (the sky behind it is the backdrop's
#            gradient), BG1 the wall (panelling, shelves of clocks, Paulo's armchair, the window's frame), BG0 the bench
#   Act II   the world: BG2 a globe (a 128 x 64 map read by the affine layer, a sphere line by line in scanline()),
#            BG1 the stars
#   Act III  the orrery: BG2 a spiral galaxy turning (the affine layer), BG1 the stars; gears and moths as sprites
# The panel's ink (overlay colours 113 to 124) and the sprites (Marco, Paulo, tinkers, cogs, gears, moths, the Rust).
import math, os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../../tools/devkit/art'))
from kit import *

art = Art()
art.region('bg', 1, 639)       # background tiles
art.region('spr', 640, 1023)   # sprites (a 16 px sprite takes four tiles)
W, H = 256, 96                 # the view's pictures: 12 rows of tiles (the view shows 92 lines of them)

# --- The panel's ink: overlay colours, BG palette 7's entries (113 to 127), kept for the overlay alone ---
INK = {
    'PAPER': '141d33', 'ROW': '22305a', 'INK': 'f2e6c8', 'DIM': '8790ad', 'BRASS': 'e8b04a', 'GOLD': 'ffe596',
    'BAD': 'e2735a', 'GOOD': '9ed27a', 'EDGE': '070a14', 'LINE': '9a6a2a', 'THINK': '8cc4ee', 'LOG': 'cdbf9e',
}
for k, (name, hexc) in enumerate(INK.items()):
    art.color(113 + k, hexc, name)

# --- The backdrops, a colour for each line (scanline() picks the act's) ---
art.gradient('day', [(0, '3c6eb4'), (30, '7eb0dc'), (52, 'd8c4a0'), (60, 'f0b878'), (91, 'f0b878')], y0=0, y1=91)
art.gradient('night', [(0, '060a1c'), (40, '18204a'), (60, '3a2c4a'), (91, '3a2c4a')], y0=0, y1=91)
art.gradient('space', [(0, '02030a'), (50, '0a0c24'), (91, '1a1030')], y0=0, y1=91)


def tex_noise(x, y, s, seed=0):
    return noise(x, y, s, seed)


# ===================================================== Act I =====================================================
wood = art.palette(1, {'wood': ramp('6e4022', 5), 'brass': ramp('c08a30', 3), 'cream': 'efe0c0', 'velvet': ramp('8a2a2a', 3),
                       'dark': '24140c'})
WIN = (168, 6, 240, 62)   # the window: left, top, right, bottom (an arch on top)


def in_window(x, y):
    l, t, r, b = WIN
    if not (l <= x < r and t <= y < b): return False
    cx, rad = (l + r) / 2, (r - l) / 2
    top = t + rad
    return y >= top or (x - cx) ** 2 + (y - top) ** 2 <= rad * rad


def wall_px(x, y):
    """The workshop's back wall: planks with a rail, shadowed into the corner; the window cut out of it."""
    if in_window(x, y): return 0
    W5 = wood.wood
    plank = (x // 16) % 2
    grain = tex_noise(x * 0.3, y * 2.2, 4, 7) > 0.62
    shade = 2 + plank - (1 if grain else 0)
    if x % 16 == 0: shade = 0
    if 40 <= y < 44: shade = 3 if y == 40 else 1            # the rail
    if y >= 66: shade = 0                                     # the shadow under the bench
    if x < 24: shade = max(0, shade - 1)                      # the corner is darker
    return W5[max(0, min(4, shade))]


wall = Img.make(W, 72, wall_px)
# the window's frame: brass-edged wood around the arch, a cross of mullions, a sill
for y in range(WIN[1] - 3, WIN[3] + 4):
    for x in range(WIN[0] - 3, WIN[2] + 3):
        if not in_window(x, y) and any(in_window(x + dx, y + dy) for dx, dy in ((2, 0), (-2, 0), (0, 2), (0, -2), (2, 2), (-2, -2), (2, -2), (-2, 2))):
            wall.pset(x, y, wood.brass[1] if (x + y) % 5 else wood.brass[2])
mx = (WIN[0] + WIN[2]) // 2
for y in range(WIN[1] + 4, WIN[3]):
    wall.pset(mx, y, wood.wood[1]); wall.pset(mx + 1, y, wood.wood[3])
for x in range(WIN[0], WIN[2]):
    if in_window(x, 34): wall.pset(x, 34, wood.wood[1]); wall.pset(x, 35, wood.wood[3])
wall.rect(WIN[0] - 6, WIN[3] + 2, WIN[2] - WIN[0] + 12, 3, wood.wood[4]); wall.rect(WIN[0] - 6, WIN[3] + 5, WIN[2] - WIN[0] + 12, 1, wood.dark)
# shelves of clocks on the left wall, and a tall case clock between them and the window
for sy in (16, 36):
    wall.rect(6, sy, 64, 2, wood.wood[4]); wall.rect(6, sy + 2, 64, 1, wood.dark)
for k, (cx, cy, r) in enumerate([(14, 10, 5), (30, 9, 6), (48, 11, 4), (62, 10, 5), (16, 30, 5), (34, 29, 6), (54, 31, 4)]):
    wall.disc(cx, cy, r + 1, wood.brass[0]); wall.disc(cx, cy, r, wood.brass[2]); wall.disc(cx, cy, r - 1, wood.cream)
    a = k * 1.3
    wall.line(cx, cy, cx + round(math.cos(a) * (r - 2)), cy + round(math.sin(a) * (r - 2)), wood.dark)
    wall.line(cx, cy, cx, cy - (r - 2), wood.dark)
wall.rect(132, 6, 20, 58, wood.wood[0]); wall.rect(134, 8, 16, 54, wood.wood[2])
wall.disc(142, 18, 7, wood.brass[1]); wall.disc(142, 18, 6, wood.cream); wall.line(142, 18, 142, 13, wood.dark); wall.line(142, 18, 146, 18, wood.dark)
wall.rect(137, 30, 10, 28, wood.dark)
for y in range(32, 56): wall.pset(142, y, wood.brass[1])
wall.disc(142, 52, 3, wood.brass[2])
# Paulo's armchair, in the corner by the shelves
for y in range(42, 70):
    for x in range(78, 118):
        back = 80 <= x < 116 and 42 <= y < 62 and ((x - 98) / 19) ** 2 + ((y - 56) / 15) ** 2 <= 1
        seat = 78 <= x < 118 and 60 <= y < 68
        arm = (78 <= x < 86 or 110 <= x < 118) and 52 <= y < 66
        if back or seat or arm:
            v = wood.velvet[2 if (x + y // 2) % 9 else 1] if not arm else wood.velvet[1]
            if y >= 66 or x in (78, 117): v = wood.velvet[0]
            wall.pset(x, y, v)
art.scene('wall', wall, pal=wood, at=(0, 0))

bench = Img(W, 24)
for y in range(24):
    for x in range(W):
        g = tex_noise(x * 0.12, y * 0.9, 3, 3)
        v = 3 if g > 0.55 else 2 if g > 0.3 else 1
        bench.px[y][x] = wood.wood[4 if y == 0 else 3 if y == 1 else 0 if y >= 21 else v]
art.scene('bench', bench, pal=wood, at=(0, 12), solid=True)

# The town of Rotella through the window: hills, rooftops, a clock tower, cypresses, lit windows at dusk
town = art.palette(2, {'hill': recede(ramp('5a8a4a', 2), 0.35, 'd8c4a0'), 'roof': ramp('b0583a', 3), 'stone': ramp('d8c6a0', 2),
                       'cypress': ramp('2a4a2a', 2), 'lamp': 'ffd870', 'face': 'f8f0d8'})
tw = Img(W, 72)
L, T, R, B = WIN
for x in range(L, R):
    hy = 44 + round(4 * math.sin(x / 9) + 2 * math.sin(x / 4.3))
    for y in range(hy, B):
        tw.pset(x, y, town.hill[1] if y > hy + 3 else town.hill[0])
houses = [(L - 2, 50, 14), (L + 10, 46, 12), (L + 20, 52, 13), (L + 46, 48, 12), (L + 56, 51, 14), (L + 64, 45, 10)]
for hx, hy, hw in houses:
    tw.rect(hx, hy + 4, hw, B - hy, town.stone[1]); tw.rect(hx + hw - 3, hy + 4, 3, B - hy, town.stone[0])
    for k in range(hw // 2 + 1): tw.line(hx - 1 + k, hy + 4 - k // 2, hx + hw - k, hy + 4 - k // 2, town.roof[1 + (k % 2)])
    tw.line(hx - 1, hy + 4, hx + hw, hy + 4, town.roof[0])
    for wx in range(hx + 2, hx + hw - 2, 5): tw.rect(wx, hy + 8, 2, 3, town.lamp)
tx0 = (L + R) // 2 + 6      # the clock tower
tw.rect(tx0, 16, 10, B - 16, town.stone[1]); tw.rect(tx0 + 7, 16, 3, B - 16, town.stone[0])
for k in range(7): tw.line(tx0 - 1 + k, 16 - k, tx0 + 10 - k, 16 - k, town.roof[2 if k % 2 else 1])
tw.disc(tx0 + 5, 24, 3, town.face); tw.pset(tx0 + 5, 22, town.roof[0]); tw.pset(tx0 + 6, 24, town.roof[0])
for cxp in (L + 8, L + 40, R - 6):
    for y in range(30, 54):
        wdt = max(0, round(3 * math.sin((y - 30) / 24 * math.pi)))
        for x in range(cxp - wdt, cxp + wdt + 1): tw.pset(x, y, town.cypress[1 if x < cxp else 0])
for y in range(72):
    for x in range(W):
        if not in_window(x, y): tw.px[y][x] = 0
art.scene('town', tw, pal=town, at=(32, 0))

# ===================================================== Act II =====================================================
# The globe: an equirectangular map, 128 x 64, ocean and land and ice. code.js turns the land's colours to brass as
# the world is wound (they are the palette's entries 'land' and 'coast').
globe = art.palette(3, {'sea': ramp('1e4a8a', 4), 'land': ramp('4a8a3a', 3), 'coast': 'c8b878', 'ice': 'e8f0f8'})
gm = Img(128, 64)
for y in range(64):
    lat = abs(y - 31.5) / 32
    for x in range(128):
        h = fbm(x / 128 * 6, y / 64 * 3, 1, 11, octaves=4, period=(6, 1024)) if 'fbm' in globals() else noise(x, y, 18, 11)
        land = h > 0.56 - 0.08 * lat
        if lat > 0.86: gm.px[y][x] = globe.ice
        elif land:
            gm.px[y][x] = globe.coast if h < 0.585 - 0.08 * lat else globe.land[2 if h > 0.68 else 1 if h > 0.62 else 0]
        else:
            gm.px[y][x] = globe.sea[3 if h > 0.5 else 2 if h > 0.42 else 1 if h > 0.3 else 0]
art.scene('globe', gm, pal=globe, at=(64, 0), solid=True, prio=1)

# The stars: a few tiles of single stars, scattered (two of them turn gold in Act III as the stars are wound)
sky = art.palette(4, {'star': ramp('8090c0', 3), 'gold': ramp('e8b04a', 2), 'nebula': ramp('2a1a4a', 2)})
star_tiles = []
for k in range(7):
    t = Img(8, 8)
    for j in range(1 + k % 3):
        sx, sy = int(hsh(k * 17 + j * 5) % 8), int(hsh(k * 29 + j * 3 + 1) % 8)
        t.pset(sx, sy, [sky.star[0], sky.star[1], sky.gold[0], sky.star[2], sky.gold[1], sky.star[0], sky.star[1]][(k + j) % 7])
    star_tiles.append(t)
stars_img = tile_fill(W, H, star_tiles, seed=5, weights=[3, 3, 1, 1, 1, 2, 2])
art.scene('stars', stars_img, pal=sky, at=(0, 16))

# ===================================================== Act III ====================================================
# The galaxy: a spiral, 128 x 128, its two arms lit along their length, a gold core; read by the affine layer, turning.
gal = art.palette(5, {'arm': ramp('5a4aa0', 4), 'core': ramp('e8b04a', 3), 'dust': ramp('2a2050', 2)})
gi = Img(128, 128)
for y in range(128):
    for x in range(128):
        dx, dy = x - 63.5, y - 63.5
        r = math.hypot(dx, dy)
        if r > 62: continue
        th = math.atan2(dy, dx)
        arm = max(math.cos(2 * (th - math.log(r + 1) * 1.9)), 0) ** 3
        dens = arm * (1 - r / 64) * 1.6 + max(0, 1 - r / 14) * 1.2 + (noise(x, y, 6, 3) - 0.5) * 0.25
        if r < 7: gi.px[y][x] = gal.core[2 if r < 3 else 1]
        elif r < 12 and dens > 0.9: gi.px[y][x] = gal.core[0]
        elif dens > 0.85: gi.px[y][x] = gal.arm[3]
        elif dens > 0.6: gi.px[y][x] = gal.arm[2]
        elif dens > 0.4: gi.px[y][x] = gal.arm[1]
        elif dens > 0.26 and dither(x, y, 8): gi.px[y][x] = gal.arm[0]
        elif dens > 0.16 and dither(x, y, 4): gi.px[y][x] = gal.dust[1]
art.scene('galaxy', gi, pal=gal, at=(80, 0))

# ===================================================== Sprites ====================================================
marcoc = art.sprite_palette(0, {'edge': '1a0f08', 'brass': ramp('b07a2a', 4), 'eye': 'bfe8ff', 'key': ramp('8a8a96', 2), 'glow': 'fff0b0'})
K = {'o': marcoc.edge, 'd': marcoc.brass[0], 'm': marcoc.brass[1], 'b': marcoc.brass[2], 'l': marcoc.brass[3], 'e': marcoc.eye,
     'k': marcoc.key[1], 'K': marcoc.key[0], 'g': marcoc.glow}
marco_rows = [
    '................',
    '.......kk.......',
    '......k..k......',
    '.......kK.......',
    '.....oooooo.....',
    '....ollllbmo....',
    '...olbbbbbbmo...',
    '...olbeebeemo...',
    '...olbeebeemo...',
    '...olbbbbbbmo...',
    '...obboggobmo...',
    '....obbbbbmo....',
    '.....omdddo.....',
    '....omo..omo....',
    '...omdo..odmo...',
    '...ooo....ooo...',
]
art.sprite('marco', Img.from_rows(marco_rows, key=K), pal=marcoc, region='spr')
blink = list(marco_rows); blink[7] = '...olbbbbbbmo...'; blink[8] = '...olbooboomo...'
art.sprite('marco2', Img.from_rows(blink, key=K), pal=marcoc, region='spr')
cog = Img.from_rows(['..o..o..', '.olbblo.', 'oblddbdo', '.bd..db.', '.bd..db.', 'obddddbo', '.obbbdo.', '..o..o..'], key=K)
art.sprite('cog', cog, pal=marcoc, region='spr')
for n, rows in enumerate([['...k....', '..oooo..', '.olbbmo.', '.obeemo.', '.obbbmo.', '..oooo..', '..o..o..', '.oo..oo.'],
                          ['....k...', '..oooo..', '.olbbmo.', '.obeemo.', '.obbbmo.', '..oooo..', '.o....o.', 'oo....oo']]):
    art.sprite('tinker%d' % n, Img.from_rows(rows, key=K), pal=marcoc, region='spr')

# Paulo, in his armchair: a kindly old clockmaker, white hair, spectacles, a green waistcoat (32 x 32)
paulo = art.sprite_palette(1, {'edge': '1c1010', 'skin': ramp('d8a888', 3), 'hair': ramp('c8c8d0', 2), 'coat': ramp('3a6a4a', 3),
                               'shirt': 'e8e0d0', 'lens': 'a0d8f0', 'shoe': '3a2418'})
P = {'o': paulo.edge, 's': paulo.skin[0], 'S': paulo.skin[1], 'L': paulo.skin[2], 'h': paulo.hair[0], 'H': paulo.hair[1],
     'c': paulo.coat[0], 'C': paulo.coat[1], 'G': paulo.coat[2], 'w': paulo.shirt, 'e': paulo.lens, 'f': paulo.shoe}
paulo_rows = [
    '................................',
    '.............oooooo.............',
    '...........ooHHHHHHoo...........',
    '..........oHHHhhhhHHHo..........',
    '.........oHHhoooooohHHo.........',
    '.........oHhoLLLLLLohHo.........',
    '.........ohoLLLLLLLLoho.........',
    '.........ohoeeoLLoeeoho.........',
    '.........oooeeoooOeeooo.........',
    '..........oLLLLSSLLLLo..........',
    '..........oSLLLssLLLSo..........',
    '...........oSHHHHHHSo...........',
    '...........oHHHooHHHo...........',
    '............oHHHHHHo............',
    '...........oowwwwwwoo...........',
    '.........ooCCwwSSwwCCoo.........',
    '........oCCGCCwwwwCCGCCo........',
    '.......oCCGGCCCwwCCCGGCCo.......',
    '.......oCGGCCCCwwCCCCGGCo.......',
    '......oCCGCCCCCwwCCCCCGCCo......',
    '......oCGGCCccCwwCccCCGGCo......',
    '......oCGCCcSSCCCCSScCCGCo......',
    '......oCCCcSLLSCCSLLScCCCo......',
    '......occcoSSSScccSSSSocccoo....',
    '.......ooooccccccccccccoooo.....',
    '..........occcccccccccco........',
    '.........occccooooocccco........',
    '.........occco.....occco........',
    '.........occco.....occco........',
    '.........offfo.....offfo........',
    '........offffo.....offffo.......',
    '........oooooo.....oooooo.......',
]
P['O'] = paulo.edge
art.sprite('paulo', Img.from_rows(paulo_rows, key=P), pal=paulo, region='spr')
nod = list(paulo_rows); nod[7] = '.........ohoLLLLLLLLoho.........'; nod[8] = '.........ohoooooooooooho........'[:32]
art.sprite('paulo2', Img.from_rows(nod, key=P), pal=paulo, region='spr')

# Gears for the orrery and the machines: a sun gear (32) and a planet gear (16), brass, lit from the upper left
def gear(size, teeth, ramp_, edge, hole):
    c, R0 = (size - 1) / 2, size / 2 - 1
    def f(x, y):
        dx, dy = x - c, y - c
        r, th = math.hypot(dx, dy), math.atan2(dy, dx)
        rim = R0 - (1.6 if math.cos(teeth * th) < 0 else 0)
        if r > rim: return 0
        if r > rim - 1: return edge
        if r < hole: return edge if r > hole - 1 else 0
        lit = -(dx + dy) / (size * 0.7)
        k = 2 + round(lit * 2) - (1 if r < R0 * 0.55 and r > R0 * 0.45 else 0)
        return ramp_[max(0, min(len(ramp_) - 1, k))]
    return Img.make(size, size, f)
mach = art.sprite_palette(2, {'edge': '20140a', 'brass': ramp('c08a30', 5), 'wing': ramp('f0d890', 2), 'glow': 'fff8e0'})
art.sprite('sun', gear(32, 14, mach.brass, mach.edge, 4), pal=mach, region='spr')
art.sprite('planet', gear(16, 8, mach.brass, mach.edge, 2), pal=mach, region='spr')
M2 = {'o': mach.edge, 'b': mach.brass[2], 'l': mach.brass[4], 'w': mach.wing[0], 'W': mach.wing[1], 'g': mach.glow}
art.sprite('moth0', Img.from_rows(['ww....ww', 'Wwo..owW', '.wwoowW.', '..obbo..', '..obbo..', '.wwoowW.', 'Ww....wW', '........'], key=M2), pal=mach, region='spr')
art.sprite('moth1', Img.from_rows(['........', '........', 'wwwoowww', 'WWWbbWWW', '..obbo..', '...oo...', '........', '........'], key=M2), pal=mach, region='spr')
rust = art.sprite_palette(3, {'edge': '1a0606', 'rust': ramp('a03420', 3), 'eye': 'ff7050'})
R3 = {'o': rust.edge, 'b': rust.rust[0], 'w': rust.rust[1], 'W': rust.rust[2], 'e': rust.eye}
art.sprite('rust0', Img.from_rows(['ww....ww', 'Wwo..owW', '.wwoowW.', '..oeeo..', '..obbo..', '.wwoowW.', 'Ww....wW', '........'], key=R3), pal=rust, region='spr')
art.sprite('rust1', Img.from_rows(['........', '........', 'wwwoowww', 'WWWeeWWW', '..obbo..', '...oo...', '........', '........'], key=R3), pal=rust, region='spr')
# a workbench, seen in the back room as the shop grows (16 x 16)
bench_s = Img.from_rows([
    '................', '................', '......ooo.......', '.....obbbo......', '.....oblbo......', '......ooo.......',
    'oooooooooooooooo', 'ollllllllllllllo', 'obbbbbbbbbbbbbbo', 'oooooooooooooooo', '.ob..........bo.', '.ob..........bo.',
    '.ob..........bo.', '.ob..........bo.', '.oo..........oo.', '................'], key=M2)
art.sprite('workbench', bench_s, pal=mach, region='spr')

art.write(sys.argv[1])
