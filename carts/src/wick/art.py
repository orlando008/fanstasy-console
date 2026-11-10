# Wick's art: carts/src/wick/tiles.txt, palette.txt, map.txt and art.json, and the ART block in code.js.
#   python3 carts/src/wick/art.py carts/src/wick
# Written with the art toolkit (tools/devkit/art/kit.py; docs/dev/art-recipes.md shows what each part draws). This is the
# art of step 1, enough to play the rooms: the cells' tiles, a far wall, Wick as a small flame. The look is settled in
# step 2 (the art proof), and the rest is drawn after it.
# Map RAM: the room being played at (0, 0), 32 x 26 tiles, written by code.js from the cells' pictures at (40, 0); the far
# wall at (64, 0); the title's lettering at (0, 30).
import math, os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../../tools/devkit/art'))
from kit import *

art = Art()
art.region('bg', 1, 511)
art.region('spr', 512, 1023)

art.color(200, '0c0a18', 'GLASS')                                   # the panels' fill (see-through: code.js blends it)
castle = art.palette(1, {'stone': ramp('6a6478', 5), 'wood': ramp('7a4a26', 3), 'water': ramp('2a5a9a', 4), 'iron': ramp('5a5a66', 2)})
far = art.palette(2, {'wall': recede(ramp('2a2638', 4), 0.55, '0c0a18')})   # dark and low in contrast: the room's stone must stand out from it
fire = art.palette(3, {'gold': ramp('e0a030', 5), 'edge': '1c1020', 'shade': '2a2040', 'flame': ramp('f0b040', 3)})
wick_pal = art.sprite_palette(0, {'edge': '2a1408', 'flame': ramp('f09030', 4), 'core': 'fff4c0', 'wax': ramp('d8d0b8', 3), 'soot': ramp('3a3440', 2)})

# --- The cells' pictures, 16 x 16 each, side by side: code.js copies their four tiles into the room (CELL_ART) ---
strip = Img(16 * 5, 16)
stone = texture('stone', 16, 16, castle.stone[:4], size=8)
strip.blit(stone, 0, 0)                                              # 0 stone
for x in range(16):                                                  # 1 a ledge: a wooden board along the top of its cell
    strip.px[0][16 + x] = castle.wood[2]; strip.px[1][16 + x] = castle.wood[1]; strip.px[2][16 + x] = castle.wood[1]; strip.px[3][16 + x] = castle.wood[0]
water = texture('water', 16, 16, castle.water)
strip.blit(water, 32, 0)                                             # 2 water
for x in range(16): strip.px[0][32 + x] = castle.water[3] if x % 4 < 2 else 0
def lantern(lit):
    im = Img(16, 16)
    im.rect(3, 13, 10, 3, castle.iron[0]); im.rect(4, 3, 8, 10, castle.iron[1] if not lit else castle.wood[2])
    im.rect(5, 4, 6, 8, castle.stone[0] if not lit else castle.stone[4]); im.rect(6, 1, 4, 2, castle.iron[0])
    return im
strip.blit(lantern(False), 48, 0); strip.blit(lantern(True), 64, 0)  # 3 the lantern, unlit; 4 lit
art.scene('cells', strip, pal=castle, at=(40, 0))

# --- The far wall: dark stones behind the room ---
back = Img(256, 208)
bricks = texture('brick', 64, 32, far.wall, bw=32, bh=16)
for y in range(0, 208, 32):
    for x in range(0, 256, 64): back.blit(bricks.crop(0, 0, 64, min(32, 208 - y)), x, y)
art.scene('wall', back, pal=far, at=(64, 0), solid=True)

# --- Wick: a candle flame, 16 x 16 (his body is the lower 10 x 12). Two frames of flicker, and a puff of smoke ---
def wick(lean):
    m = Img(16, 16)
    for y in range(1, 13):
        t = (y - 1) / 11
        half = 0.6 + 4.2 * math.sin(t * math.pi * 0.62) ** 0.9 if t < 1 else 0
        cx = 7.5 + lean * (1 - t) * 2
        for x in range(16):
            if abs(x + 0.5 - cx - 0.5) <= half: m.px[y][x] = 1
    f = outline_sel(shaded(m, wick_pal.flame, kind='dome'), wick_pal)
    for y in range(7, 11):
        for x in range(6, 10):
            if f.px[y][x] and abs(x - 7.5) + abs(y - 9) < 2.6: f.px[y][x] = wick_pal.core
    f.rect(5, 12, 6, 4, wick_pal.wax[1]); f.rect(5, 12, 6, 1, wick_pal.wax[2]); f.rect(5, 15, 6, 1, wick_pal.wax[0])   # the stub of candle
    return f
art.sprite('wick0', wick(0), pal=wick_pal, region='spr')
art.sprite('wick1', wick(0.6), pal=wick_pal, region='spr')
puff = Img(16, 16); puff.disc(6, 9, 4, 1); puff.disc(10, 7, 3, 1); puff.disc(8, 4, 2, 1)
art.sprite('puff', shaded(puff, wick_pal.soot + wick_pal.wax[:1], kind='dome'), pal=wick_pal, region='spr')
ember = Img(8, 8); ember.disc(4, 4, 2, wick_pal.flame[3]); ember.px[4][4] = wick_pal.core
art.sprite('ember', ember, pal=wick_pal, region='spr')

# --- The title's lettering, on layer 2 ---
logo = Img(256, 40)
t = big_text('WICK', fire.gold, scale=4, outline=fire.edge, shadow=fire.shade)
logo.blit(t, (256 - t.w) // 2, 1)
art.scene('logo', logo, pal=fire, at=(0, 30))

art.write(sys.argv[1])
