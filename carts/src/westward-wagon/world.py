# Westward Wagon's world, drawn in code for art.py: the five regions' parallax layers and the landmark scenes, and the LZ packing that
# fits them in the ROM. Imported by art.py (which has `from kit import *` set up).
#
# LZ: a stream of tokens. A byte c < 128 is c + 1 literal bytes that follow; c >= 128 copies c - 125 bytes (3 to 130) from `offset`
# bytes back in the output (a little-endian u16 after it). code.js's lz() reads it.
import math
from kit import Img, hsh, ramp, recede, texture, dither
from scenery import clouds, hills, mountains, treeline


def lz(data):
    data = bytes(data); n = len(data); out = bytearray(); lits = bytearray(); heads = {}; i = 0
    def flush():
        while lits:
            chunk = lits[:128]; del lits[:128]
            out.append(len(chunk) - 1); out.extend(chunk)
    while i < n:
        best, boff = 0, 0
        if i + 3 <= n:
            key = data[i:i + 3]
            for j in reversed(heads.get(key, [])[-48:]):
                if i - j > 65535: continue
                l = 0
                while l < 130 and i + l < n and data[j + l] == data[i + l]: l += 1
                if l > best: best, boff = l, i - j
                if l == 130: break
        if best >= 3:
            flush(); out.append(125 + best); out += bytes([boff & 255, boff >> 8])
            for k in range(best):
                if i + k + 3 <= n: heads.setdefault(data[i + k:i + k + 3], []).append(i + k)
            i += best
        else:
            if i + 3 <= n: heads.setdefault(data[i:i + 3], []).append(i)
            lits.append(data[i]); i += 1
    flush()
    return bytes(out)


def unlz(b):
    out = bytearray(); i = 0
    while i < len(b):
        c = b[i]; i += 1
        if c < 128: out += b[i:i + c + 1]; i += c + 1
        else:
            l, off = c - 125, b[i] | b[i + 1] << 8; i += 2
            for _ in range(l): out.append(out[-off])
    return bytes(out)


def pack_blob(entries):
    """A ROM blob of LZ-packed entries: a count byte, then each entry's packed length (u16) and its bytes."""
    out = bytearray([len(entries)])
    for e in entries:
        p = lz(e); assert unlz(p) == bytes(e)
        out += bytes([len(p) & 255, len(p) >> 8]) + p
    return bytes(out)


def tiles_and_map(im, rows, limit, what):
    """An image's 8 x 8 tiles (identical and flipped ones stored once) and its map (rows of 32: 0 empty, else the tile's number from 1,
    the flips in bits 13 and 14)."""
    tiles, index, mp = [], {}, []
    for ty in range(rows):
        for tx in range(32):
            cell = im.crop(tx * 8, ty * 8, 8, 8)
            if cell.is_empty(): mp.append(0); continue
            found = None
            for fx_, fy_, c in ((0, 0, cell), (1, 0, cell.flip_h()), (0, 1, cell.flip_v()), (1, 1, cell.flip_h().flip_v())):
                if c.key() in index: found = (index[c.key()], fx_, fy_); break
            if not found:
                tiles.append(cell); index[cell.key()] = len(tiles); found = (len(tiles), 0, 0)
            mp.append(found[0] | (found[1] << 13) | (found[2] << 14))
    return tiles, mp


def tile_bytes(tiles):
    out = bytearray()
    for t in tiles:
        for y in range(8):
            for x in range(0, 8, 2): out.append(t.px[y][x] | (t.px[y][x + 1] << 4))
    return out


def colours(P):
    """A sub-palette's 15 colours, RGB555 little-endian, by index."""
    cols = [0] * 15
    for name, i in P.names().items():
        h = P.hex_of(i); r, g, b = (int(h[k:k + 2], 16) >> 3 for k in (0, 2, 4)); cols[i - 1] = r | (g << 5) | (b << 10)
    out = bytearray()
    for v in cols: out += bytes([v & 255, v >> 8])
    return out


u16 = lambda v: bytes([v & 255, v >> 8])


# --- The regions (spec 6, 12): each the same palette layout (the weather code tints the ground's grass, entries 1 to 4, and the far
# clouds, entries 4 to 6 of the far palette), its own colours, sky and shapes. ---
REGION_LOOKS = [
    dict(name='prairie', sky=['4a78c8', '8ab8e8', 'e8e0c8'],
         ground={'grass': ramp('6a9a3a', 4), 'dirt': ramp('a07848', 3), 'flower': 'e8d060', 'stone': 'b0a898'},
         near={'hill': recede(ramp('5a8a3a', 4), 0.25, 'e8e0c8'), 'tree': recede(ramp('3a6a2a', 3), 0.2, 'e8e0c8')},
         far={'hill': recede(ramp('6a8a6a', 3), 0.65, 'e8e0c8'), 'cloud': ramp('f4f4f8', 3, shift=0.4)}),
    dict(name='bluffs', sky=['5a80c0', 'a0c0e0', 'f0e0c0'],
         ground={'grass': ramp('9a9a4a', 4), 'dirt': ramp('b08850', 3), 'flower': 'e0c070', 'stone': 'c0b0a0'},
         near={'hill': recede(ramp('a89058', 4), 0.2, 'f0e0c0'), 'tree': recede(ramp('5a6a3a', 3), 0.15, 'f0e0c0')},
         far={'hill': recede(ramp('c09068', 3), 0.5, 'f0e0c8'), 'cloud': ramp('f8f4f0', 3, shift=0.4), 'rock': recede(ramp('a87048', 3), 0.45, 'f0e0c8')}),
    dict(name='mountains', sky=['3a68c0', '7aa8e0', 'd8e0f0'],
         ground={'grass': ramp('5a8a4a', 4), 'dirt': ramp('8a7860', 3), 'flower': 'd0d0f0', 'stone': 'a0a0a8'},
         near={'hill': recede(ramp('5a7a48', 4), 0.2, 'd8e0e8'), 'tree': recede(ramp('2a4a32', 3), 0.12, 'd8e0e8')},
         far={'hill': recede(ramp('6a7088', 3), 0.45, 'd8e0f0'), 'cloud': ramp('f4f4f8', 3, shift=0.4), 'snow': ramp('e8f0fc', 2)}),
    dict(name='desert', sky=['6a90c8', 'b0c8e0', 'f0e8d8'],
         ground={'grass': ramp('a8a070', 4), 'dirt': ramp('b89870', 3), 'flower': 'd8c8a0', 'stone': '3a3438'},
         near={'hill': recede(ramp('b0a070', 4), 0.2, 'f0e8d8'), 'tree': recede(ramp('7a8a68', 3), 0.1, 'f0e8d8'), 'basalt': ramp('3a3440', 2)},
         far={'hill': recede(ramp('b08a70', 3), 0.6, 'f0e8d8'), 'cloud': ramp('f8f8f8', 3, shift=0.4)}),
    dict(name='forest', sky=['5a78a8', '98b0c8', 'c8d4dc'],
         ground={'grass': ramp('4a7a3a', 4), 'dirt': ramp('7a5a3a', 3), 'flower': 'e8e8f0', 'stone': '8a8a80'},
         near={'hill': recede(ramp('3a6a3a', 4), 0.2, 'c8d4dc'), 'tree': recede(ramp('1e4a2e', 3), 0.08, 'c8d4dc')},
         far={'hill': recede(ramp('4a6a80', 3), 0.45, 'c8d4e0'), 'cloud': ramp('e8ecf0', 3, shift=0.3), 'snow': ramp('eef2fa', 2)}),
]


def conifer(im, cx, base, h, R, seed=0):
    """A fir: tiers of boughs narrowing to a point, lit from the left; a short trunk."""
    for y in range(int(h)):
        t = y / h
        tier = (y % 6) / 6
        half = (1.5 + h * 0.32 * t) * (0.65 + 0.35 * tier)
        top = base - h + y
        for x in range(int(cx - half), int(cx + half) + 1):
            if 0 <= top < im.h:
                u = (x - (cx - half)) / max(1, 2 * half)
                k = 2 if u < 0.3 else 1 if u < 0.75 else 0
                if hsh(x * 13 + top * 7 + seed) % 9 == 0: k = max(0, k - 1)
                im.px[top][x % im.w] = R[k]
    for y in range(base, base + 2):
        if 0 <= y < im.h: im.px[y][int(cx) % im.w] = R[0]


def bluff(im, cx, base, w, h, R, seed=0):
    """A flat-topped bluff of clay: steep eroded sides, a level cap, lit from the left, dark bands across."""
    for y in range(base - h, base):
        t = (y - (base - h)) / h
        half = w * 0.5 * (0.55 + 0.45 * t ** 0.6) + (hsh(y * 3 + seed) % 3) - 1
        for x in range(int(cx - half), int(cx + half) + 1):
            u = (x - (cx - half)) / max(1, 2 * half)
            k = 2 if u < 0.25 else 1 if u < 0.7 else 0
            if (y - base) % 7 == 0 and hsh(x + seed) % 3: k = max(0, k - 1)
            im.px[y][x % im.w] = R[k]


def twice(draw):
    """A picture drawn 128 px wide and laid twice across 256, so its tiles are shared."""
    half = Img(128, 256); draw(half); im = Img(256, 256); im.blit(half, 0, 0); im.blit(half, 128, 0); return im


def over(im, top):
    for y in range(256):
        for x in range(256):
            if top.px[y][x]: im.px[y][x] = top.px[y][x]


def far_layer(F, kind):
    im = Img(256, 256)
    clouds(im, F.cloud, count=4 if kind != 'desert' else 2, y0=14, y1=60, size=(20, 44), seed=5)
    if kind == 'prairie': hills(im, F.hill, base=104, amp=10, period=256, seed=3, rim=False)
    elif kind == 'bluffs':
        hills(im, F.hill, base=106, amp=4, period=256, seed=4, rim=False)
        for k, (x, w, h) in enumerate(((30, 60, 22), (120, 40, 14), (196, 70, 26))): bluff(im, x, 104, w, h, F.rock, seed=k)
    elif kind == 'mountains': over(im, twice(lambda m: mountains(m, F.hill, base=112, height=56, seed=8, period=128, snow=F.snow, snowline=0.4)))
    elif kind == 'desert':
        hills(im, F.hill, base=106, amp=3, period=256, seed=6, rim=False)
        for k, (x, w, h) in enumerate(((60, 50, 10), (170, 90, 7))): bluff(im, x, 104, w, h, F.hill, seed=k)
    else:
        over(im, twice(lambda m: mountains(m, F.hill, base=112, height=30, seed=11, period=128, snow=None)))
        for y in range(40, 112):                                   # a lone snowy volcano: Mount Hood, far off
            half = (y - 40) * 0.95 + 1
            for x in range(int(180 - half), int(180 + half) + 1):
                u = (x - (180 - half)) / max(1, 2 * half)
                snow = y < 66 + hsh(x // 2 * 7) % 8 + (3 if (x // 5) % 3 == 0 else 0)
                im.px[y][x % 256] = (F.snow[1] if u < 0.5 else F.snow[0]) if snow else (F.hill[2] if u < 0.4 else F.hill[1])
    for y in range(112, 256):                                      # solid below the horizon (hidden by the near layers)
        for x in range(256):
            if not im.px[y][x]: im.px[y][x] = F.hill[0]
    return im


def near_layer(N, kind):
    im = Img(256, 256)
    if kind == 'prairie':
        crest = hills(im, N.hill, base=128, amp=14, period=256, seed=9)
        for k, x in enumerate((20, 58, 140, 200)):
            t = Img(16, 18); treeline(t, N.tree, base=16, size=10, spacing=16, seed=k)
            cy = min(crest[(x + i) % 256] for i in range(16)); im.blit(t, x, cy - 14)
    elif kind == 'bluffs':
        crest = hills(im, N.hill, base=128, amp=9, period=256, seed=12)
        for k, x in enumerate((36, 110, 170, 230)):                # junipers, low and dark
            for d in range(-3, 4):
                for y in range(4 - abs(d)):
                    xx = (x + d) % 256; im.px[crest[xx] - y - 1][xx] = N.tree[1 if d < 0 else 0]
    elif kind == 'mountains':
        def half(m):
            crest = hills(m, N.hill, base=130, amp=18, period=128, seed=14)
            for k in range(7):
                x = k * 18 + hsh(k) % 9; conifer(m, x, crest[x % 128] + 2, 14 + hsh(k * 5) % 10, N.tree, seed=k)
        im = twice(half)
    elif kind == 'desert':
        crest = hills(im, N.hill, base=126, amp=6, period=256, seed=16)
        for k, x in enumerate((40, 150, 222)):                     # black rock where the lava cooled
            for y in range(6):
                for d in range(-10 + y, 11 - y):
                    xx = (x + d) % 256; im.px[crest[xx] - y][xx] = N.basalt[0 if d > 0 else 1]
        for k in range(30):                                        # sagebrush
            x = hsh(k * 37) % 256; y = crest[x] + 2 + hsh(k * 11) % 6
            for d in (-1, 0, 1): im.px[y][(x + d) % 256] = N.tree[1]
            im.px[y - 1][x] = N.tree[2]
    else:
        def half(m):
            crest = hills(m, N.hill, base=132, amp=8, period=128, seed=18)
            for k in range(11):
                x = k * 12 + hsh(k) % 7; conifer(m, x, crest[x % 128] + 3, 26 + hsh(k * 3) % 16, N.tree, seed=k)
        im = twice(half)
    return im


def ground_layer(G, kind):
    im = Img(256, 256)
    tex = texture('sand' if kind == 'desert' else 'grass', 64, 40, G.grass, seed=len(kind))
    for x in range(0, 256, 64): im.blit(tex, x, 124)
    for x in range(256):                                           # the trail: two ruts, a worn strip between
        for y, c in ((136, G.dirt[1]), (137, G.dirt[0]), (141, G.dirt[2]), (145, G.dirt[1]), (146, G.dirt[0])):
            im.px[y][x] = c
        for y in range(138, 145):
            if hsh(x * 7 + y * 13) % 5: im.px[y][x] = G.dirt[2] if hsh(x + y * 31) % 3 else G.grass[1]
        im.px[124][x] = G.grass[3]
    for k in range(18):                                            # flowers and stones (in the desert: basalt and sage)
        x, y = hsh(k * 31 + 3) % 256, 126 + hsh(k * 17) % 9
        im.px[y][x] = G.flower if k % 3 else G.stone
    return im


# --- The landmark scenes (spec 6): 256 x 152 over the region's sky (transparent above the land). Each has its own 15 colours. ---
def fill_rows(im, y0, y1, pick):
    for y in range(y0, y1):
        for x in range(256): im.px[y][x] = pick(x, y)


def grass_band(im, P, y0, y1=152, kind='grass'):
    """A foreground of the kit's grass (or sand) texture, 64 px wide and repeating, so it shares tiles."""
    tex = texture(kind, 64, y1 - y0, P.grass, seed=3)
    for x in range(0, 256, 64): im.blit(tex, x, y0)
    for x in range(256): im.px[y0][x] = P.grass[2]


def shade(L, x, y, n):
    """A light level 0..1 to one of n steps, dithered between them."""
    v = max(0.0, min(0.999, L)) * (n - 1)
    k = int(v)
    return min(n - 1, k + (1 if dither(x, y, int((v - k) * 16)) else 0))


SCENE_PALS = {
    'INDEPENDENCE ROCK': {'granite': ramp('9a8a7a', 5), 'plain': recede(ramp('a8a070', 3), 0.6, 'e8e0c8'), 'grass': ramp('7a9a48', 3), 'water': ramp('4a78a8', 2), 'dark': '3a2e28', 'paint': 'f0e8d8'},
    'SODA SPRINGS': {'sage': recede(ramp('8a9a70', 3), 0.4, 'e8e8d8'), 'mineral': ramp('d0a070', 4), 'pool': ramp('4aa8a8', 2), 'steam': ramp('e8f0f4', 2), 'grass': ramp('7a8a50', 3)},
    'SOUTH PASS': {'peak': recede(ramp('6a7088', 3), 0.45, 'd8e0f0'), 'snow': ramp('e8f0fc', 2), 'sage': ramp('9a9a70', 4), 'grass': ramp('8a9050', 3), 'dirt': ramp('a08860', 2)},
    'BLUE MOUNTAINS': {'far': recede(ramp('4a6a90', 3), 0.5, 'c8d4e0'), 'mid': recede(ramp('2e5a4a', 3), 0.25, 'c8d4e0'), 'pine': ramp('1e4030', 3), 'grass': ramp('4a7a3a', 3), 'dirt': ramp('8a6a48', 3)},
    'THE DALLES': {'basalt': ramp('3e3a40', 4), 'water': ramp('3a6a98', 3), 'snow': ramp('eef2fa', 2), 'peak': recede(ramp('5a7090', 2), 0.5, 'c8d4e0'), 'grass': ramp('7a8a50', 3), 'foam': 'e0eef4'},
    'FORT': {'adobe': ramp('c8a070', 4), 'wood': ramp('7a5030', 3), 'grass': ramp('7a9a48', 3), 'plain': recede(ramp('a8a070', 2), 0.6, 'e8e0c8'), 'red': 'b83828', 'dark': '2e241c'},
    'RIVER': {'water': ramp('3a6a98', 4), 'tree': ramp('4a7a3a', 3), 'sand': ramp('b89870', 3), 'grass': ramp('6a9a3a', 3), 'foam': 'd8e8f0', 'trunk': '5a4030'},
    'WILLAMETTE VALLEY': {'field': ramp('c8a848', 3), 'green': ramp('4a8a3a', 4), 'water': ramp('4a80b0', 2), 'snow': ramp('eef2fa', 2), 'peak': recede(ramp('5a7090', 2), 0.5, 'c8d4e0'), 'wood': ramp('7a5030', 2)},
}


def independence_rock(P):
    im = Img(256, 152)
    fill_rows(im, 100, 116, lambda x, y: P.plain[0] if y == 100 else P.plain[1] if y < 108 else P.plain[2])
    grass_band(im, P, 116)
    for y in range(124, 131):                                      # the Sweetwater River, winding past
        for x in range(256):
            off = int(3 * math.sin(x / 23))
            if 124 + off <= y < 128 + off: im.px[y][x] = P.water[1] if (y - off) == 124 else P.water[0]
    cx, w = 128, 108                                               # the rock: a great whale-back of granite, lit from the upper left
    for x in range(cx - w, cx + w):
        u = (x - cx) / w
        h = 50 * (1 - u * u) ** 0.45 + (hsh(x // 5) % 2)
        top = 116 - h
        for y in range(int(top), 117):
            v = (y - top) / max(1, h)                              # 0 at the top, 1 at the foot
            nx, ny = u * 0.8, -(1 - v) * 0.9 - 0.1                 # the surface's normal, roughly
            L = 0.55 - 0.5 * nx - 0.45 * ny - 0.35 * v
            k = shade(L, x, y, 5)
            if y - int(top) < 1: k = min(4, k + 1)                 # a lit rim
            im.px[y][x] = P.granite[k]
    for k in range(7):                                             # weathered seams, slanting down the sides
        x0 = cx - 75 + k * 25
        for t in range(18):
            x, y = x0 + t // 3 * (1 if k > 3 else -1), 84 + t + abs(k - 3) * 3
            if 0 <= x < 256 and im.px[y][x]: im.px[y][x] = P.granite[0]
    for k in range(40):                                            # the names painted and carved near the foot
        x, y = cx - 70 + hsh(k * 7) % 140, 102 + hsh(k * 3) % 11
        if im.px[y][x]: im.px[y][x] = P.paint if k % 3 else P.dark
    return im


def soda_springs(P):
    im = Img(256, 152)
    hills(im, P.sage, base=108, amp=8, period=256, seed=21, rim=False)
    grass_band(im, P, 108)
    for k, (x, y, r) in enumerate(((60, 126, 22), (150, 134, 30), (220, 120, 16))):   # mineral mounds with pools on top
        for yy in range(y - r // 2, y + 4):
            for xx in range(x - r, x + r):
                u = (xx - x) / r; top = y - r // 2 * math.sqrt(max(0, 1 - u * u))
                if yy >= top and 0 <= xx < 256: im.px[yy][xx] = P.mineral[shade(0.75 - 0.6 * u - 0.3 * (yy - top) / r, xx, yy, 4)] if (yy - int(top)) > 1 else P.mineral[3]
        for xx in range(x - r // 2, x + r // 2):
            if 0 <= xx < 256: im.px[y - r // 2 + 2][xx] = P.pool[1]; im.px[y - r // 2 + 3][xx] = P.pool[0]
    for y in range(116, 120): im.px[y][150] = P.steam[1]           # the Steamboat Spring: a jet, then its plume of puffs drifting right
    for k in range(9):
        cy = 112 - k * 8; cx = 150 + k * k * 0.5; r = 3 + k * 1.4
        for yy in range(int(cy - r), int(cy + r) + 1):
            for xx in range(int(cx - r), int(cx + r) + 1):
                d = ((xx - cx) ** 2 + (yy - cy) ** 2) / (r * r)
                if d < 1 and 0 <= xx < 256 and 0 <= yy < 152:
                    im.px[yy][xx] = P.steam[1] if (xx - cx) + (yy - cy) < -r * 0.2 else P.steam[0]
    return im


def south_pass(P):
    im = Img(256, 152)
    mountains(im, P.peak, base=100, height=60, seed=31, period=512, snow=P.snow, snowline=0.45)   # the Wind River Range, to the north
    for x in range(256):                                            # the range falls away, smoothly, to the broad saddle
        fall = 100 - max(0.0, 60 - max(0, x - 130) * 0.55) - (x - 130) * 0.02 if x > 130 else 0
        for y in range(0, 100):
            if x > 130 and im.px[y][x] and y < fall: im.px[y][x] = 0
    fill_rows(im, 100, 112, lambda x, y: P.sage[3] if y == 100 else P.sage[2] if y < 104 else P.sage[1])
    grass_band(im, P, 112)
    for k in range(70):                                             # sage on the plain
        x, y = hsh(k * 37) % 256, 103 + hsh(k * 11) % 9
        im.px[y][x] = P.sage[0]; im.px[y][(x + 1) % 256] = P.sage[0]
    for y in range(112, 152):                                       # the ruts, fanning toward the viewer
        for d in (-1, 1):
            x = int(128 + d * (4 + (y - 112) * 0.9))
            for w in range(2): im.px[y][x + w] = P.dirt[0]
    return im


def blue_mountains(P):
    im = Img(256, 152)
    half = Img(128, 152)
    mountains(half, P.far, base=84, height=36, seed=41, period=128)
    def ridge(m):
        crest = hills(m, P.mid, base=108, amp=10, period=128, seed=42, rim=False)
        for k in range(8):
            x = k * 16 + hsh(k) % 7; conifer(m, x, crest[x % 128] + 3, 14 + hsh(k) % 5, P.mid, seed=k)
    ridge(half)
    im.blit(half, 0, 0); im.blit(half, 128, 0)                     # drawn 128 wide and laid twice: shared tiles
    grass_band(im, P, 118)
    for y in range(118, 152):                                       # the road, switching down the slope
        cx = 128 + 40 * math.sin((y - 118) / 9)
        for x in range(int(cx - 6), int(cx + 6)): im.px[y][x % 256] = P.dirt[1 if hsh(x + y) % 4 else 0]
    pine = Img(40, 152); conifer(pine, 20, 152, 84, P.pine, seed=3)
    im.blit(pine, 0, 0); im.blit(pine.flip_h(), 216, 0)            # tall pines at the front, the right one the left mirrored
    return im


def the_dalles(P):
    im = Img(256, 152)
    for y in range(30, 104):                                        # Mount Hood, far down the gorge, its foot flaring into foothills
        half = (y - 30) * 0.9 + 1 + max(0, y - 76) ** 1.5 * 0.35
        for x in range(max(0, int(70 - half)), min(256, int(70 + half) + 1)):
            u = (x - (70 - half)) / max(1, 2 * half)
            snow = y < 54 + hsh(x // 2 * 7) % 7 + (3 if (x // 5) % 3 == 0 else 0)   # a ragged snowline
            im.px[y][x] = (P.snow[1] if u < 0.5 else P.snow[0]) if snow else (P.peak[1] if u < 0.45 else P.peak[0])
    for x in range(256):                                            # the far bank: a dark wooded ridge across the gorge, down to the water
        top = int(91 + 3 * math.sin(x / 13) + 2 * math.sin(x / 5.3) + hsh(x // 2) % 2)
        for y in range(top, 104): im.px[y][x] = P.peak[0] if y > top or hsh(x * 3) % 3 else P.peak[1]
    for side in (0, 1):                                             # the basalt walls of the gorge: columns of uneven width
        x, col = 0, 0
        while x < 112:
            w = 3 + hsh(col * 7 + side * 50) % 4
            for dx in range(w):
                edge = x + dx; xx = edge if side == 0 else 255 - edge
                top = int(58 + edge * 0.5 + hsh(col + side * 9) % 6)
                lit = (2 if side == 0 else 1) + (1 if dx == 1 and side == 0 else 0)   # the near wall lit, the far one in shade; faint joints
                for y in range(top, 118):
                    k = lit
                    if dx == w - 1 and hsh(y // 4 + col * 5) % 3 == 0: k = 0
                    if (y - top) % 14 == 13 and hsh(col + y) % 2: k = 0
                    if y == top: k = 3
                    im.px[y][xx] = P.basalt[k]
            x += w; col += 1
    for y in range(104, 136):                                       # the Columbia, wide and fast
        for x in range(256):
            if im.px[y][x] and y < 118: continue
            im.px[y][x] = P.water[2] if y < 108 else P.water[1] if hsh((x % 64) // 6 + (y // 2) * 7) % 5 else P.water[0]
            if (y % 4 == 0) and hsh((x % 128) // 5 + y * 3) % 9 == 0: im.px[y][x] = P.foam
    grass_band(im, P, 136)
    return im


def fort(P):
    im = Img(256, 152)
    fill_rows(im, 96, 110, lambda x, y: P.plain[1] if y > 96 else P.plain[0])
    grass_band(im, P, 110)
    x0, x1, top, base = 40, 216, 76, 112                            # the adobe walls, a gate in the middle
    for y in range(top, base):
        for x in range(x0, x1):
            k = 2 if (x - x0) % 32 < 28 else 1
            if y == top or y == top + 1: k = 3
            if hsh(x * 7 + y * 5) % 13 == 0: k = max(0, k - 1)
            im.px[y][x] = P.adobe[k]
    for bx in (x0 - 6, x1 - 18):                                    # the bastions at the corners, taller, with loopholes
        for y in range(top - 18, base):
            for x in range(bx, bx + 24):
                k = 3 if x < bx + 6 else 2 if x < bx + 18 else 1
                if y < top - 16: k = 3
                im.px[y][x] = P.adobe[k]
        for y in (top - 8, top + 6):
            for x in (bx + 6, bx + 16): im.px[y][x] = P.dark; im.px[y + 1][x] = P.dark
    for y in range(90, base):                                       # the gate: two wooden doors, one open
        for x in range(116, 140):
            im.px[y][x] = P.dark if x >= 128 else P.wood[1 if (x - 116) % 4 else 0]
    for y in range(36, top):                                        # the flagpole and a red pennant
        im.px[y][128] = P.wood[0]
    for y in range(36, 46):
        for x in range(129, 129 + (46 - y) * 2 // 2 + 6 - abs(y - 41)):
            im.px[y][x] = P.red
    return im


def river(P):
    im = Img(256, 152)
    for k in range(24):                                             # cottonwoods along the far bank
        x = k * 11 + hsh(k) % 6
        r = 9 + hsh(k * 3) % 6
        for y in range(int(96 - r * 1.6), 100):
            for xx in range(int(x - r), int(x + r)):
                u = (xx - x) / r; v = (y - (96 - r * 0.8)) / (r * 0.9)
                if u * u + v * v < 1 and 0 <= xx < 256:
                    im.px[y][xx] = P.tree[2 if u < -0.3 and v < 0 else 1 if u < 0.3 else 0]
    fill_rows(im, 100, 104, lambda x, y: P.sand[1])
    for y in range(104, 136):                                       # the water: the far bank's reflection, then ripples
        for x in range(256):
            c = P.water[3] if y < 108 else P.water[2] if y < 114 else P.water[1]
            if hsh((x % 64) // 4 * 7 + y * 3) % 6 == 0: c = P.water[0]
            if (y % 5 == 0) and hsh(x // 6 + y) % 3 == 0: c = P.foam if y > 120 else P.water[3]
            im.px[y][x] = c
    fill_rows(im, 136, 142, lambda x, y: P.sand[2] if y == 136 else P.sand[1] if hsh(x // 4 + y) % 4 else P.sand[0])
    grass_band(im, P, 142)
    return im


def willamette(P):
    im = Img(256, 152)
    for y in range(28, 92):                                         # Mount Hood over the valley
        half = (y - 28) * 1.1 + 1
        for x in range(int(190 - half), int(190 + half) + 1):
            if 0 <= x < 256:
                u = (x - (190 - half)) / max(1, 2 * half)
                snow = y < 52 + hsh(x // 2 * 7) % 7 + (3 if (x // 5) % 3 == 0 else 0)
                im.px[y][x] = (P.snow[1] if u < 0.5 else P.snow[0]) if snow else (P.peak[1] if u < 0.45 else P.peak[0])
    hills(im, P.green, base=100, amp=10, period=256, seed=51, rim=False)
    rows = [(100, 107), (108, 117), (118, 131), (132, 152)]          # fields in rows that widen toward the viewer, hedges between
    for r, (y0, y1) in enumerate(rows):
        x, f = -hsh(r * 9) % 40, 0
        while x < 256:
            w = (30 + hsh(r * 31 + f) % 40) * (1 + r * 0.5); kind = hsh(r * 13 + f * 7) % 3
            for xx in range(max(0, int(x)), min(256, int(x + w))):
                for y in range(y0, y1):
                    edge = xx == int(x) or y == y0
                    im.px[y][xx] = P.green[0] if edge else P.field[1 + (y % 3 == 0)] if kind == 0 else P.green[2 if kind == 1 else 1] if (y + xx // 3) % 4 else P.green[3 if kind == 1 else 2]
            x += w; f += 1
    for y in range(112, 152):                                       # the river through the valley
        cx = 70 + 30 * math.sin(y / 11) + (y - 112) * 0.8
        for x in range(int(cx - 3 - (y - 112) * 0.12), int(cx + 3 + (y - 112) * 0.12)):
            if 0 <= x < 256: im.px[y][x] = P.water[1 if (x + y) % 5 else 0]
    for y in range(120, 132):                                       # a cabin of logs
        for x in range(150, 172): im.px[y][x] = P.wood[1 if (y - 120) % 3 else 0]
    for y in range(112, 120):
        for x in range(146 + (120 - y) * 1, 176 - (120 - y) * 1): im.px[y][x] = P.wood[0]
    return im


SCENE_PAINT = {'INDEPENDENCE ROCK': independence_rock, 'SODA SPRINGS': soda_springs, 'SOUTH PASS': south_pass, 'BLUE MOUNTAINS': blue_mountains,
               'THE DALLES': the_dalles, 'FORT': fort, 'RIVER': river, 'WILLAMETTE VALLEY': willamette}
