# Rags to Riches's art: carts/src/rags-to-riches/tiles.txt, palette.txt, map.txt and art.json, and the ART block in code.js.
#   python3 carts/src/rags-to-riches/art.py carts/src/rags-to-riches
# Written with the art toolkit (tools/devkit/art/kit.py: its header explains the pieces). This cart owns those files:
# change the pictures here (and in rtr_cast.py for the sprites, rtr_world.py for the backdrops), not in them. Then look at them with
#   node tools/devkit/art/sprites.mjs carts/rags-to-riches.nova out.png      the sprites, at their real sizes and palettes
#   node tools/devkit/art/scene.mjs carts/rags-to-riches.nova out.png --scene hub0 --holes     a backdrop, with gaps marked
#   node tools/devkit/tiles.mjs carts/rags-to-riches.nova out.png --from 0 --count 64 --pal 1   the tiles, with their numbers
# (pack first: node tools/pack.js carts/src/rags-to-riches carts/rags-to-riches.nova). Pixel values are palette indices; 0 is transparent.
import os, sys
here = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(here, '../../../tools/devkit/art'))
sys.path.insert(0, here)
from kit import *
import rtr_cast as cast
import rtr_world as world

art = Art()
art.region('bg', 1, 759)       # backdrops, the crowd
art.region('spr', 760, 1023)   # sprites (a 32 px sprite takes sixteen tiles)

# --- Sprite palettes: one for each of the cast, one for the venues, props and map icons ---
EDGE = '140c1c'
PV = art.sprite_palette(0, {'outline': EDGE, 'body': 'd27d2c', 'bodyd': 'a85a1c', 'bodyl': 'e8a050', 'glass': '6dc2ca', 'glassd': '3d8a96', 'light': 'dad45e',
                            'stripe': 'd04648', 'tyre': '2a2430', 'hub': 'a0a0a8', 'chrome': 'deeed6', 'rust': '854c30', 'white': 'ffffff'})
PD = art.sprite_palette(1, {'outline': EDGE, 'skin': 'f0b898', 'skind': 'c88868', 'hair': 'e0409c', 'hairl': 'ff80c8', 'jacket': 'e8c030', 'jacketd': 'b08818',
                            'jeans': '3858a8', 'jeansd': '283c78', 'boot': '2a2430', 'white': 'ffffff', 'mic': 'a0a0a8'})
PZ = art.sprite_palette(2, {'outline': EDGE, 'skin': '58c8a0', 'skind': '389878', 'skinl': '88e8c0', 'eye': 'ffffff', 'shirt': '8a4cc8', 'shirtd': '5a2c98',
                            'gold': 'e8c030', 'antenna': 'ff80c8', 'keys': 'deeed6', 'keybd': '3a3a4a', 'stand': '6a6a78', 'blush': 'f088a0'})
PS = art.sprite_palette(3, {'outline': EDGE, 'skin': 'f0b898', 'skind': 'c88868', 'mohawk': '60d838', 'mohawkd': '38a018', 'tank': 'd04648', 'tankd': '9c2c34',
                            'drum': 'f0e8d0', 'drumd': 'c8b898', 'brass': 'e8c030', 'brassd': 'b08818', 'stick': 'd2aa70', 'stud': 'a0a0a8'})
PG = art.sprite_palette(4, {'outline': EDGE, 'skin': 'e0a890', 'skind': 'b87858', 'suit': '8a6040', 'suitd': '5a3c28', 'shirt': 'f0e8d0', 'tie': 'd04648',
                            'stache': '4a3020', 'paper': 'f0e8d0', 'paperd': 'c8b898', 'ink': '3a3a4a', 'shoe': '2a2430', 'cheek': 'e07860'})
PE = art.sprite_palette(5, {'outline': EDGE, 'brick': 'a8584c', 'brickd': '78382c', 'wood': '8a6040', 'woodd': '5a3c28', 'neonp': 'ff60c0', 'neonb': '60c8ff',
                            'gold': 'e8c030', 'curtain': 'c02848', 'curtaind': '801838', 'silver': 'c0c8d0', 'steel': '5880a8', 'steeld': '384c70', 'sign': 'f0e8d0', 'light': 'fff0a0'})
PF = art.sprite_palette(6, {'outline': EDGE, 'coin': 'e8c030', 'coind': 'b08818', 'coinl': 'fff0a0', 'spark': 'ffffff', 'cloud': '8895a8', 'cloudd': '5a6478',
                            'rain': '60a8e8', 'green': '50b848', 'red': 'd04648', 'heart': 'ff6090', 'bag': 'a8784c', 'bagd': '78502c'})
PM = art.sprite_palette(7, {'outline': EDGE, 'rust': 'a85a3c', 'rustl': 'd27d2c', 'sand': 'e8c878', 'cactus': '50b848', 'cactusd': '308028', 'pine': '30784c',
                            'pined': '20503c', 'trunk': '8a6040', 'tower': '8895a8', 'towerd': '5a6478', 'win': 'ffe880', 'palm': '60c860', 'palmd': '308828', 'sea': '60a8e8'})
# the cursor ring is gold: it borrows the fx palette's coin colour, so it lives in PF
S = lambda name, img, pal: art.sprite(name, img, pal=pal, region='spr')

def scene(name, img, pal, at, **kw):
    """A BG scene in region bg. ART_TRACE=1 prints what each one cost in tiles (the budget is tight: see the spec)."""
    before = len(art.used)
    try: art.scene(name, img, pal=pal, at=at, region='bg', **kw)
    finally:
        if os.environ.get('ART_TRACE'): print('  scene %-9s +%d tiles' % (name, len(art.used) - before))


# --- The cast ---
for f in (0, 1):
    S('van%d' % f, cast.van(PV, f), PV)
    S('dot%d' % f, cast.dot(PD, f), PD)
    S('zorp%d' % f, cast.zorp(PZ, f), PZ)
    S('spike%d' % f, cast.spike(PS, f), PS)
    S('grubb%d' % f, cast.grubb(PG, f), PG)
S('bar', cast.venue_bar(PE), PE); S('theatre', cast.venue_theatre(PE), PE); S('arena', cast.venue_arena(PE), PE)
for k in range(4): S('coin%d' % k, cast.coin(PF, k), PF); S('spark%d' % k, cast.sparkle(PF, k), PF)
for k in range(2): S('cloud%d' % k, cast.cloud(PF, k), PF); S('ring%d' % k, cast.cursor(PF, k), PF)
S('bag', cast.moneybag(PF), PF); S('star', cast.star(PF), PF)
for i in range(5): S('city%d' % i, cast.landmark(PM, i), PM)


# --- BG palettes. 1 is the night of the hub, the title and the ledger; city skylines tint four of its colours at run time. ---
NIGHT = art.palette(1, {'s0': '0c0a24', 's1': '16143c', 's2': '241e56', 's3': '382c6e', 'star': 'deeed6', 'ground': '1a1030', 'road': '34283c', 'dash': '8a7a5a',
                        'far': '2a2050', 'bld': '120c28', 'lit': 'ffe880', 'roof': 'ff60c0', 'gold': 'e8c030', 'goldd': 'b08818', 'rag': '8a7a6a'})
for role in ('s3', 'ground', 'bld', 'roof'): art.colors['t_' + role] = NIGHT.cgram(role)      # the entries the cities tint (ART.colors.t_bld ...)

# --- Scenes in Map RAM (cells): hubs 0 to 4 across the first row, then the title and the ledger ---
for i in range(5): scene('hub%d' % i, world.hub_scene(NIGHT, i), NIGHT, (32 * i, 0), solid=True)
scene('title', world.title_scene(NIGHT), NIGHT, (160, 0), solid=True)
scene('ledger', world.ledger_scene(NIGHT), NIGHT, (192, 0), solid=True)

MAPP = art.palette(2, {'ocean': '2c5a8a', 'oceand': '234a74', 'oceanl': '3d78aa', 'land': '5e9a4a', 'landd': '4e8a40', 'sand': 'd8c078', 'mount': '8a7a6a',
                       'mountl': 'e8e0d0', 'route': 'f0e8d0', 'forest': '2e6a3a', 'white': 'f0f8ff'})
BAR = art.palette(3, {'wall': '7a3c34', 'walld': '5c2824', 'mortar': '3c1e1e', 'floor': '2a1a1a', 'floorl': '4a3030', 'neonp': 'ff60c0', 'neonb': '60c8ff', 'wood': '8a6040',
                      'woodd': '5a3c28', 'black': '140c1c', 'stage': '6a4a38', 'sign': 'f0e8d0'})
THE = art.palette(4, {'wall': '3c1830', 'walld': '2a1020', 'floor': '5a3820', 'floorl': '7a5030', 'stage': '8a6040', 'stagel': 'a88050', 'spot': '7a6a58', 'curtain': 'c02848',
                      'curtaind': '801838', 'curtainl': 'e05068', 'gold': 'e8c030', 'goldd': 'b08818', 'shadow': '1a0c14', 'trim': 'f0e8d0'})
ARE = art.palette(5, {'dark': '10142a', 'darkl': '1c2448', 'stage': '586088', 'floor': '2c3450', 'floorl': '444e70', 'truss': 'a0a8b8', 'trussd': '687088', 'screen': '3858a8',
                      'screenl': '70a0e8', 'light': 'fff0a0', 'lA': 'ff6080', 'lB': '60c8ff', 'lC': '70e070', 'black': '0a0c18'})
CRO = art.palette(6, {'sil': '0c0a18', 'sil2': '1a1430', 'skin1': 'f0b898', 'skin2': 'c88868', 'skin3': '8a5a3c', 'skin4': 'e8c8a8', 'hair1': '3a2418', 'hair2': 'e8c030',
                      'hair3': 'c02848', 'shirt1': '60a8e8', 'shirt2': '50b848', 'shirt3': 'e8a030', 'shirt4': 'ff6090'})
for k, role in (('c3a', 'neonp'), ('c3b', 'neonb')): art.colors[k] = BAR.cgram(role)                       # entries the stage lights cycle (ART.colors.c3a ...)
for k, role in (('c4a', 'spot'),): art.colors[k] = THE.cgram(role)
for k, role in (('c5a', 'lA'), ('c5b', 'lB'), ('c5c', 'lC')): art.colors[k] = ARE.cgram(role)

PAP = art.palette(7, {'wall': 'd8b878', 'walld': 'b89858', 'wood': '8a6040', 'woodd': '5a3c28', 'floor': 'a07850', 'floorl': 'c09868', 'poster1': 'd04648', 'poster2': '4a78c8',
                      'poster3': 'e8c030', 'black': '2a2430', 'white': 'f0e8d0', 'dawn1': 'f8b870', 'dawn2': 'e87868', 'sun': 'fff0a0', 'hillp': '5a4878'})
scene('intro0', world.intro_room(PAP), PAP, (96, 28))
scene('intro1', world.intro_door(PAP), PAP, (128, 28))
scene('intro2', world.intro_road(PAP), PAP, (160, 28))
scene('map', world.map_scene(MAPP), MAPP, (224, 0), solid=True)
scene('stage0', world.stage_bar(BAR), BAR, (0, 28), solid=True)
scene('stage1', world.stage_theatre(THE), THE, (32, 28), solid=True)
scene('stage2', world.stage_arena(ARE), ARE, (64, 28), solid=True)
scene('crowdkit', world.crowd_kit(CRO), CRO, (192, 28))       # 8 heads, 2 x 2 cells each: code copies them into the crowd rows

art.write(sys.argv[1])
# The map's city positions are shared with code.js (ART.cityPos): the sprites and the road are drawn there.
code = os.path.join(sys.argv[1], 'code.js')
if os.path.exists(code): inject(code, art.constants() + '\nART.cityPos = %s;' % json.dumps([list(p) for p in world.CITY_POS]))
