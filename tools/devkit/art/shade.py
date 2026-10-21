"""Shading and edges for pictures drawn flat (docs/dev/snes-picture.md, part B). Sculpt (sculpt.py) makes shapes from 3D
parts; these work on any Img, with the palette's ramps (pal.grass, pal.step):

    leaf = shaded(mask, pal.leaf, kind='dome')     # any silhouette (non-zero pixels), lit and dithered along a ramp
    img = outline_sel(img, pal)                    # an outline around the outside, coloured from what it touches
    img = inline(img, pal)                         # the shape's own edge one step darker (the size does not change)
    img = rim(img, pal, light=(1, -1))             # the edge facing a second light one step lighter
    img = clean_lines(img, pal.edge)               # 'pixel-perfect' lines: no L-shaped corners in a 1 px line
    img = despeckle(img)                           # lone stray pixels take their neighbours' colour
    full = mirrored(left_half, odd=False)          # a symmetric picture from its left half
    p2 = recolour(img, {pal.shirt0: pal2.shirt0, ...})   # the same pixels in other colours (or roles: see Art.variant)

`light` is the direction the light comes from: (-1, -1) is the upper left, the default everywhere.
"""
import math

_BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]
_N4 = ((1, 0), (-1, 0), (0, 1), (0, -1))


def _edt1(f):
    """Squared distance transform of one line (Felzenszwalb and Huttenlocher)."""
    n = len(f)
    d, v, z = [0.0] * n, [0] * n, [0.0] * (n + 1)
    k = 0; v[0] = 0; z[0], z[1] = -1e20, 1e20
    for q in range(1, n):
        while True:
            p = v[k]
            sq = ((f[q] + q * q) - (f[p] + p * p)) / (2 * q - 2 * p)
            if sq <= z[k]:
                k -= 1
                if k < 0: k = 0; break
                continue
            break
        k += 1; v[k] = q; z[k] = sq; z[k + 1] = 1e20
    k = 0
    for q in range(n):
        while z[k + 1] < q: k += 1
        d[q] = (q - v[k]) ** 2 + f[v[k]]
    return d


def inner_distance(img):
    """For each pixel of a shape (non-zero), its distance to the nearest pixel outside it (0 outside), as rows of floats.
    The edge of the picture counts as outside."""
    W, H, INF = img.w + 2, img.h + 2, 1e12
    f = [[INF if 0 < x < W - 1 and 0 < y < H - 1 and img.px[y - 1][x - 1] else 0.0 for x in range(W)] for y in range(H)]
    cols = [_edt1([f[y][x] for y in range(H)]) for x in range(W)]
    rows = [_edt1([cols[x][y] for x in range(W)]) for y in range(H)]
    return [[math.sqrt(rows[y + 1][x + 1]) if img.px[y][x] else 0.0 for x in range(img.w)] for y in range(img.h)]


def _lit(nx, ny, nz, light, ambient, contrast):
    lx, ly = light[0], light[1]
    lz = light[2] if len(light) > 2 else 0.8
    l = math.sqrt(lx * lx + ly * ly + lz * lz)
    I = ambient + (1 - ambient) * max(0.0, (nx * lx + ny * ly + nz * lz) / l)
    return (I - 0.5) * contrast + 0.5


def shaded(mask, ramp, kind='dome', light=(-1, -1), ambient=0.12, contrast=1.35, dither=0.2, height=None):
    """A silhouette (the non-zero pixels of `mask`) shaded along `ramp` (indices dark to light) as if it bulged:
    kind 'dome' (round edges, flat top), 'pillow' (soft all over), 'cylinder-x' (a log lying left to right: shaded by
    height only), 'cylinder-y' (a pillar), 'cone' (a ridge along the middle), or 'flat' (one shade facing the light).
    Steps are dithered into each other over `dither` of their width; contrast above 1 splits light and shadow more
    clearly. Returns a new Img."""
    from kit import Img
    W, H = mask.w, mask.h
    out = Img(W, H)
    pts = [(x, y) for y in range(H) for x in range(W) if mask.px[y][x]]
    if not pts: return out
    if kind in ('cylinder-x', 'cylinder-y'):
        # per column (or row): the span of the shape, a half circle across it
        hmap = [[0.0] * W for _ in range(H)]
        if kind == 'cylinder-x':
            for x in range(W):
                ys = [y for y in range(H) if mask.px[y][x]]
                if not ys: continue
                a, b = min(ys), max(ys) + 1
                for y in ys: t = (y + 0.5 - a) / (b - a) * 2 - 1; hmap[y][x] = math.sqrt(max(0.0, 1 - t * t)) * (b - a) / 2
        else:
            for y in range(H):
                xs = [x for x in range(W) if mask.px[y][x]]
                if not xs: continue
                a, b = min(xs), max(xs) + 1
                for x in xs: t = (x + 0.5 - a) / (b - a) * 2 - 1; hmap[y][x] = math.sqrt(max(0.0, 1 - t * t)) * (b - a) / 2
    else:
        d = inner_distance(mask)
        dmax = max(max(r) for r in d) or 1
        h = height or dmax
        prof = {'dome': lambda t: math.sqrt(max(0.0, 1 - (1 - t) ** 2)), 'pillow': lambda t: 1 - (1 - t) ** 2,
                'cone': lambda t: t, 'flat': lambda t: 0.0}[kind]
        hmap = [[h * prof(min(1.0, v / dmax)) if v else 0.0 for v in r] for r in d]
    n = len(ramp)
    for x, y in pts:
        gx = (hmap[y][min(W - 1, x + 1)] - hmap[y][max(0, x - 1)]) / 2
        gy = (hmap[min(H - 1, y + 1)][x] - hmap[max(0, y - 1)][x]) / 2
        l = math.sqrt(gx * gx + gy * gy + 1)
        I = _lit(-gx / l, -gy / l, 1 / l, light, ambient, contrast)
        f = min(max(I, 0.0), 0.9999) * n
        k = int(f); t = f - k
        if dither and k < n - 1 and t > 1 - dither and _BAYER[y & 3][x & 3] < (t - (1 - dither)) / dither * 16: k += 1
        out.px[y][x] = ramp[k]
    return out


def _darkest(pal, c):
    found = pal.ramp_of(c) if pal is not None else None
    return found[0][0] if found else c


def outline_sel(img, pal, light=(-1, -1), colour=None):
    """An outline on the transparent pixels around each shape (the picture grows by a pixel where there is room):
    each outline pixel takes the darkest step of the ramp of the pixel it touches, and one step lighter on the side the
    light comes from (the SNES's selective outline). With `colour` (an index), that colour on the shadow side instead.
    Returns a new Img."""
    out = img.copy()
    lx, ly = light
    for y in range(img.h):
        for x in range(img.w):
            if img.px[y][x]: continue
            touch = [(dx, dy, img.get(x + dx, y + dy)) for dx, dy in _N4 if img.get(x + dx, y + dy)]
            if not touch: continue
            dx, dy, c = touch[0]
            # lit: this pixel is on the side of the shape the light comes from (the shape is at dx, dy from it)
            lit = (-dx * lx - dy * ly) > 0
            dark = _darkest(pal, c)
            if lit: out.px[y][x] = pal.step(dark, 1) if pal is not None else c
            else: out.px[y][x] = colour if colour is not None else dark
    return out


def inline(img, pal, light=(-1, -1), lit_step=1):
    """The shapes' own edge pixels (next to transparency) darkened to their ramp's darkest step, and `lit_step` steps
    above that where the light hits: an outline that does not make the sprite bigger. Returns a new Img."""
    out = img.copy()
    lx, ly = light
    for y in range(img.h):
        for x in range(img.w):
            c = img.px[y][x]
            if not c: continue
            gaps = [(dx, dy) for dx, dy in _N4 if not img.get(x + dx, y + dy)]
            if not gaps: continue
            dark = _darkest(pal, c)
            lit = any(dx * lx + dy * ly > 0 for dx, dy in gaps)
            out.px[y][x] = pal.step(dark, lit_step) if lit else dark
    return out


def rim(img, pal, light=(1, -1), steps=1):
    """Edge pixels facing a second light (by default from the upper right) made `steps` lighter along their ramp:
    a rim light, for night scenes and to lift a character off a dark background. Returns a new Img."""
    out = img.copy()
    lx, ly = light
    for y in range(img.h):
        for x in range(img.w):
            c = img.px[y][x]
            if not c: continue
            if any(not img.get(x + dx, y + dy) and dx * lx + dy * ly > 0 for dx, dy in _N4):
                out.px[y][x] = pal.step(c, steps)
    return out


def clean_lines(img, colours):
    """Remove the corner pixel of every L in lines of the given colour(s) (one index or several), so 1 px lines step
    cleanly ('pixel-perfect'). The removed pixel takes the colour of its neighbour inside the shape, or turns
    transparent. Returns a new Img."""
    cs = {colours} if isinstance(colours, int) else set(colours)
    out = img.copy()
    on = lambda x, y: out.get(x, y) in cs
    for y in range(img.h):
        for x in range(img.w):
            if not on(x, y): continue
            for (ax, ay), (bx, by) in (((0, -1), (-1, 0)), ((0, -1), (1, 0)), ((0, 1), (-1, 0)), ((0, 1), (1, 0))):
                if on(x + ax, y + ay) and on(x + bx, y + by) and not on(x - ax, y - ay) and not on(x - bx, y - by):
                    fill = [out.get(x - ax, y - ay), out.get(x - bx, y - by)]
                    out.px[y][x] = next((f for f in fill if f and f not in cs), 0)
                    break
    return out


def despeckle(img, keep=()):
    """Lone pixels (all four neighbours one other colour) take that colour: the stray dots that noise and dither
    leave. Colours in `keep` (eyes, stars, highlights) are left alone. Returns a new Img."""
    out = img.copy()
    for y in range(1, img.h - 1):
        for x in range(1, img.w - 1):
            c = img.px[y][x]
            if c in keep: continue
            n = {img.px[y + dy][x + dx] for dx, dy in _N4}
            if len(n) == 1 and c not in n and 0 not in n: out.px[y][x] = n.pop()
    return out


def mirrored(half, odd=False, axis='x'):
    """A symmetric picture from its left half (axis 'x') or top half ('y'). odd=True shares the half's last column
    (or row) as the centre, so the width is 2 * w - 1."""
    from kit import Img
    if axis == 'y':
        rows = [r[:] for r in half.px]
        rows += [r[:] for r in (half.px[-2::-1] if odd else half.px[::-1])]
        im = Img(half.w, len(rows)); im.px = rows; return im
    im = Img(half.w * 2 - (1 if odd else 0), half.h)
    for y, r in enumerate(half.px):
        im.px[y] = r[:] + (r[-2::-1] if odd else r[::-1])
    return im


def recolour(img, mapping):
    """The same picture with indices swapped by `mapping` ({old: new}); a ramp may be mapped to a ramp of the same
    length ({pal.shirt: pal.coat}). Returns a new Img."""
    m = {}
    for a, b in mapping.items():
        if isinstance(a, tuple):
            if not isinstance(b, tuple) or len(a) != len(b): raise ValueError('recolour: a ramp maps to a ramp of the same length')
            m.update(zip(a, b))
        else: m[a] = b
    out = img.copy()
    out.px = [[m.get(v, v) for v in r] for r in img.px]
    return out
