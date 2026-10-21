"""Colour for the art kit: OKLab maths, and ramps in the SNES style (docs/dev/snes-picture.md, part B).

    from kit import *                        # this module comes with the kit
    grass = ramp('4a8a2e', 5)                # five shades, dark to light, of one colour: a hue-shifted ramp
    pal = art.palette(1, {'grass': grass, 'dirt': ramp('8a5a34', 4), 'sky': '7ec0ee'})
    pal.grass                                # the grass ramp's indices, dark to light: pal.grass[0] is the darkest
    pal.step(pal.grass[2], -1)               # one step darker along its ramp (pal.grass[1])

A ramp is what makes a sprite or a hill look painted instead of flat: shades of one colour, evenly spaced in lightness
as the eye sees it (OKLab), whose hue turns cool in the shadows and warm in the light, and whose chroma falls at the
ends, the way SNES artists shaded. Every colour is made in the console's own 5-bit colour (RGB555), so the steps you
measure are the steps the player sees, and no two steps of a ramp come out the same on the console.

  oklab(hex), from_oklab(L, a, b)     OKLab of a colour, and back (out-of-gamut colours lose chroma until they fit)
  lch(hex), from_lch(L, C, h)         the same as lightness, chroma and hue (degrees)
  console(hex)                        the colour as the console shows it (5 bits a channel)
  mix(a, b, t)                        a to b in OKLab, t from 0 to 1
  shade(hex, dl)                      lighter (dl > 0) or darker in OKLab lightness, with the ramp's hue shift
  ramp(base, n, ...)                  n shades dark to light around `base` (see its docstring)
  gradient(a, b, n)                   n colours from a to b, even in OKLab: skies, fades
  recede(colours, k, haze)            push colours into the background: less contrast and chroma, towards a haze colour
  distance(a, b)                      OKLab distance (0.04 is about the smallest step that reads as an edge)
"""
import math

COOL_HUE = 275.0   # the hue shadows turn towards (a blue violet), in OKLab degrees
WARM_HUE = 85.0    # the hue highlights turn towards (a warm yellow)


def _hex(v):
    if isinstance(v, (tuple, list)): return '%02x%02x%02x' % tuple(int(c) for c in v)
    return str(v).lstrip('#').lower()

def _rgb(h):
    h = _hex(h)
    return int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)

def _lin(v):
    v /= 255
    return v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4

def _gam(v):
    v = 12.92 * v if v <= 0.0031308 else 1.055 * v ** (1 / 2.4) - 0.055
    return v * 255

def oklab(h):
    """OKLab of a colour: (L 0 to 1, a, b)."""
    r, g, b = (_lin(c) for c in _rgb(h))
    l = (0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b) ** (1 / 3)
    m = (0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b) ** (1 / 3)
    s = (0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b) ** (1 / 3)
    return (0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
            1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
            0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s)

def _to_rgb(L, a, b):
    l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
    m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
    s = (L - 0.0894841775 * a - 1.2914855480 * b) ** 3
    return (_gam(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
            _gam(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
            _gam(-0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s))

def from_oklab(L, a, b):
    """A colour from OKLab. If it is outside what a screen shows, its chroma is reduced until it fits (hue and
    lightness kept)."""
    L = min(max(L, 0.0), 1.0)
    rgb = _to_rgb(L, a, b)
    if any(c < -0.5 or c > 255.5 for c in rgb):
        lo, hi = 0.0, 1.0
        for _ in range(24):
            k = (lo + hi) / 2
            if any(c < -0.5 or c > 255.5 for c in _to_rgb(L, a * k, b * k)): hi = k
            else: lo = k
        rgb = _to_rgb(L, a * lo, b * lo)
    return '%02x%02x%02x' % tuple(min(255, max(0, round(c))) for c in rgb)

def lch(h):
    """Lightness, chroma and hue (degrees) of a colour."""
    L, a, b = oklab(h)
    return L, math.hypot(a, b), math.degrees(math.atan2(b, a)) % 360

def from_lch(L, C, h):
    return from_oklab(L, C * math.cos(math.radians(h)), C * math.sin(math.radians(h)))

def console(h):
    """The colour as the console shows it: each channel cut to 5 bits (as tools/pack.js stores it) and expanded."""
    return '%02x%02x%02x' % tuple(((c >> 3) << 3) | (c >> 5) for c in _rgb(h))

def distance(a, b):
    p, q = oklab(a), oklab(b)
    return math.dist(p, q)

def mix(a, b, t):
    """From a (t = 0) to b (t = 1), in OKLab, so the middle is the middle as the eye sees it."""
    p, q = oklab(a), oklab(b)
    return from_oklab(*(x + (y - x) * t for x, y in zip(p, q)))

def gradient(a, b, n):
    """n colours from a to b (both included), even steps in OKLab, as the console shows them."""
    return [console(mix(a, b, k / (n - 1))) for k in range(n)] if n > 1 else [console(a)]

def _turn(h, towards, amount):
    """Hue h turned towards another hue by `amount` degrees at most, the short way round; except that yellows and oranges
    darken through red (as painters shade them), not through green."""
    d = (towards - h + 540) % 360 - 180
    if towards == COOL_HUE and 40 <= h % 360 <= 120: d = -abs(d) if d > 0 else d
    return h + max(-amount, min(amount, d))

def shade(h, dl, shift=1.0):
    """The colour made lighter (dl > 0) or darker by dl in OKLab lightness, turning towards a warm hue as it lightens and
    a cool one as it darkens (shift 0 keeps the hue): one step of a ramp. Highlights lose a little chroma; shadows keep
    theirs (a shadow that goes grey is what reads as mud), easing off only near black."""
    L, C, hue = lch(h)
    turn = shift * 55 * abs(dl)                       # about 9 degrees for a 0.16 step
    hue = _turn(hue, WARM_HUE if dl > 0 else COOL_HUE, turn) if C > 0.02 else hue
    if dl > 0: C *= 1 - 1.1 * dl                       # highlights wash out a little
    else: C *= (1 + 0.5 * -dl) * min(1.0, (L + dl) / 0.25)   # shadows stay saturated (not mud), easing off near black
    return from_lch(L + dl, max(0.0, C), hue)


class Ramp(list):
    """Colours of one ramp, dark to light (hex strings as the console shows them). `base` is the position of the colour
    it was made from."""
    base = 0


def ramp(base, n=5, step=None, at=None, shift=1.0, dark=None, light=None):
    """n shades of `base`, dark to light, as the console shows them.

    base    the colour the ramp is built around ('rrggbb'): it is the step at position `at`, and it is kept as it is. By
            default `at` follows its lightness: a light colour (skin, gold) sits near the top of its ramp, so the ramp
            reaches deep shadows; a dark one near the bottom.
    step    the OKLab lightness between steps; by default the steps fit the ramp between L 0.12 and 0.95, at most 0.13
            each (the steps below the base and above it can differ).
    shift   how much the hue turns, cool in the shadows and warm in the light (0 none, 1 the default, 2 a lot).
    dark, light  pin the darkest or lightest colour instead (the steps in between follow the hue shift).
    Steps never come out equal on the console: a step that rounds to its neighbour is pushed apart."""
    if n < 1: raise ValueError('a ramp needs 1 colour or more')
    L0 = lch(base)[0]
    if at is None: at = min(n - 1, max(0, round((L0 - 0.12) / (0.95 - 0.12) * (n - 1))))
    if not 0 <= at < n: raise ValueError('ramp: at must be 0 to %d' % (n - 1))
    if step is None:
        down = max(0.04, min(0.13, (L0 - 0.12) / at)) if at else 0.13
        up = max(0.04, min(0.13, (0.95 - L0) / (n - 1 - at))) if at < n - 1 else 0.13
    else: down = up = step
    out = Ramp()
    for k in range(n):
        d = (k - at) * (down if k < at else up)
        if k == 0 and dark is not None and k != at: c = _hex(dark)
        elif k == n - 1 and light is not None and k != at: c = _hex(light)
        else: c = base if k == at else shade(base, d, shift)
        out.append(console(c))
    # Keep the steps apart once the console has rounded them: nudge a step that equals its neighbour.
    for k in range(1, n):
        tries = 0
        while out[k] == out[k - 1] and tries < 20:
            out[k] = console(shade(out[k], 0.02, shift)); tries += 1
    out.base = at
    return out


def recede(colours, k=0.4, haze=None):
    """Colours for something further back (a crowd, far hills): the lightness pulled towards the middle of the list,
    chroma lowered and, with `haze` ('rrggbb', e.g. the sky), mixed towards it; k from 0 (unchanged) to 1. Keeps the
    order of a ramp and its steps apart, so a background stays readable but stops competing with the sprites. Accepts
    one colour or a list (a Ramp stays a Ramp)."""
    one = isinstance(colours, str)
    cs = [colours] if one else list(colours)
    Ls = [lch(c)[0] for c in cs]
    mid = sum(Ls) / len(Ls)
    out = []
    for c in cs:
        L, C, h = lch(c)
        c2 = from_lch(L + (mid - L) * k * 0.6, C * (1 - 0.6 * k), h)
        if haze: c2 = mix(c2, haze, 0.5 * k)
        out.append(console(c2))
    for i in range(1, len(out)):
        tries = 0
        while out[i] == out[i - 1] and tries < 20: out[i] = console(shade(out[i], 0.02, 0)); tries += 1
    if one: return out[0]
    if isinstance(colours, Ramp): r = Ramp(out); r.base = colours.base; return r
    return out


def ramp_report(colours):
    """Lightness of each step and the gaps between them, for checking a ramp by eye: 'L 0.31 0.42 ...'."""
    Ls = [lch(c)[0] for c in colours]
    gaps = [b - a for a, b in zip(Ls, Ls[1:])]
    return 'L %s; steps %s' % (' '.join('%.2f' % v for v in Ls), ' '.join('%+.2f' % g for g in gaps))
