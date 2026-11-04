# Lantern Keeper's art: carts/src/lantern-keeper/tiles.txt, palette.txt, map.txt and art.json, rom/themes.bin, and the ART block in
# code.js.
#   python3 carts/src/lantern-keeper/art.py carts/src/lantern-keeper
# Written with the art toolkit (tools/devkit/art/kit.py: its header explains the pieces). Look at the result with
#   node tools/devkit/art/sprites.mjs carts/lantern-keeper.nova out.png      the sprites, at their real sizes and palettes
#   node tools/devkit/art/scene.mjs carts/lantern-keeper.nova out.png --scene title --holes   a scene
#   node tools/devkit/art/shots.mjs ...  (or the screenshots of the rooms: see SPEC 12)
# (pack first: node tools/pack.js carts/src/lantern-keeper carts/lantern-keeper.nova). Pixel values are palette indices; 0 is transparent.
#
# The look (SPEC 12): a lighthouse at night, seen from above, room by room. The rooms are built by code.js from STAMPS, 16 px cells
# drawn here once into a corner of Map RAM (the stamp library) and copied into the room's layers as it loads:
#   BG0  the walls: stone blocks, and windows in the outer wall that open onto the sea far below (BG2 shows through them)
#   BG1  the floor: each floor of the lighthouse its own (stone flags; slate with glass inlay; iron grating over gears; brass and
#        stone); cells in the light use palette 2 (warm, bright) instead of palette 1 (cold, dark): the same tiles, a palette swap
#   BG2  the sea at night, 64 x 32 px repeating, scrolled slowly (only ever seen through the windows)
# Each floor's colours are three palettes of 15 (floor dark, floor lit, walls), in rom/themes.bin: code.js copies a floor's into
# CGRAM when one of its rooms loads, so every floor's stamps use the same indices. The pieces are sprites (16 px, flipped for their
# other turns); the beams, the coloured glass of lenses, lanterns and filters, and the bar are drawn on the overlay (code.js).
# The title is the lighthouse on its rock in the storm (BG1, the stars on BG2, the sky a gradient), its windows lit by code.js;
# the floor map is the lighthouse cut open (BG1), its windows filled in by code.js. TOWER and CUT below are shared with code.js.
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../../tools/devkit/art'))
from kit import *

art = Art()
art.region('bg', 1, 767)
art.region('spr', 768, 1023)

# --- Positions shared with code.js (keep them the same there) ---
TOWER = {'x': 184, 'top': 54, 'foot': 190}   # the title's lighthouse: its middle, the top of its wall, its foot
CUT = {'x': 16, 'y0': 168, 'step': 40, 'h': 36, 'win': 21}   # the floor map: floor f's band at y0 - f * step, windows every `win` px
STAMP = {'mx': 0, 'my': 100}                 # the stamp library in Map RAM (tile columns and rows)

# ---------------------------------------------------------------- palettes
# The floors' colours: floor dark (BG palette 1), floor lit (2), walls (3), one set each floor. The roles' order fixes the indices:
# f0..f5 the floor's ramp (a gradient between two ends, dark for the dark floor and light for the lit one: ramp() spreads every ramp from
# near black to near white, and the lit floor's middle shades came out hardly lighter than the dark's), acc0..acc2 its accent (moss, glass, brass), shade (the shadow a wall casts), gap (the joints).
THEMES = [
    # 1 the Stair: grey-violet stone flags, moss in the joints
    {'dark': {'f': gradient('15131c', '6e6880', 6), 'acc': ramp('4a5a3a', 3), 'shade': '161320', 'gap': '0e0c14'},
     'lit': {'f': gradient('483c32', 'bca888', 6), 'acc': ramp('8a9a5a', 3), 'shade': '4a3e36', 'gap': '2a221c'},
     'wall': {'w': ramp('5c5668', 6), 'frame': ramp('6a4a30', 3), 'mortar': '18141e'}},
    # 2 the Glass Room: blue slate, glass inlay that catches the light
    {'dark': {'f': gradient('0e1218', '566474', 6), 'acc': ramp('2a6a7a', 3), 'shade': '10141c', 'gap': '0a0c12'},
     'lit': {'f': gradient('3a4654', 'a4b6c6', 6), 'acc': ramp('8ae8f0', 3), 'shade': '343c4a', 'gap': '1c2028'},
     'wall': {'w': ramp('46525e', 6), 'frame': ramp('8aa4b4', 3), 'mortar': '12161c'}},
    # 3 the Clockwork: an iron grating, brass gears below
    {'dark': {'f': gradient('121010', '646058', 6), 'acc': ramp('3c3220', 3), 'shade': '141210', 'gap': '0a0908'},
     'lit': {'f': gradient('443a2e', 'bcaa8c', 6), 'acc': ramp('e0b860', 3), 'shade': '3c342a', 'gap': '1e1a14'},
     'wall': {'w': ramp('544c46', 6), 'frame': ramp('8a6a34', 3), 'mortar': '141210'}},
    # 4 the Lamp Gallery: worn stone edged in brass
    {'dark': {'f': gradient('140e0a', '6e5e4c', 6), 'acc': ramp('6a5a2c', 3), 'shade': '161008', 'gap': '0c0806'},
     'lit': {'f': gradient('503c2a', 'c8a676', 6), 'acc': ramp('f0d07a', 3), 'shade': '4a3a28', 'gap': '2a2014'},
     'wall': {'w': ramp('6a5848', 6), 'frame': ramp('b08a48', 3), 'mortar': '1a120c'}},
]
floor_dark = art.palette(1, THEMES[0]['dark'])
floor_lit = art.palette(2, THEMES[0]['lit'])
wall = art.palette(3, THEMES[0]['wall'])
sea = art.palette(4, {'sea': ramp('1a3048', 5), 'foam': ramp('8ab4c8', 2)})
void = art.palette(5, {'v': ramp('16141e', 3), 'gold': ramp('e8b040', 5), 'ink': '0a0812', 'ember': ramp('a03c18', 2)})   # (and the title's lettering)
tower = art.palette(6, {'stone': ramp('c8c0b4', 5), 'band': ramp('8a2a2a', 3), 'rock': ramp('3a3640', 4), 'brass': ramp('8a6a30', 2), 'win': '120e14'})
night = art.palette(7, {'sea': ramp('16263a', 4), 'foam': ramp('7a9cb4', 2), 'star': ramp('8a8aa0', 2)})
art.gradient('sky', ['05060e', '0c1026', '1a2242', '2a2e4a'], y0=0, y1=223)        # the title's and the story's night sky


def rgb555(h):
    r, g, b = (int(h[i:i + 2], 16) >> 3 for i in (0, 2, 4))
    return r | g << 5 | b << 10

def flat(colors):
    """A palette's colours in index order (1 to 15), as the roles' dict order gives them (ramps spread to name0, name1 ...)."""
    out = []
    for v in colors.values(): out += list(v) if isinstance(v, (list, tuple)) else [v]
    return out + ['000000'] * (15 - len(out))

themes = bytearray()
for t in THEMES:
    for part in ('dark', 'lit', 'wall'):
        for h in flat(t[part]): v = rgb555(h); themes += bytes((v & 255, v >> 8))
art.rom['themes'] = themes     # code.js: rom('themes'), 3 palettes x 15 colours x 2 bytes, for each floor

F = floor_dark                  # (the stamps use palette 1's indices; palette 2 and the other floors share them)
FR, ACC = F.f, F.acc

# ---------------------------------------------------------------- the floors' stamps (16 x 16)
def bevel(img, x0, y0, w, h, base):
    """A slab: its top and left edges a step lighter, bottom and right a step darker, the joint around it."""
    for y in range(y0, y0 + h):
        for x in range(x0, x0 + w):
            u, v = x - x0, y - y0
            if u == w - 1 or v == h - 1: img.px[y][x] = F.gap; continue
            k = base + (1 if u == 0 or v == 0 else -1 if u == w - 2 or v == h - 2 else 0)
            img.px[y][x] = FR[max(0, min(5, k))]

def grain(img, seed, lo=1, hi=3, n=7):
    """Speckle on a slab: a few pixels a step up or down (stone's grain)."""
    for k in range(n):
        x, y = 1 + hsh(seed * 97 + k * 7) % 13, 1 + hsh(seed * 31 + k * 11) % 13
        c = img.px[y][x]
        if c in FR: img.px[y][x] = FR[max(lo - 1, min(hi + 1, FR.index(c) + (1 if k % 3 else -1)))]

def stair(v):          # floor 1: flags, a slab a cell (or two half slabs), moss in a joint now and then
    im = Img(16, 16)
    if v in (0, 2): bevel(im, 0, 0, 16, 16, 2 + (v == 2))
    elif v == 1: bevel(im, 0, 0, 16, 8, 2); bevel(im, 0, 8, 16, 8, 3)
    else: bevel(im, 0, 0, 8, 16, 2); bevel(im, 8, 0, 8, 16, 3)
    grain(im, v + 1)
    if v == 2:
        for x in range(3, 9): im.px[15][x] = ACC[1 if x % 2 else 0]
        im.px[14][5] = ACC[2]
    return im

def glass(v):          # floor 2: slate squares, a glass diamond at the corners where four meet
    im = Img(16, 16)
    bevel(im, 0, 0, 16, 16, 2 if v % 2 else 3)
    for y in range(16):
        for x in range(16):
            if (v in (1, 2)) and abs(x - 15.5) + abs(y - 15.5) < 4.2: im.px[y][x] = ACC[2 if x + y > 29 else 1]
            if v in (1, 2) and abs(x - 15.5) + abs(y - 15.5) < 5.2 and im.px[y][x] not in ACC: im.px[y][x] = F.gap
    if v == 3:
        for k in range(5): im.px[4 + k][4 + k] = FR[4]                      # a scratch catching the light
    grain(im, v + 11, n=4)
    return im

def gears(v):          # floor 3: an iron grating; through it, brass gears
    im = Img(16, 16, F.gap)
    cx, cy, r = (4, 4, 6) if v == 0 else (12, 10, 7) if v == 1 else (8, 12, 5) if v == 2 else (0, 0, 0)
    for y in range(16):
        for x in range(16):
            d = math.hypot(x - cx, y - cy)
            if r and d < r:
                tooth = math.sin(math.atan2(y - cy, x - cx) * 8) > 0.2 and d > r - 1.6
                im.px[y][x] = ACC[2] if d < 1.5 else ACC[1] if (d < r - 1.6 and (x + y) % 3) or tooth else ACC[0] if d < r - 1.6 else F.gap
    for y in range(16):                                                    # the grating's bars, over the gears
        for x in range(16):
            if x % 4 == 0 or y % 4 == 0: im.px[y][x] = FR[3 if (x % 4 == 0 and y % 4 == 0) else 2 if y % 4 == 0 else 1]
            if x % 4 == 1 and y % 4 != 0: im.px[y][x] = F.gap if im.px[y][x] == F.gap else im.px[y][x]
    for y in range(0, 16, 8):
        for x in range(0, 16, 8): im.px[y][x] = FR[5]                      # rivets
    return im

def gallery(v):        # floor 4: worn stone, edged with brass strips, a lamp-maker's mark on one
    im = Img(16, 16)
    bevel(im, 0, 0, 16, 16, 2 + (v % 2))
    for k in range(16):
        im.px[0][k] = ACC[1]; im.px[k][0] = ACC[0]
    if v == 2:
        for y in range(16):
            for x in range(16):
                if 3.2 < math.hypot(x - 8, y - 8) < 4.4: im.px[y][x] = ACC[0]
    if v == 3:
        for k in range(6): im.px[9 + k // 3][3 + k] = FR[1]                 # worn hollow
    grain(im, v + 21)
    return im

def shadowed(im):
    """The same cell with the shadow of the wall above it across its top."""
    out = im.copy()
    for y in range(5):
        for x in range(16):
            if y < 3 or (y == 3 and (x + y) % 2) or (y == 4 and x % 3 == 0): out.px[y][x] = F.shade
    return out

FLOORS = [stair, glass, gears, gallery]

# ---------------------------------------------------------------- the walls' stamps
W = wall
def block(v):          # a stone block seen from above: lit top and left, mortar round it
    im = Img(16, 16)
    for y in range(16):
        for x in range(16):
            if x == 15 or y == 15: im.px[y][x] = W.mortar; continue
            k = 3 + (1 if x == 0 or y == 0 else -1 if x >= 13 or y >= 13 else 0) + (1 if x + y < 5 else 0)
            if v == 1 and 6 <= x <= 9 and y == 7 + (x % 2): k = 1          # a crack
            im.px[y][x] = W.w[max(0, min(5, k))]
    for k in range(5):
        x, y = 2 + hsh(v * 5 + k) % 11, 2 + hsh(v * 9 + k * 3) % 10
        im.px[y][x] = W.w[2 if k % 2 else 4]
    return im

def window():          # a window: a stone frame round an opening (transparent: the sea below shows through), a sill, glazing bars
    im = block(0)
    for y in range(3, 13):
        for x in range(3, 13): im.px[y][x] = 0
    for k in range(3, 13):
        im.px[2][k] = W.frame[2]; im.px[13][k] = W.frame[0]; im.px[k][2] = W.frame[1]; im.px[k][13] = W.frame[0]
        im.px[k][8] = W.frame[1] if k % 4 else W.frame[2]                  # the glazing bar
    return im

V = void
def outside(v):        # outside the room: the tower's dark stone, barely seen
    return Img.make(16, 16, lambda x, y: V.v[0] if (x + 2 * y + v) % 7 else V.v[1] if (x * y + v) % 5 else V.v[2])

# The stamp library: a row of 16 px cells for each floor (four floor cells, then the four shadowed), then a row of walls and outside.
for t, make in enumerate(FLOORS):
    row = Img(128, 16)
    for v in range(4):
        row.blit(make(v), v * 16, 0); row.blit(shadowed(make(v)), 64 + v * 16, 0)
    art.scene('floor%d' % (t + 1), row, pal=floor_dark, at=(STAMP['mx'], STAMP['my'] + 2 * t), solid=True)
walls = Img(64, 16)
walls.blit(block(0), 0, 0); walls.blit(block(1), 16, 0); walls.blit(window(), 32, 0)
art.scene('walls', walls, pal=wall, at=(STAMP['mx'], STAMP['my'] + 8))
art.scene('outside', Img.make(48, 16, lambda x, y: outside(x // 16).px[y][x % 16] if x < 32 else V.v[0]), pal=void, at=(STAMP['mx'] + 8, STAMP['my'] + 8), solid=True)
# (the third: solid dark, a cell of a dark room that cannot be seen; empty, it would show the sea below)

# ---------------------------------------------------------------- the sea below the windows (BG2): 64 x 32, repeating
S = sea
seaimg = texture('water', 64, 32, S.sea, seed=3)
for k in range(10):
    x, y = hsh(k * 13 + 1) % 64, hsh(k * 7 + 5) % 32
    for i in range(3): seaimg.px[y][(x + i) % 64] = S.foam[1 if i == 1 else 0]
art.scene('sea', seaimg, pal=sea, at=(64, 0), solid=True)

# ---------------------------------------------------------------- the title: the lighthouse on its rock, in the storm (256 x 224)
T, N = tower, night
title = Img(256, 224)
# the sea, the whole width, from y 176 down; the rock under the tower
for y in range(176, 224):
    for x in range(256):
        title.px[y][x] = N.sea[min(3, (y - 176) // 12 + (1 if (x * 3 + y * 7) % 23 == 0 else 0))]
for k in range(40):
    x, y = hsh(k * 17 + 3) % 250, 178 + hsh(k * 5 + 1) % 44
    for i in range(2 + k % 4): title.px[y][(x + i) % 256] = N.foam[k % 2]
for y in range(168, 224):                                     # the rock, a heap under the tower
    half = 44 + (y - 168) * 1.6
    for x in range(int(TOWER['x'] - half), int(TOWER['x'] + half)):
        if 0 <= x < 256 and (y > 176 or abs(x - TOWER['x']) < half - (176 - y) * 2):
            n = hsh(x * 7 + y * 13) % 9
            title.px[y][x] = T.rock[0] if n == 0 else T.rock[1 + (x + y) % 2] if x < TOWER['x'] else T.rock[0 + (x + y) % 2]
            if (x + y * 3) % 17 == 0: title.px[y][x] = T.rock[3]
# the tower: a tapering cylinder, white with two red bands, lit from the left
top, foot = TOWER['top'], TOWER['foot']
for y in range(top, foot):
    half = 16 + (y - top) * 8 / (foot - top)
    for x in range(int(TOWER['x'] - half), int(TOWER['x'] + half) + 1):
        u = (x - (TOWER['x'] - half)) / (2 * half)                   # 0 at the left edge, 1 at the right
        k = 4 if u < 0.25 else 3 if u < 0.5 else 2 if u < 0.75 else 1
        band = (y - top) % 46 < 12 and y - top > 20
        title.px[y][x] = T.band[min(2, k - 1)] if band else T.stone[k if u > 0.08 else 2]
# the gallery and the lamp room on top
for x in range(TOWER['x'] - 22, TOWER['x'] + 23): title.px[top - 1][x] = T.brass[1]; title.px[top][x] = T.brass[0]
for y in range(top - 18, top - 1):
    for x in range(TOWER['x'] - 12, TOWER['x'] + 13):
        title.px[y][x] = T.brass[0] if abs(x - TOWER['x']) > 10 or (x - TOWER['x']) % 6 == 0 else T.win
for y in range(top - 26, top - 18):
    w = (y - (top - 26)) + 4
    for x in range(TOWER['x'] - w, TOWER['x'] + w + 1): title.px[y][x] = T.band[1] if x < TOWER['x'] else T.band[0]
# the windows (dark: code.js lights them): 4 floors of 10, two rows of five
def tower_window(n):
    f, i = n // 10, n % 10
    return TOWER['x'] - 11 + (i % 5) * 5, TOWER['foot'] - 18 - f * 32 - (i // 5) * 9
for n in range(40):
    x, y = tower_window(n)
    for yy in range(y, y + 5):
        for xx in range(x, x + 3): title.px[yy][xx] = T.win
art.scene('title', title, pal=tower, at=(0, 32))
# the stars (BG2, behind the tower)
sky = Img(256, 224)
stars(sky, list(N.star), density=0.006, y0=0, y1=160, seed=7)
# (no moon: a storm; the stars drift slowly behind the tower, code.js, and would carry a moon under the story's words)
art.scene('stars', sky, pal=night, at=(32, 32))

# ---------------------------------------------------------------- the floor map: the lighthouse cut open (256 x 224)
cut = Img(256, 224)
for f in range(4):
    y0 = CUT['y0'] - f * CUT['step']
    for y in range(y0, y0 + CUT['h']):
        for x in range(CUT['x'], 256 - CUT['x']):
            u, v = x - CUT['x'], y - y0
            edge = u < 3 or u > 256 - 2 * CUT['x'] - 4 or v < 2 or v > CUT['h'] - 3
            brick = (v % 8 == 0) or ((u + (8 if (v // 8) % 2 else 0)) % 16 == 0)
            cut.px[y][x] = T.brass[1] if edge else T.win if brick else T.band[0] if (u * 7 + v * 3) % 11 else T.band[1]   # (red brick, as the tower's bands, edged in brass)
    for i in range(10):                                        # the windows' frames (code.js fills them in)
        wx, wy = CUT['x'] + 6 + i * CUT['win'], y0 + 14
        for k in range(-1, 16):
            for e in (wy - 1, wy + 15): cut.px[e][wx + k] = T.brass[1]
            for e in (wx - 1, wx + 15): cut.px[wy + k][e] = T.brass[0]
        for yy in range(wy, wy + 15):
            for xx in range(wx, wx + 15): cut.px[yy][xx] = T.win
# the stair between the floors, on the right
for f in range(3):
    y0 = CUT['y0'] - f * CUT['step']
    for k in range(4): cut.px[y0 - 1 - k][224 + k * 2] = T.stone[2]
art.scene('cutaway', cut, pal=tower, at=(64, 32))

# ---------------------------------------------------------------- the title's lettering (BG0, over the night sky): gold, bevelled, a dark edge
G = void
logo = Img(136, 48)
l1 = big_text('LANTERN', list(G.gold), scale=2, outline=G.ink, shadow=G.ink)
l2 = big_text('KEEPER', list(G.gold), scale=2, outline=G.ink, shadow=G.ink)
logo.blit(l1, 0, 0); logo.blit(l2, 18, 22)
for x in range(4, 130):                                           # an ember-red rule under it, brightest in the middle
    if (x * 7) % 5: logo.px[45][x] = G.ember[1 if 40 < x < 96 else 0]
art.scene('logo', logo, pal=void, at=(160, 0))

# ---------------------------------------------------------------- the pieces (sprites, 16 x 16)
brass = art.sprite_palette(0, {'edge': '120c08', 'brass': ramp('a07a3a', 5), 'glass': ramp('c8d8e0', 2), 'soot': '2a2018'})
silver = art.sprite_palette(1, {'edge': '0c0c14', 'face': ramp('a8b8cc', 5), 'back': ramp('5a3a24', 3), 'shine': 'ffffff'})
iron = art.sprite_palette(2, {'edge': '080808', 'face': ramp('6a6670', 5), 'back': ramp('3a3434', 3), 'shine': 'b0aab8'})
crystal = art.sprite_palette(3, {'edge': '0c1018', 'cry': ramp('7ab0d0', 5), 'red': 'e05050', 'green': '50d070', 'blue': '5070f0'})
obs = art.sprite_palette(7, {   # (palette 7: 208 to 223 are the overlay's light colours, code.js)
    'edge': '060408', 'stone': ramp('2c2034', 4), 'eye': ramp('c02020', 2), 'gold': ramp('a07a3a', 2)})
cursor_pal = art.sprite_palette(6, {'gold': ramp('f0c040', 3), 'dim': '6a5a3a'})
B, S2, C, O = brass, silver, crystal, obs

def lantern(facing_east):
    """A lantern from above: a brass box, its lens (glass) on the side it faces (north, or east)."""
    im = Img(16, 16)
    for y in range(2, 14):
        for x in range(2, 14):
            if x in (2, 13) or y in (2, 13): im.px[y][x] = B.edge; continue
            im.px[y][x] = B.brass[3 if x + y < 12 else 2 if x + y < 20 else 1]
    for y in range(5, 11):
        for x in range(5, 11): im.px[y][x] = B.soot if (x + y) % 2 else B.brass[0]           # the chimney's grille
    for k in range(4, 12): im.px[1][k] = B.edge; im.px[2][k] = B.glass[1 if 6 <= k <= 9 else 0]; im.px[3][k] = B.glass[0]
    im.px[0][7] = B.glass[1]; im.px[0][8] = B.glass[1]
    return im.rot90() if facing_east else im

def mirror(kind, P):
    """A mirror (or a splitter) at '/': a silvered face from bottom left to top right, its back to the lower right; a splitter's face
    is half-silvered (every other pixel)."""
    im = Img(16, 16)
    for t in range(-1, 2):
        for k in range(1, 15):
            x, y = k + t, 15 - k + t
            if not (0 <= x < 16 and 0 <= y < 16): continue
            if t == -1: im.px[y][x] = P.face[4 if kind == 'mirror' or k % 2 else 2] if k % 3 else P.shine
            elif t == 0: im.px[y][x] = P.face[2 if kind == 'mirror' or k % 2 else 0] if kind == 'mirror' or k % 2 else 0
            else: im.px[y][x] = P.back[1]
    for k in range(1, 15):
        x, y = k + 2, 15 - k + 2
        if x < 16 and y < 16: im.px[y][x] = P.back[0]
    for (x, y) in ((1, 14), (14, 1)):
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                if 0 <= x + dx < 16 and 0 <= y + dy < 16: im.px[y + dy][x + dx] = P.edge
        im.px[y][x] = P.back[2]
    return im

def prism(east):
    """A prism from above: a triangle of glass pointing the way the light goes on (north or east); its back is the flat side."""
    im = Img(16, 16)
    for y in range(16):
        for x in range(16):
            u, v = x - 7.5, 14 - y                     # v: 0 at the back (bottom), up to 13 at the tip
            if 0 <= v <= 13 and abs(u) <= (13 - v) * 0.55 + 0.5:
                edge = abs(u) > (13 - v) * 0.55 - 0.6 or v < 1
                im.px[y][x] = C.edge if edge else C.cry[4 if u < -1 and v > 4 else 3 if u < 1 else 2 if v > 3 else 1]
    for k, c in enumerate((C.red, C.green, C.blue)): im.px[13][5 + k * 3] = c       # the colours waiting in it
    return im.rot90() if east else im

def ring(cx, cy, r0, r1, f):
    return lambda x, y: f(x, y) if r0 <= math.hypot(x - cx, y - cy) < r1 else 0

lens = Img.make(16, 16, lambda x, y: (B.edge if math.hypot(x - 7.5, y - 7.5) >= 6.2 else
                                      B.brass[3 if x + y < 13 else 1]) if 4.8 <= math.hypot(x - 7.5, y - 7.5) < 7.2 else 0)
filt = Img(16, 16)
for y in range(1, 15):
    for x in range(1, 15):
        if x in (1, 14) or y in (1, 14): filt.px[y][x] = B.edge
        elif x in (2, 13) or y in (2, 13): filt.px[y][x] = B.brass[3 if x < 8 or y < 8 else 1]
shadow = Img.make(16, 16, lambda x, y: (O.edge if math.hypot(x - 7.5, y - 7.5) >= 6.6 else O.gold[1 if x + y < 14 else 0] if math.hypot(x - 7.5, y - 7.5) >= 5.6
                                        else O.stone[3 if x + y < 11 else 1 if x + y < 17 else 0]) if math.hypot(x - 7.5, y - 7.5) < 7.2 else 0)
shadow_lit = shadow.copy()
for y in range(16):
    for x in range(16):
        d = math.hypot(x - 7.5, y - 7.5)
        if d < 2.6: shadow_lit.px[y][x] = O.eye[1 if d < 1.4 else 0]
door_shut = Img(16, 16)
for y in range(16):
    for x in range(16):
        if y in (0, 15) or x in (0, 15): door_shut.px[y][x] = iron.edge
        elif x % 4 == 2: door_shut.px[y][x] = iron.face[3 if y < 8 else 2]
        elif y in (3, 12): door_shut.px[y][x] = iron.face[1]
        else: door_shut.px[y][x] = iron.back[0] if (x + y) % 2 else 0
door_open = Img(16, 16)
for k in range(16):
    for e in (0, 15): door_open.px[e][k] = iron.edge; door_open.px[k][e] = iron.edge
    door_open.px[1][k] = iron.face[1]; door_open.px[14][k] = iron.face[0]
bolt = Img.from_rows(['.bbb....', 'bwwb....', 'bwdb....', '.bbb....', '........', '........', '........', '........'],
                     key={'b': B.edge, 'w': B.brass[4], 'd': B.brass[1]})
cursor = Img(16, 16)
for k in range(5):
    for (x, y) in ((k, 0), (0, k), (15 - k, 0), (15, k), (k, 15), (0, 15 - k), (15 - k, 15), (15, 15 - k)):
        cursor.px[y][x] = cursor_pal.gold[2 if k < 2 else 1]
for (x, y) in ((1, 1), (14, 1), (1, 14), (14, 14)): cursor.px[y][x] = cursor_pal.gold[0]

art.sprite('lantern_n', lantern(False), pal=brass, region='spr')
art.sprite('lantern_e', lantern(True), pal=brass, region='spr')
art.sprite('mirror', mirror('mirror', S2), pal=silver, region='spr')
art.sprite('mirror_fixed', mirror('mirror', iron), pal=iron, region='spr')
art.sprite('splitter', mirror('splitter', S2), pal=silver, region='spr')
art.sprite('splitter_fixed', mirror('splitter', iron), pal=iron, region='spr')
art.sprite('prism_n', prism(False), pal=crystal, region='spr')
art.sprite('prism_e', prism(True), pal=crystal, region='spr')
art.sprite('lens', lens, pal=brass, region='spr')
art.sprite('filter', filt, pal=brass, region='spr')
art.sprite('shadow', shadow, pal=obs, region='spr')
art.sprite('shadow_lit', shadow_lit, pal=obs, region='spr')
art.sprite('door_shut', door_shut, pal=iron, region='spr')
art.sprite('door_open', door_open, pal=iron, region='spr')
art.sprite('bolt', bolt, pal=brass, region='spr')
art.sprite('cursor', cursor, pal=cursor_pal, region='spr')

# (the overlay's colours: code.js sets the beams' in 193 to 207, added as light; the bar and panels use the solid ones below 192)
# The overlay's solid colours are BG palette 0's entries (code.js: SHADOW 1, PANEL 3, DIM 10): the console's default brown and greys
# are mud on a night sea (colors.mjs --check), so: the panels and the bar deep indigo, their edges brass, dim text a cool blue-grey.
art.color(1, '15132c'); art.color(3, '8a6a34'); art.color(10, '8c96c4'); art.color(4, '5a4024')

art.write(sys.argv[1])
