# {{TITLE}}'s art: carts/src/{{NAME}}/tiles.txt, palette.txt, map.txt and art.json, and the ART block in code.js.
#   python3 carts/src/{{NAME}}/art.py carts/src/{{NAME}}
# Written with the art toolkit (tools/devkit/art/kit.py: its header explains the pieces). This cart owns those files:
# change the pictures here, not in them. Then look at the result with
#   node tools/devkit/art/sprites.mjs carts/{{NAME}}.nova out.png      the sprites, at their real sizes and palettes
#   node tools/devkit/art/scene.mjs carts/{{NAME}}.nova out.png --scene field --holes     the background, with gaps marked
#   node tools/devkit/tiles.mjs carts/{{NAME}}.nova out.png --from 0 --count 64 --pal 1   the tiles, with their numbers
# (pack first: node tools/pack.js carts/src/{{NAME}} carts/{{NAME}}.nova). Pixel values are palette indices; 0 is transparent.
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../../tools/devkit/art'))
from kit import *

art = Art()
art.region('bg', 1, 255)       # background tiles
art.region('spr', 256, 1023)   # sprites (a 16 px sprite takes four tiles)

# BG palette 1 for the field (BG palette 0 is shared with the overlay's text colours, so it is left alone);
# sprite palette 0 (spr's `pal: 0`) for the player and the gems.
field = art.palette(1, {'dark': '2c5a1e', 'mid': '346524', 'light': '4a8a2e', 'bloom': 'dad45e'})
ship = art.sprite_palette(0, {'edge': '140c1c', 'hull': '597dce', 'shine': '6dc2ca', 'white': 'deeed6', 'fire': 'd04648', 'gold': 'dad45e', 'amber': 'd27d2c'})

# --- The field: a 32 x 28 tile picture of grass, three kinds of tile and flowers now and then ---
def grass(v):
    def px(x, y):
        h = hsh(x * 31 + y * 17 + v * 101) % 19
        if v == 2 and (x, y) in ((2, 2), (5, 5), (2, 5), (5, 2)): return field.bloom if (x, y) == (2, 2) else field.light
        return field.light if h == 0 else field.dark if h < 3 else field.mid
    return Img.make(8, 8, px)
picture = Img(256, 224)
for cy in range(28):
    for cx in range(32):
        k = hsh(cx * 13 + cy * 7) % 12
        picture.blit(grass(0 if k < 5 else 1 if k < 10 else 2), cx * 8, cy * 8)
art.scene('field', picture, pal=field, at=(0, 0), solid=True)

# --- The player: a little ship, 16 x 16, drawn from rows of text (o edge, b hull, l shine, w white, r fire) ---
player = Img.from_rows([
    '.......oo.......',
    '......obbo......',
    '......oblo......',
    '.....obblbo.....',
    '.....obwwbo.....',
    '....obbwwbbo....',
    '...obbbbbbbbo...',
    '..obbbbbbbbbbo..',
    '.obbbobbbbobbbo.',
    'obbbo.obbo.obbbo',
    'obbo..obbo..obbo',
    'obo...orro...obo',
    'oo....orro....oo',
    '.......orro.....',
    '........oo......',
    '................',
], key={'o': ship.edge, 'b': ship.hull, 'l': ship.shine, 'w': ship.white, 'r': ship.fire})
art.sprite('player', player, pal=ship, region='spr')

# --- A gem to dodge: a faceted diamond, 16 x 16, outlined ---
def gem(x, y):
    d = abs(x - 7.5) + abs(y - 7.5)
    if d > 7: return 0
    if d > 6: return ship.edge
    if x < 8 and y < 8 and d < 4.5: return ship.white
    return ship.amber if x + y > 16 else ship.gold   # the lower right in shadow
art.sprite('gem', Img.make(16, 16, gem), pal=ship, region='spr')

art.write(sys.argv[1])
