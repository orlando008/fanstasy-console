# Solitaire's art: carts/src/solitaire/tiles.txt, palette.txt, map.txt and art.json, and the ART block in code.js.
#   python3 carts/src/solitaire/art.py carts/src/solitaire
# Written with the art toolkit (tools/devkit/art/kit.py: its header explains the pieces; docs/dev/art-recipes.md shows what
# each part of it draws, with the lines that drew it: start a new picture from the nearest recipe). This cart owns those files:
# change the pictures here, not in them. Then look at the result with
#   node tools/devkit/art/sprites.mjs carts/solitaire.nova out.png      the sprites, at their real sizes and palettes
#   node tools/devkit/art/scene.mjs carts/solitaire.nova out.png --scene field --holes     the background, with gaps marked
#   node tools/devkit/tiles.mjs carts/solitaire.nova out.png --from 0 --count 64 --pal 1   the tiles, with their numbers
# (pack first: node tools/pack.js carts/src/solitaire carts/solitaire.nova). Pixel values are palette indices; 0 is transparent.
# Hearts, coins, stars, keys, a cursor...: ready-made in the icon library (icon(), items_palette(); all of them on
# docs/dev/art-recipes/icons-library.png): art.sprite('heart', icon('heart', 16, items), pal=items).
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../../tools/devkit/art'))
from kit import *

art = Art()
art.region('bg', 1, 63)        # the felt and the rim (the art proof, step 2)
art.region('spr', 64, 1023)    # the cards' buffers and slots, the hand

# The table (spec 12): a green baize with a fine diagonal twill, darker towards the corners (in three steps, a tile at a
# time, so the 16 px pattern shares tiles), inside a carved wooden rim 4 px wide. Every pattern repeats on the tile grid
# (the twill every 16 px, the wood's grain every 32), so the whole screen costs a few dozen of the 63 BG tiles.
felt = art.palette(1, {'felt': ['0c2e1c', '134226', '1a5630', '206638', '287642'], 'wood': ramp('8a5a30', 4), 'line': '1a1008'})
F, W = felt.felt, felt.wood

def vignette(tx, ty):
    """How much darker the felt is in tile (tx, ty): 0 in the middle, 2 in the corners."""
    u, v = (tx + 0.5) / 32 * 2 - 1, (ty + 0.5) / 28 * 2 - 1
    d = (u * u * 0.8 + v * v) ** 0.5
    return 0 if d < 0.8 else 1 if d < 1.05 else 2

def table(x, y):
    if x < 4 or x > 251 or y < 4 or y > 219:                       # the rim: grain along it, a bevel, a dark inner line
        if x == 3 or x == 252 or y == 3 or y == 220: return felt.line
        along = x if (y < 4 or y > 219) else y
        across = min(x, 255 - x, y, 223 - y)
        g = (hsh((along % 32) // 3 * 7 + across * 3) % 3 == 0) or ((along + across * 5) % 32 in (5, 6, 19))
        base = 3 if across == 0 else 2 if across == 1 else 1
        return W[max(0, base - 1)] if g else W[base]
    lv = vignette(x // 8, y // 8)
    px, py = x % 16, y % 16
    shade = 3 if lv < 2 else 2                                      # the corners a shade darker...
    if (px + py) % (2 if lv == 1 else 4) == 0: shade -= 1           # ...and between, the twill's dark threads twice as dense
    elif hsh(px * 31 + py * 17) % 11 == 0: shade += 1               # a fleck of lighter wool
    if x < 8 or x > 247 or y < 8 or y > 215: shade -= 1             # the shadow the rim casts
    return F[max(0, min(4, shade))]

art.scene('table', Img.make(256, 224, table), pal=felt, at=(0, 0), solid=True, region='bg')
art.color(240, '081c10', 'GLASS')     # the panels' fill, seen through (code.js blends the overlay); 192 to 207 are the cards' palette
art.color(113, 'd8b048', 'OUTLINE')   # the empty piles' outlines and the hint (solid: under 192)
art.colors['FELTDARK'] = felt.cgram('felt1')   # the inside of an empty pile: the felt's dark shade

# The cards (the card kit, playbook section 2 "Card games"): the large 32 x 48 deck in one shared palette (red and
# black inks together), so a column of overlapping cards can be composed into one buffer and drawn as a few sprites:
# nine buffers of 32 x 160 (the seven columns, the run in the hand, and one spare), and eight slots for single cards
# (the stock, the waste's three, the four foundations).
deck = art.cards(sizes=('large',), slots={'large': 8}, pals=(4,), stacks=(9, 152), use=('sort', 'anim'), region='spr')

# The hand: the icon library's cursor, in its own palette.
items = items_palette(art, 1)
art.sprite('hand', icon('cursor', 16, items), pal=items, region='spr')

art.write(sys.argv[1])
