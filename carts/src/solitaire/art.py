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

# The table: a flat green felt for now (the backdrop); the art proof (step 2) draws the real one.
art.backdrop('1e5a32')
art.color(200, '0c2a18', 'GLASS')     # the panels' fill, seen through (code.js blends the overlay)
art.color(113, 'd8b048', 'OUTLINE')   # the empty piles' outlines and the hint (solid: under 192)
art.color(114, '164a2a', 'FELTDARK')  # the empty piles' insides

# The cards (the card kit, playbook section 2 "Card games"): the large 32 x 48 deck in one shared palette (red and
# black inks together), so a column of overlapping cards can be composed into one buffer and drawn as a few sprites:
# nine buffers of 32 x 160 (the seven columns, the run in the hand, and one spare), and eight slots for single cards
# (the stock, the waste's three, the four foundations).
deck = art.cards(sizes=('large',), slots={'large': 8}, pals=(4,), stacks=(9, 152), use=('sort', 'anim'), region='spr')

# The hand: the icon library's cursor, in its own palette.
items = items_palette(art, 1)
art.sprite('hand', icon('cursor', 16, items), pal=items, region='spr')

art.write(sys.argv[1])
