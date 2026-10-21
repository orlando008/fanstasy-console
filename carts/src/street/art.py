# Street's art: tiles.txt, palette.txt, map.txt, art.json and the ART block of code.js.
#   python3 carts/src/street/art.py carts/src/street
# The test of the art kit's drawn figures (tools/devkit/art/figure.py on rig.py's skeleton; docs/dev/snes-picture.md):
# a brawler drawn in designed shapes, with idle, walk, punch and kick animations rendered from poses (big sprites that
# share every piece that does not change between frames), on a night street after Streets of Rage 2: a city under a
# sky gradient, a chain-link fence, paving in perspective.
import os, sys, math
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../../tools/devkit/art'))
from kit import *

art = Art()
art.region('bg', 1, 479)
art.region('spr', 480, 1023)
art.backdrop('100818')
art.color(113, 'f8f8f0', 'WHITE'); art.color(114, 'ffd040', 'GOLD'); art.color(115, '181020', 'INK')

# --- The sky: a colour for every line, dusk purple to a warm city glow at the horizon. ---
art.gradient('sky', ['0c0820', '281848', '583060', 'a05868'], y0=0, y1=120)

# --- BG2: the city, buildings with lit windows and neon, repeating every 128 px. ---
CITY = art.palette(1, {'block': recede(ramp('382c58', 3), 0.3, '583060'), 'win': ['c8a048', 'f8e090'], 'neon': ['f050a0', '50e0f0'], 'roof': '201838'})
city = Img(128, 128)
x = 0
k = 0
while x < 128:
    w = 14 + int(hsh(k * 7 + 1) % 14)
    top = 34 + int(hsh(k * 13 + 5) % 50)
    for yy in range(top, 128):
        for xx in range(x, min(128, x + w)):
            edge = xx == x
            city.px[yy][xx] = CITY.roof if yy == top else CITY.block[0] if edge else CITY.block[1 if (xx + yy) % 7 else 0]
    for wy in range(top + 4, 120, 6):                    # windows: two pixels wide, some lit
        for wx in range(x + 3, min(128, x + w) - 2, 4):
            h = hsh(wx * 31 + wy * 17 + k)
            c = CITY.win[1] if h % 5 == 0 else CITY.win[0] if h % 3 == 0 else None
            if c:
                city.pset(wx, wy, c); city.pset(wx + 1, wy, c); city.pset(wx, wy + 1, CITY.block[2]); city.pset(wx + 1, wy + 1, CITY.block[2])
    if k % 3 == 1:                                       # a neon sign
        for xx in range(x + 2, min(128, x + w) - 2): city.pset(xx, top + 6, CITY.neon[k % 2]); city.pset(xx, top + 8, CITY.neon[k % 2])
    x += w + 1; k += 1
far = Img(256, 128); far.blit(city, 0, 0); far.blit(city, 128, 0)
art.scene('city', far, pal=CITY, at=(0, 0), region='bg')

# --- BG1: a chain-link fence on posts, the city showing through it. ---
FENCE = art.palette(2, {'wire': ramp('a0a8c0', 3), 'post': ramp('606878', 3)})
fence = Img(256, 160)
f = texture('fence', 16, 16, FENCE.wire, size=8)
for y in range(70, 150):
    for x in range(256):
        v = f.px[y % 16][x % 16]
        if v: fence.px[y][x] = v
for x in range(0, 256, 64):                              # posts, shaded like pipes, and the top rail
    post = shaded(Img(4, 84).rect(0, 0, 4, 84, 1), FENCE.post, kind='cylinder-y')
    fence.blit(post, x + 30, 66)
rail = shaded(Img(256, 4).rect(0, 0, 256, 4, 1), FENCE.post, kind='cylinder-x')
fence.blit(rail, 0, 66)
art.scene('fence', fence, pal=FENCE, at=(32, 0), region='bg')

# --- BG0: the pavement, slabs in perspective, and the kerb at the back. ---
FLOOR = art.palette(3, {'slab': ramp('8a8090', 4), 'kerb': ramp('b0a8b8', 3)})
ground = Img(256, 224)
floor(ground, texture('paving', 48, 24, FLOOR.slab, bw=24, bh=12), horizon=140, y1=224, scale=3.0)
for y in range(150, 156):
    for x in range(256): ground.px[y][x] = FLOOR.kerb[2] if y == 150 else FLOOR.kerb[1] if y < 153 else FLOOR.kerb[0]
for y in range(141, 150):
    for x in range(256): ground.px[y][x] = 0
art.scene('ground', ground, pal=FLOOR, at=(64, 0), region='bg')

# --- The brawler: one sprite palette, drawn on the rig's skeleton (figure.py), posed and animated. One outline colour
# for all of him, as Streets of Rage does, leaves 14 for his materials; his shoes are his hair's brown. ---
BR = art.sprite_palette(0, {'line': '180c14', 'skin': ramp('e0a070', 4, at=2, step=0.09), 'hair': ramp('c89038', 3, at=1, step=0.11),
                            'shirt': ramp('e0e0ec', 4, at=2, step=0.11), 'pants': ramp('3858b0', 3, at=1, step=0.11)})
hero = Figure('brawler', height=64, line=BR.line, skin=BR.skin, hair=BR.hair, shirt=BR.shirt, pants=BR.pants, shoes=BR.hair,
              face='angry', hair_style='swept', top='tee')
IDLE = [GUARD, pose(GUARD, y=1, arm_n=27, arm_f=42)]
for name, keys, n, loop in (('idle', IDLE, 2, True), ('walk', WALK, 8, True), ('punch', PUNCH, 4, False), ('kick', KICK, 4, False)):
    art.animation(name, [hero.render(p) for p in hero.animate(keys, n, loop=loop)], pal=BR, region='spr')

SHADOW = art.sprite_palette(4, {'shade': '302830'})
art.big_sprite('shadow', ellipse(40, 8, SHADOW.shade), pal=SHADOW, region='spr')

art.write(sys.argv[1])
