# The small things of Streets of Woe in the world palette (sprite palette 7): the three kinds of prop, the pickups, the
# thrown weapons, the bottle and a tombstone. Each is a picture; art.py makes them big sprites (art.big_sprite).
#   python3 props.py out.png      a sheet of them
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../../tools/devkit/art'))
from kit import *

LAYOUT = {'shadow': '1c1428', 'wood': ramp('8a5c30', 3, at=1, step=0.12), 'blue': ramp('4a70b0', 3, at=1, step=0.13),
          'green': ramp('3c7a48', 3, at=1, step=0.12), 'red': 'd03038', 'gold': 'f0c030', 'steel': 'b8c0d0', 'stone': '706878', 'white': 'f8f8f0'}


def box(im, x, y, w, h, fill, light=None, dark=None, ink=None):
    """A rectangle with a lit top and left edge and a shaded bottom and right, inside an outline."""
    im.rect(x, y, w, h, fill)
    if light is not None:
        im.rect(x + 1, y + 1, w - 2, 1, light); im.rect(x + 1, y + 1, 1, h - 2, light)
    if dark is not None:
        im.rect(x + 1, y + h - 2, w - 2, 1, dark); im.rect(x + w - 2, y + 1, 1, h - 2, dark)
    if ink is not None: im.rect(x, y, w, h, ink, fill=False)


def crate(W):
    ink, wd = W.shadow, W.wood
    im = Img(28, 30)
    box(im, 0, 0, 28, 30, wd[1], wd[2], wd[0], ink)
    box(im, 3, 3, 22, 24, wd[1], None, None, wd[0])                    # the frame's inner edge
    for k in range(2, 26):                                              # the two braces
        for t in (k, 27 - k):
            y = 3 + (k - 2) * 24 // 24
            im.pset(2 + k, 2 + (k - 1), wd[0]); im.pset(25 - k + 1, 2 + (k - 1), wd[0])
    for y in range(4, 26, 5): im.pset(4, y, wd[2]); im.pset(23, y, wd[2])   # nail heads
    im.rect(0, 0, 28, 30, ink, fill=False)
    return im


def barrel(W):
    """A steel drum: a bulge, two hoops, a lit rim, shaded along its width."""
    import math
    ink, bl = W.shadow, W.blue
    mask = Img(24, 34)
    for y in range(3, 33):
        half = 10 + 1.4 * math.sin(math.pi * (y - 3) / 29)
        mask.rect(int(12 - half), y, int(2 * half), 1, 1)
    im = shaded(mask, bl, kind='cylinder-y', light=(-1, 0), contrast=1.25, dither=0.12)
    for y in (9, 24):                                                   # the two hoops, a dark line under a light one
        for x in range(24):
            if im.px[y][x]: im.px[y][x] = bl[2]
            if im.px[y + 1][x]: im.px[y + 1][x] = bl[0]
    for y in range(5):                                                  # the rim: an ellipse seen from a little above
        half = 9 + (1 if 0 < y < 4 else 0)
        for x in range(12 - half, 12 + half):
            im.px[y][x] = bl[2] if y in (1, 2) else bl[1]
    for x in range(4, 20): im.pset(x, 2, bl[0]) if x in (4, 19) else None
    im.rect(4, 1, 16, 1, bl[2]); im.rect(6, 2, 12, 2, bl[0])            # the lid's dark middle
    im.outline(ink)
    return im


def bin_(W):
    """A green bin with a lid that overhangs it, ridges, and a handle on the side."""
    ink, gr = W.shadow, W.green
    mask = Img(26, 36)
    for y in range(8, 35):
        half = 11 - (y - 8) * 0.04
        mask.rect(int(13 - half), y, int(2 * half), 1, 1)
    im = shaded(mask, gr, kind='cylinder-y', light=(-1, 0), contrast=1.2, dither=0.12)
    for y in range(13, 33, 5): im.rect(3, y, 20, 1, gr[0])               # ridges
    for y in range(0, 8):                                               # the lid
        for x in range(1, 25): im.px[y][x] = gr[2] if y < 3 else gr[1] if y < 6 else gr[0]
    im.rect(10, 1, 6, 2, gr[1]); im.rect(10, 1, 6, 1, gr[2])            # its knob
    im.rect(0, 5, 26, 3, gr[1]); im.rect(0, 7, 26, 1, gr[0])
    im.outline(ink)
    return im


def apple(W):
    ink = W.shadow
    im = Img(16, 16); im.disc(7.5, 9.5, 6.2, W.red)
    im.pset(4, 6, W.white); im.pset(5, 5, W.white); im.pset(4, 7, W.white)
    im.rect(7, 1, 2, 4, W.wood[0]); im.poly([(9, 2), (14, 1), (12, 5)], W.green[1]); im.pset(11, 3, W.green[2])
    im.outline(ink)
    return im


def chicken(W):
    ink, wd = W.shadow, W.wood
    im = Img(22, 18); im.disc(9.5, 10.5, 7.2, wd[1]); im.disc(7, 8.5, 3.4, wd[2])
    im.rect(15, 8, 6, 3, W.white); im.disc(19.5, 7.5, 2, W.white); im.disc(19.5, 11.5, 2, W.white)   # the bone
    im.pset(5, 6, W.gold); im.pset(6, 5, W.gold); im.pset(12, 14, wd[0]); im.pset(13, 13, wd[0])
    im.outline(ink)
    return im


def money(W):
    ink = W.shadow
    im = Img(18, 20); im.disc(8.5, 13, 7, W.gold); im.poly([(5, 8), (12, 8), (11, 3), (6, 3)], W.gold)       # a sack, its neck
    im.rect(5, 7, 8, 2, W.wood[1]); im.rect(4, 2, 4, 2, W.gold); im.rect(10, 2, 4, 2, W.gold)                   # the tie and the ruffle
    im.disc(5.5, 11.5, 2.2, W.white); im.text('$', 5, 9, W.wood[0])
    im.outline(ink)
    return im


def oneup(W):
    ink = W.shadow
    im = Img(22, 13); im.rect(0, 0, 22, 13, W.blue[1]); im.rect(0, 0, 22, 1, W.blue[2]); im.rect(0, 12, 22, 1, W.blue[0])
    for gx, rows in ((4, ('.#.', '##.', '.#.', '.#.', '.#.', '###')), (9, ('#.#', '#.#', '#.#', '#.#', '#.#', '.#.')), (14, ('###', '#.#', '###', '#..', '#..', '#..'))):
        for j, r in enumerate(rows):
            for i, c in enumerate(r):
                if c == '#': im.pset(gx + i, 3 + j, W.white)
    im.rect(0, 0, 22, 13, ink, fill=False)
    return im


def pipe_h(W):
    ink = W.shadow
    im = Img(38, 8); im.rect(2, 1, 34, 6, W.steel); im.rect(2, 1, 34, 2, W.white); im.rect(2, 6, 34, 1, W.stone); im.rect(0, 0, 3, 8, W.stone); im.rect(35, 0, 3, 8, W.stone)
    im.outline(ink)
    return im


def knife_h(W):
    ink = W.shadow
    im = Img(24, 9); im.poly([(8, 2), (22, 3), (23, 5), (8, 6)], W.white); im.rect(8, 5, 14, 1, W.steel); im.rect(0, 1, 8, 6, W.wood[1]); im.rect(0, 1, 8, 1, W.wood[2]); im.rect(7, 0, 2, 8, W.stone)
    im.outline(ink)
    return im


def bottle_v(W):
    ink = W.shadow
    im = Img(8, 18); im.rect(1, 6, 6, 11, W.green[1]); im.rect(2, 1, 4, 6, W.green[1]); im.rect(2, 0, 4, 2, W.green[0]); im.rect(2, 8, 1, 6, W.green[2]); im.rect(3, 12, 3, 3, W.white) if False else None
    im.outline(ink)
    return im


def tomb(W):
    ink = W.shadow
    im = Img(22, 26); im.rect(1, 6, 20, 19, W.stone); im.disc(10.5, 7.5, 9.5, W.stone); im.rect(1, 12, 20, 13, W.stone)
    for y in range(3, 25):
        im.pset(3, y, W.white) if 8 < y < 24 else None
    im.rect(10, 7, 3, 12, W.white); im.rect(6, 10, 11, 3, W.white)
    im.rect(1, 22, 20, 3, W.stone); im.rect(1, 24, 20, 1, W.shadow)
    im.outline(ink)
    return im


ALL = {'crate': crate, 'barrel': barrel, 'bin': bin_, 'apple': apple, 'chicken': chicken, 'money': money, 'oneup': oneup,
       'pipe_h': pipe_h, 'knife_h': knife_h, 'bottle_v': bottle_v, 'tomb': tomb}


if __name__ == '__main__':
    art = Art(); art.region('spr', 448, 1023)
    W = art.sprite_palette(7, LAYOUT)
    sh = Sheet(scale=6)
    for n, f in ALL.items(): sh.add(n, f(W), W)
    sh.save(sys.argv[1])
