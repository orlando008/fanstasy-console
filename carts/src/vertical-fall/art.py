# Vertical Fall's art: carts/src/vertical-fall/tiles.txt, palette.txt, map.txt and art.json, and the ART block in code.js.
#   python3 carts/src/vertical-fall/art.py carts/src/vertical-fall
# Written with the art toolkit (tools/devkit/art/kit.py: its header explains the pieces). This cart owns those files:
# change the pictures here, not in them. Then look at the result with
#   node tools/devkit/art/sprites.mjs carts/vertical-fall.nova out.png      the sprites, at their real sizes and palettes
#   node tools/devkit/art/scene.mjs carts/vertical-fall.nova out.png --scene field --holes     the background, with gaps marked
#   node tools/devkit/tiles.mjs carts/vertical-fall.nova out.png --from 0 --count 64 --pal 1   the tiles, with their numbers
# (pack first: node tools/pack.js carts/src/vertical-fall carts/vertical-fall.nova). Pixel values are palette indices; 0 is transparent.
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
ship = art.sprite_palette(0, {'edge': '140c1c', 'hull': ramp('597dce', 4), 'white': 'deeed6', 'fire': ramp('d04648', 2),
                              'gold': ramp('dad45e', 3)})

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

# --- The player: a little ship, 16 x 16, drawn from rows of text (o edge, d b l the hull's ramp dark to light,
# w white, r fire) ---
player = Img.from_rows([
    '.......oo.......',
    '......olbo......',
    '......olbo......',
    '.....olbbdo.....',
    '.....olwwdo.....',
    '....olbwwbdo....',
    '...olbbbbbbdo...',
    '..olbbbbbbbbdo..',
    '.olbbobbbbobbdo.',
    'olbbo.obbo.obbdo',
    'olbo..obdo..obdo',
    'obo...orro...odo',
    'oo....orro....oo',
    '.......orro.....',
    '........oo......',
    '................',
], key={'o': ship.edge, 'd': ship.hull[0], 'b': ship.hull[2], 'l': ship.hull[3], 'w': ship.white, 'r': ship.fire[1]})
art.sprite('player', player, pal=ship, region='spr')

# --- A gem to dodge: a faceted diamond, 16 x 16, outlined, shaded along the gold ramp ---
def gem(x, y):
    d = abs(x - 7.5) + abs(y - 7.5)
    if d > 7: return 0
    if d > 6: return ship.edge
    if x < 8 and y < 8 and d < 4.5: return ship.white
    return ship.gold[0] if x + y > 18 else ship.gold[1] if x + y > 12 else ship.gold[2]   # lit from the upper left
art.sprite('gem', Img.make(16, 16, gem), pal=ship, region='spr')

art.write(sys.argv[1])
