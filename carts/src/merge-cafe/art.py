# Merge Café's art: carts/src/merge-cafe/tiles.txt, palette.txt, map.txt and art.json, and the ART block in code.js.
#   python3 carts/src/merge-cafe/art.py carts/src/merge-cafe
# Written with the art toolkit (tools/devkit/art/kit.py; docs/dev/art-recipes.md). This cart owns those files: change the pictures
# here, not in them. Look at the result with tools/devkit/art/sprites.mjs, scene.mjs, tiles.mjs and proof.mjs (pack first).
#
# Layout (spec sections 4 and 12): BG1 the café (256 x 84, the top of the screen); BG0 the board (the counter top and its 35 plates, from
# line 84 down) with the order bubbles above it; BG2 the title's logo.
#
# The pictures (items, generators, the crate, the customers: 32 x 32 each) are not tiles: 50 of them at 16 tiles each would take most of
# the 1,024. They are kept in the cart's ROM (rom/pics.bin, written here) and code.js copies the ones the screen needs into a pool of
# POOL sprite slots (sset), the least recently used first (spec section 14). rom/pics.bin: a count, then for each picture its sprite
# palette and 32 x 32 palette indices, two to a byte (the left pixel in the low four bits).
import math, os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../../tools/devkit/art'))
from kit import *

COLS, ROWS, CW, CH, BX, BY = 7, 5, 32, 28, 16, 84          # the board: 7 x 5 cells of 32 x 28 px from (16, 84) (code.js has the same)

art = Art()
art.region('bg', 1, 383)
art.region('spr', 384, 1023)
POOL, PICS = 36, []                                        # the sprite slots for pictures; the pictures, in their ROM order (code.js: PIC)
art.color(200, '2a1810', 'GLASS')                           # the see-through panels' fill: a warm brown

# --- Palettes ---
cafe = art.palette(1, {'wall': ramp('7a9a80', 3, shift=0.4), 'wood': ramp('7a5034', 4), 'glass': ramp('a8c0c8', 3), 'ink': '1c1410', 'web': 'd8d8d0', 'glow': 'ffe090'})
board = art.palette(2, {'top': ramp('c08850', 4), 'plate': ramp('f0e4cc', 3), 'ink': '2a1810'})
logo_pal = art.palette(3, {'gold': ramp('f0b860', 5), 'edge': '2a1408', 'shade': '6a3820'})
bake = art.sprite_palette(0, {'gold': ramp('e0b048', 5), 'crust': ramp('a05a28', 4), 'cream': ramp('f4e4c4', 3), 'pink': ramp('f070a0', 3)})
LINE_PALS = [bake]
for sub, base in ((1, '7a4a2a'), (2, 'e8e0f0'), (3, 'd83848'), (4, '6890c8')):   # coffee, dairy, fruit, tableware: placeholders until step 3
    LINE_PALS.append(art.sprite_palette(sub, {'main': ramp(base, 5), 'ink': '201410'}))
mab = art.sprite_palette(5, {'skin': ramp('e8b088', 4), 'hair': ramp('c8c8d0', 4), 'shirt': ramp('5878c0', 4), 'pants': ramp('f0e8d8', 3)})
crate_pal = art.sprite_palette(6, {'wood': ramp('8a6038', 5), 'nail': 'c8c0b0', 'web': 'e8e8e0', 'shadow': '3a2418'})
fx = art.sprite_palette(7, {'spark': ramp('fff0a0', 3), 'cursor': ramp('ffffff', 2), 'cross': 'e04040'})

# --- The café (BG1): shabby, as it is when the game starts (spec 5.5; the restored versions come in step 5) ---
room = Img(256, 84)
for y in range(84):                                          # old plaster: a calm wall, a few damp stains, lighter where the paint is newer
    for x in range(256):
        n = fbm(x, y, 22, 3, 3)
        room.px[y][x] = cafe.wall[0] if n > 0.74 else cafe.wall[2] if n < 0.26 else cafe.wall[1]
for x0, y0 in ((96, 4), (226, 30), (150, 33)):                # cracks in the plaster
    x, y = x0, y0
    for k in range(9): room.pset(x, y, cafe.ink); x += (hsh(k + x0) % 3) - 1; y += 1
for x in range(0, 256, 16):                                  # the wainscot: vertical planks, one loose
    for y in range(40, 58):
        room.px[y][x] = cafe.wood[0]
        for k in range(1, 16):
            if x + k < 256: room.px[y][x + k] = cafe.wood[1 if (k + y // 6) % 9 == 0 else 2]
room.rect(0, 39, 256, 1, cafe.wood[3]); room.rect(0, 40, 256, 1, cafe.wood[0])
for y in range(41, 58): room.px[y][64 + (y // 4) % 2] = cafe.ink        # a crack in a plank
# the window: a frame, dirty glass, a crack
room.rect(14, 6, 60, 32, cafe.wood[1]); room.rect(16, 8, 56, 28, cafe.glass[1])
for y in range(8, 36):
    for x in range(16, 72):
        if fbm(x, y, 10, 7, 2) > 0.72: room.px[y][x] = cafe.glass[0]          # grime in the corners of the panes
        elif (x - y) % 17 in (0, 1) and (x + y) % 40 < 22: room.px[y][x] = cafe.glass[2]   # streaks of light
room.rect(43, 8, 2, 28, cafe.wood[1]); room.rect(16, 21, 56, 2, cafe.wood[1])
room.line(50, 9, 60, 20, cafe.ink); room.line(60, 20, 57, 26, cafe.ink)
# a cobweb in the corner, a bare bulb, a sagging shelf with dusty jars
for k in range(0, 18, 4): room.line(256 - 18 + k, 0, 255, 18 - k, cafe.web)
room.line(238, 0, 255, 17, cafe.web)
room.rect(140, 0, 1, 14, cafe.ink); room.rect(138, 14, 5, 3, cafe.wood[0]); room.disc(140, 19, 3, cafe.glow)
room.line(168, 26, 236, 28, cafe.wood[3]); room.line(168, 27, 236, 29, cafe.wood[0])
for jx, jh in ((174, 9), (186, 6), (214, 8)):
    room.rect(jx, 26 - jh, 8, jh, cafe.glass[1]); room.rect(jx + 1, 25 - jh, 6, 1, cafe.wood[1]); room.rect(jx + 1, 24 - jh // 2, 2, 3, cafe.glass[2])
# the counter's front (high priority: the customers stand behind it), worn planks with a lit top edge
counter = Img(256, 24)
plank = texture('planks', 64, 24, cafe.wood)
for x in range(0, 256, 64): counter.blit(plank, x, 0)
counter.rect(0, 0, 256, 2, cafe.wood[3]); counter.rect(0, 2, 256, 1, cafe.ink)
for x in (30, 118, 201): counter.rect(x, 5, 3, 2, cafe.ink)                 # knots and chips
room.blit(Img(256, 24), 0, 60)
art.scene('cafe', room.crop(0, 0, 256, 56), pal=cafe, at=(0, 48), solid=True)
art.scene('counter', Img.make(256, 32, lambda x, y: room.px[56 + y][x] if y < 4 else counter.px[y - 4][x] if y < 28 else 0), pal=cafe, at=(0, 55), prio=1)

# --- The board (BG0): the counter top, 7 x 5 plates; its map region is the whole screen, so the bubbles can go above it ---
top = Img(256, 224)
grain = texture('planks', 64, 56, board.top)
for y in range(BY, 224, 56):
    for x in range(0, 256, 64): top.blit(grain.crop(0, 0, 64, min(56, 224 - y)), x, y)
top.rect(0, BY, 256, 1, board.ink); top.rect(0, BY + 1, 256, 1, board.top[3])
for r in range(ROWS):
    for c in range(COLS):
        x0, y0 = BX + c * CW + 2, BY + r * CH + 3
        for y in range(y0, y0 + CH - 4):
            for x in range(x0, x0 + CW - 4):
                dx, dy = min(x - x0, x0 + CW - 5 - x), min(y - y0, y0 + CH - 5 - y)
                if dx + dy < 2: continue                      # rounded corners
                top.px[y][x] = board.plate[0] if (dx == 0 or dy == 0 or dx + dy == 2) else board.plate[1] if (dx < 3 or dy < 3) else board.plate[2]
art.scene('board', top, pal=board, at=(0, 0))

# --- An order bubble: 32 x 32, its tail pointing down at the customer (code.js copies it into BG0's map above a customer) ---
bub = Img(32, 32)
for y in range(32):
    for x in range(32):
        inside = ((x - 15.5) / 15) ** 2 + ((y - 13) / 12.5) ** 2 <= 1 or (y >= 24 and abs(x - 9) <= (31 - y) * 0.6 and y < 31)
        if inside: bub.px[y][x] = board.plate[2]
bub2 = bub.copy()
for y in range(32):
    for x in range(32):
        if bub.px[y][x] and any(not bub.get(x + dx, y + dy) for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))): bub2.px[y][x] = board.ink
art.scene('bubble', bub2, pal=board, at=(64, 0))

# --- The bakery line (line 0, tiers 1 to 6) and its generator, the grain sack ---
def wheat():
    d = Canvas(24, 24)
    for k, (dx, base) in enumerate(((-7, -1), (0, 0), (7, 1))):
        tp = (12 + dx, 3 + abs(dx) * 0.3)
        d.fill(brush([(12 + base, 22), tp], 1.1, 0.9), bake.crust[2], part='stem%d' % k)
        for j in range(4):
            t = 0.08 + j * 0.13
            cx, cy = tp[0] + (12 + base - tp[0]) * t, tp[1] + (22 - tp[1]) * t
            d.fill(oval(cx - 1.2, cy, 1.1, 1.9, rot=-35 + dx * 2), bake.gold[3], part='g%d' % k)
            d.fill(oval(cx + 1.2, cy, 1.1, 1.9, rot=35 + dx * 2), bake.gold[2], part='g%d' % k)
    d.fill(poly([(9.5, 16), (14.5, 16), (14.5, 18), (9.5, 18)]), bake.pink[1], part='tie')
    return d.render(outline=bake)
def flour():
    s = Sculpt(24, 24)
    s.ellipsoid(12, 15, 0, 8, 8, 6, bake.cream, smooth=2)
    s.ellipsoid(12, 6.5, 0, 4.5, 3, 4, bake.cream, smooth=2)
    im = s.render()
    for x in range(8, 17): im.pset(x, 13, bake.pink[1]); im.pset(x, 17, bake.pink[1])
    for x in range(10, 15): im.pset(x, 15, bake.gold[1])
    return im
def dough():
    s = Sculpt(24, 24); s.ellipsoid(12, 15, 0, 9, 6.5, 5, Mat(bake.cream, gloss=0.3)); return s.render()
def roll():
    s = Sculpt(24, 24); s.ellipsoid(12, 14, 0, 8, 6.5, 6, bake.gold)
    s.ellipsoid(12, 14, 3, 6, 4.5, 4.5, bake.crust)
    im = s.render()
    for k in range(-2, 3): im.pset(12 + k, 11 - abs(k) // 2, bake.gold[3])
    return im
def loaf():
    s = Sculpt(24, 24); s.ellipsoid(12, 14, 0, 10.5, 6.5, 6, bake.crust)
    im = s.render()
    for cx in (7, 12, 17):
        for d in range(4): im.pset(cx + d - 2 + (d > 1), 10 + d, bake.gold[3])
    return im
def cake():
    d = Canvas(24, 24)
    d.fill(oval(12, 21, 11, 2.5), bake.crust[1], part='plate')
    d.fill(poly([(3, 12), (21, 12), (21, 20), (3, 20)]), bake.pink[1], part='side')
    d.fill(oval(12, 20, 9, 2.2), bake.pink[1], part='side2')
    for y in (14.5, 17.5): d.fill(poly([(3, y), (21, y), (21, y + 1), (3, y + 1)]), bake.cream[2], inside='side')
    d.fill(oval(12, 12, 9, 3), bake.cream[2], part='top')
    for x in (5, 9, 13, 17): d.fill(oval(x + 1, 13.5, 1.3, 2), bake.cream[2], part='drip')
    d.fill(poly([(7, 5), (17, 5), (17, 10), (7, 10)]), bake.pink[2], part='tier')
    d.fill(oval(12, 10, 5, 1.6), bake.pink[2], part='tier2')
    d.fill(oval(12, 5, 5, 1.8), bake.cream[2], part='top2')
    d.fill(oval(12, 2.5, 2, 2), bake.pink[0], part='cherry')
    d.dot(11, 2, bake.cream[2])
    return d.render(outline=bake)
def sack():
    s = Sculpt(24, 24)
    s.ellipsoid(12, 15, 0, 9, 8.5, 6, Mat(bake.gold, rough=0.6))
    s.ellipsoid(12, 7, 0, 5, 3, 4, Mat(bake.gold, rough=0.6), smooth=2)
    s.capsule((7, 8, 4), (17, 8, 4), 1.2, 1.2, bake.crust)
    for dx in (-3, 0, 3): s.capsule((12 + dx * 0.3, 5, 1), (12 + dx, 1, 1), 0.8, 0.8, bake.gold)
    im = s.render()
    for x in range(9, 16): im.pset(x, 16, bake.crust[1])
    for y in range(13, 20): im.pset(12, y, bake.crust[1])
    return im

def boxed(im):
    """A 24 px picture in the middle of a 32 px sprite, its bottom 3 px above the sprite's (the plate's middle)."""
    out = Img(32, 32); out.blit(im, (32 - im.w) // 2, 32 - 3 - im.h - 2); return out

BAKERY = [boxed(f()) for f in (wheat, flour, dough, roll, loaf, cake)]

# --- The other lines: placeholders until step 3 (a ball that grows with the tier, a box for the generator) ---
def placeholder(P, t):
    s = Sculpt(24, 24); s.sphere(12, 13, 0, 3.5 + t * 1.3, Mat(P.main, gloss=0.5)); im = s.render()
    for k in range(t): im.pset(6 + k * 2 + (6 - t), 22, P.ink)
    return boxed(im)
def placeholder_gen(P):
    s = Sculpt(24, 24); s.ellipsoid(12, 13, 0, 10, 9, 6, Mat(P.main, rough=0.4)); return boxed(s.render())
# The pictures in ROM order: the items (line x 6 + tier - 1: 0 to 29), the generators (30 to 34), the crate (35), the regulars (36 on).
for line in range(5):
    for t in range(1, 7): PICS.append((BAKERY[t - 1] if line == 0 else placeholder(LINE_PALS[line], t), LINE_PALS[line]))
PICS.append((boxed(sack()), bake))
for line in range(1, 5): PICS.append((placeholder_gen(LINE_PALS[line]), LINE_PALS[line]))

# --- A crate over a closed cell ---
cr = Img(32, 32)
for y in range(4, 30):
    for x in range(3, 29):
        cr.px[y][x] = crate_pal.wood[1] if (y - 4) % 8 == 0 else crate_pal.wood[2 + (x + y // 8) % 2]
for x in range(3, 29): cr.px[4][x] = crate_pal.wood[4]; cr.px[29][x] = crate_pal.wood[0]
for y in range(4, 30): cr.px[y][3] = cr.px[y][28] = crate_pal.wood[0]
for k in range(22): cr.px[6 + k][5 + k] = crate_pal.wood[4] if k % 2 else crate_pal.wood[3]
for x, y in ((5, 6), (26, 6), (5, 27), (26, 27)): cr.px[y][x] = crate_pal.nail
for k in range(6): cr.px[4 + k][29 - 6 + k] = crate_pal.web; cr.px[4][23 + k] = crate_pal.web
PICS.append((cr, crate_pal))

# --- The cursor (two frames: a corner bracket that breathes), a spark, the "no" cross ---
def cursor(inset):
    im = Img(32, 32)
    for k in range(7):
        for (x, y) in ((inset + k, inset), (inset, inset + k), (31 - inset - k, inset), (31 - inset, inset + k),
                       (inset + k, 31 - inset), (inset, 31 - inset - k), (31 - inset - k, 31 - inset), (31 - inset, 31 - inset - k)):
            im.px[y][x] = fx.cursor[1]
            for dx, dy in ((1, 1),):
                if 0 <= x + dx < 32 and 0 <= y + dy < 32 and not im.px[y + dy][x + dx]: im.px[y + dy][x + dx] = fx.cursor[0]
    return im
art.sprite('cursor0', cursor(0), pal=fx, region='spr'); art.sprite('cursor1', cursor(2), pal=fx, region='spr')
art.sprite('spark', Img.from_rows(['...1....', '...2....', '..131...', '1233321.', '..131...', '...2....', '...1....', '........'],
                                  key={'1': fx.spark[0], '2': fx.spark[1], '3': fx.spark[2]}), pal=fx, region='spr')

# --- Mabel, the first regular: a bust behind the counter ---
def bust():
    d = Canvas(32, 32)
    d.fill(blob([(3, 32), (5, 24), (11, 20), (21, 20), (27, 24), (29, 32)]), mab.shirt[2], part='body')
    d.shadow('body', mab.shirt[1], light=(-1, -1), depth=3)
    d.fill(blob([(10, 32), (11, 24), (16, 23), (21, 24), (22, 32)]), mab.pants[2], part='apron')
    d.shadow('apron', mab.pants[1], light=(-1, -1), depth=2)
    d.fill(oval(16, 20, 3, 3), mab.skin[2], part='neck')
    d.fill(oval(16, 3, 4.5, 3.2), mab.hair[2], part='bun')
    d.shadow('bun', mab.hair[1], light=(-1, -1), depth=1.5)
    head(d, 16, 12, 17, mab.skin, mab.hair, view='front', style='short')
    for x in (12, 13, 14, 18, 19, 20): d.dot(x, 12, mab.hair[0])          # round glasses
    for x in (12, 14, 18, 20): d.dot(x, 13, mab.hair[0])
    d.dot(13, 13, mab.shirt[0]); d.dot(19, 13, mab.shirt[0])               # the eyes behind them
    for x in (15, 16, 17): d.dot(x, 12, mab.hair[0])
    im = d.render(outline=mab)
    # At this size the template's nose and mouth run together into a moustache: a one-pixel nose, a gap, a small smile.
    for x in range(13, 20): im.px[16][x] = mab.skin[2]
    im.px[15][16] = mab.skin[2]
    for x in (15, 16): im.px[17][x] = mab.skin[1]
    im.px[16][14] = im.px[16][17] = mab.skin[1]
    return im
mabel = bust()
blink = mabel.copy()
for x in range(12, 21): blink.px[13][x] = mab.hair[0] if blink.px[13][x] in (mab.shirt[0],) else blink.px[13][x]
PICS += [(mabel, mab), (blink, mab)]

# --- The picture pool's slots (each starts with a mark of its own, so the kit keeps its tiles), and the pictures in ROM ---
for k in range(POOL):
    mark = Img(32, 32); mark.px[k // 32][k % 32] = fx.spark[0]
    art.sprite('slot%d' % k, mark, pal=fx, region='spr')
for im, P in PICS:
    bad = im.colors() - set(P.names().values())
    if bad: raise ValueError('a picture uses colours %s that its palette does not define' % sorted(bad))
blob_ = bytearray([len(PICS)])
for im, P in PICS:
    blob_.append(P.sub)
    for y in range(32):
        for x in range(0, 32, 2): blob_.append(im.px[y][x] | (im.px[y][x + 1] << 4))
os.makedirs(os.path.join(sys.argv[1], 'rom'), exist_ok=True)
open(os.path.join(sys.argv[1], 'rom', 'pics.bin'), 'wb').write(bytes(blob_))

# --- The title: MERGE CAFE in warm bevelled letters (BG2, shown on the title) ---
logo = Img(256, 56)
for k, word in enumerate(('MERGE', 'CAFE')):
    t = big_text(word, logo_pal.gold, scale=2, outline=logo_pal.edge, shadow=logo_pal.shade)
    logo.blit(t, (256 - t.w) // 2, k * 26 + 1)
art.scene('logo', logo, pal=logo_pal, at=(96, 0))

art.write(sys.argv[1])
