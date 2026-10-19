# Tricksy Towerz's art: carts/src/tricksy-towerz/tiles.txt, palette.txt, map.txt and art.json, and the ART block in code.js.
#   python3 carts/src/tricksy-towerz/art.py carts/src/tricksy-towerz
# Written with the art toolkit (tools/devkit/art/kit.py: its header explains the pieces). This cart owns those files:
# change the pictures here, not in them. Then look at the result with
#   node tools/devkit/art/sprites.mjs carts/tricksy-towerz.nova out.png      the sprites, at their real sizes and palettes
#   node tools/devkit/art/scene.mjs carts/tricksy-towerz.nova out.png --scene sky --holes     a background, with gaps marked
#   node tools/devkit/tiles.mjs carts/tricksy-towerz.nova out.png --from 0 --count 64 --pal 1   the tiles, with their numbers
# (pack first: node tools/pack.js carts/src/tricksy-towerz carts/tricksy-towerz.nova). Pixel values are palette indices; 0 is transparent.
#
# What is where (SPEC section 12):
#   BG2  the night: sky, moon, stars, hills and a castle (scene `sky`, Map RAM 0,0), behind everything
#   BG1  the backdrop of the yards: the code copies the cells of scene `back` (8 x 26 cells) into a canvas of its own at map (32, 0) once for each yard
#   BG0  the title picture (scene `title`) and the lobby panel (scene `lobby`), in front
#   Sprites: the wizard, in two poses, in 8 palettes (the hats of players 1 to 4, then the same with grey robes for the computer wizards)
#   The overlay draws the blocks (the physics turns them any angle), so its colours are named here too: CGRAM 97 to 103 (the lights of the blocks)
#   and 113 to 127 (their fills, the edge, the stone, the finish line)
import math, os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../../tools/devkit/art'))
from kit import *

art = Art()
art.region('bg', 1, 759)       # background tiles (the sprites need only a few)
art.region('spr', 760, 1023)   # sprites

# --- Colours of the blocks, for the overlay (the physics draws them) ---
BLOCK_FILL = ['d04648', '6daa2c', '597dce', 'dad45e', 'd27d2c', '8a4fb5', '6dc2ca']   # I, O, T, S, Z, J, L: one colour for each piece
def mix(h, to, k):
    a = [int(h[i:i + 2], 16) for i in (0, 2, 4)]; b = [int(to[i:i + 2], 16) for i in (0, 2, 4)]
    return ''.join('%02x' % round(a[i] + (b[i] - a[i]) * k) for i in range(3))
for i, h in enumerate(BLOCK_FILL):
    art.color(113 + i, h, 'p%d' % i)            # the fill
    art.color(97 + i, mix(h, 'ffffff', 0.45), 'h%d' % i)   # the light on its top and left edges
art.color(120, '2c1e31', 'edge')
art.color(121, 'f4f4f4', 'shine')
art.color(122, '8595a1', 'stone')
art.color(123, '4e4a4e', 'stoneDark')
art.color(124, '29366f', 'sky')
art.color(125, '3b5dc9', 'skyHi')
art.color(126, 'ffcd75', 'goal')
art.color(127, 'b13e53', 'danger')

# =====================================================================================================================
# The night (BG2): a sky in six bands, a moon, stars, two rows of hills and a castle on the far one
# =====================================================================================================================
night = art.palette(1, {'s0': '171a45', 's1': '23266a', 's2': '3a2d78', 's3': '5a3a88', 's4': '84488f', 's5': 'b05a8e',
                        'moon': 'f4efd8', 'moonShade': 'cfc9ac', 'star': 'f4f4f4', 'starDim': '9aa0d8',
                        'hillFar': '3a2a66', 'hillNear': '241a47', 'castle': '1a1236', 'win': 'ffcd75'})
BANDS = [(0, night.s0), (30, night.s1), (60, night.s2), (88, night.s3), (112, night.s4), (134, night.s5)]
def band_colour(x, y):
    """The sky, with a dither between one band and the next."""
    for k in range(len(BANDS) - 1, -1, -1):
        y0, c = BANDS[k]
        if y >= y0:
            if k > 0 and y < y0 + 8 and dither(x, y, 16 - (y - y0) * 2): return BANDS[k - 1][1]
            return c
    return BANDS[0][1]
def hill(x, base, amp, f1, f2, ph):
    return base - amp * (0.6 * math.sin(x / f1 + ph) + 0.4 * math.sin(x / f2 + ph * 2.3))
def sky_px(x, y):
    # near hills (in front), far hills with the castle, then the sky
    if y >= hill(x, 186, 7, 21, 9, 1.0): return night.hillNear
    far = hill(x, 162, 12, 33, 13, 0.4)
    if y >= far: return night.hillFar
    return band_colour(x, y)
sky = Img.make(256, 224, sky_px)
# the moon
sky.disc(206, 40, 14, night.moon)
for (cx, cy, r) in ((201, 36, 3), (212, 45, 2), (208, 33, 2)): sky.disc(cx, cy, r, night.moonShade)
# stars: where a hash says so, in the upper sky, some dim
for y in range(0, 118):
    for x in range(0, 256):
        if (x - 206) ** 2 + (y - 40) ** 2 < 22 ** 2: continue
        h = hsh(x * 7919 + y * 104729)
        if h % 233 == 0 and sky.px[y][x] != night.moon: sky.pset(x, y, night.star if (h >> 8) % 3 else night.starDim)
        elif h % 411 == 1: sky.pset(x, y, night.starDim)
# the castle on the far hill: a wall, three towers with pointed roofs, and a few lit windows
def castle(img, x0, ground):
    c = night.castle
    img.rect(x0, ground - 30, 54, 36, c)                              # the wall
    for i in range(7): img.rect(x0 + i * 8 + 1, ground - 34, 5, 4, c)   # its battlements
    for (tx, th) in ((x0 - 4, 54), (x0 + 22, 66), (x0 + 46, 50)):      # the towers
        img.rect(tx, ground - th, 12, th + 6, c)
        img.poly([(tx - 2, ground - th), (tx + 6, ground - th - 16), (tx + 14, ground - th)], c)
    for (wx, wy) in ((x0 + 3, ground - 40), (x0 + 29, ground - 50), (x0 + 49, ground - 38), (x0 + 15, ground - 18), (x0 + 36, ground - 16)):
        img.rect(wx, wy, 2, 4, night.win)
castle(sky, 34, int(hill(60, 162, 12, 33, 13, 0.4)) + 2)
# the near hills draw over the foot of the castle again
for y in range(150, 224):
    for x in range(256):
        if y >= hill(x, 186, 7, 21, 9, 1.0): sky.pset(x, y, night.hillNear)
art.scene('sky', sky, pal=night, at=(0, 0), solid=True)

# =====================================================================================================================
# The backdrop of a yard (BG1): a column of twilight, a little lighter towards the bottom, with a few stars
# =====================================================================================================================
back = art.palette(2, {'b0': '1f2656', 'b1': '262f6e', 'b2': '2e3a82', 'b3': '364593', 'b4': '3f51a3', 'star': 'c8d0ff', 'starDim': '7f8ccc'})
BB = [(0, back.b0), (40, back.b1), (84, back.b2), (128, back.b3), (168, back.b4)]
def back_px(x, y):
    for k in range(len(BB) - 1, -1, -1):
        y0, c = BB[k]
        if y >= y0:
            if k > 0 and y < y0 + 8 and dither(x, y, 16 - (y - y0) * 2): return BB[k - 1][1]
            return c
panel = Img.make(64, 208, back_px)
for y in range(0, 208):
    for x in range(64):
        h = hsh(x * 31 + y * 977 + 5)
        if h % 331 == 0: panel.pset(x, y, back.star)
        elif h % 277 == 1: panel.pset(x, y, back.starDim)
art.scene('back', panel, pal=back, at=(0, 28), solid=True)

# =====================================================================================================================
# The logo and the towers (BG0): TRICKSY / TOWERZ in big letters, one piece colour for each, and two rival towers either side
# =====================================================================================================================
logo = art.palette(3, {'p0': BLOCK_FILL[0], 'p1': BLOCK_FILL[1], 'p2': BLOCK_FILL[2], 'p3': BLOCK_FILL[3], 'p4': BLOCK_FILL[4], 'p5': BLOCK_FILL[5], 'p6': BLOCK_FILL[6],
                       'edge': '2c1e31', 'shine': 'f4f4f4', 'stone': '8595a1', 'stoneDark': '4e4a4e', 'shadow': '15101f'})
PC = [logo.p0, logo.p1, logo.p2, logo.p3, logo.p4, logo.p5, logo.p6]
def big_text(img, text, x, y, scale, colours):
    """The console's font scaled up, a letter in each colour, with a dark edge and a shadow."""
    glyph = Img(8 * len(text), 8)
    glyph.text(text, 0, 0, 1)
    for k in range(len(text)):
        col = colours[k % len(colours)]
        for j in range(8):
            for i in range(8):
                if glyph.get(k * 8 + i, j):
                    for b in range(scale * scale):
                        img.pset(x + (k * 8 + i) * scale + b % scale, y + j * scale + b // scale, col)
    return img
def lettered(text, scale, shade):
    """The letters in a colour each, and the same in the shadow colour."""
    w, h = 8 * len(text) * scale, 8 * scale
    base = Img(w, h)
    big_text(base, text, 0, 0, scale, [PC[(k + shade) % 7] for k in range(len(text))])
    shadow = base.copy()
    for j in range(h):
        for i in range(w):
            if shadow.px[j][i]: shadow.px[j][i] = logo.shadow
    return base, shadow
title = Img(256, 224)
for (text, y, shade) in (('TRICKSY', 18, 0), ('TOWERZ', 50, 4)):
    base, shadow = lettered(text, 3, shade)
    x = 128 - base.w // 2
    # shadow, then an edge (the letters shifted a pixel each way), then the letters, then a light on their upper left
    title.blit(shadow, x + 3, y + 3)
    for (dx, dy) in ((-1, 0), (1, 0), (0, -1), (0, 1), (-1, -1), (1, 1), (-1, 1), (1, -1)):
        e = base.copy()
        for j in range(e.h):
            for i in range(e.w):
                if e.px[j][i]: e.px[j][i] = logo.edge
        title.blit(e, x + dx, y + dy)
    title.blit(base, x, y)
    for j in range(base.h):
        for i in range(base.w):
            if base.px[j][i] and not base.get(i - 1, j) or base.px[j][i] and not base.get(i, j - 1): title.pset(x + i, y + j, logo.shine)

def block_img(fill, edge, hi, ang):
    """One 8 x 8 block, turned by ang degrees, on a 14 x 14 picture."""
    im = Img(14, 14)
    c, s = math.cos(math.radians(ang)), math.sin(math.radians(ang))
    corners = [(-4, -4), (4, -4), (4, 4), (-4, 4)]
    pts = [(7 + x * c - y * s, 7 + x * s + y * c) for x, y in corners]
    big = [(p[0] + 0.0, p[1] + 0.0) for p in pts]
    im.poly(big, edge)
    inner = [(7 + (x * 0.78) * c - (y * 0.78) * s, 7 + (x * 0.78) * s + (y * 0.78) * c) for x, y in corners]
    im.poly(inner, fill)
    im.line(inner[0][0], inner[0][1], inner[1][0], inner[1][1], hi)
    im.line(inner[3][0], inner[3][1], inner[0][0], inner[0][1], hi)
    return im
def tower(img, x0, rows, seed, top_tilt):
    """A stack of blocks on a stone platform (6 blocks wide, 2 deep) whose top is at y = 196. Each row a little off, the last few turned."""
    for r in range(2):                                           # the platform
        for c in range(6):
            img.rect(x0 + c * 8, 196 + r * 8, 8, 8, logo.stone); img.rect(x0 + c * 8, 196 + r * 8, 8, 8, logo.stoneDark, fill=False)
    for j in range(rows):
        y = 188 - j * 8
        n = 5 if j % 3 == 0 else 4 if j % 3 == 1 else 3
        off = (hsh(seed + j * 17) % 7) - 3 if j else 0
        start = x0 + 4 + ((6 - n) * 4) + off
        k = hsh(seed + j * 131) % 7
        for c in range(n):
            ang = 0
            if j >= rows - top_tilt: ang = ((hsh(seed + j * 7 + c) % 13) - 6) * (1 + (j - (rows - top_tilt)) * 0.5)
            b = block_img(BLOCK_FILL and PC[(k + c // 2) % 7], logo.edge, logo.shine, ang)
            img.blit(b, start + c * 8 - 3, y - 3)
tower(title, 8, 9, 11, 2)       # the left one: low and steady
tower(title, 200, 13, 29, 4)    # the right one: higher, wobbling at the top
# the floating rock under each platform
for x0 in (8, 200):
    for y in range(212, 224):
        w = 48 - (y - 212) * 2
        title.rect(x0 + (48 - w) // 2, y, w, 1, logo.stoneDark)
art.scene('title', title, pal=logo, at=(0, 56))

# =====================================================================================================================
# The lobby: a panel on BG0 (the sprites of the wizards stand on it)
# =====================================================================================================================
pan = art.palette(4, {'fill': '15101f', 'edge': '4a4a8c', 'gold': 'dad45e', 'goldDark': '8a6f30', 'row': '1e1830'})
lobby = Img(256, 224)
lobby.rect(16, 24, 224, 176, pan.fill)
lobby.rect(16, 24, 224, 176, pan.edge, fill=False)
lobby.rect(18, 26, 220, 172, pan.goldDark, fill=False)
for (cx, cy) in ((20, 28), (233, 28), (20, 193), (233, 193)): lobby.rect(cx, cy, 3, 3, pan.gold)
art.scene('lobby', lobby, pal=pan, at=(0, 84))

# =====================================================================================================================
# The wizards (sprites): 16 x 16, a pointed hat with a star, a beard, a robe; two poses (standing, cheering)
# =====================================================================================================================
HATS = [('d04648', '8c2a3a', '7b2d3a'), ('597dce', '34508c', '2c3f6e'), ('6daa2c', '3e6e1c', '2c5a1e'), ('dad45e', '9a8e2c', '7a6e1c')]   # hat, its shadow, the robe
def wizard_palette(sub, hat, dark, robe, grey):
    return art.sprite_palette(sub, {'edge': '140c1c', 'hat': hat, 'hatDark': dark, 'star': 'ffcd75', 'skin': 'f0c8a0', 'eye': '140c1c',
                                    'beard': 'f4f4f4', 'beardDark': 'b4b8c8', 'robe': '6e7078' if grey else robe, 'robeDark': '45474e' if grey else dark})
pals = [wizard_palette(i, *HATS[i], False) for i in range(4)] + [wizard_palette(4 + i, *HATS[i], True) for i in range(4)]
P0 = pals[0]
KEY = lambda p: {'o': p.edge, 'h': p.hat, 'd': p.hatDark, 's': p.star, 'k': p.skin, 'e': p.eye, 'b': p.beard, 'B': p.beardDark, 'r': p.robe, 'R': p.robeDark}
STAND = [
    '.......oo.......',
    '......ohho......',
    '.....ohhhho.....',
    '.....ohshho.....',
    '....ohhhhhho....',
    '...ohhhhhhhho...',
    '..oddddddddddo..',
    '...okkkkkkkko...',
    '...okekkkkeko...',
    '...obbkkkkbbo...',
    '..obbbbbbbbbbo..',
    '..orbbbbbbbbro..',
    '.orrrBbbbbBrrro.',
    '.orrrrrbbrrrrro.',
    '.orrRrrrrrrRrro.',
    '..oooooooooooo..',
]
CHEER = [
    '.kk....oo....kk.',
    '.rr...ohho...rr.',
    '.rr..ohhhho..rr.',
    '..rr.ohshho.rr..',
    '..rrohhhhhhorr..',
    '..orrhhhhhhrro..',
    '..oddddddddddo..',
    '...okkkkkkkko...',
    '...okekkkkeko...',
    '...obbkkkkbbo...',
    '..obbbbbbbbbbo..',
    '..orbbbbbbbbro..',
    '.orrrBbbbBrrro..',
    '.orrrrrbbrrrrro.',
    '.orrRrrrrrrRrro.',
    '..oooooooooooo..',
]
for i, p in enumerate(pals):
    art.sprite('wiz%d' % i, Img.from_rows(STAND, key=KEY(p)), pal=p, region='spr')
    art.sprite('wizWin%d' % i, Img.from_rows(CHEER, key=KEY(p)), pal=p, region='spr')

art.write(sys.argv[1])
