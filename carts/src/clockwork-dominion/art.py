# Clockwork Dominion's art: carts/src/clockwork-dominion/tiles.txt, palette.txt, map.txt and art.json, and the ART block in code.js.
#   python3 carts/src/clockwork-dominion/art.py carts/src/clockwork-dominion
# Written with the art toolkit (tools/devkit/art/kit.py: its header explains the pieces). This cart owns those files:
# change the pictures here, not in them. Look at the result with
#   node tools/devkit/art/sprites.mjs carts/clockwork-dominion.nova out.png
#   node tools/devkit/art/scene.mjs carts/clockwork-dominion.nova out.png --scene bench --holes
# (pack first: node tools/pack.js carts/src/clockwork-dominion carts/clockwork-dominion.nova).
#
# Step 1 of the plan: a placeholder view (the workshop's wall in lamplight, the bench, Marco and a cog) and the panel's
# ink, the overlay colours the code draws the panels with. The real views come in step 6.
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../../tools/devkit/art'))
from kit import *

art = Art()
art.region('bg', 1, 255)       # background tiles
art.region('spr', 256, 1023)   # sprites (a 16 px sprite takes four tiles)

# --- The panel's ink: overlay colours, BG palette 7's entries (113 to 127), kept for the overlay alone ---
INK = {
    'PAPER': '141d33',   # the panel's ground: deep ink blue
    'ROW': '22305a',     # the chosen row's bar
    'INK': 'f2e6c8',     # text: parchment cream
    'DIM': '8790ad',     # a row that cannot be pressed yet, labels
    'BRASS': 'e8b04a',   # headings, the headline counter
    'GOLD': 'ffe596',    # the brightest: what changed, the chosen tab
    'BAD': 'e2735a',     # a "no", a warning
    'GOOD': '9ed27a',    # money coming in
    'EDGE': '070a14',    # outlines and shadows
    'LINE': '9a6a2a',    # the frame's brass lines
    'THINK': '8cc4ee',   # insight
    'LOG': 'cdbf9e',     # the log's text, a little softer than the panel's
}
for k, (name, hexc) in enumerate(INK.items()):
    art.color(113 + k, hexc, name)

# --- The view (lines 0 to 91): the workshop's wall in lamplight, a colour for each line ---
art.gradient('wall', ['3a2414', '6a4024', '8a5a30', '5a3820', '2a1a10'], y0=0, y1=91)

wood = art.palette(1, {'wood': ramp('7a4a26', 4), 'brass': ramp('c08a30', 3)})
bench = Img(256, 24)
planks = texture('planks', 256, 24, wood.wood)
bench.blit(planks, 0, 0)
for x in range(256):
    bench.px[0][x] = wood.wood[3]; bench.px[1][x] = wood.wood[2]
art.scene('bench', bench, pal=wood, at=(0, 0), solid=True)

# --- Marco: a round brass automaton with a key in its back, 16 x 16 (o edge, d b l brass dark to light, e eye, k key) ---
marcoc = art.sprite_palette(0, {'edge': '1a0f08', 'brass': ramp('b07a2a', 4), 'eye': 'bfe8ff', 'key': ramp('8a8a96', 2)})
marco = Img.from_rows([
    '.......kk.......',
    '......k..k......',
    '.......kk.......',
    '........k.......',
    '.....oooooo.....',
    '....olllbbdo....',
    '...olbbbbbbdo...',
    '...olbeebeedo...',
    '...olbeebeedo...',
    '...olbbbbbbdo...',
    '...obbboobbdo...',
    '....obbbbbdo....',
    '.....oooooo.....',
    '.....od..do.....',
    '....odd..ddo....',
    '....ooo..ooo....',
], key={'o': marcoc.edge, 'd': marcoc.brass[0], 'b': marcoc.brass[2], 'l': marcoc.brass[3], 'e': marcoc.eye, 'k': marcoc.key[1]})
art.sprite('marco', marco, pal=marcoc, region='spr')

# --- A cog, 8 x 8, and a tinker, 8 x 8 ---
cog = Img.from_rows([
    '..o..o..',
    '.olbblo.',
    'oblddbdo',
    '.bd..db.',
    '.bd..db.',
    'obddddbo',
    '.obbbdo.',
    '..o..o..',
], key={'o': marcoc.edge, 'd': marcoc.brass[0], 'b': marcoc.brass[2], 'l': marcoc.brass[3]})
art.sprite('cog', cog, pal=marcoc, region='spr')
tinker = Img.from_rows([
    '...k....',
    '..oooo..',
    '.olbbdo.',
    '.obeedo.',
    '.obbbdo.',
    '..oooo..',
    '..o..o..',
    '.oo..oo.',
], key={'o': marcoc.edge, 'd': marcoc.brass[0], 'b': marcoc.brass[2], 'l': marcoc.brass[3], 'e': marcoc.eye, 'k': marcoc.key[1]})
art.sprite('tinker', tinker, pal=marcoc, region='spr')

art.write(sys.argv[1])
