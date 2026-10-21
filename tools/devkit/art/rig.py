"""Characters from a skeleton, posed with numbers and animated (docs/dev/snes-picture.md, part B): the way to many
frames of one character that stay consistent, and to check them without watching them move.

    from kit import *
    pal = art.sprite_palette(0, {'skin': ramp('e8a878', 5), 'shirt': ramp('e8e8f0', 4), 'pants': ramp('3050a0', 4), 'shoe': ramp('503030', 3)})
    hero = Rig('brawler', height=72, skin=pal.skin, shirt=pal.shirt, pants=pal.pants, shoes=pal.shoe)
    frame = hero.render(hero.pose(arm_n=40, fore_n=60))                     # one picture
    walk = hero.animate(WALK, 8)                                              # eight in-between frames of a walk cycle
    filmstrip('/tmp/walk.png', hero, walk, pal)                              # all frames, onion-skinned, with the bones
    for k, p in enumerate(walk): art.big_sprite('walk%d' % k, hero.render(p), pal=pal)   # frames share their tiles

The figure faces right (flip with bigSprite's fx). Its near-side limbs (_n) are in front of the body, its far-side
limbs (_f) behind it and one step darker, as Streets of Rage and Street Fighter draw them.

A pose is a dict of angles in degrees (missing ones are 0) and offsets in pixels:
  x, y         move the whole body (y > 0 down: a crouch, the low point of a step)
  lean         the spine from upright, positive leaning forward
  neck, head   the neck and the head, relative to the spine (positive nods forward)
  arm_n, arm_f the upper arms from hanging straight down, positive swinging forward
  fore_n, fore_f  the elbows: the forearm relative to the upper arm, positive bending forward and up
  thigh_n, thigh_f  the thighs from straight down, positive swinging forward
  shin_n, shin_f    the knees: the shin relative to the thigh, negative bending back (a knee only bends one way)
  foot_n, foot_f    the feet relative to level, positive toes up
Built-in poses and cycles: STAND, GUARD, WALK (4 keys), PUNCH (4 keys), KICK (4 keys), HIT, JUMP; combine them:
pose(GUARD, arm_n=80) is GUARD with the near arm changed.

Presets (proportions; height is the figure's full height in pixels, head to sole):
  'brawler'  a beat-'em-up hero, about 7 heads tall (Streets of Rage)
  'boxer'    a big head, broad shoulders, gloves (Punch-Out)
  'hero'     a small platform hero, about 3 heads tall (a 32 px sprite)
Materials: skin, hair, shirt (torso and upper arms; skin for a bare chest), pants (hips and legs), shoes, hands (gloves:
a ramp, made glossy). Any can be a ramp of palette indices (pal.skin) or a Mat.
"""
import math

STAND = {}
GUARD = {'lean': 6, 'arm_n': 30, 'fore_n': 110, 'arm_f': 45, 'fore_f': 105, 'thigh_n': 12, 'shin_n': -8, 'thigh_f': -12, 'shin_f': -10, 'y': 1}
WALK = [   # contact (near foot forward), down, passing, up; then the same with the sides swapped (animate() mirrors it)
    {'lean': 4, 'thigh_n': 24, 'shin_n': -4, 'foot_n': 10, 'thigh_f': -20, 'shin_f': -12, 'foot_f': -15, 'arm_n': -32, 'fore_n': 25, 'arm_f': 34, 'fore_f': 35},
    {'lean': 5, 'y': 2, 'thigh_n': 14, 'shin_n': -14, 'thigh_f': -12, 'shin_f': -36, 'foot_f': -10, 'arm_n': -12, 'fore_n': 18, 'arm_f': 14, 'fore_f': 22},
    {'lean': 4, 'y': 0, 'thigh_n': -2, 'shin_n': -6, 'thigh_f': 6, 'shin_f': -48, 'arm_n': 0, 'fore_n': 15, 'arm_f': 0, 'fore_f': 15},
    {'lean': 4, 'y': -1, 'thigh_n': -14, 'shin_n': -4, 'foot_n': -6, 'thigh_f': 18, 'shin_f': -26, 'arm_n': 20, 'fore_n': 30, 'arm_f': -20, 'fore_f': 22},
]
PUNCH = [  # guard, wind up, the hit (near arm straight out), back
    GUARD,
    dict(GUARD, lean=0, arm_n=10, fore_n=125, x=-1),
    dict(GUARD, lean=14, arm_n=88, fore_n=4, arm_f=30, fore_f=115, x=3, thigh_n=18, thigh_f=-18),
    dict(GUARD, lean=9, arm_n=60, fore_n=60, x=1),
]
KICK = [
    GUARD,
    dict(GUARD, lean=-6, thigh_n=60, shin_n=-90, y=0),
    dict(GUARD, lean=-14, thigh_n=88, shin_n=-4, foot_n=10, thigh_f=-6, y=-1),
    dict(GUARD, lean=-4, thigh_n=40, shin_n=-60),
]
HIT = {'lean': -16, 'head': -14, 'arm_n': -30, 'fore_n': 40, 'arm_f': -10, 'fore_f': 30, 'thigh_n': 4, 'thigh_f': -14, 'shin_f': -10, 'x': -2}
JUMP = {'lean': 6, 'arm_n': 60, 'fore_n': 70, 'arm_f': 30, 'fore_f': 80, 'thigh_n': 50, 'shin_n': -80, 'thigh_f': 20, 'shin_f': -90, 'foot_n': -20, 'foot_f': -20}

PRESETS = {
    # lengths and radii as fractions of the height; head is the head's radius
    'brawler': dict(head=0.08, neck=0.04, spine=0.27, pelvis=0.075, shoulder=0.11, upper=0.17, fore=0.15, hand=0.045,
                    thigh=0.23, shin=0.22, foot=0.12, r_neck=0.05, r_chest=0.13, r_waist=0.095, r_upper=0.055, r_fore=0.046,
                    r_thigh=0.07, r_shin=0.052, r_foot=0.04, depth=0.08),
    'boxer': dict(head=0.095, neck=0.04, spine=0.26, pelvis=0.075, shoulder=0.13, upper=0.17, fore=0.14, hand=0.07,
                  thigh=0.22, shin=0.2, foot=0.11, r_neck=0.065, r_chest=0.145, r_waist=0.1, r_upper=0.065, r_fore=0.055,
                  r_thigh=0.075, r_shin=0.055, r_foot=0.04, depth=0.09),
    'hero': dict(head=0.17, neck=0.02, spine=0.22, pelvis=0.06, shoulder=0.09, upper=0.12, fore=0.11, hand=0.05,
                 thigh=0.15, shin=0.14, foot=0.09, r_neck=0.05, r_chest=0.12, r_waist=0.1, r_upper=0.055, r_fore=0.05,
                 r_thigh=0.07, r_shin=0.06, r_foot=0.045, depth=0.1),
}


def pose(*bases, **kw):
    """A pose made of other poses (later ones win) and changed angles: pose(GUARD, arm_n=80)."""
    out = {}
    for b in bases: out.update(b)
    out.update(kw)
    return out


def ease(t):
    return t * t * (3 - 2 * t)


def lerp_pose(a, b, t):
    keys = set(a) | set(b)
    return {k: a.get(k, 0) + (b.get(k, 0) - a.get(k, 0)) * t for k in keys}


def mirror_sides(p):
    """The same pose with the near and far limbs swapped: the second half of a walk."""
    out = {}
    for k, v in p.items():
        if k.endswith('_n'): out[k[:-2] + '_f'] = v
        elif k.endswith('_f'): out[k[:-2] + '_n'] = v
        else: out[k] = v
    return out


def _dir(angle_from_down):
    a = math.radians(angle_from_down)
    return math.sin(a), math.cos(a)


class Rig:
    def __init__(s, preset='brawler', height=64, skin=None, hair=None, shirt=None, pants=None, shoes=None, hands=None,
                 margin=6, **overrides):
        from sculpt import Mat
        if preset not in PRESETS: raise ValueError('rig: presets are %s' % ', '.join(PRESETS))
        if skin is None: raise ValueError('rig: give at least skin= (a ramp such as pal.skin)')
        s.p = dict(PRESETS[preset]); s.p.update(overrides)
        s.height, s.margin, s.preset = height, margin, preset
        m = lambda v, d=None: (v if isinstance(v, Mat) else Mat(v)) if v is not None else d
        s.skin = m(skin)
        s.hair, s.shirt, s.pants = m(hair), m(shirt, s.skin), m(pants, s.skin)
        s.shoes = m(shoes, s.pants)
        s.hands = Mat(hands, gloss=0.6) if hands is not None and not isinstance(hands, Mat) else (hands or s.skin)
        # the canvas: room for the figure and its reach either side (arms out, a kick)
        s.w = int(height * 1.1) + 2 * margin
        s.h = height + 2 * margin

    def L(s, k): return s.p[k] * s.height

    def _far(s, mat):
        """A far-side version of a material: its ramp without the lightest step, so it reads one step darker."""
        from sculpt import Mat
        r = mat.ramp
        return Mat(r[:-1] if len(r) > 3 else r, gloss=mat.gloss * 0.5, rough=mat.rough, outline=mat.outline, pal=mat.pal)

    def joints(s, p):
        """The joint positions of a pose: {name: (x, y)} in canvas pixels."""
        g = lambda k: p.get(k, 0)
        H = s.height
        foot_y = s.margin + H                                   # the sole of a straight standing leg
        hip = (s.w * 0.45 + g('x'), foot_y - s.L('thigh') - s.L('shin') - s.L('r_foot') + g('y'))
        J = {'hip': hip}
        # the spine goes up from the hip, leaning forward with `lean`
        a = math.radians(g('lean'))
        chest = (hip[0] + math.sin(a) * s.L('spine'), hip[1] - math.cos(a) * s.L('spine'))
        J['chest'] = chest
        an = math.radians(g('lean') + g('neck'))
        neck = (chest[0] + math.sin(an) * s.L('neck'), chest[1] - math.cos(an) * s.L('neck'))
        J['neck'] = neck
        ah = math.radians(g('lean') + g('neck') + g('head'))
        J['head'] = (neck[0] + math.sin(ah) * s.L('head') * 0.9, neck[1] - math.cos(ah) * s.L('head') * 0.9)
        sh = (chest[0] + math.sin(a) * -s.L('r_chest') * 0.2, chest[1] + s.L('r_chest') * 0.25)
        for side in ('n', 'f'):
            J['shoulder_' + side] = sh
            au = g('arm_' + side) + g('lean') * 0.5
            dx, dy = _dir(au)
            elbow = (sh[0] + dx * s.L('upper'), sh[1] + dy * s.L('upper'))
            af = au + g('fore_' + side)
            dx, dy = _dir(af)
            hand = (elbow[0] + dx * s.L('fore'), elbow[1] + dy * s.L('fore'))
            J['elbow_' + side], J['hand_' + side] = elbow, hand
            at = g('thigh_' + side)
            dx, dy = _dir(at)
            knee = (hip[0] + dx * s.L('thigh'), hip[1] + dy * s.L('thigh'))
            ash = at + g('shin_' + side)
            dx, dy = _dir(ash)
            ankle = (knee[0] + dx * s.L('shin'), knee[1] + dy * s.L('shin'))
            af2 = math.radians(g('foot_' + side))
            toe = (ankle[0] + math.cos(af2) * s.L('foot'), ankle[1] - math.sin(af2) * s.L('foot'))
            J['knee_' + side], J['ankle_' + side], J['toe_' + side] = knee, ankle, toe
        return J

    def sculpt(s, p):
        """The Sculpt of a pose (to add to it: a weapon, a hat), with the joints."""
        from sculpt import Sculpt
        J = s.joints(p)
        sc = Sculpt(s.w, s.h)
        D = s.L('depth') * 2
        pt = lambda k, z: (J[k][0], J[k][1], z)
        for side, z, far in (('f', -D, True), ('n', D, False)):
            # legs: thigh, shin, foot; arms: upper, forearm, hand. Far side first is not needed (depth decides), but the
            # far side uses darker materials.
            pants = s._far(s.pants) if far else s.pants
            shoes = s._far(s.shoes) if far else s.shoes
            skin = s._far(s.skin) if far else s.skin
            shirt = s._far(s.shirt) if far else s.shirt
            hands = s._far(s.hands) if far else s.hands
            sc.capsule(pt('hip', z * 0.6), pt('knee_' + side, z), s.L('r_thigh'), s.L('r_thigh') * 0.85, pants, smooth=2)
            sc.capsule(pt('knee_' + side, z), pt('ankle_' + side, z), s.L('r_thigh') * 0.8, s.L('r_shin'), pants, smooth=2)
            sc.capsule(pt('ankle_' + side, z), pt('toe_' + side, z), s.L('r_foot') * 1.2, s.L('r_foot'), shoes)
            arm_z = z * 1.3
            sc.capsule(pt('shoulder_' + side, arm_z * 0.5), pt('elbow_' + side, arm_z), s.L('r_upper'), s.L('r_upper') * 0.85, shirt, smooth=1)
            sc.capsule(pt('elbow_' + side, arm_z), pt('hand_' + side, arm_z), s.L('r_fore'), s.L('r_fore') * 0.85, skin)
            hx, hy = J['hand_' + side]
            sc.sphere(hx, hy, arm_z + 1, max(1.5, s.L('hand')), hands)
        # the body: hips in the pants, a torso from waist to chest, the neck and the head
        hx, hy = J['hip']; cx, cy = J['chest']
        sc.ellipsoid(hx, hy, 0, s.L('r_waist') * 1.15, s.L('pelvis'), s.L('r_waist'), s.pants)
        # the torso: an ellipsoid along the spine, from the waist to the shoulders (its top stops at the chest joint, so
        # it does not cover the neck), broader at the chest than at the waist (a second, smaller one)
        mx, my = (hx + cx) / 2, (hy + cy) / 2
        lean = p.get('lean', 0)
        sc.ellipsoid(mx, my, 0, s.L('r_chest'), s.L('spine') * 0.55, s.L('r_chest'), s.shirt, rot=lean)
        a = math.radians(lean)
        sc.ellipsoid(mx - math.sin(a) * s.L('spine') * 0.25, my + math.cos(a) * s.L('spine') * 0.25, 0,
                     s.L('r_waist'), s.L('spine') * 0.35, s.L('r_waist'), s.shirt, rot=lean, smooth=3)
        sc.capsule(pt('chest', 0), pt('neck', 0), s.L('r_neck'), s.L('r_neck'), s.skin, smooth=2)
        nx, ny = J['head']
        hr = s.L('head')
        ah = math.radians(p.get('lean', 0) + p.get('neck', 0) + p.get('head', 0))
        fwd = lambda d, up: (nx + math.cos(ah) * d + math.sin(ah) * up, ny + math.sin(ah) * d - math.cos(ah) * up)
        sc.ellipsoid(nx, ny, 0, hr * 0.92, hr, hr * 0.95, s.skin)
        fx_, fy_ = fwd(hr * 0.55, -hr * 0.45)                       # the jaw and chin, forward and down
        sc.ellipsoid(fx_, fy_, 0, hr * 0.55, hr * 0.45, hr * 0.7, s.skin, smooth=2)
        nx2, ny2 = fwd(hr * 0.95, -hr * 0.05)                       # the nose
        sc.sphere(nx2, ny2, 0, max(1.2, hr * 0.22), s.skin, smooth=1)
        ex, ey = fwd(-hr * 0.15, -hr * 0.05)                        # the ear
        sc.sphere(ex, ey, hr * 0.6, max(1.2, hr * 0.22), s.skin)
        s._eye = fwd(hr * 0.5, hr * 0.15)
        if s.hair is not None:                               # hair over the top and back of the head
            ah = math.radians(p.get('lean', 0) + p.get('neck', 0) + p.get('head', 0))
            ox, oy = -math.sin(ah) * 0, -math.cos(ah) * s.L('head') * 0.25
            sc.ellipsoid(nx - s.L('head') * 0.15 + ox, ny + oy, -1, s.L('head') * 0.95, s.L('head') * 0.8, s.L('head') * 0.9, s.hair)
        return sc, J

    def render(s, p=None, **kw):
        """A pose as a picture (or {palette: picture} for materials in several palettes), lit as Sculpt.render(kw);
        the light comes from the upper right by default, the way the figure faces, so its face is lit."""
        sc, _ = s.sculpt(p or {})
        kw.setdefault('contours', 3)
        kw.setdefault('light', (0.8, -1.1, 0.9))                   # from the front (he faces right): the face is lit
        out = sc.render(**kw)
        ex, ey = int(s._eye[0]), int(s._eye[1])                     # the eye: a dot of the skin's darkest step
        img = out.get(s.skin.pal, next(iter(out.values()))) if isinstance(out, dict) else out
        if 0 <= ex < img.w and 0 <= ey < img.h and img.px[ey][ex] in s.skin.ramp: img.px[ey][ex] = s.skin.ramp[0]
        return out

    def animate(s, keys, frames, loop=True, mirror=None):
        """In-between poses: `frames` poses through the key poses, eased. A WALK (4 keys) plays its keys, then the same
        with the sides swapped (mirror=True, the default for WALK), so a loop of 8 frames is a full stride. Give at
        least one frame a key (fewer would skip a key: a punch whose hit never shows); with exactly one a key, each
        frame is a key."""
        keys = list(keys)
        if mirror is None: mirror = loop and len(keys) == 4 and keys[0] is WALK[0]
        if mirror: keys = keys + [mirror_sides(k) for k in keys]
        n = len(keys)
        if frames < n:
            raise ValueError('animate: %d frames for %d key poses would skip some (a punch whose hit never shows): give at least %d' % (frames, n, n))
        span = n if loop else n - 1
        out = []
        for f in range(frames):
            t = f / frames * span if loop else f / max(1, frames - 1) * span
            k = min(int(t), n - 1)
            a, b = keys[k % n], keys[(k + 1) % n] if loop else keys[min(k + 1, n - 1)]
            out.append(lerp_pose(a, b, ease(t - k)))
        return out


def filmstrip(path, rig, poses, pal, scale=3, onion=True, bones=True, cols=8):
    """All frames of an animation side by side, each over a faint copy of the frame before (onion skin) and with its
    skeleton drawn on a copy below, and a line for the ground: to check an animation without watching it. Writes a PNG.
    pal: the palette (Roles) of the figure, or {palette: Roles} when it uses several."""
    from preview import write_png, _colours
    frames = [rig.render(p) for p in poses]
    cmap = {}
    pals = pal if isinstance(pal, dict) else None
    def colour_at(img, x, y):
        if isinstance(img, dict):
            for sub, im in img.items():
                v = im.px[y][x]
                if v: return _colours(pals[sub] if pals else pal).get(v, 'ff00ff')
            return None
        v = img.px[y][x]
        return _colours(pal).get(v, 'ff00ff') if v else None
    W, H = rig.w, rig.h
    gap = 4
    rows_out = []
    for r0 in range(0, len(frames), cols):
        chunk = list(range(r0, min(len(frames), r0 + cols)))
        band = [['20202a'] * ((W + gap) * len(chunk)) for _ in range(H * 2 + gap)]
        for c, k in enumerate(chunk):
            ox = c * (W + gap)
            prev = frames[k - 1] if k > 0 else frames[-1]
            for y in range(H):
                for x in range(W):
                    col = colour_at(frames[k], x, y)
                    if col: band[y][ox + x] = col
                    elif onion and colour_at(prev, x, y): band[y][ox + x] = '3a3a58'
                    if y == rig.margin + rig.height: band[y][ox + x] = band[y][ox + x] if col else '506050'
                    # the copy with the skeleton below
                    band[H + gap + y][ox + x] = '202838' if not col else '404858'
            J = rig.joints(poses[k])
            segs = [('hip', 'chest'), ('chest', 'neck'), ('neck', 'head')]
            for side in ('f', 'n'):
                segs += [('shoulder_' + side, 'elbow_' + side), ('elbow_' + side, 'hand_' + side), ('hip', 'knee_' + side),
                         ('knee_' + side, 'ankle_' + side), ('ankle_' + side, 'toe_' + side)]
            if bones:
                for a, b in segs:
                    (x0, y0), (x1, y1) = J[a], J[b]
                    n = int(max(abs(x1 - x0), abs(y1 - y0))) + 1
                    colr = 'ff60c0' if a.endswith('_n') or b.endswith('_n') else '60c0ff' if a.endswith('_f') or b.endswith('_f') else 'f0f060'
                    for i in range(n + 1):
                        x, y = round(x0 + (x1 - x0) * i / n), round(y0 + (y1 - y0) * i / n)
                        if 0 <= x < W and 0 <= y < H: band[H + gap + y][ox + x] = colr
        rows_out += band + [['20202a'] * len(band[0]) for _ in range(gap)]
    width = max(len(r) for r in rows_out)
    rows_out = [r + ['20202a'] * (width - len(r)) for r in rows_out]
    big = [[c for c in r for _ in range(scale)] for r in rows_out for _ in range(scale)]
    write_png(path, big)
    return path
