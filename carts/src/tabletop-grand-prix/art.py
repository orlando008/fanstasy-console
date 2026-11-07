# Tabletop Grand Prix's art: carts/src/tabletop-grand-prix/tiles.txt, palette.txt, map.txt and art.json, and the ART block in code.js.
#   python3 carts/src/tabletop-grand-prix/art.py carts/src/tabletop-grand-prix
# Written with the art toolkit (tools/devkit/art/kit.py: its header explains the pieces). This cart owns those files:
# change the pictures here, not in them. Then look at the result with
#   node tools/devkit/art/sprites.mjs carts/tabletop-grand-prix.nova out.png      the sprites, at their real sizes and palettes
#   node tools/devkit/tiles.mjs carts/tabletop-grand-prix.nova out.png --from 0 --count 64 --pal 1   the tiles, with their numbers
#   node tools/devkit/shots.mjs carts/tabletop-grand-prix.nova out/ --at 60,300 --extra "skipTitle = true;"   the game
# (pack first: node tools/pack.js carts/src/tabletop-grand-prix carts/tabletop-grand-prix.nova). Pixel values are palette indices; 0 is transparent.
#
# Steps 1 and 2 of the plan (the spec's section 15): plain tiles, one for each surface of the track grid (spec 5.2), the
# floor below the table, and the car in five directions (the other eleven of its sixteen are flips), in four sprite
# palettes (one a car). The art pass is step 6.
import math, os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../../tools/devkit/art'))
from kit import *

art = Art()
art.region('bg', 1, 255)       # background tiles
art.region('spr', 256, 1023)   # sprites (a 16 px sprite takes four tiles)

art.color(200, '141c3c', 'GLASS')                                          # the overlay panels' fill, seen through (blend in code.js)

# --- The table (BG1, palette 1): a tile for each surface; the hole is no tile at all (the floor shows through) ---
tab = art.palette(1, {'wood': ramp('c08850', 3), 'road': ramp('8a8f9a', 3), 'crumb': 'd8b060',
                      'milk': ramp('d8e8f8', 2), 'jam': ramp('b02838', 2), 'wall': ramp('5a3a28', 3), 'ramp': 'e0c040'})
def wood(x, y):
    g = (y * 3 + hsh(y // 3) % 5) % 8
    return tab.wood[0] if g == 0 else tab.wood[1] if (x + y * 5) % 11 else tab.wood[2]
def road(x, y): return tab.road[0] if hsh(x * 31 + y * 17) % 9 == 0 else tab.road[2] if hsh(x * 7 + y * 13) % 11 == 0 else tab.road[1]
art.tile('off', Img.make(8, 8, wood), pal=tab)
art.tile('road', Img.make(8, 8, road), pal=tab)
art.tile('rough', Img.make(8, 8, lambda x, y: tab.crumb if hsh(x * 5 + y * 23) % 3 == 0 else road(x, y)), pal=tab)
art.tile('slick', Img.make(8, 8, lambda x, y: tab.milk[1] if hsh(x * 3 + y * 29) % 7 else tab.milk[0]), pal=tab)
art.tile('sticky', Img.make(8, 8, lambda x, y: tab.jam[1] if (x * 3 + y) % 9 else tab.jam[0]), pal=tab)
art.tile('ramp', Img.make(8, 8, lambda x, y: tab.ramp if (x + y) % 4 < 2 else tab.wall[2]), pal=tab)
art.tile('wall', Img.make(8, 8, lambda x, y: tab.wall[2] if y == 0 or x == 0 else tab.wall[0] if y == 7 or x == 7 else tab.wall[1]), pal=tab)

# --- The floor far below (BG2, palette 2): kitchen tiles, 64 x 64 px, repeated by the layer ---
flo = art.palette(2, {'tile': ramp('6a7e90', 3)})
art.scene('floor', Img.make(64, 64, lambda x, y: flo.tile[0] if x % 32 == 0 or y % 32 == 0 else flo.tile[1 + ((x // 32 + y // 32) % 2)]),
          pal=flo, at=(128, 0), solid=True)

# --- The car: 16 x 16, pointing right at 0 degrees, then 22.5, 45, 67.5 and 90 (down the screen) ---
car = art.sprite_palette(0, {'edge': '141018', 'body': ramp('d04040', 3), 'glass': '9ad0f0', 'tyre': '302830'})
for k, body in ((1, '4070d8'), (2, 'e8c030'), (3, '40a848')):   # the other three cars: the same roles in other colours
    art.sprite_palette(k, {'edge': '141018', 'body': ramp(body, 3), 'glass': '9ad0f0', 'tyre': '302830'})
def car_at(deg):
    t = math.radians(deg); c, s = math.cos(t), math.sin(t)
    def px(x, y):
        dx, dy = x - 7.5, y - 7.5
        u, v = dx * c + dy * s, -dx * s + dy * c          # along the car (front +u) and across it
        if abs(u) <= 5.8 and abs(v) <= 3.2:
            if 0.6 <= u <= 2.8 and abs(v) <= 2.2: return car.glass
            return car.body[2] if v < -1.2 else car.body[1] if v < 1.6 else car.body[0]
        if 2.2 <= abs(u) <= 4.6 and 3.2 < abs(v) <= 4.4: return car.tyre
        return 0
    return Img.make(16, 16, px).outline(car.edge)
art.frames('car', [car_at(d * 22.5) for d in range(5)], pal=car, region='spr')

art.write(sys.argv[1])
