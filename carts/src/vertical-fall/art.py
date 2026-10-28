# Vertical Fall's art: carts/src/vertical-fall/tiles.txt, palette.txt, map.txt and art.json, and the ART block in code.js.
#   python3 carts/src/vertical-fall/art.py carts/src/vertical-fall
# Written with the art toolkit (tools/devkit/art/kit.py: its header explains the pieces). This cart owns those files:
# change the pictures here, not in them. Then look at the result with
#   node tools/devkit/art/sprites.mjs carts/vertical-fall.nova out.png      the sprites, at their real sizes and palettes
#   node tools/devkit/art/scene.mjs carts/vertical-fall.nova out.png --scene wall --holes     a background, with gaps marked
#   node tools/devkit/tiles.mjs carts/vertical-fall.nova out.png --from 0 --count 64 --pal 1   the tiles, with their numbers
# (pack first: node tools/pack.js carts/src/vertical-fall carts/vertical-fall.nova). Pixel values are palette indices; 0 is transparent.
#
# Step 1's art: enough to play the slice (the full art pass is step 6). The well is a grid of 16 px cells; each kind of
# cell is a small scene in a catalogue at the right of Map RAM (CELLS_X), and code.js copies its four map entries into
# the strip it streams. The stone is one seamless 32 x 32 texture cut into four cells, chosen by the cell's column and
# row, so a wall of stone has no grid.
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../../tools/devkit/art'))
from kit import *

art = Art()
art.region('bg', 1, 255)       # background tiles
art.region('spr', 256, 1023)   # sprites (a 16 px sprite takes four tiles)

CELLS_X = 200                  # the cell catalogue: Map RAM columns 200 and up, row 0 (code.js reads it with mget)
WALL_AT = (32, 0)              # the back wall's repeating 64 x 64 picture

# The well is dark: a backdrop going from a dim blue-violet at the top of the screen to near black, cold grey-blue stone
# with a lit top, and a back wall pushed into the dark. Red is kept for danger and gems (from step 2).
art.gradient('shaft', ['1e2238', '0e1020', '06060c'], y0=0, y1=223)
art.color(200, '0c0e1c', 'GLASS')                                           # the panels' fill, seen through
rock = art.palette(1, {'stone': ramp('5a6a8a', 5), 'moss': ramp('3c5a4a', 2)})
back = art.palette(2, {'brick': ['0c0e18', '141826', '1c2232', '262c3e']})   # dark, so the stone in front reads
hero = art.sprite_palette(0, {'edge': '0a0a12', 'body': ramp('c8d0e0', 3), 'boot': ramp('b02838', 3), 'eye': '0a0a12'})
shot = art.sprite_palette(1, {'core': 'ffffff', 'glow': ramp('f0d890', 3)})

# --- The cells (BG0) ---
stone = texture('stone', 32, 32, rock.stone, size=11)
for i, (cx, cy) in enumerate(((0, 0), (16, 0), (0, 16), (16, 16))):
    art.scene('stone%d' % i, stone.crop(cx, cy, 16, 16), pal=rock, at=(CELLS_X + i * 2, 0), solid=True)

# A ledge: a slab of stone 5 px thick across the top of its cell, lit on top, the rest of the cell open.
ledge = Img(16, 16)
for x in range(16):
    for y, k in ((0, 4), (1, 3), (2, 2), (3, 1), (4, 0)):
        ledge.px[y][x] = rock.stone[k if (x + y) % 7 else max(0, k - 1)]
art.scene('ledge', ledge, pal=rock, at=(CELLS_X + 8, 0))

# --- The back wall (BG1): dark masonry, receded, repeating ---
art.scene('wall', texture('brick', 64, 64, back.brick, bw=16, bh=8), pal=back, at=WALL_AT, solid=True)

# --- The faller: 16 x 16, a pale figure with red gunboots. o edge, 1 2 3 the body's ramp, r R the boots, e the eye ---
KEY = {'o': hero.edge, '1': hero.body[0], '2': hero.body[1], '3': hero.body[2], 'r': hero.boot[0], 'R': hero.boot[2], 'e': hero.eye}
def man(rows): return Img.from_rows(rows, key=KEY)
art.sprite('stand', man([
    '................',
    '......oooo......',
    '.....o3333o.....',
    '.....o33e3o.....',
    '.....o2332o.....',
    '......o22o......',
    '.....o3332o.....',
    '....o333322o....',
    '....o2o332o2o...',
    '....oo.o22o.o...',
    '.......o22o.....',
    '......o2oo2o....',
    '......o2oo2o....',
    '.....oRroRro....',
    '.....orrorro....',
    '......oo.oo.....',
]), pal=hero, region='spr')
art.sprite('run', man([
    '................',
    '......oooo......',
    '.....o3333o.....',
    '.....o33e3o.....',
    '.....o2332o.....',
    '......o22o......',
    '.....o3332o.....',
    '....o333322oo...',
    '...o2o3322o2o...',
    '...oo.o222oo....',
    '.......o22o.....',
    '.....oo2oo2o....',
    '....o22o..o2o...',
    '...oRro....oRro.',
    '...orro....orro.',
    '....oo......oo..',
]), pal=hero, region='spr')
art.sprite('air', man([
    '......oooo......',
    '.....o3333o.....',
    '.....o33e3o.....',
    '.....o2332o.....',
    '...oo.o22o.oo...',
    '..o3oo3332oo2o..',
    '..oo.o333322oo..',
    '.....o33322o....',
    '......o222o.....',
    '......o2o2o.....',
    '.....o2o.o2o....',
    '.....o2o.o2o....',
    '....oRro.oRro...',
    '....orro.orro...',
    '.....oo...oo....',
    '................',
]), pal=hero, region='spr')

# --- A gunboot bullet (8 x 8) and the muzzle flash under the boots ---
art.sprite('bullet', Img.from_rows([
    '...gg...',
    '..gccg..',
    '..gccg..',
    '..gccg..',
    '..gccg..',
    '...gg...',
    '........',
    '........',
], key={'c': shot.core, 'g': shot.glow[1]}), pal=shot, region='spr')
art.sprite('flash', Img.from_rows([
    '..g..g..',
    '.gcggcg.',
    'gcccccg.',
    '.gcccg..',
    '..gcg...',
    '...g....',
    '........',
    '........',
], key={'c': shot.core, 'g': shot.glow[2]}), pal=shot, region='spr')

art.write(sys.argv[1])
