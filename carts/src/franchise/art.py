# The Franchise: Basketball Edition's art: tiles.txt, palette.txt, map.txt and art.json, and the ART block in code.js.
#   python3 carts/src/franchise/art.py carts/src/franchise
# Step 1 is menus and tables on a dark backdrop; the court, the portraits and the emblems come with the art pass (docs/carts/franchise.md, section 12).
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../../tools/devkit/art'))
from kit import *

art = Art()
art.region('bg', 1, 255)       # background tiles
art.region('spr', 256, 1023)   # sprites
art.backdrop('0a1020')
art.color(200, '141c3c', 'GLASS')                                          # the panels' fill, seen through (blend() in code.js)
art.write(sys.argv[1])
