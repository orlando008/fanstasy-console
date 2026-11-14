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
from colour import ramp
from shade import shaded, outline_sel

def _img():
    from kit import Img          # here, not at the top: kit imports this module, as it does its others
    return Img


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
    return _img().make(S, S, lambda x, y: 1 if f((x - inset + 0.5) / a, (y - inset + 0.5) / a) else 0)


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
    lid = _img().make(S, S, lambda x, y: lid.px[y][x] if (y - 0.5) / (S - 2) < 0.5 else 0)
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
    return _img().from_rows(rows or SMALL[name], key=key)


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


# --- animations: lists of frames (each a size x size Img), for things that move on their own ---------------------------
def _frames(S, pal, shapes, rp, kind='pillow'):
    return [outline_sel(fill(S, f, rp, kind), pal) for f in shapes]


def _coin_spin(S, p, c):
    rp = getattr(p, c or 'gold')
    out = []
    for w in (0.48, 0.36, 0.2, 0.06, 0.2, 0.36):
        im = fill(S, ellipse(0.5, 0.5, max(w, 0.08), 0.48), rp, 'cylinder-y')
        if w > 0.3: paint(im, S, rect(0.5 - w * 0.12, 0.33, 0.5 + w * 0.12, 0.67), rp[2])      # the bar on its face
        if w < 0.1: paint(im, S, lambda u, v: True, rp[0])                                     # edge on: the rim alone
        out.append(outline_sel(im, p))
    return out

def _star_twinkle(S, p, c):
    rp = getattr(p, c or 'gold')
    out = []
    for r, glint in ((0.47, False), (0.5, True), (0.47, False), (0.43, False)):
        im = fill(S, star_shape(r=r), rp, 'cone')
        if glint: paint(im, S, circle(0.4, 0.38, 0.08), p.grey[2])
        out.append(outline_sel(im, p))
    return out

def _heart_pulse(S, p, c):
    rp = getattr(p, c or 'red')
    out = []
    for k in (0.4, 0.45, 0.4, 0.36):
        im = fill(S, heart_shape(s=k), rp, 'pillow')
        paint(im, S, ellipse(0.32, 0.36, 0.07, 0.06), p.grey[2])
        out.append(outline_sel(im, p))
    return out

def _sparkle(S, p, c):
    """A four-pointed glint that opens and closes: no outline (it is light)."""
    rp = getattr(p, c or 'gold')
    out = []
    for r in (0.22, 0.36, 0.5, 0.36, 0.22):
        w = max(0.08, r * 0.26)
        shape = union(poly((0.5, 0.5 - r), (0.5 + w, 0.5), (0.5, 0.5 + r), (0.5 - w, 0.5)),
                      poly((0.5 - r, 0.5), (0.5, 0.5 - w), (0.5 + r, 0.5), (0.5, 0.5 + w)))
        im = mask(S, shape, inset=0)
        im = _img().make(S, S, lambda x, y: (p.grey[2] if abs(x + 0.5 - S / 2) + abs(y + 0.5 - S / 2) < S * r * 0.35 else rp[2]) if im.px[y][x] else 0)
        out.append(im)
    return out

def _puff(S, p, c):
    """Dust: a few round clouds that grow and thin out (dithered away)."""
    rp = getattr(p, c or 'grey')
    out = []
    for k, (r, keep) in enumerate(((0.16, 1.0), (0.26, 1.0), (0.34, 0.75), (0.4, 0.5), (0.44, 0.25))):
        blobs = union(circle(0.5, 0.62, r), circle(0.5 - r * 0.8, 0.66, r * 0.7), circle(0.5 + r * 0.8, 0.66, r * 0.7))
        im = fill(S, blobs, rp, 'pillow')
        for y in range(S):
            for x in range(S):
                if im.px[y][x] and _BAYER4[y & 3][x & 3] >= keep * 16: im.px[y][x] = 0
        out.append(im)
    return out

def _explosion(S, p, c):
    """A burst: a hot core that grows, then smoke that breaks up."""
    out = []
    steps = ((0.18, 'hot'), (0.32, 'hot'), (0.44, 'fire'), (0.46, 'smoke'), (0.48, 'thin'))
    for r, stage in steps:
        spikes = poly(*[(0.5 + (r if i % 2 == 0 else r * 0.62) * math.cos(i * math.pi / 6), 0.5 + (r if i % 2 == 0 else r * 0.62) * math.sin(i * math.pi / 6)) for i in range(12)])
        if stage in ('hot', 'fire'):
            im = fill(S, spikes, p.red, 'pillow')
            paint(im, S, circle(0.5, 0.5, r * 0.65), p.gold[1]); paint(im, S, circle(0.5, 0.5, r * 0.35), p.gold[2] if stage == 'fire' else p.grey[2])
        else:
            im = fill(S, union(circle(0.5, 0.5, r * 0.8), circle(0.32, 0.4, r * 0.5), circle(0.68, 0.42, r * 0.5)), p.grey, 'pillow')
            if stage == 'thin':
                for y in range(S):
                    for x in range(S):
                        if im.px[y][x] and _BAYER4[y & 3][x & 3] >= 7: im.px[y][x] = 0
        out.append(im)
    return out

def _hit(S, p, c):
    """A hit: a white burst of rays, then smaller and gold."""
    out = []
    for r, col in ((0.48, p.grey[2]), (0.38, (c and getattr(p, c)[2]) or p.gold[2]), (0.22, (c and getattr(p, c)[1]) or p.gold[1])):
        rays = poly(*[(0.5 + (r if i % 2 == 0 else r * 0.3) * math.cos(i * math.pi / 8 + 0.2), 0.5 + (r if i % 2 == 0 else r * 0.3) * math.sin(i * math.pi / 8 + 0.2)) for i in range(16)])
        im = mask(S, rays, inset=0)
        out.append(_img().make(S, S, lambda x, y, col=col: col if im.px[y][x] else 0))
    return out

# 8 px animations, placed by hand (the same letters as SMALL)
_W6 = ['..dddd..', '.dllmmd.', '.dlmmmd.', '.dlmmmd.', '.dlmmmd.', '.dmmmdd.', '.dmmmdd.', '..dddd..']
_W4 = ['...dd...', '..dlmd..', '..dlmd..', '..dlmd..', '..dlmd..', '..dmmd..', '..dmdd..', '...dd...']
_W2 = ['...dd...'] * 8
_STAR_GLINT = ['...dd...', '...wd...', 'ddllmmdd', '.dlmmmd.', '..dmmd..', '.dmddmd.', '.dd..dd.', '........']
_STAR_GLINT2 = ['...dd...', '...ld...', 'ddllmmdd', '.dlmwmd.', '..dmmd..', '.dmddmd.', '.dd..dd.', '........']
_HEART_BIG = ['.dd..dd.', 'dlmddmmd', 'dlmmmmmd', 'dmmmmmmd', '.dmmmmd.', '..dmmd..', '...dd...', '........']
_HEART_LOW = ['........', '.dd.dd..', 'dlmdmmd.', 'dmmmmmd.', '.dmmmd..', '..dmd...', '...d....', '........']
_E = '........'
ANIM_SMALL = {
    'coin_spin': [None, _W6, _W4, _W2, _W4, _W6],
    'star_twinkle': [None, _STAR_GLINT, None, _STAR_GLINT2],
    'heart_pulse': [None, _HEART_BIG, None, _HEART_LOW],
    'sparkle': [[_E, _E, _E, '...l....', _E, _E, _E, _E], [_E, _E, '...l....', '..lwl...', '...l....', _E, _E, _E],
                [_E, '...l....', '...l....', '.llwll..', '...l....', '...l....', _E, _E],
                [_E, _E, '...l....', '..lwl...', '...l....', _E, _E, _E], [_E, _E, _E, '...l....', _E, _E, _E, _E]],
    'puff': [[_E, _E, _E, _E, _E, '...MM...', '..MLMM..', _E], [_E, _E, _E, _E, '...MM...', '.MMLLMM.', '.MMMMMk.', '..kkkk..'],
             [_E, _E, _E, '..M.M...', '.M.LM.M.', 'M.MLM.Mk', '.M.M.k..', '..k.k...'], [_E, _E, '..M...M.', '.......', 'M..L..M.', '...M...k', '.M...k..', _E],
             [_E, '.M....M.', _E, '.......', 'M......M', _E, '..k...k.', _E]],
    'explosion': [[_E, _E, '...Y....', '..YwY...', '...Y....', _E, _E, _E],
                  [_E, '..R.R...', '.RGYGR..', '..YwY...', '.RGYGR..', '..R.R...', _E, _E],
                  ['.R...R..', '..RGR...', '.RGYGR..', 'RGYwYGR.', '.RGYGR..', '..RGR...', '.R...R..', _E],
                  [_E, '..MMM...', '.MLLMM..', '.MLMMMk.', '.MMMMk..', '..kkk...', _E, _E],
                  [_E, '..M.M...', '.L.M.M..', '..M.M.k.', '.M.M.k..', '..k.k...', _E, _E]],
    'hit': [['w..w..w.', '.w.w.w..', '..www...', 'wwwwwww.', '..www...', '.w.w.w..', 'w..w..w.', _E],
            [_E, '.Y.Y.Y..', '..YYY...', '.YYYYY..', '..YYY...', '.Y.Y.Y..', _E, _E],
            [_E, _E, '...G....', '..GYG...', '...G....', _E, _E, _E]],
}
OWN.update({'coin_spin': 'gold', 'star_twinkle': 'gold', 'heart_pulse': 'red', 'sparkle': 'gold', 'puff': 'grey',
            'explosion': 'red', 'hit': 'gold'})
_BASE = {'coin_spin': 'coin', 'star_twinkle': 'star', 'heart_pulse': 'heart'}

_BAYER4 = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]
_ANIM = {'coin_spin': _coin_spin, 'star_twinkle': _star_twinkle, 'heart_pulse': _heart_pulse, 'sparkle': _sparkle,
         'puff': _puff, 'explosion': _explosion, 'hit': _hit}
ANIMS = list(_ANIM)


def anim(name, size, pal, colour=None):
    """The frames of the animation `name` (one of ANIMS), each a size x size picture in `pal` (8 or 16 px). Play them in
    turn, a few frames of the console each (coin_spin and star_twinkle loop; puff, explosion and hit play once)."""
    if name not in _ANIM: raise KeyError('no animation %r: %s' % (name, ', '.join(ANIMS)))
    if colour is not None and colour not in RAMPS: raise KeyError('colour is one of %s' % ', '.join(RAMPS))
    if size == 8:
        return [small(_BASE.get(name, name), pal, colour or OWN[name], rows) if rows else small(_BASE[name], pal, colour) for rows in ANIM_SMALL[name]]
    return _ANIM[name](size, pal, colour)


# --- UI: score digits and button prompts ------------------------------------------------------------------------------
# Digits 0-9 in 8 x 8: a 5 px wide, 7 px tall bold figure (l) with a dark edge (d) round it, so they read on any background.
DIGITS = [
    ['.ddddd..', 'dllllld.', 'dlddlld.', 'dlddlld.', 'dlddlld.', 'dllllld.', '.ddddd..', '........'],
    ['..ddd...', '.dlld...', '..dld...', '..dld...', '..dld...', '.dllld..', '.ddddd..', '........'],
    ['.ddddd..', 'dllllld.', '.dddlld.', '.dllld..', 'dlldddd.', 'dllllld.', '.ddddd..', '........'],
    ['.ddddd..', 'dllllld.', '.ddllld.', '..dllld.', '.dddlld.', 'dllllld.', '.ddddd..', '........'],
    ['.dd.dd..', 'dld.dld.', 'dld.dld.', 'dllllld.', '.dddlld.', '...dld..', '...ddd..', '........'],
    ['.ddddd..', 'dllllld.', 'dlldddd.', 'dllllld.', '.dddlld.', 'dllllld.', '.ddddd..', '........'],
    ['.ddddd..', 'dllllld.', 'dlldddd.', 'dllllld.', 'dlddlld.', 'dllllld.', '.ddddd..', '........'],
    ['.ddddd..', 'dllllld.', '.dddlld.', '..dlld..', '..dld...', '..dld...', '..ddd...', '........'],
    ['.ddddd..', 'dllllld.', 'dlddlld.', '.dllld..', 'dlddlld.', 'dllllld.', '.ddddd..', '........'],
    ['.ddddd..', 'dllllld.', 'dlddlld.', 'dllllld.', '.dddlld.', 'dllllld.', '.ddddd..', '........'],
]


def digits(pal, size=8, colour='grey'):
    """The figures 0 to 9 (a list of ten pictures) for a score or a timer: 8 px, or 16 (smoothly doubled). Their fill is
    the light step of `colour` (grey: white) and their edge its dark step."""
    out = [small('digit', pal, colour, rows) for rows in DIGITS]
    if size == 8: return out
    rp = getattr(pal, colour)
    big = []
    for rows in DIGITS:                    # the figure alone doubled pixel for pixel (crisp), then a fresh 1 px edge round it
        m = _img().from_rows([r.replace('d', '.').replace('l', '1') for r in rows])
        b = _img().make(16, 16, lambda x, y: m.get(x // 2, y // 2))
        im = _img().make(16, 16, lambda x, y: (rp[2] if y < 7 else rp[1]) if b.get(x, y) else 0)
        for y in range(16):
            for x in range(16):
                if not b.get(x, y) and any(b.get(x + dx, y + dy) for dx in (-1, 0, 1) for dy in (-1, 0, 1)): im.px[y][x] = rp[0]
        big.append(im)
    return big


# Button prompts. 16 px: round A and B, a START pill, a d-pad with one arm lit. 8 px: A and B, and four arrows.
_BTN16 = ['.....dddddd.....', '...ddmmmmmmdd...', '..dmmllllllmmd..', '.dmllllllllllmd.', '.dmllllllllllmd.', 'dmlllllllllllmmd',
          'dmlllllllllllmmd', 'dmlllllllllllmmd', 'dmlllllllllllmmd', 'dmlllllllllllmmd', 'dmmllllllllllmmd', '.dmmllllllllmmd.',
          '.dmmmmmmmmmmmmd.', '..ddmmmmmmmmdd..', '...dddddddddd...', '................']
_GLYPH16 = {'a': ['..dd..', '.d..d.', '.dddd.', '.d..d.', '.d..d.'], 'b': ['.ddd..', '.d..d.', '.ddd..', '.d..d.', '.ddd..']}
_BTN8 = ['..dddd..', '.dllllm.', 'dlllllmd', 'dlllllmd', 'dlllllmd', 'dmllllmd', '.dmmmmd.', '..dddd..']
_GLYPH8 = {'a': ['.d.', 'd.d', 'ddd', 'd.d'], 'b': ['dd.', 'ddd', 'd.d', 'dd.']}
_START = ['................', '................', '................', '..dddddddddddd..', '.dllllllllllllmd', 'dllllllllllllllmd'[:16],
          'dlllllllllllllmd', 'dlllllllllllllmd', 'dmllllllllllllmd', '.dmmmmmmmmmmmmd.', '..dddddddddddd..', '................',
          '................', '................', '................', '................']
_DPAD = ['......dddd......', '......dMMd......', '......dMMd......', '......dMMd......', '......dMMd......', '......dMMd......',
         'ddddddMMMMdddddd', 'dMMMMMMkkMMMMMMd', 'dMMMMMMkkMMMMMMd', 'ddddddMMMMdddddd', '......dMMd......', '......dMMd......',
         '......dMMd......', '......dMMd......', '......dMMd......', '......dddd......']
_ARMS = {'up': lambda x, y: 6 <= x <= 9 and 1 <= y <= 5, 'down': lambda x, y: 6 <= x <= 9 and 10 <= y <= 14,
         'left': lambda x, y: 1 <= x <= 5 and 6 <= y <= 9, 'right': lambda x, y: 10 <= x <= 14 and 6 <= y <= 9}
_ARROW8 = {'up': ['...dd...', '..dlld..', '.dllllм.'.replace('м', 'd'), 'dddlldd.'[:8], '..dlld..', '..dlld..', '..dddd..', '........'],
           'right': ['...d....', '...dd...', 'ddddld..', 'dllllld.', 'dllllld.', 'ddddld..', '...dd...', '...d....']}
_ARROW8['up'] = ['...dd...', '..dlld..', '.dlllld.', 'dddllddd', '..dlld..', '..dlld..', '..dddd..', '........']
_ARROW8['down'] = _ARROW8['up'][::-1][1:] + ['........']
_ARROW8['left'] = [r[::-1] for r in _ARROW8['right']]
BUTTONS = ['a', 'b', 'start', 'dpad', 'up', 'down', 'left', 'right']


def _letters(im, text, x0, y0, pal):
    """`text` in the console's 8 x 8 font on `im` at (x0, y0): white, with a dark shadow down and right."""
    m = _img().make(len(text) * 8, 8, lambda x, y: 0)
    for k, ch in enumerate(text): m.text(ch, k * 8, 0, 1)
    for y in range(8):
        for x in range(m.w):
            if m.px[y][x]:
                for dx, dy, c in ((1, 1, pal.grey[0]), (0, 0, pal.grey[2])):
                    if 0 <= x0 + x + dx < im.w and 0 <= y0 + y + dy < im.h and (c == pal.grey[2] or not m.get(x + dx, y + dy)):
                        im.px[y0 + y + dy][x0 + x + dx] = c
    return im


def button(name, size, pal, colour=None):
    """A button prompt (one of BUTTONS) for 'press A' screens and tutorials: at 16 px a round A or B, a START pill (48 x 16), the
    d-pad, or the d-pad with the arm `up`, `down`, `left` or `right` lit; at 8 px A, B and four arrows (no START or d-pad).
    A and B are red and blue unless colour= says; the lit arm is gold."""
    if name not in BUTTONS: raise KeyError('no button %r: %s' % (name, ', '.join(BUTTONS)))
    Img = _img()
    if size == 8:
        if name in ('a', 'b'):
            im = small('btn', pal, colour or ('red' if name == 'a' else 'blue'), _BTN8)
            g = _GLYPH8[name]; dark = pal.grey[0]
            for y, r in enumerate(g):
                for x, ch in enumerate(r):
                    if ch == 'd': im.px[2 + y][2 + x] = dark
            return im
        if name in _ARROW8: return small('arrow', pal, colour or 'grey', _ARROW8[name])
        raise KeyError('%s is drawn at 16 px only' % name)
    if size != 16: raise ValueError('buttons are 8 or 16 px')
    if name in ('a', 'b'):
        im = small('btn', pal, colour or ('red' if name == 'a' else 'blue'), _BTN16)
        return _letters(im, name.upper(), 4, 3, pal)
    if name == 'start':                    # 48 x 16: the word needs 40 px (art.big_sprite, or a scene)
        rp = getattr(pal, colour or 'grey')
        im = _img().make(48, 16, lambda x, y: 0)
        pill = lambda x, y: 1 <= y <= 14 and (7 <= x <= 40 or (x - 7.5) ** 2 + (y - 7.5) ** 2 <= 42 or (x - 40.5) ** 2 + (y - 7.5) ** 2 <= 42)
        for y in range(16):
            for x in range(48):
                if pill(x, y): im.px[y][x] = rp[0] if not all(pill(x + dx, y + dy) for dx in (-1, 0, 1) for dy in (-1, 0, 1)) else (rp[2] if y < 6 else rp[1])
        return _letters(im, 'START', 4, 4, pal)
    im = small('btn', pal, colour or 'grey', _DPAD)
    if name in _ARMS:
        for y in range(16):
            for x in range(16):
                if _ARMS[name](x, y) and im.px[y][x] == pal.grey[1]: im.px[y][x] = pal.gold[2]
    return im


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
    sheet.row()
    for k, d in enumerate(digits(pal)): sheet.add('%d' % k, d, pal, scale=8)
    sheet.row()
    for k, d in enumerate(digits(pal, 16, 'gold')): sheet.add('%d 16' % k, d, pal, scale=4)
    sheet.row()
    for name in BUTTONS: sheet.add(name + ' 16', button(name, 16, pal), pal, scale=4)
    sheet.row()
    for name in ('a', 'b', 'up', 'down', 'left', 'right'): sheet.add(name + ' 8', button(name, 8, pal), pal, scale=8)
    for size in (16, 8):
        for name in ANIMS:
            sheet.row()
            for k, f in enumerate(anim(name, size, pal)): sheet.add('%s %d.%d' % (name, size, k), f, pal, scale=4 if size == 16 else 8)
    sheet.save(sys.argv[2])
    print('wrote', sys.argv[2])
