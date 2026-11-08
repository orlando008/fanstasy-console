# Royal Chess's art: carts/src/royal-chess/tiles.txt, palette.txt, map.txt and art.json, and the ART block in code.js.
#   python3 carts/src/royal-chess/art.py carts/src/royal-chess
# Written with the art toolkit (tools/devkit/art/kit.py: its header explains the pieces). This cart owns those files:
# change the pictures here, not in them. Look at the result with
#   node tools/devkit/art/sprites.mjs carts/royal-chess.nova out.png
#   node tools/devkit/shots.mjs carts/royal-chess.nova out/ --at 60 --extra "skipTitle = true;"
#
# The palace study (spec 12): an inlaid board of maple and walnut on red velvet, carved ivory and ebony pieces seen a
# little from the front so each is known by its shape. The layers:
#   BG2  the squares, 3 x 3 tiles each, lined up with the board (code.js scrolls the layer), so a square's highlight is
#        a palette of its own: palette 2 the woods, 5 the last move's tint, 6 the king in check's;
#   BG1  the table round the board: velvet with a gold thread, the board's frame with a brass inlay, and two wooden trays
#        for the pieces taken (a picture of the whole screen, see-through over the board);
#   BG0  the pieces, 3 x 3 tiles each, written by code.js square by square: palette 3 ivory, 4 ebony (the same roles,
#        so one set of tiles makes both armies);
#   sprites  the piece held (32 px, palettes 0 ivory and 1 ebony) and its shadow (palette 7, see-through), and small
#        pieces (8 px) for the trays.
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../../tools/devkit/art'))
from kit import *

art = Art()
art.region('bg', 1, 383)
art.region('spr', 384, 1023)
art.backdrop('2a0c14')

# The overlay's own colours, in a sprite palette's entries no sprite uses (CGRAM 160 to 169: sprite palette 2; under 192,
# so they are never blended).
for i, (hexc, name) in enumerate([
        ('e8d0a4', 'LIGHT'), ('a8724a', 'DARK'), ('f8f0e0', 'IVORY'), ('2c2028', 'EBONY'), ('6a4a30', 'FRAME'),
        ('f0c040', 'CURSOR'), ('58a050', 'MOVE'), ('d84040', 'CHECK'), ('c8b060', 'LAST'), ('141c3c', 'GLASS')]):
    art.color(160 + i, hexc, name)

# --- The squares (BG2): maple and walnut, with grain; two of each, so the board is not all one pattern ---
WOODS = {'maple': ['c89c64', 'e0bc84', 'f0d4a0'], 'walnut': ['5a341e', '7a4a2a', '94603a']}
sq = art.palette(2, WOODS)
art.palette(5, {k: [mix(c, 'f0d040', 0.45) for c in v] for k, v in WOODS.items()})   # the last move: a gold tint
art.palette(6, {k: [mix(c, 'e02020', 0.55) for c in v] for k, v in WOODS.items()})   # the king in check: red
import math
def square(rmp, v, across):
    """A square of inlaid wood: grain in long, gently waving streaks (along the rank for maple, along the file for
    walnut, as an inlayer lays them), and a bevel: lit on its upper left edges, in shadow on its lower right."""
    def px(x, y):
        if x == 0 or y == 0: return rmp[2]
        if x == 23 or y == 23: return rmp[0]
        a, b = (x, y) if across else (y, x)                   # a: along the grain, b: across it
        u = b + 1.6 * math.sin((a + 9 * v) / 7.0) + 0.8 * math.sin((a * 0.45) + v * 2.0 + b * 0.3)
        band, f = int(u // 4), u / 4 - int(u // 4)
        h = hsh(band * 31 + v * 7 + (0 if across else 101)) % 6
        if f < 0.22 and h < 4: return rmp[0]                  # a dark line of grain
        if 0.5 < f < 0.66 and h == 5: return rmp[2]           # now and then a lighter one
        return rmp[1]
    return Img.make(24, 24, px)
for v in range(2):
    for name, rmp, across in (('L', sq.maple, True), ('D', sq.walnut, False)):
        img = square(rmp, v, across)
        for i in range(9): art.tile('sq%s%d_%d' % (name, v, i), img.crop((i % 3) * 8, (i // 3) * 8, 8, 8), pal=sq)

# --- The pieces (BG0 and sprites): silhouettes, 24 x 24, shaded as turned wood lit from the upper left ---
SHAPES = {
    'pawn': [
        '........................', '........................', '........................', '........................',
        '..........####..........', '.........######.........', '........########........', '........########........',
        '.........######.........', '..........####..........', '.........######.........', '..........####..........',
        '..........####..........', '.........######.........', '.........######.........', '........########........',
        '........########........', '.......##########.......', '......############......', '.....##############.....',
        '.....##############.....', '......############......', '........................', '........................'],
    'rook': [
        '........................', '........................', '......##..####..##......', '......##..####..##......',
        '......############......', '......############......', '.......##########.......', '........########........',
        '........########........', '........########........', '........########........', '........########........',
        '........########........', '........########........', '........########........', '.......##########.......',
        '......############......', '......############......', '.....##############.....', '....################....',
        '....################....', '.....##############.....', '........................', '........................'],
    'knight': [
        '........................', '..........#.............', '.........###............', '........######..........',
        '.......#########........', '......###########.......', '.....#############......', '....##############......',
        '...###############......', '...####...#######.......', '....##....#######.......', '.........########.......',
        '........#########.......', '.......#########........', '.......########.........', '.......#########........',
        '......###########.......', '......############......', '.....##############.....', '....################....',
        '....################....', '.....##############.....', '........................', '........................'],
    'bishop': [
        '........................', '...........##...........', '..........####..........', '..........####..........',
        '.........######.........', '........###..###........', '........###.####........', '.......####.####.......',
        '.......#########.......'.ljust(24, '.'), '........########........', '.........######.........', '..........####..........',
        '.........######.........', '..........####..........', '..........####..........', '.........######.........',
        '........########........', '.......##########.......', '......############......', '.....##############.....',
        '.....##############.....', '......############......', '........................', '........................'],
    'queen': [
        '........................', '...#......##......#.....'[:24], '...##.....##.....##.....', '...###...####...###.....',
        '....###.######.###......', '....##############......', '.....############.......', '......##########........',
        '.......########.........', '........######..........', '........######..........', '.........####...........',
        '.........####...........', '........######..........', '........######..........', '.......########.........',
        '......##########........', '.....############.......', '....##############......', '....##############......',
        '...################.....', '....##############......', '........................', '........................'],
    'king': [
        '...........##...........', '.........######.........', '...........##...........', '..........####..........',
        '........########........', '.......##########.......', '.......##########.......', '........########........',
        '.........######.........', '..........####..........', '..........####..........', '.........######.........',
        '..........####..........', '..........####..........', '.........######.........', '........########........',
        '.......##########.......', '......############......', '.....##############.....', '....################....',
        '....################....', '.....##############.....', '........................', '........................'],
}
# (the queen's crown is drawn off centre in the rows above; centre every row on the board's middle)
def centred(rows):
    out = []
    for r in rows:
        r = r[:24].ljust(24, '.')
        if '#' in r:
            a, b = r.index('#'), r.rindex('#')
            w = b - a + 1
            pad = (24 - w) // 2
            r = '.' * pad + r[a:b + 1] + '.' * (24 - w - pad)
        out.append(r)
    return out
SHAPES['queen'] = centred(SHAPES['queen'])
SHAPES['bishop'] = [r[:24].ljust(24, '.') for r in SHAPES['bishop']]

PIECE_ROLES = {'edge': '1a1418', 'body': None}
IVORY, EBONY = ['a89878', 'd0c4a4', 'eee4cc', 'fffaf0'], ['141018', '2a2430', '403a48', '6a6070']
iv = art.palette(3, {'edge': '3a2a20', 'body': IVORY})
art.palette(4, {'edge': 'b09060', 'body': EBONY})                  # ebony, outlined in a thin line of gold so it reads on walnut
ORDER = ['pawn', 'knight', 'bishop', 'rook', 'queen', 'king']   # code.js's PAWN .. KING, 1 to 6

def piece(name, pal):
    """The piece's picture: the silhouette shaded across its width (a turned shape lit from the upper left), the knight
    with an eye and a mane, and outlined."""
    rows = SHAPES[name]
    def px(x, y):
        if rows[y][x] != '#': return 0
        row = rows[y]; a, b = row.index('#'), row.rindex('#')
        t = (x - a) / max(1, b - a)                            # 0 at the left edge, 1 at the right
        k = 3 if t < 0.28 else 2 if t < 0.55 else 1 if t < 0.85 else 0
        if y >= 18: k = max(0, k - 1)                          # the base, in shadow
        if name == 'knight' and (x, y) in ((7, 7), (8, 7)): return pal.edge   # the eye
        return pal.body[k]
    return Img.make(24, 24, px).outline(pal.edge)

for name in ORDER:
    img = piece(name, iv)
    for i in range(9): art.tile('%s%d' % (name, i), img.crop((i % 3) * 8, (i // 3) * 8, 8, 8), pal=iv)

# Sprites: the piece held (32 px, in palette 0 ivory or 1 ebony) and its shadow; small pieces for the trays.
s_iv = art.sprite_palette(0, {'edge': '3a2a20', 'body': IVORY})
art.sprite_palette(1, {'edge': 'b09060', 'body': EBONY})
for name in ORDER:
    big = Img(32, 32); big.blit(piece(name, s_iv), 4, 2)
    art.sprite('held_' + name, big, pal=s_iv, region='spr')
    small = Img.make(8, 8, lambda x, y: 0)
    src = piece(name, s_iv)
    for y in range(8):
        for x in range(8):
            block = [src.px[min(23, y * 3 + j)][min(23, x * 3 + i)] for j in range(3) for i in range(3)]
            filled = [c for c in block if c]
            if len(filled) >= 4: small.px[y][x] = s_iv.body[2] if x < 4 else s_iv.body[1]
    art.sprite('mini_' + name, small.outline(s_iv.edge), pal=s_iv, region='spr')
sh = art.sprite_palette(7, {'shade': '000000', 'mark': '1a0c06'})
# The held piece's legal squares: a dot on an empty one and a ring round a piece it would take, dark and see-through
# (palette 7 is blended at half), like a mark pressed into the wood.
art.sprite('dot', Img.make(8, 8, lambda x, y: sh.mark if (x - 3.5) ** 2 + (y - 3.5) ** 2 <= 12.5 else 0), pal=sh, region='spr')
art.sprite('ring', Img.make(32, 32, lambda x, y: sh.mark if 8.5 ** 2 <= (x - 15.5) ** 2 + (y - 15.5) ** 2 <= 12 ** 2 else 0), pal=sh, region='spr')
art.sprite('shadow', Img.make(32, 32, lambda x, y: sh.shade if ((x - 15.5) / 11) ** 2 + ((y - 27) / 3.5) ** 2 <= 1 else 0), pal=sh, region='spr')

# --- The table round the board (BG1): velvet, a gold thread, the frame with its brass inlay, the trays ---
tb = art.palette(1, {'velvet': ['3c0a14', '5a1220', '74202c'], 'gold': ['a07828', 'e0b850'], 'frame': ['2c1a10', '4a2c18', '6a4428'],
                     'tray': ['3a2414', '583820'], 'brass': 'd8b060',
                     'felt': ['16301e', '1f3f28', '284c31']})
BX, BY, FW, SQ = 14, 11, 10, 24
def table(x, y):
    bx0, by0, bx1, by1 = BX, BY, BX + 8 * SQ, BY + 8 * SQ
    if bx0 <= x < bx1 and by0 <= y < by1: return 0                       # the board's squares show through (BG2)
    if bx0 - FW <= x < bx1 + FW and by0 - FW <= y < by1 + FW:           # the frame
        d = min(x - (bx0 - FW), (bx1 + FW - 1) - x, y - (by0 - FW), (by1 + FW - 1) - y)
        if d == 6: return tb.brass                                        # a brass line inlaid round the board
        if d == 0: return tb.frame[0]
        return tb.frame[2] if (x < bx0 or y < by0) and d < 4 else tb.frame[1]   # lit on the upper left
    if x >= 216 and (2 <= y < 107 or 110 <= y < 215):                    # the two trays: wood, lined with green baize
        top = 2 if y < 107 else 110
        bot = top + 104
        if x in (216, 255) or y in (top, bot): return tb.tray[0]
        if x in (217, 254) or y in (top + 1, bot - 1): return tb.tray[1]
        plate = (top + 2, top + 14) if top == 2 else (bot - 15, bot - 1)   # a wooden name plate (code.js writes the name on it)
        if plate[0] <= y < plate[1]: return tb.frame[2] if y == plate[0] else tb.tray[1]
        if y == (plate[1] if top == 2 else plate[0] - 1): return tb.tray[0]
        if x == 218 or y == (top + 15 if top == 2 else top + 2): return tb.felt[0]   # the baize's shadow under the rim
        n = hsh(x * 7 + y * 13) % 11
        return tb.felt[2] if n == 0 else tb.felt[0] if n == 1 else tb.felt[1]
    if (x + y) % 16 == 0 and (x - y) % 32 == 0: return tb.gold[1]       # a gold thread's diamonds in the velvet
    return tb.velvet[1] if (x * 7 + y * 3) % 5 else tb.velvet[0] if (x + y) % 2 else tb.velvet[2]
art.scene('table', Img.make(256, 224, table), pal=tb, at=(48, 0))

# --- The title (BG1 there): the same table with the name in big gold letters over the board's empty middle ---
lg = art.palette(7, {'gold': ramp('f0c850', 4), 'ink': '2a1408', 'drop': '1a0a04'})
l1 = big_text('ROYAL', lg.gold, scale=2, outline=lg.ink, shadow=lg.drop)
l2 = big_text('CHESS', lg.gold, scale=2, outline=lg.ink, shadow=lg.drop)
title = Img(256, 224)
title.blit(l1, BX + 96 - l1.w // 2, BY + 2 * SQ + 6); title.blit(l2, BX + 96 - l2.w // 2, BY + 2 * SQ + 26)
# A scene has one palette, so the title's map is the table (palette 1) with the logo's cells (palette 7) laid over the
# board's empty middle, where the table has none: 'logo' names the whole of it.
art.scene('title_table', Img.make(256, 224, table), pal=tb, at=(80, 0))
art.scene('logo', title, pal=lg, at=(80, 0))

art.write(sys.argv[1])
