# Vertical Fall's chunks: the hand-made pieces the levels are stacked from (docs/carts/vertical-fall.md, section 6).
#   python3 carts/src/vertical-fall/chunks.py carts/src/vertical-fall          writes rom/chunks.bin (read with rom('chunks'))
#   python3 carts/src/vertical-fall/chunks.py carts/src/vertical-fall --check  only checks that rom/chunks.bin is what it makes
#
# A chunk is 9 cells wide (the well, its side walls in columns 0 and 8) and 12 deep. The cells:
#   .  open          #  stone          =  a ledge (one-way, from above)     b  a breakable block     g  a gem block
#   u  a place for an enemy under stone (a bat)             t  on top of stone or a block (a snail, a turtle, a frog)
#   o  in the open (a blob, a jellyfish, a ghost)           w  against a side wall, in column 1 or 7 (a turret)
# Places are open cells; the level's fill decides which get an enemy, and its area which enemy (code.js, spawn()).
# Each chunk has tags: the areas it may appear in (S the Shaft, O the Ossuary, C the Cistern, D the Deep) and how hard it
# is (1 to 3: level 1 of an area uses 1, level 2 up to 2, level 3 and the later loops all). A level mirrors a chunk at random.
#
# The checks (each is a way a level could be broken): 12 rows of 9; the side walls are stone; the top and bottom rows are
# open inside (so any two chunks join); a way down from the top row to the bottom row through open cells, ledges and blocks
# (blocks can be shot); a bat's place has stone (or a block) above it, a crawler's has stone or a block under it, a
# turret's is beside a side wall.
#
# rom/chunks.bin: a byte with the number of chunks, then for each a byte of tags (bits 0-3 the areas S O C D, bits 4-5 the
# difficulty minus 1) and 54 bytes of cells, two to a byte (the first in the high nibble), row by row: . # = b g u t o w
# are 0 to 8.
import os, sys

CODES = '.#=bgutow'
SOLID = '#bg'
W, H = 9, 12

CHUNKS = [
    ('SOCD 1', """
#.......#
#.t.....#
###.....#
#u......#
#.......#
#.....t.#
#....####
#.....u.#
#.......#
#..o....#
#.......#
#.......#"""),
    ('SOCD 1', """
#.......#
#.......#
#..===..#
#.......#
#.o.....#
#.....==#
#.......#
#==.....#
#.......#
#...o...#
#.......#
#.......#"""),
    ('SOCD 1', """
#.......#
#.......#
#.......#
#.bbbb..#
#.......#
#.......#
#....t..#
#..bbgbb#
#.......#
#.......#
#.o.....#
#.......#"""),
    ('SOCD 1', """
#.......#
#.......#
#...t...#
#...#...#
#...#...#
#...u...#
#.......#
#.t...t.#
#.#...#.#
#.u...u.#
#.......#
#.......#"""),
    ('SOCD 1', """
#.......#
#w......#
#.......#
#....tt.#
#...#####
#....uu.#
#.......#
#.......#
#t......#
###.....#
#u.....w#
#.......#"""),
    ('SOCD 1', """
#.......#
#.......#
#.==.==.#
#.......#
#.......#
#...o...#
#.......#
#bb...bb#
#.......#
#.......#
#.......#
#.......#"""),
    ('SOCD 2', """
#.......#
#.t.....#
#####...#
#u..u...#
#.......#
#.....t.#
#...#####
#...u.u.#
#.......#
#.o.....#
#.......#
#.......#"""),
    ('SOCD 2', """
#.......#
#.......#
#..o....#
#.......#
#bbbbbb.#
#.......#
#.......#
#.o.....#
#.......#
#.bbbbbb#
#.......#
#.......#"""),
    ('SOCD 2', """
#.......#
#.......#
##.....##
###...###
##u...u##
#.......#
#...t...#
#..###..#
#..u.u..#
#.......#
#.......#
#.......#"""),
    ('SOCD 2', """
#.......#
#tt...tt#
###...###
#u.....u#
#.......#
#...o...#
#.......#
#.t...t.#
#.##.##.#
#.u...u.#
#.......#
#.......#"""),
    ('SOCD 2', """
#.......#
#.......#
#...g...#
#..bbb..#
#.......#
#w.....w#
#.......#
#.=====.#
#.......#
#...t...#
#..###..#
#.......#"""),
    ('SOCD 3', """
#.......#
#.t...t.#
#.#####.#
#.u...u.#
#.......#
#bbb.bbb#
#.......#
#...o...#
#.......#
##.....##
#u.....u#
#.......#"""),
    ('SOCD 3', """
#.......#
#....t..#
####.##.#
#..u....#
#.......#
#.t.....#
#.##.####
#.u.....#
#.......#
#.....t.#
####.##.#
#.......#"""),
    ('SOCD 3', """
#.......#
#.......#
#ggb.bgg#
#.......#
#...o...#
#.......#
#bb.b.bb#
#.......#
#.o...o.#
#.......#
#.bb.bb.#
#.......#"""),
    ('SOCD 3', """
#.......#
#t.....t#
##.....##
#u.....u#
#..ttt..#
#..###..#
#..uuu..#
#.......#
#t.....t#
##.....##
#u.....u#
#.......#"""),
    # --- the Shaft: roots and rough outcrops ---
    ('S 1', """
#.......#
#.......#
#tt.....#
####....#
#uu.....#
#.......#
#....ttt#
#...#####
#....uuu#
#.......#
#.......#
#.......#"""),
    ('S 2', """
#.......#
#...t...#
#..###..#
#..u.u..#
#.......#
#t.....t#
##.....##
#.......#
#...b...#
#..bgb..#
#.......#
#.......#"""),
    ('S 3', """
#.......#
#.t.t.t.#
#.#.#.#.#
#.u.u.u.#
#.......#
#.......#
#.t.t.t.#
#.#.#.#.#
#.u.u.u.#
#.......#
#.......#
#.......#"""),
    # --- the Ossuary: niches, ledges for turtles and frogs ---
    ('O 1', """
#.......#
#.......#
#t......#
#===....#
#.......#
#....t..#
#...====#
#.......#
#.......#
#.t.....#
#.===...#
#.......#"""),
    ('OCD 1', """
#.......#
#..t.t..#
#..===..#
#.......#
#.......#
#t.....t#
#==...==#
#.......#
#...o...#
#.......#
#.......#
#.......#"""),
    ('OCD 2', """
#.......#
#tt.....#
###.....#
#.....tt#
#.....###
#.......#
#..ttt..#
#..===..#
#.......#
#o.....o#
#.......#
#.......#"""),
    ('O 2', """
#.......#
#.......#
##.t.t.##
##.#.#.##
#.......#
#...o...#
#.......#
#tt...tt#
###...###
#u.....u#
#.......#
#.......#"""),
    ('OCD 3', """
#.......#
#.ttttt.#
#.=====.#
#.......#
#t.....t#
#==...==#
#.......#
#..t.t..#
#..bbb..#
#.......#
#.o...o.#
#.......#"""),
    # --- the Cistern: ledges over open water, turrets in the walls ---
    ('C 1', """
#.......#
#w......#
#.......#
#...==..#
#.......#
#......w#
#.......#
#.==....#
#.......#
#....o..#
#.......#
#.......#"""),
    ('C 2', """
#.......#
#w.....w#
#.......#
#..===..#
#.......#
#.o...o.#
#.......#
#==...==#
#.......#
#w.....w#
#.......#
#.......#"""),
    ('CD 2', """
#.......#
#.......#
#.t...t.#
#.b...b.#
#.......#
#w..o..w#
#.......#
#..===..#
#.......#
#.o...o.#
#.......#
#.......#"""),
    ('C 3', """
#.......#
#w.....w#
#.=...=.#
#.......#
#w..o..w#
#.......#
#..===..#
#.......#
#w..o..w#
#.==.==.#
#.......#
#.......#"""),
    # --- the Deep: wide open dark, things drifting ---
    ('D 1', """
#.......#
#.......#
#...o...#
#.......#
#.......#
#.o...o.#
#.......#
#.......#
#...#...#
#...u...#
#.......#
#.......#"""),
    ('D 2', """
#.......#
#.o...o.#
#.......#
#.......#
#..###..#
#..u.u..#
#.......#
#o.....o#
#.......#
#.......#
#...o...#
#.......#"""),
    ('D 3', """
#.......#
#o..o..o#
#.......#
#.bb.bb.#
#.......#
#.o...o.#
#.......#
#t.....t#
##.....##
#u..o..u#
#.......#
#.......#"""),
    ('SOD 2', """
#.......#
#.......#
#.......#
#.t...t.#
#.#...#.#
#.u...u.#
#.......#
#...t...#
#..bbb..#
#.......#
#.......#
#.......#"""),
    ('SOCD 1', """
#.......#
#.......#
#.......#
#...t...#
#..###..#
#.......#
#.......#
#.......#
#t.....t#
##.....##
#.......#
#.......#"""),
    ('SOCD 2', """
#.......#
#.t.....#
#.###...#
#.....t.#
#...###.#
#.t.....#
#.###...#
#.....t.#
#...###.#
#.......#
#.......#
#.......#"""),
    ('SOCD 3', """
#.......#
#.......#
#b.bbb.b#
#.......#
#..o.o..#
#.......#
#gb...bg#
#.......#
#...o...#
#.......#
#.b.b.b.#
#.......#"""),
]


def parse(tags, text):
    rows = [r for r in text.strip('\n').split('\n')]
    areas, hard = tags.split()
    return {'areas': areas, 'hard': int(hard), 'rows': rows}


def check(i, k):
    rows, bad = k['rows'], []
    if len(rows) != H or any(len(r) != W for r in rows): return ['%d rows of %s' % (len(rows), sorted({len(r) for r in rows}))]
    if any(ch not in CODES for r in rows for ch in r): bad.append('an unknown cell')
    if any(r[0] != '#' or r[-1] != '#' for r in rows): bad.append('a side wall that is not stone')
    for y in (0, H - 1):
        if any(ch in SOLID + '=' for ch in rows[y][1:-1]): bad.append('row %d is not open inside' % y)
    for y in range(H):
        for x in range(W):
            ch = rows[y][x]
            if ch == 'u' and (y == 0 or rows[y - 1][x] not in SOLID): bad.append('a bat place without stone above at %d,%d' % (x, y))
            if ch == 't' and (y == H - 1 or rows[y + 1][x] not in SOLID + '='): bad.append('a top place with nothing under it at %d,%d' % (x, y))
            if ch == 'w' and x not in (1, W - 2): bad.append('a wall place away from the walls at %d,%d' % (x, y))
    # a way down: from any cell of the top row, moving down, left and right through anything but stone
    seen, todo = set(), [(x, 0) for x in range(1, W - 1)]
    while todo:
        x, y = todo.pop()
        if (x, y) in seen or not (0 < x < W - 1 and 0 <= y < H) or rows[y][x] == '#': continue
        seen.add((x, y)); todo += [(x, y + 1), (x - 1, y), (x + 1, y)]
    if not any((x, H - 1) in seen for x in range(W)): bad.append('no way down')
    return bad


def build():
    ks = [parse(t, s) for t, s in CHUNKS]
    problems = ['chunk %d (%s %d): %s' % (i, k['areas'], k['hard'], '; '.join(b)) for i, k in enumerate(ks) for b in [check(i, k)] if b]
    if problems: sys.exit('\n'.join(problems))
    for a in 'SOCD':
        for h in (1, 2, 3):
            if not any(a in k['areas'] and k['hard'] == h for k in ks): sys.exit('no chunk of difficulty %d for area %s' % (h, a))
    out = bytearray([len(ks)])
    for k in ks:
        out.append(sum(1 << 'SOCD'.index(a) for a in k['areas']) | (k['hard'] - 1) << 4)
        cells = [CODES.index(ch) for r in k['rows'] for ch in r]
        out += bytes((cells[j] << 4) | cells[j + 1] for j in range(0, W * H, 2))
    return bytes(out), ks


if __name__ == '__main__':
    data, ks = build()
    path = os.path.join(sys.argv[1], 'rom', 'chunks.bin')
    if '--check' in sys.argv:
        same = os.path.exists(path) and open(path, 'rb').read() == data
        print('rom/chunks.bin is what chunks.py makes' if same else 'rom/chunks.bin differs: run python3 carts/src/vertical-fall/chunks.py carts/src/vertical-fall')
        sys.exit(0 if same else 1)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    open(path, 'wb').write(data)
    print('chunks: %d (%d bytes): %s' % (len(ks), len(data), ', '.join('%s %d' % (a, sum(1 for k in ks if a in k['areas'])) for a in 'SOCD')))
