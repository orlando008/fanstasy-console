# The Ivory Tower's art: carts/src/ivory-tower/tiles.txt, palette.txt, map.txt and art.json, and the ART block in code.js.
#   python3 carts/src/ivory-tower/art.py carts/src/ivory-tower
# Written with the art toolkit (tools/devkit/art/kit.py: its header explains the pieces). This cart owns those files:
# change the pictures here, not in them. Then look at the result with
#   node tools/devkit/art/sprites.mjs carts/ivory-tower.nova out.png      the sprites, at their real sizes and palettes
#   node tools/devkit/art/scene.mjs carts/ivory-tower.nova out.png --scene field --holes     the background, with gaps marked
#   node tools/devkit/tiles.mjs carts/ivory-tower.nova out.png --from 0 --count 64 --pal 1   the tiles, with their numbers
# (pack first: node tools/pack.js carts/src/ivory-tower carts/ivory-tower.nova). Pixel values are palette indices; 0 is transparent.
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../../tools/devkit/art'))
from kit import *

art = Art()
art.region('bg', 1, 899)       # background tiles: the landmarks, the clouds, the stars and the moon
art.region('spr', 900, 1023)   # sprites (none yet)

# The sky is a gradient the cart sets line by line in scanline() from the camera's height, and its colours, the clouds' and the
# stars' are set each frame too (code.js skyUpdate): the pictures below are drawn in palette indices, and the colours here are
# only what the screen shows before the first frame. See-through panels are GLASS, an overlay colour from 192 up, which blend()
# makes translucent. BG palette 0 shares CGRAM with the overlay's text colours, so it is left alone.
art.color(200, '141c3c', 'GLASS')
# BG palette 1 (CGRAM 17 to 21): the landmarks, as silhouettes. far, mid and near are hazier to darker; rim is a lit edge; light is a window.
sil = art.palette(1, {'far': '8a8fb8', 'mid': '5a5f90', 'near': '34386a', 'rim': 'c0c4e0', 'light': 'e8c860'})
# BG palette 2 (CGRAM 33 to 36): a cloud's four steps, dark to light.
cloud = art.palette(2, {'cloud': ['a8b4d8', 'c8d0e8', 'e4e8f4', 'ffffff']})
# BG palette 3 (CGRAM 49 to 51 the stars, 52 to 56 the moon).
night = art.palette(3, {'star0': '8890c0', 'star1': 'c0c8f0', 'star2': 'ffffff', 'moon': ['607098', '8c9cc0', 'c0ccdc', 'e8ecf4', 'ffffff']})
FAR, MID, NEAR, RIM, LIGHT = sil.far, sil.mid, sil.near, sil.rim, sil.light

# --- The landmarks (layer 0): a tall strip, 256 x 616, the tower's whole climb. Altitude a (px above the base slab's top) is row 528 - a;
# the screen scrolls it with the camera (code.js: bg y = 352 - cam). Each landmark has its 80 px of the climb (10 floors), and is drawn in
# a small picture of its own with the base at its bottom row, then placed. ---
STRIP_H, TOP = 616, 528     # 40 rows of paving below the base, for the title's raised view
strip = Img(256, STRIP_H)

def band(a0, h=112):
    """A picture for the landmark whose base is at altitude a0: y(a) gives the row of altitude a (above a0) in it."""
    img = Img(256, h)
    return img, (lambda a: h - 1 - a)

def place(img, a0):
    strip.blit(img, 0, TOP - a0 - img.h + 1)

# The ground: the courtyard's paving, below the base slab (the steps are drawn over it).
strip.rect(0, TOP, 256, STRIP_H - TOP, MID)
strip.rect(0, TOP, 256, 1, RIM)
for k in range(1, 11): strip.rect(0, TOP + 3 + k * 8, 256, 1, NEAR)

# 0 The Courtyard (altitude 0 to 80): a garden wall with arches, cypresses.
im, y = band(0)
im.rect(0, y(34), 256, 34, FAR)
for bay in range(8):
    cx = 16 + 32 * bay
    im.rect(cx - 9, y(17), 18, 17, 0); im.disc(cx, y(17), 9, 0)
im.rect(0, y(37), 256, 3, MID); im.rect(0, y(37), 256, 1, RIM)
for cx, hgt in ((22, 74), (62, 56), (194, 56), (234, 74)):
    im.poly([(cx, y(hgt)), (cx + 8, y(hgt * 0.55)), (cx + 7, y(6)), (cx - 7, y(6)), (cx - 8, y(hgt * 0.55))], NEAR)
    im.rect(cx - 1, y(6), 3, 6, MID)
place(im, 0)

# 1 The Balcony (80 to 160): a balustrade across the sky between two piers with urns.
im, y = band(80)
im.rect(0, y(32), 256, 5, MID); im.rect(0, y(32), 256, 1, RIM)
im.rect(0, y(6), 256, 4, MID)
for x in range(5, 256, 11):
    im.rect(x, y(28), 4, 22, FAR); im.rect(x - 1, y(18), 6, 6, FAR)
for x0 in (0, 232):
    im.rect(x0, y(56), 24, 56, NEAR); im.rect(x0 - 2, y(58), 28, 4, MID); im.rect(x0 + 1, y(56), 2, 56, MID)
    im.disc(x0 + 12, y(64), 7, NEAR); im.rect(x0 + 8, y(60), 8, 4, NEAR)
place(im, 80)

# 2 The Colonnade (160 to 240): tall columns under a long beam.
im, y = band(160)
for i in range(7):
    cx = 8 + 40 * i
    im.rect(cx - 6, y(66), 12, 62, MID); im.rect(cx - 6, y(66), 2, 62, RIM)
    for f in (cx - 1, cx + 3): im.rect(f, y(64), 1, 58, NEAR)
    im.rect(cx - 9, y(70), 18, 4, NEAR); im.rect(cx - 9, y(4), 18, 4, NEAR)
im.rect(0, y(78), 256, 8, NEAR); im.rect(0, y(78), 256, 1, RIM)
for x in range(4, 256, 8): im.rect(x, y(75), 3, 3, MID)
place(im, 160)

# 3 The Dome (240 to 320): two domes standing on a bank of cloud.
im, y = band(240, 96)
for cx, r in ((46, 34), (212, 24)):
    base = 22
    im.disc(cx, y(base), r, RIM); im.disc(cx + 2, y(base) + 2, r - 1, NEAR)
    im.rect(cx - r - 4, y(base), 2 * r + 8, base - 6, MID); im.rect(cx - r - 4, y(base), 2 * r + 8, 1, RIM)
    for k in range(-2, 3): im.rect(cx + k * (r // 3) - 2, y(base - 4), 5, 11, FAR); im.disc(cx + k * (r // 3) + 0.5, y(base - 4), 2.5, FAR)
    im.rect(cx - 3, y(base + r + 9), 7, 10, MID); im.poly([(cx - 5, y(base + r + 9)), (cx + 6, y(base + r + 9)), (cx + 0.5, y(base + r + 20))], NEAR)
    im.rect(cx, y(base + r + 24), 1, 5, NEAR)
im.rect(0, y(14), 256, 14, FAR)
for x in range(-6, 266, 20):
    r = 11 + (hsh(x * 3 + 7) % 8)
    im.disc(x, y(10 + r // 2), r, RIM)
im.rect(0, y(8), 256, 8, FAR)
place(im, 240)

# 4 The Belfry (320 to 400): two bell towers floating on their corbels, a bell in a lit arch.
im, y = band(320, 104)
im.poly([(10, y(14)), (62, y(14)), (46, y(0)), (26, y(0))], NEAR)
im.rect(14, y(56), 44, 44, NEAR); im.rect(14, y(56), 2, 44, MID)
im.rect(26, y(48), 20, 26, 0); im.disc(36, y(48), 10, 0); im.disc(36, y(36), 4, LIGHT); im.rect(35, y(44), 2, 6, LIGHT)
im.poly([(8, y(56)), (64, y(56)), (36, y(94))], MID); im.poly([(8, y(56)), (36, y(94)), (24, y(56))], RIM)
im.rect(36, y(100), 1, 8, NEAR)
im.poly([(210, y(12)), (234, y(12)), (226, y(0)), (218, y(0))], NEAR)
im.rect(208, y(66), 28, 54, NEAR); im.rect(208, y(66), 2, 54, MID)
im.rect(216, y(56), 12, 20, 0); im.disc(222, y(56), 6, 0); im.rect(221, y(46), 2, 5, LIGHT)
im.rect(216, y(36), 12, 3, MID)
im.poly([(204, y(66)), (240, y(66)), (222, y(102))], MID)
place(im, 320)

# 5 The Spire (400 to 480): needles and pinnacles reaching up, joined by arches.
im, y = band(400, 120)
im.rect(24, y(24), 34, 24, NEAR); im.rect(24, y(24), 2, 24, MID)
im.rect(30, y(18), 6, 8, LIGHT); im.rect(46, y(18), 6, 8, LIGHT)
im.poly([(26, y(24)), (56, y(24)), (41, y(118))], NEAR); im.poly([(26, y(24)), (41, y(118)), (36, y(24))], MID)
for hh in (46, 66, 86): im.rect(41 - (22 - hh // 5) // 2, y(hh), 22 - hh // 5, 2, MID)
for cx, hh in ((196, 80), (222, 108), (248, 70)):
    im.rect(cx - 7, y(26), 14, 26, NEAR); im.rect(cx - 7, y(26), 2, 26, MID)
    im.poly([(cx - 8, y(26)), (cx + 8, y(26)), (cx, y(hh))], NEAR)
    im.rect(cx - 1, y(20), 3, 6, LIGHT)

place(im, 400)

art.scene('landmarks', strip, pal=sil, at=(0, 0))

# --- The clouds (layer 1): a field of cumulus 256 x 192 that repeats both ways; the cart scrolls it slower than the tower, drifting sideways. ---
cl = Img(256, 192)
clouds(cl, cloud.cloud, count=7, y0=8, y1=176, size=(30, 70), seed=3)
art.scene('clouds', cl, pal=cloud, at=(32, 0))

# --- The stars and the moon (layer 2): stars in three brightnesses, one in eight of the brightest with a cross; a moon, lit from the left. ---
st = Img(256, 224)
stars(st, [night.star0, night.star0, night.star1, night.star2], density=0.007, y0=0, y1=200, seed=5)
orb(st, 198, 56, 15, night.moon, kind='moon', seed=2, wrap=False)
art.scene('stars', st, pal=night, at=(64, 0))

art.write(sys.argv[1])
