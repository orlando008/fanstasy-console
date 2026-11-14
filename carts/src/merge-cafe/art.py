# Merge Café's art: carts/src/merge-cafe/tiles.txt, palette.txt, map.txt and art.json, and the ART block in code.js.
#   python3 carts/src/merge-cafe/art.py carts/src/merge-cafe
# Written with the art toolkit (tools/devkit/art/kit.py: its header explains the pieces; docs/dev/art-recipes.md shows what
# each part of it draws, with the lines that drew it: start a new picture from the nearest recipe). This cart owns those files:
# change the pictures here, not in them. Then look at the result with
#   node tools/devkit/art/sprites.mjs carts/merge-cafe.nova out.png      the sprites, at their real sizes and palettes
#   node tools/devkit/art/scene.mjs carts/merge-cafe.nova out.png --scene field --holes     the background, with gaps marked
#   node tools/devkit/tiles.mjs carts/merge-cafe.nova out.png --from 0 --count 64 --pal 1   the tiles, with their numbers
# (pack first: node tools/pack.js carts/src/merge-cafe carts/merge-cafe.nova). Pixel values are palette indices; 0 is transparent.
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../../tools/devkit/art'))
from kit import *

art = Art()
art.region('bg', 1, 255)       # background tiles
art.region('spr', 256, 1023)   # sprites (a 16 px sprite takes four tiles)

# The SNES look from the start (docs/dev/snes-picture.md): colours as ramps (shades of one colour, dark to light), a sky
# set line by line, hills pushed back behind the ground, and see-through panels (GLASS, an overlay colour from 192 up,
# which blend() makes translucent; code.js turns it on). BG palette 0 is shared with the overlay's text colours, so it
# is left alone.
art.gradient('sky', ['1c2a6a', '3c64b4', '9cd0ec'], y0=0, y1=175)          # the backdrop, a colour for each line
art.color(200, '141c3c', 'GLASS')                                          # the panels' fill, seen through
field = art.palette(1, {'grass': ramp('4a8a2e', 4), 'bloom': 'dad45e'})    # field.grass: 4 indices, dark to light
far = art.palette(2, {'hill': recede(ramp('2c6a3a', 3), 0.5, '9cd0ec')})   # far things are paler, nearer the sky
# Sprite palettes: 15 colours each, so a character is a few ramps (skin, hair, shirt, trousers), not a rainbow.
hero_pal = art.sprite_palette(0, {'skin': ramp('e8a878', 4), 'hair': ramp('5a3a22', 3), 'shirt': ramp('d04648', 4), 'pants': ramp('3050a0', 4)})
gem_pal = art.sprite_palette(1, {'gold': ramp('dad45e', 5), 'edge': '140c1c', 'white': 'fff8e0'})
logo_pal = art.palette(3, {'gold': ramp('e0a030', 5), 'edge': '1c1020', 'shade': '2a2040'})

# --- The ground (layer 0): a strip of grass, 32 x 8 tiles, lit along its top edge, flowers now and then ---
ground = Img(256, 64)
grass = texture('grass', 64, 64, field.grass)
for x in range(0, 256, 64): ground.blit(grass, x, 0)
for x in range(256):
    ground.px[0][x] = field.grass[3]; ground.px[1][x] = field.grass[2] if x % 5 else field.grass[3]
for k in range(12):
    fx_, fy_ = int(hsh(k * 7 + 1) % 250) + 3, int(hsh(k * 13 + 5) % 50) + 8
    ground.px[fy_][fx_] = field.bloom
art.scene('field', ground, pal=field, at=(0, 0), solid=True)

# --- The hills (layer 1): rolling green behind the ground, receded towards the sky ---
back = Img(256, 64)
hills(back, far.hill, base=64, amp=40, period=128)
art.scene('hills', back, pal=far, at=(32, 0))

# --- The hero: a character from the kit's skeleton (rig.py), not pixels placed by hand. One Rig gives every frame in
# the same proportions and light: a standing pose and a walk of four frames, each 32 x 32 (a hero should be big enough
# to read: 24 px or more on this screen). To change the character, change the preset ('hero', 'brawler', 'boxer' ...),
# the ramps or the poses (pose(STAND, arm_n=60)); to add an action, add its poses (JUMP, PUNCH, HIT). Look at them all
# with filmstrip('/tmp/hero.png', hero, poses, hero_pal), or in the packed cart with tools/devkit/art/sprites.mjs.
hero = Rig('hero', height=26, skin=hero_pal.skin, hair=hero_pal.hair, shirt=hero_pal.shirt, pants=hero_pal.pants, shoes=hero_pal.hair, margin=1)
for k, p in enumerate([STAND] + hero.animate(WALK, 8)[::2]):
    art.sprite('hero%d' % k, hero.render(p).fit(32, 32), pal=hero_pal, region='spr')   # fit: feet on the bottom row, centred

# --- A gem to dodge: a ball sculpted from a 3D shape (sculpt.py), lit, glossy and outlined by the kit ---
ball = Sculpt(16, 16)
ball.sphere(8, 8, 0, 6.5, Mat(gem_pal.gold, gloss=0.9))
art.sprite('gem', ball.render(), pal=gem_pal, region='spr')

# --- The title: the game's name in big bevelled letters (lettering.py), on its own layer (layer 2, shown on the title).
# Words go on a second line when the name is long; a very long word is drawn at the font's own size. ---
TITLE, lines = 'MERGE CAFE', ['']   # the console's font has no accents: the Library's title keeps the é
for word in TITLE.split():
    if lines[-1] and len(lines[-1]) + 1 + len(word) > 15: lines.append('')
    lines[-1] = (lines[-1] + ' ' + word).strip()
scale = 2 if max(len(l) for l in lines) <= 15 else 1
logo = Img(256, 8 * (3 if scale == 2 else 2) * len(lines))
for k, l in enumerate(lines):
    t = big_text(l, logo_pal.gold, scale=scale, outline=logo_pal.edge, shadow=logo_pal.shade)
    logo.blit(t, max(0, (256 - t.w) // 2), k * 8 * (3 if scale == 2 else 2) + 1)
art.scene('logo', logo, pal=logo_pal, at=(0, 16))

art.write(sys.argv[1])
