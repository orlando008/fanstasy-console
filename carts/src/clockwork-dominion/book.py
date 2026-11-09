# Clockwork Dominion's book: the ledger font and the story, packed into the cart's ROM.
#   python3 carts/src/clockwork-dominion/book.py            write rom/font.bin and rom/book.bin
#   python3 carts/src/clockwork-dominion/book.py --check    only check (exit 1 on a problem, or if a .bin is stale)
#
# rom/font.bin, read by code.js (loadFont): for each character from 32 to 127 + len(EXTRA) - 1: its width (1 to 5), then
#   its 9 rows top to bottom, a byte each, bit 0 the leftmost pixel. Rows 0 to 6 are the capitals, 2 to 6 the small
#   letters, 7 and 8 the descenders.
# rom/book.bin, read by code.js (loadBook): 'CB', a version byte (2), then three sections, each a count (2 bytes,
#   little-endian) and its entries, every string a length byte and its characters (plain ASCII):
#   the story lines (trigger, text); the inventions (id as a byte, then name, appears, cost, effect, hint, story);
#   the milestones (trigger, name); the scenes (name, then a shot count byte and each shot: view, frames as 2 bytes
#   little-endian, effects, caption).
#
# story.txt holds the story: one line each, `trigger | text`. A trigger is `name:n` (the run's number `name` has reached
# n: made:10 is the tenth cog made) or `ev:name` (an event the code raises: ev:start, ev:sold, ev:nobrass ...). Each
# line is told once a run, in the log, when its trigger first holds.
import os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROM = os.path.join(HERE, 'rom')
MAX_TEXT = 200

# The glyphs: rows of '#' and '.', separated by spaces; a glyph's width is its rows' length. Seven rows (the
# capitals' height), or nine with the descenders.
G = {
    ' ': '.. .. .. .. .. .. ..',
    '!': '# # # # # . #',
    '"': '#.# #.# ... ... ... ... ...',
    '#': '..... .#.#. ##### .#.#. ##### .#.#. .....',
    '$': '..#.. .#### #.#.. .###. ..#.# ####. ..#..',
    '%': '##..# ##.#. ...#. ..#.. .#... .#.## #..##',
    '&': '.##.. #..#. .##.. .#... #.#.# #..#. .##.#',
    "'": '# # . . . . .',
    '(': '.# #. #. #. #. #. .#',
    ')': '#. .# .# .# .# .# #.',
    '*': '... #.# .#. #.# ... ... ...',
    '+': '... ... .#. ### .#. ... ...',
    ',': '.. .. .. .. .. .. .# #.',
    '-': '... ... ... ### ... ... ...',
    '.': '. . . . . . #',
    '/': '..# ..# .#. .#. .#. #.. #..',
    '0': '.##. #..# #..# #..# #..# #..# .##.',
    '1': '.#.. ##.. .#.. .#.. .#.. .#.. ###.',
    '2': '.##. #..# ...# ..#. .#.. #... ####',
    '3': '###. ...# ...# .##. ...# ...# ###.',
    '4': '#..# #..# #..# #### ...# ...# ...#',
    '5': '#### #... #... ###. ...# ...# ###.',
    '6': '.##. #... #... ###. #..# #..# .##.',
    '7': '#### ...# ...# ..#. .#.. .#.. .#..',
    '8': '.##. #..# #..# .##. #..# #..# .##.',
    '9': '.##. #..# #..# .### ...# ...# .##.',
    ':': '. . # . . # .',
    ';': '.. .. .# .. .. .# #.',
    '<': '... ..# .#. #.. .#. ..# ...',
    '=': '... ... ### ... ### ... ...',
    '>': '... #.. .#. ..# .#. #.. ...',
    '?': '.##. #..# ...# ..#. .#.. .... .#..',
    '@': '.###. #...# #.### #.#.# #.### #.... .###.',
    'A': '.##. #..# #..# #### #..# #..# #..#',
    'B': '###. #..# #..# ###. #..# #..# ###.',
    'C': '.### #... #... #... #... #... .###',
    'D': '###. #..# #..# #..# #..# #..# ###.',
    'E': '#### #... #... ###. #... #... ####',
    'F': '#### #... #... ###. #... #... #...',
    'G': '.### #... #... #.## #..# #..# .###',
    'H': '#..# #..# #..# #### #..# #..# #..#',
    'I': '### .#. .#. .#. .#. .#. ###',
    'J': '..## ...# ...# ...# ...# #..# .##.',
    'K': '#..# #..# #.#. ##.. #.#. #..# #..#',
    'L': '#... #... #... #... #... #... ####',
    'M': '#...# ##.## #.#.# #.#.# #...# #...# #...#',
    'N': '#...# ##..# #.#.# #..## #...# #...# #...#',
    'O': '.##. #..# #..# #..# #..# #..# .##.',
    'P': '###. #..# #..# ###. #... #... #...',
    'Q': '.##. #..# #..# #..# #..# #.#. .#.#',
    'R': '###. #..# #..# ###. #.#. #..# #..#',
    'S': '.### #... #... .##. ...# ...# ###.',
    'T': '##### ..#.. ..#.. ..#.. ..#.. ..#.. ..#..',
    'U': '#..# #..# #..# #..# #..# #..# .##.',
    'V': '#...# #...# #...# #...# .#.#. .#.#. ..#..',
    'W': '#...# #...# #...# #.#.# #.#.# ##.## #...#',
    'X': '#...# #...# .#.#. ..#.. .#.#. #...# #...#',
    'Y': '#...# #...# .#.#. ..#.. ..#.. ..#.. ..#..',
    'Z': '#### ...# ...# ..#. .#.. #... ####',
    '[': '## #. #. #. #. #. ##',
    '\\': '#.. #.. .#. .#. .#. ..# ..#',
    ']': '## .# .# .# .# .# ##',
    '^': '.#. #.# ... ... ... ... ...',
    '_': '.... .... .... .... .... .... ####',
    '`': '#. .# .. .. .. .. ..',
    'a': '.... .... .##. ...# .### #..# .###',
    'b': '#... #... ###. #..# #..# #..# ###.',
    'c': '.... .... .### #... #... #... .###',
    'd': '...# ...# .### #..# #..# #..# .###',
    'e': '.... .... .##. #..# #### #... .###',
    'f': '.## #.. ### #.. #.. #.. #..',
    'g': '.... .... .### #..# #..# #..# .### ...# .##.',
    'h': '#... #... ###. #..# #..# #..# #..#',
    'i': '# . # # # # #',
    'j': '.# .. .# .# .# .# .# .# #.',
    'k': '#... #... #..# #.#. ##.. #.#. #..#',
    'l': '#. #. #. #. #. #. .#',
    'm': '..... ..... ####. #.#.# #.#.# #.#.# #.#.#',
    'n': '.... .... ###. #..# #..# #..# #..#',
    'o': '.... .... .##. #..# #..# #..# .##.',
    'p': '.... .... ###. #..# #..# #..# ###. #... #...',
    'q': '.... .... .### #..# #..# #..# .### ...# ...#',
    'r': '... ... #.# ##. #.. #.. #..',
    's': '.... .... .### #... .##. ...# ###.',
    't': '.#. .#. ### .#. .#. .#. ..#',
    'u': '.... .... #..# #..# #..# #..# .###',
    'v': '..... ..... #...# #...# .#.#. .#.#. ..#..',
    'w': '..... ..... #...# #.#.# #.#.# #.#.# .#.#.',
    'x': '.... .... #..# #..# .##. #..# #..#',
    'y': '.... .... #..# #..# #..# #..# .### ...# .##.',
    'z': '.... .... #### ...# .##. #... ####',
    '{': '..# .#. .#. #.. .#. .#. ..#',
    '|': '# # # # # # #',
    '}': '#.. .#. .#. ..# .#. .#. #..',
    '~': '.... .... .#.# #.#. .... .... ....',
}
# The font's extra characters, from 127 up: in code.js as '\x7f' and so on (LEFT_MARK, RIGHT_MARK ...).
EXTRA = [
    ('<|', '... ..# .## ### .## ..# ...'),            # 127: the left mark of a value to change
    ('|>', '... #.. ##. ### ##. #.. ...'),            # 128: the right mark
    ('dot', '.. .. .. ## ## .. ..'),                  # 129: a dot
    ('cog', '..... .#.#. ##### ##.## ##### .#.#. .....'),  # 130: a cog
]


def glyph_rows(spec):
    rows = spec.split(' ')
    w = len(rows[0])
    assert all(len(r) == w for r in rows), spec
    assert 7 <= len(rows) <= 9, spec
    rows += ['.' * w] * (9 - len(rows))
    return w, rows


def font_bytes():
    out = bytearray()
    specs = [G[chr(c)] for c in range(32, 127)] + [s for _, s in EXTRA]
    for spec in specs:
        w, rows = glyph_rows(spec)
        assert 1 <= w <= 5, spec
        out.append(w)
        for r in rows:
            out.append(sum(1 << i for i, ch in enumerate(r) if ch == '#'))
    return bytes(out)


def read_story(problems):
    lines = []
    for n, raw in enumerate(open(os.path.join(HERE, 'story.txt'), encoding='utf-8').read().split('\n'), 1):
        if not raw.strip() or raw.startswith('#'): continue
        parts = [p.strip() for p in raw.split('|', 1)]
        if len(parts) != 2: problems.append('story.txt line %d: no "trigger | text"' % n); continue
        trig, text = parts
        if not (trig.startswith('ev:') or (':' in trig and trig.split(':')[1].replace('.', '').isdigit())):
            problems.append('story.txt line %d: "%s" is not a trigger' % (n, trig))
        if len(text) > MAX_TEXT: problems.append('story.txt line %d: %d characters (at most %d)' % (n, len(text), MAX_TEXT))
        if any(not (32 <= ord(c) <= 126) for c in text + trig): problems.append('story.txt line %d: not plain ASCII' % n)
        lines.append((trig, text))
    return lines


import re
TRIG = re.compile(r'^(ev:[a-z0-9]+|[a-zA-Z]+:[0-9.]+)$')
COST = re.compile(r'^(ins|clev|ing|lire|cogs|trust):[0-9.]+$')
EFFECT = re.compile(r'^[a-zA-Z]+[*=+][0-9.]+$')


def fields(name, n_fields, problems):
    out = []
    for n, raw in enumerate(open(os.path.join(HERE, name), encoding='utf-8').read().split('\n'), 1):
        if not raw.strip() or raw.startswith('#'): continue
        parts = [p.strip() for p in raw.split('|')]
        if len(parts) != n_fields: problems.append('%s line %d: %d fields, not %d' % (name, n, len(parts), n_fields)); continue
        for p in parts:
            if len(p) > MAX_TEXT: problems.append('%s line %d: a field of %d characters (at most %d)' % (name, n, len(p), MAX_TEXT))
            if any(not (32 <= ord(c) <= 126) for c in p): problems.append('%s line %d: not plain ASCII' % (name, n))
        out.append((n, parts))
    return out


def read_inventions(problems):
    out, ids = [], set()
    for n, (i, name, when, cost, effect, hint, story) in fields('inventions.txt', 7, problems):
        where = 'inventions.txt line %d' % n
        if not i.isdigit() or not 1 <= int(i) <= 255 or int(i) in ids: problems.append('%s: the id "%s" is not new and 1 to 255' % (where, i))
        ids.add(int(i) if i.isdigit() else 0)
        for t in when.split('&'):
            if not TRIG.match(t): problems.append('%s: "%s" is not a trigger' % (where, t))
        for c in cost.split():
            if not COST.match(c): problems.append('%s: "%s" is not a cost' % (where, c))
        for e in effect.split():
            if not EFFECT.match(e): problems.append('%s: "%s" is not an effect' % (where, e))
        out.append((int(i) if i.isdigit() else 0, name, when, cost, effect, hint, story))
    for _, _, when, *_ in out:
        for t in when.split('&'):
            if t.startswith('inv:') and int(float(t[4:])) not in ids: problems.append('inventions.txt: "%s" names no invention' % t)
    return out


def read_milestones(problems):
    out = []
    for n, (trig, name) in fields('milestones.txt', 2, problems):
        if not TRIG.match(trig): problems.append('milestones.txt line %d: "%s" is not a trigger' % (n, trig))
        out.append((trig, name))
    return out


VIEWS = {'night', 'dusk', 'empty', 'world', 'orrery', 'black'}
EFFECTS = {'fadein', 'fadeout', 'mosaicin', 'mosaicout', 'irisopen', 'irisclose', 'doze', 'lampsout', 'launch', 'spin', 'gold',
           'still', 'starsout', 'tick', 'empty'}


def read_scenes(problems):
    scenes, cur = [], None
    for n, raw in enumerate(open(os.path.join(HERE, 'scenes.txt'), encoding='utf-8').read().split('\n'), 1):
        if not raw.strip() or raw.startswith('#'): continue
        if raw.startswith('@'): cur = (raw[1:].strip(), []); scenes.append(cur); continue
        parts = [p.strip() for p in raw.split('|')]
        if cur is None or len(parts) != 4: problems.append('scenes.txt line %d: not a shot (view | frames | effects | caption)' % n); continue
        view, frames, fx, cap = parts
        if view not in VIEWS: problems.append('scenes.txt line %d: "%s" is not a view' % (n, view))
        if not frames.isdigit() or not 30 <= int(frames) <= 900: problems.append('scenes.txt line %d: frames must be 30 to 900' % n)
        for e in fx.split():
            if e not in EFFECTS: problems.append('scenes.txt line %d: "%s" is not an effect' % (n, e))
        if len(cap) > MAX_TEXT or any(not (32 <= ord(c) <= 126) for c in cap): problems.append('scenes.txt line %d: the caption is too long or not plain ASCII' % n)
        cur[1].append((view, int(frames) if frames.isdigit() else 60, fx, cap))
    return scenes


def book_bytes(lines, invs, miles, scenes):
    out = bytearray(b'CB') + bytes([2])
    def strs(*ss):
        for s in ss:
            b = s.encode('ascii'); out.append(len(b)); out.extend(b)
    out += len(lines).to_bytes(2, 'little')
    for trig, text in lines: strs(trig, text)
    out += len(invs).to_bytes(2, 'little')
    for i, *rest in invs: out.append(i); strs(*rest)
    out += len(miles).to_bytes(2, 'little')
    for trig, name in miles: strs(trig, name)
    out.append(len(scenes))
    for name, shots in scenes:
        strs(name); out.append(len(shots))
        for view, frames, fx, cap in shots: strs(view); out += frames.to_bytes(2, 'little'); strs(fx, cap)
    return bytes(out)


def main():
    problems = []
    lines = read_story(problems)
    invs, miles, scenes = read_inventions(problems), read_milestones(problems), read_scenes(problems)
    files = {'font.bin': font_bytes(), 'book.bin': book_bytes(lines, invs, miles, scenes)}
    if problems:
        print('\n'.join(problems)); sys.exit(1)
    if '--check' in sys.argv:
        stale = [n for n, b in files.items() if not os.path.exists(os.path.join(ROM, n)) or open(os.path.join(ROM, n), 'rb').read() != b]
        if stale: print('stale: %s (run python3 carts/src/clockwork-dominion/book.py)' % ', '.join(stale)); sys.exit(1)
        print('ok: %d story lines, %d inventions, %d milestones, %d scenes; the font and the book are up to date' % (len(lines), len(invs), len(miles), len(scenes))); return
    os.makedirs(ROM, exist_ok=True)
    for n, b in files.items():
        open(os.path.join(ROM, n), 'wb').write(b)
    print('wrote rom/font.bin (%d bytes) and rom/book.bin (%d bytes: %d story lines, %d inventions, %d milestones)' % (len(files['font.bin']), len(files['book.bin']), len(lines), len(invs), len(miles)))


main()
