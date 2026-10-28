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
rock = art.palette(1, {'stone': ramp('5a6a8a', 5), 'moss': ramp('3c5a4a', 2), 'blk': ramp('7a7488', 4), 'gem': ramp('d02838', 3)})
back = art.palette(2, {'brick': ['0c0e18', '141826', '1c2232', '262c3e']})   # dark, so the stone in front reads
hero = art.sprite_palette(0, {'edge': '0a0a12', 'body': ramp('c8d0e0', 3), 'boot': ramp('b02838', 3), 'eye': '0a0a12'})
shot = art.sprite_palette(1, {'core': 'ffffff', 'glow': ramp('f0d890', 3), 'smoke': ramp('9098a8', 2)})
foe = art.sprite_palette(2, {'edge': '0a0a12', 'pale': ramp('b8bccc', 4), 'eye': 'f0e070', 'red': ramp('d02838', 3)})   # pale: stomp it; red: do not touch
jewel = art.sprite_palette(3, {'edge': '2a0610', 'red': ramp('e02840', 4), 'glint': 'ffffff'})       # gems: red

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

# A breakable block: a bevelled slab, lit from the top left, with a crack; a gem block: darker, with red crystals set in it.
def block(face, cracks, gems):
    im = Img(16, 16)
    for y in range(16):
        for x in range(16):
            c = rock.blk[face]
            if x in (0, 15) or y in (0, 15): c = rock.blk[0]
            elif x == 1 or y == 1: c = rock.blk[3]
            elif x == 14 or y == 14: c = rock.blk[max(0, face - 1)]
            im.px[y][x] = c
    for x, y in cracks: im.px[y][x] = rock.blk[0]
    for gx, gy in gems:
        for dy in range(-2, 3):
            for dx in range(-2, 3):
                d = abs(dx) + abs(dy)
                if d <= 2: im.px[gy + dy][gx + dx] = rock.gem[2] if d == 0 or (dx < 0 and dy < 0) else rock.gem[1] if d == 1 else rock.gem[0]
    return im
art.scene('break', block(2, [(5, 2), (6, 3), (6, 4), (7, 5), (8, 5), (9, 6), (9, 7), (10, 8), (4, 10), (5, 11), (5, 12)], []), pal=rock, at=(CELLS_X + 10, 0), solid=True)
art.scene('gemblock', block(1, [(10, 3), (11, 4)], [(5, 5), (10, 9), (5, 11)]), pal=rock, at=(CELLS_X + 12, 0), solid=True)

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

# --- A bigger bullet for the gem high, and a puff of smoke (a kill, a broken block) ---
art.sprite('bigshot', Img.from_rows([
    '..gggg..',
    '.gccccg.',
    '.gccccg.',
    '.gccccg.',
    '.gccccg.',
    '.gccccg.',
    '..gggg..',
    '........',
], key={'c': shot.core, 'g': shot.glow[2]}), pal=shot, region='spr')
art.sprite('puff', Img.from_rows([
    '..ss.s..',
    '.sSSsSs.',
    'sSSSSSs.',
    '.sSSSSs.',
    'sSSSSs..',
    '.sSsSs..',
    '..s.s...',
    '........',
], key={'s': shot.smoke[0], 'S': shot.smoke[1]}), pal=shot, region='spr')

# --- The enemies of step 2: the bat (hanging, wings up, wings down) and the snail (on a floor, and on a wall) ---
FOE = {'o': foe.edge, '1': foe.pale[0], '2': foe.pale[1], '3': foe.pale[2], '4': foe.pale[3], 'e': foe.eye,
       'a': foe.red[0], 'b': foe.red[1], 'c': foe.red[2], 'w': foe.pale[3]}
def mon(rows): return Img.from_rows(rows, key=FOE)
art.sprite('bat0', mon([
    '.......oo.......',
    '.......oo.......',
    '......o33o......',
    '.....o3443o.....',
    '....o234432o....',
    '....o234432o....',
    '....o223322o....',
    '....o1e33e1o....',
    '.....o2332o.....',
    '.....o1221o.....',
    '......o11o......',
    '.......oo.......',
    '................',
    '................',
    '................',
    '................',
]), pal=foe, region='spr')
art.sprite('bat1', mon([
    '................',
    'oo............oo',
    'o3o..........o3o',
    'o43o...oo...o34o',
    'o443o.o33o.o344o',
    '.o443o3443o344o.',
    '.o4433e33e33442o',
    '..o22333333322o.',
    '..o1o.o2332o.o1o',
    '...o...o22o...o.',
    '........oo......',
    '................',
    '................',
    '................',
    '................',
    '................',
]), pal=foe, region='spr')
art.sprite('bat2', mon([
    '................',
    '................',
    '................',
    '.......oo.......',
    '......o33o......',
    '.....o3443o.....',
    '..ooo3e33e3ooo..',
    '.o4433333333443o',
    'o4432o2332o2344o',
    'o432o.o22o.o234o',
    'o32o...oo...o23o',
    'o2o..........o2o',
    '.o............o.',
    '................',
    '................',
    '................',
]), pal=foe, region='spr')
snail = mon([
    '................',
    '................',
    '................',
    '.....oooo.......',
    '....o3443o......',
    '...o344443o.....',
    '..o34o22o43o....',
    '..o3o2oo2o3o....',
    '..o3o2o12o3o..o.',
    '..o43o222o3o.o3o',
    '...o433333o.o43o',
    '...oo33333oo432o',
    '..o2222222222e2o',
    '.o1222222222222o',
    '.o1111111111111o',
    '..ooooooooooooo.',
])
art.sprite('snail', snail, pal=foe, region='spr')
art.sprite('snailw', snail.rot90(), pal=foe, region='spr')    # on a wall to its left, heading down (fy: up)

# --- Step 3's enemies. Red ones (the spiked snail, the jellyfish, the ghost, the turret's ball) cannot be stomped. ---
spiky = snail.crop(0, 0, 16, 16)
for x, y, k in [(4, 2, 'c'), (4, 1, 'b'), (6, 1, 'c'), (6, 0, 'b'), (8, 1, 'c'), (8, 0, 'b'), (10, 2, 'c'), (10, 1, 'b'),
                (1, 6, 'c'), (0, 6, 'b'), (1, 9, 'c'), (0, 9, 'b'), (12, 5, 'c'), (13, 5, 'b')]:
    spiky.px[y][x] = FOE[k]
for y in (4, 5): spiky.px[y][6] = spiky.px[y][7] = foe.red[1]
art.sprite('spiky', spiky, pal=foe, region='spr')
art.sprite('spikyw', spiky.rot90(), pal=foe, region='spr')
TURTLE_TOP = ['................', '................', '................', '................',
              '.....oooooo.....', '....o344443o....', '...o34o44o43o...', '..o344o44o443o..', '..o3oooooooo3ooo',
              '.o3333333333o3eo', '.o2222222222o33o', '..oooooooooooooo']
art.sprite('turtle0', mon(TURTLE_TOP + ['...o22o..o22o...', '...o11o..o11o...', '....oo....oo....', '................']), pal=foe, region='spr')
art.sprite('turtle1', mon(TURTLE_TOP + ['..o22o....o22o..', '..o11o....o11o..', '...oo......oo...', '................']), pal=foe, region='spr')
art.sprite('frog0', mon(['................'] * 5 + [
    '........oo..oo..', '.......o4eoo4eo.', '......o44444444o', '.....o333333333o', '....o3333oooooo.', '...o33333333333o',
    '..o222222222222o', '.o2222o2222o222o', '.o11oo.o11o.o11o', '..oo....oo...oo.', '................']), pal=foe, region='spr')
art.sprite('frog1', mon(['................'] * 3 + [
    '........oo..oo..', '.......o4eoo4eo.', '......o44444444o', '.....o333333333o', '....o3333oooooo.', '...o33333333333o',
    '..o222222222222o', '.o2222oooooooo..', 'o22o............', 'o1o.............', '.o..............'] + ['................'] * 2), pal=foe, region='spr')
art.sprite('blob', mon(['................'] * 2 + [
    '.....oooooo.....', '....o444443o....', '...o44444333o...', '..o4444443333o..', '..o44e44e43332o.', '..o4444444333o..',
    '..o3444443332o..', '...o33333322o...', '....oo2222oo....', '......oooo......'] + ['................'] * 4), pal=foe, region='spr')
art.sprite('blobling', mon(['..oooo..', '.o4443o.', 'o4e4e43o', 'o444433o', '.o3332o.', '..oooo..', '........', '........']), pal=foe, region='spr')
JELLY_TOP = ['................', '.....oooooo.....', '....occcccbo....', '...occwcccbbo...', '..occwccccbbao..', '..occcccccbbao..',
             '..oaobaobaobao..', '...o.o.o.o.o....']
art.sprite('jelly0', mon(JELLY_TOP + ['...b.b.b.b.b....', '..b.b.b.b.b.....', '..b.b.b.b.b.....', '...b.b.b.b.b....'] + ['................'] * 4), pal=foe, region='spr')
art.sprite('jelly1', mon(JELLY_TOP + ['...b.b.b.b.b....', '....b.b.b.b.b...', '....b.b.b.b.b...', '...b.b.b.b.b....'] + ['................'] * 4), pal=foe, region='spr')
art.sprite('turret', mon(['................'] * 3 + [
    'ooooooo.........', 'o44443oo........', 'o433333oooooooo.', 'o43ee33o4444443o', 'o43ee33o3333332o', 'o433333oooooooo.',
    'o32222oo........', 'ooooooo.........'] + ['................'] * 5), pal=foe, region='spr')
art.sprite('ball', mon(['..oooo..', '.occbbo.', 'occwcbao', 'occcbbao', '.obbbao.', '..oooo..', '........', '........']), pal=foe, region='spr')
GHOST_TOP = ['................', '.....oooooo.....', '....occcccbo....', '...occcccccbo...', '..occwwccwwcbo..', '..occoaccoacbo..',
             '..occcccccccbo..', '..occcaaaacbbo..', '..occccccccbbo..', '..obcccccbbbao..', '..oabbobbaobao..']
art.sprite('ghost0', mon(GHOST_TOP + ['..o.o..o.o..o...', '...a....a...a...'] + ['................'] * 3), pal=foe, region='spr')
art.sprite('ghost1', mon(GHOST_TOP + ['...o.o..o.o..o..', '....a....a...a..'] + ['................'] * 3), pal=foe, region='spr')

# --- Gems (8 x 8): a small one (1) and a large one (5), red, with a white glint ---
GEM = {'o': jewel.edge, '0': jewel.red[0], '1': jewel.red[1], '2': jewel.red[2], '3': jewel.red[3], 'w': jewel.glint}
art.sprite('gem', Img.from_rows([
    '........',
    '...o....',
    '..o3o...',
    '.o3w2o..',
    '..o10o..',
    '...o....',
    '........',
    '........',
], key=GEM), pal=jewel, region='spr')
art.sprite('biggem', Img.from_rows([
    '..oooo..',
    '.o33w2o.',
    'o332221o',
    'o221110o',
    '.o2110o.',
    '..o10o..',
    '...oo...',
    '........',
], key=GEM), pal=jewel, region='spr')

art.write(sys.argv[1])
