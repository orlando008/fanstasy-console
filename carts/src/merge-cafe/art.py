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
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
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
coffee_pal = art.sprite_palette(1, {'bean': ramp('6a3c20', 4), 'china': ramp('f0ece4', 3), 'crema': ramp('d8a060', 4), 'metal': ramp('c09040', 3)})
dairy_pal = art.sprite_palette(2, {'milk': ramp('f4f0f8', 4), 'pink': ramp('f08ab0', 3), 'choc': ramp('8a5030', 4), 'glass': ramp('a8c4d8', 3)})
fruit_pal = art.sprite_palette(3, {'red': ramp('d83040', 4), 'leaf': ramp('58a040', 3), 'berry': ramp('5a50b0', 3), 'crust': ramp('d8a060', 4)})
table_pal = art.sprite_palette(4, {'china': ramp('f0f0f4', 4), 'blue': ramp('4870c0', 3), 'silver': ramp('b8c0c8', 4), 'gold': ramp('e0b040', 3)})
LINE_PALS = [bake, coffee_pal, dairy_pal, fruit_pal, table_pal]
# Sprite palettes 5 to 7 are the three places at the counter: the same roles in each, and code.js loads a customer's colours (rom/people.bin)
# into the palette of the place they stand at. Everything else (the crate, the cursor, the café's furniture) is drawn in the item palettes.
PEOPLE = [   # name, skin, hair, shirt, apron or trousers: the regulars (one a line), then three passers-by
    ('MABEL', 'e8b088', 'c8c8d0', '5878c0', 'f0e8d8'), ('THEO', 'c08860', '403028', '40a8a0', 'e8f0f0'),
    ('PIP', 'f0c098', 'e0a040', 'e04848', '4060b0'), ('ROSA', 'a87050', '302020', '58a050', 'f0e0c8'),
    ('FINCH', 'e8c0a0', 'b0b0b8', '806040', 'f0f0e8'), ('STUDENT', 'd8a078', '603820', '8060c0', '404860'),
    ('CLERK', 'b88060', '282020', '506070', 'e0e0e8'), ('TOURIST', 'f0c8a0', 'c08040', 'f0a040', '60a0d0')]
def person_pal(sub, k):
    _, skin, hair, shirt, low = PEOPLE[k]
    return art.sprite_palette(sub, {'skin': ramp(skin, 4), 'hair': ramp(hair, 4), 'shirt': ramp(shirt, 4), 'pants': ramp(low, 3)})
mab = person_pal(5, 0); person_pal(6, 1); person_pal(7, 2)
counter_pal = art.palette(4, {'wood': ramp('8a5a38', 4), 'ink': '1c1410', 'top': ramp('b88458', 2)})

# --- The café (BG1): drawn shabby, and drawn again with each repair (spec 5.5). Each repair changes its own tiles (art.py checks they
# do not overlap); the repaired tiles are stored as scenes off to the side of Map RAM and rom/fixes.bin says where each goes, so
# code.js copies a repair into the café's map when its task is done. Paint and wood stain are colours (code.js: STYLES). ---
def draw_room(fixed=()):
    room = Img(256, 56)
    for y in range(56):                                       # old plaster: a calm wall, a few damp stains
        for x in range(256):
            n = fbm(x, y, 22, 3, 3)
            room.px[y][x] = cafe.wall[0] if n > 0.74 else cafe.wall[2] if n < 0.26 else cafe.wall[1]
    if 'cracks' not in fixed:
        for x0, y0 in ((96, 4), (242, 33), (150, 33)):
            x, y = x0, y0
            for k in range(9): room.pset(x, y, cafe.ink); x += (hsh(k + x0) % 3) - 1; y += 1
    for x in range(0, 256, 16):                               # the wainscot: vertical planks
        for y in range(40, 56):
            room.px[y][x] = cafe.wood[0]
            for k in range(1, 16):
                if x + k < 256: room.px[y][x + k] = cafe.wood[1 if (k + y // 6) % 9 == 0 else 2]
    room.rect(0, 39, 256, 1, cafe.wood[3]); room.rect(0, 40, 256, 1, cafe.wood[0])
    if 'cracks' not in fixed:
        for y in range(41, 56): room.px[y][64 + (y // 4) % 2] = cafe.ink
    room.rect(14, 6, 60, 32, cafe.wood[1]); room.rect(16, 8, 56, 28, cafe.glass[1])   # the window
    for y in range(8, 36):
        for x in range(16, 72):
            if 'window' not in fixed and fbm(x, y, 10, 7, 2) > 0.72: room.px[y][x] = cafe.glass[0]
            elif (x - y) % 17 in (0, 1) and (x + y) % 40 < 22: room.px[y][x] = cafe.glass[2]
    room.rect(43, 8, 2, 28, cafe.wood[1]); room.rect(16, 21, 56, 2, cafe.wood[1])
    if 'window' not in fixed: room.line(50, 9, 60, 20, cafe.ink); room.line(60, 20, 57, 26, cafe.ink)
    if 'cobweb' not in fixed:
        for k in range(0, 18, 4): room.line(256 - 18 + k, 0, 255, 18 - k, cafe.web)
        room.line(238, 0, 255, 17, cafe.web)
    if 'bulb' not in fixed: room.rect(140, 0, 1, 14, cafe.ink); room.rect(138, 14, 5, 3, cafe.wood[0]); room.disc(140, 19, 3, cafe.glow)
    if 'shelf' not in fixed:                                  # a sagging shelf with dusty jars
        room.line(168, 26, 236, 28, cafe.wood[3]); room.line(168, 27, 236, 29, cafe.wood[0])
        for jx, jh in ((174, 9), (186, 6), (214, 8)):
            room.rect(jx, 26 - jh, 8, jh, cafe.glass[1]); room.rect(jx + 1, 25 - jh, 6, 1, cafe.wood[1]); room.rect(jx + 1, 24 - jh // 2, 2, 3, cafe.glass[2])
    else:
        room.rect(168, 27, 69, 1, cafe.wood[3]); room.rect(168, 28, 69, 2, cafe.wood[1]); room.rect(168, 30, 69, 1, cafe.wood[0])
        for bx in (172, 232): room.rect(bx, 31, 2, 4, cafe.wood[0])
    return room
FIXES = ['cracks', 'window', 'cobweb', 'bulb', 'shelf']      # code.js: FIX, in this order
shabby = draw_room()
art.scene('cafe', shabby, pal=cafe, at=(0, 48), solid=True)
fix_blob, taken, fx_col = bytearray([len(FIXES)]), set(), 128
for f in FIXES:
    done = draw_room({f})
    cells = [(tx, ty) for ty in range(7) for tx in range(32) if done.crop(tx * 8, ty * 8, 8, 8) != shabby.crop(tx * 8, ty * 8, 8, 8)]
    if taken & set(cells): raise ValueError('the repair %r changes tiles another repair changes' % f)
    taken |= set(cells)
    x0, y0 = min(c[0] for c in cells), min(c[1] for c in cells)
    w, h = max(c[0] for c in cells) - x0 + 1, max(c[1] for c in cells) - y0 + 1
    art.scene('fix_' + f, done.crop(x0 * 8, y0 * 8, w * 8, h * 8), pal=cafe, at=(fx_col, 48), solid=True)
    fix_blob += bytes([x0, y0, w, h, fx_col, 48]); fx_col += w
# the counter's front, in a palette of its own (its wood is a style): a lit top, worn planks; high priority, so the customers stand behind it
counter = Img(256, 32)
plank = texture('planks', 64, 24, counter_pal.wood)
for x in range(0, 256, 64): counter.blit(plank, x, 4)
counter.rect(0, 0, 256, 3, counter_pal.top[1]); counter.rect(0, 3, 256, 1, counter_pal.ink)
for x in (30, 118, 201): counter.rect(x, 9, 3, 2, counter_pal.ink)
art.scene('counter', counter.crop(0, 0, 256, 28) if False else counter, pal=counter_pal, at=(0, 55), prio=1)

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

# --- The other four lines (items.py) ---
import items
LINES = [(BAKERY, boxed(sack()))] + [([boxed(im) for im in its], boxed(gen)) for its, gen in
         (items.coffee(coffee_pal), items.dairy(dairy_pal), items.fruit(fruit_pal), items.tableware(table_pal))]
# The pictures in ROM order: the items (line x 6 + tier - 1: 0 to 29), the generators (30 to 34), the crate (35), the regulars (36 on).
for line in range(5): PICS.extend((im, LINE_PALS[line]) for im in LINES[line][0])
for line in range(5): PICS.append((LINES[line][1], LINE_PALS[line]))

# --- A crate over a closed cell (in the bakery palette: its browns) ---
cr = Img(32, 32)
for y in range(4, 30):
    for x in range(3, 29):
        cr.px[y][x] = bake.crust[1] if (y - 4) % 8 == 0 else bake.crust[2 + (x + y // 8) % 2]
for x in range(3, 29): cr.px[4][x] = bake.gold[2]; cr.px[29][x] = bake.crust[0]
for y in range(4, 30): cr.px[y][3] = cr.px[y][28] = bake.crust[0]
for k in range(22): cr.px[6 + k][5 + k] = bake.gold[2] if k % 2 else bake.gold[1]
for x, y in ((5, 6), (26, 6), (5, 27), (26, 27)): cr.px[y][x] = bake.cream[2]
for k in range(6): cr.px[4 + k][29 - 6 + k] = bake.cream[2]; cr.px[4][23 + k] = bake.cream[2]
PICS.append((cr, bake))

# --- The cursor (two frames: a corner bracket that breathes), a spark, the "no" cross ---
def cursor(inset):
    im = Img(32, 32)
    for k in range(7):
        for (x, y) in ((inset + k, inset), (inset, inset + k), (31 - inset - k, inset), (31 - inset, inset + k),
                       (inset + k, 31 - inset), (inset, 31 - inset - k), (31 - inset - k, 31 - inset), (31 - inset, 31 - inset - k)):
            im.px[y][x] = table_pal.china[3]
            for dx, dy in ((1, 1),):
                if 0 <= x + dx < 32 and 0 <= y + dy < 32 and not im.px[y + dy][x + dx]: im.px[y + dy][x + dx] = table_pal.silver[0]
    return im
art.sprite('cursor0', cursor(0), pal=table_pal, region='spr'); art.sprite('cursor1', cursor(2), pal=table_pal, region='spr')
art.sprite('spark', Img.from_rows(['...1....', '...2....', '..131...', '1233321.', '..131...', '...2....', '...1....', '........'],
                                  key={'1': table_pal.gold[0], '2': table_pal.gold[1], '3': table_pal.gold[2]}), pal=table_pal, region='spr')

# --- The customers: busts behind the counter, in the roles of palette 5 (each drawn in its place's palette in the game) ---
HAIR = ['bun', 'short', 'spiky', 'long', 'bald', 'long', 'short', 'cap']
def bust(k, shut=False):
    P, style = mab, HAIR[k]
    child = k == 2
    d = Canvas(32, 32)
    top = 4 if child else 0                                   # Pip is a child: lower behind the counter
    d.fill(blob([(3, 32), (5, 24 + top), (11, 20 + top), (21, 20 + top), (27, 24 + top), (29, 32)]), P.shirt[2], part='body')
    d.shadow('body', P.shirt[1], light=(-1, -1), depth=3)
    if k in (0, 3): d.fill(blob([(10, 32), (11, 24 + top), (16, 23 + top), (21, 24 + top), (22, 32)]), P.pants[2], part='apron'); d.shadow('apron', P.pants[1], light=(-1, -1), depth=2)
    if k == 1: d.fill(poly([(12, 21), (20, 21), (16, 26)]), P.pants[2], part='collar')                 # scrubs' V neck
    if k in (4, 6): d.fill(poly([(13, 21), (19, 21), (17, 30), (15, 30)]), P.pants[2], part='shirtfront'); d.fill(oval(16, 22.5, 2.6, 1.3), P.shirt[0], part='tie')
    d.fill(oval(16, 20 + top, 3, 3), P.skin[2], part='neck')
    if style == 'bun': d.fill(oval(16, 3, 4.5, 3.2), P.hair[2], part='bun'); d.shadow('bun', P.hair[1], light=(-1, -1), depth=1.5)
    hs = {'bun': 'short', 'cap': 'short'}.get(style, style)
    head(d, 16, 12 + top, 17 if not child else 15, P.skin, P.hair, view='front', style=hs)
    if style == 'cap':                                         # the tourist's cap
        d.fill(blob([(8, 7), (10, 2), (22, 2), (24, 7)]), P.pants[2], part='cap'); d.fill(oval(16, 7.5, 10, 1.6), P.pants[1], part='peak')
    if k in (0, 4):                                            # round glasses
        y = 12 + top
        for x in (12, 13, 14, 18, 19, 20): d.dot(x, y, P.hair[0])
        for x in (12, 14, 18, 20): d.dot(x, y + 1, P.hair[0])
        for x in (15, 16, 17): d.dot(x, y, P.hair[0])
    if k == 3: d.fill(oval(22, 5, 2, 2), P.shirt[3], part='flower')                     # Rosa's flower
    im = d.render(outline=P)
    face = 12 + top
    for x in range(13, 20):                                    # a small face at this size: a one-pixel nose, a gap, a smile
        if im.px[face + 4][x] in (P.skin[0], P.skin[1]): im.px[face + 4][x] = P.skin[2]
    im.px[face + 3][16] = P.skin[2] if im.px[face + 3][16] in (P.skin[0], P.skin[1]) else im.px[face + 3][16]
    im.px[face + 5][15] = im.px[face + 5][16] = P.skin[1]
    if k not in (0, 4):                                        # eyes
        im.px[face + 1][13] = im.px[face + 1][19] = P.hair[0]
    if shut:
        for x in (12, 13, 14, 18, 19, 20):
            if im.px[face + 1][x] not in (0,) and x not in (12, 14, 18, 20): im.px[face + 1][x] = P.skin[1]
    if k == 1 and not shut: im.px[face][13] = im.px[face][19] = P.skin[1]          # Theo: sleepy lids
    return im
for k in range(len(PEOPLE)): PICS += [(bust(k), mab), (bust(k, shut=True), mab)]
people_blob = bytearray()
for k in range(len(PEOPLE)):                                   # each person's 15 colours, RGB555 little-endian, in the roles' order
    _, skin, hair, shirt, low = PEOPLE[k]
    for c in list(ramp(skin, 4)) + list(ramp(hair, 4)) + list(ramp(shirt, 4)) + list(ramp(low, 3)):
        r, g, b = (int(c[i:i + 2], 16) >> 3 for i in (0, 2, 4))
        v = r | (g << 5) | (b << 10); people_blob += bytes([v & 255, v >> 8])

# --- The café's furniture (props), in the item palettes; two styles where the task offers a choice (code.js: PROPS) ---
PROP_NAMES = []
def prop(name, im, P): PROP_NAMES.append(name); PICS.append((im, P))
def machine(P, body):
    d = Canvas(32, 32)
    d.fill(poly([(6, 12), (26, 12), (26, 30), (6, 30)]), body[2], part='body'); d.light('body', body[-1], light=(-1, -1), width=1.5)
    d.fill(blob([(8, 12), (11, 5), (21, 5), (24, 12)]), body[1], part='dome'); d.fill(oval(16, 4, 2, 1.5), P.bean[0], part='knob')
    d.fill(poly([(9, 17), (23, 17), (23, 19), (9, 19)]), P.bean[0], part='group')               # the group head and its handle
    d.fill(brush([(10, 18), (2, 21)], 1.6, 1.6), P.bean[0], part='handle')
    d.fill(brush([(25, 15), (29, 24)], 1, 1), P.china[1], part='wand')                         # the steam wand
    d.fill(poly([(12, 24), (20, 24), (19, 29), (13, 29)]), P.china[2], part='cup')
    return d.render(outline=P)
prop('machine_copper', machine(coffee_pal, coffee_pal.crema), coffee_pal)
prop('machine_chrome', machine(coffee_pal, coffee_pal.china), coffee_pal)
def register():
    d = Canvas(32, 32); P = table_pal
    d.fill(poly([(4, 16), (28, 16), (28, 30), (4, 30)]), P.gold[1], part='body'); d.light('body', P.gold[2], light=(-1, -1), width=1.5)
    d.fill(poly([(8, 8), (24, 8), (26, 16), (6, 16)]), P.gold[2], part='top'); d.fill(poly([(11, 10), (21, 10), (21, 14), (11, 14)]), P.china[3], part='screen')
    for x in range(8, 25, 4): d.fill(oval(x, 20, 1.3, 1.3), P.china[2], part='k%d' % x)
    d.fill(poly([(6, 25), (26, 25), (26, 28), (6, 28)]), P.gold[0], part='drawer')
    return d.render(outline=P)
prop('register', register(), table_pal)
def curtain(P, a, b):
    d = Canvas(32, 32)
    d.fill(poly([(4, 1), (20, 1), (19, 18), (13, 21), (16, 31), (6, 31), (8, 21), (4, 18)]), a, part='c')   # a panel, gathered by a tie
    for x in (8, 12, 16): d.ink([(x, 2), (x - 0.5, 17)], b, inside='c')
    d.ink([(9, 22), (11, 30)], b, inside='c')
    d.fill(oval(12, 20, 5, 1.4), table_pal.gold[1] if P is not table_pal else b, part='tie')
    d.fill(poly([(1, 0), (31, 0), (31, 2), (1, 2)]), P.crust[1] if P is fruit_pal else P.choc[2], part='rod')
    return d.render(outline=P)
prop('curtain_stripes', curtain(fruit_pal, fruit_pal.red[2], fruit_pal.crust[3]), fruit_pal)
prop('curtain_lace', curtain(dairy_pal, dairy_pal.milk[3], dairy_pal.milk[2]), dairy_pal)
def flowerbox():
    s = Sculpt(32, 32); P = fruit_pal
    s.ellipsoid(16, 27, 0, 14, 4, 4, P.crust)
    for x, c in ((6, P.red), (11, P.berry), (16, P.red), (21, P.berry), (26, P.red)):
        s.capsule((x, 25, 1), (x, 19, 1), 0.9, 0.9, P.leaf); s.sphere(x, 18, 3, 2.6, Mat(c, gloss=0.4))
    return s.render()
prop('flowerbox', flowerbox(), fruit_pal)
def lamp(P, shade_ramp):
    d = Canvas(32, 32)
    d.fill(poly([(15.5, 0), (16.5, 0), (16.5, 12), (15.5, 12)]), P.bean[0], part='cord')
    d.fill(blob([(9, 20), (12, 13), (20, 13), (23, 20)]), shade_ramp[2], part='shade'); d.light('shade', shade_ramp[-1], light=(-1, -1), width=1.5)
    d.fill(oval(16, 21, 3, 2), P.china[2], part='bulb')
    return d.render(outline=P)
prop('lamp_brass', lamp(coffee_pal, coffee_pal.metal), coffee_pal)
prop('lamp_glass', lamp(coffee_pal, coffee_pal.china), coffee_pal)
def plant():
    d = Canvas(32, 32); P = fruit_pal
    d.fill(poly([(10, 22), (22, 22), (20, 31), (12, 31)]), P.crust[1], part='pot'); d.light('pot', P.crust[3], light=(-1, -1), width=1.2)
    for a in (-60, -25, 0, 25, 60, -90, 90):
        r = math.radians(a); d.fill(brush([(16, 22), (16 + 10 * math.sin(r), 22 - 13 * math.cos(r))], 2.6, 0.8), P.leaf[1 + (a % 2 == 0)], part='l%d' % a)
    return d.render(outline=P)
prop('plant', plant(), fruit_pal)
def jars():
    s = Sculpt(32, 32); P = dairy_pal
    for x, c, h in ((7, P.pink, 9), (16, P.choc, 11), (25, P.glass, 8)):
        s.capsule((x, 29, 0), (x, 29 - h, 0), 4, 4, Mat(P.glass, gloss=0.8)); s.sphere(x, 30 - h / 2, 3, 3, c, front=True)
        s.ellipsoid(x, 28 - h - 2, 2, 3, 1.3, 2, P.choc)
    return s.render()
prop('jars', jars(), dairy_pal)
def record_player():
    d = Canvas(32, 32); P = coffee_pal
    d.fill(poly([(3, 20), (29, 20), (29, 30), (3, 30)]), P.bean[2], part='box'); d.light('box', P.bean[3], light=(-1, -1), width=1.2)
    d.fill(oval(14, 19, 10, 3), P.bean[0], part='disc'); d.fill(oval(14, 19, 2.5, 1), P.crema[2], part='label')
    d.fill(brush([(25, 21), (24, 3), (16, 2)], 2.5, 3.5), P.metal[2], part='horn'); d.fill(oval(14, 4, 6, 4, rot=-10), P.metal[2], part='bell'); d.fill(oval(14, 4, 3.5, 2.4, rot=-10), P.metal[0], part='hole')
    return d.render(outline=P)
prop('record_player', record_player(), coffee_pal)

# --- The picture pool's slots (each starts with a mark of its own, so the kit keeps its tiles), and the pictures in ROM ---
for k in range(POOL):
    mark = Img(32, 32); mark.px[k // 32][k % 32] = table_pal.gold[0]
    art.sprite('slot%d' % k, mark, pal=table_pal, region='spr')
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
open(os.path.join(sys.argv[1], 'rom', 'people.bin'), 'wb').write(bytes(people_blob))
open(os.path.join(sys.argv[1], 'rom', 'fixes.bin'), 'wb').write(bytes(fix_blob))
print('pictures:', len(PICS), '(items 0-29, generators 30-34, the crate 35, people 36-%d, props %d-%d: %s)' % (35 + 2 * len(PEOPLE), 36 + 2 * len(PEOPLE), len(PICS) - 1, ', '.join(PROP_NAMES)))

# --- The title: MERGE CAFE in warm bevelled letters (BG2, shown on the title) ---
logo = Img(256, 56)
for k, word in enumerate(('MERGE', 'CAFE')):
    t = big_text(word, logo_pal.gold, scale=2, outline=logo_pal.edge, shadow=logo_pal.shade)
    logo.blit(t, (256 - t.w) // 2, k * 26 + 1)
art.scene('logo', logo, pal=logo_pal, at=(96, 0))

art.write(sys.argv[1])
