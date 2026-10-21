"""Textures for the art kit (docs/dev/snes-picture.md, part B): materials that fill an area without it looking flat,
each a picture that repeats seamlessly at its own size (so a 64 x 64 patch can cover a whole floor), lit from the upper
left and shaded along a ramp.

    from kit import *
    floor = texture('tiles', 64, 64, pal.tile, size=16)      # glazed tiles in a grid, 16 px each
    wall = texture('brick', 64, 32, pal.brick)
    grass = texture('grass', 32, 16, pal.grass, seed=3)
    for v in variants('dirt', pal.dirt, 4): ...               # four 8 x 8 tiles of one material, to scatter (tile_fill)
    ground = tile_fill(256, 64, variants('dirt', pal.dirt, 4))  # an area covered by them in a random order: 4 tiles

texture(kind, w, h, ramp, seed=0, **options): kinds and their options
  grass     blades with lit tips and dark roots                         density=0.5
  dirt      soft lumps and pebbles                                      pebbles=0.06
  sand      fine speckle and ripples                                    ripples=True
  snow      soft drifts, blue-grey hollows
  stone     cobbles: rounded stones with dark gaps                      size=10
  brick     bricks in courses, mortar the darkest step, each lit on top  w=16, h=8
  tiles     glazed square tiles, grout lines, a shine on each tile       size=16
  paving    paving slabs in offset rows (a pavement, a plaza)           w=24, h=12
  planks    boards with grain, dark seams and nails                     h=8, vertical=False
  bark      vertical grain and cracks
  leaves    foliage: clumps of small lit leaves (a hedge, a tree crown)  size=4
  water     dark depths with lines of light on the waves
  metal     brushed bands and rivets                                    rivets=16
  fence     chain-link: diamonds of wire (transparent between)          size=8
  rope      a twisted rope lying left to right (h px thick)

The ramp is a tuple of palette indices dark to light (pal.brick); a material looks best with 4 to 6 steps.
"""
import math

_BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]


def _hash(*v):
    n = 0x9e3779b9
    for x in v:
        n = ((n ^ (int(x) & 0xffffffff)) * 0x85ebca6b) & 0xffffffff
        n ^= n >> 13
    n = (n * 0xc2b2ae35) & 0xffffffff
    return (n ^ (n >> 16)) / 0xffffffff


def noise(x, y, scale, seed=0, period=None):
    """Smooth value noise from 0 to 1 at (x, y), with features about `scale` pixels apart. With period=(pw, ph) in
    pixels (multiples of scale) it repeats exactly every pw across and ph down."""
    gx, gy = x / scale, y / scale
    ix, iy = math.floor(gx), math.floor(gy)
    fx, fy = gx - ix, gy - iy
    px = max(1, round(period[0] / scale)) if period else None
    py = max(1, round(period[1] / scale)) if period else None
    def at(i, j):
        if px: i %= px
        if py: j %= py
        return _hash(i, j, seed)
    sx, sy = fx * fx * (3 - 2 * fx), fy * fy * (3 - 2 * fy)
    a = at(ix, iy) + (at(ix + 1, iy) - at(ix, iy)) * sx
    b = at(ix, iy + 1) + (at(ix + 1, iy + 1) - at(ix, iy + 1)) * sx
    return a + (b - a) * sy


def fbm(x, y, scale, seed=0, octaves=3, period=None):
    """Noise of several sizes added (fractal), 0 to 1: lumps with detail."""
    total, amp, norm = 0.0, 1.0, 0.0
    for o in range(octaves):
        s = scale / (2 ** o)
        if s < 1: break
        total += amp * noise(x, y, s, seed + o * 101, period)
        norm += amp; amp *= 0.5
    return total / norm


def level(ramp, I, x, y, dither=0.2):
    """The ramp index for an intensity I (0 dark to 1 light) at (x, y), dithered over `dither` of each step's edge."""
    n = len(ramp)
    f = min(max(I, 0.0), 0.9999) * n
    k = int(f); t = f - k
    if dither and k < n - 1 and t > 1 - dither and _BAYER[y & 3][x & 3] < (t - (1 - dither)) / dither * 16: k += 1
    return ramp[k]


def _cells(x, y, size, seed, period, jitter=0.8):
    """Voronoi: (distance to the nearest feature point, to the second, the nearest point's offset (dx, dy), its id)."""
    cx, cy = math.floor(x / size), math.floor(y / size)
    pw = max(1, round(period[0] / size)) if period else None
    ph = max(1, round(period[1] / size)) if period else None
    best = [(1e9, 0, 0, 0), (1e9, 0, 0, 0)]
    for j in (-1, 0, 1):
        for i in (-1, 0, 1):
            ci, cj = cx + i, cy + j
            ki, kj = (ci % pw if pw else ci), (cj % ph if ph else cj)
            fx = (ci + 0.5 + (_hash(ki, kj, seed, 1) - 0.5) * jitter) * size
            fy = (cj + 0.5 + (_hash(ki, kj, seed, 2) - 0.5) * jitter) * size
            d = math.hypot(x - fx, y - fy)
            item = (d, x - fx, y - fy, ki * 7919 + kj)
            if d < best[0][0]: best = [item, best[0]]
            elif d < best[1][0]: best[1] = item
    return best[0][0], best[1][0], best[0][1], best[0][2], best[0][3]


def texture(kind, w, h, ramp, seed=0, **o):
    from kit import Img
    if not ramp: raise ValueError('texture needs a ramp of palette indices (e.g. pal.brick)')
    ramp = tuple(ramp)
    n = len(ramp)
    P = (w, h)
    img = Img(w, h)
    put = lambda x, y, c: img.px[y].__setitem__(x, c)
    if kind == 'grass':
        # a calm two-tone base, then tufts: a dark gap at the root and three to five blades fanning out, lit at the tips
        mid = ramp[max(1, n // 2 - 1):max(2, n // 2 + 1)]
        for y in range(h):
            for x in range(w): put(x, y, level(mid, 0.3 + 0.5 * fbm(x, y, 10, seed, 2, P), x, y, 0.15))
        count = int(w * h * o.get('density', 0.5) / 10)
        for k in range(count):
            bx, by = int(_hash(k, seed, 3) * w), int(_hash(k, seed, 4) * h)
            blades = 3 + int(_hash(k, seed, 5) * 3)
            for b in range(blades):
                lean = b - blades // 2
                L = 3 + int(_hash(k, b, seed, 6) * 3) - abs(lean) // 2
                for j in range(L):
                    x, y = (bx + lean * j // max(2, L - 1)) % w, (by - j) % h
                    put(x, y, ramp[-1] if j == L - 1 else ramp[-2] if j >= L // 2 else ramp[max(1, n - 3)])
            put(bx % w, (by + 1) % h, ramp[0]); put((bx - 1) % w, (by + 1) % h, ramp[1] if n > 2 else ramp[0])
    elif kind == 'dirt':
        body = ramp[1:-1] if n > 3 else ramp
        for y in range(h):
            for x in range(w): put(x, y, level(body, 0.2 + 0.6 * fbm(x, y, 12, seed, 3, P), x, y, 0.3))
        for k in range(int(w * h * o.get('pebbles', 0.06) / 4)):
            px, py = int(_hash(k, seed, 7) * w), int(_hash(k, seed, 8) * h)
            put(px, py, ramp[-1]); put((px + 1) % w, py, ramp[-2]); put(px, (py + 1) % h, ramp[1]); put((px + 1) % w, (py + 1) % h, ramp[0])
    elif kind == 'sand':
        for y in range(h):
            for x in range(w):
                r = math.sin((y + 4 * fbm(x, y, 16, seed, 2, P)) * 2 * math.pi / max(4, h / max(1, round(h / 6)))) if o.get('ripples', True) else 0
                I = 0.55 + 0.12 * r + 0.15 * (fbm(x, y, 6, seed + 9, 2, P) - 0.5)
                if _hash(x, y, seed, 9) < 0.04: I += 0.25
                put(x, y, level(ramp, I, x, y))
    elif kind == 'snow':
        for y in range(h):
            for x in range(w):
                put(x, y, level(ramp, 0.45 + 0.6 * (fbm(x, y, 16, seed, 3, P) - 0.3), x, y, 0.4))
    elif kind == 'stone':
        size = o.get('size', 10)
        for y in range(h):
            for x in range(w):
                d1, d2, dx, dy, cid = _cells(x + 0.5, y + 0.5, size, seed, P)
                if d2 - d1 < 1.4: put(x, y, ramp[0]); continue
                r = size * 0.55
                t = min(1.0, d1 / r)
                nz = math.sqrt(max(0.05, 1 - t * t))
                I = 0.5 + 0.45 * ((-dx - dy) / (r * 1.6)) + 0.25 * (nz - 0.5) + 0.25 * (_hash(cid, seed) - 0.5)
                put(x, y, level(ramp[1:] if n > 3 else ramp, I, x, y))
    elif kind in ('brick', 'paving'):
        bw, bh = o.get('w', 16 if kind == 'brick' else 24), o.get('h', 8 if kind == 'brick' else 12)
        for y in range(h):
            row = y // bh
            off = (bw // 2) * (row % 2)
            for x in range(w):
                u, v = (x + off) % bw, y % bh
                bid = ((x + off) // bw) % max(1, w // bw), row
                if v == bh - 1 or u == bw - 1: put(x, y, ramp[0]); continue          # mortar on the bottom and right
                tone = 0.55 + 0.3 * (_hash(bid[0], bid[1], seed) - 0.5)
                if v == 0 or u == 0: tone += 0.28                                  # lit top and left edges
                elif v == bh - 2 or u == bw - 2: tone -= 0.22                       # shaded lower and right edges
                tone += 0.18 * (fbm(x, y, 4, seed + 5, 2, P) - 0.5)
                put(x, y, level(ramp[1:] if n > 3 else ramp, tone, x, y))
    elif kind == 'tiles':
        size = o.get('size', 16)
        for y in range(h):
            for x in range(w):
                u, v = x % size, y % size
                if u == size - 1 or v == size - 1: put(x, y, ramp[0]); continue
                I = 0.6 - 0.25 * (u + v) / (2 * size)
                if u == 0 or v == 0: I += 0.2
                d = (u - v) - size * 0.2                                             # a diagonal shine near the top left
                if 0 <= d < 2 and u + v < size * 1.1: I = 1.0
                put(x, y, level(ramp[1:] if n > 3 else ramp, I, x, y, 0.1))
    elif kind == 'planks':
        ph, vert = o.get('h', 8), o.get('vertical', False)
        for y in range(h):
            for x in range(w):
                a, b = (y, x) if vert else (x, y)
                along, across = a, b
                board = across // ph
                v = across % ph
                if v == ph - 1: put(x, y, ramp[0]); continue
                grain = math.sin((along * 0.15 + 3 * fbm(along, across, 16, seed + board, 2, P)) * 2) * 0.5 + 0.5
                I = 0.45 + 0.25 * grain + 0.2 * (_hash(board, seed) - 0.5)
                if v == 0: I += 0.2
                put(x, y, level(ramp[1:] if n > 3 else ramp, I, x, y))
                if v == ph // 2 and (along + board * 13) % 32 == 3: put(x, y, ramp[0])  # a nail
    elif kind == 'bark':
        for y in range(h):
            for x in range(w):
                s = math.sin((x + 3 * fbm(x, y, 8, seed, 2, P)) * 2 * math.pi / 5)
                I = 0.45 + 0.3 * s + 0.15 * (fbm(x, y, 4, seed + 3, 2, P) - 0.5)
                if s < -0.85: I = 0.05
                put(x, y, level(ramp, I, x, y))
    elif kind == 'leaves':
        size = o.get('size', 4)
        for y in range(h):
            for x in range(w): put(x, y, ramp[0])
        count = int(w * h / (size * size) * 1.6)
        for k in range(count):                                                       # leaves, back to front
            cx, cy = _hash(k, seed, 11) * w, _hash(k, seed, 12) * h
            depth = k / count
            for j in range(-size, size + 1):
                for i in range(-size, size + 1):
                    d = math.hypot(i, j)
                    if d > size: continue
                    I = 0.25 + 0.55 * depth + 0.35 * (-(i + j) / (size * 2))
                    if d > size - 1 and i + j > 0: I -= 0.3
                    x, y = int(cx + i) % w, int(cy + j) % h
                    img.px[y][x] = level(ramp, I, x, y, 0.15)
    elif kind == 'water':
        # a calm body in two tones, and short horizontal glints where the waves catch the light
        for y in range(h):
            for x in range(w): put(x, y, level(ramp[:max(2, n - 2)], 0.35 + 0.5 * fbm(x, y, 16, seed, 2, P), x, y, 0.25))
        for k in range(int(w * h / 40)):
            gx, gy = int(_hash(k, seed, 13) * w), int(_hash(k, seed, 14) * h)
            L = 2 + int(_hash(k, seed, 15) * 6)
            for i in range(L):
                put((gx + i) % w, gy, ramp[-1] if 0 < i < L - 1 else ramp[-2])
            for i in range(1, L - 1): put((gx + i) % w, (gy + 1) % h, ramp[max(0, n - 4)])
    elif kind == 'metal':
        riv = o.get('rivets', 16)
        for y in range(h):
            for x in range(w):
                I = 0.55 + 0.25 * math.sin(y * 0.4 + fbm(x, y, 32, seed, 1, P) * 3) * 0.5 + 0.1 * (_hash(y, seed) - 0.5)
                if riv and x % riv in (riv // 2 - 1, riv // 2) and y % riv in (riv // 2 - 1, riv // 2):
                    I = 1.0 if (x % riv, y % riv) == (riv // 2 - 1, riv // 2 - 1) else 0.15
                put(x, y, level(ramp, I, x, y))
    elif kind == 'fence':
        size = o.get('size', 8)
        for y in range(h):
            for x in range(w):
                a, b = (x + y) % size, (x - y) % size
                if a == 0 or b == 0:
                    put(x, y, ramp[-1] if a == 0 and (x // 2) % 2 == 0 else ramp[max(0, n - 3)] if a == 0 else ramp[max(0, n - 2)])
    elif kind == 'rope':
        for y in range(h):
            for x in range(w):
                t = (y + 0.5) / h * 2 - 1
                round_ = math.sqrt(max(0.0, 1 - t * t))
                strand = ((x * 1.0 + y * 1.4) % 6) / 6
                I = 0.25 + 0.55 * round_ * (0.6 + 0.4 * math.sin(strand * math.pi)) - 0.25 * t
                if strand < 0.12: I -= 0.35
                put(x, y, level(ramp, I, x, y, 0.1))
    else:
        raise ValueError('texture: no kind %r (grass, dirt, sand, snow, stone, brick, paving, tiles, planks, bark, leaves, water, metal, fence, rope)' % kind)
    return img


def variants(kind, ramp, n=4, size=8, seed=0, **o):
    """n different tiles (size x size) of one material that join seamlessly in any order, to scatter over an area with
    tile_fill(): all share the first one's edges (two pixels deep) and differ inside."""
    base = texture(kind, size, size, ramp, seed=seed * 31 + 1, **o)
    out = [base]
    for k in range(1, n):
        other = texture(kind, size, size, ramp, seed=seed * 31 + k * 977 + 1, **o)
        v = base.copy()
        for y in range(2, size - 2):
            for x in range(2, size - 2): v.px[y][x] = other.px[y][x]
        out.append(v)
    return out


def tile_fill(w, h, tiles, seed=0, weights=None):
    """An area w x h covered by the given tiles in a fixed random order (a hash of the cell): many cells for the cost of
    len(tiles) tiles, without a visible pattern. weights (one number each) makes some more common."""
    from kit import Img
    weights = weights or [1] * len(tiles)
    total = sum(weights)
    tw, th = tiles[0].w, tiles[0].h
    img = Img(w, h)
    for cy in range(0, h, th):
        for cx in range(0, w, tw):
            r = _hash(cx // tw, cy // th, seed) * total
            k = 0
            while r > weights[k] and k < len(tiles) - 1: r -= weights[k]; k += 1
            img.blit(tiles[k], cx, cy)
    return img
