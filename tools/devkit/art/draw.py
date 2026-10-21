"""Draw characters as a pixel artist does: designed 2D shapes in a few flat tones, not lit 3D volumes. A Canvas takes
vector shapes (polygons, smooth blobs, ellipses, tapered brush strokes) in pixel units, fills them at several samples a
pixel, and turns them into pixels a cluster at a time; then exact 1 px ink (lines and dots) goes on top, then an
outline, then a tidy pass that folds stray pixels into their surroundings.

    from kit import *
    d = Canvas(48, 64)
    d.fill(oval(24, 20, 12, 13), pal.skin[3], part='head')       # a part: a shape, remembered by name
    d.shadow('head', pal.skin[2], light=(1, -1), depth=3)           # its shadow side: a crescent away from the light
    d.fill(blob([(14, 22), (34, 22), (30, 28)]), pal.skin[2], inside='head')   # a plane, clipped to the part
    d.ink(curve([(18, 30), (24, 31), (30, 30)]), pal.skin[0])        # a pixel-exact line (a mouth)
    img = d.render(outline=pal)                                      # outline: the selective outline from a palette

Why it looks better than sculpting for figures: every tone is a shape somebody chose, so the clusters are big and clean
(no dither, no speckle), the shading follows planes (a brow, a cheekbone, a jaw) instead of a ball's gradient, and
small features (eyes, mouths) are drawn exactly, a pixel at a time. `speckle(img)` measures what is left to clean.

Shapes (lists of (x, y) points; a list of several is one shape with holes, filled by the non-zero rule):
  oval(cx, cy, rx, ry, rot=0)   blob(pts)  a smooth closed curve through the points   poly(pts)  as given
  curve(pts)  a smooth open curve (for ink)   brush(pts, w0, w1)  a stroke tapering from width w0 to w1
  move(pts, dx, dy), scale(pts, k, cx, cy), flipx(pts, cx)
Canvas operations (each takes inside=part to clip to a part, outside=part to keep out of one, pri= its weight when
samples are counted into pixels, higher for small features that must survive):
  fill(shape, c, part=)   shadow(part, c, light, depth)   light(part, c, light, inset, width)   cut(shape)
  ink(pts, c)   dot(x, y, c)   seam(part, c)   render(outline=, tidy=)
"""
import math

_N4 = ((1, 0), (-1, 0), (0, 1), (0, -1))
_N8 = _N4 + ((1, 1), (-1, 1), (1, -1), (-1, -1))


# --- shapes ---
def oval(cx, cy, rx, ry, rot=0.0, n=None):
    """An ellipse as a polygon; rot in degrees."""
    n = n or max(16, int(2 * math.pi * max(rx, ry) * 1.5))
    c, s = math.cos(math.radians(rot)), math.sin(math.radians(rot))
    out = []
    for i in range(n):
        a = 2 * math.pi * i / n
        x, y = rx * math.cos(a), ry * math.sin(a)
        out.append((cx + x * c - y * s, cy + x * s + y * c))
    return out


def _cr(p0, p1, p2, p3, t):
    t2, t3 = t * t, t * t * t
    return tuple(0.5 * ((2 * b) + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3)
                 for a, b, c, d in zip(p0, p1, p2, p3))


def _spline(pts, closed, k):
    pts = [tuple(p) for p in pts]
    if len(pts) < 3: return pts
    n, out = len(pts), []
    segs = n if closed else n - 1
    for i in range(segs):
        p0 = pts[(i - 1) % n] if closed or i > 0 else pts[0]
        p1, p2 = pts[i], pts[(i + 1) % n]
        p3 = pts[(i + 2) % n] if closed or i + 2 < n else pts[-1]
        for j in range(k): out.append(_cr(p0, p1, p2, p3, j / k))
    if not closed: out.append(pts[-1])
    return out


def blob(pts, k=8):
    """A smooth closed shape through the points (a Catmull-Rom curve)."""
    return _spline(pts, True, k)


def curve(pts, k=8):
    """A smooth open curve through the points: for ink() and brush()."""
    return _spline(pts, False, k)


def poly(pts):
    return [tuple(p) for p in pts]


def brush(pts, w0, w1=None, smooth=True, cap=True):
    """A stroke along the points (smoothed unless smooth=False), its width going from w0 to w1 (a taper: hair, folds,
    muscle lines). A closed polygon."""
    w1 = w0 if w1 is None else w1
    path = curve(pts) if smooth and len(pts) > 2 else [tuple(p) for p in pts]
    if len(path) < 2: return []
    lens = [0.0]
    for a, b in zip(path, path[1:]): lens.append(lens[-1] + math.dist(a, b))
    total = lens[-1] or 1.0
    left, right = [], []
    for i, p in enumerate(path):
        a, b = path[max(0, i - 1)], path[min(len(path) - 1, i + 1)]
        dx, dy = b[0] - a[0], b[1] - a[1]
        L = math.hypot(dx, dy) or 1.0
        nx, ny = -dy / L, dx / L
        w = (w0 + (w1 - w0) * lens[i] / total) / 2
        left.append((p[0] + nx * w, p[1] + ny * w)); right.append((p[0] - nx * w, p[1] - ny * w))
    return left + right[::-1]


def move(pts, dx, dy): return [(x + dx, y + dy) for x, y in pts]
def scale(pts, k, cx=0.0, cy=0.0, ky=None):
    ky = k if ky is None else ky
    return [(cx + (x - cx) * k, cy + (y - cy) * ky) for x, y in pts]
def flipx(pts, cx): return [(2 * cx - x, y) for x, y in pts]


def _subpaths(shape):
    if not shape: return []
    if isinstance(shape[0][0], (int, float)): return [shape]
    return [p for p in shape if p]


# --- the canvas ---
class Canvas:
    """Shapes filled at ss x ss samples a pixel, then counted into pixels (see the module's header)."""
    def __init__(s, w, h, ss=4):
        s.w, s.h, s.ss = w, h, ss
        s.W, s.H = w * ss, h * ss
        s.col = bytearray(s.W * s.H)
        s.pri = bytearray(s.W * s.H)
        s.parts = {}
        s.owner = bytearray(s.W * s.H)      # the part that is on top at each sample (its number in s.order)
        s.order = [None]
        s.post = []          # pixel-exact operations, done after counting: ink, dots, seams

    def _mask(s, name):
        if name not in s.parts: s.parts[name] = bytearray(s.W * s.H)
        return s.parts[name]

    def _spans(s, shape):
        """(row, i0, i1) runs of samples inside the shape (non-zero winding)."""
        edges = []
        for P in _subpaths(shape):
            n = len(P)
            for k in range(n):
                (x0, y0), (x1, y1) = P[k], P[(k + 1) % n]
                if y0 == y1: continue
                w = 1 if y1 > y0 else -1
                if y0 > y1: x0, y0, x1, y1 = x1, y1, x0, y0
                edges.append((y0 * s.ss, y1 * s.ss, x0 * s.ss, (x1 - x0) / (y1 - y0), w))
        if not edges: return
        lo = max(0, int(math.floor(min(e[0] for e in edges))))
        hi = min(s.H - 1, int(math.ceil(max(e[1] for e in edges))))
        for j in range(lo, hi + 1):
            yc = j + 0.5
            xs = sorted((x0 + (yc - y0) * k, w) for y0, y1, x0, k, w in edges if y0 <= yc < y1)
            wind = 0
            for t in range(len(xs) - 1):
                wind += xs[t][1]
                if wind == 0: continue
                i0 = max(0, int(math.ceil(xs[t][0] - 0.5)))
                i1 = min(s.W - 1, int(math.floor(xs[t + 1][0] - 0.5)))
                if i1 >= i0: yield j, i0, i1

    def _paint(s, idxs, c, pri, part, inside, outside):
        ins = s.parts.get(inside) if inside else None
        if inside and ins is None: raise KeyError('no part %r yet (parts: %s)' % (inside, ', '.join(s.parts)))
        outs = [s.parts[o] for o in ([outside] if isinstance(outside, str) else (outside or ())) if o in s.parts]
        m = s._mask(part) if part else None
        if part and part not in s.order: s.order.append(part)
        k = s.order.index(part) if part and c is not None else None
        col, pr, own = s.col, s.pri, s.owner
        for i in idxs:
            if ins is not None and not ins[i]: continue
            if outs and any(o[i] for o in outs): continue
            if c is not None: col[i] = c; pr[i] = pri
            if m is not None: m[i] = 1
            if k is not None: own[i] = k

    def _shape_idx(s, shape):
        for j, i0, i1 in s._spans(shape):
            base = j * s.W
            yield from range(base + i0, base + i1 + 1)

    def fill(s, shape, c, part=None, inside=None, outside=None, pri=1):
        """Fill a shape with colour index c (None: only mark the part). part= adds it to a named part (parts are what
        inside=, shadow(), light() and seam() refer to)."""
        if c is not None and not (isinstance(c, int) and 0 <= c <= 15): raise ValueError('colour %r: palette indices are 0 to 15' % (c,))
        s._paint(s._shape_idx(shape), c, pri, part, inside, outside)
        return s

    def cut(s, shape, part=None):
        """Make a shape transparent again (and take it out of a part, or of every part)."""
        names = [part] if part else list(s.parts)
        for i in s._shape_idx(shape):
            s.col[i] = 0; s.pri[i] = 0; s.owner[i] = 0
            for n in names: s.parts[n][i] = 0
        return s

    def _offset_test(s, part, dx, dy):
        m = s.parts[part]
        W, H = s.W, s.H
        dx, dy = int(round(dx * s.ss)), int(round(dy * s.ss))
        def inside(i):
            x, y = i % W + dx, i // W + dy
            return 0 <= x < W and 0 <= y < H and m[y * W + x]
        return m, inside

    def shadow(s, part, c, light=(1, -1), depth=2.0, inside=None, outside=None, pri=1):
        """The side of a part turned from the light, as one flat tone: every sample of the part whose point `depth`
        pixels further from the light is outside it (a crescent along the far edges, as a cel shader does it).
        light=(x, y) points towards the light (screen y down: (1, -1) is up and to the right)."""
        L = math.hypot(*light) or 1.0
        ax, ay = -light[0] / L * depth, -light[1] / L * depth
        m, ok = s._offset_test(part, ax, ay)
        s._paint((i for i in range(len(m)) if m[i] and not ok(i)), c, pri, None, inside, outside)
        return s

    def light(s, part, c, light=(1, -1), inset=1.0, width=1.5, inside=None, outside=None, pri=1):
        """A band of light along the lit edge of a part, `inset` pixels in from it and `width` wide (a shine on hair, a
        lit rim on a shoulder)."""
        L = math.hypot(*light) or 1.0
        ux, uy = light[0] / L, light[1] / L
        m, ok_in = s._offset_test(part, ux * inset, uy * inset)
        _, ok_out = s._offset_test(part, ux * (inset + width), uy * (inset + width))
        s._paint((i for i in range(len(m)) if m[i] and ok_in(i) and not ok_out(i)), c, pri, None, inside, outside)
        return s

    def ink(s, pts, c, inside=None, outside=None, smooth=True):
        """A 1 px line through the points, exact (no doubled pixels, no L corners), drawn after the shapes."""
        s.post.append(('ink', curve(pts) if smooth and len(pts) > 2 else [tuple(p) for p in pts], c, inside, outside))
        return s

    def dot(s, x, y, c, inside=None):
        """One pixel, drawn after the shapes (a glint in an eye)."""
        s.post.append(('dot', (x, y), c, inside, None))
        return s

    def seam(s, part, c, under=None, sides=None):
        """Draw the edge of a part where it meets other colour (not transparency) in colour c: the line between an arm
        and the body behind it, a hair line over the face. under= limits it to where it meets that part; sides= a
        list of directions to do it on, e.g. [(0, 1)] for only its bottom edge."""
        s.post.append(('seam', part, c, under, sides))
        return s

    # --- to pixels ---
    def _visible(s):
        """part -> set of pixels where it is on top (most samples)."""
        ss, out = s.ss, {n: set() for n in s.order[1:]}
        for y in range(s.h):
            for x in range(s.w):
                cnt = {}
                for j in range(y * ss, y * ss + ss):
                    row = j * s.W
                    for v in s.owner[row + x * ss: row + x * ss + ss]: cnt[v] = cnt.get(v, 0) + 1
                k = max(cnt, key=cnt.get)
                if k: out[s.order[k]].add((x, y))
        return out

    def _pixel_parts(s):
        """part -> set of pixels at least half covered."""
        ss, out = s.ss, {}
        half = ss * ss / 2
        for name, m in s.parts.items():
            got = set()
            for y in range(s.h):
                for x in range(s.w):
                    n = 0
                    for j in range(y * ss, y * ss + ss):
                        row = j * s.W
                        n += sum(m[row + x * ss: row + x * ss + ss])
                    if n >= half: got.add((x, y))
            out[name] = got
        return out

    def render(s, outline=None, light=(1, -1), tidy=2, keep=(), outline_lit=None):
        """The picture: each pixel takes the colour with the most weight among its samples (weight = the shape's pri;
        transparency weighs 1 a sample). Then ink and dots, then the outline (a palette: the selective outline from
        its ramps, lit side a step lighter; or an index: that colour all round, or a function of the colour it touches, and on the side the light comes from
        outline_lit(c) (a function or a dict of the colour it touches) if given), then tidy (clusters of up to this
        many pixels that are not ink fold into the colour around them). Returns an Img."""
        from kit import Img
        ss, W = s.ss, s.W
        img = Img(s.w, s.h)
        for y in range(s.h):
            for x in range(s.w):
                wt = {}
                for j in range(y * ss, y * ss + ss):
                    row = j * W
                    for i in range(row + x * ss, row + x * ss + ss):
                        c = s.col[i]
                        wt[c] = wt.get(c, 0) + (s.pri[i] if c else 1)
                img.px[y][x] = max(wt, key=lambda c: (wt[c], c))
        parts = s._pixel_parts()
        vis = s._visible() if any(op[0] == 'seam' for op in s.post) else {}
        fixed = set()
        if tidy: img = _tidy(img, tidy, protect=fixed, keep=keep)
        for op in s.post:
            kind = op[0]
            if kind in ('ink', 'dot'):
                _, pts, c, inside, outside = op
                pix = _pixel_line(pts) if kind == 'ink' else [(int(math.floor(pts[0])), int(math.floor(pts[1])))]
                for p in pix:
                    if inside and p not in parts.get(inside, ()): continue
                    if outside and p in parts.get(outside, ()): continue
                    if 0 <= p[0] < s.w and 0 <= p[1] < s.h: img.px[p[1]][p[0]] = c; fixed.add(p)
            elif kind == 'seam':
                _, part, c, under, sides = op
                mine = vis.get(part, set())
                other = vis.get(under, set()) if under else None
                hits = []
                for (x, y) in mine:
                    if (x, y) in fixed: continue
                    for dx, dy in (sides or _N4):
                        q = (x + dx, y + dy)
                        if q in mine or not img.get(*q): continue
                        if other is not None and q not in other: continue
                        hits.append((x, y)); break
                for x, y in hits: img.px[y][x] = c; fixed.add((x, y))
        if outline is not None:
            from shade import outline_sel
            if isinstance(outline, int) or callable(outline):
                out = img.copy()
                lx, ly = light
                for y in range(img.h):
                    for x in range(img.w):
                        if img.px[y][x]: continue
                        touch = [(dx, dy, img.get(x + dx, y + dy)) for dx, dy in _N4 if img.get(x + dx, y + dy)]
                        if not touch: continue
                        dx, dy, c = touch[0]
                        lit = outline_lit is not None and (-dx * lx - dy * ly) > 0
                        base = outline(c) if callable(outline) else outline
                        out.px[y][x] = (outline_lit(c) if callable(outline_lit) else outline_lit.get(c, base)) if lit else base
                img = out
            else:
                img = outline_sel(img, outline, light=light)
        return img


def _pixel_line(pts):
    """The pixels of a path, 8-connected and without L corners."""
    pix = []
    for (x0, y0), (x1, y1) in zip(pts, pts[1:] or pts):
        n = int(max(abs(x1 - x0), abs(y1 - y0)) * 2) + 1
        for k in range(n + 1):
            t = k / n
            p = (int(math.floor(x0 + (x1 - x0) * t)), int(math.floor(y0 + (y1 - y0) * t)))
            if not pix or pix[-1] != p:
                if len(pix) >= 2 and pix[-2] == p: continue
                pix.append(p)
    if len(pts) == 1: pix = [(int(math.floor(pts[0][0])), int(math.floor(pts[0][1])))]
    # drop L corners: a pixel orthogonally next to both its neighbours, which are diagonal to each other
    out = []
    for i, p in enumerate(pix):
        if out and i + 1 < len(pix):
            a, b = out[-1], pix[i + 1]
            if abs(a[0] - b[0]) == 1 and abs(a[1] - b[1]) == 1 and abs(a[0] - p[0]) + abs(a[1] - p[1]) == 1 and abs(b[0] - p[0]) + abs(b[1] - p[1]) == 1:
                continue
        out.append(p)
    return out


def _clusters(img):
    """4-connected clusters of one colour: a list of (colour, [pixels])."""
    seen, out = set(), []
    for y in range(img.h):
        for x in range(img.w):
            if (x, y) in seen or not img.px[y][x]: continue
            c, stack, got = img.px[y][x], [(x, y)], []
            seen.add((x, y))
            while stack:
                p = stack.pop(); got.append(p)
                for dx, dy in _N4:
                    q = (p[0] + dx, p[1] + dy)
                    if q not in seen and img.get(*q) == c and 0 <= q[0] < img.w and 0 <= q[1] < img.h:
                        seen.add(q); stack.append(q)
            out.append((c, got))
    return out


def _tidy(img, size, protect=(), keep=()):
    """Clusters of up to `size` pixels (not protected, not in colours `keep`) take the colour most of their
    neighbours have, if that is a colour (a cluster at the silhouette's edge that touches mostly transparency stays)."""
    out = img.copy()
    for c, px in _clusters(img):
        if len(px) > size or c in keep or any(p in protect for p in px): continue
        own = set(px)
        votes = {}
        for x, y in px:
            for dx, dy in _N8:
                q = (x + dx, y + dy)
                if q in own: continue
                v = img.get(*q)
                votes[v] = votes.get(v, 0) + (2 if (dx == 0 or dy == 0) else 1)
        if not votes: continue
        best = max(votes, key=lambda v: (votes[v], v))
        if best:
            for x, y in px: out.px[y][x] = best
    return out


def speckle(img, size=2):
    """How speckled a picture is: the share of its opaque pixels in one-colour clusters of `size` pixels or fewer
    (0 is perfectly clean; drawn eyes and glints count, so a clean face scores a few per cent, a dithered one 20 % and
    more)."""
    total = sum(1 for r in img.px for v in r if v)
    small = sum(len(px) for c, px in _clusters(img) if len(px) <= size)
    return small / total if total else 0.0
