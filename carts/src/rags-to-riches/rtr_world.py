# Rags to Riches: the backdrops, drawn in code (BG scenes). Imported by art.py.
# Every scene is built from 8 x 8 cells, mostly flat bands and repeated modules, so that it costs few tiles
# (the kit stores identical and flipped tiles once). Look at them with
#   node tools/devkit/art/scene.mjs carts/rags-to-riches.nova out.png --scene hub0
from kit import *

W, H = 256, 224

# Sky bands by cell row (the hub, the title): 4 bands of the night sky, darkest on top.
def sky_band(P, cy):
    return P.s0 if cy < 4 else P.s1 if cy < 8 else P.s2 if cy < 12 else P.s3


def star_cell(P, band, v):
    spots = ((2, 2), (5, 4), (3, 6))
    return Img.make(8, 8, lambda x, y: P.star if (x, y) == spots[v] else band)


def flat(c):
    return Img.make(8, 8, lambda x, y: c)


def sky(P, rows=19, stars_to=14):
    """The night sky as a picture of `rows` cell rows: flat bands and star cells at fixed spots."""
    im = Img(W, H)
    for cy in range(rows):
        band = sky_band(P, cy)
        for cx in range(32):
            k = hsh(cx * 13 + cy * 7) % 9
            im.blit(star_cell(P, band, k) if (k < 3 and cy < stars_to) else flat(band), cx * 8, cy * 8)
    return im


def ground_and_road(P, im, hill_rows=(20, 22)):
    """The ground under the skyline (rows 20 and 21) and the road below it, with its dashes."""
    for cy in range(hill_rows[0], hill_rows[1]):
        for cx in range(32): im.blit(flat(P.ground), cx * 8, cy * 8)
    for cy in range(hill_rows[1], 28):
        for cx in range(32):
            dash = cy == 25 and cx % 4 < 2
            im.blit(Img.make(8, 8, lambda x, y, d=dash: P.dash if (d and 3 <= y <= 4) else P.road), cx * 8, cy * 8)
    return im


# --------------------------------------------------------------- the five skylines, drawn on a 256 x 88 strip (cell rows 13 to 23)
# The strip's last 16 rows (y 72 to 87) are the ground; buildings stand on y = 72 (the base). Windows are on a 4 px grid so that
# the cells repeat. `far` is the lighter row of buildings behind.

def windows(im, x, y, w, h, c, step=4, lit=None):
    """A grid of 2 x 2 windows every `step` pixels inside a building at (x, y, w, h); `lit` picks which are lit (a hash)."""
    for j in range(2, h - 2, step):
        for i in range(2, w - 2, step):
            if lit is None or lit(x + i, y + j): im.rect(x + i, y + j, 2, 2, c)


def city_rustport(P):
    im = Img(W, 88)
    for x in range(0, 256, 16): im.rect(x, 52 + (hsh(x) % 3) * 4, 14, 24, P.far)                       # far: stacked containers
    for (x, w, h) in ((0, 40, 24), (48, 32, 32), (88, 48, 24), (176, 40, 32), (224, 32, 24)):          # warehouses with sawtooth roofs
        im.rect(x, 72 - h, w, h + 16, P.bld)
        for k in range(0, w, 8): im.poly([(x + k, 72 - h), (x + k + 8, 72 - h), (x + k + 8, 72 - h - 6)], P.bld)
        windows(im, x, 72 - h, w, h, P.lit, lit=lambda a, b: hsh(a * 7 + b) % 3 == 0)
    for x in (144, 208):                                                                                # two harbour cranes
        im.rect(x, 16, 4, 60, P.bld); im.rect(x - 24, 16, 40, 4, P.bld); im.line(x + 2, 17, x - 20, 30, P.bld); im.rect(x - 22, 20, 2, 18, P.bld); im.rect(x - 24, 38, 6, 4, P.roof)
    im.rect(132, 20, 8, 56, P.bld); im.rect(131, 18, 10, 3, P.bld)                                      # a smokestack
    return im


def city_sunvale(P):
    im = Img(W, 88)
    im.disc(200, 74, 22, P.roof); im.disc(200, 74, 22, P.roof)                                          # a big low sun, half set
    for (x, w, h) in ((0, 32, 16), (40, 24, 24), (72, 32, 16), (112, 24, 32), (144, 32, 16), (216, 32, 24)):   # adobe blocks
        im.rect(x, 72 - h, w, h + 16, P.bld); im.rect(x - 1, 72 - h - 2, w + 2, 2, P.bld)
        if hsh(x) % 2: im.rect(x + 4, 72 - h + 4, 4, 6, P.lit)
        windows(im, x, 72 - h, w, h, P.lit, step=8, lit=lambda a, b: hsh(a + b * 5) % 2 == 0)
    for x in (80, 168):                                                                                  # a round tower with a dome
        im.rect(x, 40, 16, 40, P.bld); im.disc(x + 8, 40, 8, P.bld); im.rect(x + 7, 24, 2, 8, P.bld)
        im.rect(x + 6, 52, 4, 5, P.lit)
    for x in (24, 104, 136, 200):                                                                        # cacti
        im.rect(x, 56, 3, 20, P.bld); im.rect(x - 4, 62, 4, 2, P.bld); im.rect(x - 4, 58, 2, 6, P.bld); im.rect(x + 3, 66, 4, 2, P.bld); im.rect(x + 5, 60, 2, 8, P.bld)
    return im


def city_cedar(P):
    im = Img(W, 88)
    for x in range(0, 256, 8): im.poly([(x, 72), (x + 4, 36 + (hsh(x) % 3) * 4), (x + 8, 72)], P.far)  # far: a ridge of pines
    for (x, w, h) in ((8, 32, 16), (56, 40, 16), (112, 32, 24), (176, 40, 16), (224, 24, 16)):          # log halls with pitched roofs
        im.rect(x, 72 - h, w, h + 16, P.bld); im.poly([(x - 2, 72 - h), (x + w // 2, 72 - h - 12), (x + w + 2, 72 - h)], P.bld)
        for j in range(4, h, 4): im.rect(x, 72 - h + j, w, 1, P.far)
        im.rect(x + w // 2 - 3, 72 - 10, 6, 10, P.lit)
        windows(im, x + 4, 72 - h + 2, w - 8, h - 6, P.lit, step=8, lit=lambda a, b: hsh(a * 3 + b) % 2 == 0)
    for x in (44, 100, 156, 212):                                                                         # tall pines
        for k in range(4): im.poly([(x - 8 + k, 52 + k * 8), (x, 28 + k * 8), (x + 8 - k, 52 + k * 8)], P.bld)
        im.rect(x - 1, 72, 2, 6, P.bld)
    im.rect(140, 20, 8, 52, P.bld); im.poly([(138, 22), (144, 8), (150, 22)], P.bld); im.rect(142, 26, 4, 6, P.lit); im.pset(144, 4, P.roof)   # the bell tower
    return im


def city_metro(P):
    im = Img(W, 88)
    for x in range(4, 256, 20): im.rect(x, 32 + (hsh(x * 3) % 5) * 4, 14, 60, P.far)                    # far towers
    towers = ((0, 24, 48), (24, 16, 32), (40, 24, 64), (64, 16, 40), (80, 24, 56), (104, 16, 72), (120, 24, 40), (144, 16, 60), (160, 24, 48), (184, 16, 68), (200, 24, 36), (224, 24, 52))
    for (x, w, h) in towers:
        im.rect(x, 72 - h, w, h + 16, P.bld)
        windows(im, x, 72 - h, w, h, P.lit, lit=lambda a, b: hsh(a * 5 + b * 11) % 3 != 0)
        if hsh(x) % 2: im.rect(x + w // 2 - 1, 72 - h - 8, 2, 8, P.bld)
        else: im.rect(x + 2, 72 - h - 3, w - 4, 3, P.bld)
    im.rect(111, 0, 2, 4, P.roof)                                                                        # a red-lit antenna
    return im


def city_coastline(P):
    im = Img(W, 88)
    for x in range(0, 256, 24): im.rect(x, 44 + (hsh(x) % 3) * 8, 16, 32, P.far)                         # far: a row of low hotels
    for (x, w, h) in ((100, 24, 24), (130, 20, 32), (156, 24, 20), (190, 24, 28), (220, 28, 20)):       # hotels with neon roofs
        im.rect(x, 72 - h, w, h + 16, P.bld); im.rect(x, 72 - h - 2, w, 2, P.roof)
        windows(im, x, 72 - h, w, h, P.lit, lit=lambda a, b: hsh(a * 9 + b) % 3 != 0)
    for x in (8, 36, 92, 180, 212):                                                                       # palms
        im.line(x, 76, x + 2, 48, P.bld); im.line(x + 1, 76, x + 3, 48, P.bld)
        for (dx, dy) in ((-9, 4), (-5, -2), (9, 4), (5, -2), (0, -4)): im.line(x + 2, 48, x + 2 + dx, 48 + dy, P.bld); im.line(x + 2, 49, x + 2 + dx, 49 + dy + 1, P.bld)
    return im


CITY_DRAW = (city_rustport, city_sunvale, city_cedar, city_metro, city_coastline)


def hub_scene(P, i):
    """The hub, the venues and the setup: the night sky, the city's skyline on its ground, and the road."""
    im = sky(P, rows=20)
    im.blit(CITY_DRAW[i](P), 0, 88)                                  # the strip's y 72 lands on y 160: the skyline's base
    im.rect(0, 160, W, 16, P.ground)                                 # the ground (the sea, in Coastline), over the buildings' feet
    if i == 4:
        for x in range(0, 256, 8):
            if (x // 8) % 3 == 0: im.rect(x + 2, 166, 4, 1, P.lit)
    elif i == 0:
        for x in range(0, 256, 16): im.rect(x, 168, 8, 1, P.far)     # the rails
    for cy in range(22, 28):
        for cx in range(32):
            dash = cy == 25 and cx % 4 < 2
            im.blit(Img.make(8, 8, lambda x, y, d=dash: P.dash if (d and 3 <= y <= 4) else P.road), cx * 8, cy * 8)
    return im


def big_text(im, string, x, y, scale, c, shadow=None, edge=None, ragged=False):
    """The console font scaled up by an integer: letters with an outline and a drop shadow, optionally torn (holes)."""
    small = Img(8 * len(string), 8); small.text(string, 0, 0, 1)
    big = Img(small.w * scale, small.h * scale)
    for j in range(small.h):
        for i in range(small.w):
            if small.px[j][i]: big.rect(i * scale, j * scale, scale, scale, c)
    if ragged:                                                       # tear a few notches out of the edges
        for j in range(big.h):
            for i in range(big.w):
                if big.px[j][i] and hsh(i * 17 + j * 29 + x) % 23 == 0 and (big.get(i - 1, j) == 0 or big.get(i + 1, j) == 0 or big.get(i, j - 1) == 0 or big.get(i, j + 1) == 0): big.px[j][i] = 0
    out = Img(im.w, im.h)
    if shadow is not None:
        sh = Img(big.w, big.h)
        for j in range(big.h):
            for i in range(big.w):
                if big.px[j][i]: sh.px[j][i] = shadow
        out.blit(sh, x + scale, y + scale)
    out.blit(big, x, y)
    if edge is not None: out.outline(edge)
    im.blit(out, 0, 0)
    return big.w


def title_scene(P):
    im = sky(P, rows=20)
    im.blit(city_metro(P), 0, 88)
    im.rect(0, 160, W, 16, P.ground)
    for cy in range(22, 28):
        for cx in range(32):
            dash = cy == 25 and cx % 4 < 2
            im.blit(Img.make(8, 8, lambda x, y, d=dash: P.dash if (d and 3 <= y <= 4) else P.road), cx * 8, cy * 8)
    # the name: RAGS (torn, grey) TO (small, gold) over RICHES (big, gold with a shadow and sparkles)
    big_text(im, 'RAGS', 48, 20, 3, P.rag, shadow=P.s0, edge=P.s0, ragged=True)
    big_text(im, 'TO', 152, 26, 2, P.gold, shadow=P.s0, edge=P.s0)
    big_text(im, 'RICHES', 56, 52, 3, P.gold, shadow=P.goldd, edge=P.s0)
    for (x, y) in ((44, 50), (210, 56), (124, 44), (226, 84)):
        im.rect(x - 3, y, 7, 1, P.star); im.rect(x, y - 3, 1, 7, P.star); im.pset(x, y, P.star)
    return im


def ledger_scene(P):
    """The result screens' backdrop: a dark ledger page with a double rule round it and a gold stud in each corner."""
    im = Img.make(W, H, lambda x, y: P.s2 if dither(x, y, 2) else P.s1)
    im.rect(4, 4, W - 8, H - 8, P.far, fill=False); im.rect(6, 6, W - 12, H - 12, P.far, fill=False)
    for (x, y) in ((8, 8), (W - 11, 8), (8, H - 11), (W - 11, H - 11)): im.rect(x, y, 3, 3, P.gold)
    return im


# --------------------------------------------------------------- the map (palette 2): a continent of cells, five cities (the road is drawn by code)
CITY_POS = [(40, 50), (66, 90), (128, 38), (176, 68), (212, 94)]       # where the cities are; code.js reads these (ART.cityPos)
LAND = {3: [(3, 29)], 4: [(2, 30)], 5: [(1, 30)], 6: [(1, 31)], 7: [(1, 31)], 8: [(2, 30)], 9: [(2, 31)], 10: [(3, 30)], 11: [(3, 27), (29, 30)], 12: [(5, 23), (29, 29)], 13: [(10, 19), (29, 29)]}
TERRAIN = {'M': [(2, 7), (3, 7), (2, 8), (3, 9), (17, 7), (18, 7), (17, 8), (29, 8)], 'F': [(18, 5), (19, 5), (12, 6), (13, 6), (25, 4), (26, 4), (26, 5), (23, 9), (24, 9), (7, 4)],
           'D': [(9, 10), (10, 10), (11, 10), (12, 10), (10, 11), (11, 11), (7, 11), (8, 11)]}


def map_scene(P):
    land = {(cx, cy) for cy, spans in LAND.items() for (a, b) in spans for cx in range(a, b + 1)}
    kind = {c: t for t, cells in TERRAIN.items() for c in cells}
    im = Img.make(W, H, lambda x, y: P.oceand if dither(x, y, 3) else P.ocean)
    for cy in range(28):                                              # wave marks on the open sea (whole cells, so they repeat)
        for cx in range(32):
            if (cx, cy) not in land and hsh(cx * 31 + cy * 17) % 9 == 0 and not any((cx + dx, cy + dy) in land for dx in (-1, 0, 1) for dy in (-1, 0, 1)):
                im.rect(cx * 8 + 1, cy * 8 + 3, 3, 1, P.oceanl); im.rect(cx * 8 + 4, cy * 8 + 4, 3, 1, P.oceanl)
    for (cx, cy) in land:
        x0, y0, t = cx * 8, cy * 8, kind.get((cx, cy), '')
        v = hsh(cx * 5 + cy * 11) % 3
        cell = Img.make(8, 8, lambda x, y: P.landd if (x, y) in ((2 + v, 2), (5, 5 - v), (1, 6)) else P.land)
        if t == 'M':
            cell.poly([(0, 8), (3, 1), (6, 8)], P.mount); cell.poly([(3, 8), (6, 3), (8, 8)], P.mount); cell.poly([(2, 3), (3, 1), (4, 3)], P.mountl); cell.pset(6, 3, P.mountl)
        elif t == 'F':
            for (tx, ty) in ((1, 2), (5, 1), (3, 5)): cell.rect(tx, ty, 3, 3, P.forest); cell.pset(tx + 1, ty + 3, P.mortar if False else P.landd)
        elif t == 'D':
            cell = Img.make(8, 8, lambda x, y: P.sand if (x + y + v) % 7 else P.land)
        for (dx, dy, xs, ys) in ((0, -1, range(8), (0,)), (0, 1, range(8), (7,)), (-1, 0, (0,), range(8)), (1, 0, (7,), range(8))):       # the beach, on each side that meets the sea
            if (cx + dx, cy + dy) not in land:
                for yy in ys:
                    for xx in xs: cell.pset(xx, yy, P.sand)
        im.blit(cell, x0, y0)
    return im


# --------------------------------------------------------------- the stages (palettes 3, 4, 5): backdrop, band floor, audience floor
STAGE_FLOOR = 104          # where the stage's front edge is; the audience floor starts at 120


def brick_cell(P, ci):
    return Img.make(8, 8, lambda x, y: P.mortar if (y % 4 == 3 or (x + (4 if (y // 4) % 2 else 0)) % 8 == 7) else (P.wall if hsh((x // 4) * 3 + (y // 4) * 7 + ci) % 5 else P.walld))


def plank_cell(c1, c2):
    return Img.make(8, 8, lambda x, y: c2 if y % 4 == 3 else c1)


def stage_bar(P):
    im = Img(W, H)
    for cy in range(13):
        for cx in range(32): im.blit(brick_cell(P, 0 if cy % 2 else 1), cx * 8, cy * 8)
    for cy in range(13, 15):
        for cx in range(32): im.blit(plank_cell(P.stage, P.woodd), cx * 8, cy * 8)
    for cy in range(15, 28):
        for cx in range(32): im.blit(plank_cell(P.floor, P.floorl), cx * 8, cy * 8)
    # the glow of the neon, then the neon: LIVE and BAND
    for (word, x, y, c) in (('LIVE', 18, 14, P.neonp), ('BAND', 170, 20, P.neonb)):
        big_text(im, word, x, y, 2, c, edge=P.black)
    im.rect(104, 22, 48, 28, P.black); im.rect(106, 24, 44, 24, P.wood)                                     # a framed poster over the stage
    im.disc(128, 36, 9, P.sign); im.disc(128, 36, 5, P.neonp); im.disc(128, 36, 2, P.sign)               # a dartboard
    im.rect(0, 96, W, 8, P.woodd); im.rect(0, 96, W, 1, P.wood)                                              # the stage's back edge
    im.rect(0, STAGE_FLOOR, W, 1, P.black); im.rect(0, STAGE_FLOOR + 1, W, 1, P.woodd)
    return im


def stage_theatre(P):
    im = Img(W, H)
    for cy in range(13):
        for cx in range(32): im.blit(Img.make(8, 8, lambda x, y: P.wall if (x + y) % 8 else P.walld), cx * 8, cy * 8)
    for cy in range(13, 15):
        for cx in range(32): im.blit(plank_cell(P.stage, P.stagel), cx * 8, cy * 8)
    for cy in range(15, 28):
        for cx in range(32): im.blit(plank_cell(P.floor, P.floorl), cx * 8, cy * 8)
    # two beams of spotlight (a dither over the wall), the curtains, the gold arch
    beam = Img(W, H)
    for (xa, xb, xc, xd) in ((92, 106, 130, 70), (150, 164, 186, 130)):
        beam.poly([(xa, 12), (xb, 12), (xc, 100), (xd, 100)], 1)
    for y in range(H):
        for x in range(W):
            if beam.px[y][x] and dither(x, y, 6): im.px[y][x] = P.spot
    for side in (0, 1):                                                                                    # the curtains: folds in stripes, a swag on top
        x0 = 0 if side == 0 else 200
        for x in range(x0, x0 + 56):
            fold = (x // 4) % 2
            for y in range(12, 108): im.pset(x, y, P.curtain if fold == 0 else P.curtaind)
        for x in range(x0, x0 + 56):
            im.rect(x, 12, 1, 6 + int(5 * abs(math.sin((x - x0) / 9.0))), P.curtainl)
        im.rect(x0, 106, 56, 2, P.gold)
    im.rect(0, 0, W, 12, P.gold); im.rect(0, 10, W, 2, P.goldd); im.rect(0, 12, W, 2, P.shadow)
    for x in range(12, 256, 24): im.disc(x, 5, 3, P.trim)
    im.rect(0, STAGE_FLOOR, W, 1, P.shadow); im.rect(0, STAGE_FLOOR + 1, W, 1, P.floorl)
    return im


def stage_arena(P):
    im = Img(W, H)
    for cy in range(13):
        for cx in range(32): im.blit(flat(P.dark if cy % 2 == 0 else P.darkl), cx * 8, cy * 8)
    for cy in range(13, 15):
        for cx in range(32): im.blit(plank_cell(P.stage, P.floorl), cx * 8, cy * 8)
    for cy in range(15, 28):
        for cx in range(32): im.blit(plank_cell(P.floor, P.floorl), cx * 8, cy * 8)
    # the big screen
    im.rect(80, 30, 96, 52, P.truss); im.rect(83, 33, 90, 46, P.screen); im.rect(83, 33, 90, 3, P.screenl)
    im.poly([(128, 40), (131, 49), (141, 49), (133, 55), (136, 65), (128, 59), (120, 65), (123, 55), (115, 49), (125, 49)], P.light)
    # truss: two rails with diagonal bracing, and three lights on each side with their beams
    for y in (6, 24):
        im.rect(0, y, W, 3, P.truss); im.rect(0, y + 5, W, 2, P.trussd)
        for x in range(0, W, 8): im.line(x, y + 3, x + 4, y + 5, P.trussd); im.line(x + 4, y + 5, x + 8, y + 3, P.trussd)
    beams = ((30, P.lA), (64, P.lB), (98, P.lC), (158, P.lC), (192, P.lB), (226, P.lA))
    layer = Img(W, H)
    for (x, c) in beams:
        for y in range(32, 92):
            for xx in range(x - 4, x + 4):
                if dither(xx, y, 3): layer.pset(xx, y, c)
    for y in range(H):
        for x in range(W):
            if layer.px[y][x] and im.px[y][x] in (P.dark, P.darkl): im.px[y][x] = layer.px[y][x]
    for (x, c) in beams: im.disc(x, 27, 5, P.trussd); im.disc(x, 27, 3, c)
    im.rect(0, 92, W, 12, P.stage); im.rect(0, 92, W, 2, P.truss)                                         # the stage riser with a lit edge
    im.rect(0, STAGE_FLOOR, W, 1, P.black); im.rect(0, STAGE_FLOOR + 1, W, 1, P.floorl)
    return im


# --------------------------------------------------------------- the crowd kit (palette 6): four heads seen from behind, two poses each
def crowd_head(P, v, up):
    """A 16 x 16 head and shoulders from behind: v picks the hair and shirt; `up` raises both arms."""
    hair = (P.hair1, P.hair2, P.hair3, P.hair1)[v]
    shirt = (P.shirt1, P.shirt2, P.shirt3, P.shirt4)[v]
    skin = (P.skin1, P.skin2, P.skin3, P.skin4)[v]
    im = Img(16, 16)
    im.rect(2, 9, 12, 7, shirt); im.rect(2, 9, 12, 1, P.sil2)
    im.disc(7.5, 6, 4.4, hair)
    if v == 3: im.poly([(3, 6), (4, 1), (7, 3), (9, 0), (12, 2), (12, 6)], hair)       # a spiky one
    im.rect(6, 9, 3, 2, skin)
    if up:
        im.rect(1, 1, 2, 8, skin); im.rect(13, 1, 2, 8, skin); im.rect(0, 0, 4, 2, skin); im.rect(12, 0, 4, 2, skin)
    return im.outline(P.sil)


def crowd_kit(P):
    im = Img(8 * 16, 16)                 # 8 heads side by side: v0 down, v0 up, v1 down ...
    for v in range(4):
        for up in (0, 1): im.blit(crowd_head(P, v, up), (v * 2 + up) * 16, 0)
    return im


# --------------------------------------------------------------- the intro (palette 7): three comic panels, cell rows 3 to 15; the cast stands on them as sprites
INTRO_TOP, INTRO_BOT = 24, 128


def intro_room(P):
    """Panel 1: the rehearsal room: damp wall, posters, speaker stacks, a bare bulb, a plank floor. Pieces are cell-aligned and repeated."""
    im = Img(W, H)
    for cy in range(3, 12):
        for cx in range(32): im.blit(Img.make(8, 8, lambda x, y: P.walld if (y == 7 and cy % 2 == 0) else P.wall), cx * 8, cy * 8)
    for cy in range(12, 16):
        for cx in range(32): im.blit(plank_floor(P), cx * 8, cy * 8)
    for (x, c) in ((48, P.poster1), (160, P.poster2), (184, P.poster1)):                                     # posters: 16 x 24, two designs
        im.rect(x, 40, 16, 24, P.white); im.rect(x + 2, 42, 12, 20, c); im.disc(x + 7.5, 50, 3, P.white); im.rect(x + 4, 57, 8, 2, P.white)
    for x in (8, 216):                                                                                        # speaker stacks: two cones each, 32 wide
        im.rect(x, 48, 32, 48, P.black); im.rect(x + 2, 50, 28, 44, P.woodd)
        for cy2 in (64, 82): im.disc(x + 15.5, cy2 - 0.5, 8, P.black); im.disc(x + 15.5, cy2 - 0.5, 6, P.woodd); im.disc(x + 15.5, cy2 - 0.5, 2, P.black)
    im.rect(127, 24, 2, 16, P.black); im.disc(128, 44, 5, P.sun); im.rect(125, 38, 6, 3, P.black)             # the bare bulb
    im.rect(0, 96, W, 2, P.woodd)
    return im


def plank_floor(P):
    return Img.make(8, 8, lambda x, y: P.woodd if y % 4 == 3 else (P.floorl if (x + (y // 4) * 3) % 8 == 0 else P.floor))


def intro_door(P):
    """Panel 2: the hallway: a door, a FOR SALE board, a mailbox, a doormat."""
    im = Img(W, H)
    for cy in range(3, 12):
        for cx in range(32): im.blit(Img.make(8, 8, lambda x, y: P.walld if (x == 0) else P.wall), cx * 8, cy * 8)
    for cy in range(12, 16):
        for cx in range(32): im.blit(plank_floor(P), cx * 8, cy * 8)
    im.rect(16, 32, 56, 64, P.black); im.rect(19, 35, 50, 61, P.wood)                                       # the door, with four panels
    for (x, y) in ((24, 40), (48, 40), (24, 68), (48, 68)): im.rect(x, y, 16, 20, P.woodd); im.rect(x + 2, y + 2, 12, 16, P.wood)
    im.disc(62, 72, 2.5, P.sun)
    im.rect(14, 96, 60, 4, P.poster1)                                                                       # the doormat
    im.rect(96, 40, 72, 32, P.black); im.rect(98, 42, 68, 28, P.white)                                      # the board
    big_text(im, 'SALE', 100, 48, 2, P.poster1)
    im.rect(130, 72, 4, 24, P.woodd)
    im.rect(192, 40, 16, 24, P.black); im.rect(194, 42, 12, 20, P.poster2); im.rect(196, 46, 8, 2, P.white)  # the mailbox
    return im


def intro_road(P):
    """Panel 3: the road at dawn: a sun on the hills, the sky warming from rose to peach."""
    im = Img(W, H)
    for cy in range(3, 16):
        band = P.dawn2 if cy < 6 else P.dawn1
        for cx in range(32): im.blit(Img.make(8, 8, lambda x, y, c=band, cy=cy: (P.dawn1 if (cy == 5 and dither(x, y, 6)) else c)), cx * 8, cy * 8)
    im.disc(128, 88, 16, P.sun)
    im.poly([(0, 96), (0, 80), (24, 66), (56, 78), (88, 64), (120, 82), (150, 70), (190, 80), (224, 62), (256, 76), (256, 96)], P.hillp)
    for cy in range(12, 16):
        for cx in range(32): im.blit(Img.make(8, 8, lambda x, y, d=(cy == 13 and cx % 4 < 2): P.white if (d and 3 <= y <= 4) else P.black), cx * 8, cy * 8)
    im.rect(0, 96, W, 3, P.woodd)
    return im
