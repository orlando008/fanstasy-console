"""Self-test of the art kit: drawing, palettes, tile sharing, scenes, sprites, the files it writes (packed by tools/pack.js
and read back), the code.js block, and the viewers (scene.mjs, sprites.mjs). CI runs it.

    python3 tools/devkit/art/selftest.py
"""
import ast, json, os, shutil, subprocess, sys, tempfile
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kit import *

fails = 0
def ok(cond, name, extra=''):
    global fails
    print('%s %s %s' % ('PASS' if cond else 'FAIL', name, extra))
    if not cond: fails += 1
def raises(fn, text=None):
    try: fn()
    except Exception as e: return text is None or text in str(e)
    return False
def node(*args):
    r = subprocess.run(['node'] + list(args), cwd=ROOT, capture_output=True, text=True)
    if r.returncode: raise RuntimeError(r.stderr or r.stdout)
    return r.stdout

# --- Img ---
im = Img.from_rows(['1..2', '.33.', '4..5'])
ok(im.w == 4 and im.h == 3 and im.px[0] == [1, 0, 0, 2] and im.px[1] == [0, 3, 3, 0], 'from_rows reads hex digits, with . as transparent')
ok(Img.from_rows(['#.'], key={'#': 7}).px == [[7, 0]], 'from_rows takes a key for other characters')
ok(im.flip_h().px[0] == [2, 0, 0, 1] and im.flip_v().px[0] == [4, 0, 0, 5] and im.flip_h().flip_h() == im, 'flips, and a flip twice is the picture')
r = im
for _ in range(4): r = r.rot90()
ok(r == im and im.rot90().w == 3 and im.rot90().h == 4, 'four quarter turns are the picture')
ok(im.rot90().px[0] == [4, 0, 1], 'rot90 turns clockwise', str(im.rot90().px[0]))
ok(im.crop(1, 0, 2, 2).px == [[0, 0], [3, 3]] and im.crop(3, 2, 3, 2).px == [[5, 0, 0], [0, 0, 0]], 'crop, and outside the picture is transparent')
a = Img(8, 8).line(0, 0, 7, 7, 5)
ok(all(a.px[i][i] == 5 for i in range(8)) and a.colors() == {5}, 'a diagonal line', '')
a = Img(8, 8).rect(1, 1, 4, 3, 2)
ok(sum(v == 2 for r in a.px for v in r) == 12, 'rect fills', '')
a = Img(8, 8).rect(0, 0, 8, 8, 3, fill=False)
ok(sum(v == 3 for r in a.px for v in r) == 28 and a.px[3][3] == 0, 'rect outline')
a = Img(9, 9).disc(4, 4, 3, 1)
ok(a.px[4][4] == 1 and a.px[4][1] == 1 and a.px[4][0] == 0 and a == a.flip_h() and a == a.flip_v(), 'a disc is symmetric')
a = Img(9, 9).ring(4, 4, 2, 3.5, 1)
ok(a.px[4][4] == 0 and a.px[4][1] == 1, 'a ring has a hole')
a = Img(8, 8).poly([(0, 0), (8, 0), (0, 8)], 4)
ok(a.px[0][0] == 4 and a.px[0][6] == 4 and a.px[6][0] == 4 and a.px[7][7] == 0 and a.px[4][4] == 0 and sum(v == 4 for r in a.px for v in r) == 28, 'a triangle (the pixels whose centres are inside it)')
a = Img.from_rows(['11.', '1.1', '.11']).fill(1, 1, 6)
ok(a.px[1][1] == 6 and a.px[0][0] == 1, 'flood fill fills only its region')
a = Img(5, 5).pset(2, 2, 7).outline(3)
ok(a.px[2][1] == 3 and a.px[1][2] == 3 and a.px[1][1] == 0 and a.px[2][2] == 7, 'outline is on the four sides only')
a = Img(4, 4, 1).blit(Img.from_rows(['2.', '.2']), 1, 1)
ok(a.px[1][1] == 2 and a.px[1][2] == 1 and a.px[2][2] == 2, 'blit leaves transparent pixels alone')
a = Img(16, 8); w = a.text('Hi', 0, 0, 5)
ok(w == 16 and a.colors() == {5} and not a.crop(0, 0, 8, 8).is_empty(), 'text uses the console font')
ok(raises(lambda: Img(2, 2).pset(0, 0, 16), '0 to 15') and raises(lambda: Img.make(2, 2, lambda x, y: 99), '0 to 15'), 'indices above 15 are refused')
ok(hsh(5) == hsh(5) and len({hsh(i) % 7 for i in range(50)}) == 7 and hsh(-3) == hsh(-3), 'hsh is deterministic and spreads')
ok(sum(dither(x, y, 8) for y in range(4) for x in range(4)) == 8 and not dither(0, 0, 0) and dither(0, 0, 16), 'ordered dither has the share asked for')

# --- Palettes ---
art = Art()
g = art.palette(1, {'dark': '442434', 'mid': '#854c30', 'light': (210, 125, 44)})
ok((g.dark, g.mid, g.light) == (1, 2, 3) and g.base == 16 and art.cgram[17] == '442434' and art.cgram[18] == '854c30' and art.cgram[19] == 'd27d2c', 'palette roles take entries 1.. of the sub-palette; hex forms are accepted')
h = art.sprite_palette(2, {'a': 'ffffff', 'b': '000000'}, at={'b': 9})
ok(h.base == 160 and h.a == 1 and h.b == 9 and art.cgram[169] == '000000', 'sprite palette 2 is CGRAM 160.., and roles can be pinned')
ok(raises(lambda: art.palette(1, {'x': '000000'}), 'already defined'), 'a palette cannot be defined twice')
ok(raises(lambda: art.palette(2, {'x': 'zz'}), 'rrggbb') and raises(lambda: Art().palette(2, {'x': '000000'}, at={'x': 0}), 'transparent') and raises(lambda: Art().palette(8, {}), '0 to 7'), 'bad colours, index 0 and sub-palette 8 are refused')
ok(raises(lambda: g.nope, 'no colour') and g['mid'] == 2 and g.cgram('light') == 19, 'an unknown role is an error; index and CGRAM lookups work')
b = Art(); b.palette(0, {'x': 'ffffff'})
ok(any('BG palette 0' in n for n in b.notes), 'defining BG palette 0 is reported (it is the overlay\'s)')

# --- Tiles ---
art = Art(); art.region('bg', 1, 15); art.region('spr', 16, 1023)
pal = art.palette(1, {'d': '000011', 'l': 'ffeeff'})
t1 = art.tile('wall', Img.make(8, 8, lambda x, y: pal.d if (x + y) % 2 else pal.l), pal=pal, region='bg')
t2 = art.tile('wall2', Img.make(8, 8, lambda x, y: pal.d if (x + y) % 2 else pal.l), region='bg')
ok(t1 == t2 == 1 and art.shared == 1, 'identical named tiles share a tile')
ok(art.tile('nothing', Img(8, 8)) == 0 and art.tiles['nothing'] == 0, 'an empty tile is tile 0')
ok(art.tile('pin', Img.make(8, 8, lambda x, y: pal.l), at=9) == 9, 'a tile can be pinned to a number')
ok(raises(lambda: art.tile('pin2', Img.make(8, 8, lambda x, y: pal.d), at=9), 'different tile'), 'but not onto a different tile')
ok(raises(lambda: art.tile('big', Img(16, 16)), 'tiles are 8x8') and raises(lambda: art.tile('wall', Img(8, 8)), 'already exists'), 'wrong size and duplicate names are refused')
ok(raises(lambda: art.tile('bad', Img.make(8, 8, lambda x, y: 9), pal=pal), 'does not define'), 'a colour the palette does not define is refused')
ok(raises(lambda: art.tile('badpal', Img.make(8, 8, lambda x, y: 1), pal=art.sprite_palette(0, {'q': 'ffffff'})), 'palette was given'), 'a sprite palette is not a tile palette')
small = Art(); small.region('bg', 1, 2)
small.tile('a', Img(8, 8, 1), region='bg'); small.tile('b', Img(8, 8, 2), region='bg')
ok(raises(lambda: small.tile('c', Img(8, 8, 3), region='bg'), 'out of tiles in region bg'), 'a full region is an error that names it')
ok(small.tile('a2', Img(8, 8, 1), region='bg') == 1, 'but a tile that is already there still fits (it is shared)')

# --- Scenes ---
art = Art(); pal = art.palette(2, {'a': '102030', 'b': 'a0b0c0'})
base = Img.make(8, 8, lambda x, y: pal.a if x < y else pal.b)
pic = Img(24, 16)
pic.blit(base, 0, 0).blit(base.flip_h(), 8, 0).blit(base.flip_v(), 16, 0).blit(base.flip_h().flip_v(), 0, 8).blit(base, 8, 8)
grid = art.scene('pic', pic, pal=pal, at=(3, 4))
ok(len(art.used) - 1 == 1 and art.shared == 4, 'a scene stores a tile once, whatever its flips', 'tiles %d shared %d' % (len(art.used) - 1, art.shared))
e = [art.entry(1, 2, fx, fy) for fx, fy in ((0, 0), (1, 0), (0, 1))]
ok(grid[0][:3] == e and grid[1][0] == art.entry(1, 2, 1, 1) and grid[1][1] == art.entry(1, 2) and grid[1][2] == 0, 'its map entries carry the palette and the flip bits', str([hex(v) for v in grid[0]]))
ok(art.map[4][3] == grid[0][0] and art.map[5][5] == 0 and art.scenes['pic'] == {'mx': 3, 'my': 4, 'w': 3, 'h': 2, 'pal': 2}, 'and are in Map RAM at the place asked, and in the manifest')
ok(raises(lambda: art.scene('hole', pic, pal=pal, solid=True, at=(10, 10)), 'not solid') , 'solid=True refuses an empty cell')
ok(raises(lambda: art.scene('over', Img(8, 8, pal.a), pal=pal, at=(3, 4)), 'overlaps'), 'a scene over another is refused')
ok(raises(lambda: art.scene('out', Img(16, 8, 1), pal=2, at=(255, 0)), 'outside Map RAM') and raises(lambda: art.scene('odd', Img(10, 8, 1), pal=2), 'multiple of 8'), 'outside the map and sizes that are not multiples of 8 are refused')
ok(raises(lambda: art.scene('badcol', Img(8, 8, 7), pal=pal, at=(0, 0)), 'does not define'), 'a scene colour the palette lacks is refused')
ok(art.scene('p3', Img(8, 8, 1), pal=3, at=(0, 20))[0][0] >> 10 & 7 == 3, 'a palette number is accepted in place of the palette')
ok(art.scene('prio', Img(8, 8, 1), pal=1, at=(1, 20), prio=1)[0][0] >> 15 == 1, 'priority is bit 15')

# --- Sprites ---
art = Art(); art.region('bg', 1, 255); art.region('spr', 256, 1023)
sp = art.sprite_palette(0, {'a': '123456'})
n1 = art.sprite('s16', Img.make(16, 16, lambda x, y: sp.a if x < 8 else 0), pal=sp, region='spr')
n2 = art.sprite('s8', Img.make(8, 8, lambda x, y: sp.a), pal=0, region='spr')
n3 = art.sprite('s32', Img.make(32, 32, lambda x, y: sp.a), pal=0, region='spr')
n4 = art.sprite('s16b', Img.make(16, 16, lambda x, y: sp.a), pal=0, region='spr')
ok(n1 == 256 and n2 == 258 and n3 % 4 == 0 and (n3 // 16) % 4 == 0 and n4 % 2 == 0 and (n4 // 16) % 2 == 0, 'sprites sit at aligned spots', '%d %d %d %d' % (n1, n2, n3, n4))
cells = lambda n, t: {n + j * 16 + i for j in range(t) for i in range(t)}
ok(not (cells(n1, 2) & cells(n3, 4)) and not (cells(n3, 4) & cells(n4, 2)) and not (cells(n2, 1) & cells(n1, 2)), 'and do not overlap')
ok(art._tile_at(n1).colors() == {1} and art._tile_at(n1 + 1).is_empty() and art._tile_at(n1 + 16).colors() == {1}, 'a 16 px sprite uses tiles n, n+1, n+16, n+17 (left half drawn, right half empty here)')
ok(art.sprites['s32'] == {'tile': n3, 'size': 32, 'pal': 0}, 'the manifest has tile, size and palette')
ok(raises(lambda: art.sprite('odd', Img(12, 12)), 'sprites are 8x8') and raises(lambda: art.sprite('rect', Img(16, 8)), 'sprites are 8x8'), 'only 8, 16 and 32 px squares')
ok(raises(lambda: art.sprite('c', Img.make(8, 8, lambda x, y: 5), pal=sp), 'does not define'), 'a sprite colour the palette lacks is refused')
ok(raises(lambda: art.sprite('pin', Img(16, 16, 1), at=256), 'overlaps') and art.sprite('pin2', Img(16, 16, 1), at=1000) == 1000 and raises(lambda: art.sprite('pin3', Img(16, 16, 1), at=1023), 'does not fit'), 'pinned sprites must be free and fit the sheet')
fr = art.frames('walk', [Img(8, 8, 1), Img.from_rows(['1.1.1.1.'] * 8)], pal=0, region='spr')
ok(len(fr) == 2 and 'walk0' in art.sprites and 'walk1' in art.sprites, 'frames makes name0, name1 ...')
small = Art(); small.region('tiny', 1, 3)
small.sprite('a', Img(8, 8, 1), region='tiny'); small.sprite('b', Img(8, 8, 1), region='tiny'); small.sprite('c', Img(8, 8, 1), region='tiny')
ok(raises(lambda: small.sprite('d', Img(8, 8, 1), region='tiny'), 'region tiny') and raises(lambda: small.sprite('e', Img(8, 8, 1), region='nope'), 'no region'), 'a full or unknown region is an error naming it')

# --- Files: written, packed and read back ---
work = tempfile.mkdtemp(prefix='art-selftest-')
try:
    art = Art(); art.region('bg', 1, 255); art.region('spr', 256, 1023)
    art.backdrop('140c1c')
    gp = art.palette(1, {'dark': '442434', 'mid': '854c30', 'light': 'd27d2c'})
    sp = art.sprite_palette(1, {'skin': 'd2aa99', 'cloth': '597dce'})
    art.color(113, 'ffffff', 'WHITE')
    tile = Img.make(8, 8, lambda x, y: gp.light if x == y else gp.mid)
    art.tile('diag', tile, pal=gp)
    hero = Img.make(16, 16, lambda x, y: sp.cloth if y > 7 else (sp.skin if 4 <= x < 12 else 0))
    art.sprite('hero', hero, pal=sp, region='spr')
    art.scene('field', Img.make(64, 32, lambda x, y: gp.dark if (x // 8 + y // 8) % 2 else gp.mid), pal=gp, at=(2, 3), solid=True)
    src = os.path.join(work, 'game'); os.makedirs(src)
    open(os.path.join(src, 'code.js'), 'w').write('// my game\n%s\nold stuff\n%s\nfunction update() {}\nfunction draw() { cls(); }\n' % (ART_BEGIN, ART_END))
    art.write(src, quiet=True)
    files = sorted(os.listdir(src))
    ok(files == ['art.json', 'code.js', 'map.txt', 'palette.txt', 'tiles.txt'], 'write makes tiles.txt, palette.txt, map.txt, art.json and rewrites code.js', str(files))
    code = open(os.path.join(src, 'code.js')).read()
    ok('old stuff' not in code and 'const ART = {' in code, 'the ART block is replaced')
    ok('"hero": {"pal": 1, "size": 16, "tile": 256}' in code and 'tiles: {"diag": 1}' in code and 'colors: {"WHITE": 113}' in code and 'scenes: {"field": {"h": 4, "mx": 2, "my": 3, "pal": 1, "w": 8}}' in code, 'with the tile numbers, sprites, scenes and named colours', code.split(chr(10))[2:6].__repr__())
    ok(code.startswith('// my game\n') and code.rstrip().endswith('function draw() { cls(); }'), 'the code around the ART block is untouched')
    first = {f: open(os.path.join(src, f), 'rb').read() for f in files}
    art.write(src, quiet=True)
    ok(all(open(os.path.join(src, f), 'rb').read() == first[f] for f in files), 'writing again changes nothing')
    ok(raises(lambda: inject(os.path.join(src, 'art.json'), 'x'), 'needs exactly one'), 'inject refuses a file without the markers')
    open(os.path.join(src, 'code.js'), 'w').write('// no markers\n')
    ok(raises(lambda: art.write(src, quiet=True), 'needs exactly one'), 'and write refuses a code.js without the markers')
    open(os.path.join(src, 'code.js'), 'w').write('%s\n%s\n' % (ART_BEGIN, ART_END)); art.write(src, quiet=True)
    open(os.path.join(src, 'meta.json'), 'w').write('{"title": "Selftest"}')
    out = os.path.join(work, 'game.nova')
    node('tools/pack.js', src, out)
    ok(os.path.exists(out), 'tools/pack.js packs the files')
    ok(node('tools/devkit/tiles.mjs', out, '--ascii', '1').split('\n')[:8] == tile.rows(), 'tile 1 reads back from the packed cart as drawn')
    ok(node('tools/devkit/tiles.mjs', out, '--ascii', '256').split('\n')[:8] == ['....1111'] * 8 and node('tools/devkit/tiles.mjs', out, '--ascii', '257').split('\n')[:8] == ['1111....'] * 8 and node('tools/devkit/tiles.mjs', out, '--ascii', '272').split('\n')[:8] == ['22222222'] * 8, 'the 16 px sprite\'s tiles are at n, n+1, n+16 in the packed cart')
    # palette, map and tiles, read through the console's own cart reader
    probe = os.path.join(work, 'probe.mjs')
    open(probe, 'w').write("""import { readFileSync } from 'node:fs';
import { readNova } from '%s/src/formats/nova-json.js';
const c = readNova(readFileSync(process.argv[2], 'utf8'));
const e = (v) => { const x = (n) => (n << 3) | (n >> 2); return [x(v & 31), x((v >> 5) & 31), x((v >> 10) & 31)]; };
const out = { pal: Object.fromEntries([0, 17, 18, 19, 113, 145, 146].map((i) => [i, e(c.palette[i])])), map: [c.map[3 * 256 + 2], c.map[3 * 256 + 3], c.map[4 * 256 + 2], c.map[3 * 256 + 1]],
  px: [0, 1, 2, 3].map((t) => Array.from({ length: 8 }, (_, y) => Array.from({ length: 8 }, (_, x) => c.tiles[(Math.floor(t / 16) * 8 + y) * 128 + (t %% 16) * 8 + x]).join('')).join('/')) };
console.log(JSON.stringify(out));""" % ROOT)
    got = json.loads(node(probe, out))
    def rgb555(h):
        n = int(h, 16); r, g_, b_ = (n >> 19) & 31, (n >> 11) & 31, (n >> 3) & 31
        return [(v << 3) | (v >> 2) for v in (r, g_, b_)]
    ok(got['pal']['17'] == rgb555('442434') and got['pal']['19'] == rgb555('d27d2c') and got['pal']['0'] == rgb555('140c1c') and got['pal']['113'] == rgb555('ffffff') and got['pal']['145'] == rgb555('d2aa99'), 'the palette arrives with the console\'s RGB555 rounding, the backdrop at 0, the overlay colour at 113 and sprite palette 1 at 144..')
    ok(got['map'][3] == 0 and got['map'][0] & 1023 == 2 and got['map'][1] & 1023 == 3 and got['map'][0] >> 10 & 7 == 1 and got['map'][2] & 1023 == 3, 'the map arrives at the place asked, with palette 1 and the tiles of the picture, and is empty beside it', str(got['map']))
    ok(got['px'][0] == '/'.join(['00000000'] * 8) and got['px'][2] == '/'.join(['22222222'] * 8) and got['px'][3] == '/'.join(['11111111'] * 8), 'tile 0 is empty and the scene\'s solid tiles are as drawn in the packed cart')
    # the viewers
    scene_png = os.path.join(work, 'scene.png'); spr_png = os.path.join(work, 'sprites.png')
    node('tools/devkit/art/scene.mjs', out, scene_png, '--rect', '2,3,8,4', '--scale', '2')
    node('tools/devkit/art/sprites.mjs', out, spr_png, '--tile', '256', '--size', '16', '--pal', '1', '--scale', '4')
    def ascii_rows(text):
        """The rows and the key that sprites.mjs --ascii prints, rulers cut off."""
        cut = [l.split() for l in text.split('\n')]
        w = next(len(c[0]) for c in cut if len(c) == 1 and c[0].isdigit())   # the x ruler's units line
        rows = [c[1] for c in cut if len(c) == 2 and c[0].isdigit() and len(c[1]) == w]
        keys = [ast.literal_eval(' '.join(c)[4:]) for c in cut if c and c[0].startswith('key=')]
        return rows, keys[0] if keys else {}
    rows, key = ascii_rows(node('tools/devkit/art/sprites.mjs', out, '--ascii', '--tile', '256', '--size', '16'))
    ok(Img.from_rows(rows, key=key) == hero and not key, 'sprites.mjs --ascii --tile prints a sprite as hex rows that from_rows reads back as drawn', str(rows[:2]))
    text_ = node('tools/devkit/art/sprites.mjs', 'carts/ice-breakers.nova', '--ascii', 'gem0')
    rows, key = ascii_rows(text_)
    tiles_ = [node('tools/devkit/tiles.mjs', 'carts/ice-breakers.nova', '--ascii', str(t)).split('\n')[:8] for t in (256, 257, 272, 273)]
    gem = Img.from_rows([tiles_[0][y] + tiles_[1][y] for y in range(8)] + [tiles_[2][y] + tiles_[3][y] for y in range(8)])
    ok(Img.from_rows(rows, key=key) == gem and 'e edge' in text_ and '0123456789012345' in text_, 'sprites.mjs --ascii <name> prints role letters with rulers and a legend, and its key reads it back', str(key))
    px = os.path.join(work, 'px.mjs')
    open(px, 'w').write("""import { readFileSync } from 'node:fs';
import { decodePng } from '%s/tools/devkit/pngcart.mjs';
const { width, height, px } = decodePng(readFileSync(process.argv[2]));
console.log(JSON.stringify({ width, height, at: process.argv.slice(3).map((p) => { const [x, y] = p.split(',').map(Number); const o = (y * width + x) * 4; return [px[o], px[o + 1], px[o + 2]]; }) }));""" % ROOT)
    view = json.loads(node(px, scene_png, '3,13', '20,13', '3,30'))
    ok(view['width'] == 8 * 8 * 2 and view['height'] == 4 * 8 * 2 + 10, 'scene.mjs makes a PNG of the region at the scale asked', '%dx%d' % (view['width'], view['height']))
    ok(view['at'] == [rgb555('854c30'), rgb555('442434'), rgb555('442434')], 'and draws the scene\'s tiles in their palette (mid, dark, dark at three places)', str(view['at']))
    sview = json.loads(node(px, spr_png, '10,60', '30,40', '4,26'))
    ok(sview['at'][0] == rgb555('597dce') and sview['at'][1] == rgb555('d2aa99') and sview['at'][2] in ([0x2a] * 3, [0x34] * 3), 'sprites.mjs draws a 16 px sprite from tile n in sprite palette 1 (cloth, skin, and a checker where transparent)', str(sview['at']))
    # a full sheet: a tile in the last place, the file must still pack
    full = Art(); fp = full.palette(1, {'a': 'ffffff'}); full.tile('last', Img(8, 8, 1), at=1023)
    fdir = os.path.join(work, 'full'); os.makedirs(fdir); full.write(fdir, quiet=True)
    node('tools/pack.js', fdir, os.path.join(work, 'full.nova'))
    ok(len(open(os.path.join(fdir, 'tiles.txt')).read().split('\n')) <= 513, 'a tile in the last place of the sheet still packs (512 rows)')
    # the overlay warning and the report
    rep = art.report()
    ok('tiles: ' in rep and 'region bg' in rep and 'sprites: 1' in rep, 'the report lists the budget by region')
finally:
    shutil.rmtree(work, ignore_errors=True)

print('\n%s' % ('SOME FAILED' if fails else 'ALL PASS'))
sys.exit(1 if fails else 0)
