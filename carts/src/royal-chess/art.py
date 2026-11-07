# Royal Chess's art: carts/src/royal-chess/tiles.txt, palette.txt, map.txt and art.json, and the ART block in code.js.
#   python3 carts/src/royal-chess/art.py carts/src/royal-chess
# Written with the art toolkit (tools/devkit/art/kit.py: its header explains the pieces). This cart owns those files:
# change the pictures here, not in them.
#
# Step 1 of the plan (the spec's section 15): no tiles yet. The board and the pieces are drawn on the overlay in plain
# colours, named here so code.js uses them by name. The art pass (step 6) makes the palace study (spec 12).
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../../tools/devkit/art'))
from kit import *

art = Art()
art.region('bg', 1, 383)
art.region('spr', 384, 1023)

art.backdrop('3a1a24')                          # the velvet table round the board (for now, one colour)
for i, (hexc, name) in enumerate([
        ('e8d0a4', 'LIGHT'), ('a8724a', 'DARK'),         # the squares: maple and walnut
        ('f8f0e0', 'IVORY'), ('2c2028', 'EBONY'),        # the pieces
        ('6a4a30', 'FRAME'), ('f0c040', 'CURSOR'),       # the board's frame, the cursor
        ('58a050', 'MOVE'), ('d84040', 'CHECK'),         # a legal square's mark, the king in check
        ('c8b060', 'LAST'), ('141c3c', 'GLASS')]):       # the last move's tint, the panels
    art.color(113 + i, hexc, name)

art.write(sys.argv[1])
