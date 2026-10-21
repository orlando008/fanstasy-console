"""Heads drawn as a pixel artist designs them, on a draw.Canvas: planes of flat tone (a side plane turned from the
light, eye sockets under a brow ridge, the shadow side and underside of the nose, a cheekbone, a lit chin), a hair
mass with a shadow, a shine band and clumps, and eyes, brows and mouths drawn a pixel at a time. One template per
view, in head units, so it works at any size; below 20 px tall a head drops the planes that would turn to noise.

    d = Canvas(64, 96)
    head(d, 32, 30, 32, pal.skin, pal.hair, view='side', facing=1, expression='angry', style='swept',
         white=pal.white, iris=pal.iris)
    img = d.render(outline=pal, light=(1, -1))

x, y is the middle of the head (eye height), H its height from crown to chin. Ramps are dark to light, 5 steps or
more (pal.skin as a palette gives it): the darkest is the line colour, then deep shadow, shadow, base and light.
view     'side' (near profile), 'three' (three-quarters: the face cheated towards the camera, both eyes), 'front', 'back'
facing   1 (right) or -1 (left); for 'front', the side the light comes from
expression  'neutral', 'angry', 'hurt' (eyes squeezed shut, mouth open), 'shout' (mouth open, teeth)
style    hair: 'swept', 'short', 'spiky', 'long', 'mohawk', 'flat', 'bald'
white, iris  indices for the whites of the eyes and the iris; without them the eyes are drawn dark (as at small sizes)
tilt     degrees the head turns forward (a nod; negative throws it back), line= a shared outline colour (see tones())
The head is the part `part` (default 'head') of the canvas, the hair `part + '_hair'`, so a body can be drawn against
them (a collar over the neck, an arm with a seam over the jaw).
"""
import math
from draw import blob, brush, oval, poly, curve


def seam_tone(T):
    """The colour for a line inside a figure (between parts, a hem): the deep step, or the shade step when the ramp has
    no deep step of its own (its deep is the outline)."""
    return T['deep'] if T['deep'] != T['line'] else T['shade']


def tones(r, line=None):
    """A ramp's roles: line, deep, shade, base, light (a ramp of 5 or more steps; 4 doubles the line as deep). With
    line= (an index shared by every material: one outline colour for the whole figure, as Streets of Rage does), the
    ramp is the rest, dark to light, from 3 steps."""
    r = ([line] if line is not None else []) + list(r)
    if len(r) < 4: raise ValueError('a figure ramp needs 4 or more steps (dark to light), got %d' % len(r))
    if len(r) == 4: return dict(line=r[0], deep=r[0], shade=r[1], base=r[2], light=r[3])
    n = len(r)
    return dict(line=r[0], deep=r[n - 4], shade=r[n - 3], base=r[n - 2], light=r[n - 1])


# --- hair masses, side view, head units (u forward, v down; the head spans v -0.5 to 0.5) ---
_SIDE_HAIR = {
    'swept': [(-0.26, 0.20), (-0.34, 0.12), (-0.42, 0.18), (-0.47, 0.0), (-0.48, -0.25), (-0.32, -0.52), (-0.05, -0.62),
              (0.22, -0.58), (0.40, -0.44), (0.50, -0.30), (0.40, -0.28), (0.34, -0.20), (0.24, -0.26), (0.16, -0.20),
              (0.06, -0.24), (0.0, -0.14), (-0.04, -0.02), (-0.06, 0.08), (-0.10, 0.02), (-0.16, -0.06), (-0.22, 0.04),
              (-0.20, 0.14)],
    'short': [(-0.24, 0.16), (-0.36, 0.12), (-0.44, -0.04), (-0.43, -0.30), (-0.28, -0.50), (-0.02, -0.56), (0.22, -0.51),
              (0.36, -0.38), (0.39, -0.25), (0.30, -0.26), (0.16, -0.27), (0.04, -0.22), (-0.02, -0.12), (-0.04, 0.0),
              (-0.09, 0.03), (-0.14, -0.05), (-0.21, 0.04)],
    'flat':  [(-0.24, 0.16), (-0.36, 0.12), (-0.45, -0.04), (-0.46, -0.40), (-0.40, -0.66), (0.0, -0.70), (0.36, -0.66),
              (0.40, -0.40), (0.38, -0.25), (0.30, -0.26), (0.16, -0.27), (0.04, -0.22), (-0.02, -0.12), (-0.04, 0.0),
              (-0.09, 0.03), (-0.14, -0.05), (-0.21, 0.04)],
    'long':  [(-0.14, 0.20), (-0.20, 0.55), (-0.36, 0.70), (-0.52, 0.62), (-0.56, 0.20), (-0.52, -0.25), (-0.34, -0.52),
              (-0.05, -0.60), (0.22, -0.55), (0.38, -0.40), (0.40, -0.24), (0.30, -0.27), (0.16, -0.26), (0.04, -0.22),
              (-0.02, -0.10), (-0.04, 0.04), (-0.08, 0.06), (-0.14, -0.04)],
}
# clumps: (points, width at the root) in head units, drawn in the shade tone and tapering to a point
_SIDE_CLUMPS = {
    'swept': [([(-0.05, -0.50), (0.15, -0.46), (0.36, -0.36)], 0.05), ([(-0.25, -0.40), (-0.05, -0.36), (0.20, -0.30)], 0.045),
              ([(-0.30, -0.25), (-0.36, -0.05), (-0.36, 0.10)], 0.045), ([(-0.12, -0.28), (-0.20, -0.10), (-0.24, 0.05)], 0.04)],
    'short': [([(-0.10, -0.46), (0.10, -0.44), (0.28, -0.36)], 0.04), ([(-0.30, -0.32), (-0.36, -0.12), (-0.34, 0.04)], 0.04),
              ([(-0.14, -0.30), (-0.20, -0.14), (-0.22, 0.0)], 0.035)],
    'flat':  [([(-0.30, -0.60), (-0.30, -0.40)], 0.04), ([(-0.10, -0.62), (-0.10, -0.42)], 0.04), ([(0.10, -0.62), (0.10, -0.42)], 0.04),
              ([(0.28, -0.60), (0.28, -0.40)], 0.035), ([(-0.30, -0.25), (-0.36, -0.05), (-0.34, 0.08)], 0.04)],
    'long':  [([(-0.10, -0.50), (-0.34, -0.36), (-0.46, 0.0), (-0.44, 0.50)], 0.05), ([(0.10, -0.48), (-0.18, -0.30), (-0.30, 0.10), (-0.32, 0.55)], 0.045),
              ([(-0.20, -0.20), (-0.20, 0.10), (-0.24, 0.45)], 0.04)],
}


def _spikes(n, a0, a1, r_in, r_out, cx=-0.02, cy=-0.12, lean=-25):
    """A ring of n spikes over the skull from angle a0 to a1 (degrees, 0 = forward, -90 = up), tips leaning back."""
    pts = []
    for i in range(n * 2 + 1):
        a = math.radians(a0 + (a1 - a0) * i / (n * 2))
        if i % 2:
            a += math.radians(lean) / 2
            pts.append((cx + math.cos(a) * r_out, cy + math.sin(a) * r_out))
        else:
            pts.append((cx + math.cos(a) * r_in, cy + math.sin(a) * r_in))
    return pts


def head(d, x, y, H, skin, hair=None, view='side', facing=1, expression='neutral', style='short', white=None,
         iris=None, part='head', light=None, tilt=0, line=None):
    """Draw a head on canvas d (see the module's header)."""
    if view not in ('side', 'three', 'front', 'back'): raise ValueError("view is 'side', 'three', 'front' or 'back'")
    if expression not in ('neutral', 'angry', 'hurt', 'shout'): raise ValueError("expression is 'neutral', 'angry', 'hurt' or 'shout'")
    if style not in ('swept', 'short', 'spiky', 'long', 'mohawk', 'flat', 'bald'): raise ValueError('hair style %r' % style)
    f = 1 if facing >= 0 else -1
    S, Hr = tones(skin, line), tones(hair, line) if hair is not None else None
    lit = light or (f, -1)
    ca, sa = math.cos(math.radians(tilt)), math.sin(math.radians(tilt))
    P = lambda u, v: (x + f * (u * ca - v * sa) * H, y + (u * sa + v * ca) * H)
    Ps = lambda pts: [P(u, v) for u, v in pts]
    hp = part + '_hair'
    small = H < 20
    if view == 'side': _side(d, H, S, Hr, P, Ps, f, lit, expression, style, white, iris, part, hp, small)
    elif view == 'front': _front(d, H, S, Hr, P, Ps, f, lit, expression, style, white, iris, part, hp, small, Ps, lambda u: True)
    elif view == 'back': _back(d, H, S, Hr, P, Ps, f, lit, style, part, hp)
    else:
        # three-quarters: the front template turned on the skull, as fighting games cheat a face towards the camera.
        # A feature at u turns round a head of radius R; the outline turns from the brow down (the jaw and
        # chin come round, the crown stays where it is), and what turns past the edge is not drawn.
        R, tau = 0.42, math.radians(28)
        th = lambda u: math.asin(max(-1.0, min(1.0, u / R)))
        rot = lambda u: R * math.sin(th(u) + tau)
        w = lambda v: max(0.0, min(1.0, (v + 0.30) / 0.35))
        Pf = lambda u, v: P(rot(u), v)
        Psf = lambda pts: [Pf(u, v) for u, v in pts]
        Pso = lambda pts: [P(u + (rot(u) - u) * w(v) * 0.8, v) for u, v in pts]
        seen = lambda u: th(u) + tau < math.radians(80)
        # the hair stays on the skull (turned, its sideburn would land on the cheek)
        _front(d, H, S, Hr, Pf, Psf, f, lit, expression, style, white, iris, part, hp, small, Pso, seen, Ps)
    return d


def _hair_mass(d, H, Hr, Ps, P, f, lit, style, part, hp, mass, clumps):
    d.fill(blob(Ps(mass)), Hr['base'], part=hp)
    d.shadow(hp, Hr['shade'], light=lit, depth=H * 0.12)
    d.shadow(hp, Hr['deep'], light=lit, depth=H * 0.05)
    d.light(hp, Hr['light'], light=(lit[0] * 0.5, -1), inset=H * 0.05, width=H * 0.07)
    for pts, w0 in clumps:
        d.fill(brush(Ps(pts), H * w0, 0.4), Hr['shade'], inside=hp)
    d.seam(hp, seam_tone(Hr), under=part)


def _side(d, H, S, Hr, P, Ps, f, lit, expression, style, white, iris, part, hp, small):
    head = [(-0.40, -0.10), (-0.36, -0.32), (-0.18, -0.47), (0.05, -0.50), (0.25, -0.42), (0.35, -0.25), (0.37, -0.08),
            (0.33, -0.01), (0.36, 0.06), (0.41, 0.16), (0.34, 0.20), (0.33, 0.26), (0.30, 0.30), (0.31, 0.34), (0.29, 0.38),
            (0.32, 0.46), (0.24, 0.52), (0.04, 0.50), (-0.10, 0.42), (-0.18, 0.33), (-0.30, 0.15), (-0.38, 0.05)]
    d.fill(blob(Ps(head)), S['base'], part=part)
    # the side plane, turned from the light; the far edges
    d.fill(blob(Ps([(-0.5, -0.2), (0.0, -0.12), (0.05, 0.05), (0.08, 0.20), (0.14, 0.34), (0.12, 0.6), (-0.5, 0.5)])), S['shade'], inside=part)
    d.shadow(part, S['shade'], light=(f * 0.4, -1), depth=H * 0.06)
    angry = expression == 'angry'
    # eye socket under the brow ridge
    d.fill(blob(Ps([(0.08, -0.06), (0.22, -0.08), (0.35, -0.06), (0.31, 0.04), (0.18, 0.05), (0.09, 0.03)])), S['shade'], inside=part)
    if not small:
        d.fill(brush(Ps([(0.10, -0.11), (0.24, -0.12), (0.37, -0.10)]), H * 0.05, H * 0.03), S['light'], inside=part)
    # nose: its shadow side and underside, its lit ridge
    d.fill(poly(Ps([(0.26, 0.04), (0.33, 0.06), (0.36, 0.17), (0.33, 0.21), (0.22, 0.21), (0.24, 0.15)])), S['shade'], inside=part)
    if not small:
        d.fill(poly(Ps([(0.31, 0.05), (0.36, 0.06), (0.41, 0.16), (0.36, 0.16)])), S['light'], inside=part)
        # cheekbone light, cheek hollow, the shadow under the lower lip, a lit chin
        d.fill(brush(Ps([(0.10, 0.10), (0.18, 0.08), (0.27, 0.09)]), H * 0.05, H * 0.02), S['light'], inside=part)
        d.fill(blob(Ps([(0.06, 0.18), (0.16, 0.24), (0.16, 0.36), (0.06, 0.34)])), S['shade'], inside=part)
        d.fill(blob(Ps([(0.20, 0.335), (0.30, 0.33), (0.29, 0.37), (0.21, 0.37)])), S['shade'], inside=part)
        d.fill(blob(Ps([(0.22, 0.42), (0.29, 0.42), (0.28, 0.47), (0.23, 0.47)])), S['light'], inside=part)
    # the ear
    ear = part + '_ear'
    d.fill(blob(Ps([(-0.10, -0.02), (-0.20, -0.04), (-0.22, 0.10), (-0.14, 0.20), (-0.08, 0.14)])), S['base'], part=ear, inside=part)
    d.fill(blob(Ps([(-0.12, 0.02), (-0.17, 0.02), (-0.17, 0.10), (-0.12, 0.13)])), S['deep'], inside=ear)
    if not small: d.seam(ear, seam_tone(S))
    # hair
    if Hr is not None and style != 'bald':
        if style == 'spiky':
            mass = _SIDE_HAIR['short'][:4] + _spikes(5, -185, -25, 0.42, 0.66, lean=-40) + _SIDE_HAIR['short'][9:]
            clumps = _SIDE_CLUMPS['short']
        elif style == 'mohawk':
            mass = [(0.30, -0.30), (0.40, -0.52), (0.20, -0.66), (-0.10, -0.70), (-0.36, -0.58), (-0.48, -0.30), (-0.44, -0.10),
                    (-0.36, -0.20), (-0.20, -0.42), (0.05, -0.47), (0.24, -0.38)]
            clumps = [([(0.25, -0.50), (0.0, -0.60), (-0.30, -0.52)], 0.04)]
            d.fill(blob(Ps(_SIDE_HAIR['short'])), S['shade'], inside=part)       # the shaved sides
        else:
            mass, clumps = _SIDE_HAIR[style], _SIDE_CLUMPS[style]
        _hair_mass(d, H, Hr, Ps, P, f, lit, style, part, hp, mass, clumps)
    elif style == 'bald':
        d.light(part, S['light'], light=(f * 0.3, -1), inset=H * 0.04, width=H * 0.05, outside=part + '_ear')
    # eyes, brows, mouth: a pixel at a time
    line, deep = S['line'], (Hr['deep'] if Hr is not None else S['deep'])
    if expression == 'hurt':
        d.ink(Ps([(0.13, -0.03), (0.20, 0.0), (0.28, -0.025)]), line)
        d.ink(Ps([(0.10, -0.11), (0.22, -0.09), (0.33, -0.06)]), deep)
    else:
        if not small and white is not None:
            lid = 0.01 if angry else -0.02
            d.fill(blob(Ps([(0.13, lid + 0.015), (0.22, lid), (0.28, lid + 0.02), (0.22, 0.035), (0.14, 0.025)])), white, inside=part, pri=4)
            if iris is not None: d.fill(oval(*P(0.235, 0.012), H * 0.03, H * 0.033), iris, inside=part, pri=6)
            d.ink(Ps([(0.12, lid + 0.008), (0.20, lid - 0.01), (0.29, lid + 0.01)]), line)
            d.dot(*P(0.245, 0.004), line)
        else:
            d.ink(Ps([(0.22, -0.02), (0.22, 0.03)]), line)
        brow = [(0.10, -0.10), (0.22, -0.075), (0.33, -0.03)] if angry else [(0.10, -0.085), (0.22, -0.09), (0.33, -0.075)]
        if small: brow = [(u, v - 0.035) for u, v in brow]
        d.ink(Ps(brow), Hr['shade'] if small and Hr is not None else deep)
        if angry and not small: d.ink(Ps([(0.12, -0.11), (0.24, -0.09)]), deep)
    if expression in ('hurt', 'shout'):
        mouth = [(0.18, 0.28), (0.31, 0.27), (0.30, 0.36), (0.22, 0.37)] if expression == 'shout' else [(0.19, 0.29), (0.30, 0.28), (0.29, 0.34), (0.21, 0.35)]
        d.fill(blob(Ps(mouth)), line, inside=part, pri=4)
        if not small: d.ink(Ps([(0.20, 0.285), (0.29, 0.28)]), white if white is not None else S['light'])
    else:
        m = [(0.17, 0.31), (0.24, 0.30), (0.31, 0.30)] if angry else [(0.17, 0.30), (0.25, 0.305), (0.31, 0.29)]
        d.ink(Ps(m), line)
    # the jaw line over the neck
    d.seam(part, seam_tone(S), under=part + '_neck', sides=[(0, 1), (-f, 1)])


def _front(d, H, S, Hr, P, Ps, f, lit, expression, style, white, iris, part, hp, small, Po, seen, Ph=None):
    Ph = Ph or Po
    def sym(pts): return pts + [(-u, v) for u, v in reversed(pts)]
    head = sym([(0.0, -0.50), (0.22, -0.46), (0.36, -0.30), (0.38, -0.08), (0.36, 0.14), (0.33, 0.30), (0.24, 0.43), (0.10, 0.50)])
    d.fill(blob(Po(head)), S['base'], part=part)
    ear = part + '_ear'
    for s in (1, -1):
        if not seen(s * 0.40): continue
        d.fill(blob(Ps([(s * 0.35, -0.04), (s * 0.43, -0.06), (s * 0.44, 0.08), (s * 0.38, 0.20), (s * 0.34, 0.14)])), S['base'], part=ear)
        d.fill(blob(Ps([(s * 0.38, 0.0), (s * 0.41, 0.0), (s * 0.40, 0.09), (s * 0.37, 0.10)])), S['shade'] if small else S['deep'], inside=ear)
    d.shadow(part, S['shade'], light=lit, depth=H * 0.10)
    d.shadow(ear, S['shade'], light=lit, depth=H * 0.05)
    angry = expression == 'angry'
    # sockets under the brow ridge, both sides; the dark side's deeper
    for s in (1, -1):
        d.fill(blob(Ps([(s * 0.06, -0.05), (s * 0.18, -0.08), (s * 0.30, -0.06), (s * 0.28, 0.04), (s * 0.16, 0.06), (s * 0.07, 0.03)])), S['shade'], inside=part)
    if not small:
        d.fill(brush(Ps([(-0.30, -0.11), (-0.16, -0.12), (-0.04, -0.09)]), H * 0.04, H * 0.03), S['light'], inside=part)
        d.fill(brush(Ps([(0.04, -0.09), (0.16, -0.12), (0.30, -0.11)]), H * 0.04, H * 0.03), S['light'], inside=part)
    # nose: the shadow side (away from the light), the underside, a lit ridge on the light side
    d.fill(poly(Ps([(-0.04, 0.0), (-0.07, 0.15), (-0.09, 0.20), (0.0, 0.22), (0.09, 0.20), (0.07, 0.15), (0.04, 0.0)])), None, part=part + '_nose', inside=part)
    d.fill(poly(Ps([(-0.02, 0.0), (-0.08, 0.17), (-0.09, 0.21), (0.08, 0.22), (0.07, 0.20), (0.0, 0.17)])), S['shade'], inside=part)
    if not small:
        d.fill(poly(Ps([(0.0, 0.02), (0.04, 0.02), (0.07, 0.15), (0.03, 0.16)])), S['light'], inside=part)
        # cheekbones, the light one lit; the lip and the chin
        d.fill(brush(Ps([(0.10, 0.10), (0.20, 0.08), (0.30, 0.06)]), H * 0.045, H * 0.02), S['light'], inside=part)
        d.fill(blob(Ps([(-0.08, 0.345), (0.08, 0.345), (0.06, 0.38), (-0.06, 0.38)])), S['shade'], inside=part)
        d.fill(blob(Ps([(-0.07, 0.43), (0.07, 0.43), (0.05, 0.48), (-0.05, 0.48)])), S['light'], inside=part)
    line, deep = S['line'], (Hr['deep'] if Hr is not None else S['deep'])
    # hair
    if Hr is not None and style != 'bald':
        top = {'short': -0.58, 'swept': -0.64, 'flat': -0.74, 'long': -0.60, 'spiky': -0.58, 'mohawk': -0.70}[style]
        line_v = -0.26
        side = [(0.26, top + 0.05), (0.41, -0.36), (0.42, -0.16), (0.39, 0.0), (0.355, 0.0), (0.345, -0.16), (0.26, -0.29)]
        mass = [(0.0, top)] + side + [(0.12, -0.33), (0.05, -0.27), (-0.02, -0.31), (-0.14, -0.32)] + [(-u, v) for u, v in reversed(side)]
        if style == 'swept' and not small:       # a lock falling across the forehead from the parting (small: it would cover an eye)
            mass = [(0.0, top)] + side + [(0.12, -0.33), (0.05, -0.28), (-0.06, -0.22), (-0.20, -0.18), (-0.30, -0.24)] + [(-u, v) for u, v in reversed(side)]
        if style == 'long':
            mass = sym([(0.0, top), (0.30, top + 0.04), (0.46, -0.30), (0.50, 0.20), (0.46, 0.62), (0.34, 0.66), (0.36, 0.0), (0.30, -0.22), (0.12, line_v), (0.0, line_v + 0.01)])
        if style == 'flat':
            mass = sym([(0.0, top), (0.36, top + 0.02), (0.42, -0.36), (0.42, -0.10), (0.37, -0.02), (0.35, -0.18), (0.24, line_v + 0.02), (0.0, line_v)])
        if style == 'spiky':
            sp = []
            for i in range(9):
                a = math.radians(-170 + 160 * i / 8)
                r = 0.56 if i % 2 else 0.40
                sp.append((0.0 + math.cos(a) * r * 1.05, -0.12 + math.sin(a) * r))
            mass = [(0.44, -0.10), (0.38, -0.02), (0.35, -0.18), (0.24, -0.24), (0.0, -0.26), (-0.24, -0.24), (-0.35, -0.18), (-0.38, -0.02), (-0.44, -0.10)] + sp
        if style == 'mohawk':
            d.fill(blob(Ph(sym([(0.0, -0.56), (0.26, -0.52), (0.40, -0.34), (0.40, -0.12), (0.34, -0.18), (0.24, -0.24), (0.0, -0.25)]))), S['shade'], inside=part)
            mass = [(-0.10, -0.24), (-0.12, -0.50), (-0.08, -0.72), (0.0, -0.76), (0.08, -0.72), (0.12, -0.50), (0.10, -0.24)]
        clumps = [([(0.0, top + 0.04), (0.16, -0.40), (0.24, -0.26)], 0.04), ([(-0.06, top + 0.06), (-0.20, -0.42), (-0.30, -0.24)], 0.04),
                  ([(0.24, -0.50), (0.38, -0.30), (0.40, -0.08)], 0.035)]
        if style == 'long': clumps += [([(0.40, -0.10), (0.42, 0.30), (0.40, 0.60)], 0.04), ([(-0.40, -0.10), (-0.42, 0.30), (-0.40, 0.60)], 0.04)]
        if style in ('spiky', 'mohawk'): clumps = []
        _hair_mass(d, H, Hr, Ph, P, f, lit, style, part, hp, mass, clumps)
    elif style == 'bald':
        d.light(part, S['light'], light=(f * 0.3, -1), inset=H * 0.04, width=H * 0.05)
    # eyes (a small head turned three-quarters keeps only the near one: the far one would sit on the outline)
    for s in (1, -1):
        if small and not seen(s * 0.40): continue
        if expression == 'hurt':
            d.ink(Ps([(s * 0.08, -0.02), (s * 0.17, 0.01), (s * 0.27, -0.01)]), line)
            continue
        lid = 0.0 if angry else -0.025
        if not small and white is not None:
            d.fill(blob(Ps([(s * 0.08, lid + 0.02), (s * 0.17, lid), (s * 0.27, lid + 0.02), (s * 0.18, 0.04), (s * 0.10, 0.035)])), white, inside=part, pri=4)
            if iris is not None: d.fill(oval(*P(s * 0.165, 0.012), H * 0.032, H * 0.036), iris, inside=part, pri=6)
            d.ink(Ps([(s * 0.07, lid + 0.015), (s * 0.17, lid - 0.008), (s * 0.28, lid + 0.015)]), line)
            d.dot(*P(s * 0.165 + 0.01, 0.006), line)
        else:
            d.ink(Ps([(s * 0.17, -0.02), (s * 0.17, 0.03)]), line)       # small: the eye a short dark mark
    for s in (1, -1):
        brow = [(s * 0.05, -0.06), (s * 0.16, -0.09), (s * 0.29, -0.10)] if angry else [(s * 0.06, -0.09), (s * 0.17, -0.11), (s * 0.29, -0.095)]
        if expression == 'hurt': brow = [(s * 0.05, -0.12), (s * 0.16, -0.10), (s * 0.28, -0.07)]
        if small: brow = [(u, v - 0.05) for u, v in brow]               # a pixel of skin between brow and eye
        d.ink(Ps(brow), Hr['shade'] if small and Hr is not None else deep)
    if expression in ('hurt', 'shout'):
        r = 0.12 if expression == 'shout' else 0.09
        d.fill(blob(Ps([(-r, 0.28), (r, 0.28), (r * 0.8, 0.37), (-r * 0.8, 0.37)])), line, inside=part, pri=4)
        if not small: d.ink(Ps([(-r + 0.02, 0.285), (r - 0.02, 0.285)]), white if white is not None else S['light'])
    else:
        m = [(-0.10, 0.31), (0.0, 0.30), (0.10, 0.31)] if angry else [(-0.10, 0.30), (0.0, 0.31), (0.10, 0.30)]
        if small: d.ink(Ps([(-0.06, 0.27), (0.06, 0.27)]), S['deep'])      # small: 2 px, off the chin's outline
        else: d.ink(Ps(m), line)
    d.seam(part, S['deep'], under=part + '_neck', sides=[(0, 1)])


def _back(d, H, S, Hr, P, Ps, f, lit, style, part, hp):
    def sym(pts): return pts + [(-u, v) for u, v in reversed(pts)]
    d.fill(blob(Ps(sym([(0.0, -0.50), (0.24, -0.46), (0.38, -0.28), (0.39, -0.04), (0.34, 0.20), (0.24, 0.34), (0.08, 0.38)]))), S['base'], part=part)
    ear = part + '_ear'
    for s in (1, -1):
        d.fill(blob(Ps([(s * 0.34, -0.06), (s * 0.44, -0.08), (s * 0.45, 0.08), (s * 0.38, 0.20), (s * 0.33, 0.12)])), S['base'], part=ear)
    d.shadow(part, S['shade'], light=lit, depth=H * 0.10)
    d.shadow(ear, S['shade'], light=lit, depth=H * 0.05)
    if Hr is not None and style != 'bald':
        top = {'short': -0.58, 'swept': -0.64, 'flat': -0.74, 'long': -0.60, 'spiky': -0.58, 'mohawk': -0.70}[style]
        bottom = 0.70 if style == 'long' else 0.24
        mass = sym([(0.0, top), (0.28, top + 0.05), (0.44, -0.30), (0.44, -0.04), (0.38, bottom - 0.06), (0.30, bottom - 0.02), (0.24, bottom - 0.08),
                    (0.17, bottom + 0.02), (0.10, bottom - 0.06), (0.04, bottom + 0.04)])
        if style == 'mohawk': mass = [(-0.10, 0.20), (-0.12, -0.50), (0.0, -0.76), (0.12, -0.50), (0.10, 0.20)]
        clumps = [([(0.0, top + 0.04), (0.10, -0.20), (0.12, bottom - 0.04)], 0.045), ([(-0.12, top + 0.08), (-0.22, -0.10), (-0.24, bottom - 0.06)], 0.045),
                  ([(0.20, top + 0.10), (0.32, -0.10), (0.30, bottom - 0.08)], 0.04)]
        _hair_mass(d, H, Hr, Ps, P, f, lit, style, part, hp, mass, clumps)
    d.seam(part, S['deep'], under=part + '_neck', sides=[(0, 1)])


# --- bodies: designed limb shapes on the rig's skeleton ---
# A limb's profile: rows of (t, front, back), t from 0 at its first joint to 1 at the second (a little past both, so
# joints overlap), front and back the half-widths in units of the limb's radius ('front' is the side the figure faces
# when the limb hangs down: the bicep, the quadriceps, the shin).
_PROFILES = {
    'upper': [(-0.15, 0.55, 0.6), (0.0, 0.95, 1.0), (0.35, 1.12, 1.0), (0.7, 0.95, 0.92), (1.0, 0.75, 0.8), (1.12, 0.5, 0.55)],
    'fore':  [(-0.12, 0.6, 0.6), (0.0, 0.9, 0.95), (0.25, 1.1, 1.05), (0.65, 0.85, 0.8), (1.0, 0.68, 0.66), (1.06, 0.5, 0.5)],
    'thigh': [(-0.08, 0.85, 0.8), (0.0, 1.0, 1.0), (0.3, 1.1, 1.02), (0.7, 0.95, 0.88), (1.0, 0.76, 0.8), (1.1, 0.5, 0.55)],
    'shin':  [(-0.08, 0.7, 0.75), (0.0, 0.85, 0.95), (0.3, 0.85, 1.22), (0.65, 0.72, 0.88), (1.0, 0.62, 0.62), (1.06, 0.45, 0.45)],
    'neck':  [(-0.2, 1.1, 1.1), (0.0, 1.0, 1.05), (1.0, 0.9, 0.95), (1.2, 0.8, 0.8)],
}
# the torso in its own frame: u forward, v up the spine from the hip joint, in units of the figure's height
_TORSO = [(0.0, -0.02), (0.075, 0.04), (0.09, 0.12), (0.115, 0.19), (0.125, 0.235), (0.10, 0.278), (0.05, 0.30),
          (-0.02, 0.305), (-0.10, 0.295), (-0.135, 0.255), (-0.13, 0.19), (-0.095, 0.11), (-0.085, 0.03), (-0.065, -0.02)]
_HIPS = [(-0.075, -0.075), (0.08, -0.075), (0.085, 0.0), (0.075, 0.055), (-0.08, 0.055), (-0.088, 0.0)]
# turned towards us (view='three'): both shoulders, the chest square to the camera, hips a little wider
_TORSO3 = [(-0.07, -0.02), (0.075, -0.02), (0.09, 0.06), (0.10, 0.13), (0.125, 0.20), (0.135, 0.245), (0.11, 0.28),
           (0.045, 0.30), (-0.03, 0.303), (-0.065, 0.30), (-0.12, 0.285), (-0.155, 0.255), (-0.145, 0.20), (-0.11, 0.13),
           (-0.085, 0.05)]
_HIPS3 = [(-0.088, -0.075), (0.085, -0.075), (0.092, 0.0), (0.08, 0.055), (-0.088, 0.055), (-0.098, 0.0)]


def _frame(a, b):
    """The local frame of a bone from a to b: (point at t, offset) -> canvas point; front is the facing side."""
    dx, dy = b[0] - a[0], b[1] - a[1]
    L = math.hypot(dx, dy) or 1e-6
    ux, uy = dx / L, dy / L
    nx, ny = uy, -ux                     # hanging down (0, 1): front is (1, 0)
    def at(t, off=0.0):
        return (a[0] + dx * t + nx * off, a[1] + dy * t + ny * off)
    return at, L


def _limb(a, b, r, prof, flip=1, upto=None):
    """The outline of a limb from joint a to b with radius r and a profile (see _PROFILES); upto= cuts it at that t."""
    at, _ = _frame(a, b)
    rows = [row for row in prof if upto is None or row[0] <= upto]
    if upto is not None and rows[-1][0] < upto:
        rows.append((upto, rows[-1][1], rows[-1][2]))
    front = [at(t, fr * r * flip) for t, fr, bk in rows]
    back = [at(t, -bk * r * flip) for t, fr, bk in rows]
    return front + back[::-1]


class Figure:
    """A character drawn the way a pixel artist draws one (designed shapes in flat tones, see the module header), on
    the skeleton of a rig.Rig: the same presets, poses, animate() and filmstrip().

        BR = art.sprite_palette(0, {'line': '201018', 'skin': ramp('e8a878', 4), 'hair': ramp('e0b040', 3), ...})
        hero = Figure('brawler', height=72, line=BR.line, skin=BR.skin, hair=BR.hair, shirt=BR.shirt, pants=BR.pants,
                      shoes=BR.shoe, face='angry', hair_style='swept', top='tee')
        img = hero.render(GUARD)

    line     one outline colour for the whole figure (then each ramp needs 3 steps or more: deep, base, light ...;
             4 adds a light step); without it each ramp's darkest step outlines it (ramps of 5)
    top      'tee' (short sleeves), 'tank' (bare arms), 'long' (sleeves to the wrist), 'bare' (no shirt)
    hands    a ramp for gloves (or None: skin)
    view     'three' (the default): the chest and face cheated towards the camera, as Streets of Rage and Street
             Fighter draw them (both shoulders show, the near arm hangs at the back of the chest instead of over it,
             both eyes show), the legs and the moves still side on; 'side': a true profile
    face, hair_style, white, iris   as head() takes them; the head is tilted with the neck
    """
    def __init__(s, preset='brawler', height=64, skin=None, hair=None, shirt=None, pants=None, shoes=None, hands=None,
                 line=None, face='neutral', hair_style='short', top='tee', white=None, iris=None, margin=6, view='three',
                 **overrides):
        from rig import Rig
        if skin is None: raise ValueError('figure: give at least skin= (a ramp such as pal.skin)')
        if top not in ('tee', 'tank', 'long', 'bare'): raise ValueError("top is 'tee', 'tank', 'long' or 'bare'")
        if view not in ('three', 'side'): raise ValueError("a figure's view is 'three' or 'side'")
        s.view = view
        s.rig = Rig(preset, height=height, skin=skin, margin=margin, **overrides)
        s.w, s.h, s.height, s.margin = s.rig.w, s.rig.h, height, margin
        s.line = line
        T = lambda r: tones(r, line) if r is not None else None
        s.skin, s.hair = T(skin), T(hair)
        s.shirt = T(shirt) or s.skin
        s.pants = T(pants) or s.skin
        s.shoes = T(shoes) or s.pants
        s.hands = T(hands) or s.skin
        s.raw = dict(skin=skin, hair=hair)
        s.face, s.hair_style, s.top, s.white, s.iris = face, hair_style, top, white, iris

    def joints(s, p):
        """The rig's joints, the shoulders spread for the view: turned towards us ('three'), the near shoulder goes back
        and the far one forward, each arm with it (the near one comes forward again as it punches); in profile the far arm still moves a little forward and up (a far
        fist in a guard is ahead of the near one)."""
        J = s.rig.joints(p)
        r = s.L('r_chest')
        if s.view == 'three':
            # the body twists into a punch: as the near arm comes up past a guard, its shoulder comes forward
            twist = max(0.0, min(1.0, (p.get('arm_n', 0) - 30) / 55))
            moves = {'n': (-r * 0.75 + r * 0.95 * twist, r * 0.12), 'f': (r * 0.75, r * 0.05)}
        else: moves = {'n': (0.0, 0.0), 'f': (r * 0.3, -r * 0.1)}
        for side, (dx, dy) in moves.items():
            for k in ('shoulder_', 'elbow_', 'hand_'): J[k + side] = (J[k + side][0] + dx, J[k + side][1] + dy)
        return J
    def animate(s, keys, frames, loop=True, mirror=None): return s.rig.animate(keys, frames, loop, mirror)
    def L(s, k): return s.rig.L(k)

    @staticmethod
    def _far(T):
        """A far-side material: a step darker all through."""
        return dict(T, light=T['base'], base=T['shade'], shade=T['deep'])

    def _shade_part(s, d, part, T, r, light):
        d.shadow(part, T['shade'], light=light, depth=max(1.2, r * 0.7))
        d.light(part, T['light'], light=light, inset=max(0.8, r * 0.25), width=max(0.8, r * 0.35))

    def canvas(s, p=None):
        """The Canvas of a pose, drawn and not yet rendered (to add to it: a weapon, a hat), with the joints."""
        from draw import Canvas
        p = p or {}
        J = s.joints(p)
        d = Canvas(s.w, s.h)
        light = (1, -1)
        R = lambda k: s.L(k)
        far_front = J['hand_f'][0] > J['chest'][0] + R('r_chest') * 0.3      # the far fist up in front of the chest (a guard)
        for side in ('f', 'n'):
            far = side == 'f'
            sk, sh_, pa, so, ha = (s._far(m) if far else m for m in (s.skin, s.shirt, s.pants, s.shoes, s.hands))
            if not far:
                s._body(d, p, J, light)
                if far_front: s._arm(d, J, 'f', *(s._far(m) for m in (s.skin, s.shirt, s.hands)), light, which='fore')
            # the leg: thigh and shin in the pants, the shoe
            leg = 'leg_' + side
            hip = J['hip']
            spread = (0.55, -0.45) if s.view == 'three' else (0.25, -0.1)
            hip_side = (hip[0] + spread[0 if far else 1] * R('r_thigh'), hip[1])
            d.fill(blob(_limb(hip_side, J['knee_' + side], R('r_thigh'), _PROFILES['thigh'])), pa['base'], part=leg + '_thigh')
            d.fill(blob(_limb(J['knee_' + side], J['ankle_' + side], R('r_shin'), _PROFILES['shin'])), pa['base'], part=leg + '_shin')
            for seg, r in (('_thigh', R('r_thigh')), ('_shin', R('r_shin'))): s._shade_part(d, leg + seg, pa, r, light)
            s._knee_folds(d, J, side, pa, leg)
            s._shoe(d, J, side, so, leg)
            if not far: d.seam(leg + '_thigh', seam_tone(pa), under='torso')
            # the arm (the far one behind the body, unless its fist is up in front)
            s._arm(d, J, side, sk, sh_, ha, light, which='upper' if far and far_front else 'all')
        return d, J

    def _body(s, d, p, J, light):
        R = lambda k: s.L(k)
        H = s.height
        hip, chest = J['hip'], J['chest']
        a = math.radians(p.get('lean', 0))
        def T(u, v):            # torso frame: u forward, v up the spine, height units
            return (hip[0] + (u * math.cos(a) + v * math.sin(a)) * H, hip[1] + (u * math.sin(a) - v * math.cos(a)) * H)
        sk, sh, pa = s.skin, s.shirt, s.pants
        # the neck, under the head
        neck_top = J['neck']
        d.fill(blob(_limb(T(0.0, 0.26), neck_top, R('r_neck'), _PROFILES['neck'])), sk['shade'], part='head_neck')
        d.fill(blob(_limb(T(0.0, 0.26), neck_top, R('r_neck'), _PROFILES['neck'], upto=0.6)), sk['deep'], inside='head_neck')
        # the hips (pants) and the torso
        three = s.view == 'three'
        d.fill(blob([T(u, v) for u, v in (_HIPS3 if three else _HIPS)]), pa['base'], part='hips')
        s._shade_part(d, 'hips', pa, R('r_waist'), light)
        torso_c = sk if s.top == 'bare' else sh
        d.fill(blob([T(u, v) for u, v in (_TORSO3 if three else _TORSO)]), torso_c['base'], part='torso')
        d.shadow('torso', torso_c['shade'], light=light, depth=R('r_chest') * 0.45)
        d.light('torso', torso_c['light'], light=light, inset=R('r_chest') * 0.12, width=R('r_chest') * 0.22)
        if three and s.top == 'bare':
            # two pecs and the line under them, the breastbone, abdominals in two rows
            for a0, a1 in (((-0.12, 0.215), (-0.02, 0.19)), ((0.0, 0.19), (0.11, 0.215))):
                d.fill(brush([T(*a0), T((a0[0] + a1[0]) / 2, 0.18), T(*a1)], H * 0.012, H * 0.006), sk['shade'], inside='torso')
            d.fill(brush([T(-0.01, 0.27), T(-0.01, 0.19)], H * 0.008, H * 0.004), sk['shade'], inside='torso')
            for v in (0.10, 0.14):
                for u0 in (-0.06, 0.02):
                    d.fill(brush([T(u0, v), T(u0 + 0.04, v + 0.004)], H * 0.008, H * 0.004), sk['shade'], inside='torso')
        elif three:
            # folds from each armpit towards the waist, the hem over the belt, a collar round the neck (a tank top:
            # the chest bare in a scoop)
            d.fill(brush([T(0.10, 0.20), T(0.07, 0.13), T(0.04, 0.07)], H * 0.012, 0.3), sh['shade'], inside='torso')
            d.fill(brush([T(-0.11, 0.20), T(-0.08, 0.13), T(-0.06, 0.07)], H * 0.012, 0.3), sh['shade'], inside='torso')
            d.fill(brush([T(-0.08, 0.02), T(0.0, 0.025), T(0.08, 0.02)], H * 0.012), sh['shade'], inside='torso')
            if s.top == 'tank':
                d.fill(blob([T(-0.06, 0.31), T(0.05, 0.31), T(0.04, 0.26), T(0.0, 0.235), T(-0.05, 0.26)]), sk['base'], inside='torso')
            else:
                d.fill(brush([T(-0.055, 0.298), T(-0.01, 0.283), T(0.04, 0.298)], H * 0.014), sh['shade'], inside='torso')
        elif s.top == 'bare':
            # pec and the line under it, abdominals as two short plane edges
            d.fill(brush([T(0.03, 0.205), T(0.07, 0.19), T(0.105, 0.2)], H * 0.012, H * 0.006), sk['shade'], inside='torso')
            for v in (0.10, 0.14):
                d.fill(brush([T(0.05, v), T(0.08, v + 0.005)], H * 0.008, H * 0.004), sk['shade'], inside='torso')
        else:
            # folds from under the arm towards the waist, the hem over the belt, a collar
            d.fill(brush([T(-0.03, 0.2), T(0.0, 0.13), T(0.03, 0.06)], H * 0.012, 0.3), sh['shade'], inside='torso')
            d.fill(brush([T(0.03, 0.17), T(0.05, 0.11)], H * 0.01, 0.3), sh['shade'], inside='torso')
            d.fill(brush([T(-0.08, 0.02), T(0.0, 0.025), T(0.08, 0.035)], H * 0.012), sh['shade'], inside='torso')
            if s.top == 'tank':
                d.fill(blob([T(0.0, 0.31), T(0.05, 0.285), T(0.08, 0.24), T(0.06, 0.2), T(0.02, 0.25)]), sk['base'], inside='torso')
            else:
                d.fill(brush([T(-0.03, 0.29), T(0.02, 0.285), T(0.06, 0.28)], H * 0.014), sh['shade'], inside='torso')
        # the belt
        d.fill(poly([T(-0.09, 0.0), T(0.09, 0.0), T(0.09, 0.03), T(-0.09, 0.03)]), pa['deep'], inside='hips', pri=2)
        d.fill(poly([T(0.045, 0.0), T(0.07, 0.0), T(0.07, 0.03), T(0.045, 0.03)]), s.pants['light'], inside='hips', pri=3)
        # the head
        head(d, J['head'][0], J['head'][1], s.L('head') * 2.1, s.raw['skin'], s.raw['hair'], view=s.view, facing=1,
             expression=s.face, style=s.hair_style, white=s.white, iris=s.iris, tilt=p.get('lean', 0) + p.get('neck', 0) + p.get('head', 0),
             line=s.line)
        d.seam('torso', seam_tone(sh if s.top != 'bare' else sk), under='head_neck', sides=[(0, -1), (1, -1), (-1, -1)])

    def _arm(s, d, J, side, sk, sh, ha, light, which='all'):
        R = lambda k: s.L(k)
        arm = 'arm_' + side
        shoulder, elbow, hand = J['shoulder_' + side], J['elbow_' + side], J['hand_' + side]
        up = _limb(shoulder, elbow, R('r_upper'), _PROFILES['upper'])
        fo = _limb(elbow, hand, R('r_fore'), _PROFILES['fore'])
        if which in ('all', 'upper'):
            d.fill(blob(up), sk['base'], part=arm + '_upper')
            s._shade_part(d, arm + '_upper', sk, R('r_upper'), light)
            if s.top in ('tee', 'long'):
                upto = 1.12 if s.top == 'long' else 0.5
                sleeve = _limb(shoulder, elbow, R('r_upper') * 1.05, _PROFILES['upper'], upto=upto)
                d.fill(blob(sleeve), sh['base'], part=arm + '_sleeve')
                s._shade_part(d, arm + '_sleeve', sh, R('r_upper'), light)
                if s.top == 'tee': d.seam(arm + '_sleeve', seam_tone(sh), under=arm + '_upper')
            if side == 'n':
                d.seam(arm + '_upper', seam_tone(sk), under='torso')
                if s.top in ('tee', 'long'): d.seam(arm + '_sleeve', seam_tone(sh), under='torso')
        if which in ('all', 'fore'):
            fc = sh if s.top == 'long' else sk
            d.fill(blob(fo), fc['base'], part=arm + '_fore')
            s._shade_part(d, arm + '_fore', fc, R('r_fore'), light)
            # the fist: a rounded block beyond the wrist, knuckles towards the forearm's direction
            at, _ = _frame(elbow, hand)
            r = R('hand')
            k = r / (s.L('fore') or 1) * 1.6
            at2 = lambda t, o: at(1.0 + t * k, o)
            fist = [at2(t, o) for t, o in ((-0.1, r * 0.8), (0.3, r * 1.05), (0.8, r * 1.0), (1.0, 0.0), (0.8, -r * 0.95), (0.3, -r * 1.0), (-0.1, -r * 0.75))]
            d.fill(blob(fist), ha['base'], part=arm + '_hand')
            d.shadow(arm + '_hand', ha['shade'], light=light, depth=max(1.0, r * 0.5))
            d.ink([at2(0.75, r * 0.6), at2(0.55, -r * 0.2)], seam_tone(ha))
            d.seam(arm + '_hand', seam_tone(ha), under=arm + '_fore')
            if side == 'n' or which == 'fore':
                d.seam(arm + '_fore', seam_tone(fc), under='torso')
                d.seam(arm + '_hand', seam_tone(ha), under='torso')

    def _knee_folds(s, d, J, side, pa, leg):
        at, _ = _frame(J['hip'], J['knee_' + side])
        r = s.L('r_thigh')
        d.fill(brush([at(0.75, -r * 0.9), at(0.95, -r * 0.3)], r * 0.35, 0.3), pa['shade'], inside=leg + '_thigh')
        d.fill(brush([at(0.2, r * 0.6), at(0.55, r * 0.2)], r * 0.25, 0.3), pa['shade'], inside=leg + '_thigh')

    def _shoe(s, d, J, side, so, leg):
        ankle, toe = J['ankle_' + side], J['toe_' + side]
        at, L = _frame(ankle, toe)
        r = s.L('r_foot')
        # along the foot: t from the ankle to the toe; offsets: positive is up (the foot's 'front' when it points forward)
        shape = [at(-0.25, r * 0.6), at(-0.28, -r * 1.0), at(0.5, -r * 1.05), at(1.08, -r * 0.95), at(1.12, 0.0),
                 at(0.9, r * 0.75), at(0.45, r * 1.0), at(0.05, r * 1.6)]
        part = leg + '_shoe'
        d.fill(blob(shape), so['base'], part=part)
        d.shadow(part, so['shade'], light=(1, -1), depth=max(1.0, r * 0.6))
        d.light(part, so['light'], light=(1, -1), inset=0.6, width=max(0.8, r * 0.4))
        d.fill(brush([at(-0.28, -r * 0.85), at(1.1, -r * 0.8)], max(1.2, r * 0.45), smooth=False), so['deep'], inside=part, pri=2)
        d.seam(leg + '_shin', seam_tone(s.pants), under=part, sides=[(0, 1)])

    def render(s, p=None, tidy=2):
        """A pose as a picture."""
        d, J = s.canvas(p)
        lit = {}
        for T in (s.skin, s.hair, s.shirt, s.pants, s.shoes, s.hands):
            if T:
                for k in ('deep', 'shade', 'base', 'light'): lit[T[k]] = T['deep']
        if s.line is not None: outline = s.line
        else:
            own = {}
            for T in (s.skin, s.hair, s.shirt, s.pants, s.shoes, s.hands):
                if T:
                    for k in ('deep', 'shade', 'base', 'light'): own[T[k]] = T['line']
            outline = lambda c: own.get(c, c)
        return d.render(outline=outline, light=(1, -1), tidy=tidy, outline_lit=lit)
