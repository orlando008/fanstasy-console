# Rags to Riches: the cast and the props, drawn in code (sprites). Imported by art.py.
#   Dot     the singer, a human with spiky pink hair and a mic
#   Zorp    the synth player, an alien with antennae
#   Spike   the drummer, a punk with a green mohawk
#   Mr Grubb  the landlord, with an eviction notice
#   the Rustbucket (the van), three venue icons, fx (coins, sparks, a rain cloud), five map landmarks.
# Every picture is built from shapes (disc, rect, poly) so a change is one line; look at them with
#   node tools/devkit/art/sprites.mjs carts/rags-to-riches.nova out.png --scale 4
from kit import *


def ell(im, cx, cy, rx, ry, c):
    """A filled ellipse."""
    for y in range(im.h):
        for x in range(im.w):
            if ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1: im.pset(x, y, c)
    return im


def finish(im, edge):
    """Outline the figure in its edge colour."""
    return im.outline(edge)


def bob(im, dy):
    """The picture moved down by dy pixels (the idle bounce)."""
    out = Img(im.w, im.h)
    out.blit(im, 0, dy)
    return out


# ------------------------------------------------------------------ Dot, the singer
def dot(P, frame):
    im = Img(32, 32)
    up = 1 if frame else 0                       # frame 1 is one pixel up, the mic hand raised
    # legs and boots
    im.rect(11, 25 - up, 4, 5, P.jeans); im.rect(17, 25 - up, 4, 5, P.jeans)
    im.rect(11, 25 - up, 1, 5, P.jeansd); im.rect(17, 25 - up, 1, 5, P.jeansd)
    im.rect(10, 29 - up, 6, 2, P.boot); im.rect(16, 29 - up, 6, 2, P.boot)
    # jacket and arms
    im.rect(10, 15 - up, 12, 11, P.jacket); im.rect(10, 15 - up, 2, 11, P.jacketd); im.rect(20, 15 - up, 2, 11, P.jacketd)
    im.rect(15, 16 - up, 2, 9, P.white)          # the shirt under it
    im.rect(7, 16 - up, 3, 8, P.jacket); im.rect(7, 23 - up, 3, 2, P.skin)                      # left arm down
    im.rect(22, 14 - up * 3, 3, 6, P.jacket); im.rect(22, 11 - up * 3, 3, 3, P.skin)            # right arm up, holding the mic
    im.rect(25, 6 - up * 3, 2, 6, P.mic); im.disc(25.5, 5.5 - up * 3, 2.2, P.mic); im.pset(25, 5 - up * 3, P.white)
    # head
    ell(im, 16, 9 - up, 6.4, 6.4, P.skin); im.rect(10, 11 - up, 2, 2, P.skind); im.rect(20, 11 - up, 2, 2, P.skind)
    im.rect(13, 8 - up, 2, 2, P.outline); im.rect(18, 8 - up, 2, 2, P.outline)                   # eyes
    im.pset(13, 8 - up, P.white); im.pset(18, 8 - up, P.white)
    im.rect(14, 12 - up, 4, 1, P.outline); im.pset(13, 11 - up, P.outline); im.pset(18, 11 - up, P.outline)   # a wide grin
    # spiky pink hair
    im.poly([(9, 8 - up), (8, 1 - up), (12, 4 - up), (13, -1 - up), (16, 3 - up), (19, -1 - up), (20, 4 - up), (24, 1 - up), (23, 8 - up), (20, 5 - up), (12, 5 - up)], P.hair)
    im.poly([(13, 1 - up), (16, 3 - up), (14, 4 - up)], P.hairl); im.pset(20, 1 - up, P.hairl)
    return finish(im, P.outline)


# ------------------------------------------------------------------ Zorp, the alien synth player
def zorp(P, frame):
    im = Img(32, 32)
    up = 1 if frame else 0
    # keyboard on a stand in front
    im.rect(4, 22, 24, 4, P.keybd); im.rect(4, 22, 24, 1, P.keys)
    for x in range(5, 28, 3): im.rect(x, 23, 1, 2, P.keys)
    im.rect(7, 26, 2, 5, P.stand); im.rect(23, 26, 2, 5, P.stand)
    # body, arms to the keys
    im.rect(10, 15 - up, 12, 8, P.shirt); im.rect(10, 15 - up, 2, 8, P.shirtd); im.rect(20, 15 - up, 2, 8, P.shirtd)
    im.rect(7, 17 - up, 3, 5, P.shirt); im.rect(22, 17 - up, 3, 5, P.shirt)
    im.rect(7, 21 - up * 2, 3, 2, P.skin); im.rect(22, 21 - up * 2 + (up), 3, 2, P.skin)
    im.rect(14, 17 - up, 4, 2, P.gold)           # a gold bolt on the shirt
    # the big oval head
    ell(im, 16, 9 - up, 7.2, 7.6, P.skin); ell(im, 17, 11 - up, 5.5, 4.5, P.skinl)
    im.rect(9, 12 - up, 3, 2, P.skind); im.rect(20, 12 - up, 3, 2, P.skind)
    ell(im, 12.5, 8 - up, 2.6, 3.2, P.eye); ell(im, 19.5, 8 - up, 2.6, 3.2, P.eye)               # huge eyes
    im.rect(12, 8 - up, 2, 3, P.outline); im.rect(19, 8 - up, 2, 3, P.outline)
    im.pset(12, 8 - up, P.eye); im.pset(19, 8 - up, P.eye)
    im.rect(15, 13 - up, 3, 1, P.outline)        # a tiny mouth
    im.pset(10, 12 - up, P.blush); im.pset(22, 12 - up, P.blush)
    # antennae with glowing bobbles
    im.line(12, 4 - up, 9, 1 - up, P.skind); im.line(20, 4 - up, 23, 1 - up, P.skind)
    im.disc(9, 1.5 - up, 1.8, P.antenna); im.disc(23, 1.5 - up, 1.8, P.antenna)
    return finish(im, P.outline)


# ------------------------------------------------------------------ Spike, the punk drummer
def spike(P, frame):
    im = Img(32, 32)
    up = 1 if frame else 0
    # the drum kit: a bass drum in front, two toms, cymbals
    ell(im, 16, 25, 8, 6.5, P.drum); ell(im, 16, 25, 5.2, 4.2, P.drumd); im.disc(16, 25, 1.5, P.brass)
    im.rect(8, 19, 16, 2, P.brass)               # the rim
    im.rect(1, 19, 8, 3, P.drum); im.rect(1, 19, 8, 1, P.brassd); im.rect(23, 19, 8, 3, P.drum); im.rect(23, 19, 8, 1, P.brassd)
    im.line(3, 16, 3, 19, P.stud); im.line(29, 16, 29, 19, P.stud)
    im.rect(0, 15, 7, 2, P.brass); im.rect(25, 15, 7, 2, P.brass)                            # cymbals
    im.pset(0, 15, P.brassd); im.pset(31, 15, P.brassd)
    # body
    im.rect(11, 12 - up, 10, 8, P.tank); im.rect(11, 12 - up, 2, 8, P.tankd); im.rect(19, 12 - up, 2, 8, P.tankd)
    im.rect(8, 13 - up, 3, 3, P.skin); im.rect(21, 13 - up, 3, 3, P.skin)
    # the sticks: one up, one down, swapped each frame
    lx, ly = (5, 6) if not up else (6, 18)       # the left stick's tip: up, then down
    rx, ry = (26, 18) if not up else (27, 6)     # the right stick's tip: down, then up
    im.line(9, 14 - up, lx, ly, P.stick); im.line(23, 14 - up, rx, ry, P.stick)
    # head
    ell(im, 16, 7 - up, 5.8, 5.8, P.skin)
    im.rect(12, 6 - up, 2, 2, P.outline); im.rect(18, 6 - up, 2, 2, P.outline)
    im.line(11, 4 - up, 14, 5 - up, P.outline); im.line(21, 4 - up, 18, 5 - up, P.outline)        # a scowl
    im.rect(14, 10 - up, 4, 1, P.outline); im.pset(13, 9 - up, P.stud); im.pset(19, 9 - up, P.stud)
    # the green mohawk
    for i, h in enumerate((4, 6, 7, 6, 4)): im.rect(13 + int(i * 1.5), 6 - up - h, 2, h, P.mohawk)
    im.rect(14, 0 - up, 4, 2, P.mohawkd)
    return finish(im, P.outline)


# ------------------------------------------------------------------ Mr Grubb, the landlord
def grubb(P, frame):
    im = Img(32, 32)
    up = 1 if frame else 0                       # frame 1: furious, the notice shaken
    im.rect(11, 26, 4, 4, P.suitd); im.rect(17, 26, 4, 4, P.suitd)
    im.rect(10, 29, 6, 2, P.shoe); im.rect(16, 29, 6, 2, P.shoe)
    im.rect(9, 14, 14, 13, P.suit); im.rect(9, 14, 2, 13, P.suitd); im.rect(21, 14, 2, 13, P.suitd)
    im.poly([(13, 14), (19, 14), (16, 22)], P.shirt); im.rect(15, 16, 2, 7, P.tie)
    im.rect(6, 15, 3, 9, P.suit); im.rect(6, 23, 3, 2, P.skin)
    im.rect(23, 13 - up * 2, 3, 6, P.suit); im.rect(23, 11 - up * 2, 3, 3, P.skin)
    # the notice: a sheet of paper with ink lines
    im.rect(23 - 1, 3 - up * 2, 9, 9, P.paper); im.rect(23 - 1, 3 - up * 2, 9, 1, P.paperd)
    for k in range(3): im.rect(24, 5 + k * 2 - up * 2, 6, 1, P.ink)
    # head: bald, big moustache, scowling
    ell(im, 16, 8, 6.2, 6.2, P.skin); im.rect(10, 9, 2, 2, P.skind); im.rect(20, 9, 2, 2, P.skind)
    im.rect(12, 6, 3, 2, P.outline); im.rect(18, 6, 3, 2, P.outline)
    im.line(11, 4, 14, 5, P.outline); im.line(21, 4, 18, 5, P.outline)
    im.rect(11, 10, 10, 2, P.stache); im.pset(10, 11, P.stache); im.pset(21, 11, P.stache); im.rect(14, 13, 4, 1, P.outline)
    im.pset(11, 9, P.cheek); im.pset(20, 9, P.cheek)
    return finish(im, P.outline)


# ------------------------------------------------------------------ the van
def van(P, frame=0):
    """The Rustbucket, side view, 32 x 32, facing right. Frame 1 bounces a pixel (the road)."""
    im = Img(32, 32)
    d = 1 if frame else 0
    # roof rack with an amp strapped on
    im.rect(4, 7 + d, 18, 1, P.rust); im.rect(5, 8 + d, 1, 3, P.rust); im.rect(20, 8 + d, 1, 3, P.rust)
    im.rect(7, 3 + d, 9, 5, P.outline); im.rect(8, 4 + d, 7, 3, P.tyre); im.pset(9, 5 + d, P.chrome); im.pset(14, 5 + d, P.light)
    # the body
    im.rect(1, 11 + d, 30, 14, P.body); im.rect(1, 11 + d, 30, 2, P.bodyl); im.rect(1, 23 + d, 30, 2, P.bodyd)
    im.rect(1, 17 + d, 30, 2, P.stripe); im.rect(1, 19 + d, 30, 1, P.bodyd)
    # windows: back, side, windscreen
    im.rect(4, 13 + d, 6, 4, P.glass); im.rect(11, 13 + d, 6, 4, P.glass); im.rect(19, 13 + d, 8, 4, P.glass)
    im.rect(4, 13 + d, 6, 1, P.glassd); im.rect(11, 13 + d, 6, 1, P.glassd); im.rect(19, 13 + d, 8, 1, P.glassd)
    # bumpers, lights, rust spots, a sticker
    im.rect(0, 22 + d, 2, 3, P.chrome); im.rect(30, 22 + d, 2, 3, P.chrome)
    im.rect(29, 19 + d, 2, 2, P.light); im.rect(1, 19 + d, 1, 2, P.stripe)
    for (x, y) in ((8, 21), (15, 22), (23, 21), (5, 12)): im.pset(x, y + d, P.rust)
    im.rect(12, 20 + d, 5, 3, P.white); im.rect(13, 21 + d, 3, 1, P.stripe)                   # a bumper-sticker star
    # wheels
    for cx in (8, 23):
        im.disc(cx, 25 + d, 4.4, P.tyre); im.disc(cx, 25 + d, 2.2, P.hub); im.pset(cx, 25 + d, P.chrome)
    return finish(im, P.outline)


# ------------------------------------------------------------------ the three venues, 32 x 32 icons
def venue_bar(P):
    im = Img(32, 32)
    im.rect(2, 10, 28, 20, P.brick); im.rect(2, 10, 28, 2, P.brickd); im.rect(2, 28, 28, 2, P.brickd)
    for y in range(13, 28, 4):
        for x in range(2 + (y // 4 % 2) * 3, 30, 6): im.rect(x, y, 1, 3, P.brickd)
    im.rect(0, 8, 32, 3, P.woodd); im.rect(0, 8, 32, 1, P.wood)                                 # the roof edge
    im.rect(12, 16, 8, 14, P.woodd); im.rect(13, 17, 6, 13, P.wood); im.pset(18, 24, P.gold)    # the door
    im.rect(3, 15, 7, 7, P.sign); im.rect(4, 16, 5, 5, P.neonb); im.rect(22, 15, 7, 7, P.sign); im.rect(23, 16, 5, 5, P.neonp)     # two windows with neon
    im.rect(8, 1, 16, 7, P.outline); im.rect(9, 2, 14, 5, P.sign)                                                               # the sign
    for x in (11, 14, 17, 20): im.rect(x, 3, 2, 3, P.neonp)
    return finish(im, P.outline)


def venue_theatre(P):
    im = Img(32, 32)
    im.poly([(1, 10), (16, 1), (31, 10)], P.gold); im.poly([(5, 10), (16, 4), (27, 10)], P.brickd)       # the pediment
    im.rect(2, 10, 28, 3, P.gold); im.rect(1, 29, 30, 2, P.silver); im.rect(3, 27, 26, 2, P.silver)      # steps
    for x in (4, 10, 19, 25): im.rect(x, 13, 3, 14, P.sign); im.rect(x + 2, 13, 1, 14, P.silver); im.rect(x - 1, 13, 5, 1, P.silver)
    im.rect(12, 14, 8, 13, P.curtaind)
    im.rect(12, 14, 4, 13, P.curtain); im.rect(16, 14, 1, 13, P.curtaind); im.rect(12, 14, 8, 2, P.gold)    # the red curtain seen through the door
    im.pset(16, 3, P.light); im.disc(16, 7, 1.6, P.gold)
    return finish(im, P.outline)


def venue_arena(P):
    im = Img(32, 32)
    ell(im, 16, 20, 15, 9, P.steel)
    im.rect(1, 19, 30, 10, P.steel); im.rect(1, 27, 30, 2, P.steeld)
    ell(im, 16, 17, 14, 7.5, P.silver); ell(im, 16, 18, 11, 4.5, P.steeld)                     # the roof dome
    im.rect(4, 22, 24, 7, P.steel)
    for x in range(5, 28, 4): im.rect(x, 22, 1, 7, P.steeld)
    im.rect(13, 23, 6, 6, P.outline); im.rect(14, 24, 4, 5, P.neonb)                              # the gate, lit blue
    for (x, c) in ((4, P.light), (10, P.neonp), (21, P.neonb), (27, P.light)): im.rect(x, 1, 2, 9, P.silver); im.disc(x + 1, 3, 1.6, c)   # floodlight masts
    return finish(im, P.outline)


# ------------------------------------------------------------------ fx
def coin(P, k):
    """A spinning coin, 8 x 8, in 4 frames (wide to edge-on)."""
    im = Img(8, 8)
    w = (6, 4, 2, 4)[k]
    x0 = 4 - w // 2
    im.rect(x0, 1, w, 6, P.coin)
    if w > 2: im.rect(x0, 1, 1, 6, P.coinl); im.rect(x0 + w - 1, 1, 1, 6, P.coind); im.rect(x0 + 1, 3, max(w - 2, 1), 2, P.coind)
    return im


def sparkle(P, k):
    im = Img(8, 8)
    r = (1, 2, 3, 2)[k]
    im.rect(4 - r, 3, r * 2, 2, P.spark) if r > 1 else None
    im.rect(3, 4 - r, 2, r * 2, P.spark) if r > 1 else None
    im.rect(3, 3, 2, 2, P.spark)
    return im


def cloud(P, k):
    """A grey rain cloud, 16 x 16; frames 0 and 1 move the rain."""
    im = Img(16, 16)
    ell(im, 5, 5, 4.5, 3.4, P.cloud); ell(im, 10, 4.5, 5, 3.8, P.cloud); ell(im, 8, 6.5, 7, 3, P.cloud)
    im.rect(2, 8, 12, 1, P.cloudd)
    for i, x in enumerate((3, 6, 9, 12)):
        y = 10 + ((i + k) % 2) * 2 + (k % 2)
        im.rect(x, y, 1, 3, P.rain)
    return im.outline(P.outline)


def moneybag(P):
    im = Img(16, 16)
    ell(im, 8, 10, 6, 5, P.bag)
    im.rect(5, 3, 6, 2, P.bag); im.rect(4, 2, 8, 1, P.bagd); im.rect(6, 5, 4, 1, P.bagd)
    im.rect(7, 8, 2, 5, P.coin); im.rect(6, 8, 4, 1, P.coin); im.rect(6, 12, 4, 1, P.coin); im.rect(6, 10, 2, 1, P.coin)
    return im.outline(P.outline)


def star(P):
    im = Img(16, 16)
    im.poly([(8, 0), (10, 6), (16, 6), (11, 10), (13, 16), (8, 12), (3, 16), (5, 10), (0, 6), (6, 6)], P.coin)
    im.poly([(8, 3), (9, 7), (8, 8), (7, 7)], P.coinl)
    return im.outline(P.outline)


# ------------------------------------------------------------------ map landmarks, 16 x 16
def landmark(P, i):
    im = Img(16, 16)
    if i == 0:     # Rustport: a harbour crane
        im.rect(2, 13, 12, 2, P.rust); im.rect(3, 4, 2, 9, P.rustl); im.rect(3, 3, 10, 2, P.rustl); im.line(12, 4, 12, 9, P.tower); im.rect(11, 9, 3, 2, P.towerd)
    elif i == 1:   # Sunvale: a cactus under the sun
        im.disc(12, 3, 2.6, P.win); im.rect(6, 5, 3, 10, P.cactus); im.rect(3, 7, 3, 2, P.cactus); im.rect(3, 5, 2, 4, P.cactus); im.rect(9, 8, 3, 2, P.cactus); im.rect(11, 6, 2, 4, P.cactus); im.rect(6, 5, 1, 10, P.cactusd); im.rect(2, 14, 12, 1, P.sand)
    elif i == 2:   # Cedar City: pines
        for (x, h) in ((3, 9), (8, 12), (12, 8)):
            im.poly([(x, 14 - h), (x + 3, 14), (x - 3, 14)], P.pine); im.rect(x - 1, 14, 2, 2, P.trunk)
        im.rect(8, 6, 1, 4, P.pined)
    elif i == 3:   # Metro Heights: towers
        im.rect(2, 6, 4, 9, P.tower); im.rect(6, 2, 4, 13, P.towerd); im.rect(10, 8, 4, 7, P.tower)
        for (x, y) in ((3, 8), (3, 11), (7, 4), (7, 7), (7, 10), (11, 10), (11, 12)): im.rect(x, y, 1, 2, P.win)
        im.rect(8, 0, 1, 2, P.towerd)
    else:          # Coastline: a palm and waves
        im.rect(7, 6, 2, 8, P.trunk); im.poly([(8, 5), (14, 7), (8, 7)], P.palm); im.poly([(8, 5), (2, 7), (8, 7)], P.palm); im.poly([(8, 5), (11, 1), (9, 6)], P.palmd); im.poly([(8, 5), (5, 1), (7, 6)], P.palmd)
        im.rect(1, 14, 14, 2, P.sea); im.pset(3, 13, P.win); im.pset(9, 13, P.win)
    return im.outline(P.outline)


def cursor(P, k):
    """The map's selection ring, 16 x 16, two frames (a breathing ring)."""
    im = Img(16, 16)
    im.ring(7.5, 7.5, 6.4 + 0.8 * k, 7.6 + 0.8 * k, P.coin)
    return im
