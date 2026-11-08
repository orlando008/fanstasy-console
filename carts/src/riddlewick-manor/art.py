# Riddlewick Manor's art: carts/src/riddlewick-manor/tiles.txt, palette.txt, map.txt and art.json, the ART block in
# code.js, and rom/rooms.bin (each room kind's colours).
#   python3 carts/src/riddlewick-manor/art.py carts/src/riddlewick-manor
# Written with the art toolkit (tools/devkit/art/kit.py: its header explains the pieces). This cart owns those files:
# change the pictures here, not in them. Look at the result with tools/devkit/shots.mjs (pack first).
#
# The cosy-spooky storybook manor (spec 12). The layers:
#   BG2  the room as you see it (a box in perspective: wallpaper over panelling, a beamed ceiling, floorboards and a rug)
#        and, below it, the panel (a wooden desk with a parchment for the map): one scene, 32 x 28 tiles. Every room
#        uses it; its palette 1 is recoloured for each room's kind from rom/rooms.bin (15 colours a kind, RGB555).
#        On the title it shows the manor at night instead (the `title` scene, palette 7; the sky is a gradient).
#   BG1  the room's furniture, a 32 x 56 stamp either side of the back door (code.js writes it; palette 2).
#   BG0  the doors (code.js writes them): one set of tiles for the back wall's door and one for a side wall's (the right
#        wall's is the left's, flipped), drawn closed; palette 3 shows them closed, 4 open (the leaf a dark doorway), 5
#        locked (greyed, with a padlock sprite).
#   sprites  the ghost who asks (32 x 64, see-through: sprite palette 5, blended), its hat or prop (16 px, palette 1),
#        the candle's holder and flame, the gold arrow over the chosen door, the padlock, a key (palette 0).
import os, sys, math
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../../tools/devkit/art'))
from kit import *

HERE = os.path.dirname(os.path.abspath(__file__))
art = Art()
art.region('bg', 1, 863)
art.region('spr', 864, 1023)
art.backdrop('0a0610')

# --- The overlay's colours: CGRAM 160 and up (sprite palette 2's entries, which no sprite uses), and the panels' glass
# at 200 (blended: code.js turns blending on for the overlay's colours from 192 up) ---
for i, (hexc, name) in enumerate([('2a1a10', 'INK'), ('8a6a40', 'FADED'), ('c8402c', 'SEAL'), ('e8c050', 'GOLD'),
                                  ('f4ead0', 'CREAM'), ('3a2a1c', 'ROOM'), ('fff0b0', 'WAX'), ('d8c8a0', 'WAXSHADE'),
                                  ('1a1028', 'SHEET'),     # SHEET: the glass's colour, solid (for the panels text sits on)
                                  ('06030a', 'DEEP'), ('6a58b0', 'EDGE'), ('b4aae0', 'LILAC')]):   # text's shadow, panels' edge, quiet text
    art.color(160 + i, hexc, name)
art.color(200, '1a1028', 'GLASS')

# ======================================================================================================================
# The room: a box in perspective. The back wall is x 64..191, y 16..103 (tile-aligned, so the door and the furniture sit
# on tiles); the side walls run from the screen's edges to it; the view is 136 lines tall (17 rows), the panel below.
# ======================================================================================================================
BX0, BX1, BY0, BY1, VIEW_H = 64, 192, 16, 104, 136
WAIN = 0.62   # the panelling's top, as a share of the wall's height from its top
def side_top(x): return BY0 * x / BX0                              # the left wall's top edge at column x (0..64)
def side_bot(x): return (VIEW_H - 1) - (VIEW_H - 1 - BY1) * x / BX0   # and its bottom edge

ROLES = {'paper': None, 'wood': None, 'trim': None, 'ceil': None, 'floor': None, 'rug': None, 'shadow': None}
def kind_colours(paper, wood, rug, floor='8a4a1c', trim='d8a840', ceil='2a1420'):
    """A room kind's palette 1: wallpaper (3), panelling (3), trim (1), ceiling (2), floor (3), rug (2), shadow (1)."""
    return {'paper': ramp(paper, 3), 'wood': ramp(wood, 3), 'trim': trim, 'ceil': ramp(ceil, 2), 'floor': ramp(floor, 3),
            'rug': ramp(rug, 2), 'shadow': '140a0c'}
KIND_COLOURS = [   # in the order of KINDS in code.js
    kind_colours('2e5a3a', '6a3414', 'a83028'),                                   # Entrance Hall: green paper, oak, a red rug
    kind_colours('6a2430', '5a2410', '2e6a3a'),                                   # Library: burgundy, walnut, green
    kind_colours('34507a', '7a4418', '8a2a3a'),                                   # Gallery: slate blue, oak, crimson
    kind_colours('8a2a2a', '641c10', 'b08a30'),                                   # Dining Room: crimson, mahogany, gold
    kind_colours('c8b890', '8a6a3a', '7a4a2a', floor='6a6460', trim='6a4a2a'),    # Kitchen: cream tiles, pine, stone floor
    kind_colours('7aa060', 'c8c0a8', '8a5030', floor='a0583a', trim='e8e0c8'),    # Conservatory: leaf green, white wood, terracotta
    kind_colours('5a3a7a', '5a2a28', '2e4a8a'),                                   # Music Room: purple, rosewood, blue
    kind_colours('8ab0c8', 'd8c8a8', 'c87890', trim='f0e0c0'),                    # Nursery: pale blue, cream, pink
    kind_colours('5a6478', '4a2414', '8a2828', trim='a0a8c0'),                    # Armoury: stone grey, dark wood, red
    kind_colours('202c5a', '1c1418', '5a2a6a', trim='e8c050', ceil='181430'),     # Clock Room: midnight blue, black lacquer, gold
]
room = art.palette(1, KIND_COLOURS[0])

def room_px(x, y):
    """The room's colour index at (x, y) of the view (palette 1's roles)."""
    if BX0 <= x < BX1 and BY0 <= y < BY1:                                          # the back wall
        h = (y - BY0) / (BY1 - BY0)
        return wall_px(x - BX0, h, 1.0)
    if y >= BY1 and BX0 <= x < BX1 or (x < BX0 and y > side_bot(x)) or (x >= BX1 and y > side_bot(255 - x)):
        return floor_px(x, y)
    xx = x if x < BX0 else 255 - x                                                  # a side wall (the right one mirrored)
    if x < BX0 or x >= BX1:
        top, bot = side_top(xx), side_bot(xx)
        if y < top: return ceil_px(x, y)
        h = (y - top) / (bot - top)
        u = perspective_u(xx)
        return wall_px(u, h, 0.6 + 0.4 * xx / BX0, side=True)
    return ceil_px(x, y)                                                            # the ceiling above the back wall

def perspective_u(xx):
    """Distance along a side wall (0 at the screen's edge, 128 where it meets the back wall), squeezed with depth."""
    z = 1 + 2.0 * xx / BX0            # 1 at the near edge, 3 at the back wall (it is a third of the screen's height)
    return 128 * (1 - 1 / z) / (1 - 1 / 3)

def wall_px(u, h, light, side=False):
    if h < 0.035: return room.trim                                                  # the picture rail, at the top
    if h < 0.06: return room.wood[0]
    if h >= WAIN:                                                                   # the panelling
        if WAIN <= h < WAIN + 0.035: return room.trim                               # its rail
        if h > 0.97: return room.wood[0]                                            # the skirting board
        k = int(u) % 32
        if k < 2: return room.wood[0]                                               # the stiles between panels
        if k == 2 or abs(h - (WAIN + 0.07)) < 0.012: return room.wood[2]            # the panels' lit edges
        if k == 31 or abs(h - 0.94) < 0.012: return room.shadow
        return room.wood[1]
    # the wallpaper: a damask diamond every 16 px, on a ground of the middle tone; darker near the ceiling
    hu, hv = int(u) % 16, int(h * 88) % 16
    d = abs(hu - 8) + abs(hv - 8)
    if d == 6: return room.paper[2]
    if d < 2: return room.paper[2] if (hu + hv) % 2 else room.paper[1]
    if h < 0.1: return room.paper[0]
    if side and light < 0.75: return room.paper[0] if (int(u) + int(h * 88)) % 2 else room.paper[1]
    return room.paper[1]

def ceil_px(x, y):
    # dark boards with cross beams, closer together as they go back
    return room.ceil[1] if y in (2, 3, 8, 9, 13) else room.ceil[0]

VP = 30   # the floor's vanishing point, above the screen's middle
def floor_px(x, y):
    d = y - VP
    X = (x - 128) * (VIEW_H - VP) / d                                               # the floor's own x (at the screen's bottom scale)
    Z = 1000 / d                                                                    # its depth
    if abs(X) < 70 and 9 < Z < 15.5:                                                # the rug
        if abs(X) > 64 or Z < 9.6 or Z > 15.0: return room.trim
        return room.rug[1] if (int(abs(X) / 10) + int(Z * 2)) % 2 == 0 else room.rug[0]
    board = int(abs(X) / 18)
    seam = abs(X) % 18 < 1.4 * (VIEW_H - VP) / d + 0.3
    if seam: return room.shadow
    joint = (Z + board * 1.7) % 6 < 0.18
    if joint: return room.floor[0]
    return room.floor[2] if (board + int(Z)) % 3 == 0 else room.floor[1]

view = Img.make(256, VIEW_H, room_px)

# The panel below the view (rows 17 to 27): a dark wooden desk, a parchment on the left for the map, brass corners.
desk = art.palette(6, {'wood': ramp('5a2014', 3), 'parch': ramp('d8c098', 3), 'brass': ramp('c8a050', 2), 'ink': '2a1a10'})
PARCH = (4, 142, 76, 78)   # x, y, w, h of the parchment (the map is drawn on it, 10 px a room)
def panel_px(x, y):
    px, py, pw, ph = PARCH
    if px <= x < px + pw and py <= y < py + ph:
        e = min(x - px, px + pw - 1 - x, y - py, py + ph - 1 - y)
        if e == 0: return desk.ink
        n = hsh((x % 8) * 31 + (y % 8) * 17 + (x // 8 % 3) * 5) % 40   # a faint speckle that repeats every few tiles
        return desk.parch[0] if e == 1 or n == 0 else desk.parch[2] if n < 4 else desk.parch[1]
    if y == VIEW_H or y == 223 or x in (0, 255): return desk.ink
    if y == VIEW_H + 1: return desk.brass[1]
    yy = y % 8 + math.sin((x % 32) / 32.0 * 2 * math.pi) * 1.2   # faint grain that repeats every 32 x 8 px
    return desk.wood[0] if abs(yy - 3) < 0.35 and x % 5 else desk.wood[2] if abs(yy - 6) < 0.3 and x % 7 == 0 else desk.wood[1]
panel = Img.make(256, 224 - VIEW_H, lambda x, y: panel_px(x, y + VIEW_H))
art.scene('room', view, pal=room, at=(0, 0), solid=True)
art.scene('panel', panel, pal=desk, at=(0, VIEW_H // 8), solid=True)

# ======================================================================================================================
# The doors (BG0): drawn closed; their palettes make them closed, open or locked.
# ======================================================================================================================
DOOR_ROLES = lambda leaf, metal: {'frame': ramp('4a1c10', 3), 'leaf': leaf, 'metal': metal, 'dark': '0a0608'}
closed = art.palette(3, DOOR_ROLES(ramp('9a5424', 3), ramp('c89838', 2)))
art.palette(4, DOOR_ROLES(['0a0608', '120c10', '1a1218'], ['0a0608', '120c10']))   # open: the leaf a dark doorway
art.palette(5, DOOR_ROLES(ramp('4a5878', 3), ramp('a83028', 2)))                   # locked: cold slate, the iron red

def back_door():
    """32 x 56, at x 112..143, y 48..103: an arched frame, a plank door with iron bands and a ring."""
    im = Img(32, 56)
    for y in range(56):
        for x in range(32):
            cx = x - 15.5
            arch = y < 12 and cx * cx + (y - 12) ** 2 * 1.6 > 15.5 ** 2
            if arch: continue
            inner = y >= 4 and 3 <= x <= 28 and not (y < 15 and (cx * cx + (y - 15) ** 2 * 1.6 > 12.5 ** 2))
            if not inner: im.px[y][x] = closed.frame[1] if x < 16 else closed.frame[0]; continue
            plank = (x - 3) % 6
            c = closed.leaf[2] if plank == 0 else closed.leaf[0] if plank == 5 else closed.leaf[1]
            if y in (14, 15, 40, 41): c = closed.metal[0] if y % 2 else closed.metal[1]
            im.px[y][x] = c
    im.ring(22, 30, 2, 3, closed.metal[1]); im.pset(22, 27, closed.metal[0])
    for x in range(32): im.px[55][x] = closed.dark if im.px[55][x] else 0
    return im

def side_door():
    """The left wall's door in perspective, cut from the screen (x 16..47, y 40..127): its edges follow the wall."""
    im = Img(32, 88)
    x0, x1 = 18, 44
    for x in range(16, 48):
        if not x0 <= x <= x1: continue
        top, bot = side_top(x), side_bot(x)
        dt = top + 0.30 * (bot - top)
        for y in range(40, 128):
            if y < dt or y > bot - 1: continue
            t = (x - x0) / (x1 - x0)
            frame = x - x0 < 2 or x1 - x < 2 or y - dt < 2.5
            if frame: c = closed.frame[1] if x - x0 < 2 else closed.frame[0]
            else:
                plank = int(t * 5 * 4) % 4
                c = closed.leaf[2] if plank == 0 else closed.leaf[1]
                h = (y - dt) / (bot - dt)
                if abs(h - 0.22) < 0.02 or abs(h - 0.75) < 0.02: c = closed.metal[0]
                if abs(t - 0.75) < 0.06 and abs(h - 0.5) < 0.03: c = closed.metal[1]
            if y >= bot - 2: c = closed.dark
            im.px[y - 40][x - 16] = c
    return im

for name, img in (('door_back', back_door()), ('door_side', side_door())):
    w, h = img.w // 8, img.h // 8
    for j in range(h):
        for i in range(w):
            cell = img.crop(i * 8, j * 8, 8, 8)
            if not cell.is_empty(): art.tile('%s_%d_%d' % (name, i, j), cell, pal=closed)

# ======================================================================================================================
# The furniture (BG1): a 32 x 56 stamp for each kind, standing on the floor line either side of the back door.
# ======================================================================================================================
fur = art.palette(2, {'wood': ramp('7a4a26', 3), 'brass': ramp('c8a048', 2), 'cream': ramp('e0d0b0', 2),
                      'red': ramp('a03030', 2), 'green': ramp('3a7a3a', 2), 'steel': ramp('8a90a0', 2), 'black': '1a1014'})
W, H = 32, 56
def stamp(draw):
    im = Img(W, H); draw(im); return im

def coat_stand(im):   # Entrance Hall
    im.rect(15, 6, 2, 50, fur.wood[1]); im.rect(16, 6, 1, 50, fur.wood[2])
    for x, y in ((9, 8), (21, 8)): im.rect(x, y, 3, 2, fur.brass[1])
    im.rect(10, 52, 12, 3, fur.wood[0]); im.rect(12, 50, 8, 2, fur.wood[1])
    for y in range(4): im.rect(7 - (y > 0), 9 + y, 6 + 2 * (y > 0), 1, fur.black)   # a top hat on its peg
    im.rect(8, 5, 4, 4, fur.black); im.rect(8, 7, 4, 1, fur.red[0])
    for y in range(10, 34): im.rect(20 + (y - 10) // 8, y, 6 - (y - 10) // 8, 1, fur.green[0] if y % 4 else fur.green[1])   # a coat
    im.rect(4, 30, 2, 22, fur.black); im.ring(6, 30, 1, 2, fur.black)               # an umbrella
def bookcase(im):     # Library
    im.rect(1, 0, 30, 56, fur.wood[0]); im.rect(3, 2, 26, 52, fur.wood[1])
    for shelf in range(4):
        y = 3 + shelf * 13
        im.rect(3, y + 11, 26, 2, fur.wood[2])
        x = 4
        k = shelf * 7
        while x < 28:
            w = 2 + hsh(k) % 3; hgt = 8 + hsh(k + 3) % 3
            col = [fur.red[0], fur.green[0], fur.brass[0], fur.steel[0], fur.cream[0], fur.red[1]][hsh(k + 5) % 6]
            im.rect(x, y + 11 - hgt, min(w, 28 - x), hgt, col)
            x += w + (1 if hsh(k + 9) % 4 == 0 else 0); k += 1
def portrait(im):     # Gallery
    im.rect(0, 4, 32, 40, fur.brass[0]); im.rect(1, 5, 30, 38, fur.brass[1]); im.rect(4, 8, 24, 32, fur.black)
    im.rect(5, 9, 22, 30, fur.green[0])
    im.disc(16, 20, 6, fur.cream[1]); im.rect(9, 28, 14, 11, fur.red[0])             # an ancestor
    im.pset(14, 19, fur.black); im.pset(18, 19, fur.black)                           # eyes that follow you
    im.rect(12, 14, 8, 2, fur.steel[0])
    im.rect(14, 44, 4, 12, fur.wood[1])
def candelabra(im):   # Dining Room
    im.rect(2, 36, 28, 20, fur.wood[1]); im.rect(2, 36, 28, 2, fur.wood[2]); im.rect(4, 42, 24, 12, fur.wood[0])
    im.rect(14, 46, 4, 2, fur.brass[1])
    im.rect(15, 14, 2, 22, fur.brass[0]); im.rect(8, 22, 16, 2, fur.brass[1])
    for x in (8, 15, 22):
        im.rect(x, 12 if x == 15 else 16, 2, 8 if x == 15 else 6, fur.cream[1])
        im.pset(x, 10 if x == 15 else 14, fur.brass[1]); im.pset(x + 1, 9 if x == 15 else 13, fur.red[1])
def range_(im):       # Kitchen
    im.rect(1, 26, 30, 30, fur.black); im.rect(3, 34, 12, 12, fur.steel[0]); im.rect(17, 34, 12, 12, fur.steel[0])
    im.rect(1, 26, 30, 2, fur.steel[1]); im.rect(12, 6, 8, 20, fur.black)
    for k, x in enumerate((3, 12, 21)):                                               # copper pans on a rail
        im.disc(x + 4, 14 + k % 2 * 2, 4, fur.brass[0]); im.rect(x + 3, 4, 2, 6, fur.brass[0])
    im.rect(0, 4, 32, 1, fur.steel[1])
def fern(im):         # Conservatory
    im.rect(9, 40, 14, 16, fur.red[0]); im.rect(9, 40, 14, 2, fur.red[1])
    for k in range(9):
        a = -2.4 + k * 0.6
        for r in range(4, 26):
            x = 16 + int(r * math.cos(a)); y = 40 - int(r * math.sin(abs(a)) * 1.1) + (r * r) // 60
            if 0 <= x < 32 and 0 <= y < 40:
                im.pset(x, y, fur.green[1] if r % 3 else fur.green[0])
                if r % 3 == 0 and x + 1 < 32: im.pset(x + 1, y + 1, fur.green[0])
def harp(im):         # Music Room
    im.rect(4, 4, 4, 50, fur.brass[0]); im.rect(5, 4, 2, 50, fur.brass[1])
    for y in range(4, 16): im.rect(8, y, 18 - (y - 4) // 2, 2, fur.brass[0] if y % 3 else fur.brass[1])
    for x in range(10, 26, 3):
        top = 10 + (x - 10) // 3; im.rect(x, top, 1, 42 - top, fur.cream[1])
    for y in range(16, 54): im.pset(26 - (y - 16) // 8, y, fur.wood[1]); im.pset(27 - (y - 16) // 8, y, fur.wood[2])
    im.rect(2, 52, 28, 4, fur.wood[0])
def rocking_horse(im):  # Nursery
    for x in range(2, 30):
        y = 52 - int(4 * math.cos((x - 16) / 9.0))
        im.rect(x, y, 1, 3, fur.wood[1])
    for x in (8, 23): im.rect(x, 38, 2, 14, fur.wood[0])
    im.rect(6, 30, 20, 9, fur.cream[1]); im.rect(6, 30, 20, 2, fur.cream[0])        # the body
    im.rect(22, 18, 6, 14, fur.cream[1]); im.rect(24, 14, 7, 7, fur.cream[1])       # neck and head
    im.pset(28, 16, fur.black); im.rect(20, 16, 3, 14, fur.red[0])                  # eye, mane
    im.rect(12, 28, 7, 3, fur.red[1])                                               # saddle
    im.rect(2, 31, 4, 2, fur.red[0])                                                # tail
def armour(im):       # Armoury
    im.rect(10, 52, 12, 4, fur.wood[0])
    im.rect(12, 6, 8, 10, fur.steel[1]); im.rect(12, 10, 8, 1, fur.black); im.rect(15, 2, 2, 4, fur.red[1])   # helmet, plume
    im.rect(9, 16, 14, 16, fur.steel[0]); im.rect(10, 17, 6, 14, fur.steel[1])                                # breastplate
    im.rect(5, 17, 4, 16, fur.steel[0]); im.rect(23, 17, 4, 16, fur.steel[0])                                 # arms
    im.rect(11, 32, 4, 20, fur.steel[0]); im.rect(17, 32, 4, 20, fur.steel[1])                                # legs
    im.rect(27, 2, 2, 50, fur.wood[1]); im.rect(26, 0, 4, 5, fur.steel[1])                                    # a halberd
def grandfather_clock(im):   # Clock Room
    im.rect(6, 2, 20, 54, fur.wood[0]); im.rect(8, 4, 16, 50, fur.wood[1])
    im.disc(16, 13, 7, fur.cream[1]); im.ring(16, 13, 6, 7, fur.brass[1])
    im.line(16, 13, 16, 8, fur.black); im.line(16, 13, 20, 14, fur.black)
    im.rect(12, 24, 8, 26, fur.black); im.line(16, 24, 16, 42, fur.brass[0]); im.disc(16, 43, 3, fur.brass[1])   # the pendulum
    im.rect(4, 0, 24, 3, fur.wood[2])
STAMPS = [coat_stand, bookcase, portrait, candelabra, range_, fern, harp, rocking_horse, armour, grandfather_clock]
for k, draw in enumerate(STAMPS):
    img = stamp(draw)
    for j in range(H // 8):
        for i in range(W // 8):
            cell = img.crop(i * 8, j * 8, 8, 8)
            if not cell.is_empty(): art.tile('fur%d_%d_%d' % (k, i, j), cell, pal=fur)

# ======================================================================================================================
# The sprites.
# ======================================================================================================================
gold = art.sprite_palette(0, {'gold': ramp('e8b030', 3), 'brass': ramp('a07a30', 2), 'flame': ramp('f08020', 3),
                              'white': 'fff8e0', 'dark': '2a1a10', 'steel': ramp('8a8a98', 2)})
# The gold arrow over the chosen door (16 px, pointing down; code.js flips it to point up for the door behind you).
arrow = Img(16, 16)
for y in range(10):
    w = 7 - abs(y - 5) if y > 4 else 2
    for x in range(8 - (w if y > 4 else 1), 8 + (w if y > 4 else 1)): arrow.pset(x, y + 3, gold.gold[2] if x < 8 else gold.gold[1])
arrow = arrow.outline(gold.dark)
art.sprite('arrow', arrow, pal=gold, region='spr')
# The padlock on a locked door.
lock = Img(16, 16)
lock.ring(8, 6, 3, 4, gold.steel[1]); lock.rect(3, 7, 10, 8, gold.gold[1]); lock.rect(3, 7, 10, 2, gold.gold[2])
lock.rect(7, 10, 2, 3, gold.dark)
art.sprite('padlock', lock.outline(gold.dark), pal=gold, region='spr')
# The candle: its brass holder (the wax is drawn by code.js, as tall as the notches left) and a flickering flame.
holder = Img(16, 16)
holder.rect(1, 8, 14, 3, gold.brass[1]); holder.rect(3, 11, 10, 2, gold.brass[0]); holder.rect(5, 6, 6, 2, gold.brass[0])
holder.ring(14, 10, 1, 2, gold.brass[0])
art.sprite('holder', holder.outline(gold.dark), pal=gold, region='spr')
for f in range(2):
    fl = Img(8, 8)
    for y in range(8):
        w = [0, 1, 1, 2, 2, 2, 2, 1][y] if f == 0 else [1, 1, 2, 2, 2, 2, 1, 0][y]
        for x in range(4 - w, 4 + w): fl.pset(x + (f if y < 3 else 0), y, gold.white if y > 4 and abs(x - 3.5) < 1 else gold.flame[2] if y > 2 else gold.flame[1])
    art.sprite('flame%d' % f, fl, pal=gold, region='spr')
key = Img(8, 8)
key.ring(2, 3, 1, 2, gold.gold[2]); key.rect(4, 3, 4, 1, gold.gold[1]); key.pset(6, 4, gold.gold[1]); key.pset(7, 4, gold.gold[1])
art.sprite('key', key, pal=gold, region='spr')

# The ghost: a friendly sheet of light, see-through (sprite palette 5 is blended at half); two frames of its wavy hem.
ghostpal = art.sprite_palette(5, {'body': ramp('c8e0f0', 3), 'eye': '1a1a3a', 'cheek': 'e8a0b0'})
def ghost(f):
    im = Img(32, 64)
    for y in range(64):
        for x in range(32):
            cx = x - 15.5
            if y < 16: inside = cx * cx + (y - 16) ** 2 < 14 ** 2
            elif y < 52: inside = abs(cx) < 14 - (y - 16) * 0.05 + (2 if 30 < y < 44 and abs(cx) > 11 else 0) * 0
            else: inside = abs(cx) < 13 and y < 52 + 4 + 3 * math.sin((x + f * 4) / 3.2)
            if inside:
                c = ghostpal.body[2] if cx < -4 else ghostpal.body[1] if cx < 7 else ghostpal.body[0]
                im.pset(x, y, c)
    for ex in (11, 20):   # eyes and cheeks
        im.rect(ex, 14, 2, 4, ghostpal.eye)
        im.rect(ex - 1, 20, 3, 1, ghostpal.cheek)
    im.rect(14, 23, 4, 2, ghostpal.eye)   # a small "oo"
    for x, y in ((3, 30), (28, 30)):      # arms held out, holding a letter
        im.rect(x - 2, y, 4, 6, ghostpal.body[1])
    return im
for f in range(2):
    g = ghost(f)
    art.sprite('ghost_top%d' % f, g.crop(0, 0, 32, 32), pal=ghostpal, region='spr')
    art.sprite('ghost_bot%d' % f, g.crop(0, 32, 32, 32), pal=ghostpal, region='spr')

# Each ghost's hat or prop (16 px, solid colours, drawn over the ghost's head): in the order of KINDS.
props = art.sprite_palette(1, {'black': '1a1014', 'white': 'f4f0e8', 'gold': ramp('e8b030', 2), 'red': ramp('b03030', 2),
                               'straw': ramp('d8b060', 2), 'steel': ramp('9098a8', 2), 'brown': '6a4024', 'blue': '3a5aa0',
                               'pink': 'e890b0', 'green': '3a8a3a'})
def prop(draw):
    im = Img(16, 16); draw(im); return im
PROPS = [
    lambda im: (im.rect(4, 2, 8, 10, props.black), im.rect(1, 11, 14, 2, props.black), im.rect(4, 9, 8, 1, props.red[0])),  # the Butler: a top hat
    lambda im: (im.ring(4, 9, 2, 3, props.gold[1]), im.ring(11, 9, 2, 3, props.gold[1]), im.rect(7, 9, 2, 1, props.gold[1])),  # the Librarian: spectacles
    lambda im: (im.disc(8, 10, 6, props.red[0]), im.rect(2, 11, 12, 2, props.red[1]), im.rect(7, 3, 2, 2, props.red[0])),  # the Painter: a beret
    lambda im: (im.rect(3, 10, 10, 3, props.gold[1]), [im.rect(x, 6 + abs(x - 7) // 2, 2, 4, props.gold[0]) for x in (3, 7, 11)], im.pset(8, 7, props.pink)),  # the Duchess: a tiara
    lambda im: (im.rect(4, 8, 8, 6, props.white), im.disc(5, 6, 3, props.white), im.disc(11, 6, 3, props.white), im.disc(8, 4, 3, props.white)),  # the Cook: a chef's hat
    lambda im: (im.rect(0, 11, 16, 2, props.straw[0]), im.rect(4, 6, 8, 5, props.straw[1]), im.rect(4, 9, 8, 1, props.green)),  # the Gardener: a straw hat
    lambda im: (im.disc(4, 9, 4, props.white), im.disc(12, 9, 4, props.white), im.disc(8, 6, 4, props.white), im.rect(6, 12, 4, 1, props.blue)),  # the Organist: a powdered wig
    lambda im: (im.disc(4, 10, 3, props.pink), im.disc(12, 10, 3, props.pink), im.rect(6, 9, 4, 2, props.pink)),  # the Twins: a big bow
    lambda im: (im.rect(3, 6, 10, 9, props.steel[0]), im.rect(3, 10, 10, 1, props.black), im.rect(7, 1, 2, 5, props.red[1])),  # the Knight: a helmet
    lambda im: (im.rect(2, 9, 12, 4, props.gold[1]), [im.rect(x, 5, 2, 4, props.gold[0]) for x in (2, 7, 12)], im.pset(8, 10, props.red[1]), im.pset(4, 10, props.blue)),  # Lady Riddlewick: a crown
]
for k, draw in enumerate(PROPS):
    art.sprite('prop%d' % k, prop(draw).outline(props.black) if k != 1 else prop(draw), pal=props, region='spr')

# ======================================================================================================================
# The title (BG2 on the title, the new game and the records): Riddlewick Manor at night, on its hill, the moon behind.
# ======================================================================================================================
night = art.palette(7, {'stone': ramp('3a3048', 3), 'roof': ramp('201828', 2), 'window': ramp('f0b040', 2),
                        'moon': ramp('e8e4c8', 2), 'hill': ramp('1a2420', 2), 'tree': '0e1410', 'gold': ramp('e8b030', 3)})
art.gradient('night', ['06040e', '1a1238', '3a2a5a', '5a3a5a'], y0=0, y1=223)
def title_px(x, y):
    # the moon
    if (x - 196) ** 2 + (y - 40) ** 2 < 15 ** 2: return night.moon[1] if (x - 191) ** 2 + (y - 36) ** 2 > 8 or (x + y) % 7 else night.moon[0]
    hill = 176 - 10 * math.cos((x - 128) / 70.0)
    if y > hill: return night.hill[1] if y < hill + 2 else night.hill[0]
    # trees at the edges
    for tx, th in ((14, 70), (36, 52), (232, 66), (214, 48)):
        if abs(x - tx) < (y - (hill - th)) * 0.32 and y > hill - th: return night.tree
    # the manor: a central block with a tower, two wings
    blocks = [(64, 120, 192, 176, 'main'), (40, 136, 72, 176, 'wing'), (184, 136, 216, 176, 'wing'), (112, 72, 144, 120, 'tower')]   # on the tile grid
    for x0, y0, x1, y1, part in blocks:
        if x0 <= x < x1 and y0 <= y < y1:
            wx, wy = (x - x0) % 16, (y - y0) % 16
            lit = hsh((x - x0) // 16 * 7 + (y - y0) // 16 * 13 + x0) % 3 != 0
            if 5 <= wx <= 10 and 4 <= wy <= 12 and y < y1 - 4:
                return (night.window[1] if wy > 5 else night.window[0]) if lit else night.roof[0]
            if y % 8 == 7: return night.roof[1]                                           # the mortar between courses
            return night.stone[1] if x < 128 else night.stone[0]                            # lit by the moon on the left
    # roofs: a pointed one on the tower, sloped ones on the main block and wings
    if 108 <= x < 148 and 40 <= y < 72 and abs(x - 128) < (y - 40) * 0.65: return night.roof[1] if x < 128 else night.roof[0]
    if 60 <= x < 196 and 106 <= y < 120 and abs(x - 128) < 68 - (120 - y): return night.roof[0]
    for x0, x1 in ((38, 74), (182, 218)):
        if x0 <= x < x1 and 126 <= y < 136 and abs(x - (x0 + x1) / 2) < 18 - (136 - y) * 1.2: return night.roof[0]
    return 0
title = Img.make(256, 224, title_px)
logo1 = big_text('RIDDLEWICK', night.gold, scale=2, outline=night.roof[0])
logo2 = big_text('MANOR', night.gold, scale=2, outline=night.roof[0])
title.blit(logo1, 128 - logo1.w // 2, 8); title.blit(logo2, 128 - logo2.w // 2, 30)
for k in range(40):   # stars
    sx, sy = hsh(k * 31 + 7) % 256, 50 + hsh(k * 17 + 3) % 70
    if title.px[sy][sx] == 0: title.px[sy][sx] = night.moon[0]
art.scene('title', title, pal=night, at=(32, 0))

art.write(sys.argv[1])

# Each kind's palette 1, for code.js to load when you walk into a room of that kind: 15 colours (entries 1 to 15 of the
# palette) as little-endian RGB555, a kind after another.
def rgb555(h):
    r, g, b = (int(h[i:i + 2], 16) >> 3 for i in (0, 2, 4))
    return r | g << 5 | b << 10
data = bytearray()
for colours in KIND_COLOURS:
    probe = Art(); pal = probe.palette(1, colours)
    by_index = {i: probe.cgram[16 + i] for i in range(1, 16) if 16 + i in probe.cgram}
    for i in range(1, 16):
        v = rgb555(by_index.get(i, '000000').lstrip('#'))
        data += bytes([v & 255, v >> 8])
os.makedirs(os.path.join(sys.argv[1], 'rom'), exist_ok=True)
open(os.path.join(sys.argv[1], 'rom', 'rooms.bin'), 'wb').write(bytes(data))
