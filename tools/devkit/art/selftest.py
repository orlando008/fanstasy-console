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

# --- Colour: OKLab, ramps, palettes of ramps (colour.py) ---
ok(all(abs(a - b) < 1e-6 for a, b in zip(oklab('ffffff'), (1, 0, 0))) and from_oklab(*oklab('597dce')) == '597dce', 'OKLab: white is L 1, and a colour goes there and back')
ok(console('4a8a2e') == '4a8c29' and console('ffffff') == 'ffffff' and console('000000') == '000000', 'console() is the colour cut to 5 bits a channel, as the console shows it')
r = ramp('4a8a2e', 5)
Ls = [lch(c)[0] for c in r]
ok(len(r) == 5 and all(b - a > 0.05 for a, b in zip(Ls, Ls[1:])) and all(console(c) == c for c in r), 'a ramp: 5 steps, dark to light, each clearly lighter, all in console colour', ramp_report(r))
ok(r[r.base] == console('4a8a2e'), 'and the base colour is in it, where ramp().base says')
ok(lch(r[0])[2] > lch(r[r.base])[2] + 3 and lch(r[-1])[2] < lch(r[r.base])[2] - 3, 'its hue turns cool (towards violet) in the shadows and warm in the light', ' '.join('%.0f' % lch(c)[2] for c in r))
gold = ramp('f0d000', 5)
ok(all(lch(c)[2] < 110 for c in gold) and lch(gold[0])[0] < 0.4, 'a yellow ramp darkens through orange and reaches deep shadows (a light base sits at the top)', ' '.join('%.0f' % lch(c)[2] for c in gold))
skin = ramp('d2aa99', 5)
ok(lch(skin[1])[1] >= lch(skin[skin.base])[1] * 0.9, 'shadows keep their chroma (a grey shadow reads as mud)', '%.3f %.3f' % (lch(skin[1])[1], lch(skin[skin.base])[1]))
ok(all(a != b for a, b in zip(ramp('808080', 8, step=0.01), ramp('808080', 8, step=0.01)[1:])), 'steps never come out equal on the console, even when asked to be tiny')
ok(len(set(gradient('000000', 'ffffff', 5))) == 5 and gradient('000000', 'ffffff', 5)[0] == '000000', 'gradient: n colours from a to b')
far = recede(r, 0.6, haze='a0c8f0')
ok(isinstance(far, Ramp) and max(lch(c)[0] for c in far) - min(lch(c)[0] for c in far) < Ls[-1] - Ls[0] and sum(lch(c)[1] for c in far) < sum(lch(c)[1] for c in r), 'recede: less contrast and less chroma, still a ramp')
rp = Art().palette(1, {'grass': r, 'sky': '7ec0ee', 'dirt': ramp('854c30', 3)})
ok(rp.grass == (1, 2, 3, 4, 5) and rp.sky == 6 and rp.dirt == (7, 8, 9) and rp.grass0 == 1 and rp.hex_of(3) == r[2], 'a palette takes ramps: roles grass0.. and pal.grass, their indices dark to light')
ok(rp.step(rp.grass[2], -1) == 2 and rp.step(rp.grass[4], 1) == 5 and rp.step(rp.sky, 1) == rp.sky and rp.step(0, 1) == 0, 'pal.step: along its ramp, stopping at the ends; others unchanged')
ok(raises(lambda: Art().palette(1, {'a': ramp('ff0000', 8), 'b': ramp('00ff00', 8)}), 'holds 15'), 'more than 15 colours in a sub-palette is an error')

# --- Shading and edges (shade.py), sculpting (sculpt.py), mirrors and variants ---
sq = Img(9, 9).rect(1, 1, 7, 7, 1)
d = inner_distance(sq)
ok(d[4][4] == 4 and d[1][1] == 1 and d[0][0] == 0, 'inner_distance: the distance to the nearest pixel outside', str([d[4][4], d[1][1], d[0][0]]))
spal = Art().sprite_palette(0, {'g': ramp('4a8a2e', 5), 'red': ramp('d04648', 4), 'eye': 'ffffff'})
ball = Img(24, 24).disc(11.5, 11.5, 10, 1)
sh = shaded(ball, spal.g)
ok(sh.colors() <= set(spal.g) and sh.get(5, 5) > sh.get(18, 18), 'shaded: a disc lit from the upper left, in its ramp: lighter at the upper left than the lower right', '%d %d' % (sh.get(5, 5), sh.get(18, 18)))
ok(all(shaded(ball, spal.g, kind=k).colors() <= set(spal.g) for k in ('dome', 'pillow', 'cone', 'cylinder-x', 'cylinder-y', 'flat')), 'every kind of shading stays in its ramp')
ok(shaded(ball, spal.g, kind='cylinder-x').get(11, 3) > shaded(ball, spal.g, kind='cylinder-x').get(11, 20), 'cylinder-x: lit along its top')
ol = outline_sel(sh, spal)
ok(ol.get(11, 1) == spal.g[1] and ol.get(22, 11) == spal.g[0], 'outline_sel: around the outside, the darkest step of the ramp it touches, one lighter on the lit side', '%d %d' % (ol.get(11, 1), ol.get(22, 11)))
il = inline(sh, spal)
ok(sum(1 for r in il.px for v in r if v) == sum(1 for r in sh.px for v in r if v) and il.get(21, 11) == spal.g[0], 'inline: the edge itself darkened, and the sprite does not grow')
ok(rim(il, spal, light=(1, 0)).get(21, 11) == spal.g[1], 'rim: the edge facing a second light one step lighter')
el = Img(5, 5).pset(0, 2, 1).pset(1, 2, 1).pset(1, 1, 1).pset(2, 1, 1)
ok(clean_lines(el, 1).get(1, 2) == 0 or clean_lines(el, 1).get(1, 1) == 0, 'clean_lines: the corner of an L in a 1 px line is removed')
ok(despeckle(Img.from_rows(['111', '121', '111'])).get(1, 1) == 1 and despeckle(Img.from_rows(['111', '121', '111']), keep=(2,)).get(1, 1) == 2, 'despeckle: a lone pixel takes its neighbours\' colour, unless kept')
half = Img.from_rows(['12', '3.'])
ok(mirrored(half).rows() == ['1221', '3..3'] and mirrored(half, odd=True).rows() == ['121', '3.3'] and mirrored(half, axis='y').rows() == ['12', '3.', '3.', '12'], 'mirrored: the whole picture from its left (or top) half, with an odd centre if asked')
ok(Img.from_rows(['ab'], key={'a': 1, 'b': 2}, mirror='x').rows() == ['1221'], 'from_rows(mirror=\'x\') writes only the left half')
ok(recolour(sh, {spal.g: (spal.red + (spal.red[-1],))}).colors() <= set(spal.red), 'recolour: a ramp onto a ramp of the same length')
va = Art(); vp = va.sprite_palette(0, {'shirt': ramp('3050c0', 3), 'coat': ramp('d04648', 3)})
va.sprite('hero', Img(16, 16).rect(2, 2, 12, 12, vp.shirt[1]), pal=vp)
va.variant('hero2', 'hero', swap={'shirt': 'coat'})
ok(va._tile_at(va.sprites['hero2']['tile']).get(4, 4) == vp.coat[1] and va.sprites['hero2']['pal'] == 0, 'Art.variant: a recoloured copy of a sprite, registered as its own')
sc = Sculpt(32, 32)
sc.sphere(16, 16, 0, 10, spal.g).sphere(16, 16, 12, 4, spal.red)
ri = sc.render()
ok(ri.get(16, 16) in spal.red and ri.get(10, 10) in spal.g and ri.get(0, 0) == 0, 'Sculpt: the nearest surface wins (a small red ball in front of a big green one)')
ok(ri.get(16, 6) == spal.g[0] or ri.get(16, 6) == spal.g[1], 'and the edge is outlined in the ramp\'s darkest steps')
cont = Sculpt(32, 32).sphere(16, 16, 0, 10, spal.g).sphere(20, 16, 14, 5, spal.g).render()
ok(cont.get(14, 16) == spal.g[0], 'contours: a part in front of another of the same colour is outlined where it passes over it', str(cont.get(14, 16)))
merged = Sculpt(32, 32).sphere(13, 16, 0, 7, spal.g).sphere(19, 16, 0, 7, spal.g, smooth=4).render()
ok(merged.get(16, 16) != spal.g[0], 'smooth=k blends two shapes into one surface, with no contour between them')
gl = Sculpt(24, 24).sphere(12, 12, 0, 10, Mat(spal.red, gloss=0.9)).render()
ok(spal.red[-1] in gl.colors(), 'a glossy material gets a highlight in its lightest step')
split = Sculpt(24, 24).sphere(12, 12, 0, 10, spal.g).sphere(12, 12, 8, 4, Art().sprite_palette(3, {'b': ramp('3050c0', 4)}).b).render()
ok(isinstance(split, dict) and sorted(split) == [0, 3], 'parts in different palettes render as one picture for each palette (a big sprite in several palettes)')
lim = Sculpt(40, 20).capsule((5, 10, 0), (35, 10, 0), 5, 3, spal.g).render(outline=None, dither=0)
ok(len({lim.get(x, 8) for x in range(10, 30)}) <= 2, 'a capsule is smooth along its length (no stripes)', str([lim.get(x, 8) for x in range(10, 30)]))

# --- Textures (texture.py) ---
tr = (1, 2, 3, 4, 5)
KINDS = ('grass', 'dirt', 'sand', 'snow', 'stone', 'brick', 'paving', 'tiles', 'planks', 'bark', 'leaves', 'water', 'metal', 'fence', 'rope')
texs = {k: texture(k, 32, 16, tr, seed=2) for k in KINDS}
ok(all(t.colors() <= set(tr) for t in texs.values()), 'every texture stays in its ramp', ', '.join(k for k, t in texs.items() if not t.colors() <= set(tr)))
ok(all(len(t.colors()) >= 3 for t in texs.values()), 'and uses at least three of its steps (not flat)', ', '.join(k for k, t in texs.items() if len(t.colors()) < 3))
ok(abs(noise(0, 5, 8, 1, (32, 32)) - noise(32, 5, 8, 1, (32, 32))) < 1e-9 and abs(noise(5, 0, 8, 1, (32, 32)) - noise(5, 32, 8, 1, (32, 32))) < 1e-9, 'noise with a period repeats exactly')
br = texture('brick', 32, 16, tr)
ok(br.get(15, 3) == tr[0] and br.get(3, 7) == tr[0], 'brick: the mortar is the darkest step')
ok(0 in texture('fence', 16, 16, tr).px[3], 'fence: transparent between the wires')
vs = variants('dirt', tr, 4, size=8, seed=1)
ok(len(vs) == 4 and all(v.px[0] == vs[0].px[0] and [r[0] for r in v.px] == [r[0] for r in vs[0].px] for v in vs) and len({v.key() for v in vs}) > 1, 'variants: different inside, the same edges (so they join in any order)')
tf = tile_fill(64, 32, vs, seed=3)
ok(tf.w == 64 and len({tf.crop(x, y, 8, 8).key() for y in range(0, 32, 8) for x in range(0, 64, 8)}) > 1, 'tile_fill: an area covered by the variants in a mixed order')
try: texture('lava', 8, 8, tr); bad_kind = False
except ValueError as e: bad_kind = 'no kind' in str(e)
ok(bad_kind, 'an unknown kind is an error that lists the kinds')

# --- Scenery (scenery.py) ---
sr = (1, 2, 3, 4)
skyi = sky(Img(16, 40), sr)
ok([skyi.get(0, y) for y in (0, 39)] == [1, 4] and skyi.get(0, 5) == 1 and len(set(skyi.px[5])) == 1, 'sky: bands from the ramp\'s first step at the top to its last, solid inside a band')
ok(any(len(set(r)) > 1 for r in skyi.px), 'and dithered where one band meets the next')
st = stars(Img(64, 64), [2, 3], density=0.02)
ok(sum(1 for r in st.px for v in r if v) >= 60 and st.colors() <= {2, 3}, 'stars: dots in the given colours')
o = orb(Img(48, 48), 24, 24, 8, sr, glow=(1, 2))
ok(o.get(24, 24) == 4 and o.get(24, 35) in (1, 2), 'orb: a sun lightest in the middle, with a glow around it')
cl = clouds(Img(128, 64), sr, count=3, y0=4, y1=60)
ok(cl.colors() <= set(sr) and sum(1 for r in cl.px for v in r if v) > 200, 'clouds: lit cumulus in the ramp')
mt = Img(128, 96)
ridge = mountains(mt, sr, base=90, height=60, snow=(5, 6))
ok(len(ridge) == 128 and min(ridge) < 50 and all(mt.get(x, 92) == 0 for x in range(128)) and {5, 6} & mt.colors(), 'mountains: a ridge above the base, snow on the upper faces, nothing below the base')
ok(abs(ridge[0] - ridge[-1]) <= 6, 'and the range wraps: its two ends meet (a scrolling layer)', '%d %d' % (ridge[0], ridge[-1]))
hl = Img(64, 32); crest = hills(hl, sr, base=24, amp=10)
ok(all(hl.get(x, 31) for x in range(64)) and all(hl.get(x, crest[x] - 1) == 0 for x in range(64) if crest[x] > 0), 'hills: filled from the crest down')
tl = treeline(Img(96, 48), sr, base=36, size=8)
ok(all(tl.get(x, 40) == sr[0] for x in range(96)), 'treeline: crowns along the line, the ground below filled')
fl = floor(Img(64, 64), texture('tiles', 16, 16, sr, size=8), horizon=20)
ok(all(fl.get(x, 10) == 0 for x in range(64)) and all(fl.get(x, 63) for x in range(64)), 'floor: a texture below the horizon only')
rp_ = rope(Img(64, 16), [(2, 8), (62, 8)], 4, sr)
ok(rp_.get(30, 8) and not rp_.get(30, 1), 'rope: drawn along its path')
ok(ellipse(16, 6, 3).get(8, 3) == 3 and ellipse(16, 6, 3).get(0, 0) == 0, 'ellipse: a contact shadow')

# --- Lettering (lettering.py) ---
lt = big_text('AB', (1, 2, 3, 4), scale=2, outline=5, shadow=6)
ok(lt.w >= 32 and {1, 2, 3, 4, 5, 6} >= lt.colors() and 5 in lt.colors() and 6 in lt.colors(), 'big_text: the font at twice the size, filled from the ramp, outlined and shadowed')
diag = scale2x(Img.from_rows(['1..', '11.', '111']))
ok(diag.get(2, 1) == 1 and diag.get(4, 3) == 1 and diag.get(3, 0) == 0, 'scale2x rounds a diagonal edge (the steps are filled in, as repeating pixels would not)', str(diag.rows()))
hb = hud_bar(20, 6, (1, 2, 3), fill=0.5, frame=4, empty=5)
ok(hb.get(0, 0) == 4 and hb.get(15, 3) == 5 and hb.get(4, 3) in (1, 2, 3), 'hud_bar: a frame, the full part shaded, the rest empty')
fr = frame(20, 12, (1, 2, 3), fill=7)
ok(fr.get(10, 6) == 7 and fr.get(0, 0) == 1, 'frame: a bevelled border around a filled inside')

# --- The rig (rig.py): a skeleton, poses, animation, the filmstrip ---
ra = Art(); rp = ra.sprite_palette(0, {'skin': ramp('e8a878', 4), 'shirt': ramp('e8e8f0', 3), 'pants': ramp('3050a0', 3), 'shoe': ramp('503030', 2)})
rg = Rig('brawler', height=64, skin=rp.skin, shirt=rp.shirt, pants=rp.pants, shoes=rp.shoe)
J0, J1 = rg.joints(STAND), rg.joints(pose(STAND, arm_n=90))
ok(abs(J0['hand_n'][0] - J0['shoulder_n'][0]) < 1 and J1['hand_n'][0] > J1['shoulder_n'][0] + 15, 'joints: an arm hangs at 0 and points forward at 90 degrees')
ok(abs(J0['toe_n'][1] - (rg.margin + rg.height)) < 4, 'standing, the feet are on the ground line', str(J0['toe_n']))
fr = rg.render(GUARD)
ok(fr.w == rg.w and fr.colors() <= set(rp.skin + rp.shirt + rp.pants + rp.shoe) and len(fr.colors()) >= 6, 'render: a figure in its materials\' ramps')
walk = rg.animate(WALK, 8)
ok(len(walk) == 8 and walk[4]['thigh_n'] == WALK[0]['thigh_f'] and walk[0]['thigh_n'] == WALK[0]['thigh_n'], 'animate: a walk loops through its keys and then the same with the sides swapped', str((walk[0]['thigh_n'], walk[4]['thigh_n'])))
pn = rg.animate(PUNCH, 4, loop=False)
ok(pn[2]['arm_n'] == PUNCH[2]['arm_n'], 'with one frame a key, each frame is a key (the punch lands)')
ok(raises(lambda: rg.animate(PUNCH, 3, loop=False), 'skip'), 'fewer frames than keys is an error (a key would be skipped)')
ok(mirror_sides({'arm_n': 1, 'arm_f': 2, 'lean': 3}) == {'arm_f': 1, 'arm_n': 2, 'lean': 3} and pose(GUARD, arm_n=1)['arm_n'] == 1 and pose(GUARD, arm_n=1)['lean'] == GUARD['lean'], 'mirror_sides swaps near and far; pose() changes a pose')
before = len(ra.used)
names = ra.animation('walk', [rg.render(p) for p in walk], pal=rp, region=None)
cost = len(ra.used) - before
one = Art(); one.sprite_palette(0, {'skin': ramp('e8a878', 4), 'shirt': ramp('e8e8f0', 3), 'pants': ramp('3050a0', 3), 'shoe': ramp('503030', 2)})
single = len(one.used); one.big_sprite('f', rg.render(walk[0]), pal=0); single = len(one.used) - single
ok(names == ['walk%d' % k for k in range(8)] and ra.anims['walk'] == names and cost < single * 8 * 0.9, 'Art.animation: the frames as big sprites, sharing the pieces that do not change', '%d tiles for 8 frames, %d for one' % (cost, single))
fsp = os.path.join(tempfile.mkdtemp(), 'f.png'); filmstrip(fsp, rg, walk[:3], rp)
ok(open(fsp, 'rb').read(8) == b'\x89PNG\r\n\x1a\n', 'filmstrip writes a PNG')

# --- The hand-drawn layer (detail.py) ---
dp = Art().sprite_palette(0, {'skin': ramp('e8a878', 5), 'hair': ramp('6a3a20', 4), 'white': 'f8f8f0'})
def hd():
    return Sculpt(32, 34).ellipsoid(16, 18, 0, 10, 11, 10, dp.skin).render(contours=3)
plain = hd()
fc = face(hd(), 16, 18, 10, dp.skin, view='front', expression='neutral', white=dp.white)
ok(fc.colors() <= set(dp.skin) | {dp.white} and sum(1 for r in fc.px for v in r if v == dp.white) >= 8, 'face: two eyes with whites (front, r 10), in the skin and white only')
ok(fc.get(16, 30) == plain.get(16, 30) and fc.get(0, 0) == 0, 'and it draws only on the face, never outside the head')
hurt = face(hd(), 16, 18, 10, dp.skin, view='front', expression='hurt', white=dp.white)
ok(sum(1 for r in hurt.px for v in r if v == dp.white) < 4, 'hurt: the eyes are shut (no whites)')
side = face(hd(), 16, 18, 10, dp.skin, view='side', expression='angry', white=dp.white)
ok(any(side.get(x, y) == dp.white for x in range(18, 24) for y in range(15, 22)), 'side: the eye is towards the front of the head')
for st in ('short', 'spiky', 'swept', 'mohawk', 'long', 'bald'):
    hh = hair(hd(), 16, 17, 10, dp.hair, style=st, view='side')
    ok(st == 'bald' or (set(dp.hair) & hh.colors()) and sum(1 for r in hh.px for v in r if v in dp.hair) > 40, 'hair %s: drawn in the hair ramp' % st)
lh = hair(Img(48, 60), 24, 17, 10, dp.hair, style='long', view='side')
ok(max(y for y in range(60) for x in range(48) if lh.px[y][x]) > 30, 'long hair hangs below the head')
ok(raises(lambda: hair(hd(), 16, 17, 10, dp.hair, style='afro'), 'styles are'), 'an unknown hair style is an error that lists them')
cl = Img(20, 10).rect(0, 0, 20, 10, dp.skin[2])
crease(cl, dp.skin, [(2, 5), (18, 5)])
ok(cl.get(10, 5) < dp.skin[2] and cl.get(10, 4) > dp.skin[2] and cl.get(10, 8) == dp.skin[2], 'crease: a dark line with a lit edge on the light\'s side, the rest untouched')
on_only = Img(20, 10).rect(0, 0, 10, 10, dp.skin[2]); stroke(on_only, dp.skin, [(0, 5), (19, 5)], -1)
ok(on_only.get(15, 5) == 0 and on_only.get(5, 5) == dp.skin[1], 'stroke changes only pixels of its ramp')
rgd = Rig('brawler', height=64, skin=dp.skin, hair=dp.hair, face='angry', hair_style='swept', folds=True, white=dp.white)
ok(set(dp.hair) & rgd.render(GUARD).colors() and dp.white in rgd.render(GUARD).colors(), 'Rig(face=, hair_style=, folds=): the details in every frame')

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
    # big sprites and gradients: written into the ART block with their helpers, and drawn by the console
    bart = Art(); bart.region('spr', 256, 1023)
    bp = bart.sprite_palette(0, {'body': ramp('d04648', 4), 'eye': 'ffffff'})
    bp2 = bart.sprite_palette(5, {'gem': ramp('3050c0', 3)})
    left = Img(24, 48).rect(4, 4, 20, 40, bp.body[2]).rect(10, 10, 4, 4, bp.eye)
    whole = mirrored(left)
    gemlayer = Img(48, 48).rect(20, 20, 8, 8, bp2.gem[2])
    entry = bart.big_sprite('boss', {0: whole, 5: gemlayer})
    ok(entry['w'] == 48 and entry['h'] == 48 and any(p[5] for p in entry['parts']), 'big_sprite: a 48 px picture cut into parts, the mirrored half reusing the other\'s tiles flipped', str(entry['parts'][:3]))
    ok({p[4] for p in entry['parts']} == {0, 5}, 'and a part for each palette')
    bart.gradient('sky', ['102040', '80c0ff'], y0=0, y1=99)
    ok(len(bart.gradients['sky']['lines']) == 100 and bart.gradients['sky']['lines'][0] != bart.gradients['sky']['lines'][-1], 'gradient: a colour for every line')
    bsrc = os.path.join(work, 'bigs'); os.makedirs(bsrc)
    open(os.path.join(bsrc, 'code.js'), 'w').write('%s\n%s\nfunction draw() { cls(); bigSprite(ART.big.boss, 100, 50); bigSprite(ART.big.boss, 160, 50, { fx: true }); }\nfunction scanline(y) { gradientLine(ART.gradients.sky, y); }\n' % (ART_BEGIN, ART_END))
    open(os.path.join(bsrc, 'meta.json'), 'w').write('{"title": "Bigs"}')
    bart.write(bsrc, quiet=True)
    bcode = open(os.path.join(bsrc, 'code.js')).read()
    ok('function bigSprite(' in bcode and 'function gradientLine(' in bcode and 'big: {' in bcode, 'the ART block carries the parts and the bigSprite() and gradientLine() helpers')
    bout = os.path.join(work, 'bigs.nova'); node('tools/pack.js', bsrc, bout)
    bprobe = os.path.join(work, 'bprobe.mjs')
    open(bprobe, 'w').write("""import { boot } from '%s/tools/devkit/harness.mjs';
const vm = boot(process.argv[2]); vm.step(0);
const at = (x, y) => { const v = vm.out32[y * 256 + x]; return [v & 255, (v >> 8) & 255, (v >> 16) & 255]; };
console.log(JSON.stringify({ body: at(108, 80), eye: at(111, 61), eyeR: at(160 + 36, 61), gem: at(124, 74), sky0: at(5, 0), sky99: at(5, 99), cpu: vm.ppu.oamCount }));""" % ROOT)
    bv = json.loads(node(bprobe, bout))
    ok(bv['body'] == rgb555(bart.palettes[('spr', 0)].hexes['body2']) and bv['eye'] == rgb555('ffffff') and bv['eyeR'] == rgb555('ffffff'), 'the console draws the big sprite, and flipped with fx its eye lands mirrored', str(bv))
    ok(bv['gem'] == rgb555(bart.palettes[('spr', 5)].hexes['gem2']), 'with the part in the other palette over it')
    ok(bv['sky0'] != bv['sky99'] and bv['sky0'] == rgb555('102040'), 'and gradientLine() in scanline() paints the backdrop line by line', str((bv['sky0'], bv['sky99'])))
    gifp = os.path.join(work, 'bigs.gif')
    node('tools/devkit/gif.mjs', bout, gifp, '--from', '0', '--to', '10', '--crop', '90,40,120,80')
    ok(open(gifp, 'rb').read(6) == b'GIF89a', 'tools/devkit/gif.mjs records the cart as an animated GIF')
    # the overlay warning and the report
    rep = art.report()
    ok('tiles: ' in rep and 'region bg' in rep and 'sprites: 1' in rep, 'the report lists the budget by region')
finally:
    shutil.rmtree(work, ignore_errors=True)

print('\n%s' % ('SOME FAILED' if fails else 'ALL PASS'))
sys.exit(1 if fails else 0)
