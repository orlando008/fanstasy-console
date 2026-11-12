# Wick's art: carts/src/wick/tiles.txt, palette.txt, map.txt and art.json, and the ART block in code.js.
#   python3 carts/src/wick/art.py carts/src/wick
# Written with the art toolkit (tools/devkit/art/kit.py; docs/dev/art-recipes.md shows what each part draws). Step 2: the
# look for the art proof (Wick's frames, the palettes, the Dungeon's cells and far wall); the other worlds follow it.
# Map RAM: the room being played at (0, 0), 32 x 26 tiles, written by code.js from the cells' pictures at (40, 0); the far
# walls at (64, 0) and every 32 tiles along, a world each; the title's lettering at (0, 30); the darkness (one tile, repeated by the layer) at (40, 4).
import math, os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../../tools/devkit/art'))
from kit import *

art = Art()
art.region('bg', 1, 767)
art.region('spr', 768, 1023)

art.color(200, '0c0a18', 'GLASS')                                   # the panels' fill (see-through: code.js blends it)
# The Dungeon: cold blue-grey stone, so Wick's warm light is the only warm thing in the room
# Each world has its own colours for the same pictures: the stone (and wood, water, iron) of its rooms, and its far
# wall (the wall, what is seen through or on it, and its one bright thing). The tiles are drawn once with the Dungeon's
# palettes; code.js puts a world's colours into the same CGRAM entries when a room of it comes up (WORLD_PAL below).
def room_colours(stone, wood='7a4a26', water='2a6aa8', iron='8a8478', glow='ffd870'):
    return {'stone': ramp(stone, 5), 'wood': ramp(wood, 3), 'water': ramp(water, 4), 'iron': ramp(iron, 2), 'glow': glow}   # (the lantern's iron is pale, to be found in the dark)
def far_colours(wall, night, moon, haze='0a0a18'):
    return {'wall': recede(ramp(wall, 4), 0.5, haze), 'night': ramp(night, 2), 'moon': moon}
WORLDS = {
    1: (room_colours('5a6078'), far_colours('2c3048', '1a2a5a', 'c8d8f0')),                                   # the Dungeon: cold blue-grey
    2: (room_colours('6a5c7c', wood='6a4a3a', water='2a8a5a'), far_colours('3a2c4c', '2a7a4a', 'b8f0c0', '100a18')),   # the Laboratory: purple stone, green in the glass
    3: (room_colours('786a58', wood='8a5a2a', iron='a89048'), far_colours('3c3226', '4a3a22', 'e8d090', '120c08')),    # the Clock Tower: warm stone and brass
    4: (room_colours('56687e', wood='5a3a30', water='3a6a9a'), far_colours('34405c', '1c2a5c', 'e0e8f8', '101a38')),   # the Rooftops: slate, under the night sky
    5: (room_colours('705048', wood='5a3a26'), far_colours('34221c', '5a2a14', 'f0a040', '100808')),                   # the Chimney: sooty brick, a glow from below
}
castle = art.palette(1, WORLDS[1][0])
far = art.palette(2, WORLDS[1][1])
fire = art.palette(3, {'wax': ramp('e6dcc2', 5), 'flame': ramp('f08a28', 4), 'core': 'fff6c8', 'edge': '241420', 'wick': '3a2a20'})   # the title's letters: candle wax, and the flame on the i
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
def fixture(draw):
    im = Img(16, 16); im.blit(stone, 0, 0); draw(im); return im
def spout(im):                                                       # 7 a drip's spout: a pipe's mouth under the stone
    im.rect(5, 10, 6, 4, castle.iron[0]); im.rect(6, 14, 4, 2, castle.iron[1]); im.rect(7, 15, 2, 1, castle.water[3])
def nozzle(im):                                                      # 8 a steam jet: an iron plate with a hole
    im.rect(3, 3, 10, 10, castle.iron[0]); im.rect(4, 4, 8, 8, castle.iron[1]); im.rect(6, 6, 4, 4, castle.stone[0])
def grate(im):                                                       # 10 the rain's grate: bars along the bottom of the stone
    im.rect(0, 12, 16, 4, castle.stone[0])
    for x in range(1, 16, 3): im.rect(x, 12, 1, 4, castle.iron[1])
def bracket(im):                                                     # 11 a pendulum's pivot: an iron bracket and its pin
    im.rect(4, 8, 8, 8, castle.iron[0]); im.rect(6, 11, 4, 4, castle.iron[1]); im.px[13][7] = castle.wood[0]; im.px[13][8] = castle.wood[0]
shelf = Img(16, 16)                                                  # 9 a shelf that crumbles: an old board, cracked, no brackets
for x in range(16):
    shelf.px[0][x] = castle.wood[2]; shelf.px[1][x] = castle.wood[0] if x in (4, 5, 10) else castle.wood[2]; shelf.px[2][x] = castle.wood[1]
    if x % 5 == 2: shelf.px[3][x] = castle.wood[0]
strip2 = Img(16 * 5, 16)
for k, im in enumerate([fixture(spout), fixture(nozzle), shelf, fixture(grate), fixture(bracket)]): strip2.blit(im, k * 16, 0)
both = Img(16 * 12, 16); both.blit(strip, 0, 0); both.blit(strip2, 16 * 7, 0)
art.scene('cells', both, pal=castle, at=(40, 0))

# --- The far wall of the Dungeon: dark bricks, two pillars, a barred window with the night in it ---
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

def brick_wall(seed=0):
    im = Img(256, 208)
    for y in range(0, 208, 32):
        for x in range(0, 256, 64): im.blit(bricks.crop(0, 0, 64, min(32, 208 - y)), x, y)
    return im
# --- The Laboratory's far wall: shelves of jars and flasks, with pipes along the top ---
lab = brick_wall()
for y in (20, 28): lab.rect(0, y, 256, 3, far.wall[3]); lab.rect(0, y + 3, 256, 1, far.wall[0])     # two pipes
for x in range(24, 256, 80): lab.rect(x, 16, 6, 18, far.wall[2]); lab.rect(x, 16, 1, 18, far.wall[3])   # their collars
def jar(im, x, y, w, h, level, kind):
    """A jar on a shelf, its foot at (x, y): glass (the wall's light shade), what is in it (night), a glint (moon)."""
    if kind == 'flask':                                                   # a round flask with a neck
        r = w // 2
        im.disc(x + r, y - r, r, far.wall[3]); im.disc(x + r, y - r, r - 1, far.wall[0])
        for yy in range(y - 2 * r, y):
            for xx in range(x, x + w):
                if (xx - x - r) ** 2 + (yy - y + r) ** 2 < (r - 1) ** 2 and yy > y - level: im.px[yy][xx] = far.night[1 if yy == y - level + 1 else 0]
        im.rect(x + r - 1, y - 2 * r - 5, 3, 6, far.wall[3]); im.px[y - r - 2][x + 2] = far.moon
    else:
        im.rect(x, y - h, w, h, far.wall[3]); im.rect(x + 1, y - h + 1, w - 2, h - 2, far.wall[0])
        im.rect(x + 1, y - level, w - 2, level - 1, far.night[0]); im.rect(x + 1, y - level, w - 2, 1, far.night[1])
        im.rect(x - 1, y - h - 2, w + 2, 2, far.wall[2]); im.px[y - h + 2][x + 1] = far.moon
# (a few jars, each on the tile grid and used again and again along the shelves: the same tiles serve them all)
JARS = [('jar', 9, 14, 8), ('flask', 12, 0, 7), ('jar', 7, 20, 13), ('jar', 11, 11, 4), ('flask', 12, 0, 10), ('jar', 8, 17, 6)]
for row, sy in enumerate((72, 120, 168)):
    lab.rect(0, sy, 256, 3, far.wall[3]); lab.rect(0, sy + 3, 256, 2, far.wall[0])                 # a shelf and its shadow
    for bx in (16, 80, 144, 208): lab.rect(bx, sy + 3, 3, 5, far.wall[2])                         # its brackets
    for k in range(16):
        which = int(hsh(k * 7 + row * 31 + 2) % 8)
        if which >= len(JARS): continue                                                           # a gap on the shelf
        kind, w, h, level = JARS[which]
        jar(lab, k * 16 + 2, sy, w, h, level, kind)
art.scene('wall2', lab, pal=far, at=(96, 0), solid=True, region='bg')

# --- The Clock Tower's: the back of a great clock face, and the wheels that drive it ---
# (on plain boards, and each wheel the same in its four quarters and centred on the tile grid, so a quarter's tiles
# are used four times over)
clock = Img(256, 208)
for y in range(208):
    for x in range(256): clock.px[y][x] = far.wall[0] if y % 16 in (7, 8) else far.wall[1]
def wheel(im, cx, cy, r, teeth, shade, face=False):
    for y in range(max(0, cy - r - 4), min(208, cy + r + 4)):
        for x in range(max(0, cx - r - 4), min(256, cx + r + 4)):
            dx, dy = abs(x - cx + 0.5), abs(y - cy + 0.5)                 # (the centre between four pixels: every quarter alike)
            d = math.hypot(dx, dy); a = math.atan2(dy, dx)
            if face:
                if d < r: im.px[y][x] = far.wall[3] if d > r - 4 else far.night[0] if d > r - 8 else far.wall[0]
                if r - 16 < d < r - 9 and (a < 0.05 or a > math.pi / 2 - 0.05 or abs(a - math.pi / 6) < 0.035 or abs(a - math.pi / 3) < 0.035): im.px[y][x] = far.moon if a < 0.05 or a > 1.5 else far.night[1]
                continue
            tooth = 3 if math.cos(a * teeth) > 0 else 0
            if r - 5 < d < r + tooth: im.px[y][x] = far.wall[min(3, shade + 1)] if d > r + tooth - 1.5 else far.wall[shade]
            elif d < 5 or (d < r - 5 and min(dx, dy) < 1.5): im.px[y][x] = far.wall[shade]
wheel(clock, 40, 152, 34, 12, 2); wheel(clock, 224, 56, 28, 12, 2); wheel(clock, 216, 168, 18, 8, 3); wheel(clock, 56, 40, 14, 8, 3)
wheel(clock, 128, 104, 54, 0, 0, face=True)
clock.line(128, 104, 150, 84, far.moon); clock.line(127, 103, 119, 70, far.moon); clock.line(128, 103, 120, 70, far.night[1])   # its hands
clock.disc(128, 104, 3, far.moon)
art.scene('wall3', clock, pal=far, at=(128, 0), solid=True, region='bg')

# --- The Rooftops': the night sky, the moon, and the roofs and chimneys of the castle below ---
sky = Img(256, 208)
for y in range(208):
    for x in range(256): sky.px[y][x] = far.night[1] if dither(x, y, 0.08 + (y / 208) ** 1.5 * 0.85) else far.night[0]
for k in range(60):
    x, y = int(hsh(k * 31 + 7) % 256), int(hsh(k * 17 + 3) % 130)
    sky.px[y][x] = far.moon if k % 4 == 0 else far.night[1]
for cx, cy, w in ((40, 30, 70), (150, 78, 90), (60, 110, 60), (220, 100, 50), (110, 18, 40)):   # long thin clouds
    for x in range(cx - w // 2, cx + w // 2):
        t = 1 - abs(x - cx) / (w / 2)
        for y in range(cy - int(3 * t), cy + int(2 * t) + 1):
            if dither(x, y, 0.35 + 0.5 * t): sky.px[y % 208][x % 256] = far.wall[2 if y < cy else 1]
sky.disc(196, 44, 15, far.moon); sky.disc(190, 40, 4, far.night[1]); sky.disc(201, 50, 2, far.night[1]); sky.disc(203, 38, 2, far.night[1])
def roof(im, x, w, top, shade, pitch=True):
    for xx in range(x, x + w):
        rise = int(min(xx - x, x + w - 1 - xx) * 0.7) if pitch else 0
        for yy in range(max(0, top - rise), 208): im.px[yy][xx % 256] = far.wall[shade + 1 if yy == top - rise and shade < 3 else shade]
for x, w, top, sh in ((0, 70, 168, 0), (60, 50, 150, 0), (120, 90, 176, 0), (200, 56, 158, 0)): roof(sky, x, w, top, sh)
for x, w, top, sh, pitch in ((20, 60, 188, 1, True), (96, 44, 180, 1, True), (150, 70, 192, 1, True), (224, 32, 184, 1, True), (84, 10, 150, 1, False), (176, 12, 166, 1, False), (40, 8, 170, 1, False)): roof(sky, x, w, top, sh, pitch)
for x, y in ((30, 196), (52, 198), (108, 190), (170, 200), (196, 199), (236, 194)): sky.rect(x, y, 3, 4, far.moon)   # lit windows
art.scene('wall4', sky, pal=far, at=(160, 0), solid=True, region='bg')

# --- The Chimney's: the inside of the flue, soot thick on the bricks, iron rungs, a glow from the fire far below ---
flue = brick_wall()
for y in range(208):
    for x in range(256):
        side = min(x, 255 - x)
        if side < 28 and dither(x, y, 1 - side / 28): flue.px[y][x] = far.wall[0]                  # soot towards the sides
        if y > 150 and dither(x, y, (y - 150) / 90): flue.px[y][x] = far.night[1 if y > 190 and dither(x + 3, y, (y - 190) / 30) else 0]   # the glow
for y in range(16, 150, 24):                                          # rungs up the middle
    flue.rect(112, y, 32, 2, far.wall[3]); flue.rect(112, y + 2, 32, 1, far.wall[0]); flue.rect(112, y, 2, 6, far.wall[3]); flue.rect(142, y, 2, 6, far.wall[3])
for k in range(14): flue.px[int(160 + hsh(k * 7) % 44)][int(hsh(k * 13 + 5) % 256)] = far.moon       # sparks
art.scene('wall5', flue, pal=far, at=(192, 0), solid=True, region='bg')

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
# --- The hazards that move (the cold palette: water and iron; steam pale) ---
haz = art.sprite_palette(2, {'iron': ramp('7a7888', 4), 'steam': ramp('c8d0e0', 3), 'edge': '181420', 'brass': ramp('b08a3a', 3)})
def steam(seed):
    m = Img(16, 16)
    for k in range(5): m.disc(int(4 + hsh(seed * 7 + k) % 9), int(4 + hsh(seed * 13 + k * 3) % 9), int(3 + hsh(seed + k * 5) % 3), 1)
    return shaded(m, haz.steam, kind='dome', dither=0.4)
art.sprite('steam0', steam(1), pal=haz, region='spr'); art.sprite('steam1', steam(2), pal=haz, region='spr')
wisp = Img(8, 8); wisp.disc(4, 4, 2, haz.steam[1]); wisp.px[3][3] = haz.steam[2]
art.sprite('wisp', wisp, pal=haz, region='spr')                      # the warning before a jet
plat = Img(16, 16)                                                   # a gear, seen edge on: a toothed brass bar to stand on
for x in range(16):
    plat.px[0][x] = haz.brass[2] if x % 4 < 2 else 0
    for y in range(1, 6): plat.px[y][x] = haz.edge if x in (0, 15) or y == 5 else haz.brass[2 if y == 1 else 1 if y < 4 else 0]
plat.px[3][7] = haz.edge; plat.px[3][8] = haz.edge
art.sprite('gear', plat, pal=haz, region='spr')
ball = Sculpt(16, 16); ball.sphere(8, 8, 0, 6.5, Mat(haz.iron, gloss=0.6))
art.sprite('bob', ball.render(), pal=haz, region='spr')              # a pendulum's weight
# The Snuffer: a brass candle snuffer, a tall cone with a dark mouth and a long hooked handle (it follows Wick in a
# chase room). 32 x 32, as he is: the cone over where his body was, the mouth open towards the floor.
sm = Img(32, 32)
for y in range(8, 29):
    half = 1.5 + (y - 8) * 7.5 / 20
    for x in range(32):
        if abs(x - 15.5) <= half: sm.px[y][x] = 1
snf = shaded(sm, haz.brass, kind='cylinder-y', dither=0.3)
snf.rect(6, 28, 20, 2, haz.brass[2]); snf.rect(6, 30, 20, 1, haz.brass[0])        # the rim
snf.rect(9, 26, 14, 2, haz.edge)                                                # the dark of its mouth
snf.px[25][12] = haz.steam[2]; snf.px[25][19] = haz.steam[2]                      # two pale glints in it: it is looking
snf.rect(15, 4, 2, 4, haz.brass[1])                                             # the handle: up, over, and a hook
for x in range(16, 25): snf.px[3][x] = haz.brass[2]; snf.px[4][x] = haz.brass[0]
snf.rect(24, 4, 2, 5, haz.brass[1]); snf.px[9][23] = haz.brass[1]; snf.px[9][22] = haz.brass[0]
snf = outline_sel(snf, haz, colour=haz.edge)
art.sprite('snuffer', snf, pal=haz, region='spr')
link = Img(8, 8); link.rect(3, 0, 2, 8, haz.iron[1]); link.px[3][3] = haz.edge; link.px[7][4] = haz.edge
art.sprite('link', link, pal=haz, region='spr')                      # a piece of its arm
rain = Img(16, 16)
for k in range(7):
    x, y = int(hsh(k * 11 + 3) % 9) + 3, int(hsh(k * 7 + 1) % 12)
    for d in range(4): rain.px[(y + d) % 16][x] = water_spr.water[3 if d == 3 else 2]
art.sprite('rain0', rain, pal=water_spr, region='spr')
rain2 = Img(16, 16)
for y in range(16):
    for x in range(16): rain2.px[y][x] = rain.px[(y + 8) % 16][x]
art.sprite('rain1', rain2, pal=water_spr, region='spr')
gust = Img(8, 8)
for x in range(1, 7): gust.px[4][x] = haz.steam[1 if x < 5 else 2]
gust.px[3][6] = haz.steam[2]
art.sprite('gust', gust, pal=haz, region='spr')                      # a streak of wind (it blows to the right; flipped for left)

# --- The title's lettering, on layer 0 ---
# The letters are candle wax: thick round strokes drawn with a round brush, shaded as if they bulged, their tops a
# little slumped and wax running down from them in drips; the i is a candle, a wick and a flame where its dot would be.
LW, LH, BRUSH = 256, 64, 5.2
def stroke(m, pts, r=BRUSH):
    """A thick line through the points, with round ends and joints."""
    for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
        n = int(max(abs(x1 - x0), abs(y1 - y0)) * 2) + 1
        for k in range(n + 1):
            t = k / n; cx, cy = x0 + (x1 - x0) * t, y0 + (y1 - y0) * t
            for y in range(int(cy - r - 1), int(cy + r + 2)):
                for x in range(int(cx - r - 1), int(cx + r + 2)):
                    if 0 <= x < m.w and 0 <= y < m.h and (x - cx) ** 2 + (y - cy) ** 2 <= r * r: m.px[y][x] = 1
def drip(m, x, y, length, r=2):
    """Wax that has run down from (x, y): a thin run and the drop at its end."""
    for yy in range(y, y + length):
        for xx in range(x - 1, x + 2): m.px[min(m.h - 1, yy)][xx] = 1
    m.disc(x, min(m.h - 3, y + length), r, 1)
wax = Img(LW, LH)
BASE, XH, CAP = 46, 26, 13                                            # the line the letters stand on, the small letters' top, the tall ones'
stroke(wax, [(61, CAP + 1), (71, BASE), (83, XH - 2), (95, BASE), (105, CAP + 1)])                     # W
stroke(wax, [(121, XH + 4), (121, BASE)], BRUSH + 0.6)                                                # i: a candle's stub, a little thicker
stroke(wax, [(147 + 11 * math.cos(a / 10), 36 + 10.5 * math.sin(a / 10)) for a in range(9, 55)])     # c
stroke(wax, [(173, CAP), (173, BASE)]); stroke(wax, [(190, XH + 1), (175, 37), (191, BASE)])          # k
for x, y, n in ((58, 20, 7), (71, BASE + 3, 9), (95, BASE + 3, 5), (108, 22, 5), (117, BASE + 2, 6), (125, XH + 8, 9), (141, 42, 11), (153, BASE + 1, 5), (170, BASE + 2, 8), (177, 24, 6), (191, BASE + 3, 6)):
    drip(wax, x, y, n, 2 if n > 5 else 1)
for x in range(114, 129):                                             # the i's top: a rim of melted wax, slumped to one side
    for y in range(XH - 1 + (1 if x > 124 else 0), XH + 3): wax.px[y][x] = 1
logo = outline_sel(shaded(wax, fire.wax, kind='dome', dither=0.08), fire, colour=fire.edge)
for y in range(XH - 5, XH - 1): logo.px[y][121] = fire.wick              # its wick
fl = Img(LW, LH)                                                      # and its flame, leaning a little
for y in range(4, XH - 3):
    t = (XH - 4 - y) / 19
    half = 5.6 * math.sin(min(1, t * 1.25) * math.pi * 0.5) * (1 - t) ** 0.55 + 0.4
    cx = 121.5 + 2.5 * t * t
    for x in range(108, 136):
        if abs(x - cx) <= half: fl.px[y][x] = 1
fl2 = shaded(fl, fire.flame, kind='dome')
for y in range(LH):
    for x in range(LW):
        if fl2.px[y][x]:
            t = (XH - 4 - y) / 19
            logo.px[y][x] = fire.core if 0.08 < t < 0.5 and abs(x - (121.5 + 2.5 * t * t)) < 2.4 - t * 2.2 else fl2.px[y][x]
art.scene('logo', logo, pal=fire, at=(0, 30))

art.write(sys.argv[1])

# The worlds' colours for code.js: for each world the 15 entries of BG palette 1 and the 7 of palette 2, as 'rrggbb'
# one after the other, in the entries' order (rewritten between the WORLD_PAL marks each time this runs).
def entries(roles, colours):
    flat = {}
    for name, v in colours.items():
        if isinstance(v, (list, tuple)):
            for k, c in enumerate(v): flat['%s%d' % (name, k)] = c
        else: flat[name] = v
    names = sorted(roles.names().items(), key=lambda kv: kv[1])
    assert [i for _, i in names] == list(range(1, len(names) + 1))
    return ''.join(flat[n].lower() for n, _ in names)
lines = ['const WORLD_PAL = {'] + ["  %d: ['%s', '%s']," % (w, entries(castle, c), entries(far, f)) for w, (c, f) in WORLDS.items()] + ['};']
path = os.path.join(sys.argv[1], 'code.js'); code = open(path).read()
a, b = code.index('// WORLD_PAL (generated by art.py: do not edit)'), code.index('// END WORLD_PAL')
open(path, 'w').write(code[:a] + '// WORLD_PAL (generated by art.py: do not edit)\n' + '\n'.join(lines) + '\n' + code[b:])
