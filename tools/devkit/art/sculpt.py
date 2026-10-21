"""Sculpt sprites from 3D shapes and render them as pixel art (docs/dev/snes-picture.md, part B): the way to big,
painted-looking characters (a Punch-Out boxer, a Street Fighter, a boss) without placing every pixel by hand.

    from kit import *
    pal = art.sprite_palette(0, {'skin': ramp('e0a070', 6), 'shorts': ramp('d04648', 5), 'glove': ramp('e03030', 4)})
    s = Sculpt(64, 96)                                   # the canvas, in pixels; z points at the viewer
    s.ellipsoid(32, 40, 0, 14, 18, 10, pal.skin)         # the chest: centre x, y, z and radii
    s.capsule((20, 32, 2), (10, 58, 6), 5, 4, pal.skin)  # an upper arm: two ends (x, y, z) and their radii
    s.sphere(10, 62, 10, 7, Mat(pal.glove, gloss=0.8))   # a glossy glove
    s.capsule((26, 58, 0), (24, 90, 2), 7, 5, pal.shorts, smooth=3)   # smooth=k blends into the same material
    img = s.render()                                     # an Img: lit, shaded, outlined
    img.pset(...)                                        # then the details by hand: eyes, mouth, hair strands

Shapes (x and y are canvas pixels, y down; z towards the viewer, any scale you like, in pixels):
  sphere(x, y, z, r, mat)
  ellipsoid(x, y, z, rx, ry, rz, mat, rot=0)       rot turns it in the picture (degrees, clockwise)
  capsule(a, b, ra, rb=None, mat)                   a limb from a to b ((x, y, z) each), radius ra at a and rb at b
  relief(img, x, y, z, height, mat, profile, soften) any 2D shape (the non-zero pixels of an Img), inflated to `height`:
                                                    profile 'dome' (round), 'soft' (a pillow), 'ridge' (a crease down
                                                    the middle) or 'flat'
Each takes smooth=k (blend into what is already there of the same material, over k pixels: muscles, a belly into a
chest) and front=True (always drawn over what is there, like a decal). A shape added later is not drawn over by an
earlier one: the nearest surface wins, whatever the order.

Materials: a ramp of palette indices dark to light (pal.skin), or Mat(ramp, gloss=0..1, rough=0..1, outline=True).
  gloss   a specular highlight in the ramp's lightest step (gloves, metal, eyes, a shiny ball)
  rough   noise in the shading (stone, fur, cloth)
  outline False draws no outline around this material (a glow, a soft shape)

render(light=(-1, -1.2, 0.8), ambient=0.12, contrast=1.35, dither=0.15, outline='selective', contours=2.5, shadows=True)
  light     the direction the light comes from: x (-1 left), y (-1 above), z (towards the viewer)
  contrast  above 1 the light and shadow sides split more clearly (SNES shading is bold, not airbrushed)
  dither    how much of each step's edge is dithered into the next (0 none: flat bands; SNES art used a little)
  outline   'selective' (the darkest step of each part, one step lighter where the light hits: SNES sel-out),
            'dark' (the darkest step everywhere), None (no outline). The outline is drawn on the shape's own edge
            pixels, so the sprite does not grow.
  contours  where one part passes in front of another by more than this depth, the part behind gets an outline
            there (an arm across a chest); None for none
  shadows   a part in front casts a short shadow on the part behind, away from the light
With an outline, a ramp's darkest step is kept for the outline and the shading uses the others (so give a material
4 to 6 steps). Parts may use ramps of different palettes: render() then returns {palette number: Img}, one for each,
which together are one big sprite (art.big_sprite takes the dict).
"""
import math

_BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]


def _palette_of(ramp):
    """The sprite palette number a ramp comes from, when it was made by a palette with ramps (pal.skin), else None."""
    return getattr(ramp, 'pal', None)


class Mat:
    """A material: a ramp of palette indices (dark to light) and how it takes the light."""
    def __init__(s, ramp, gloss=0.0, rough=0.0, outline=True, pal=None):
        if isinstance(ramp, Mat): ramp = ramp.ramp
        if not ramp: raise ValueError('a material needs a ramp of palette indices (e.g. pal.skin)')
        s.ramp, s.gloss, s.rough, s.outline = tuple(ramp), gloss, rough, outline
        s.pal = pal if pal is not None else _palette_of(ramp)


def _mat(m):
    return m if isinstance(m, Mat) else Mat(m)


def _smax(a, b, k):
    h = max(k - abs(a - b), 0.0) / k
    return max(a, b) + h * h * k * 0.25


class Sculpt:
    def __init__(s, w, h):
        s.w, s.h = w, h
        n = w * h
        s.z = [-1e9] * n
        s.nx, s.ny, s.nz = [0.0] * n, [0.0] * n, [1.0] * n
        s.mat = [None] * n
        s.part = [-1] * n
        s.parts = 0
        s.parent = []                  # parts blended together (smooth=k) are one surface: a union-find over parts

    # --- writing a surface ---
    def _put(s, i, z, nx, ny, nz, mat, part, smooth, front):
        old = s.z[i]
        if smooth and s.mat[i] is mat and old > -1e8:
            nzv = _smax(old, z, smooth)
            w = min(1.0, max(0.0, 0.5 + (z - old) / (2 * smooth)))
            ax, ay, az = s.nx[i] * (1 - w) + nx * w, s.ny[i] * (1 - w) + ny * w, s.nz[i] * (1 - w) + nz * w
            d = math.sqrt(ax * ax + ay * ay + az * az) or 1
            s.z[i], s.nx[i], s.ny[i], s.nz[i] = nzv, ax / d, ay / d, az / d
            s._join(s.part[i], part)
            if w > 0.5: s.part[i] = part
            return
        if front or z > old:
            s.z[i], s.nx[i], s.ny[i], s.nz[i], s.mat[i], s.part[i] = z, nx, ny, nz, mat, part

    def _box(s, x0, y0, x1, y1):
        return max(0, int(math.floor(x0))), max(0, int(math.floor(y0))), min(s.w - 1, int(math.ceil(x1))), min(s.h - 1, int(math.ceil(y1)))

    def _new(s):
        s.parts += 1
        s.parent.append(s.parts - 1)
        return s.parts - 1

    def _root(s, p):
        while s.parent[p] != p:
            s.parent[p] = s.parent[s.parent[p]]; p = s.parent[p]
        return p

    def _join(s, a, b):
        if a >= 0 and b >= 0: s.parent[s._root(a)] = s._root(b)

    # --- shapes ---
    def sphere(s, x, y, z, r, mat, smooth=0, front=False):
        mat, part = _mat(mat), s._new()
        bx0, by0, bx1, by1 = s._box(x - r, y - r, x + r, y + r)
        for py in range(by0, by1 + 1):
            dy = py + 0.5 - y
            for px in range(bx0, bx1 + 1):
                dx = px + 0.5 - x
                d2 = dx * dx + dy * dy
                if d2 > r * r: continue
                dz = math.sqrt(r * r - d2)
                s._put(py * s.w + px, z + dz, dx / r, dy / r, dz / r, mat, part, smooth, front)
        return s

    def ellipsoid(s, x, y, z, rx, ry, rz, mat, rot=0, smooth=0, front=False):
        mat, part = _mat(mat), s._new()
        c, sn = math.cos(math.radians(rot)), math.sin(math.radians(rot))
        R = max(rx, ry)
        bx0, by0, bx1, by1 = s._box(x - R, y - R, x + R, y + R)
        for py in range(by0, by1 + 1):
            dy = py + 0.5 - y
            for px in range(bx0, bx1 + 1):
                dx = px + 0.5 - x
                u, v = c * dx + sn * dy, -sn * dx + c * dy
                q = 1 - (u / rx) ** 2 - (v / ry) ** 2
                if q < 0: continue
                wz = rz * math.sqrt(q)
                nu, nv, nw = u / (rx * rx), v / (ry * ry), wz / (rz * rz)
                nx, ny = c * nu - sn * nv, sn * nu + c * nv
                d = math.sqrt(nx * nx + ny * ny + nw * nw) or 1
                s._put(py * s.w + px, z + wz, nx / d, ny / d, nw / d, mat, part, smooth, front)
        return s

    def capsule(s, a, b, ra, rb=None, mat=None, smooth=0, front=False):
        """A limb from a to b, the radius going from ra to rb, with round ends."""
        if mat is None: raise ValueError('capsule needs a material (a ramp such as pal.skin)')
        rb = ra if rb is None else rb
        mat, part = _mat(mat), s._new()
        (ax, ay, az), (bx, by, bz) = a, b
        ex, ey, ez = bx - ax, by - ay, bz - az
        L2 = ex * ex + ey * ey + ez * ez or 1e-9
        R = max(ra, rb)
        bx0, by0, bx1, by1 = s._box(min(ax, bx) - R, min(ay, by) - R, max(ax, bx) + R, max(ay, by) + R)
        # The pixel's ray runs along z. Near the segment's point at t, the limb is a sphere of radius r(t); the front of
        # the limb is the highest of those spheres. Search t around the point nearest the ray, then refine.
        def front_at(cx, cy, t):
            t = min(1.0, max(0.0, t))
            sx, sy, sz, r = ax + ex * t, ay + ey * t, az + ez * t, ra + (rb - ra) * t
            dx, dy = cx - sx, cy - sy
            d2 = dx * dx + dy * dy
            if d2 > r * r: return None
            dz = math.sqrt(r * r - d2)
            return (sz + dz, dx, dy, dz, r, t)
        for py in range(by0, by1 + 1):
            cy = py + 0.5
            for px in range(bx0, bx1 + 1):
                cx = px + 0.5
                exy = ex * ex + ey * ey
                t0 = ((cx - ax) * ex + (cy - ay) * ey) / exy if exy > 1e-9 else 0.5
                best = None
                for t in (t0 - 0.2, t0 - 0.1, t0 - 0.05, t0, t0 + 0.05, t0 + 0.1, t0 + 0.2, 0.0, 1.0):
                    f = front_at(cx, cy, t)
                    if f and (best is None or f[0] > best[0]): best = f
                if not best: continue
                for step in (0.03, 0.01, 0.003):         # climb to the highest point
                    for t in (best[5] - step, best[5] + step):
                        f = front_at(cx, cy, t)
                        if f and f[0] > best[0]: best = f
                z, dx, dy, dz, r, _ = best
                s._put(py * s.w + px, z, dx / r, dy / r, dz / r, mat, part, smooth, front)
        return s

    def relief(s, img, x, y, z, height, mat, profile='dome', smooth=0, front=False, soften=2):
        """A 2D shape (the non-zero pixels of img, placed with its top left at x, y) inflated towards the viewer. Its
        height map is blurred `soften` times inside the shape, which takes out the creases a distance map leaves along
        the shape's corners (0 keeps them: a faceted look)."""
        mat, part = _mat(mat), s._new()
        from shade import inner_distance
        d = inner_distance(img)
        dmax = max(max(r) for r in d) or 1
        def prof(t):
            if profile == 'dome': return math.sqrt(max(0.0, 1 - (1 - t) ** 2))
            if profile == 'soft': return 1 - (1 - t) ** 3
            if profile == 'ridge': return t
            return 1.0 if t > 0 else 0.0
        hh = [[height * prof(min(1.0, v / dmax)) for v in r] for r in d]
        for _ in range(soften):                       # a 3 x 3 blur, inside the shape only (the edge stays at its height)
            nh = [r[:] for r in hh]
            for j in range(img.h):
                for i in range(img.w):
                    if not img.px[j][i]: continue
                    acc = n = 0
                    for dj in (-1, 0, 1):
                        for di in (-1, 0, 1):
                            jj, ii = j + dj, i + di
                            if 0 <= jj < img.h and 0 <= ii < img.w and img.px[jj][ii]: acc += hh[jj][ii]; n += 1
                    nh[j][i] = acc / n
            hh = nh
        for j in range(img.h):
            for i in range(img.w):
                if not img.px[j][i]: continue
                px, py = x + i, y + j
                if not (0 <= px < s.w and 0 <= py < s.h): continue
                gx = (hh[j][min(img.w - 1, i + 1)] - hh[j][max(0, i - 1)]) / 2
                gy = (hh[min(img.h - 1, j + 1)][i] - hh[max(0, j - 1)][i]) / 2
                nx, ny, nz = -gx, -gy, 1.0
                l = math.sqrt(nx * nx + ny * ny + nz * nz)
                s._put(py * s.w + px, z + hh[j][i], nx / l, ny / l, nz / l, mat, part, smooth, front)
        return s

    # --- rendering ---
    def mask(s):
        """The silhouette as an Img (1 inside)."""
        from kit import Img
        im = Img(s.w, s.h)
        for i, m in enumerate(s.mat):
            if m is not None: im.px[i // s.w][i % s.w] = 1
        return im

    def render(s, light=(-1, -1.2, 0.8), ambient=0.12, contrast=1.35, dither=0.15, outline='selective', contours=2.5, shadows=True):
        from kit import Img, hsh
        lx, ly, lz = light
        ln = math.sqrt(lx * lx + ly * ly + lz * lz)
        lx, ly, lz = lx / ln, ly / ln, lz / ln
        hx, hy, hz = lx, ly, lz + 1                        # the half vector, for the highlight (viewer along z)
        hn = math.sqrt(hx * hx + hy * hy + hz * hz); hx, hy, hz = hx / hn, hy / hn, hz / hn
        W, H, Z, M, P = s.w, s.h, s.z, s.mat, s.part
        G = [s._root(p) if p >= 0 else -1 for p in P]       # the surface each pixel belongs to
        inside = lambda x, y: 0 <= x < W and 0 <= y < H and M[y * W + x] is not None
        # the screen direction the light comes from, for cast shadows and the lit side of outlines
        sl = math.hypot(lx, ly) or 1
        sdx, sdy = lx / sl, ly / sl
        level = [0] * (W * H)
        for y in range(H):
            for x in range(W):
                i = y * W + x
                m = M[i]
                if m is None: continue
                d = s.nx[i] * lx + s.ny[i] * ly + s.nz[i] * lz
                I = ambient + (1 - ambient) * max(0.0, d)
                I = (I - 0.5) * contrast + 0.5
                if m.rough: I += (hsh(x * 7919 + y * 104729) % 1000 / 1000 - 0.5) * 0.25 * m.rough
                if shadows:
                    for k in (1, 2, 3):
                        qx, qy = int(round(x + sdx * k * 1.5)), int(round(y + sdy * k * 1.5))
                        if inside(qx, qy):
                            j = qy * W + qx
                            if G[j] != G[i] and Z[j] - Z[i] > 1.5 + k: I *= 0.55; break
                ramp = m.ramp
                shades = ramp[1:] if (outline and m.outline and len(ramp) >= 4) else ramp
                n = len(shades)
                f = min(max(I, 0.0), 0.9999) * n
                k = int(f)
                t = f - k
                if dither and k < n - 1 and t > 1 - dither and _BAYER[y & 3][x & 3] < (t - (1 - dither)) / dither * 16: k += 1
                if m.gloss:
                    sp = max(0.0, s.nx[i] * hx + s.ny[i] * hy + s.nz[i] * hz) ** (8 + 60 * m.gloss)
                    if sp > 0.45: k = n - 1
                level[i] = shades[k]
        out = Img(W, H)
        for y in range(H):
            for x in range(W):
                i = y * W + x
                m = M[i]
                if m is None: continue
                c = level[i]
                if outline and m.outline:
                    edge = any(not inside(x + dx, y + dy) for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)))
                    behind = False
                    if contours is not None and not edge:
                        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                            j = (y + dy) * W + x + dx
                            if G[j] != G[i] and M[j] is not None and Z[j] - Z[i] > contours: behind = True; break
                    if edge or behind:
                        lit = edge and outline == 'selective' and (s.nx[i] * lx + s.ny[i] * ly) > 0.35
                        c = m.ramp[1] if lit and len(m.ramp) > 1 else m.ramp[0]
                out.px[y][x] = c
        pals = {m.pal for m in M if m is not None}
        if len(pals) > 1:
            split = {}
            for p in pals:
                im = Img(W, H)
                for y in range(H):
                    for x in range(W):
                        m = M[y * W + x]
                        if m is not None and m.pal == p: im.px[y][x] = out.px[y][x]
                split[p] = im
            return split
        return out
