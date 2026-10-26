# The Franchise: Basketball Edition's art: tiles.txt, palette.txt, map.txt and art.json, and the ART block in code.js.
#   python3 carts/src/franchise/art.py carts/src/franchise
#   python3 carts/src/franchise/art.py sheet.png        a contact sheet of the sprites (to look at)
# BG0 is the floor: two pictures in Map RAM, a dark hardwood floor behind the menus and a court (lines, keys, circles) behind the game night.
# Sprites: six emblem shapes (16 px) and six portraits (32 px) whose colours are set by code while the game plays (the team's two
# colours, a skin tone, a hair colour: color() in code.js), and the title's logo.
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../../tools/devkit/art'))
from kit import *
from draw import Canvas
from figure import head
from lettering import big_text

art = Art()
art.region('bg', 1, 255)       # background tiles
art.region('spr', 256, 1023)   # sprites
art.backdrop('0a1020')
art.color(200, '121a50', 'GLASS')
art.color(1, '10143a', 'SHADOW')                                           # the overlay's text shadow, an indigo (the default's is a muddy brown)
art.color(3, '3a4c88', 'PANEL')                                            # its frames and rules
art.color(10, 'a8bcf0', 'DIM')                                             # its quiet text                                          # the panels' fill, seen through (blend() in code.js)

# --- The floors: planks 32 x 16 repeat, so a whole screen costs a few tiles ---
FL = art.palette(1, {'wood': ramp('2a1608', 6, at=3, step=0.05)})
CT = art.palette(2, {'wood': ramp('b8814a', 6, at=3, step=0.06), 'line': 'f0ece0', 'paint': ['3a5690', '33497f'], 'edge': '1a1008'})
floor_tex = texture('planks', 32, 16, FL.wood)
court_tex = texture('planks', 32, 16, CT.wood)
art.scene('floor', Img.make(256, 224, lambda x, y: floor_tex.px[y % 16][x % 32]), pal=FL, at=(0, 0), solid=True)

X0, Y0, CW, CH = 40, 32, 176, 96         # the court on the screen (the game night's view, code.js drawCourt)
CY = Y0 + CH // 2


def dark(c):
    i = CT.wood.index(c)
    return CT.wood[max(0, i - 2)]


def court(x, y):
    c = court_tex.px[y % 16][x % 32]
    if not (X0 <= x < X0 + CW and Y0 <= y < Y0 + CH):
        return dark(c)
    dx, dy = x - X0, y - Y0
    line = dx < 2 or dx >= CW - 2 or dy < 2 or dy >= CH - 2 or dx in (CW // 2 - 1, CW // 2)
    r = ((x - (X0 + CW / 2)) ** 2 + (y - CY) ** 2) ** 0.5
    line = line or 10 <= r < 12
    for hx, s in ((X0, 1), (X0 + CW - 1, -1)):                              # each end: the key, the free throw circle, the three point line
        kx = (x - hx) * s
        if 0 <= kx < 32 and CY - 14 <= y < CY + 14:
            line = line or kx >= 30 or y < CY - 12 or y >= CY + 12
            if not line: return CT.paint[1 if (kx + y) % 6 < 3 else 0]
        r2 = (((x - (hx + 30 * s)) ** 2 + (y - CY) ** 2) ** 0.5)
        if 10 <= r2 < 11.6 and kx >= 30: line = True
        r3 = (((x - (hx + 6 * s)) ** 2 + (y - CY) ** 2) ** 0.5)
        if 38 <= r3 < 39.6 and kx >= 12: line = True
        if kx < 12 and (CY - 39 <= y < CY - 37 or CY + 37 <= y < CY + 39): line = True
    return CT.line if line else c


art.scene('court', Img.make(256, 224, court), pal=CT, at=(32, 0), solid=True)

# --- Emblems: six shapes, in the roles ink, a (three steps) and b; code.js sets the colours from a team's two colours ---
EM = art.sprite_palette(6, {'ink': '1c1428', 'a': ramp('3060b0', 3, at=1, step=0.2), 'b': 'f0d060'})


def shade_edges(im, lo, mid, hi):
    """A flat shape lit from the upper left: its top and left edges light, its bottom and right edges dark."""
    out = im.copy()
    for y in range(im.h):
        for x in range(im.w):
            if im.px[y][x] != mid: continue
            up = y == 0 or im.px[y - 1][x] == 0 or im.px[y - 1][x] == EM.ink
            left = x == 0 or im.px[y][x - 1] == 0 or im.px[y][x - 1] == EM.ink
            down = y == im.h - 1 or im.px[y + 1][x] in (0, EM.ink)
            right = x == im.w - 1 or im.px[y][x + 1] in (0, EM.ink)
            if (up or left) and not (down or right): out.px[y][x] = hi
            elif (down or right) and not (up or left): out.px[y][x] = lo
    return out


def emblem(kind):
    a1, a2, a3 = EM.a
    b, ink = EM.b, EM.ink
    im = Img(16, 16)
    if kind == 0:                                                         # a basketball
        im.disc(7.5, 7.5, 6.4, a2)
        for y in range(16): im.pset(7, y, b) if (y - 7.5) ** 2 < 42 else None; im.pset(8, y, b) if (y - 7.5) ** 2 < 42 else None
        for x in range(16): im.pset(x, 7, b) if (x - 7.5) ** 2 < 42 else None; im.pset(x, 8, b) if (x - 7.5) ** 2 < 42 else None
        im.ring(1.5, 7.5, 5, 6.5, b); im.ring(14.5, 7.5, 5, 6.5, b)
        for y in range(16):
            for x in range(16):
                if (x - 7.5) ** 2 + (y - 7.5) ** 2 > 41: im.pset(x, y, 0)
    elif kind == 1:                                                       # a shield
        im.poly([(1, 1), (14, 1), (14, 8), (11, 12), (7.5, 15), (4, 12), (1, 8)], a2)
        im.rect(1, 5, 14, 3, b)
    elif kind == 2:                                                       # a star
        pts = []
        for i in range(10):
            ang = -math.pi / 2 + i * math.pi / 5
            rr = 7.4 if i % 2 == 0 else 3.2
            pts.append((7.5 + rr * math.cos(ang), 8.2 + rr * math.sin(ang)))
        im.poly(pts, a2)
        im.disc(7.5, 8.2, 1.6, b)
    elif kind == 3:                                                       # a diamond
        im.poly([(7.5, 0.5), (14.5, 7.5), (7.5, 14.5), (0.5, 7.5)], a2)
        im.poly([(7.5, 4), (11, 7.5), (7.5, 11), (4, 7.5)], b)
    elif kind == 4:                                                       # a hexagon with a band
        im.poly([(4, 1), (12, 1), (15, 7.5), (12, 14), (4, 14), (1, 7.5)], a2)
        im.rect(2, 6, 12, 3, b)
    else:                                                                 # a bolt on a disc
        im.disc(7.5, 7.5, 6.8, a2)
        im.poly([(9, 1.5), (4, 8.5), (7.5, 8.5), (6, 14), (12, 6), (8.5, 6)], b)
    im.outline(ink)
    return shade_edges(im, a1, a2, a3)


for k in range(6): art.sprite('emb%d' % k, emblem(k), pal=EM, region='spr')

# --- Portraits: a head and shoulders, six hairstyles; the skin, the hair and the jersey are set by code ---
PO = art.sprite_palette(5, {'line': '1c1428', 'skin': ramp('c8946c', 3, at=1, step=0.2), 'hair': ramp('2a1a14', 3, at=1, step=0.25),
                            'white': 'f4f0e8', 'iris': '3a2418', 'jer': ramp('3060b0', 3, at=1, step=0.2), 'trim': ramp('f0d060', 2, at=1)})
STYLES = ['short', 'swept', 'flat', 'spiky', 'bald', 'long']


def portrait(style):
    d = Canvas(32, 32)
    sk = [PO.skin[0], PO.skin[0], PO.skin[0], PO.skin[1], PO.skin[2]]
    sk = list(PO.skin)
    jr = list(PO.jer)
    # shoulders and the jersey, a neck under the head
    d.fill(blob([(10, 24), (22, 24), (22, 30), (10, 30)]), sk[1], part='neck', pri=1)
    d.fill(poly([(2, 32), (3, 27), (9, 24.5), (16, 26), (23, 24.5), (29, 27), (30, 32)]), jr[1], part='jersey', pri=2)
    d.shadow('jersey', jr[0], light=(1, -1), depth=2.5)
    d.fill(poly([(11, 24.5), (16, 28.5), (21, 24.5), (19, 24.2), (16, 26.5), (13, 24.2)]), PO.trim[1], part='collar', pri=3)
    d.fill(oval(16, 27.5, 5, 2.5), sk[1], part='throat', pri=2, inside='jersey')
    head(d, 16, 13, 22, sk, list(PO.hair), view='front', facing=1, style=style, white=PO.white, iris=PO.iris, line=PO.line)
    return d.render(outline=PO.line, light=(1, -1))


for k, st in enumerate(STYLES): art.sprite('por%d' % k, portrait(st), pal=PO, region='spr')

# --- The title's logo ---
LG = art.sprite_palette(3, {'ink': '1c1428', 'gold': ramp('f0b030', 5, at=3, step=0.14), 'shade': '6a3410'})
art.big_sprite('logo', big_text('THE FRANCHISE', LG.gold, scale=2, outline=LG.ink, shadow=LG.shade, spacing=0), pal=LG)

if len(sys.argv) > 1 and sys.argv[1].endswith('.png'):
    sh = Sheet(scale=5)
    for k in range(6): sh.add('emb%d' % k, emblem(k), EM)
    for k, st in enumerate(STYLES): sh.add('por' + st, portrait(st), PO)
    sh.save(sys.argv[1])
else:
    art.write(sys.argv[1])
