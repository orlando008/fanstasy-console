# Royal Chess's audio: carts/src/royal-chess/audio.json.
#   python3 carts/src/royal-chess/audio.py carts/src/royal-chess/audio.json
# Two songs, calm baroque pieces in their own notes (scores.py read them from public domain engravings into scores/;
# SOURCES.md there), arranged for the sampled instruments, and the effects numbered as SFX in code.js (spec 11). Rules
# (playbook section 5): leads quiet, in octave 4, no vibrato; songs on channels 0 to 5, effects on 6 and 7 (code.js takes
# turns). No drums: it is a game to think over.
#   0 the title and the menus: Bach, Minuet in G (BWV Anh. 114), all 32 bars, plucked like a harpsichord over a soft bass
#   1 the game: Bach, Sheep May Safely Graze (from BWV 208), bars 1 to 20: the recorders' tune on a flute, the singer's
#     line and the second recorder on strings, the continuo on the bass, slow
# Each loops. After a change: node tools/devkit/music/loud.mjs carts/royal-chess.nova --check, python3
# tools/devkit/music/clash.py on the json, and node tools/devkit/music/sfx.mjs carts/royal-chess.nova 6 for the effects.
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../../tools/devkit/music'))
from kit import *

HERE = os.path.dirname(os.path.abspath(__file__))
a = Audio(chip=2)

# --- The voices of the songs ---
a.voice('HARP', 'pluck', 15, -0.1)                  # the minuet's right hand: a harpsichord's pluck
a.voice('HARPL', 'pluck', 13, 0.15)                 # its left hand's inner notes
a.voice('FLUTE', 'flute', 4, -0.1)                  # the recorders' tune
a.voice('STR', 'strings', 5, 0.2)                   # the second recorder and the singer, on strings
a.voice('STRQ', 'strings', 4, -0.2)
a.voice('HARPS', 'strings', 3, 0.0)                 # the minuet's tune held softly under the pluck, so it sings
a.voice('BASS', 'bass', 11)
a.voice('BASSQ', 'bass', 10)                        # the minuet's left hand, under a quieter pluck
# --- The voices of the effects: wood and bells ---
a.voice('TICK', 'marimba', 11, 0.0)                 # the cursor
a.voice('CLICK', 'marimba', 12, 0.0)                # a piece picked up: a wooden click
a.voice('KNOCK', 'tom', 9, 0.0)                     # put down: a soft knock
a.voice('KNOCKF', 'tom', 13, 0.0)                   # a capture: a firmer one
a.voice('BELL', 'celesta', 8, 0.1)
a.voice('BELLQ', 'celesta', 5, 0.1)
a.voice('THUD', 'bass', 10, 0.0)
a.voice('FANF', 'brass', 6, 0.0, a=2)


def read(name):
    """The voices of a piece from scores/<name>.txt: {voice: [(row, pitch, rows)]} and its rows."""
    lines = open(os.path.join(HERE, 'scores', name + '.txt')).read().split('\n')
    rows = int(lines[0].split()[-2])
    out = {}
    for l in lines[1:]:
        if not l.strip(): continue
        v, *toks = l.split()
        out[v] = [tuple(int(x) for x in t.split(':')) for t in toks]
    return out, rows


def song(name, speed, parts, echo):
    """A piece as a song: each of its voices on a channel with an instrument (parts: {voice: (channel, instrument,
    semitones)}); a note that ends before its voice's next one is let go (OFF). Loops to the start."""
    voices, n = read(name)
    total = -(-n // 64) * 64
    rows = [[None] * 8 for _ in range(total)]
    for key, (ch, inst, vs) in parts.items():
        notes = voices.get(key.split('@')[0], [])   # ('lead@2': the same voice again, on another channel)
        for k, (r, p, d) in enumerate(notes):
            if r >= total: break
            rows[r][ch] = cell(p + vs - 12, a.I[inst])                                     # (MIDI 60 is C4: the chip's C-4 is index 48)
            nxt = notes[k + 1][0] if k + 1 < len(notes) else total
            if r + d < nxt and r + d < total: rows[r + d][ch] = {'n': 'OFF'}
    S = a.song(Key('C', MAJOR), speed, echo=echo)
    S.rows = rows
    S.finish(loop=0)

ROOM, HALL = (5, 4, 5, 9), (12, 7, 8, 7)
song('minuet', 14, {'lead': (0, 'HARP', 0), 'inner': (1, 'HARPL', 0), 'tenor': (3, 'HARPL', 0), 'lead@2': (4, 'HARPS', 0), 'bass': (2, 'BASSQ', 0)}, ROOM)
song('sheep', 13, {'lead': (0, 'FLUTE', -12), 'inner': (1, 'STR', -12), 'tenor': (3, 'STRQ', -12), 'bass': (2, 'BASS', 0)}, HALL)

# --- Effects: the order is the SFX table in code.js ---
a.effect(1, ['E-5', 'OFF'], 'TICK')                                # 0 the cursor
a.effect(2, ['C-6', 'G-6', None, 'OFF'], 'BELLQ')                  # 1 select
a.effect(2, ['G-5', 'C-5', None, 'OFF'], 'BELLQ')                  # 2 pause
a.effect(1, ['G-5', None, 'OFF'], 'CLICK')                         # 3 a piece picked up: a wooden click
a.effect(1, ['C-4', None, 'OFF'], 'KNOCK')                         # 4 put down (and the computer's move): a soft knock
a.effect(2, ['G-3', None, 'OFF'], 'KNOCKF')                        # 5 a capture: a firmer knock
a.effect(2, ['C-3', None, 'OFF'], 'THUD')                          # 6 not a legal move: a soft thud
a.effect(2, ['A-5', None, None, None, 'OFF'], 'BELL')              # 7 check: a small bell
a.effect(1, ['C-5', 'E-5', 'G-5', 'C-6', None, 'OFF'], 'BELLQ')    # 8 a promotion: a little rising chime
a.effect(4, ['C-4', 'E-4', 'G-4', 'C-5', None, 'G-4', 'C-5', None, None, 'OFF'], 'FANF')   # 9 checkmate: a short fanfare
a.effect(4, ['E-5', None, 'C-5', None, None, 'OFF'], 'BELLQ')      # 10 a draw: two gentle notes
a.effect(2, ['C-4', None, 'C-4', None, 'OFF'], 'KNOCK')            # 11 castling: two knocks

a.write(sys.argv[1], songs=2)
