# Westward Wagon's art: carts/src/westward-wagon/tiles.txt, palette.txt, map.txt and art.json, the ART block in code.js, and the landmark
# scenes in the ROM (rom/scenes.bin).
#   python3 carts/src/westward-wagon/art.py carts/src/westward-wagon
# Written with the art toolkit (tools/devkit/art/kit.py; docs/dev/art-recipes.md). Look at the result with tools/devkit/art/sprites.mjs,
# scene.mjs, tiles.mjs and proof.mjs (pack first).
#
# The trail (spec section 12): the sky is a gradient set line by line; BG2 the far hills, BG1 the near hills, BG0 the ground and the trail,
# each a 256 px wide picture that wraps across as the wagon goes (256 tall, transparent above its band, so it does not repeat down the
# screen). The wagon and the oxen are big sprites, animated.
#
# The landmark scenes are too many for the tile sheet, so they live in the ROM (rom/scenes.bin, written here) and code.js copies one at a
# time into a reserved block of tiles (SCENE_TILES from SCENE_BASE) and a reserved stretch of Map RAM, the way Merge Café's picture pool
# does for sprites. rom/scenes.bin: a count; then for each scene: its 15 colours (RGB555, little-endian), its tile count (u16), the tiles
# (32 bytes each: 8 x 8 pixels, two to a byte, the left one in the low four bits), and its 32 x 19 map (u16 each: 0 empty, else the tile's
# number from 1 and the flips in bits 13 and 14).
import math, os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../../tools/devkit/art'))
from kit import *

SCENE_BASE, SCENE_TILES = 800, 224                          # code.js has the same

art = Art()
art.region('bg', 1, 431)
art.region('spr', 432, SCENE_BASE - 1)
art.color(200, '2a1810', 'GLASS')

# --- Palettes ---
art.gradient('sky', ['4a78c8', '8ab8e8', 'e8e0c8'], y0=0, y1=130)           # the prairie's sky: deep blue to a pale horizon
ground = art.palette(1, {'grass': ramp('6a9a3a', 4), 'dirt': ramp('a07848', 3), 'flower': 'e8d060', 'stone': 'b0a898'})
near = art.palette(2, {'hill': recede(ramp('5a8a3a', 4), 0.25, 'e8e0c8'), 'tree': recede(ramp('3a6a2a', 3), 0.2, 'e8e0c8')})
far = art.palette(3, {'hill': recede(ramp('6a8a6a', 3), 0.65, 'e8e0c8'), 'cloud': ramp('f4f4f8', 3, shift=0.4)})
logo_pal = art.palette(4, {'gold': ramp('f0c060', 5), 'edge': '2a1408', 'shade': '6a3820'})
wag = art.sprite_palette(0, {'canvas': ramp('ece4cc', 4), 'wood': ramp('8a5a30', 4), 'iron': ramp('3a3440', 3)})
ox = art.sprite_palette(1, {'hide': ramp('9a6a3a', 5), 'dark': ramp('5a3a22', 3), 'horn': ramp('e8dcc0', 2), 'yoke': ramp('7a5030', 3)})

# --- The trail's layers (the prairie: step 7 adds the other regions) ---
def layer(draw):
    im = Img(256, 256); draw(im); return im
def far_hills(im):
    clouds(im, far.cloud, count=4, y0=14, y1=64, size=(20, 44), seed=5)        # fair-weather clouds, drifting with the far hills
    hills(im, far.hill, base=104, amp=10, period=256, seed=3, rim=False)
def near_hills(im):
    crest = hills(im, near.hill, base=128, amp=14, period=256, seed=9)
    for k, x in enumerate((20, 58, 140, 200)):                 # a few cottonwoods on the crests
        t = Img(16, 18); treeline(t, near.tree, base=16, size=10, spacing=16, seed=k)
        cy = min(crest[(x + i) % 256] for i in range(16))
        im.blit(t, x, cy - 14)
def ground_band(im):
    tex = texture('grass', 64, 40, ground.grass)
    for x in range(0, 256, 64): im.blit(tex, x, 124)
    for x in range(256):                                       # the trail: two ruts of bare earth, a worn strip between
        for y, c in ((136, ground.dirt[1]), (137, ground.dirt[0]), (141, ground.dirt[2]), (145, ground.dirt[1]), (146, ground.dirt[0])):
            im.px[y][x] = c
        for y in range(138, 145):
            if hsh(x * 7 + y * 13) % 5: im.px[y][x] = ground.dirt[2] if hsh(x + y * 31) % 3 else ground.grass[1]
        im.px[124][x] = ground.grass[3]
    for k in range(18):                                        # flowers and stones in the grass
        x, y = hsh(k * 31 + 3) % 256, 126 + hsh(k * 17) % 9
        im.px[y][x] = ground.flower if k % 3 else ground.stone
art.scene('far', layer(far_hills), pal=far, at=(0, 0))
art.scene('near', layer(near_hills), pal=near, at=(32, 0))
art.scene('ground', layer(ground_band), pal=ground, at=(64, 0))

# --- The wagon (four turns of its wheels) and the oxen (four steps), big sprites sharing their unchanging parts ---
def wheel(d, cx, cy, r, phase, part):
    d.fill(oval(cx, cy, r, r), wag.iron[1], part=part + 'tire')
    d.cut(oval(cx, cy, r - 1.4, r - 1.4))
    for k in range(6):
        a = phase + k * math.pi / 3
        d.fill(brush([(cx, cy), (cx + (r - 1) * math.cos(a), cy + (r - 1) * math.sin(a))], 0.9, 0.9), wag.wood[1], part=part + 's%d' % k)
    d.fill(oval(cx, cy, 1.6, 1.6), wag.iron[0], part=part + 'hub')
def wagon(phase):
    d = Canvas(56, 40)
    d.fill(blob([(10, 22), (8, 12), (14, 4), (30, 2), (44, 4), (50, 12), (48, 22)]), wag.canvas[2], part='bonnet')   # the canvas over its hoops
    d.shadow('bonnet', wag.canvas[1], light=(-1, -1), depth=3)
    for x in (16, 26, 36): d.ink(curve([(x, 22), (x - 1, 12), (x, 4)]), wag.canvas[1], inside='bonnet')
    d.fill(oval(9.5, 13, 2.5, 6), wag.canvas[0], part='open')
    d.fill(poly([(7, 21), (51, 21), (49, 29), (9, 29)]), wag.wood[2], part='box')
    d.light('box', wag.wood[3], light=(-1, -1), width=1)
    d.ink([(9, 25), (49, 25)], wag.wood[1], inside='box')
    d.fill(brush([(50, 28), (56, 30)], 1.2, 1), wag.wood[1], part='tongue')
    d.fill(poly([(10, 29), (48, 29), (48, 30.5), (10, 30.5)]), wag.iron[0], part='axles')
    wheel(d, 15, 31, 8, phase, 'rear'); wheel(d, 42, 32.5, 6.5, phase * 1.23, 'front')
    return d.render(outline=wag)
def oxen(step):
    """Two oxen, one behind the other, facing right; step 0 to 3: their walk."""
    out = Img(48, 32)
    for k, (dx, dy, R) in enumerate(((0, 0, ox.dark), (6, 3, ox.hide))):   # the far ox darker, then the near one
        d = Canvas(48, 32)
        body = R[3] if len(R) > 3 else R[1]
        d.fill(blob([(6, 12), (10, 7), (24, 6), (34, 8), (36, 14), (30, 18), (12, 18)]), body, part='body')
        d.shadow('body', R[0], light=(-1, -1), depth=3)
        d.fill(blob([(33, 8), (40, 7), (44, 10), (42, 15), (36, 14)]), R[2], part='head')
        d.fill(brush([(37, 7), (39, 3)], 1, 0.6), ox.horn[1], part='horn')
        sw = [0, 1.8, 0, -1.8][step]
        for i, lx in enumerate((10, 14, 27, 31)):
            s = sw if i % 2 == 0 else -sw
            d.fill(brush([(lx, 16), (lx + s, 24)], 1.3, 1.0), R[0] if i in (1, 3) else R[1], part='leg%d' % i)
            d.fill(oval(lx + s, 25, 1.2, 0.9), ox.dark[0], part='hoof%d' % i)
        d.fill(brush([(6, 10), (3, 18)], 0.8, 0.6), R[0], part='tail')
        im = d.render(outline=ox)
        for y in range(32):
            for x in range(48):
                v = im.px[y][x]
                if v and 0 <= x + dx - 3 < 48 and 0 <= y + dy < 32: out.px[y + dy][x + dx - 3] = v
    d = Canvas(48, 32); d.fill(brush([(37, 10), (44, 13)], 1.4, 1.4), ox.yoke[1], part='yoke'); yk = d.render(outline=ox)
    for yy in range(32):
        for xx in range(48):
            if yk.px[yy][xx]: out.px[yy][xx] = yk.px[yy][xx]
    return out
art.animation('wagon', [wagon(k * math.pi / 12) for k in range(4)], pal=wag, region='spr')
art.animation('oxen', [oxen(k) for k in range(4)], pal=ox, region='spr')

# --- The hunt's animals (spec 5.5): side views facing right, two running frames; the small ones 16 px sprites, the big ones big sprites
# that share the parts of their frames that do not move ---
fur = art.sprite_palette(2, {'brown': ramp('8a5a32', 4), 'tan': ramp('c8a070', 3), 'grey': ramp('8a8a90', 3), 'dark': ramp('3a2a20', 2), 'white': 'f0ece0', 'horn': 'd8c8a0'})
def leg(d, x, y, s, n, c, len_=7, w=1.4):
    d.fill(brush([(x, y), (x + s, y + len_)], w, w * 0.8), c, part='leg%d' % n)
def animal(kind, f):
    sw = 2 if f else -2
    if kind == 'rabbit':
        d = Canvas(16, 16)
        d.fill(oval(7, 10, 5, 3.5), fur.grey[1], part='body'); d.shadow('body', fur.grey[0], light=(-1, -1), depth=1.5)
        d.fill(oval(12, 8, 2.6, 2.2), fur.grey[1], part='head'); d.fill(oval(11.5, 4, 0.9, 2.6, rot=-15), fur.grey[2], part='ear')
        d.fill(oval(2.5, 9, 1.4, 1.4), fur.white, part='tail')
        leg(d, 5, 12, -2 * (f * 2 - 1), 0, fur.grey[0], 3); leg(d, 10, 12, 2 * (f * 2 - 1), 1, fur.grey[0], 3)
        d.dot(13, 7, fur.dark[0]); return d.render(outline=fur)
    if kind == 'squirrel':
        d = Canvas(16, 16)
        d.fill(oval(8, 11, 4, 2.6), fur.brown[2], part='body'); d.fill(oval(12, 9, 2.2, 2), fur.brown[2], part='head')
        d.fill(blob([(4, 11), (1, 6), (3, 3), (6, 6)]), fur.brown[3], part='tail')
        leg(d, 7, 13, -1 * (f * 2 - 1), 0, fur.brown[0], 2); leg(d, 10, 13, 1 * (f * 2 - 1), 1, fur.brown[0], 2)
        d.dot(13, 8, fur.dark[0]); return d.render(outline=fur)
    d = Canvas(32, 24)
    if kind == 'deer':
        d.fill(blob([(6, 9), (12, 7), (22, 7), (26, 10), (22, 14), (8, 14)]), fur.tan[1], part='body'); d.shadow('body', fur.tan[0], light=(-1, -1), depth=2)
        d.fill(brush([(23, 9), (26, 5)], 2.4, 1.8), fur.tan[1], part='neck'); d.fill(oval(27.5, 5, 2.8, 1.9), fur.tan[1], part='head'); d.fill(oval(26, 2.5, 0.8, 1.6), fur.tan[0], part='ear')
        d.fill(oval(5.5, 8, 1.4, 1.6), fur.white, part='tail')
        for i, (x, s) in enumerate(((9, sw), (12, -sw), (21, -sw), (24, sw))): leg(d, x, 13, s, i, fur.tan[0], 9, 1.1)
        d.dot(28, 4, fur.dark[0]); return d.render(outline=fur)
    if kind == 'elk':
        d.fill(blob([(4, 10), (10, 7), (22, 7), (26, 10), (22, 15), (6, 15)]), fur.brown[2], part='body'); d.shadow('body', fur.brown[1], light=(-1, -1), depth=2)
        d.fill(brush([(23, 9), (26, 4)], 2.6, 2), fur.brown[1], part='neck'); d.fill(oval(28, 4.5, 2.8, 2), fur.brown[1], part='head')
        for a in (-0.6, -0.2, 0.2): d.ink([(26, 3), (26 + 5 * math.sin(a) - 2, 0 - 0)], fur.horn) if False else None
        d.ink([(26, 3), (23, 0)], fur.horn); d.ink([(27, 3), (29, 0)], fur.horn); d.ink([(24, 1), (25, 0)], fur.horn)
        for i, (x, s) in enumerate(((8, sw), (11, -sw), (20, -sw), (23, sw))): leg(d, x, 14, s, i, fur.brown[0], 8, 1.3)
        return d.render(outline=fur)
    if kind == 'bear':
        d.fill(blob([(3, 12), (8, 6), (20, 5), (26, 9), (26, 16), (6, 17)]), fur.dark[1], part='body'); d.shadow('body', fur.dark[0], light=(-1, -1), depth=2)
        d.fill(oval(27, 11, 3.6, 3), fur.dark[1], part='head'); d.fill(oval(29.5, 12, 2.2, 1.5), fur.brown[2], part='snout'); d.dot(27, 10, fur.white); d.fill(oval(25.5, 8, 1.2, 1.2), fur.dark[1], part='ear')
        for i, (x, s) in enumerate(((7, sw), (11, -sw), (19, -sw), (23, sw))): leg(d, x, 16, s * 0.7, i, fur.dark[0], 6, 2)
        return d.render(outline=fur)
    if kind == 'buffalo':
        d.fill(blob([(3, 11), (8, 8), (16, 3), (24, 4), (28, 9), (26, 16), (6, 16)]), fur.brown[1], part='body'); d.shadow('body', fur.brown[0], light=(-1, -1), depth=3)
        d.fill(blob([(16, 3), (24, 3), (28, 8), (26, 14), (18, 12)]), fur.dark[1], part='hump')
        d.fill(oval(28, 12, 3, 3.4), fur.dark[1], part='head'); d.fill(brush([(28, 9), (31, 8)], 0.8, 0.6), fur.horn, part='horn')
        for i, (x, s) in enumerate(((7, sw), (11, -sw), (20, -sw), (24, sw))): leg(d, x, 15, s * 0.7, i, fur.dark[0], 7, 1.6)
        return d.render(outline=fur)
for k in ('rabbit', 'squirrel'):
    for f in (0, 1): art.sprite('%s%d' % (k, f), animal(k, f), pal=fur, region='spr')
for k in ('deer', 'elk', 'bear', 'buffalo'):                  # in 16 px pieces: the body's are shared by both frames, and no 32 px spot is needed
    art.anims[k] = [art.big_sprite('%s%d' % (k, f), animal(k, f), pal=fur, region='spr', piece=16) and '%s%d' % (k, f) for f in (0, 1)]

# --- The title: WESTWARD WAGON in big letters (BG2, on the title) ---
logo = Img(256, 56)
for k, word in enumerate(('WESTWARD', 'WAGON')):
    t = big_text(word, logo_pal.gold, scale=2, outline=logo_pal.edge, shadow=logo_pal.shade)
    logo.blit(t, (256 - t.w) // 2, k * 26 + 1)
art.scene('logo', logo, pal=logo_pal, at=(96, 0))

# --- The landmark scenes, in the ROM (BG palette 5 is theirs: code.js sets its colours from the scene) ---
SCENE_PAL = {'sand': ramp('c89860', 5), 'rock': ramp('a87850', 3, shift=0.5), 'plain': recede(ramp('a8a070', 3), 0.6, 'e8e0c8'), 'grass': ramp('7a9a48', 3), 'dark': '3a2a1a'}
scene_pal = art.palette(5, SCENE_PAL)
def chimney_rock():
    im = Img(256, 152)
    P = scene_pal
    for y in range(104, 152):                                  # the North Platte's plain, far and pale, then the grass
        for x in range(256):
            im.px[y][x] = P.plain[1] if y < 112 else P.plain[2] if y < 118 else P.grass[1] if (hsh(x // 4 * 7 + y // 3) % 4) else P.grass[0]
    for x in range(256): im.px[104][x] = P.plain[0]
    for y in range(118, 152, 6):
        for x in range(0, 256, 2):
            if hsh(x * 13 + y) % 7 == 0: im.px[y][x] = P.grass[2]
    for k in range(3):                                         # far bluffs on the horizon, first: the rock stands in front of them
        bx = [30, 210, 240][k]
        for y in range(96, 104):
            for x in range(bx - (y - 96) * 2 - 6, bx + (y - 96) * 2 + 6):
                if 0 <= x < 256: im.px[y][x] = P.rock[1]
    # the rock: a broad cone of clay, and on it the tall spire of sandstone, lit from the left (strata as dark lines)
    cx, base = 150, 112
    for y in range(18, base):
        if y >= 66:                                            # the cone: concave, eroded slopes
            t = (y - 66) / (base - 66)
            half = 7 + 70 * t ** 1.7 + (hsh(y * 7) % 3) - 1
        else:                                                  # the spire, a little wider at its foot, rounded at the top
            half = 3.6 + 1.6 * (y - 18) / 48 - (1.5 if y < 21 else 0)
        for x in range(int(cx - half), int(cx + half) + 1):
            t = (x - (cx - half)) / (2 * half)                 # 0 at the lit left edge, 1 at the shaded right
            k = 4 if t < 0.22 else 3 if t < 0.5 else 2 if t < 0.78 else 1
            if y >= 66 and hsh(x * 7 + y * 3) % 7 == 0: k = max(0, k - 1)
            im.px[y][x] = P.sand[k]
        if y < 66 and y % 11 == 5:                             # the spire's beds of lighter sandstone
            for x in range(int(cx - half) + 1, int(cx + half)): im.px[y][x] = P.sand[min(4, 3 + (x < cx))]
    for g in range(-5, 6):                                     # gullies down the cone, following its slope
        for y in range(70, base):
            t = (y - 66) / (base - 66); half = 7 + 70 * t ** 1.7
            x = int(cx + g / 5.5 * half)
            if hsh(g * 31 + y) % 3: im.px[y][x] = P.rock[0] if g > 0 else P.sand[1]
    for y in range(70, base, 7):                               # gullies down the cone
        for x in range(int(cx - 8 - (y - 70) * 1.25), int(cx + 8 + (y - 70) * 1.25), 6): im.px[y][x] = P.rock[0]; im.px[min(y + 1, 151)][x + 1] = P.rock[0]
    return im

def pack_scene(im, P):
    """A scene's tiles (identical and flipped ones stored once) and its map, for rom/scenes.bin."""
    tiles, index, mp = [], {}, []
    for ty in range(19):
        for tx in range(32):
            cell = im.crop(tx * 8, ty * 8, 8, 8)
            if cell.is_empty(): mp.append(0); continue
            found = None
            for fx_, fy_, c in ((0, 0, cell), (1, 0, cell.flip_h()), (0, 1, cell.flip_v()), (1, 1, cell.flip_h().flip_v())):
                if c.key() in index: found = (index[c.key()], fx_, fy_); break
            if not found:
                tiles.append(cell); index[cell.key()] = len(tiles); found = (len(tiles), 0, 0)
            mp.append(found[0] | (found[1] << 13) | (found[2] << 14))
    if len(tiles) > SCENE_TILES: raise ValueError('a landmark scene needs %d tiles; the buffer holds %d' % (len(tiles), SCENE_TILES))
    out = bytearray()
    for name in P.names():                                     # the 15 colours by index
        pass
    cols = [0] * 15
    for name, i in P.names().items():
        h = P.hex_of(i); r, g, b = (int(h[k:k + 2], 16) >> 3 for k in (0, 2, 4)); cols[i - 1] = r | (g << 5) | (b << 10)
    for v in cols: out += bytes([v & 255, v >> 8])
    out += bytes([len(tiles) & 255, len(tiles) >> 8])
    for t in tiles:
        for y in range(8):
            for x in range(0, 8, 2): out.append(t.px[y][x] | (t.px[y][x + 1] << 4))
    for v in mp: out += bytes([v & 255, v >> 8])
    return bytes(out), len(tiles)
SCENES = [('CHIMNEY ROCK', chimney_rock())]                  # code.js: the scene of each landmark (step 7 adds the others)
blob_ = bytearray([len(SCENES)])
for name, im in SCENES:
    b, n = pack_scene(im, scene_pal); blob_ += b
    print('scene %s: %d tiles' % (name, n))
os.makedirs(os.path.join(sys.argv[1], 'rom'), exist_ok=True)
open(os.path.join(sys.argv[1], 'rom', 'scenes.bin'), 'wb').write(bytes(blob_))

art.write(sys.argv[1])
