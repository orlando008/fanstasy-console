# Showcase's art: tiles.txt, palette.txt, map.txt, art.json and the ART block of code.js.
#   python3 carts/src/showcase/art.py carts/src/showcase
# Made only with the art kit's SNES tools (tools/devkit/art/kit.py; docs/dev/snes-picture.md, part B), as a worked
# example of each. Two pages:
#   RINGSIDE  our hero seen from behind in the foreground and his opponent, both sculpted from 3D shapes (Sculpt) as big
#             sprites (the opponent in two sprite palettes), a crowd pushed back with
#             recede(), ropes (rope()), corner posts, a canvas with an emblem, HUD lettering (big_text, hud_bar) and a
#             contact shadow (ellipse) for subtractive blending
#   VALLEY    a sky gradient line by line (Art.gradient), clouds, snowy mountains, hills, a tree line and grass
#             (scenery.py, texture.py), on three layers that scroll at different speeds
import os, sys, math
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../../tools/devkit/art'))
from kit import *

art = Art()
art.region('bg', 1, 639)
art.region('spr', 640, 1023)
art.backdrop('101020')

# The overlay's own colours (text on both pages).
art.color(113, 'f8f8f0', 'WHITE'); art.color(114, 'ffd040', 'GOLD'); art.color(115, '181020', 'INK')

# ============================================================ RINGSIDE ====================================================
# --- The crowd (BG2): rows of fans, sculpted heads and shoulders, receded so the boxer stands out. 64 px repeats. ---
CROWD = art.palette(1, {'back': ['100c18', '1c1628'], 'skin': recede(ramp('d89870', 3), 0.7, '302840'),
                        'shirt_r': recede(ramp('c03040', 2), 0.7, '302840'), 'shirt_b': recede(ramp('3058c0', 2), 0.7, '302840'),
                        'shirt_g': recede(ramp('40a050', 2), 0.7, '302840'), 'shirt_y': recede(ramp('d0b040', 2), 0.7, '302840'),
                        'hair': recede('402820', 0.3), 'flash': '2a2236'})
SHIRTS = [CROWD.shirt_r, CROWD.shirt_b, CROWD.shirt_g, CROWD.shirt_y]
crowd = Img(256, 112)
for y in range(112):
    for x in range(256): crowd.px[y][x] = CROWD.back[1] if (y // 4) % 2 else CROWD.back[0]
for row in range(6):                                   # back rows first; each row a 64 px strip sculpted once
    y0 = 4 + row * 18
    strip = Sculpt(64, 22)
    for k in range(5):
        cx = 6 + k * 13 + (row % 2) * 6
        sh = SHIRTS[(k * 3 + row) % 4]
        strip.ellipsoid(cx, 17, 0, 6, 5, 4, Mat(sh, outline=False))
        strip.sphere(cx, 8, 4, 3.6, Mat(CROWD.skin, outline=False))
    s = strip.render(outline=None, dither=0.1, shadows=False)
    for k in range(5):                                 # hair caps and a few raised arms
        cx = 6 + k * 13 + (row % 2) * 6
        for dx in (-2, -1, 0, 1, 2): s.pset((cx + dx) % 64, 4 + (abs(dx) == 2), CROWD.hair)
        if (k + row) % 4 == 1:
            for j in range(5): s.pset(cx + 6, 12 - j, CROWD.skin[1])
    s.pset(20, 9, CROWD.flash); s.pset(52, 11, CROWD.flash)   # cameras: code.js flashes this colour
    for x in range(256):
        for j in range(22):
            v = s.px[j][x % 64]
            if v and 0 <= y0 + j < 112: crowd.px[y0 + j][x] = v
art.scene('crowd', crowd, pal=CROWD, at=(0, 0), solid=True, region='bg')

# --- The ropes and the corner posts (BG1): over the crowd, under the boxer. ---
RING = art.palette(2, {'red': ramp('d03040', 3), 'white': ramp('e8e8f0', 3), 'blue': ramp('3050c8', 3), 'post': ramp('a0a8b8', 3)})
ring = Img(256, 160)
for rp, y in ((RING.red, 70), (RING.white, 90), (RING.blue, 110)):
    rope(ring, [(0, y), (256, y)], 5, rp)
for px in (10, 238):                                   # corner posts: shaded like pillars, with pads at each rope
    post = shaded(Img(8, 80).rect(0, 0, 8, 80, 1), RING.post, kind='cylinder-y')
    ring.blit(post, px, 56)
    for y in (68, 88, 108):
        pad = shaded(Img(12, 8).rect(0, 0, 12, 8, 1), RING.red, kind='pillow')
        ring.blit(inline(pad, RING), px - 2, y)
art.scene('ring', ring, pal=RING, at=(32, 0), region='bg')

# --- The canvas (BG0): from under the bottom rope to the bottom of the screen, light blue, darker away from the
# viewer, with the championship's emblem seen in perspective. ---
CANVAS = art.palette(3, {'canvas': ramp('88b8e0', 4, at=3), 'red': ramp('c83038', 3), 'gold': ramp('f0c040', 3), 'ink': '182040'})
canvas = Img(256, 104)
for y in range(104):
    for x in range(256): canvas.px[y][x] = level(CANVAS.canvas, 0.2 + 0.75 * y / 103, x, y, 0.5)
EY = 66
for y in range(104):                                   # the emblem: rings squashed by the perspective
    for x in range(40, 216):
        dx, dy = (x + 0.5 - 128) / 86, (y + 0.5 - EY) / 30
        d = math.hypot(dx, dy)
        if d < 0.35: canvas.px[y][x] = CANVAS.gold[2] if dy < 0 else CANVAS.gold[1]
        elif d < 0.5: canvas.px[y][x] = CANVAS.red[1]
        elif d < 0.8: canvas.px[y][x] = CANVAS.red[2] if dy < -0.1 else CANVAS.red[1]
        elif d < 0.87: canvas.px[y][x] = CANVAS.gold[2]
        elif d < 0.93: canvas.px[y][x] = CANVAS.ink
star = [(128 + 13 * math.cos(math.radians(a - 90)) * (1 if k % 2 == 0 else 0.45), EY + 6 * math.sin(math.radians(a - 90)) * (1 if k % 2 == 0 else 0.45)) for k, a in enumerate(range(0, 360, 36))]
canvas.poly(star, CANVAS.red[2])
art.scene('canvas', canvas, pal=CANVAS, at=(64, 15), solid=True, region='bg')

# --- The boxer: sculpted, in two sprite palettes (skin and hair; trunks, gloves and boots). ---
BX0 = art.sprite_palette(0, {'skin': ramp('e8a878', 6), 'hair': ramp('5a3020', 3), 'white': 'f8f8f0', 'ink': '200810', 'mouth': '901830'})
BX1 = art.sprite_palette(1, {'trunks': ramp('d02838', 5, at=3), 'glove': ramp('2850d0', 4, at=2), 'band': ramp('f0d040', 3), 'boot': ramp('403848', 3)})


def boxer(bob):
    """The boxer, facing us with his guard up; bob moves the body and gloves down by that many pixels (breathing)."""
    sk = BX0.skin
    s = Sculpt(72, 112)
    b = bob
    s.ellipsoid(36, 44 + b, 0, 17, 15, 11, sk)                                             # chest
    s.ellipsoid(29, 41 + b, 7, 8, 6, 5, sk, smooth=3); s.ellipsoid(43, 41 + b, 7, 8, 6, 5, sk, smooth=3)   # pecs
    s.ellipsoid(36, 58 + b, 3, 12, 9, 8, sk, smooth=4)                                      # belly
    for yy in (53, 59):
        s.ellipsoid(32, yy + b, 8, 3.5, 2.6, 2.2, sk, smooth=1.5); s.ellipsoid(40, yy + b, 8, 3.5, 2.6, 2.2, sk, smooth=1.5)
    s.capsule((36, 26 + b, 0), (36, 32 + b, 1), 6, 7, sk, smooth=3)                          # neck
    s.ellipsoid(25, 31 + b, -2, 8, 4, 5, sk, smooth=3); s.ellipsoid(47, 31 + b, -2, 8, 4, 5, sk, smooth=3)   # traps
    s.ellipsoid(36, 16 + b, 3, 9, 11, 9, sk); s.ellipsoid(36, 23 + b, 6, 7, 5, 6, sk, smooth=2)              # head, jaw
    s.sphere(27, 17 + b, 0, 2.5, sk); s.sphere(45, 17 + b, 0, 2.5, sk)                       # ears
    s.relief(Img(20, 9).disc(9.5, 9, 9.5, 1), 26, 3 + b, 9, 3, BX0.hair, profile='soft')    # hair
    s.sphere(20, 35 + b, 0, 7.5, sk, smooth=3); s.sphere(52, 35 + b, 0, 7.5, sk, smooth=3)   # shoulders
    s.capsule((18, 38 + b, 0), (14, 56 + b, 4), 6.5, 5.5, sk, smooth=2); s.capsule((54, 38 + b, 0), (58, 56 + b, 4), 6.5, 5.5, sk, smooth=2)
    s.capsule((14, 56 + b, 4), (22, 40 + b, 15), 5.5, 5, sk); s.capsule((58, 56 + b, 4), (50, 40 + b, 15), 5.5, 5, sk)
    gl = Mat(BX1.glove, gloss=0.75)
    s.ellipsoid(23, 34 + b, 18, 8, 9, 8, gl); s.ellipsoid(49, 34 + b, 18, 8, 9, 8, gl)
    s.capsule((22, 41 + b, 16), (23, 46 + b, 13), 4, 4, BX1.band); s.capsule((50, 41 + b, 16), (49, 46 + b, 13), 4, 4, BX1.band)
    s.ellipsoid(36, 72, 2, 15, 9, 10, BX1.trunks)                                           # trunks and legs stay put
    s.capsule((22, 66, 6), (50, 66, 6), 3, 3, BX1.band)
    s.capsule((29, 78, 1), (27, 98, 1), 8, 6, sk); s.capsule((43, 78, 1), (45, 98, 1), 8, 6, sk)
    s.ellipsoid(27, 90, 4, 5, 6, 4, sk, smooth=2); s.ellipsoid(45, 90, 4, 5, 6, 4, sk, smooth=2)
    s.capsule((27, 99, 1), (25, 106, 3), 6.5, 6, BX1.boot); s.capsule((45, 99, 1), (47, 106, 3), 6.5, 6, BX1.boot)
    parts = s.render()
    face = parts[0]
    for x in range(30, 34): face.pset(x, 13 + b, BX0.hair[0])                                # brows
    for x in range(39, 43): face.pset(x, 13 + b, BX0.hair[0])
    for x in range(29, 44): face.pset(x, 14 + b, sk[3]) if face.get(x, 14 + b) in sk[4:] else None   # eye sockets
    for ex, px_ in ((30, 31), (40, 40)):
        face.pset(ex, 15 + b, BX0.white); face.pset(ex + 1, 15 + b, BX0.white); face.pset(px_, 15 + b, BX0.ink)
    face.pset(36, 18 + b, sk[2]); face.pset(36, 19 + b, sk[1]); face.pset(35, 19 + b, sk[2])  # nose
    for x in range(34, 39): face.pset(x, 22 + b, BX0.mouth)
    return parts


# Split at the waist into two big sprites: code.js bobs the top half by a pixel to breathe, and the legs never change,
# so the animation costs no tiles (two whole frames would cost about 300).
parts = boxer(0)
art.big_sprite('boxerTop', {p: im.crop(0, 0, 72, 64) for p, im in parts.items()}, region='spr')
art.big_sprite('boxerLegs', {p: im.crop(0, 64, 72, 48) for p, im in parts.items()}, region='spr')

# --- Our hero, seen from behind in the foreground, as in Super Punch-Out!!: a broad back, spiky hair, the guard up
# beyond him. Sprite palette 3 (palettes 4 to 7 would be subtracted with the shadow). ---
HERO = art.sprite_palette(3, {'skin': ramp('f0b080', 6), 'hair': ramp('e0b040', 4), 'glove': ramp('40b040', 3), 'trunks': ramp('2840a0', 2)})


def hero():
    sk, cx = HERO.skin, 52
    s = Sculpt(104, 104)
    s.ellipsoid(cx, 72, 0, 31, 32, 13, sk)                                 # the back, a broad V
    s.ellipsoid(cx, 96, -1, 22, 14, 10, sk, smooth=10)
    for side in (-1, 1):                                                   # muscles as low bumps blended into it
        s.ellipsoid(cx + side * 15, 58, 4, 12, 13, 9, sk, smooth=9)        # shoulder blade
        s.ellipsoid(cx + side * 23, 80, 2, 9, 17, 11, sk, smooth=9)        # lat
        s.ellipsoid(cx + side * 7, 82, 1.5, 6, 18, 11, sk, smooth=10)      # the long muscle by the spine
    s.ellipsoid(cx, 43, -3, 19, 7, 10, sk, smooth=12)                      # traps
    s.capsule((cx, 37, -2), (cx, 27, -2), 7.5, 7, sk, smooth=5)            # neck
    s.ellipsoid(cx, 19, 0, 11, 13, 10, sk)                                 # head
    s.sphere(cx - 11, 21, -2, 3, sk); s.sphere(cx + 11, 21, -2, 3, sk)     # ears
    for side, (ex, ey, gx, gy) in ((-1, (12, 66, 22, 30)), (1, (94, 70, 85, 46))):
        s.sphere(cx + side * 29, 48, 2, 10, sk, smooth=7)                  # shoulder
        s.capsule((cx + side * 31, 50, 1), (ex, ey, -6), 9, 8, sk, smooth=4)   # upper arm
        s.capsule((ex, ey, -6), (gx, gy + 6, -14), 8, 7, sk, smooth=2)     # forearm, reaching away from us
        s.ellipsoid(gx, gy, -16, 11, 12, 9, Mat(HERO.glove, gloss=0.6))    # glove, beyond him
    hair = Img(32, 24)
    for k in range(6):                                                     # spikes round the crown
        a = -75 + k * 30
        base = lambda d: (16 + 9 * math.sin(math.radians(a + d)), 15 - 9 * math.cos(math.radians(a + d)))
        hair.poly([base(-22), (16 + 16 * math.sin(math.radians(a)), 15 - 16 * math.cos(math.radians(a))), base(22)], 1)
    hair.disc(15.5, 15, 10.5, 1)
    s.relief(hair, cx - 16, 1, 6, 5, Mat(HERO.hair), profile='soft')
    s.ellipsoid(cx, 104, 2, 24, 7, 8, HERO.trunks)                         # the waistband, at the bottom of the screen
    img = s.render(light=(-1, -1.1, 0.6), contours=6)                      # contours only where parts truly overlap
    for y in range(46, 100):                                               # the spine: a groove, lit on its left
        c = img.get(cx, y)
        if c in sk:
            img.pset(cx, y, sk[max(1, sk.index(c) - 2)])
            if img.get(cx - 1, y) in sk: img.pset(cx - 1, y, sk[min(5, sk.index(c) + 1)])
    return img


art.big_sprite('hero', hero(), pal=HERO, region='spr')

# --- His shadow on the canvas: sprite palette 4, subtracted from what is under it (blend op 'sub'). ---
SHADOW = art.sprite_palette(4, {'shade': '383020'})
art.big_sprite('shadow', ellipse(64, 12, SHADOW.shade), pal=SHADOW, region='spr')

# --- The HUD: the round in big lettering, two life bars. ---
HUD = art.sprite_palette(2, {'gold': ramp('ffd030', 5), 'ink': '200818', 'shadow': '000000', 'life': ramp('f0c020', 4), 'empty': '402030'})
art.big_sprite('round', big_text('ROUND 1', HUD.gold, scale=2, outline=HUD.ink, shadow=HUD.shadow), pal=HUD, region='spr')
art.big_sprite('bar', hud_bar(96, 10, HUD.life, fill=1.0, frame=HUD.ink, empty=HUD.empty), pal=HUD, region='spr')

# ============================================================ VALLEY ======================================================
# --- The sky: no tiles at all, a colour for every line of the backdrop. ---
art.gradient('sky', ['1c3c98', '3c6ed0', '78a8f0', 'c8e0f8'], y0=0, y1=150)

# --- BG2: clouds and the mountains (they repeat every 128 px, to save tiles). ---
FAR = art.palette(4, {'cloud': ramp('e8eef8', 4), 'rock': recede(ramp('7a6a8a', 4), 0.35, 'a0c0f0'), 'snow': ramp('eef2fa', 3), 'sun': ['ffb050', 'ffe080', 'fff8d0']})
far = Img(256, 160)
clouds(far, FAR.cloud, count=4, y0=8, y1=70, seed=2)
mt = Img(128, 160)
mountains(mt, FAR.rock, base=159, height=72, snow=FAR.snow, seed=1)
for x in range(256):
    for y in range(160):
        if mt.px[y][x % 128] and not far.px[y][x]: far.px[y][x] = mt.px[y][x % 128]
art.scene('far', far, pal=FAR, at=(96, 0), region='bg')

# --- BG1: hills and the tree line (repeating every 128 px). ---
MID = art.palette(5, {'hill': ramp('5aa040', 5), 'leaf': ramp('2e7a3a', 5)})
mid = Img(128, 224)
crest = hills(mid, MID.hill, base=168, amp=14, period=128, seed=1)
treeline(mid, MID.leaf, base=190, size=10, seed=3)
mid2 = Img(256, 224)
mid2.blit(mid, 0, 0); mid2.blit(mid, 128, 0)
art.scene('mid', mid2, pal=MID, at=(128, 0), region='bg')

# --- BG0: the grass in front, a seamless 32 px texture. ---
NEAR = art.palette(6, {'grass': ramp('4a8a2e', 5)})
near = Img(256, 224)
g = texture('grass', 32, 32, NEAR.grass, seed=4)
for y in range(200, 224):
    for x in range(256): near.px[y][x] = g.px[y % 32][x % 32]
for x in range(256):                                    # a lit edge where the grass starts
    near.px[200][x] = NEAR.grass[4] if x % 3 else NEAR.grass[3]
art.scene('near', near, pal=NEAR, at=(160, 0), region='bg')

art.write(sys.argv[1])
