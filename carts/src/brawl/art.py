# Brawl's art: tiles.txt, palette.txt, map.txt, art.json and the ART block of code.js.
#   python3 carts/src/brawl/art.py carts/src/brawl
# Stage 1, the street (docs/carts/brawl.md, section 12): a gradient sky set line by line, a far city on BG2, a chain-link fence on
# BG1 and flat paving on BG0 (palettes 1 to 3); stage 2, the docks: a night harbour with cranes, stacked containers and wooden
# planks (palettes 4 to 6, Map RAM columns 96 to 191); stage 3's palettes will be 7 and runtime swaps (section 6), each a full 256 x 224 picture that repeats sideways as the camera scrolls. The fighters are
# placeholder shapes drawn by the game for now (no sprites): real frames plug in later behind drawFighter().
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../../tools/devkit/art'))
from kit import *

art = Art()
art.region('bg', 1, 639)       # background tiles (three stages)
art.region('spr', 640, 1023)   # sprites (the fighters' frames, later)
art.backdrop('100818')
art.color(113, 'f8f8f0', 'WHITE'); art.color(114, 'ffd040', 'GOLD'); art.color(115, '181020', 'INK')
art.color(200, '181028', 'GLASS')                                          # the panels' fill, seen through (blend() in code.js)

# --- The sky: dusk purple to a warm glow at the horizon, a colour for every line down to the pavement. ---
art.gradient('sky', ['0c0820', '281848', '583060', 'a05868'], y0=0, y1=136)

# --- BG2: the city, buildings with lit windows and neon, repeating every 128 px. ---
CITY = art.palette(1, {'block': recede(ramp('382c58', 3), 0.3, '583060'), 'win': ['c8a048', 'f8e090'], 'neon': ['f050a0', '50e0f0'], 'roof': '201838'})
city = Img(128, 128)
x = 0; k = 0
while x < 128:
    w = 14 + int(hsh(k * 7 + 1) % 14)
    top = 34 + int(hsh(k * 13 + 5) % 50)
    for yy in range(top, 128):
        for xx in range(x, min(128, x + w)):
            edge = xx == x
            city.px[yy][xx] = CITY.roof if yy == top else CITY.block[0] if edge else CITY.block[1 if (xx + yy) % 7 else 0]
    for wy in range(top + 4, 120, 6):                    # windows: two pixels wide, some lit
        for wx in range(x + 3, min(128, x + w) - 2, 4):
            h = hsh(wx * 31 + wy * 17 + k)
            c = CITY.win[1] if h % 5 == 0 else CITY.win[0] if h % 3 == 0 else None
            if c:
                city.pset(wx, wy, c); city.pset(wx + 1, wy, c); city.pset(wx, wy + 1, CITY.block[2]); city.pset(wx + 1, wy + 1, CITY.block[2])
    if k % 3 == 1:                                       # a neon sign
        for xx in range(x + 2, min(128, x + w) - 2): city.pset(xx, top + 6, CITY.neon[k % 2]); city.pset(xx, top + 8, CITY.neon[k % 2])
    x += w + 1; k += 1
far = Img(256, 224); far.blit(city, 0, 12); far.blit(city, 128, 12)
art.scene('city', far, pal=CITY, at=(0, 0), region='bg')

# --- BG1: a chain-link fence on posts, the city showing through it; it ends where the pavement starts (y 136). ---
FENCE = art.palette(2, {'wire': ramp('a0a8c0', 3), 'post': ramp('606878', 3)})
fence = Img(256, 224)
mesh = texture('fence', 16, 16, FENCE.wire, size=8)
for y in range(76, 140):
    for x in range(256):
        v = mesh.px[y % 16][x % 16]
        if v: fence.px[y][x] = v
for x in range(0, 256, 64):                              # posts, shaded like pipes, and the top rail
    post = shaded(Img(4, 76).rect(0, 0, 4, 76, 1), FENCE.post, kind='cylinder-y')
    fence.blit(post, x + 30, 70)
rail = shaded(Img(256, 4).rect(0, 0, 256, 4, 1), FENCE.post, kind='cylinder-x')
fence.blit(rail, 0, 72)
art.scene('fence', fence, pal=FENCE, at=(32, 0), region='bg')

# --- BG0: the pavement, flat slabs seen from the front with a kerb on top: the lane the fighters walk in. ---
FLOOR = art.palette(3, {'slab': ramp('8a8090', 4), 'kerb': ramp('b0a8b8', 3)})
ground = Img(256, 224)
slab = texture('paving', 32, 16, FLOOR.slab, bw=16, bh=8)
for y in range(140, 224):
    for x in range(256):
        ground.px[y][x] = slab.px[y % 16][x % 32]
for y in range(136, 140):                                # the kerb: lit top edge, shaded face
    for x in range(256):
        ground.px[y][x] = FLOOR.kerb[2] if y == 136 else FLOOR.kerb[1] if y == 137 else FLOOR.kerb[0]
art.scene('ground', ground, pal=FLOOR, at=(64, 0), region='bg')

# =====================================================================================================================
# Stage 2, the docks: a night harbour, shipping containers, and the planks of a pier (palettes 4, 5, 6).
# =====================================================================================================================
art.gradient('night', ['04101c', '0c2840', '1c5068', '5a9098'], y0=0, y1=136)

# --- BG2: the harbour, cranes against the sky and a far shore across dark water with moonlit glints (repeats every 256 px). ---
HARB = art.palette(4, {'sil': ramp('1c3050', 3), 'light': ['f0d070', 'fff8d0'], 'water': ramp('284870', 4), 'glint': 'a8d8e8', 'red': 'e04050'})
harb = Img(256, 224)
shore = Img(64, 40)                                      # 36 rows of water and a far shore, repeated four times across: tiles are shared
for y in range(0, 36):                                   # the water, darker towards the pier
    for x in range(64): shore.px[y + 4][x] = HARB.water[3 - min(3, y // 9)]
for y in range(3, 36, 3):                                # glints of the moon on it
    for k in range(2):
        gx = int(hsh(y * 13 + k * 7) % 56); shore.line(gx, y + 4, gx + 2 + int(hsh(y + k) % 5), y + 4, HARB.glint)
x = 0; k = 0
while x < 60:                                            # the far shore: low sheds and container stacks, a few lit windows
    w = 8 + int(hsh(k * 5 + 3) % 3) * 4; h = 4 + int(hsh(k * 11 + 1) % 3) * 2
    for yy in range(4 - h, 4):
        for xx in range(x, min(63, x + w)):
            if yy >= 0: shore.px[yy][xx] = HARB.sil[k % 2]
    if k % 2 == 0 and 4 - h + 2 >= 0: shore.pset(x + 2, 4 - h + 2, HARB.light[0])
    x += w + 4; k += 1
for i in range(4): harb.blit(shore, i * 64, 96)
def crane(cx, h):
    for yy in range(100 - h, 101): harb.pset(cx, yy, HARB.sil[2]); harb.pset(cx + 1, yy, HARB.sil[2]); harb.pset(cx + 3, yy, HARB.sil[2])   # the tower
    for xx in range(cx - 34, cx + 40): harb.pset(xx, 100 - h, HARB.sil[2]); harb.pset(xx, 101 - h, HARB.sil[2])                           # the jib
    for xx in range(cx - 30, cx, 5): harb.line(xx, 101 - h, cx, 100 - h + 16, HARB.sil[1])                                               # its braces
    harb.line(cx + 38, 102 - h, cx + 38, 100 - h + 20, HARB.sil[1]); harb.pset(cx - 33, 99 - h, HARB.red); harb.pset(cx + 38, 99 - h, HARB.red)
crane(44, 78); crane(172, 66)
art.scene('harbour', harb, pal=HARB, at=(96, 0), region='bg')

# --- BG1: containers stacked on the quay, one or two high, rust, teal, mustard and grey; they end where the planks start (y 136). ---
DOCK = art.palette(5, {'rust': ramp('a04830', 3), 'teal': ramp('2e7880', 3), 'mustard': ramp('c09830', 3), 'steel': ramp('586070', 3), 'ink': '101820'})
dock = Img(256, 224)
cols = [DOCK.rust, DOCK.teal, DOCK.mustard, DOCK.steel]
for i in range(4):
    n = 1 + int(hsh(i * 9 + 4) % 2)
    for lvl in range(n):
        y1 = 136 - lvl * 32; y0 = y1 - 32; x0 = i * 64 + 8; c = cols[(i + lvl * 2) % 4]
        for yy in range(y0, y1):
            for xx in range(x0, x0 + 48):
                dock.px[yy][xx] = c[2] if yy == y0 else c[0] if yy >= y1 - 2 else c[0] if (xx - x0) % 8 == 0 else c[1]   # the lit top edge, a dark foot, ribs
        for yy in range(y0 + 3, y1 - 3): dock.pset(x0 + 46, yy, DOCK.ink); dock.pset(x0 + 42, yy, DOCK.ink)                  # the doors
art.scene('dock', dock, pal=DOCK, at=(128, 0), region='bg')

# --- BG0: the planks of the pier, boards 8 px deep with staggered joints, and the mooring rope along the edge: the lane. ---
PLANK = art.palette(6, {'wood': ramp('7a5a3a', 4), 'edge': ramp('4a3828', 3), 'rope': 'b09860', 'water': ramp('142840', 2)})
plank = Img(256, 224)
for y in range(136, 140):
    for x in range(256): plank.px[y][x] = PLANK.water[0] if y > 137 else PLANK.rope if y == 137 else PLANK.edge[1]
for row, y0 in enumerate(range(140, 224, 8)):
    off = (row * 24) % 48                                  # joints stagger by half a board, on the tile grid
    for x in range(256):
        board = (x + off) // 48; jx = (x + off) % 48
        for y in range(y0, min(224, y0 + 8)):
            c = PLANK.wood[1 + (board + row) % 2]
            if y == y0: c = PLANK.wood[3]
            elif y == y0 + 7: c = PLANK.edge[0]
            if jx == 0: c = PLANK.edge[0]
            plank.px[y][x] = c
        if jx in (3, 44) and y0 + 3 < 224: plank.pset(x, y0 + 3, PLANK.edge[1])        # the nails
art.scene('planks', plank, pal=PLANK, at=(160, 0), region='bg')

art.write(sys.argv[1])
