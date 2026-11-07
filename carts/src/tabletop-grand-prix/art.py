# Tabletop Grand Prix's art: carts/src/tabletop-grand-prix/tiles.txt, palette.txt, map.txt and art.json, and the ART block in code.js.
#   python3 carts/src/tabletop-grand-prix/art.py carts/src/tabletop-grand-prix
# Written with the art toolkit (tools/devkit/art/kit.py: its header explains the pieces). This cart owns those files:
# change the pictures here, not in them. Then look at the result with
#   node tools/devkit/art/sprites.mjs carts/tabletop-grand-prix.nova out.png      the sprites, at their real sizes and palettes
#   node tools/devkit/tiles.mjs carts/tabletop-grand-prix.nova out.png --from 0 --count 64 --pal 1   the tiles, with their numbers
#   node tools/devkit/shots.mjs carts/tabletop-grand-prix.nova out/ --at 300 --extra "skipTitle = true; skipTrack = 1;"   the game
# (pack first: node tools/pack.js carts/src/tabletop-grand-prix carts/tabletop-grand-prix.nova). Pixel values are palette indices; 0 is transparent.
#
# The look (spec 12): a bright toy-box cartoon seen from above. The tracks are built while the game runs, from a grid of
# surfaces (spec 6), so the table is a vocabulary of 8 px tiles that code.js picks for each cell from the cell and its
# neighbours:
#   - the table: a gingham cloth (Breakfast) or a green cutting mat (Workshop): the same four tiles in two palettes;
#   - the road, with a kerb on each side that meets the table, a hole or a wall: 16 tiles, one for each set of sides;
#   - crumbs or sawdust, milk or oil, jam or glue (each two tiles, the same shapes in the two palettes), a book or a
#     plank for a ramp;
#   - a wall (a prop), bevelled where it meets open ground, lit from the upper left: 16 tiles; props painted red use
#     palette 7, the rest the table's own colours;
#   - the table's front face, in the cell below its edge, so a table stands up off the floor.
# Palettes: 1 Breakfast, 2 Workshop; 3 and 4 the same, darker (the shadow a wall casts to its lower right, chosen per
# cell, no tiles); 5 the kitchen floor and the logo; 6 the garage floor; 7 the red props (palette 1's roles, walls red).
# Sprites: the cars in five directions (the other eleven are flips) in palettes 0 to 3, recoloured by code.js to each
# driver's colour; the things that roll in the cars' palette's spare entries; shadows (palette 7) and dust puffs
# (palette 6), both see-through (code.js blends sprite palettes 4 to 7 at half, with the overlay's panels).
import math, os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../../tools/devkit/art'))
from kit import *

art = Art()
art.region('bg', 1, 383)       # background tiles
art.region('spr', 384, 1023)   # sprites (a 16 px sprite takes four tiles)

# The overlay's panels: a solid dark navy, in a spare entry of palette 6 (the garage floor uses 97 to 100). Solid, not
# see-through: half of the navy over the red gingham was a muddy brown (colors.mjs --check).
art.color(110, '18204a', 'GLASS')

# --- The two tables: the same roles in each, so every tile is drawn once and shows in either palette ---
def table_pal(cloth, road, crumb, milk, ramp_, wall):
    return {'cloth': cloth, 'road': road, 'crumb': crumb, 'milk': milk, 'book': ramp_, 'wall': wall}
BREAKFAST = table_pal(['b83840', 'e86858', 'f4efe2'], ['3a3c48', '6c707c', '9094a0'], ['a87838', 'e4bc6c'], ['b8c8e4', 'f8f8ff'],
                      ['204888', '3c78c8'], ['7a5030', 'c89860', 'f0d8a8'])
WORKSHOP = table_pal(['2c5c44', '3f7c5a', '7ab08a'], ['34363e', '62646c', '868890'], ['b08c50', 'e8d098'], ['1c1424', '4a3c64'],
                     ['7a4c26', 'c08850'], ['484c58', '8890a0', 'd0d4dc'])
dim = lambda pal: {k: [mix(c, '0c0820', 0.38) for c in v] for k, v in pal.items()}
red_props = dict(BREAKFAST, wall=['7a1c24', 'c83838', 'f07a68'])
tab = art.palette(1, BREAKFAST)
art.palette(2, WORKSHOP)
art.palette(3, dim(BREAKFAST))
art.palette(4, dim(WORKSHOP))
art.palette(7, red_props)

# The cloth: gingham, bands 8 px wide every 16 px; a cell's tile by the parity of its column and row (cloth0 to cloth3).
def cloth(kind):
    def px(x, y):
        weave = (x - y) % 4 == 0 and y % 2 == 0
        if kind == 0: return tab.cloth[0] if not weave else tab.cloth[1]                  # both bands cross: the darkest
        if kind == 3: return tab.cloth[2] if not weave or (x * 3 + y) % 7 else tab.cloth[1]   # neither: the light ground
        return tab.cloth[1] if not weave else (tab.cloth[0] if kind == 1 else tab.cloth[2])   # one band
    return Img.make(8, 8, px)
for k in range(4): art.tile('cloth%d' % k, cloth(k), pal=tab)

# The road: speckled, with a kerb 2 px wide on each side in the mask (1 N, 2 E, 4 S, 8 W): a dark edge outside, so it
# stands out from the cloth, and inside it stripes of the cloth's dark and light colours every 4 px, so a kerb runs on
# from tile to tile.
def road_px(x, y):
    h = hsh(x * 31 + y * 17)
    return tab.road[0] if h % 11 == 0 else tab.road[2] if h % 13 == 0 else tab.road[1]
def road(mask):
    def px(x, y):
        for bit, edge, inside, along in ((1, y == 0, y < 2, x), (4, y == 7, y > 5, x), (2, x == 7, x > 5, y), (8, x == 0, x < 2, y)):
            if mask & bit and edge: return tab.road[0]
        for bit, edge, inside, along in ((1, y == 0, y < 2, x), (4, y == 7, y > 5, x), (2, x == 7, x > 5, y), (8, x == 0, x < 2, y)):
            if mask & bit and inside: return tab.cloth[0] if (along // 4) % 2 == 0 else tab.cloth[2]
        return road_px(x, y)
    return Img.make(8, 8, px)
for m in range(16): art.tile('road%d' % m, road(m), pal=tab)
# Two more for the middle of the road, now and then, so a wide road is not one flat grey: a patch of grit and a scuff.
art.tile('roadv0', Img.make(8, 8, lambda x, y: tab.road[0] if hsh(x * 3 + y * 41) % 4 == 0 else road_px(x, y)), pal=tab)
art.tile('roadv1', Img.make(8, 8, lambda x, y: tab.road[2] if (y in (3, 4) and 1 <= x <= 6 and (x + y) % 3) else road_px(x, y)), pal=tab)
# The start line: black and white checks, 4 px, across the road.
art.tile('start', Img.make(8, 8, lambda x, y: tab.cloth[2] if ((x // 4) + (y // 4)) % 2 else tab.road[0]), pal=tab)

# The spills: crumbs (sawdust), milk (oil), jam (glue: the cloth's colours, so green slime on the mat). Two of each.
for v in range(2):
    art.tile('rough%d' % v, Img.make(8, 8, lambda x, y: (tab.crumb[1] if hsh(x * 5 + y * 23 + v * 99) % 3 == 0 else tab.crumb[0]) if hsh(x * 11 + y * 7 + v * 31) % 4 else road_px(x, y)), pal=tab)
    art.tile('slick%d' % v, Img.make(8, 8, lambda x, y: tab.milk[1] if ((x + 2 * y + v * 3) % 9 == 0 or (x == 2 + v * 3 and y in (2, 3))) else tab.milk[0]), pal=tab)
    art.tile('sticky%d' % v, Img.make(8, 8, lambda x, y: tab.cloth[2] if (x, y) in ((2 + v * 3, 2), (3 + v * 3, 2), (2 + v * 3, 3)) else tab.cloth[1] if hsh(x * 13 + y * 5 + v) % 6 == 0 else tab.cloth[0]), pal=tab)
# A ramp: a book's cover (a plank on the bench), its spine lines and pages.
art.tile('ramp', Img.make(8, 8, lambda x, y: tab.cloth[2] if y == 7 else tab.book[1] if (x + y) % 6 else tab.book[0]), pal=tab)
# A wall: a prop's top, bevelled where it meets open ground (mask: 1 N, 2 E, 4 S, 8 W open), lit from the upper left.
def wall(mask):
    def px(x, y):
        if mask & 1 and y < 2: return tab.wall[2]
        if mask & 8 and x < 1: return tab.wall[2]
        if mask & 4 and y > 5: return tab.wall[0]
        if mask & 2 and x > 6: return tab.wall[0]
        return tab.wall[1] if hsh(x * 7 + y * 19) % 9 else tab.wall[2]
    return Img.make(8, 8, px)
for m in range(16): art.tile('wall%d' % m, wall(m), pal=tab)
# The table's front face, in the hole cell under its edge: the cloth hanging over, its hem, and a dark gap below.
art.tile('lip', Img.make(8, 8, lambda x, y: tab.cloth[1] if y < 4 else tab.cloth[0] if y < 6 else tab.road[0]), pal=tab)

# --- The floors far below (BG2), 64 x 64 px, repeated by the layer: kitchen tiles and garage concrete. The logo shares
# the kitchen floor's palette ---
kit_pal = art.palette(5, {'tile': ['8a4a30', 'c07048', 'e8d8b0'], 'blue': ramp('40a0f0', 4), 'green': ramp('60d060', 4), 'ink': '101828', 'drop': '1c3048'})
gar_pal = art.palette(6, {'conc': ['464644', '5e5e5c', '767674', '8e8e8a']})
def kitchen(x, y):
    if x % 32 in (0, 31) or y % 32 in (0, 31): return kit_pal.tile[0]
    return kit_pal.tile[1] if ((x // 32) + (y // 32)) % 2 else kit_pal.tile[2]
def garage(x, y):
    n = hsh((x // 2) * 13 + (y // 2) * 29) % 7
    if (x * 5 + y * 3) % 61 == 0 or abs((x - 20) * (y - 44)) < 6 and abs(x - 20) < 10: return gar_pal.conc[0]   # a crack, a stain
    return gar_pal.conc[1] if n == 0 else gar_pal.conc[3] if n == 1 else gar_pal.conc[2]
art.scene('floor0', Img.make(64, 64, kitchen), pal=kit_pal, at=(128, 0), solid=True)
art.scene('floor1', Img.make(64, 64, garage), pal=gar_pal, at=(136, 0), solid=True)

# --- The logo (BG0 on the title): the name in big gradient letters, two lines, TABLETOP in blue and GRAND PRIX in green ---
l1 = big_text('TABLETOP', kit_pal.blue, scale=2, outline=kit_pal.ink, shadow=kit_pal.drop)
l2 = big_text('GRAND PRIX', kit_pal.green, scale=2, outline=kit_pal.ink, shadow=kit_pal.drop)
W = (max(l1.w, l2.w) + 7) // 8 * 8
logo = Img(W, 48)
logo.blit(l1, (W - l1.w) // 2, 0); logo.blit(l2, (W - l2.w) // 2, 22)
art.scene('logo', logo, pal=kit_pal, at=(144, 0))

# --- The cars: a toy car 13 x 8 px, drawn at 0 (pointing right), 22.5, 45, 67.5 and 90 degrees, by sampling each
# pixel 4 x 4 times in the car's own frame and lighting it from the upper left of the screen ---
CAR = {'edge': '18141c', 'body': ['8c2a2a', 'd04040', 'f08070'], 'glass': ['3c6c9c', 'a0d8f8'], 'tyre': '2c2830', 'lamp': 'f8f0a0',
       'orange': ['e07c24', 'f8c870'], 'pea': ['5c9c34', 'b8e888'], 'steel': ['8890a0', 'eef0f8']}
car = art.sprite_palette(0, CAR)
for k in (1, 2, 3): art.sprite_palette(k, CAR)    # code.js recolours each car's body ramp to its driver's colour

def car_part(u, v):
    """What the car is at (u, v) in its own frame: u along it (front +), v across it."""
    if 2.0 <= abs(u) <= 4.6 and 3.0 <= abs(v) <= 4.4: return 'tyre'
    if abs(u) > 6.5 or abs(v) > 3.6: return None
    if abs(u) > 5.3 and abs(v) > 2.4: return None if abs(u) > 5.9 else 'body'     # rounded corners
    if u > 5.4 and 1.4 <= abs(v) <= 2.6: return 'lamp'
    if 1.4 <= u <= 3.0 and abs(v) <= 2.6: return 'glass'
    if -3.6 <= u <= -2.6 and abs(v) <= 2.4: return 'glass'
    if -2.6 < u < 1.4 and abs(v) <= 2.6: return 'roof'
    return 'body'

def car_at(deg, scale=1.0, shadow=None):
    t = math.radians(deg); c, s = math.cos(t), math.sin(t)
    def px(x, y):
        votes = {}
        for i in range(4):
            for j in range(4):
                dx, dy = (x + (i + 0.5) / 4 - 8) / scale, (y + (j + 0.5) / 4 - 8) / scale
                p = car_part(dx * c + dy * s, -dx * s + dy * c)
                if p: votes[(p, dx + dy)] = votes.get((p, dx + dy), 0) + 1
        n = sum(votes.values())
        if n < 7: return 0
        if shadow is not None: return shadow
        part = max(sorted({p for p, _ in votes}), key=lambda q: sum(v for (p, _), v in votes.items() if p == q))   # (sorted: the same tie-break every run)
        lit = sum(k * v for (p, k), v in votes.items()) / n          # where on the screen, from the car's middle: - is upper left
        if part == 'tyre': return car.tyre
        if part == 'lamp': return car.lamp
        if part == 'glass': return car.glass[1] if lit < -1.5 else car.glass[0]
        if part == 'roof': return car.body[2] if lit < 0.5 else car.body[1]
        return car.body[2] if lit < -4.5 else car.body[0] if lit > 3.5 else car.body[1]
    im = Img.make(16, 16, px)
    return im if shadow is not None else im.outline(car.edge)
art.frames('car', [car_at(d * 22.5) for d in range(5)], pal=car, region='spr')
# Falling off the table: the car smaller and smaller (code.js spins it with flips).
art.frames('fall', [car_at(30, s) for s in (0.75, 0.5, 0.3)], pal=car, region='spr')

# The things that roll (spec 5.6): a pea and a ball bearing (8 px), an orange (16 px), in the cars' palette's spare roles.
def ball(size, R, rmp):
    def px(x, y):
        d = math.hypot(x - size / 2 + 0.5, y - size / 2 + 0.5)
        if d > R: return 0
        k = (x - size / 2) + (y - size / 2)
        return rmp[1] if k < -R * 0.5 and d < R * 0.75 else car.edge if k > R * 0.9 else rmp[0]
    return Img.make(size, size, px).outline(car.edge)
art.sprite('pea', ball(8, 3, car.pea), pal=car, region='spr')
art.sprite('bearing', ball(8, 3, car.steel), pal=car, region='spr')
art.sprite('orange', ball(16, 6.5, car.orange), pal=car, region='spr')

# Shadows: the cars' and the rollers' silhouettes, dark, see-through (palette 7 is blended at half).
sh = art.sprite_palette(7, {'shade': '000000'})
art.frames('shadow', [car_at(d * 22.5, shadow=sh.shade) for d in range(5)], pal=sh, region='spr')
art.sprite('rshadow', Img.make(16, 16, lambda x, y: sh.shade if ((x - 7.5) / 6.5) ** 2 + ((y - 7.5) / 4.5) ** 2 <= 1 else 0), pal=sh, region='spr')
art.sprite('bshadow', Img.make(8, 8, lambda x, y: sh.shade if ((x - 3.5) / 3.2) ** 2 + ((y - 3.5) / 2.4) ** 2 <= 1 else 0), pal=sh, region='spr')

# Dust puffs (crumbs, sawdust, a landing): see-through, palette 6.
du = art.sprite_palette(6, {'dust': ['c8b898', 'f0e8d8']})
art.frames('puff', [Img.make(8, 8, lambda x, y, r=r: (du.dust[1] if x + y < 7 else du.dust[0]) if math.hypot(x - 3.5, y - 3.5) <= r else 0) for r in (2.2, 3.6)], pal=du, region='spr')

art.write(sys.argv[1])
