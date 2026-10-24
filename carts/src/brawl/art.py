# Brawl's art: tiles.txt, palette.txt, map.txt, art.json and the ART block of code.js.
#   python3 carts/src/brawl/art.py carts/src/brawl
# The street (docs/carts/brawl.md, section 12): a gradient sky set line by line, a far city on BG2, a chain-link fence on
# BG1 and flat paving on BG0, each a full 256 x 224 picture that repeats sideways as the camera scrolls. The fighters are
# placeholder shapes drawn by the game for now (no sprites): real frames plug in later behind drawFighter().
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../../tools/devkit/art'))
from kit import *

art = Art()
art.region('bg', 1, 479)       # background tiles
art.region('spr', 480, 1023)   # sprites (the fighters' frames, later)
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

art.write(sys.argv[1])
