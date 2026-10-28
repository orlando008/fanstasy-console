# The Ivory Tower's art: carts/src/ivory-tower/tiles.txt, palette.txt, map.txt and art.json, and the ART block in code.js.
#   python3 carts/src/ivory-tower/art.py carts/src/ivory-tower
# Written with the art toolkit (tools/devkit/art/kit.py: its header explains the pieces). This cart owns those files:
# change the pictures here, not in them. Then look at the result with
#   node tools/devkit/art/sprites.mjs carts/ivory-tower.nova out.png      the sprites, at their real sizes and palettes
#   node tools/devkit/art/scene.mjs carts/ivory-tower.nova out.png --scene field --holes     the background, with gaps marked
#   node tools/devkit/tiles.mjs carts/ivory-tower.nova out.png --from 0 --count 64 --pal 1   the tiles, with their numbers
# (pack first: node tools/pack.js carts/src/ivory-tower carts/ivory-tower.nova). Pixel values are palette indices; 0 is transparent.
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../../tools/devkit/art'))
from kit import *

art = Art()
art.region('bg', 1, 255)       # background tiles
art.region('spr', 256, 1023)   # sprites (a 16 px sprite takes four tiles)

# The SNES look from the start (docs/dev/snes-picture.md): a sky set line by line, and see-through panels (GLASS, an overlay
# colour from 192 up, which blend() makes translucent; code.js turns it on). BG palette 0 is shared with the overlay's text
# colours, so it is left alone.
art.gradient('sky', ['1c2a6a', '3c64b4', '9cd0ec'], y0=0, y1=223)          # the backdrop, a colour for each line
art.color(200, '141c3c', 'GLASS')                                          # the panels' fill, seen through
# The slabs, the slices and the sparkles are drawn on the overlay in code.js (the marbles' colours are set there, CGRAM 144 to 183, and
# 208 for the ring); there are no tiles yet: the clouds, stars and landmarks of step 3 will be.

art.write(sys.argv[1])
