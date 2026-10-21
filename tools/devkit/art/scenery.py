"""Scenery for the art kit (docs/dev/snes-picture.md, part B): the pieces of a layered background, drawn into an Img
with ramps. With wrap=True (the default) a piece that crosses the right edge comes back on the left, so the picture
repeats seamlessly as a scrolling layer (BG layers wrap); keep widths at 256 or 512 and use period= on the shapes that
take one, so tiles repeat and the scene stays within the tile budget.

    from kit import *
    far = Img(512, 224)
    sky(far, pal.sky)                                    # a dithered gradient, the ramp's first step at the top
    stars(far, [pal.star, pal.sky[-1]], y1=120)
    orb(far, 400, 70, 14, pal.sun, glow=pal.sky)         # a sun with a glow into the sky's ramp
    clouds(far, pal.cloud, y0=20, y1=90, count=6)
    mountains(far, pal.rock, base=150, height=70, snow=pal.snow)
    near = Img(512, 224)
    hills(near, pal.hill, base=170, amp=12)
    treeline(near, pal.leaf, base=176, size=12)
    floor(img, texture('tiles', 64, 64, pal.tile), horizon=120)   # a texture laid flat in perspective

  sky(img, ramp, y0, y1, reverse)            a gradient top (the ramp's first step) to bottom, dithered between steps
  stars(img, colours, density, y0, y1)       single pixels; a few bright ones get a cross
  orb(img, cx, cy, r, ramp, glow, kind)      kind 'sun' (bands, lightest in the middle) or 'moon' (lit from the left, craters)
  clouds(img, ramp, count, y0, y1, size)     cumulus, lit from above, flat-bottomed
  mountains(img, ramp, base, height, ...)    a range: ridges with lit and shaded facets; snow=ramp caps the faces that point up
  hills(img, ramp, base, amp, period)        rounded hills, lit on top
  treeline(img, ramp, base, size, spacing)   round tree crowns side by side, lit from the upper left
  floor(img, tex, horizon, ...)              a texture in perspective below the horizon (a fixed floor; BG2's affine
                                             mode gives a moving one)
  rope(img, points, thickness, ramp)         a twisted rope along a path of points
  ellipse(w, h, colour)                      a flat ellipse: a contact shadow to draw with blend({ op: 'sub' })
"""
import math
from texture import fbm, noise, level, _hash
from shade import shaded

_BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]


def _set(img, x, y, c, wrap=True):
    x, y = int(x), int(y)
    if wrap: x %= img.w
    if 0 <= x < img.w and 0 <= y < img.h: img.px[y][x] = c


def _blit(img, src, x, y, wrap=True):
    for j in range(src.h):
        for i in range(src.w):
            if src.px[j][i]: _set(img, x + i, y + j, src.px[j][i], wrap)


def sky(img, ramp, y0=0, y1=None, reverse=False, dither=0.4):
    """Rows y0 to y1 in bands of the ramp: its first step at the top (the darkest, for a night or a deep blue), the
    last at the bottom (reverse=True turns it over). Each band is solid, and the last `dither` of it fades into the next
    in a 4 x 4 dither, as SNES skies do (0 for hard bands, 1 for a dither all the way)."""
    y1 = img.h if y1 is None else y1
    cs = list(ramp)[::-1] if reverse else list(ramp)
    n = len(cs)
    for y in range(y0, y1):
        f = (y - y0) / max(1, y1 - y0) * n
        k, t = min(n - 1, int(f)), f - int(f)
        nxt = dither and k < n - 1 and t > 1 - dither
        for x in range(img.w):
            img.px[y][x] = cs[k + 1] if nxt and _BAYER[y & 3][x & 3] < (t - (1 - dither)) / dither * 16 else cs[k]
    return img


def stars(img, colours, density=0.004, y0=0, y1=None, seed=0):
    """Stars: single pixels in the given colours (indices, dimmest first); one in eight of the brightest gets a cross."""
    y1 = img.h if y1 is None else y1
    count = int(img.w * (y1 - y0) * density)
    for k in range(count):
        x, y = int(_hash(k, seed, 21) * img.w), y0 + int(_hash(k, seed, 22) * (y1 - y0))
        c = colours[int(_hash(k, seed, 23) * len(colours))]
        img.px[y][x] = c
        if c == colours[-1] and _hash(k, seed, 24) < 0.125:
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)): _set(img, x + dx, y + dy, colours[max(0, len(colours) - 2)])
    return img


def orb(img, cx, cy, r, ramp, glow=None, kind='sun', seed=0, wrap=True):
    """A sun (concentric bands of the ramp, lightest in the middle) or a moon (a sphere lit from the left with a few
    craters). glow= a ramp of the sky's colours (dark to light): a dithered halo, lightest next to the disc."""
    n = len(ramp)
    if glow:
        gn = len(glow)
        R = r * 2.2
        for y in range(int(cy - R), int(cy + R) + 1):
            for x in range(int(cx - R), int(cx + R) + 1):
                d = math.hypot(x + 0.5 - cx, y + 0.5 - cy)
                if r < d <= R:
                    t = 1 - (d - r) / (R - r)          # 1 next to the disc, 0 at the halo's edge
                    f = t * (gn - 1)
                    k = int(f)
                    if _BAYER[y & 3][x & 3] < (f - k) * 16: k += 1
                    if k > 0 or t > 0.15: _set(img, x, y, glow[min(gn - 1, k)], wrap)
    for y in range(int(cy - r) - 1, int(cy + r) + 2):
        for x in range(int(cx - r) - 1, int(cx + r) + 2):
            dx, dy = x + 0.5 - cx, y + 0.5 - cy
            d = math.hypot(dx, dy)
            if d > r: continue
            if kind == 'sun':
                c = ramp[min(n - 1, int((1 - d / r) * n * 1.4))]
            else:
                nz = math.sqrt(max(0.0, 1 - (d / r) ** 2))
                I = 0.2 + 0.85 * max(0.0, (-dx / r) * 0.8 + nz * 0.6)
                cr = noise(x - cx, y - cy, max(2, r / 3), seed)
                if cr > 0.72: I -= 0.3
                elif cr > 0.66: I += 0.15
                c = level(ramp, I, x, y, 0.2)
            _set(img, x, y, c, wrap)
    return img


def clouds(img, ramp, count=5, y0=10, y1=80, size=(24, 56), seed=0, wrap=True):
    """Cumulus clouds: round puffs, biggest in the middle, on a flat base; each puff lit from above, so the tops are the
    ramp's lightest step and the base its darkest."""
    from kit import Img
    n = len(ramp)
    for k in range(count):
        w = int(size[0] + _hash(k, seed, 31) * (size[1] - size[0]))
        h = max(8, int(w * 0.5))
        cx = _hash(k, seed, 32) * img.w
        cy = y0 + _hash(k, seed, 33) * max(1, (y1 - y0 - h))
        puffs = []
        m = 2 + int(w / 14)
        top = int(h * 1.6) + 2                          # room above the base for the tallest puff
        for p in range(m):
            u = (p + 0.5) / m
            r = h * (0.28 + 0.42 * math.sin(math.pi * u) ** 1.5) * (0.85 + 0.3 * _hash(k, p, seed))
            puffs.append((2 + u * w, top - r * 0.85, r))
        out = Img(w + 4, top + 2)
        h = top - 1                                     # the base row
        cy -= top - int(w * 0.5)
        for y in range(out.h):
            for x in range(out.w):
                if y > h + 1: continue
                best = None
                for (px, py, r) in puffs:                  # the puff nearest the viewer: the one this pixel is deepest in
                    d = math.hypot(x + 0.5 - px, y + 0.5 - py)
                    if d <= r and (best is None or (r - d) / r > best[0]): best = ((r - d) / r, px, py, r)
                if not best: continue
                _, px, py, r = best
                ny = (y + 0.5 - py) / r                     # -1 at the puff's top, 1 at its bottom
                I = 0.62 - 0.55 * ny - 0.25 * (y / (h + 1)) + 0.1 * ((px - (x + 0.5)) / r)
                out.px[y][x] = level(ramp, I, x, y, 0.2)
                if y == h + 1: out.px[y][x] = ramp[0]
        _blit(img, out, cx - w / 2, cy, wrap)
    return img


def mountains(img, ramp, base, height, seed=0, period=None, snow=None, snowline=0.35, jag=1.0, light=(-1, -0.6), wrap=True):
    """A mountain range standing on row `base`, peaks up to `height` above it: a ridge line from noise (repeating every
    `period` px across, by default the picture's width), faces lit or shaded by the light, creases down the slopes.
    snow= a ramp caps the upper faces that point up. Returns the ridge (the top row of each column)."""
    period = period or img.w
    P = (period, 1024)
    ridge = []
    for x in range(img.w):
        r = 1 - abs(2 * fbm(x, 0, 64, seed, 3, P) - 1)            # ridged noise: sharp peaks
        ridge.append(base - int(height * (0.35 + 0.65 * r ** (1.0 + jag * 0.5))))
    lx, ly = light
    n = len(ramp)
    for x in range(img.w):
        top = ridge[x]
        for y in range(max(0, top), min(img.h, base + 1)):
            depth = (y - top) / max(1, base - top)
            # the surface: the ridge's slope across, plus creases running down the face
            sx = (ridge[(x + 2) % img.w] - ridge[(x - 2) % img.w]) / 4
            # creases: the slope across of ridged noise (sharp valleys running every way, as eroded rock)
            rg = lambda u: 1 - abs(2 * fbm(u, y, 20, seed + 7, 2, (period, 4096)) - 1)
            crease = (rg(x + 1) - rg(x - 1)) * 4
            nx = -sx * 0.7 + crease
            I = 0.55 + 0.45 * (nx * -lx) - 0.25 * depth
            if snow and depth < snowline * (0.6 + 0.8 * noise(x, 0, 12, seed + 3, (period, 64))) and I > 0.42:
                img.px[y][x] = level(snow, I + 0.1, x, y, 0.25)
            else:
                img.px[y][x] = level(ramp, I, x, y, 0.25)
    return ridge


def hills(img, ramp, base, amp=16, period=None, seed=0, rim=True):
    """Rounded hills from row base - amp to the bottom of the picture: the crest lit (rim) and the hill darkening
    downwards. Returns the crest (the top row of each column)."""
    period = period or img.w
    crest = []
    for x in range(img.w):
        t = 2 * math.pi * x / period
        crest.append(int(base - amp * (0.55 + 0.3 * math.sin(t + seed) + 0.15 * math.sin(3 * t + 1.7 * seed))))
    for x in range(img.w):
        c0 = crest[x]
        slope = (crest[(x + 1) % img.w] - crest[(x - 1) % img.w]) / 2
        for y in range(max(0, c0), img.h):
            d = y - c0
            I = 0.62 - 0.004 * d * 4 + 0.25 * slope * 0.3
            if rim and d < 2: I = 0.95 if slope > -0.2 else 0.75
            img.px[y][x] = level(ramp, I, x, y, 0.25)
    return crest


def treeline(img, ramp, base, size=12, spacing=None, seed=0, wrap=True):
    """Round tree crowns side by side along row `base` (two heights alternating), each lit from the upper left with
    leaves in its texture; the gaps below them filled with the ramp's darkest step down to the bottom."""
    from kit import Img
    spacing = spacing or int(size * 1.5)
    count = max(1, img.w // spacing)
    for k in range(count):
        r = size * (0.8 + 0.35 * _hash(k, seed, 41))
        cx = (k + 0.5) * (img.w / count) + (_hash(k, seed, 42) - 0.5) * spacing * 0.4
        cy = base - r * (0.6 + 0.5 * (k % 2))
        R = int(r) + 2
        mask = Img(2 * R, 2 * R).disc(R - 0.5, R - 0.5, r, 1)
        crown = shaded(mask, ramp, kind='dome', dither=0.2)
        for j in range(crown.h):                       # leaf speckle: small clumps lit on their upper left
            for i in range(crown.w):
                if crown.px[j][i] and _hash(i, j, k, seed) < 0.12:
                    crown.px[j][i] = ramp[min(len(ramp) - 1, ramp.index(crown.px[j][i]) + 1)] if crown.px[j][i] in ramp else crown.px[j][i]
                    if j + 1 < crown.h and crown.px[j + 1][i]: crown.px[j + 1][i] = ramp[max(0, ramp.index(crown.px[j + 1][i]) - 1)] if crown.px[j + 1][i] in ramp else crown.px[j + 1][i]
        _blit(img, crown, cx - R, cy - R, wrap)
    for x in range(img.w):
        for y in range(base, img.h):
            if not img.px[y][x]: img.px[y][x] = ramp[0]
    return img


def floor(img, tex, horizon, y1=None, scale=1.0, cx=None, ox=0, oz=0):
    """The texture `tex` laid flat below row `horizon`, seen in perspective: rows near the horizon are far away and
    squeezed, rows at the bottom near. scale sets how big a texture pixel is at the bottom row."""
    y1 = img.h if y1 is None else y1
    cx = img.w / 2 if cx is None else cx
    depth0 = (y1 - horizon) * scale
    for y in range(horizon + 1, y1):
        z = depth0 / (y - horizon)                     # distance to that row
        v = int(z * 8 + oz) % tex.h
        for x in range(img.w):
            u = int((x - cx) * z / scale / max(1e-6, depth0 / (y1 - horizon)) + ox) % tex.w
            c = tex.px[v][u]
            if c: img.px[y][x] = c
    return img


def rope(img, points, thickness, ramp, wrap=False):
    """A twisted rope along a path (a list of (x, y) points), `thickness` px across, shaded round, its strands slanting."""
    n = len(ramp)
    s = 0.0
    for (x0, y0), (x1, y1) in zip(points, points[1:]):
        L = math.hypot(x1 - x0, y1 - y0)
        if L == 0: continue
        tx, ty = (x1 - x0) / L, (y1 - y0) / L
        nx, ny = -ty, tx
        steps = int(L * 2) + 1
        for k in range(steps):
            a = k / steps
            px, py = x0 + (x1 - x0) * a, y0 + (y1 - y0) * a
            for j in range(thickness * 2):
                t = (j + 0.5) / (thickness * 2) * 2 - 1            # -1 .. 1 across
                strand = ((s + L * a) * 1.0 + t * thickness * 0.7) % 6 / 6
                I = 0.25 + 0.6 * math.sqrt(max(0.0, 1 - t * t)) * (0.6 + 0.4 * math.sin(strand * math.pi)) - 0.2 * t * (ny < 0 and -1 or 1)
                if strand < 0.12: I -= 0.35
                X, Y = px + nx * t * thickness / 2, py + ny * t * thickness / 2
                _set(img, X, Y, level(ramp, I, int(X), int(Y), 0.1), wrap)
        s += L
    return img


def ellipse(w, h, colour=1):
    """A flat ellipse filling w x h: a contact shadow under a character (a sprite in palettes 4 to 7, drawn with
    blend({ layers: ['spr'], op: 'sub' }) so it darkens what is under it)."""
    from kit import Img
    im = Img(w, h)
    for y in range(h):
        for x in range(w):
            if ((x + 0.5 - w / 2) / (w / 2)) ** 2 + ((y + 0.5 - h / 2) / (h / 2)) ** 2 <= 1: im.px[y][x] = colour
    return im
