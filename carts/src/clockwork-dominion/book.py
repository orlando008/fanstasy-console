# Clockwork Dominion's book: the ledger font and the story, packed into the cart's ROM.
#   python3 carts/src/clockwork-dominion/book.py            write rom/font.bin and rom/book.bin
#   python3 carts/src/clockwork-dominion/book.py --check    only check (exit 1 on a problem, or if a .bin is stale)
#
# rom/font.bin, read by code.js (loadFont): for each character from 32 to 127 + len(EXTRA) - 1: its width (1 to 5), then
#   its 9 rows top to bottom, a byte each, bit 0 the leftmost pixel. Rows 0 to 6 are the capitals, 2 to 6 the small
#   letters, 7 and 8 the descenders.
# rom/book.bin, read by code.js (loadBook): 'CB', a version byte (1), the count of story lines (2 bytes, little-endian),
#   then each line: its trigger and its text, each a length byte and its characters (plain ASCII, plus the font's extra
#   characters from 127 up).
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


def book_bytes(lines):
    out = bytearray(b'CB') + bytes([1]) + len(lines).to_bytes(2, 'little')
    for trig, text in lines:
        for s in (trig, text):
            b = s.encode('ascii')
            out.append(len(b)); out += b
    return bytes(out)


def main():
    problems = []
    lines = read_story(problems)
    files = {'font.bin': font_bytes(), 'book.bin': book_bytes(lines)}
    if problems:
        print('\n'.join(problems)); sys.exit(1)
    if '--check' in sys.argv:
        stale = [n for n, b in files.items() if not os.path.exists(os.path.join(ROM, n)) or open(os.path.join(ROM, n), 'rb').read() != b]
        if stale: print('stale: %s (run python3 carts/src/clockwork-dominion/book.py)' % ', '.join(stale)); sys.exit(1)
        print('ok: %d story lines, the font and the book are up to date' % len(lines)); return
    os.makedirs(ROM, exist_ok=True)
    for n, b in files.items():
        open(os.path.join(ROM, n), 'wb').write(b)
    print('wrote rom/font.bin (%d bytes) and rom/book.bin (%d bytes, %d story lines)' % (len(files['font.bin']), len(files['book.bin']), len(lines)))


main()
