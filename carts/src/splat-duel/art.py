# Splat Duel's art: carts/src/splat-duel/tiles.txt, palette.txt, map.txt and art.json, and the ART block in code.js.
#   python3 carts/src/splat-duel/art.py carts/src/splat-duel
# Written with the art toolkit (tools/devkit/art/kit.py). Look at it with
#   node tools/devkit/art/sprites.mjs carts/splat-duel.nova out.png
#   node tools/devkit/art/scene.mjs carts/splat-duel.nova out.png --scene far --holes
#   node tools/devkit/art/proof.mjs splat-duel
#
# The courtyard is one world 448 px wide (WORLD_W in code.js). The screen shows two windows onto it, side by side:
# world x 0..127 on screen x 0..127 (teal's end) and world x 320..447 on screen x 128..255 (magenta's end; the
# screen column is the world column minus 192). Every picture of the courtyard is drawn once in world coordinates
# and cut into the screen by view(), so the two halves are the same place and cannot disagree.
#
# The walls are drawn here as plain brick; code.js copies each wall cell into tiles of its own (PAINT_TILE on) and
# paints over them, so the paint lives on the wall, under the sprites. The wall palette is three ramps of five in the
# same order (brick, teal paint, magenta paint): a painted pixel is the same step of the paint's ramp as the brick
# step under it, so paint keeps the courses and the mortar.
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../../tools/devkit/art'))
from kit import *

WORLD_W, SPLIT, OFFSET = 448, 128, 192
GROUND = 200                                   # the screen row of the ground (world y 0)
WALL_W, WALL_H = 32, 96                        # each wall: world x 0..31 and 416..447, 96 px tall

art = Art()
art.region('bg', 1, 511)
art.region('paint', 512, 607)                  # left empty: code.js puts the walls' own tiles here (2 x 4 x 12)
art.region('spr', 608, 1023)

def view(world):
    """The screen picture of a world-wide picture: the two windows, side by side."""
    out = Img(256, world.h)
    for y in range(world.h):
        for sx in range(256):
            out.px[y][sx] = world.px[y][sx if sx < SPLIT else sx + OFFSET]
    return out

# --- Colours ---
art.gradient('sky', ['2a4aa8', '3a5cb8', '6c9ae0', 'a8d4f0', 'e8f0d8'], y0=0, y1=190)
art.color(200, '141c3c', 'GLASS')              # see-through panels (code.js blends the overlay from 192 up)
art.color(113, '28d0b0', 'TEAL')               # the overlay's own colours (BG palette 7, which no layer uses)
art.color(114, 'f04aa8', 'MAG')
art.color(115, '0e5a52', 'TEALD')
art.color(116, '6a1a4a', 'MAGD')
art.color(117, 'f8d850', 'YELLOW')
art.color(118, '2a2a44', 'STONE')
art.color(119, '5a5a7a', 'STONEL')

ground = art.palette(1, {'pave': ramp('b8a88a', 5), 'grass': ramp('5aa03a', 4), 'leaf': ramp('2e6a34', 4)})
far = art.palette(2, {'hill': recede(ramp('4a8a4a', 3), 0.55, 'a8d4f0'), 'roof': recede(ramp('c0604a', 3), 0.4, 'a8d4f0'),
                      'house': recede(ramp('e8d8b8', 3), 0.4, 'a8d4f0'), 'tree': recede(ramp('3a7a44', 3), 0.3, 'a8d4f0')})
wallp = art.palette(3, {'brick': ramp('c87a44', 5), 'tpaint': ramp('2ad4b4', 5), 'mpaint': ramp('f04aa8', 5)})
logo = art.palette(4, {'teal': ramp('2ad4b4', 4), 'mag': ramp('f04aa8', 4), 'edge': '1a1030', 'shade': '2a1a48', 'gold': ramp('f0c040', 4)})

# Sprite palettes 0 and 1 are the two players, with the same roles (so one picture serves both); 2 is the items.
def player_pal(n, team, hair):
    return art.sprite_palette(n, {'skin': ramp('f0b888', 3), 'hair': ramp(hair, 2), 'team': ramp(team, 4),
                                  'white': ramp('f0f0f8', 2), 'wood': ramp('a06a30', 2), 'line': '20182c'})
teal = player_pal(0, '22c0a4', '6a3a1e')
mag = player_pal(1, 'e83c9c', '7a3a1a')
items = art.sprite_palette(2, {'gold': ramp('f0b828', 3), 'line': '2a1a10', 'white': 'fffff0', 'blue': ramp('30c8b0', 3),
                               'pink': ramp('f050a8', 2), 'yellow': ramp('f8e060', 3), 'grey': ramp('8890a8', 2)})

# --- The courtyard, in world coordinates ---
# Far: a row of houses and trees beyond the courtyard, hills behind them (layer 2).
farw = Img(WORLD_W, 104)                       # screen rows 96..199
hills(farw, far.hill, base=70, amp=18, period=224, seed=3)
for k, hx in enumerate(range(40, WORLD_W, 92)):
    w, h = 36 + (k % 2) * 8, 26 + (k % 3) * 6
    top = 104 - h - 8
    farw.rect(hx, top, w, h + 8, far.house[1]); farw.rect(hx, top, 3, h + 8, far.house[2])
    for wx in range(hx + 6, hx + w - 6, 10): farw.rect(wx, top + 6, 4, 5, far.house[0])
    for j in range(12):                        # a roof: a triangle with a lit left slope
        farw.rect(hx - 3 + j, top - j, w + 6 - 2 * j, 1, far.roof[1] if j > 1 else far.roof[0])
        farw.pset(hx - 3 + j, top - j, far.roof[2])
treeline(farw, far.tree, base=94, size=12, spacing=30, seed=5, wrap=False)
art.scene('far', view(farw), pal=far, at=(0, 0))

# Ground: a hedge along the back of the courtyard, then paving to the bottom of the screen (layer 1).
groundw = Img(WORLD_W, 40)                     # screen rows 184..223
slabs = texture('paving', 64, 32, ground.pave, bw=24, bh=8)
for x in range(0, WORLD_W, 64): groundw.blit(slabs, x, 16); groundw.blit(slabs, x, 8)
hedge = texture('leaves', 64, 16, ground.leaf)
for x in range(0, WORLD_W, 64): groundw.blit(hedge, x, 0)
for x in range(WORLD_W):
    groundw.px[0][x] = 0 if (x * 7) % 5 == 0 else groundw.px[0][x]
    groundw.px[16][x] = ground.grass[3]; groundw.px[17][x] = ground.grass[2]
    groundw.px[15][x] = ground.leaf[0]
art.scene('ground', view(groundw), pal=ground, at=(0, 28))

# The walls (layer 0): brick, a coping on top. Only the bricks (rows 104..199) are painted.
wallsw = Img(WORLD_W, 104)                     # screen rows 96..199
brick = texture('brick', WALL_W, WALL_H, wallp.brick, bw=16, bh=8)
for x0 in (0, WORLD_W - WALL_W):
    wallsw.blit(brick, x0, 8)
    wallsw.rect(x0, 2, WALL_W, 6, wallp.brick[2]); wallsw.rect(x0, 2, WALL_W, 1, wallp.brick[4])
    wallsw.rect(x0, 7, WALL_W, 1, wallp.brick[0])
art.scene('walls', view(wallsw), pal=wallp, at=(0, 48))

# --- The players: chibi kids in caps with a slingshot, drawn in designed shapes (draw.py), three poses ---
def kid(pose, pony):
    p = teal                                    # roles only: the same indices in both players' palettes
    d = Canvas(32, 32)
    # legs and shoes
    d.fill(oval(12, 27, 2.2, 3), p.team[1], part='legs'); d.fill(oval(18, 27, 2.2, 3), p.team[1], part='legs')
    d.fill(oval(11, 30, 3.2, 1.8), p.line, part='shoes'); d.fill(oval(19, 30, 3.2, 1.8), p.line, part='shoes')
    # body: a white shirt, overalls in the team colour
    d.fill(oval(15, 21, 6, 5), p.white[1], part='body')
    d.fill(poly([(10, 20), (20, 20), (21, 27), (9, 27)]), p.team[2], part='overalls')
    d.fill(poly([(12, 17), (18, 17), (18, 21), (12, 21)]), p.team[2], part='overalls')
    d.shadow('overalls', p.team[1], light=(-1, -1), depth=2)
    d.shadow('body', p.white[0], light=(-1, -1), depth=1.5, outside='overalls')
    # arms: (shoulder to hand), the front hand holds the slingshot
    if pose == 'idle':
        back, front, fork = [(11, 18), (9, 23)], [(18, 18), (21, 22)], (22, 19)
    elif pose == 'draw':
        back, front, fork = [(11, 18), (7, 18)], [(18, 18), (25, 16)], (26, 13)
    else:
        back, front, fork = [(11, 18), (20, 14)], [(18, 18), (26, 15)], (26, 12)
    d.fill(brush(back, 2.6, 2.2), p.white[0], part='barm'); d.fill(oval(*back[1], 1.7, 1.7), p.skin[1], part='bhand')
    if pony: d.fill(blob([(6, 9), (3, 13), (4, 17), (7, 14)]), p.hair[0], part='pony')
    # head and face
    d.fill(oval(15, 10, 7, 6.5), p.skin[2], part='head')
    d.shadow('head', p.skin[1], light=(1, -1), depth=1.5)
    d.fill(blob([(8, 9), (9, 15), (12, 12), (12, 8)]), p.hair[1], part='hair', inside='head')
    # the cap: a dome over the head and a brim to the front
    d.fill(blob([(7.5, 9), (9, 3.5), (15, 2), (21, 4), (22.5, 8)]), p.team[2], part='cap')
    d.light('cap', p.team[3], light=(-1, -1), inset=0.5, width=1.5)
    d.fill(poly([(18, 7), (27, 7.5), (27, 9), (18, 9)]), p.team[1], part='brim')
    d.fill(oval(13, 4.5, 1.6, 1.4), p.white[1], part='badge')
    d.fill(brush(front, 2.6, 2.2), p.white[1], part='farm'); d.fill(oval(*front[1], 1.8, 1.8), p.skin[2], part='fhand')
    # the slingshot: a Y of wood in the front hand
    fx, fy = fork
    d.fill(brush([(fx - 0.5, fy + 5), (fx, fy + 1.5)], 1.6, 1.4), p.wood[0], part='sling')
    d.fill(brush([(fx, fy + 2), (fx - 2, fy - 1.5)], 1.3, 1.1), p.wood[1], part='sling')
    d.fill(brush([(fx, fy + 2), (fx + 2, fy - 1.5)], 1.3, 1.1), p.wood[1], part='sling')
    img = d.render(outline=p.line, tidy=1)
    # pixel-exact details after: the eye, the mouth, the band
    img.pset(19, 10, p.line); img.pset(19, 11, p.line); img.pset(20, 10, p.white[1])
    if pose == 'release': img.pset(20, 14, p.line); img.pset(21, 14, p.line); img.pset(21, 13, p.skin[0])
    else: img.pset(20, 14, p.skin[0]); img.pset(21, 14, p.skin[0])
    if pose == 'draw':                          # the band, stretched from the fork's tips back to the hand
        img.line(fx - 2, fy - 2, back[1][0] + 1, back[1][1], p.wood[0])
        img.line(fx + 2, fy - 2, back[1][0] + 1, back[1][1] - 1, p.wood[0])
    else:
        img.line(fx - 2, fy - 2, fx + 2, fy - 2, p.wood[0])
    return img

KID_POSES = ['idle', 'draw', 'release']
for who, pony in (('teal', False), ('mag', True)):
    for pose in KID_POSES:
        art.sprite('%s_%s' % (who, pose), kid(pose, pony), pal=teal if who == 'teal' else mag, region='spr')

# --- Balloons, splats and droplets: one picture each, in the 'team' role, drawn in either player's palette ---
def balloon(airborne):
    p = teal
    d = Canvas(16, 16)
    if airborne:
        d.fill(oval(9, 8, 5.2, 4.2, rot=-8), p.team[2], part='b')
        d.fill(blob([(13.5, 7), (15.5, 5.5), (15.5, 9)]), p.team[1], part='knot')
    else:
        d.fill(oval(8, 8, 4.6, 5.2), p.team[2], part='b')
        d.fill(blob([(7, 13), (9, 13), (8, 15)]), p.team[1], part='knot')
    d.shadow('b', p.team[1], light=(-1, -1), depth=1.5)
    d.light('b', p.team[3], light=(-1, -1), inset=1.0, width=1.2)
    img = d.render(outline=p.line, tidy=1)
    if airborne:
        img.pset(6, 6, p.white[1]); img.pset(7, 5, p.white[1])
        for y, x0, x1 in ((6, 0, 2), (9, 1, 3)): img.line(x0, y, x1, y, p.white[0])
    else:
        img.pset(6, 5, p.white[1]); img.pset(6, 6, p.white[1])
    return img

art.sprite('balloon', balloon(False), pal=teal, region='spr')
art.sprite('balloon_fly', balloon(True), pal=teal, region='spr')

def splat(kind):
    p = teal
    im = Img(16, 16)
    if kind == 'pop':                            # the skin breaking: a ring of drops round a bright centre
        for k in range(8):
            a = k * math.pi / 4
            im.disc(8 + round(5.5 * math.cos(a)), 8 + round(5.5 * math.sin(a)), 1, p.team[2])
        im.disc(8, 8, 2, p.team[3]); im.pset(8, 8, p.white[1])
    elif kind == 'burst':                        # paint flying out
        pts = [(8, 8, 3.5)] + [(8 + 5.5 * math.cos(a), 8 + 5.5 * math.sin(a), 1.4 + (k % 2)) for k, a in enumerate([0.3, 1.2, 2.1, 2.9, 3.8, 4.6, 5.5])]
        for x, y, r in pts: im.disc(round(x), round(y), round(r), p.team[2])
        im.disc(7, 7, 1, p.team[3])
    else:                                        # a splat on the ground: a flat puddle with drops
        for y in range(10, 15):
            for x in range(16):
                if ((x - 8) / 7.5) ** 2 + ((y - 12.5) / 2.3) ** 2 <= 1: im.pset(x, y, p.team[2] if y > 11 else p.team[3])
        im.pset(1, 9, p.team[2]); im.pset(14, 10, p.team[2]); im.pset(4, 15, p.team[1]); im.pset(12, 15, p.team[1])
    for y in range(16):
        for x in range(16):
            if im.px[y][x] == 0 and any(im.get(x + dx, y + dy) in (p.team[2], p.team[3]) for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                im.px[y][x] = p.team[0]
    return im

for k in ('pop', 'burst', 'puddle'): art.sprite('splat_' + k, splat(k), pal=teal, region='spr')
drop = Img(8, 8); drop.disc(3, 4, 1, teal.team[2]); drop.pset(3, 3, teal.team[3]); drop.pset(3, 2, teal.team[2])
art.sprite('drop', drop, pal=teal, region='spr')

# The turn arrow over the player whose turn it is (pointing down at them).
arrow = Img.from_rows(['.....oooooo.....', '.....oLLMMo.....', '.....oLMMDo.....', '.....oLMMDo.....', '..oooLMMMDooo...',
                       '..oLLLMMMMDDo...', '...oLMMMMMDo....', '....oLMMMDo.....', '.....oLMDo......', '......oDo.......',
                       '.......o........'] + ['.' * 16] * 5, key={'o': teal.line, 'L': teal.team[3], 'M': teal.team[2], 'D': teal.team[1]})
art.sprite('arrow', arrow, pal=teal, region='spr')

# --- The wind pennants, one on each wall: a pole and a flag that hangs limp in calm air and flies further out as the
# wind gets up (strengths 0 to 3), two frames of flutter each. Drawn blowing right; code.js flips them for a wind to the left.
def pennant(strength, phase):
    im = Img(16, 16)
    im.rect(1, 1, 1, 15, items.grey[0]); im.rect(2, 1, 1, 15, items.grey[1]); im.pset(1, 0, items.gold[2]); im.pset(2, 0, items.gold[1])
    if strength == 0:                              # hanging down the pole
        for y in range(2, 9): im.rect(3, y, max(1, 3 - (y - 2) // 3), 1, items.white if y < 6 else items.yellow[1])
        return im
    length, droop = 4 + strength * 3, (3 - strength) * 0.45
    for x in range(length):
        k = x / max(1, length - 1)
        wave = round(math.sin(x * 0.9 + phase * math.pi) * (0.6 + 0.3 * strength) * k)
        top = 2 + round(droop * x) + wave
        h = max(1, round(4 * (1 - k * 0.75)))
        for y in range(top, top + h):
            if 0 <= y < 16: im.pset(3 + x, y, items.yellow[2] if y == top else items.white if x < length // 2 else items.yellow[1])
    return im

for k in range(4):
    for ph in (0, 1):
        if k == 0 and ph: continue
        art.sprite('flag%d%s' % (k, 'ab'[ph] if k else ''), pennant(k, ph), pal=items, region='spr')

# --- The power-ups: an icon in a gold diamond (16 px), and the sparkle of a reveal ---
def diamond(inner):
    im = Img(16, 16)
    for y in range(16):
        for x in range(16):
            d = abs(x - 7.5) + abs(y - 7.5)
            if d <= 7.6: im.pset(x, y, items.line if d > 6.6 else items.gold[2] if d > 5.4 and (x + y) < 15 else items.gold[0] if d > 5.4 else items.line if d > 4.6 else 0)
    inner(im)
    return im

def big(im):
    im.disc(8, 7, 3, items.blue[1]); im.disc(7, 6, 2, items.blue[2]); im.pset(6, 5, items.white); im.pset(8, 11, items.blue[0])
def triple(im):
    im.disc(6, 7, 2, items.blue[1]); im.disc(10, 7, 2, items.pink[1]); im.disc(8, 10, 2, items.yellow[1])
    im.pset(5, 6, items.white); im.pset(9, 6, items.white); im.pset(7, 9, items.white)
def roller(im):
    im.rect(5, 5, 7, 3, items.blue[1]); im.rect(5, 5, 7, 1, items.blue[2]); im.line(11, 8, 11, 9, items.grey[1])
    im.line(8, 9, 11, 9, items.grey[1]); im.line(8, 10, 8, 12, items.grey[0])
def sponge(im):
    im.rect(4, 6, 8, 5, items.yellow[1]); im.rect(4, 6, 8, 1, items.yellow[2]); im.rect(11, 6, 1, 5, items.yellow[0])
    for x, y in ((6, 8), (9, 9), (7, 10)): im.pset(x, y, items.yellow[0])

for name, f in (('pu_big', big), ('pu_triple', triple), ('pu_roller', roller), ('pu_sponge', sponge)):
    art.sprite(name, diamond(f), pal=items, region='spr')

for k, r in enumerate([2, 4, 6]):                # the reveal: a star of light that grows
    im = Img(16, 16)
    for i in range(-r, r + 1):
        c = items.white if abs(i) < 2 else items.yellow[2]
        im.pset(8 + i, 8, c); im.pset(8, 8 + i, c)
    if r > 2:
        for i in range(1, r // 2 + 1): im.pset(8 + i, 8 + i, items.yellow[1]); im.pset(8 - i, 8 - i, items.yellow[1]); im.pset(8 + i, 8 - i, items.yellow[1]); im.pset(8 - i, 8 + i, items.yellow[1])
    art.sprite('sparkle%d' % k, im, pal=items, region='spr')

# --- The title: SPLAT in teal, DUEL in magenta, on layer 0 in place of the walls ---
title = Img(256, 72)
t1 = big_text('SPLAT', logo.teal, scale=4, outline=logo.edge, shadow=logo.shade)
t2 = big_text('DUEL', logo.mag, scale=4, outline=logo.edge, shadow=logo.shade)
title.blit(t1, (256 - t1.w) // 2 - 16, 2); title.blit(t2, (256 - t2.w) // 2 + 16, 38)
art.scene('logo', title, pal=logo, at=(0, 64))

art.write(sys.argv[1])
