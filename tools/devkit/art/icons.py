"""Ready-made icons for the things nearly every game shows: hearts, coins, stars, gems, keys, potions... drawn in code at
16 px (and any size from 12 up), and placed by hand at 8 px, shaded and outlined in the kit's style, and coloured by the ramps of one
shared sprite palette. Look at them all on one sheet: docs/dev/art-recipes/icons-library.png
(python3 tools/devkit/art/icons.py --sheet <file.png> makes it again).

    from kit import *                                   # icons comes with the kit
    items = items_palette(art, 5)                       # sprite palette 5: red, gold, blue, green and grey ramps
    art.sprite('heart', icon('heart', 16, items), pal=items)
    art.sprite('gem_b', icon('gem', 16, items, colour='blue'), pal=items)      # most icons take another ramp
    print(ICONS)                                        # the names

Each icon is a silhouette in unit coordinates (0 to 1 across the picture), so it is the same design at every size from 12 px up: it is
filled with shaded() (lit from the upper left), given its details (a shine, a keyhole, a face), and outlined with
outline_sel() (each outline pixel the darkest step of the ramp it touches). The designs are the toolkit's own, kept
plain so a game can use them as they are or as the start of its own.
"""
import math
from kit import Img
from colour import ramp
from shade import shaded, outline_sel

RAMPS = {'red': 'd04648', 'gold': 'dab23a', 'blue': '4a7ad8', 'green': '4ca83c', 'grey': 'a8acb8'}


def items_palette(art, n, **bases):
    """Define sprite palette `n` as the icons' palette: five ramps of 3 (red, gold, blue, green, grey: 15 colours, the whole
    sub-palette). bases={'red': 'e04050', ...} changes a ramp's middle colour. Returns the palette."""
    return art.sprite_palette(n, {k: ramp(bases.get(k, v), 3) for k, v in RAMPS.items()})


# --- shapes in unit space: functions of (u, v) in 0..1, true inside ----------------------------------------------------
def circle(cx, cy, r): return lambda u, v: (u - cx) ** 2 + (v - cy) ** 2 <= r * r
def ellipse(cx, cy, rx, ry): return lambda u, v: ((u - cx) / rx) ** 2 + ((v - cy) / ry) ** 2 <= 1
def rect(x0, y0, x1, y1): return lambda u, v: x0 <= u <= x1 and y0 <= v <= y1
def poly(*pts):
    def inside(u, v):
        c = False
        for i in range(len(pts)):
            (x1, y1), (x2, y2) = pts[i], pts[i - 1]
            if (y1 > v) != (y2 > v) and u < (x2 - x1) * (v - y1) / (y2 - y1) + x1: c = not c
        return c
    return inside
def union(*fs): return lambda u, v: any(f(u, v) for f in fs)
def minus(a, *bs): return lambda u, v: a(u, v) and not any(b(u, v) for b in bs)
def heart_shape(cx=0.5, cy=0.52, s=0.4):
    def f(u, v):
        x, y = (u - cx) / s, (cy - v) / s + 0.25
        return (x * x + y * y - 1) ** 3 - x * x * y ** 3 < 0
    return f
def star_shape(cx=0.5, cy=0.53, r=0.47, k=0.45, n=5):
    pts = []
    for i in range(n * 2):
        a = -math.pi / 2 + i * math.pi / n
        rr = r if i % 2 == 0 else r * k
        pts.append((cx + rr * math.cos(a), cy + rr * math.sin(a)))
    return poly(*pts)


def mask(S, f, inset=1):
    """The silhouette as a picture: the pixels whose centres are inside, in the square S - 2*inset (room for the outline)."""
    a = S - 2 * inset
    return Img.make(S, S, lambda x, y: 1 if f((x - inset + 0.5) / a, (y - inset + 0.5) / a) else 0)


def paint(img, S, f, colour, inset=1, only=True):
    """Set the pixels inside `f` (unit space) to `colour`; only=True keeps them within what is drawn already."""
    a = S - 2 * inset
    for y in range(S):
        for x in range(S):
            if (not only or img.px[y][x]) and f((x - inset + 0.5) / a, (y - inset + 0.5) / a): img.px[y][x] = colour
    return img


def merge(base, top):
    """`top` over `base` where top is drawn."""
    for y in range(base.h):
        for x in range(base.w):
            if top.px[y][x]: base.px[y][x] = top.px[y][x]
    return base


def fill(S, f, rp, kind='dome', **kw): return shaded(mask(S, f), rp, kind=kind, **kw)


# --- the icons: each (S, pal, colour) -> Img before its outline ---------------------------------------------------------
def _heart(S, p, c, part='full'):
    rp = getattr(p, c or 'red')
    im = fill(S, heart_shape(), rp, 'pillow')
    if part == 'half': paint(im, S, lambda u, v: u > 0.5, p.grey[0])
    if part == 'empty': im = fill(S, heart_shape(), p.grey, 'flat'); paint(im, S, heart_shape(s=0.25), p.grey[0])
    if part != 'empty': paint(im, S, ellipse(0.32, 0.36, 0.07, 0.06), p.grey[2])
    return im

def _coin(S, p, c):
    rp = getattr(p, c or 'gold')
    im = fill(S, circle(0.5, 0.5, 0.48), rp, 'dome')
    paint(im, S, minus(circle(0.5, 0.5, 0.33), circle(0.5, 0.5, 0.25)), rp[0])         # the rim's groove
    paint(im, S, rect(0.46, 0.33, 0.56, 0.67), rp[2])                                  # a bar across the face
    return im

def _star(S, p, c):
    rp = getattr(p, c or 'gold')
    im = fill(S, star_shape(), rp, 'cone')
    return im

def _gem(S, p, c):
    rp = getattr(p, c or 'red')
    body = poly((0.5, 0.97), (0.0, 0.38), (0.2, 0.1), (0.8, 0.1), (1.0, 0.38))
    im = fill(S, body, rp, 'flat')
    paint(im, S, poly((0.2, 0.1), (0.8, 0.1), (1.0, 0.38), (0.0, 0.38)), rp[2])        # the table, lit
    paint(im, S, poly((0.5, 0.97), (0.5, 0.38), (1.0, 0.38)), rp[0])                    # the shadowed facet
    paint(im, S, poly((0.3, 0.14), (0.45, 0.14), (0.38, 0.3), (0.22, 0.3)), p.grey[2])  # a glint
    return im

def _key(S, p, c):
    rp = getattr(p, c or 'gold')
    shape = union(minus(circle(0.3, 0.3, 0.27), circle(0.3, 0.3, 0.11)), poly((0.42, 0.4), (0.5, 0.32), (0.98, 0.8), (0.9, 0.88)),
                  poly((0.68, 0.6), (0.76, 0.52), (0.92, 0.68), (0.84, 0.76)), poly((0.8, 0.72), (0.88, 0.64), (0.98, 0.74), (0.9, 0.82)))
    return fill(S, shape, rp, 'pillow')

def _lock(S, p, c):
    rp = getattr(p, c or 'gold')
    shackle = fill(S, minus(ellipse(0.5, 0.38, 0.33, 0.34), ellipse(0.5, 0.38, 0.14, 0.17), rect(0, 0.44, 1, 1)), p.grey, 'pillow')
    body = fill(S, rect(0.1, 0.44, 0.9, 0.98), rp, 'cylinder-y')
    im = merge(shackle, body)
    paint(im, S, union(circle(0.5, 0.62, 0.08), rect(0.46, 0.62, 0.54, 0.82)), rp[0])  # the keyhole
    return im

def _potion(S, p, c):
    rp = getattr(p, c or 'red')
    glass = union(circle(0.5, 0.64, 0.35), rect(0.39, 0.12, 0.61, 0.4))
    im = fill(S, glass, p.blue, 'pillow')
    paint(im, S, minus(circle(0.5, 0.64, 0.35), rect(0, 0, 1, 0.52)), rp[1])           # the liquid
    paint(im, S, rect(0.5, 0.56, 1, 1), rp[0], only=True) if False else None
    for y in range(S):                                                                  # the liquid shaded: dark low right
        for x in range(S):
            a = S - 2
            u, v = (x - 0.5) / a, (y - 0.5) / a
            if im.px[y][x] == rp[1] and (u - 0.5) + (v - 0.64) > 0.28: im.px[y][x] = rp[0]
    paint(im, S, rect(0.36, 0.0, 0.64, 0.16), p.gold[0], only=False)                   # the cork
    paint(im, S, ellipse(0.36, 0.6, 0.06, 0.09), p.grey[2])                             # a shine on the glass
    return im

def _bomb(S, p, c):
    im = fill(S, circle(0.46, 0.58, 0.4), getattr(p, c or 'grey'), 'dome', ambient=0.0, contrast=1.6)
    paint(im, S, rect(0.6, 0.1, 0.78, 0.24), p.grey[1], only=False)                     # the cap
    paint(im, S, poly((0.72, 0.12), (0.8, 0.0), (0.92, 0.02), (0.78, 0.16)), p.gold[1], only=False)   # the fuse
    paint(im, S, circle(0.94, 0.02, 0.07), p.red[2], only=False)                       # its spark
    paint(im, S, ellipse(0.33, 0.44, 0.07, 0.06), p.grey[2])
    return im

def _skull(S, p, c):
    rp = getattr(p, c or 'grey')
    head = union(ellipse(0.5, 0.42, 0.44, 0.38), rect(0.28, 0.6, 0.72, 0.92))
    im = fill(S, head, rp, 'pillow')
    paint(im, S, union(ellipse(0.32, 0.46, 0.11, 0.12), ellipse(0.68, 0.46, 0.11, 0.12)), rp[0])          # eyes
    paint(im, S, poly((0.5, 0.58), (0.44, 0.7), (0.56, 0.7)), rp[0])                                       # nose
    paint(im, S, union(rect(0.4, 0.82, 0.44, 0.92), rect(0.56, 0.82, 0.6, 0.92)), rp[0])                  # teeth
    return im

def _trophy(S, p, c):
    rp = getattr(p, c or 'gold')
    cup = union(minus(ellipse(0.5, 0.18, 0.36, 0.42), rect(0, 0, 1, 0.08)), rect(0.44, 0.5, 0.56, 0.74), rect(0.24, 0.74, 0.76, 0.96),
                minus(circle(0.12, 0.3, 0.16), circle(0.12, 0.3, 0.07)), minus(circle(0.88, 0.3, 0.16), circle(0.88, 0.3, 0.07)))
    im = fill(S, cup, rp, 'pillow')
    paint(im, S, rect(0.3, 0.12, 0.38, 0.4), rp[2])
    return im

def _crown(S, p, c):
    rp = getattr(p, c or 'gold')
    shape = poly((0.02, 0.85), (0.02, 0.25), (0.27, 0.55), (0.5, 0.12), (0.73, 0.55), (0.98, 0.25), (0.98, 0.85))
    im = fill(S, shape, rp, 'cylinder-x')
    paint(im, S, circle(0.5, 0.68, 0.09), p.red[1]); paint(im, S, circle(0.2, 0.7, 0.07), p.blue[1]); paint(im, S, circle(0.8, 0.7, 0.07), p.blue[1])
    return im

def _shield(S, p, c):
    rp = getattr(p, c or 'blue')
    shape = poly((0.06, 0.06), (0.94, 0.06), (0.94, 0.5), (0.5, 0.98), (0.06, 0.5))
    im = fill(S, shape, rp, 'pillow')
    paint(im, S, union(rect(0.44, 0.14, 0.56, 0.8), rect(0.18, 0.32, 0.82, 0.44)), p.gold[1])   # a cross on its face
    return im

def _sword(S, p, c):
    blade = fill(S, poly((0.02, 0.02), (0.14, 0.02), (0.66, 0.54), (0.54, 0.66), (0.02, 0.14)), getattr(p, c or 'grey'), 'cone')
    hilt = fill(S, union(poly((0.48, 0.72), (0.72, 0.48), (0.8, 0.56), (0.56, 0.8)), poly((0.66, 0.74), (0.74, 0.66), (0.96, 0.88), (0.88, 0.96))), p.gold, 'pillow')
    return merge(blade, hilt)

def _clock(S, p, c):
    rp = getattr(p, c or 'gold')
    im = fill(S, circle(0.5, 0.5, 0.48), rp, 'dome')
    paint(im, S, circle(0.5, 0.5, 0.36), p.grey[2])
    paint(im, S, union(rect(0.46, 0.2, 0.54, 0.54), rect(0.46, 0.46, 0.76, 0.54)), p.grey[0])      # the hands
    return im

def _flag(S, p, c):
    pole = fill(S, rect(0.08, 0.04, 0.18, 0.98), p.grey, 'cylinder-y')
    rp = getattr(p, c or 'red')
    wave = lambda u, v: 0.18 <= u <= 0.96 and 0.06 + 0.06 * math.sin((u - 0.18) * 7) <= v <= 0.5 + 0.06 * math.sin((u - 0.18) * 7)
    cloth = fill(S, wave, rp, 'pillow')
    paint(cloth, S, lambda u, v: 0.5 <= u <= 0.62, rp[0])                               # a fold in shadow
    paint(cloth, S, lambda u, v: 0.26 <= u <= 0.36 and v < 0.3, rp[2])                  # light on the near ripple
    return merge(pole, cloth)

def _arrow(S, p, c):
    return fill(S, poly((0.02, 0.36), (0.5, 0.36), (0.5, 0.08), (0.98, 0.5), (0.5, 0.92), (0.5, 0.64), (0.02, 0.64)), getattr(p, c or 'green'), 'pillow')

def _cursor(S, p, c):
    return fill(S, poly((0.06, 0.02), (0.06, 0.82), (0.3, 0.62), (0.46, 0.96), (0.62, 0.88), (0.46, 0.56), (0.76, 0.56)), getattr(p, c or 'grey'), 'flat')

def _chest(S, p, c):
    rp = getattr(p, c or 'gold')
    lid = fill(S, union(ellipse(0.5, 0.42, 0.48, 0.3), rect(0.02, 0.42, 0.98, 0.5)), rp, 'cylinder-x')
    paint(lid, S, rect(0, 0.6, 1, 1), 0, only=False) if False else None
    lid = Img.make(S, S, lambda x, y: lid.px[y][x] if (y - 0.5) / (S - 2) < 0.5 else 0)
    box = fill(S, rect(0.02, 0.5, 0.98, 0.96), rp, 'flat')
    im = merge(box, lid)
    paint(im, S, rect(0.02, 0.48, 0.98, 0.54), rp[0])                                    # the seam
    paint(im, S, rect(0.42, 0.42, 0.58, 0.66), p.grey[2])                               # the clasp
    return im

def _check(S, p, c):
    return fill(S, poly((0.02, 0.56), (0.18, 0.4), (0.38, 0.6), (0.82, 0.12), (0.98, 0.28), (0.38, 0.92)), getattr(p, c or 'green'), 'pillow')

def _cross(S, p, c):
    t = 0.14
    a = poly((0.02 + t, 0.02), (0.98, 0.98 - t), (0.98 - t, 0.98), (0.02, 0.02 + t))
    b = poly((0.98 - t, 0.02), (0.98, 0.02 + t), (0.02 + t, 0.98), (0.02, 0.98 - t))
    return fill(S, union(a, b), getattr(p, c or 'red'), 'pillow')

def _note(S, p, c):
    shape = union(ellipse(0.3, 0.8, 0.22, 0.16), rect(0.42, 0.06, 0.52, 0.8), poly((0.52, 0.06), (0.9, 0.24), (0.9, 0.4), (0.52, 0.22)))
    return fill(S, shape, getattr(p, c or 'blue'), 'pillow')

def _bolt(S, p, c):
    return fill(S, poly((0.62, 0.0), (0.12, 0.58), (0.46, 0.58), (0.34, 1.0), (0.88, 0.38), (0.52, 0.38), (0.72, 0.0)), getattr(p, c or 'gold'), 'cone')


# --- 8 px: placed by hand (a shape sampled at 8 px loses its details). d, m, l: the icon's ramp, dark to light; k and w:
# grey dark and light; G and Y: gold mid and light; R: red mid; B: blue mid. The outline is drawn in (d or k).
SMALL = {
    'heart': ['.dd.dd..', 'dlmdmmd.', 'dlmmmmd.', 'dmmmmmd.', '.dmmmd..', '..dmd...', '...d....', '........'],
    'coin': ['..dddd..', '.dllmmd.', 'dlmlmmmd', 'dlmlmmmd', 'dmmlmmmd', 'dmmlmmdd', '.dmmmdd.', '..dddd..'],
    'star': ['...dd...', '...ld...', 'ddllmmdd', '.dlmmmd.', '..dmmd..', '.dmddmd.', '.dd..dd.', '........'],
    'gem': ['........', '.dddddd.', 'dllllmmd', 'dlmmmmdd', '.dmmmdd.', '..dmdd..', '...dd...', '........'],
    'key': ['........', '.ddd....', 'dlmld...', 'dm.mdddd', 'dlmlllld', '.ddddmdm', '.....d.d', '........'],
    'lock': ['..kkk...', '.k...k..', '.k...k..', 'dddddddd', 'dlmmmmmd', 'dmmddmmd', 'dmmmmmmd', 'dddddddd'],
    'potion': ['...GG...', '...kk...', '..kwwk..', '.kwmmmk.', 'kwmmmmmk', 'kmmmmmdk', '.kmmmdk.', '..kkkk..'],
    'bomb': ['......R.', '.....G..', '..ddGd..', '.dlmmmd.', 'dlmmmmmd', 'dmmmmmdd', '.dmmmdd.', '..dddd..'],
    'skull': ['.dddddd.', 'dllmmmmd', 'lddmmddm', 'lddmmddm', 'dmmmdmmd', '.dmmmmd.', '.dmdmdd.', '..dddd..'],
    'trophy': ['dddddddd', 'dllmmmmd', '.dlmmmd.', '..dmmd..', '...dd...', '...md...', '..dmmd..', '.dddddd.'],
    'crown': ['........', 'd..dd..d', 'dd.dd.dd', 'dlmmmmmd', 'dmRmmBmd', 'dmmmmmmd', 'dddddddd', '........'],
    'shield': ['dddddddd', 'dlmGGmmd', 'dlGGGGmd', 'dlmGGmmd', 'dmmGGmmd', '.dmGGmd.', '..dmmd..', '...dd...'],
    'sword': ['......dd', '.....dld', '....dld.', '...dld..', 'G.dld...', '.GGd....', '.YG.....', 'Y..G....'],
    'clock': ['..dddd..', '.dwwwwd.', 'dwwkwwwd', 'dwwkwwwd', 'dwwkkkwd', 'dwwwwwwd', '.dwwwwd.', '..dddd..'],
    'flag': ['km......', 'kmmmd...', 'kmlmmmd.', 'kmmmd...', 'kd......', 'k.......', 'k.......', 'k.......'],
    'arrow': ['....d...', '....dd..', 'ddddlmd.', 'dllllmmd', 'dmmmmmdd', 'ddddmdd.', '....dd..', '....d...'],
    'cursor': ['dd......', 'dld.....', 'dmld....', 'dmmld...', 'dmmmld..', 'dmmmmld.', 'dddldddl', '..ddd...'],   # the shape the user drew
    'chest': ['........', '.dddddd.', 'dllmmmmd', 'dddwwddd', 'dmmwwmmd', 'dmmmmmmd', 'dddddddd', '........'],
    'check': ['.......d', '......dl', '.....dld', 'd...dld.', 'dd.dld..', '.dlld...', '..dd....', '........'],
    'cross': ['dd....dd', 'dld..dld', '.dlddld.', '..dmmd..', '..dmmd..', '.dmddmd.', 'dmd..dmd', 'dd....dd'],
    'note': ['....dd..', '....dld.', '....d.ld', '....d..d', '.dddd...', 'dlmmd...', 'dmmmd...', '.ddd....'],
    'bolt': ['....dd..', '...dld..', '..dld...', '.dllddd.', '.dddlld.', '...dld..', '..dld...', '..dd....'],
}
SMALL['heart_half'] = [''.join(ch.upper() if x >= 4 and ch in 'dml' else ch for x, ch in enumerate(r)) for r in SMALL['heart']]
SMALL['heart_empty'] = [r.replace('m', '.').replace('l', '.').upper() for r in SMALL['heart']]
OWN = {'heart': 'red', 'heart_half': 'red', 'heart_empty': 'red', 'coin': 'gold', 'star': 'gold', 'gem': 'red', 'key': 'gold',
       'lock': 'gold', 'potion': 'red', 'bomb': 'grey', 'skull': 'grey', 'trophy': 'gold', 'crown': 'gold', 'shield': 'blue',
       'sword': 'grey', 'clock': 'gold', 'flag': 'red', 'arrow': 'green', 'cursor': 'grey', 'chest': 'gold', 'check': 'green',
       'cross': 'red', 'note': 'blue', 'bolt': 'gold'}


# --- 16 px placed by hand, where a built shape did not read well (the same letters as SMALL) ---------------------------
LARGE = {
    'skull': ['....dddddddd....', '..ddllllllmmdd..', '.dllllllllmmmmd.', '.dllllllmmmmmmd.', 'dlllllmmmmmmmmmd',
              'dlllmmmmmmmmmmmd', 'dllddddmmmddddmd', 'dldddddmmdddddmd', 'dldddddmmdddddmd', 'dlmdddmmmmdddmmd',
              '.dmmmmmddmmmmmd.', '.ddmmmmddmmmmdd.', '..dmdmdmdmdmmd..', '..dmdmdmdmdmmd..', '...dddddddddd...', '................'],
}


def small(name, pal, colour, rows=None):
    """The 8 px icon from its rows: the main ramp's d, m, l, and fixed greys and accents (upper-case D, M, L: grey)."""
    rp = getattr(pal, colour or OWN[name])
    key = {'d': rp[0], 'm': rp[1], 'l': rp[2], 'D': pal.grey[0], 'M': pal.grey[1], 'L': pal.grey[2], 'k': pal.grey[0],
           'w': pal.grey[2], 'G': pal.gold[1], 'Y': pal.gold[2], 'R': pal.red[1], 'B': pal.blue[1]}
    return Img.from_rows(rows or SMALL[name], key=key)


_DRAW = {'heart': _heart, 'heart_half': lambda S, p, c: _heart(S, p, c, 'half'), 'heart_empty': lambda S, p, c: _heart(S, p, c, 'empty'),
         'coin': _coin, 'star': _star, 'gem': _gem, 'key': _key, 'lock': _lock, 'potion': _potion, 'bomb': _bomb,
         'skull': _skull, 'trophy': _trophy, 'crown': _crown, 'shield': _shield, 'sword': _sword, 'clock': _clock,
         'flag': _flag, 'arrow': _arrow, 'cursor': _cursor, 'chest': _chest, 'check': _check, 'cross': _cross,
         'note': _note, 'bolt': _bolt}
ICONS = list(_DRAW)


def icon(name, size, pal, colour=None):
    """The icon `name` (one of ICONS) as a size x size picture in the palette `pal` (items_palette's, or any palette
    with red, gold, blue, green and grey ramps of 3). colour= one of those ramps for its main colour instead of its own."""
    if name not in _DRAW: raise KeyError('no icon %r: %s' % (name, ', '.join(ICONS)))
    if colour is not None and colour not in RAMPS: raise KeyError('colour is one of %s' % ', '.join(RAMPS))
    if size == 8: return small(name, pal, colour)
    if size == 16 and name in LARGE: return small(name, pal, colour, LARGE[name])
    im = _DRAW[name](size, pal, colour)
    return outline_sel(im, pal)


if __name__ == '__main__':
    import sys
    if len(sys.argv) != 3 or sys.argv[1] != '--sheet': sys.exit('usage: python3 tools/devkit/art/icons.py --sheet <file.png>')
    from kit import Art
    from preview import Sheet
    art = Art()
    pal = items_palette(art, 0)
    sheet = Sheet(scale=4)
    for size in (16, 8):
        for k, name in enumerate(ICONS):
            sheet.add('%s %d' % (name, size), icon(name, size, pal), pal, scale=4 if size == 16 else 8)
            if k % 8 == 7: sheet.row()
    for c in RAMPS: sheet.add('gem ' + c, icon('gem', 16, pal, colour=c), pal)
    sheet.save(sys.argv[2])
    print('wrote', sys.argv[2])
