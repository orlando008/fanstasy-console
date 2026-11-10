"""The art kit's recipe book: docs/dev/art-recipes.md, a page of pictures with the lines of art.py that made each.

    python3 tools/devkit/art/recipes.py            write docs/dev/art-recipes.md and its pictures (docs/dev/art-recipes/)
    python3 tools/devkit/art/recipes.py --check    exit 1 if a recipe fails, or the page or a picture is out of date

Each recipe below is a title, when to use it, and code that is run as it stands (with `from kit import *`, an `art`
and a `sheet` to show its results on: sheet.add(label, picture, palette), sheet.add_layers(label, [(picture, palette),
...])). The page shows the same code, so what the page says is what the kit does: change a recipe here, run this, and
commit the page and the pictures with it. CI runs --check. Add a recipe when a game works out something worth
keeping (a kind of character, a material, a way to build a scene).
"""
import os, sys, tempfile
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..'))
PAGE, PICS = os.path.join(ROOT, 'docs', 'dev', 'art-recipes.md'), os.path.join(ROOT, 'docs', 'dev', 'art-recipes')

RECIPES = [
('ramps', 'Colours as ramps', 'Always first. A sprite or a hill looks painted when each of its colours is a ramp (shades of one colour, dark to light), and far things are paler.', '''
pal = art.palette(1, {'grass': ramp('4a8a2e', 5), 'stone': ramp('7a7a8a', 4), 'brick': ramp('a04a38', 4)})
far = art.palette(2, {'hill': recede(ramp('4a8a2e', 4), 0.5, '9cd0ec')})     # the same green, pushed towards the sky
sheet.add('grass', ramp('4a8a2e', 5)); sheet.add('stone', ramp('7a7a8a', 4)); sheet.add('brick', ramp('a04a38', 4))
sheet.add('receded', recede(ramp('4a8a2e', 4), 0.5, '9cd0ec'))
'''),
('hero', 'A small hero that walks', 'The main character of most games: about 3 heads tall in a 32 px sprite. One Rig gives every frame in the same proportions and light.', '''
pal = art.sprite_palette(0, {'skin': ramp('e8a878', 4), 'hair': ramp('5a3a22', 3), 'shirt': ramp('d04648', 4), 'pants': ramp('3050a0', 4)})
hero = Rig('hero', height=26, skin=pal.skin, hair=pal.hair, shirt=pal.shirt, pants=pal.pants, shoes=pal.hair, margin=1)
frames = [STAND] + hero.animate(WALK, 8)[::2] + [JUMP, HIT]
for k, p in enumerate(frames):
    art.sprite('hero%d' % k, hero.render(p).fit(32, 32), pal=pal)     # feet on the bottom row, centred
    sheet.add(['stand', 'walk 1', 'walk 2', 'walk 3', 'walk 4', 'jump', 'hit'][k], hero.render(p), pal, scale=5)
'''),
('fighter', 'A big character with a face', 'A boss, a fighter, a portrait: 64 px and more, with the rig drawing the face, the hair and the folds in every frame.', '''
pal = art.sprite_palette(0, {'skin': ramp('d89868', 5), 'hair': ramp('30282c', 3), 'shirt': ramp('e8e8f0', 3), 'pants': ramp('3050a0', 4)})
big = Rig('brawler', height=72, skin=pal.skin, hair=pal.hair, shirt=pal.shirt, pants=pal.pants, shoes=pal.hair,
          face='angry', hair_style='swept', folds=True)
for name, p in [('guard', GUARD), ('punch', big.animate(PUNCH, 4)[2]), ('kick', big.animate(KICK, 4)[2])]:
    art.big_sprite(name, big.render(p), pal=pal)                       # bigger than 32 px: a big sprite, in parts
    sheet.add(name, big.render(p), pal, scale=3)
'''),
('sculpt', 'Things sculpted from shapes', 'A robot, a monster, a ball, a potion: anything rounded. Spheres, ellipsoids and capsules, lit, shaded and outlined by the kit; the details by hand after.', '''
pal = art.sprite_palette(1, {'brass': ramp('b07a2a', 5), 'glass': ramp('7ec8e8', 4), 'red': ramp('d04648', 4)})
bot = Sculpt(32, 32)
bot.sphere(16, 12, 0, 9, pal.brass)                                  # the head
bot.ellipsoid(16, 25, 0, 7, 5, 5, pal.brass)                         # the body
bot.capsule((9, 23, 2), (6, 28, 3), 2, 2, pal.brass)                 # an arm
bot.capsule((23, 23, 2), (26, 28, 3), 2, 2, pal.brass)
bot.sphere(12, 11, 8, 3, Mat(pal.glass, gloss=0.9), front=True)      # glass eyes, glossy
bot.sphere(20, 11, 8, 3, Mat(pal.glass, gloss=0.9), front=True)
robot = bot.render()
ball = Sculpt(16, 16); ball.sphere(8, 8, 0, 6.5, Mat(pal.red, gloss=0.9))
art.sprite('robot', robot, pal=pal); art.sprite('ball', ball.render(), pal=pal)
sheet.add('robot', robot, pal, scale=5); sheet.add('ball', ball.render(), pal, scale=5)
'''),
('shaded', 'A flat shape, shaded and outlined', 'A tree, a rock, a coin, a cloud: draw the silhouette, and let the kit light it along a ramp and outline it from its own colours.', '''
pal = art.sprite_palette(2, {'leaf': ramp('3a8a3a', 5), 'rock': ramp('8a8478', 5)})
crown = Img(32, 32); crown.disc(16, 13, 11, 1); crown.disc(9, 18, 7, 1); crown.disc(23, 18, 7, 1)     # a silhouette: any non-zero pixels
tree = outline_sel(shaded(crown, pal.leaf, kind='dome'), pal)
lump = Img(32, 24); lump.disc(12, 14, 9, 1); lump.disc(21, 15, 7, 1)
rock = outline_sel(shaded(lump, pal.rock, kind='dome', dither=0.4), pal)
art.sprite('tree', tree.fit(32, 32), pal=pal)
sheet.add('silhouette', crown, {1: '808080'}, scale=4); sheet.add('tree', tree, pal, scale=4); sheet.add('rock', rock, pal, scale=4)
'''),
('textures', 'Materials that fill an area', 'Ground, walls, floors, water: a texture repeats seamlessly, so a 64 x 64 patch covers a whole layer for a few tiles. Never fill an area with noise of your own.', '''
pal = art.palette(1, {'grass': ramp('4a8a2e', 4), 'brick': ramp('a04a38', 4), 'wood': ramp('7a4a26', 4)})
p2 = art.palette(2, {'stone': ramp('7a7a8a', 4), 'water': ramp('2a5a9a', 4), 'metal': ramp('8a8a96', 4)})
ground = Img(256, 64)
for x in range(0, 256, 64): ground.blit(texture('grass', 64, 64, pal.grass), x, 0)    # a strip of ground from one patch
art.scene('ground', ground, pal=pal, at=(0, 0), solid=True)
for kind, p, r in [('grass', pal, pal.grass), ('brick', pal, pal.brick), ('planks', pal, pal.wood),
                   ('stone', p2, p2.stone), ('water', p2, p2.water), ('metal', p2, p2.metal)]:
    sheet.add(kind, texture(kind, 64, 64, r), p, scale=2)
'''),
('landscape', 'A landscape in layers', 'An outdoor background: each layer its own picture (so they can scroll at different speeds), far ones receded towards the sky.', '''
sk = art.palette(1, {'sky': ramp('5a8ad0', 5), 'cloud': ramp('e8eef8', 3), 'sun': ramp('f0d060', 3)})
fa = art.palette(2, {'rock': recede(ramp('6a6a8a', 4), 0.4, '9cc0ec'), 'snow': ramp('e8f0f8', 2)})
ne = art.palette(3, {'hill': ramp('3a7a3a', 4), 'leaf': ramp('2a5a2a', 4)})
back = Img(256, 160); sky(back, sk.sky); orb(back, 200, 40, 12, sk.sun); clouds(back, sk.cloud, count=4, y0=10, y1=60)
mid = Img(256, 160); mountains(mid, fa.rock, base=120, height=60, snow=fa.snow)
front = Img(256, 160); hills(front, ne.hill, base=140, amp=14, period=128); treeline(front, ne.leaf, base=146, size=10)
art.scene('sky', back, pal=sk, at=(0, 0), solid=True); art.scene('mountains', mid, pal=fa, at=(32, 0)); art.scene('hills', front, pal=ne, at=(64, 0))
sheet.add_layers('three layers', [(back, sk), (mid, fa), (front, ne)], scale=2)
'''),
('room', 'A room', 'An indoor scene seen from the side: a wall of one material, a floor of another, a lit edge and a line of shadow where they meet.', '''
pal = art.palette(1, {'wood': ramp('7a4a26', 4), 'tile': ramp('8a8aa0', 4), 'dark': '181018'})
room = Img(256, 160)
wall, tiles = texture('planks', 64, 64, pal.wood, vertical=True), texture('paving', 64, 64, pal.tile)
for x in range(0, 256, 64):
    for y in range(0, 128, 64): room.blit(wall, x, y)
    room.blit(tiles, x, 112)                                           # the floor: the lower third
room.rect(0, 108, 256, 4, pal.dark); room.rect(0, 112, 256, 1, pal.tile[3])   # the skirting's shadow, the floor's lit edge
art.scene('room', room, pal=pal, at=(0, 0), solid=True)
sheet.add('room', room, pal, scale=2)
'''),
('lettering', 'A title and a HUD', "The game's name on the title screen, a life bar, a window: bevelled, outlined, shaded like a console game's, not plain text.", '''
pal = art.palette(1, {'gold': ramp('e0a030', 5), 'life': ramp('40c040', 4), 'metal': ramp('8a8aa0', 3), 'ink': '1c1020', 'shade': '2a2040', 'panel': '202848'})
title = big_text('STAR QUEST', pal.gold, scale=2, outline=pal.ink, shadow=pal.shade)
bar = hud_bar(96, 8, pal.life, fill=0.7, frame=pal.ink, empty=pal.shade)
box = frame(120, 48, pal.metal, fill=pal.panel)
logo = Img(256, 24); logo.blit(title, (256 - title.w) // 2, 1)
art.scene('logo', logo, pal=pal, at=(0, 0))                           # on its own layer, shown on the title
sheet.add('big_text', title, pal, scale=2); sheet.add('hud_bar', bar, pal, scale=3); sheet.add('frame', box, pal, scale=2)
'''),
('icons', 'Small icons by hand', 'The one place for pixels typed by hand: 8 and 16 px icons (a heart, a key, a cursor), where every pixel is a decision. Anything bigger: a recipe above.', '''
pal = art.sprite_palette(3, {'edge': '140c1c', 'red': ramp('d04648', 3), 'gold': ramp('dad45e', 3)})
K = {'o': pal.edge, 'd': pal.red[0], 'r': pal.red[1], 'l': pal.red[2], 'g': pal.gold[1], 'y': pal.gold[2]}
heart = Img.from_rows(['.oo.oo..', 'olroro..', 'orrrrdo.', 'orrrrdo.', '.orrdo..', '..odo...', '...o....', '........'], key=K)
key = Img.from_rows(['..oooo..', '.oyggyo.', '.og..go.', '.oyggyo.', '..oggo..', '..ogo...', '..oggo..', '..ooo...'], key=K)
art.sprite('heart', heart, pal=pal); art.sprite('key', key, pal=pal)
sheet.add('heart', heart, pal, scale=8); sheet.add('key', key, pal, scale=8)
'''),
]


def run(code, png):
    """Run a recipe's code and save what it showed. Returns nothing; raises what the code raises."""
    import kit
    ns = {}
    exec('from kit import *', ns)
    ns['art'] = ns['Art']()
    ns['art'].region('bg', 1, 639); ns['art'].region('spr', 640, 1023)
    ns['sheet'] = ns['Sheet'](scale=3)
    exec(code, ns)
    ns['sheet'].save(png)


def pixels(path):
    """A PNG's size and pixel data, uncompressed (two machines' zlib may pack the same picture differently)."""
    import struct, zlib
    d, i, head, data = open(path, 'rb').read(), 8, b'', b''
    while i < len(d):
        n, t = struct.unpack('>I', d[i:i + 4])[0], d[i + 4:i + 8]
        if t == b'IHDR': head = d[i + 8:i + 8 + n]
        if t == b'IDAT': data += d[i + 8:i + 8 + n]
        i += 12 + n
    return head, zlib.decompress(data)


def build(page, pics):
    os.makedirs(pics, exist_ok=True)
    out = ['# Art recipes', '',
           'How to draw the things games need with the art kit (`tools/devkit/art/`), each with its picture and the lines of',
           '`art.py` that made it. Start a new picture from the nearest recipe and change it; place pixels by hand only for',
           'the small icons of the last one. This page is written by `python3 tools/devkit/art/recipes.py` from the recipes',
           'in that file (CI checks it is up to date): to add one, add it there.', '',
           'Every recipe runs after `from kit import *` and `art = Art()` (with its `bg` and `spr` regions), as a cart\'s',
           '`art.py` does. `sheet.add(...)` is only how the recipe shows its picture here (`preview.py`: a `Sheet` works in',
           'an `art.py` too, to look at a picture before packing).', '']
    for rid, title, when, code in RECIPES:
        run(code, os.path.join(pics, rid + '.png'))
        shown = '\n'.join(l for l in code.strip().split('\n'))
        out += ['## ' + title, '', when, '', '![%s](art-recipes/%s.png)' % (title, rid), '', '```python', shown, '```', '']
    open(page, 'w').write('\n'.join(out))


if __name__ == '__main__':
    if '--check' in sys.argv:
        with tempfile.TemporaryDirectory() as d:
            build(os.path.join(d, 'page.md'), os.path.join(d, 'pics'))
            stale = [] if open(os.path.join(d, 'page.md')).read() == (open(PAGE).read() if os.path.exists(PAGE) else '') else ['docs/dev/art-recipes.md']
            for rid, *_ in RECIPES:
                a, b = os.path.join(d, 'pics', rid + '.png'), os.path.join(PICS, rid + '.png')
                if not os.path.exists(b) or pixels(a) != pixels(b): stale.append('docs/dev/art-recipes/%s.png' % rid)
        if stale: sys.exit('out of date: %s\nrun python3 tools/devkit/art/recipes.py and commit the page and its pictures' % ', '.join(stale))
        print('ok: %d recipes run, and the page and its pictures are up to date' % len(RECIPES))
    else:
        build(PAGE, PICS)
        print('wrote docs/dev/art-recipes.md and %d pictures' % len(RECIPES))
