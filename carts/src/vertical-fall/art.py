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
art.region('bg', 1, 447)       # background tiles
art.region('spr', 448, 1023)   # sprites (a 16 px sprite takes four tiles)

CELLS_X = 200                  # the cell catalogue: Map RAM columns 200 and up, row 0 (code.js reads it with mget)
WALL_AT = (32, 0)              # the back wall's repeating 64 x 64 picture

# The well is dark: the stone in front lit from above, a back wall pushed into the dark with openings in it, and through
# them a far layer of pillars and chains against a glow from the depths (the backdrop, a gradient code.js sets line by line).
# Red is kept for danger and gems. Each area has its own colours for the same tiles (AREAS below): the palettes here are
# the Shaft's, and art.py writes all four into rom/areas.bin, which code.js copies into CGRAM when an area begins.
AREAS = [  # stone, accent (in the stone's cracks), blocks, back wall (4, dark), far layer (4, darker), the depths' glow (3: top to bottom)
    ('5a6a8a', '3c5a4a', '7a7488', ['0c0e18', '141826', '1c2232', '262c3e'], ['0a0c16', '10142a', '181e3a', '22284a'], ['1e2238', '0e1020', '06060c']),   # the Shaft: cold grey-blue, roots
    ('a08c70', 'd8ccb0', '8a7866', ['140e0a', '1e160e', '2a2016', '362a1e'], ['120a08', '1c120c', '2a1a12', '3a2418'], ['3a1c10', '1a0c08', '080404']),   # the Ossuary: bone, ember-lit
    ('3e7476', '3a9a72', '5e8a8a', ['06141a', '0a1e24', '102830', '18343c'], ['06121c', '0a1c2a', '10283a', '18384c'], ['0e3a48', '06202a', '02080c']),   # the Cistern: teal, algae, water
    ('4a3a62', '9a58d8', '5a4a72', ['0a0812', '100c1c', '181226', '201832'], ['0c0614', '140a22', '1e1032', '2a1846'], ['2a0e4a', '12061e', '040208']),   # the Deep: violet-black, a glow
]
ST, AC, BL, WA, FA, SKY = AREAS[0]
art.color(250, '101838', 'GLASS')   # the panels' fill, seen through (from 192 up the overlay blends): a deep blue, in sprite palette 7, which no sprite uses
# The overlay's own colours (BG palette 7's entries, which no tiles use), so the HUD and the panels are not the default
# palette's brown and grey (colors.mjs calls those mud).
for i, (h, name) in enumerate((('04040a', 'SHADOW'), ('4a64b0', 'PANEL'), ('8c9ccc', 'DIM'), ('f4f4fc', 'WHITE'), ('f8c840', 'GOLD'), ('f03848', 'RED'))):
    art.color(113 + i, h, name)
rock = art.palette(1, {'stone': ramp(ST, 5), 'moss': ramp(AC, 2), 'blk': ramp(BL, 4), 'gem': ramp('d02838', 3), 'glow': 'e8a848'})
back = art.palette(2, {'brick': WA})                                         # dark, so the stone in front reads
far = art.palette(4, {'far': FA})
hero = art.sprite_palette(0, {'edge': '0a0a12', 'body': ramp('c8d0e0', 3), 'boot': ramp('b02838', 3), 'eye': '0a0a12'})
shot = art.sprite_palette(1, {'core': 'ffffff', 'glow': ramp('f0d890', 3), 'smoke': ramp('9098a8', 2)})
foe = art.sprite_palette(2, {'edge': '0a0a12', 'pale': ramp('b8bccc', 4), 'eye': 'f0e070', 'red': ramp('d02838', 3)})   # pale: stomp it; red: do not touch
jewel = art.sprite_palette(3, {'edge': '2a0610', 'red': ramp('e02840', 4), 'glint': 'ffffff'})       # gems: red

def shaped(f, edge, size=16):
    """A sprite drawn from a function of (x, y) giving a colour or 0, with a 1 px outline in `edge` added round it."""
    im = Img.make(size, size, f)
    out = im.crop(0, 0, size, size)
    for y in range(size):
        for x in range(size):
            if not im.px[y][x] and any(0 <= x + dx < size and 0 <= y + dy < size and im.px[y + dy][x + dx] for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                out.px[y][x] = edge
    return out
def lit(r, x, y, k=0): return r[min(len(r) - 1, max(0, int((x + y - 12) / -5 + len(r) - 1 + k)))]   # a ramp lit from the top left
def oval(cx, cy, rx, ry): return lambda x, y: ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1

# --- The cells (BG0) ---
# Stone, with the area's accent in some of its cracks (roots in the Shaft, bone dust, algae, a violet glow).
stone = texture('stone', 32, 32, rock.stone, size=11)
for y in range(32):
    for x in range(32):
        if stone.px[y][x] == rock.stone[0] and hsh(x * 31 + y * 17) % 100 < 22:
            stone.px[y][x] = rock.moss[1] if hsh(x * 7 + y * 3) % 3 == 0 else rock.moss[0]
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

# A door in the left wall to a side room (flipped for the right wall): an arch cut into the stone, warm light inside.
door = stone.crop(0, 0, 16, 16)
for y in range(16):
    for x in range(16):
        inside = x >= 5 and y >= 3 and (y >= 7 or (x - 10.5) ** 2 + (y - 7) ** 2 <= 30)
        rim = x >= 4 and y >= 2 and (y >= 7 or (x - 10.5) ** 2 + (y - 7) ** 2 <= 42)
        if inside: door.px[y][x] = rock.glow if (x - 11) ** 2 + (y - 11) ** 2 < 10 else rock.stone[0]
        elif rim: door.px[y][x] = rock.stone[3]
art.scene('door', door, pal=rock, at=(CELLS_X + 14, 0), solid=True)

# --- A side room (BG2, shown in the well's window while time stands still): a warm chamber, 144 x 112, its floor at the
# bottom (code.js puts the faller's feet on y 96 of it), a torch either side ---
ROOM_AT = (48, 0)
roomp = art.palette(3, {'wall': ramp('6a5848', 5), 'floor': ramp('4a3e34', 3), 'fire': ramp('e07020', 3)})
room = Img(144, 112)
room.blit(texture('brick', 144, 96, roomp.wall[:4], bw=16, bh=8), 0, 0)
room.blit(texture('stone', 144, 16, roomp.floor, size=10), 0, 96)
for x in range(144): room.px[96][x] = roomp.wall[4]
for tx in (16, 120):
    for y in range(36, 52):
        for x in range(tx, tx + 8):
            d = abs(x - tx - 3.5) + (y - 36) * 0.4
            if y >= 44 and abs(x - tx - 3.5) < 1.5: room.px[y][x] = roomp.floor[0]                          # the torch's handle
            elif y < 44 and abs(x - tx - 3.5) < 4 - (44 - y) * 0.45: room.px[y][x] = roomp.fire[2 if d < 2 else 1 if d < 3.5 else 0]
art.scene('room', room, pal=roomp, at=ROOM_AT, solid=True)


# --- The back wall (BG1): dark masonry, receded, repeating every 64 x 128, with an arched opening in it (transparent:
# the far layer shows through) and a ring of lit stones round the opening ---
wall = texture('brick', 64, 128, back.brick, bw=16, bh=8)
for y in range(128):
    for x in range(64):
        d = ((x - 32) / 14) ** 2 + ((y - 52) / 22) ** 2 if y < 52 else ((x - 32) / 14) ** 2
        if 26 <= y < 92 and d < 1: wall.px[y][x] = 0
        elif 22 <= y < 96 and d < 1.35: wall.px[y][x] = back.brick[3] if (x + y) % 5 else back.brick[2]
art.scene('wall', wall, pal=back, at=WALL_AT)

# --- The far layer (BG2 in the well, a quarter of the camera's speed): pillars, a beam and a hanging chain, dark against
# the glow of the depths; transparent between. 64 x 64, repeating ---
FAR_AT = (40, 0)
farimg = Img(64, 64)
for y in range(64):
    for x in range(64):
        if 6 <= x < 18: farimg.px[y][x] = far.far[2] if x < 9 else far.far[1] if x < 15 else far.far[0]          # a pillar, lit on the left
        elif 40 <= y < 46: farimg.px[y][x] = far.far[2] if y == 40 else far.far[1] if y < 44 else far.far[0]    # a beam across
        elif x in (44, 45) and y < 40 and (y % 6) < 4: farimg.px[y][x] = far.far[1] if x == 44 else far.far[0]  # a chain
        elif 4 <= x < 20 and y in (46, 47): farimg.px[y][x] = far.far[3]                                        # the pillar's ledge
art.scene('far', farimg, pal=far, at=FAR_AT)

# --- The title's logo (BG1 on the title): VERTICAL FALL in two lines, red, outlined, with a shadow ---
logop = art.palette(5, {'red': ramp('e02840', 4), 'edge': '0a0a12', 'shade': '3a0610'})
LOGO_AT = (100, 0)
logo = Img(144, 64)
for k, word in enumerate(('VERTICAL', 'FALL')):
    t = big_text(word, logop.red, scale=2, outline=logop.edge, shadow=logop.shade)
    logo.blit(t, (144 - t.w) // 2, 4 + k * 30)
art.scene('logo', logo, pal=logop, at=LOGO_AT)

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
# The gem high: sparks of light round the boots (drawn flickering, flipped every few frames).
art.sprite('aura', Img.make(16, 16, lambda x, y: (shot.core if (x * 7 + y * 3) % 11 == 0 else shot.glow[2]) if 9 <= y and abs(((x - 7.5) / 8) ** 2 + ((y - 13) / 5) ** 2 - 1) < 0.25 and (x + y) % 3 else 0), pal=shot, region='spr')
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
# The frog, facing right: a squat body, a head with two eyes up on top, a big folded back leg; hopping, it stretches out.
def frog(x, y, jump):
    if jump:
        body, head, leg = oval(8.5, 8, 5.5, 3.2), oval(12, 6.5, 3, 2.6), lambda x, y: abs((y - 9) - (x - 1) * -1.1) < 1.6 and 0 <= x <= 5 and y >= 9
    else:
        body, head, leg = oval(7.5, 11.5, 6, 3.4), oval(11.5, 9, 3.2, 2.8), oval(4.5, 12.5, 3.2, 2.6)
    ey = 5 if not jump else 3
    if (x, y) in ((11, ey), (14, ey)): return foe.eye
    if oval(11, ey, 1.6, 1.6)(x, y) or oval(14, ey, 1.6, 1.6)(x, y): return foe.pale[3]
    if leg(x, y): return lit(foe.pale, x, y, -1)
    if head(x, y) or body(x, y): return foe.pale[0] if y >= (11 if jump else 14) else lit(foe.pale, x, y)
    if not jump and y == 15 and x in (2, 3, 11, 12, 13): return foe.pale[1]                       # the feet
    return 0
art.sprite('frog0', shaped(lambda x, y: frog(x, y, False), foe.edge), pal=foe, region='spr')
art.sprite('frog1', shaped(lambda x, y: frog(x, y, True), foe.edge), pal=foe, region='spr')
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

# --- The rooms' things: a pedestal, the shopkeeper, a chest of gems; the drone; the puncher's fist; and an icon for each
# upgrade and gun module (16 x 16, drawn from shapes and outlined) ---
item = art.sprite_palette(4, {'edge': '0a0a12', 'red': ramp('d02838', 3), 'gold': ramp('e0b040', 3), 'grey': ramp('a0a8b8', 3),
                              'green': ramp('50a048', 2), 'white': 'ffffff'})
def outlined(f):
    im = Img.make(16, 16, f)
    out = im.crop(0, 0, 16, 16)
    for y in range(16):
        for x in range(16):
            if not im.px[y][x] and any(0 <= x + dx < 16 and 0 <= y + dy < 16 and im.px[y + dy][x + dx] for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                out.px[y][x] = item.edge
    return out
def shade(r, x, y, k=0): return r[min(len(r) - 1, max(0, int((x + y - 12) / -5 + len(r) - 1 + k)))]   # lit from the top left
def circle(cx, cy, rad): return lambda x, y: (x - cx) ** 2 + (y - cy) ** 2 <= rad * rad
def box(x0, y0, x1, y1): return lambda x, y: x0 <= x <= x1 and y0 <= y <= y1
def heart(x, y, s=6.0, cy=8):
    u, v = (x - 7.5) / s, (cy - y) / s + 0.3
    return (u * u + v * v - 1) ** 3 - u * u * v ** 3 < 0
def plus(x, y): return (x in (7, 8) and 4 <= y <= 11) or (y in (7, 8) and 4 <= x <= 11)
ICONS = {
    'apple': lambda x, y: item.green[1] if (x, y) in ((9, 2), (10, 2), (9, 3), (8, 4)) else shade(item.red, x, y) if circle(7.5, 9, 5.5)(x, y) else 0,
    'heartup': lambda x, y: item.white if heart(x, y) and plus(x, y) else shade(item.red, x, y) if heart(x, y) else 0,
    'clip': lambda x, y: shade(item.gold, x, y) if y < 5 and x in (5, 7, 9) and y >= 2 else shade(item.grey, x, y) if box(4, 5, 10, 14)(x, y) else 0,
    'fork': lambda x, y: shade(item.grey, x, y) if (x == 5 and 2 <= y <= 13) or (y in (2, 3, 4, 5) and x in (3, 5, 7)) or (y == 6 and 3 <= x <= 7) or (x in (10, 11) and 2 <= y <= 13 and (x == 10 or y < 8)) else 0,
    'magnet': lambda x, y: (item.grey[2] if y >= 11 else shade(item.red, x, y)) if (box(3, 3, 6, 13)(x, y) or box(9, 3, 12, 13)(x, y) or (box(3, 3, 12, 6)(x, y))) and not box(7, 7, 8, 13)(x, y) else 0,
    'drone': lambda x, y: item.gold[2] if (x, y) in ((7, 8), (8, 8)) else shade(item.grey, x, y) if circle(7.5, 8.5, 4)(x, y) else item.grey[2] if y == 3 and 3 <= x <= 12 else item.grey[0] if x in (7, 8) and y in (4,) else 0,
    'walljump': lambda x, y: shade(item.grey, x, y) if x <= 3 else item.white if (x - 4 == 13 - y and 5 <= x <= 12) or (y == 4 and 9 <= x <= 12) or (x == 12 and 4 <= y <= 7) else 0,
    'gemheart': lambda x, y: (item.white if abs(x - 7.5) + abs(y - 7.5) < 2.6 else shade(item.red, x, y)) if heart(x, y) else 0,
    'bounce': lambda x, y: shade(item.red, x, y) if box(3, 2, 12, 6)(x, y) else item.grey[2] if y >= 7 and y <= 14 and abs(x - (5 if (y // 2) % 2 else 10)) < 2 + (0 if y % 2 else 3) else 0,
    'skin': lambda x, y: (shade(item.gold, x, y) if abs(x - 7.5) < 2 or abs(y - 6) < 1.5 else shade(item.grey, x, y)) if (2 <= y <= 13 and abs(x - 7.5) <= 5.5 - max(0, y - 8) * 0.9) else 0,
    'mgun': lambda x, y: shade(item.gold, x, y) if x in (7, 8) and y % 4 in (0, 1, 2) and 1 <= y <= 14 else 0,
    'shotgun': lambda x, y: shade(item.gold, x, y) if any(circle(7.5 + dx, 3 + dy, 1.2)(x, y) for dx, dy in ((0, 9), (-4, 8), (4, 8), (-6, 5), (6, 5), (0, 5), (-2, 2), (2, 2))) else 0,
    'laser': lambda x, y: (item.white if x in (7, 8) else item.red[2] if x in (6, 9) else item.red[0]) if 5 <= x <= 10 and 1 <= y <= 14 else 0,
    'burst': lambda x, y: shade(item.gold, x, y) if any(abs(x - 7.5 - k * (y - 2) * 0.35) < 1.1 and y % 4 != 3 for k in (-1, 0, 1)) and 2 <= y <= 14 else 0,
    'puncher': lambda x, y: (item.grey[0] if (y == 6 and 4 <= x <= 11) or (x in (6, 9) and y < 6) else shade(item.grey, x, y)) if box(3, 3, 12, 12)(x, y) and not ((x, y) in ((3, 3), (12, 3), (3, 12), (12, 12))) else 0,
    'chest': lambda x, y: (item.red[2] if y < 6 and (x + y) % 3 == 0 else shade(item.gold, x, y, -1) if y == 8 or x in (3, 12) else shade(item.gold, x, y)) if box(3, 4, 12, 13)(x, y) else item.red[1] if y == 3 and 5 <= x <= 10 and x % 2 else 0,
}
for name, f in ICONS.items(): art.sprite(name, outlined(f), pal=item, region='spr')
art.sprite('pedestal', outlined(lambda x, y: shade(item.grey, x, y) if box(2, 8, 13, 9)(x, y) or box(4, 10, 11, 15)(x, y) else 0), pal=item, region='spr')
art.sprite('keeper', outlined(lambda x, y: item.gold[2] if (x, y) in ((6, 6), (9, 6)) else item.edge if circle(7.5, 6.5, 2.6)(x, y) else shade(item.grey, x, y, -1) if circle(7.5, 6, 4.5)(x, y) or (y >= 8 and abs(x - 7.5) <= 2 + (y - 8) * 0.6) else 0), pal=item, region='spr')
art.sprite('dronesm', Img.from_rows(['.oooooo.', 'o.oooo.o', '.o2222o.', 'o222222o', 'o22yy22o', 'o222222o', '.o2222o.', '..oooo..'],
                                    key={'o': item.edge, '2': item.grey[1], 'y': item.gold[2]}), pal=item, region='spr')
art.sprite('fist', outlined(lambda x, y: shade(item.gold, x, y) if box(2, 4, 13, 13)(x, y) and not (y == 8 and x % 3 == 0) else 0), pal=item, region='spr')

art.write(sys.argv[1])

# --- rom/areas.bin: each area's colours for the CGRAM entries the well's tiles use (the stone, its accent, the blocks,
# the back wall, the far layer) and the three colours of the depths' glow. A byte with the number of entries k, their k
# CGRAM indices, then for each area k + 3 colours in the console's RGB555, two bytes each (low first). ---
def rgb555(h):
    r, g, b = (int(h[i:i + 2], 16) >> 3 for i in (0, 2, 4))
    return r | g << 5 | b << 10
idx = [16 * pal.sub + i for pal, ix in ((rock, rock.stone), (rock, rock.moss), (rock, rock.blk), (back, back.brick), (far, far.far)) for i in ix]
data = bytearray([len(idx)]) + bytearray(idx)
for st, ac, bl, wa, fa, sky in AREAS:
    cols = list(ramp(st, 5)) + list(ramp(ac, 2)) + list(ramp(bl, 4)) + wa + fa + sky
    for h in cols: v = rgb555(h); data += bytes([v & 255, v >> 8])
os.makedirs(os.path.join(sys.argv[1], 'rom'), exist_ok=True)
open(os.path.join(sys.argv[1], 'rom', 'areas.bin'), 'wb').write(bytes(data))
