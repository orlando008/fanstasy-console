# Wick's rooms: carts/src/wick/rooms.txt (its header has the format) packed into rom/rooms.bin, which code.js reads
# (loadRooms):
#   python3 carts/src/wick/rooms.py            write rom/rooms.bin
#   python3 carts/src/wick/rooms.py --check    exit 1 if it is not up to date
# rooms.bin: a count byte, then for each room: world, number, par in tenths of a second (2 bytes, little-endian), the
# name (a length byte and ASCII), and 208 cells, a byte each, row by row (the codes of CELLS below).
import os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
CELLS = '.#-~SL*d^><=HVP()r'   # code.js: AIR 0, STONE 1, LEDGE 2, WATER 3, START 4, LANTERN 5, EMBER 6, then the hazards (DRIP 7 ...)
COLS, ROWS = 16, 13


def read():
    rooms, cur = [], None
    for n, line in enumerate(open(os.path.join(HERE, 'rooms.txt')).read().split('\n'), 1):
        if line.startswith('#') and cur is None or (line.startswith('# ') and cur is not None and len(cur['rows']) == ROWS): continue
        if line.startswith('@'):
            wn, par, name = [p.strip() for p in line[1:].split('|')]
            w, k = wn.split('-')
            cur = {'world': int(w), 'n': int(k), 'par': round(float(par) * 10), 'name': name, 'rows': [], 'line': n}
            rooms.append(cur)
        elif line.strip() and cur is not None:
            cur['rows'].append(line)
    for r in rooms:
        where = 'room %d-%d (line %d)' % (r['world'], r['n'], r['line'])
        if len(r['rows']) != ROWS or any(len(x) != COLS for x in r['rows']): sys.exit('%s: a room is %d rows of %d cells' % (where, ROWS, COLS))
        text = ''.join(r['rows'])
        bad = set(text) - set(CELLS)
        if bad: sys.exit('%s: unknown cells %s' % (where, ' '.join(sorted(bad))))
        if text.count('S') != 1 or text.count('L') != 1: sys.exit('%s: one start (S) and one lantern (L)' % where)
        if len(r['name']) > 24: sys.exit('%s: a name of 24 letters at most' % where)
    return rooms


def pack(rooms):
    out = bytearray([len(rooms)])
    for r in rooms:
        out += bytes([r['world'], r['n'], r['par'] & 255, r['par'] >> 8, len(r['name'])]) + r['name'].encode('ascii')
        out += bytes(CELLS.index(c) for c in ''.join(r['rows']))
    return bytes(out)


if __name__ == '__main__':
    data, path = pack(read()), os.path.join(HERE, 'rom', 'rooms.bin')
    if '--check' in sys.argv:
        if not os.path.exists(path) or open(path, 'rb').read() != data: sys.exit('rom/rooms.bin is not what rooms.txt makes: run python3 carts/src/wick/rooms.py')
        print('ok: rom/rooms.bin is up to date (%d rooms)' % len(read()))
    else:
        os.makedirs(os.path.dirname(path), exist_ok=True)
        open(path, 'wb').write(data)
        print('wrote rom/rooms.bin (%d bytes, %d rooms)' % (len(data), len(read())))
