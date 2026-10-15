# Rags to Riches's art: carts/src/rags-to-riches/tiles.txt, palette.txt, map.txt and art.json, and the ART block in code.js.
#   python3 carts/src/rags-to-riches/art.py carts/src/rags-to-riches
# Written with the art toolkit (tools/devkit/art/kit.py: its header explains the pieces). Phase 1 is placeholder art: a night-sky backdrop and a van. This cart owns those files:
# change the pictures here, not in them. Then look at the result with
#   node tools/devkit/art/sprites.mjs carts/rags-to-riches.nova out.png      the sprites, at their real sizes and palettes
#   node tools/devkit/art/scene.mjs carts/rags-to-riches.nova out.png --scene field --holes     the background, with gaps marked
#   node tools/devkit/tiles.mjs carts/rags-to-riches.nova out.png --from 0 --count 64 --pal 1   the tiles, with their numbers
# (pack first: node tools/pack.js carts/src/rags-to-riches carts/rags-to-riches.nova). Pixel values are palette indices; 0 is transparent.
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../../tools/devkit/art'))
from kit import *

art = Art()
art.region('bg', 1, 255)       # background tiles
art.region('spr', 256, 1023)   # sprites (a 16 px sprite takes four tiles)

# BG palette 1 for the backdrop (BG palette 0 is shared with the overlay's text colours, so it is left alone);
# sprite palette 0 (spr's `pal: 0`) for the van.
sky = art.palette(1, {'s0': '0c0a24', 's1': '16143c', 's2': '241e56', 's3': '382c6e', 'star': 'deeed6', 'hill': '1a1030', 'road': '34283c', 'dash': '8a7a5a'})
vanp = art.sprite_palette(0, {'edge': '140c1c', 'body': 'd27d2c', 'glass': '6dc2ca', 'light': 'dad45e', 'stripe': 'd04648', 'tire': '3a3a4a'})

# --- The backdrop: 32 x 28 cells. Flat bands of sky (a cell row each), a few stars at fixed spots (3 kinds of cell), hills, a road ---
def star_cell(band, v):
    spots = ((2, 2), (5, 4), (3, 6))
    return Img.make(8, 8, lambda x, y: sky.star if (x, y) == spots[v] else band)
picture = Img(256, 224)
for cy in range(28):
    for cx in range(32):
        if cy < 19:
            band = sky.s0 if cy < 4 else sky.s1 if cy < 8 else sky.s2 if cy < 12 else sky.s3
            k = hsh(cx * 13 + cy * 7) % 9
            cell = star_cell(band, k) if (k < 3 and cy < 14) else Img.make(8, 8, lambda x, y, b=band: b)
        elif cy < 22:
            cell = Img.make(8, 8, lambda x, y: sky.hill)
        else:
            dash = cy == 25 and cx % 4 < 2
            cell = Img.make(8, 8, lambda x, y, d=dash: sky.dash if (d and 3 <= y <= 4) else sky.road)
        picture.blit(cell, cx * 8, cy * 8)
art.scene('field', picture, pal=sky, at=(0, 0), solid=True)

# --- The van: 16 x 16, side view (o edge, b body, w glass, y light, r stripe, k tyre) ---
van = Img.from_rows([
    '................',
    '................',
    '..oooooooooooo..',
    '.obbbbbbbbbbbbo.',
    '.obwwbwwbbwwwbo.',
    '.obwwbwwbbwwwbo.',
    '.obbbbbbbbbbbbo.',
    '.obbbbbbbbbbbyo.',
    '.orrrrrrrrrrrro.',
    '.obbbbbbbbbbbbo.',
    '.oooooooooooooo.',
    '..okko....okko..',
    '..okko....okko..',
    '...oo......oo...',
    '................',
    '................',
], key={'o': vanp.edge, 'b': vanp.body, 'w': vanp.glass, 'y': vanp.light, 'r': vanp.stripe, 'k': vanp.tire})
art.sprite('van', van, pal=vanp, region='spr')

art.write(sys.argv[1])
