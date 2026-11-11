# Wick's art: carts/src/wick/tiles.txt, palette.txt, map.txt and art.json, and the ART block in code.js.
#   python3 carts/src/wick/art.py carts/src/wick
# Written with the art toolkit (tools/devkit/art/kit.py; docs/dev/art-recipes.md shows what each part draws). Step 2: the
# look for the art proof (Wick's frames, the palettes, the Cellar's cells and far wall); the other worlds follow it.
# Map RAM: the room being played at (0, 0), 32 x 26 tiles, written by code.js from the cells' pictures at (40, 0); the far
# wall at (64, 0); the title's lettering at (0, 30); the darkness (one tile, repeated by the layer) at (40, 4).
import math, os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../../tools/devkit/art'))
from kit import *

art = Art()
art.region('bg', 1, 511)
art.region('spr', 512, 1023)

art.color(200, '0c0a18', 'GLASS')                                   # the panels' fill (see-through: code.js blends it)
# The Cellar: cold blue-grey stone, so Wick's warm light is the only warm thing in the room
castle = art.palette(1, {'stone': ramp('5a6078', 5), 'wood': ramp('7a4a26', 3), 'water': ramp('2a6aa8', 4), 'iron': ramp('8a8478', 2), 'glow': 'ffd870'})   # (the lantern's iron is pale, to be found in the dark)
far = art.palette(2, {'wall': recede(ramp('2c3048', 4), 0.5, '0a0a18'), 'night': ramp('1a2a5a', 2), 'moon': 'c8d8f0'})
fire = art.palette(3, {'gold': ramp('e0a030', 5), 'edge': '1c1020', 'shade': '2a2040'})
dark = art.palette(4, {'dark': '0a0c20'})
wick_pal = art.sprite_palette(0, {'edge': '3a1808', 'flame': ramp('f08a28', 4), 'core': 'fff6c8', 'wax': ramp('e0d8c0', 3), 'eye': '2a1a10', 'soot': ramp('4a4450', 2)})

# --- The cells' pictures, 16 x 16 each, side by side (code.js CELL_ART): stone, stone with a lit top (air above it),
# a ledge, water, the water's surface, the lantern unlit and lit ---
strip = Img(16 * 7, 16)
stone = texture('stone', 16, 16, castle.stone[:3], size=8, seed=2)
strip.blit(stone, 0, 0)                                              # 0 stone, inside a wall: dark
top = texture('stone', 16, 16, castle.stone[1:4], size=8, seed=2)
for x in range(16):
    top.px[0][x] = castle.stone[4]; top.px[1][x] = castle.stone[3] if (x * 7) % 5 else castle.stone[4]
    if (x * 5 + 3) % 7 == 0: top.px[2][x] = castle.stone[3]
strip.blit(top, 16, 0)                                               # 1 stone under the air: lit along its top
plank = Img(16, 16)
for x in range(16):
    plank.px[0][x] = castle.wood[2]; plank.px[1][x] = castle.wood[1] if x % 8 else castle.wood[0]; plank.px[2][x] = castle.wood[1]; plank.px[3][x] = castle.wood[0]
for x in (2, 13):
    for y in range(4, 8): plank.px[y][x] = castle.iron[0] if y < 7 else 0     # its brackets
strip.blit(plank, 32, 0)                                             # 2 a ledge
water = texture('water', 16, 16, castle.water[:3])
strip.blit(water, 48, 0)                                             # 3 water, below the surface
surf = texture('water', 16, 16, castle.water[:3], seed=4)
for x in range(16):
    surf.px[0][x] = 0; surf.px[1][x] = castle.water[3] if x % 8 < 5 else 0; surf.px[2][x] = castle.water[3] if x % 8 >= 5 else castle.water[2]
strip.blit(surf, 64, 0)                                              # 4 the water's surface
def lantern(lit):
    im = Img(16, 16)
    im.rect(6, 0, 4, 2, castle.iron[1]); im.rect(4, 2, 8, 2, castle.iron[1]); im.rect(4, 3, 8, 1, castle.iron[0])   # the ring and the cap
    im.rect(4, 4, 8, 9, castle.iron[0])                                                                            # the cage
    glass = castle.glow if lit else castle.stone[1]
    im.rect(5, 5, 6, 7, glass)
    if lit:
        for y in range(6, 11): im.px[y][7] = castle.wood[2]; im.px[y][8] = castle.glow
        im.px[7][7] = castle.glow
    else: im.px[9][7] = castle.wood[0]; im.px[9][8] = castle.wood[0]; im.px[10][7] = castle.stone[2]; im.px[10][8] = castle.stone[2]
    im.rect(3, 13, 10, 2, castle.iron[1]); im.rect(3, 15, 10, 1, castle.iron[0])                                     # the foot
    return im
strip.blit(lantern(False), 80, 0); strip.blit(lantern(True), 96, 0)  # 5 the lantern, unlit; 6 lit
art.scene('cells', strip, pal=castle, at=(40, 0))

# --- The far wall of the Cellar: dark bricks, two pillars, a barred window with the night in it ---
back = Img(256, 208)
bricks = texture('brick', 64, 32, far.wall[:3], bw=32, bh=16)
for y in range(0, 208, 32):
    for x in range(0, 256, 64): back.blit(bricks.crop(0, 0, 64, min(32, 208 - y)), x, y)
for px0 in (40, 200):                                                # pillars
    for y in range(208):
        for x in range(16): back.px[y][px0 + x] = far.wall[3 if x in (2, 3) else 2 if x < 12 else 1 if x < 15 else 0]
for y in range(40, 96):                                              # the window: an arch, the night, a moon, bars
    for x in range(104, 152):
        cx, r = 128, 24
        inside = (y >= 64 and abs(x - cx) < r) or (x - cx) ** 2 + (y - 64) ** 2 < r * r
        if not inside: continue
        edge = not ((y >= 64 and abs(x - cx) < r - 2) or (x - cx) ** 2 + (y - 64) ** 2 < (r - 2) ** 2)
        back.px[y][x] = far.wall[3] if edge else far.moon if (x - 138) ** 2 + (y - 58) ** 2 < 30 else far.night[1 if y < 70 else 0]
        if not edge and (x - 104) % 12 == 0: back.px[y][x] = far.wall[0]
art.scene('wall', back, pal=far, at=(64, 0), solid=True)

# --- The darkness: one tile of the dark, which the layer repeats over the room and blends half and half with it ---
d = Img(8, 8)
for y in range(8):
    for x in range(8): d.px[y][x] = dark.dark
art.scene('dark', d, pal=dark, at=(40, 4), solid=True)

# --- Wick: a stub of candle with two eyes, and his flame. His body (what touches things) is the lower 10 x 12 of the
# picture; the flame above it is his hair and his mood. 32 x 32 frames, the body at the bottom, centred. ---
def wick(lean=0.0, tall=1.0, squash=0, eyes='open', look=1):
    """lean: the flame's tip pushed sideways (-1 to 1, as he moves); tall: its height (1 normal); squash: the stub
    shorter by that many pixels (a landing); eyes 'open', 'shut', 'wide'; look: 1 facing right."""
    m = Img(32, 32)
    base = 20 + squash                               # the flame's foot: the top of the stub
    h = 15 * tall
    for y in range(32):
        t = (base - y) / h                           # 0 at the foot, 1 at the tip
        if not 0 <= t <= 1: continue
        half = 5.2 * math.sin(min(1, t * 1.25) * math.pi * 0.5) * (1 - t) ** 0.55 + 0.4
        cx = 15.5 + lean * 5 * t * t
        for x in range(32):
            if abs(x - cx) <= half: m.px[y][x] = 1
    f = outline_sel(shaded(m, wick_pal.flame, kind='dome'), wick_pal)
    for y in range(32):                              # the bright heart of the flame, low in it
        for x in range(32):
            t = (base - y) / h
            if f.px[y][x] and 0.08 < t < 0.5 and abs(x - (15.5 + lean * 5 * t * t)) < 2.2 - t * 2: f.px[y][x] = wick_pal.core
    top = base                                       # the stub: wax, lit on its left, a rim, and his eyes
    for y in range(top, 32):
        for x in range(11, 21):
            edge = x in (11, 20) or y == 31
            f.px[y][x] = wick_pal.edge if edge else wick_pal.wax[2 if x < 14 else 1 if x < 18 else 0]
    for x in range(12, 20): f.px[top][x] = wick_pal.wax[2]
    f.px[top + 1][13] = wick_pal.wax[2]; f.px[top + 2][12] = wick_pal.wax[2]          # a drip of wax
    ey = top + 4
    for ex in ((14, 18) if look > 0 else (13, 17)):
        if eyes == 'shut': f.px[ey + 1][ex] = wick_pal.eye; f.px[ey + 1][ex - 1] = wick_pal.eye
        else:
            f.px[ey][ex] = wick_pal.eye; f.px[ey + 1][ex] = wick_pal.eye
            if eyes == 'wide': f.px[ey - 1][ex] = wick_pal.eye
    return f
FRAMES = {
    'wick0': wick(), 'wick1': wick(lean=0.15, tall=1.08),                          # standing: the flame flickers
    'run0': wick(lean=-0.7, tall=0.95), 'run1': wick(lean=-0.9, tall=1.05),       # running right: the flame streams back
    'jump': wick(lean=-0.2, tall=1.3, eyes='wide'),                               # rising: the flame drawn out
    'fall': wick(lean=0.1, tall=0.75, eyes='wide'),                               # falling: it is pressed flat
    'slide': wick(lean=-1.0, tall=0.9, eyes='shut'),                              # on a wall to his right: it bends away
    'land': wick(tall=0.7, squash=2),                                             # a landing
}
for name, img in FRAMES.items(): art.sprite(name, img, pal=wick_pal, region='spr')
puff = Img(32, 32); puff.disc(13, 24, 4, 1); puff.disc(18, 20, 4, 1); puff.disc(15, 14, 3, 1); puff.disc(17, 9, 2, 1)
art.sprite('puff', shaded(puff, wick_pal.soot + wick_pal.wax[:1], kind='dome'), pal=wick_pal, region='spr')
ember = Img(8, 8); ember.disc(4, 4, 2, wick_pal.flame[3]); ember.px[4][4] = wick_pal.core; ember.px[1][4] = wick_pal.flame[1]
art.sprite('ember', ember, pal=wick_pal, region='spr')
soot = Img(8, 8); soot.disc(4, 4, 3, wick_pal.soot[0]); soot.disc(3, 3, 1, wick_pal.soot[1])
art.sprite('soot', soot, pal=wick_pal, region='spr')
drop = Img(8, 8); drop.disc(4, 5, 2, 1)
drop.px[2][4] = 1; drop.px[1][4] = 1
water_spr = art.sprite_palette(1, {'water': ramp('2a6aa8', 4)})
art.sprite('drip', shaded(drop, water_spr.water, kind='dome'), pal=water_spr, region='spr')

# --- The title's lettering, on layer 0 ---
logo = Img(256, 40)
t = big_text('WICK', fire.gold, scale=4, outline=fire.edge, shadow=fire.shade)
logo.blit(t, (256 - t.w) // 2, 1)
art.scene('logo', logo, pal=fire, at=(0, 30))

art.write(sys.argv[1])
