"""Hand-drawn details for the art kit (docs/dev/snes-picture.md, part B): what an artist draws on top of the volumes
(Sculpt, Rig, shaded()) so a figure stops looking like a mannequin: faces, hair in clumps, folds in cloth, lines of
muscle. Each draws in the figure's own ramps (tuples of palette indices, dark to light, such as pal.skin).

    from kit import *
    face(img, x, y, r, pal.skin, view='side', expression='angry', white=pal.white)   # at the head's centre, radius r
    hair(img, x, y, r, pal.hair, style='spiky', view='side')
    crease(img, pal.pants, [(30, 60), (34, 66)])          # a fold: a dark line, lit along one side, only on the cloth
    stroke(img, pal.skin, [(52, 46), (52, 100)], -2)      # a line of muscle (the spine), two steps darker
    Rig(..., face='angry', hair_style='swept', folds=True)   # or let the rig draw them in every frame, from its joints

  face(img, x, y, r, skin, view, expression, facing, angle, white, eye)
        view 'side' (looking along `facing`, 1 right or -1 left) or 'front'; expression 'neutral', 'angry' (brows down,
        mouth turned down), 'hurt' (eyes shut, mouth open on its teeth), 'happy' (eyes and mouth curved); angle tilts the
        face (degrees, the head's own tilt). From r 8: eyes two pixels tall with a lid and a socket, brows two pixels
        thick, a lit lower lip; from r 5 the same in fewer pixels; below, dots. white= an index for the eyes' whites
        (without it, the skin's lightest step).
  hair(img, x, y, r, ramp, style, view, facing, angle)
        style 'short', 'spiky', 'swept', 'mohawk', 'long', 'bald'; clumps lit on the upper side (the light's), each with
        a highlight streak near its root and a dark edge where it lies on the next.
  crease(img, ramp, pts, depth=1, lit=(-1, -1))   a fold along a path: depth steps darker, one step lighter on the side
        facing `lit`; only pixels already in `ramp` change, so it stays on the cloth
  stroke(img, ramp, pts, k)                       a line k steps along the ramp (negative darker), on the ramp's pixels only
  bunch(img, ramp, x0, x1, y, rows=3)             cloth bunched in rings (an ankle, a sleeve's end, a waistband)
"""
import math


def _px(img, x, y):
    x, y = int(round(x)), int(round(y))
    return (x, y) if 0 <= x < img.w and 0 <= y < img.h else None


def _shift(ramp, c, k):
    if c not in ramp: return c
    i = ramp.index(c)
    return ramp[max(0, min(len(ramp) - 1, i + k))]


def _line(x0, y0, x1, y1):
    n = int(max(abs(x1 - x0), abs(y1 - y0))) + 1
    return [(x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n) for i in range(n + 1)]


def stroke(img, ramp, pts, k=-1):
    """A line through pts, each pixel k steps along `ramp` from its own colour (negative darker); only pixels in the
    ramp change."""
    ramp = tuple(ramp)
    seen = set()
    for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
        for x, y in _line(x0, y0, x1, y1):
            p = _px(img, x, y)
            if p and p not in seen:
                seen.add(p)
                c = img.px[p[1]][p[0]]
                if c in ramp: img.px[p[1]][p[0]] = _shift(ramp, c, k)
    return img


def crease(img, ramp, pts, depth=1, lit=(-1, -1)):
    """A fold: the line depth steps darker, the pixels beside it on the side the light comes from one step lighter."""
    ramp = tuple(ramp)
    lx, ly = lit
    for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
        L = math.hypot(x1 - x0, y1 - y0) or 1
        nx, ny = -(y1 - y0) / L, (x1 - x0) / L                 # a normal to the fold
        if nx * lx + ny * ly < 0: nx, ny = -nx, -ny             # the normal pointing to the light
        for x, y in _line(x0, y0, x1, y1):
            p, q = _px(img, x, y), _px(img, x + nx, y + ny)
            if q and img.px[q[1]][q[0]] in ramp and (not p or (q != p)): img.px[q[1]][q[0]] = _shift(ramp, img.px[q[1]][q[0]], 1)
            if p and img.px[p[1]][p[0]] in ramp: img.px[p[1]][p[0]] = _shift(ramp, img.px[p[1]][p[0]], -depth)
    return img


def bunch(img, ramp, x0, x1, y, rows=3, gap=2):
    """Cloth bunched in rings across x0..x1 from row y upwards (an ankle, the end of a sleeve): short creases, gap apart."""
    for k in range(rows):
        yy = y - k * gap
        w = (x1 - x0) * (0.9 - 0.15 * k)
        cx = (x0 + x1) / 2 + (k % 2) * 0.8
        crease(img, ramp, [(cx - w / 2, yy + 0.6), (cx, yy), (cx + w / 2, yy + 0.6)], 1, lit=(0, -1))
    return img


def _set(img, x, y, c, only=None):
    p = _px(img, x, y)
    if p and (only is None or img.px[p[1]][p[0]] in only): img.px[p[1]][p[0]] = c


def face(img, x, y, r, skin, view='side', expression='neutral', facing=1, angle=0, white=None, eye=None):
    """A face on a head at (x, y), radius r (see the module's header). From r 8 the eyes are two pixels tall with a lid
    line above and a shaded socket, and the mouth has a lip; smaller heads get the same features in fewer pixels."""
    skin = tuple(skin)
    on = set(skin)
    white = white if white is not None else skin[-1]
    eye = eye if eye is not None else skin[0]
    dark = skin[0]
    lip = skin[-1]
    a = math.radians(angle)
    def at(fwd, up):                      # a point on the face: fwd towards where it looks, up towards the crown
        fx, fy = fwd * facing, -up
        return x + fx * math.cos(a) - fy * math.sin(a), y + fx * math.sin(a) + fy * math.cos(a)
    big, mid = r >= 8, r >= 5

    def one_eye(ex, ey, outward):
        """An eye at (ex, ey); outward is the direction (-1 or 1) of the face's outer edge, for the brow's slope."""
        ex, ey = round(ex), round(ey)
        if not mid:
            _set(img, ex, ey, eye, on); return
        if expression == 'hurt':                                   # shut tight: a dark V
            stroke(img, skin, [(ex - 1, ey - 1), (ex, ey), (ex + 1, ey - 1)], -3); return
        if expression == 'happy':                                  # smiling eyes: an arc
            stroke(img, skin, [(ex - 1, ey + 0.4), (ex, ey - 0.6), (ex + 1, ey + 0.4)], -3); return
        rows = 2 if big else 1
        for dy in range(rows):
            for dx in (-1, 0, 1) if big else (0, 1):
                _set(img, ex + dx, ey + dy, white, on)
        px_ = ex + (facing if view == 'side' else 0)
        for dy in range(rows): _set(img, px_, ey + dy, eye, on)  # the pupil, looking where the face looks
        lid = [(ex - (1 if big else 0), ey - 1), (ex + 1, ey - 1)]
        stroke(img, skin, lid, -3)                                 # the upper lid
        if big: stroke(img, skin, [(ex - 1, ey + rows), (ex + 1, ey + rows)], -1)   # the socket under the eye

    def brow(ex, ey, outward):
        h = 2.6 if big else 1.6
        drop = {'angry': 1.2, 'hurt': -1.0}.get(expression, 0.0)
        inner, outer = (ex - outward * 1.5, ey - h + drop), (ex + outward * 1.8, ey - h - (0 if drop >= 0 else -drop))
        stroke(img, skin, [inner, outer], -3)
        if big: stroke(img, skin, [(inner[0], inner[1] + 1), (outer[0], outer[1] + 1)], -1)

    def mouth(mx, my, w):
        if expression == 'hurt' and mid:                           # open: a dark hole, teeth along its top
            for dy in range(2 if big else 1):
                stroke(img, skin, [(mx - w * 0.6, my + dy), (mx + w * 0.6, my + dy)], -4)
            if big: stroke(img, skin, [(mx - w * 0.5, my), (mx + w * 0.5, my)], 4)
            return
        if expression == 'happy':
            stroke(img, skin, [(mx - w, my - 1), (mx - w * 0.4, my), (mx + w * 0.4, my), (mx + w, my - 1)], -3)
            if big: stroke(img, skin, [(mx - w * 0.4, my + 1), (mx + w * 0.4, my + 1)], 2)
            return
        sag = 0.8 if expression == 'angry' else 0.0
        stroke(img, skin, [(mx - w, my + sag), (mx, my), (mx + w, my + sag)], -3)
        if big: stroke(img, skin, [(mx - w * 0.5, my + 1.4), (mx + w * 0.5, my + 1.4)], 2)   # the lower lip, lit

    if view == 'side':
        ex, ey = at(r * 0.5, r * 0.08)
        one_eye(ex, ey, facing)
        brow(ex + facing * 0.3, ey, facing)
        mx, my = at(r * 0.72, -r * 0.5)
        mouth(mx, my, max(1.0, r * 0.12))
        stroke(img, skin, [at(r * 0.82, -r * 0.2), at(r * 0.95, -r * 0.22)], -1)            # under the nose
        stroke(img, skin, [at(r * 0.25, r * 0.1), at(r * 0.25, -r * 0.15)], -1)             # the cheekbone's shadow
    else:
        for side in (-1, 1):
            ex, ey = at(side * r * 0.38, r * 0.06)
            one_eye(ex, ey, side)
            brow(ex, ey, side)
        stroke(img, skin, [at(r * 0.1, -r * 0.02), at(r * 0.12, -r * 0.24), at(-r * 0.05, -r * 0.28)], -1)   # the nose
        mx, my = at(0, -r * 0.5)
        mouth(mx, my, max(1.0, r * 0.28))
    return img


def _clump(img, base, tip, width, ramp, lit=(-1, -1)):
    """One clump of hair: a tapered shape from base to tip, lit on the side the light comes from, with a highlight
    streak near the root and its darkest step along the shaded edge."""
    (bx, by), (tx, ty) = base, tip
    L = math.hypot(tx - bx, ty - by) or 1
    ux, uy = (tx - bx) / L, (ty - by) / L
    nx, ny = -uy, ux
    if nx * lit[0] + ny * lit[1] < 0: nx, ny = -nx, -ny          # n points to the light
    n = len(ramp)
    steps = int(L * 2) + 1
    for i in range(steps + 1):
        t = i / steps
        half = width * (1 - t) ** 0.8 / 2
        cx, cy = bx + ux * L * t, by + uy * L * t
        k = int(half * 2) + 1
        for j in range(-k, k + 1):
            s = j / max(1, k) * half
            if abs(s) > half: continue
            px, py = cx + nx * s, cy + ny * s
            side = s / max(0.5, half)                            # -1 shaded edge .. 1 lit edge
            lvl = 0.5 + 0.35 * side - 0.25 * t
            if 0.15 < t < 0.45 and 0.1 < side < 0.7: lvl = 1.0     # the highlight streak
            if side < -0.75: lvl = 0.0                           # the dark edge
            c = ramp[min(n - 1, max(0, int(lvl * n)))]
            _set(img, px, py, c)


def hair(img, x, y, r, ramp, style='short', view='side', facing=1, angle=0):
    """Hair on a head at (x, y), radius r (see the module's header). Draw it after the face."""
    ramp = tuple(ramp)
    if style == 'bald':
        _set(img, x - r * 0.3 * facing, y - r * 0.6, ramp[-1]); return img
    a = math.radians(angle)
    def at(fwd, up):
        fx, fy = fwd * (facing if view == 'side' else 1), -up
        return x + fx * math.cos(a) - fy * math.sin(a), y + fx * math.sin(a) + fy * math.cos(a)
    # the cap over the crown (and the back of the head in profile)
    for j in range(-int(r) - 1, int(r) + 2):
        for i in range(-int(r) - 1, int(r) + 2):
            if math.hypot(i, j) > r * 1.02: continue
            fwd, up = i / r, -j / r
            if view == 'side': inside = up > 0.15 + 0.35 * max(0.0, fwd) or (fwd < -0.25 and up > -0.55)
            elif view == 'back': inside = up > -0.75
            else: inside = up > 0.38 - 0.1 * abs(fwd)
            if inside:
                px, py = at(i, -j)
                lvl = 0.45 + 0.35 * up - 0.15 * fwd * (1 if view != 'side' else -1)
                _set(img, px, py, ramp[min(len(ramp) - 1, max(0, int(lvl * len(ramp))))])
    # clumps: (angle on the head from the crown, towards the front positive; length and width in radii)
    sets = {
        'short': [(-60, 0.35, 0.5), (-25, 0.35, 0.5), (10, 0.3, 0.45), (40, 0.25, 0.4)],
        'spiky': [(-75, 0.9, 0.55), (-45, 1.0, 0.6), (-15, 1.05, 0.6), (15, 0.95, 0.55), (45, 0.75, 0.5), (70, 0.5, 0.4)],
        'swept': [(-95, 0.8, 0.55), (-70, 0.95, 0.6), (-45, 0.95, 0.6), (-20, 0.85, 0.55), (10, 0.6, 0.5)],
        'mohawk': [(-40, 1.0, 0.5), (-15, 1.15, 0.5), (10, 1.1, 0.5), (35, 0.9, 0.45)],
        'long': [(-150, 180, 1.6, 0.7), (-120, 175, 1.7, 0.7), (-90, 170, 1.5, 0.65), (-60, -120, 0.7, 0.6), (-20, -60, 0.45, 0.55), (20, 30, 0.35, 0.45)],
    }
    if style not in sets: raise ValueError('hair: styles are bald, %s' % ', '.join(sets))
    lean = {'swept': -35, 'long': -10}.get(style, 0)
    clumps = sets[style]
    clumps = [(c[0], c[0] + lean, c[1], c[2]) if len(c) == 3 else c for c in clumps]   # (base, direction, length, width)
    if view == 'front':
        # seen from the front, clumps fan out over the crown; long hair falls down both sides
        clumps = [(c[0] / 1.6, (c[1] / 1.6) if abs(c[1]) < 150 else c[1], c[2] * 0.7, c[3]) for c in clumps]
        clumps += [(-c[0], -c[1] if abs(c[1]) < 150 else c[1], c[2], c[3]) for c in clumps if abs(c[1]) >= 150]
    for (deg, direction, length, width) in clumps:
        t = math.radians(deg)
        bx, by = at(math.sin(t) * r * 0.75, math.cos(t) * r * 0.75)
        tl = math.radians(direction)
        tx, ty = at(math.sin(t) * r * 0.75 + math.sin(tl) * length * r, math.cos(t) * r * 0.75 + math.cos(tl) * length * r)
        _clump(img, (bx, by), (tx, ty), width * r, ramp)
    return img
