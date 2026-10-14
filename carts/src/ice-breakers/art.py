# Ice Breakers's art: carts/src/ice-breakers/tiles.txt, palette.txt, map.txt and art.json, and the ART block in code.js.
#   python3 carts/src/ice-breakers/art.py carts/src/ice-breakers
# Written with the art toolkit (tools/devkit/art/kit.py: its header explains the pieces). This cart owns those files:
# change the pictures here, not in them. Look at the result with (pack first: node tools/pack.js carts/src/ice-breakers carts/ice-breakers.nova)
#   node tools/devkit/art/sprites.mjs carts/ice-breakers.nova out.png                          the gems and the cursor, at real size
#   node tools/devkit/art/scene.mjs carts/ice-breakers.nova out.png --scene board --holes      the background, with gaps marked
# Pixel values are palette indices; 0 is transparent. Each gem has its own SHAPE as well as its colour (so that colour-blind
# players can tell them apart) and its own sprite palette: gem k uses sprite palette k (code.js draws it with pal = its type).
import math, os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../../tools/devkit/art'))
from kit import *

art = Art()
art.region('bg', 1, 255)       # background tiles
art.region('spr', 256, 1023)   # sprites (a 16 px sprite takes four tiles)

# --- Colours: a ramp from one base colour for each gem ---
def mix(a, b, t):
    pa = [int(a[i:i + 2], 16) for i in (0, 2, 4)]; pb = [int(b[i:i + 2], 16) for i in (0, 2, 4)]
    return ''.join('%02x' % round(x + (y - x) * t) for x, y in zip(pa, pb))
GEMS = ['d04648', 'd27d2c', 'dad45e', '6daa2c', '597dce', '8a5ac8']   # red, orange, yellow, green, blue, purple
pals = []
for k, base in enumerate(GEMS):
    pals.append(art.sprite_palette(k, {'edge': '140c1c', 'dark': mix(base, '000000', 0.35), 'mid': base, 'light': mix(base, 'ffffff', 0.35), 'shine': mix(base, 'ffffff', 0.8)}))

# --- Six shapes, 16 x 16: drawn in one colour, then lit from the upper left, shined and outlined ---
def star_points(cx, cy, r_out, r_in):
    return [(cx + (r_out if i % 2 == 0 else r_in) * math.sin(math.pi * i / 5), cy - (r_out if i % 2 == 0 else r_in) * math.cos(math.pi * i / 5)) for i in range(10)]
def shape(k):
    im = Img(16, 16)
    m = 2                                            # the placeholder colour of the shape
    if k == 0: im.disc(7.5, 7.5, 6.4, m)                                                        # round
    elif k == 1: im.poly([(7.5, 0.8), (14.8, 7.5), (7.5, 14.2), (0.2, 7.5)], m)                 # diamond
    elif k == 2: im.rect(2, 2, 12, 12, m); [im.pset(x, y, 0) for x, y in ((2, 2), (13, 2), (2, 13), (13, 13))]   # square
    elif k == 3: im.poly([(7.5, 1.2), (14.6, 13.8), (0.4, 13.8)], m)                            # triangle
    elif k == 4: im.poly([(4.5, 1.5), (11.5, 1.5), (14.8, 7.5), (11.5, 13.5), (4.5, 13.5), (0.2, 7.5)], m)   # hexagon
    else: im.poly(star_points(7.5, 8.2, 7.2, 3.3), m)                                           # star
    return im
def gem(k):
    p, im = pals[k], shape(k)
    for y in range(16):
        for x in range(16):
            if im.px[y][x]:
                s = x + y
                im.px[y][x] = p.light if s < 11 else p.dark if s > 20 else p.mid
    im.pset(5, 5, p.shine); im.pset(6, 5, p.shine); im.pset(5, 6, p.shine)
    return im.outline(p.edge)
for k in range(6): art.sprite('gem%d' % k, gem(k), pal=pals[k], region='spr')

# --- The cursor: four corners; sprite palette 6 is white (the cursor), 7 is gold (the gem that has been picked up) ---
cur = art.sprite_palette(6, {'c': 'ffffff'}); art.sprite_palette(7, {'c': 'dad45e'})
corners = Img(16, 16)
for x0, y0, dx, dy in ((0, 0, 1, 1), (15, 0, -1, 1), (0, 15, 1, -1), (15, 15, -1, -1)):
    for i in range(5):
        corners.pset(x0 + dx * i, y0, cur.c); corners.pset(x0, y0 + dy * i, cur.c)
art.sprite('cursor', corners, pal=cur, region='spr')

# --- The background: stars, and the board's panel (8 x 8 cells of 16 px at 64, 64) in a frame ---
sky = art.palette(1, {'night': '1c1830', 'night2': '262046', 'star': 'deeed6', 'panel': '3a3358', 'panel2': '4a4470', 'edge': '8595a1', 'shade': '24203a'})
def backdrop(x, y):
    h = hsh((x % 32) * 7 + (y % 32) * 13) % 61            # repeats every 32 px, so the picture needs few distinct tiles
    return sky.star if h == 0 else sky.night2 if h < 4 else sky.night
picture = Img.make(256, 224, backdrop)
picture.rect(60, 60, 136, 136, sky.edge).rect(62, 62, 132, 132, sky.shade)
for r in range(8):
    for c in range(8): picture.rect(64 + c * 16, 64 + r * 16, 16, 16, sky.panel if (r + c) % 2 else sky.panel2)
art.scene('board', picture, pal=sky, at=(0, 0), solid=True)

art.write(sys.argv[1])
