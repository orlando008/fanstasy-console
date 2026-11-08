# Riddlewick Manor's audio: carts/src/riddlewick-manor/audio.json.
#   python3 carts/src/riddlewick-manor/audio.py carts/src/riddlewick-manor/audio.json
# Two songs, spooky classics in their own notes (scores.py read them from public domain engravings into scores/;
# SOURCES.md there), arranged softly for the sampled instruments, and the effects numbered as SFX in code.js (spec 11).
# Rules (playbook section 5): leads quiet, in octave 4, no vibrato; songs on channels 0 to 5, effects on 6 and 7 (code.js
# takes turns). No drums: it is a game to think in.
#   0 the title and the menus: Bach, Toccata and Fugue in D minor, the toccata's opening (bars 1 to 11): the famous
#     mordents and runs on flute-like organ pipes, an octave lower on strings, the chords on a choir; a hall's echo
#   1 exploring the manor: Beethoven, the Moonlight Sonata's first movement (bars 1 to 21, in D minor as engraved for two
#     guitars): its triplets on a soft electric piano, the melody on a quiet flute, the bass on strings; slow
# Each loops. After a change: node tools/devkit/music/loud.mjs carts/riddlewick-manor.nova --check, python3
# tools/devkit/music/clash.py on the json, and node tools/devkit/music/sfx.mjs carts/riddlewick-manor.nova 6 for the effects.
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../../tools/devkit/music'))
from kit import *

HERE = os.path.dirname(os.path.abspath(__file__))
a = Audio(chip=2)

# --- The voices of the songs ---
a.voice('PIPE', 'pluck', 8, -0.1)                   # the toccata's runs, plucked like a harpsichord (quick enough for its 64ths)
a.voice('PIPEL', 'pluck', 15, 0.15)                 # the left hand, an octave down
a.voice('ORGAN', 'strings', 9, 0.0)                  # the line held softly under them, as an organ would
a.voice('CHOIR', 'choir', 6, 0.0)                   # its chords
a.voice('FLUTE', 'flute', 4, -0.1)                  # the Moonlight's melody
a.voice('TRIP', 'epiano', 11, 0.15)                 # its triplets
a.voice('LOW', 'strings', 5, -0.15)                 # its bass
# --- The voices of the effects ---
a.voice('TICK', 'marimba', 11, 0.0)
a.voice('BELL', 'celesta', 8, 0.1)
a.voice('BELLQ', 'celesta', 5, 0.1)
a.voice('KNOCK', 'tom', 13, 0.0)
a.voice('STEP', 'tom', 7, 0.0)
a.voice('THUD', 'bass', 11, 0.0)
a.voice('SIGH', 'choir', 7, 0.0, a=6)
a.voice('FANF', 'brass', 6, 0.0, a=2)
a.voice('LOWSTR', 'strings', 7, 0.0)


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
        notes = voices.get(key.split('@')[0], [])
        for k, (r, p, d) in enumerate(notes):
            if r >= total: break
            rows[r][ch] = cell(p + vs - 12, a.I[inst])                                     # (MIDI 60 is C4: the chip's C-4 is index 48)
            nxt = notes[k + 1][0] if k + 1 < len(notes) else total
            if r + d < nxt and r + d < total: rows[r + d][ch] = {'n': 'OFF'}
    S = a.song(Key('C', MAJOR), speed, echo=echo)
    S.rows = rows
    S.finish(loop=0)

HALL, ROOM = (12, 7, 8, 7), (6, 5, 6, 8)
song('toccata', 3, {'lead': (0, 'PIPE', -12), 'bass': (1, 'PIPEL', 0), 'inner': (2, 'CHOIR', -12), 'tenor': (3, 'CHOIR', -12), 'lead@2': (4, 'ORGAN', -12)}, HALL)
song('moonlight', 18, {'lead': (0, 'FLUTE', 0), 'inner': (1, 'TRIP', 0), 'tenor': (3, 'TRIP', 0), 'bass': (2, 'LOW', 0)}, ROOM)

# --- Effects: the order is the SFX table in code.js ---
a.effect(1, ['E-5', 'OFF'], 'TICK')                                       # 0 the cursor
a.effect(2, ['C-6', 'G-6', None, 'OFF'], 'BELLQ')                         # 1 select
a.effect(2, ['G-5', 'C-5', None, 'OFF'], 'BELLQ')                         # 2 pause
a.effect(2, ['G-3', None, 'G-3', None, 'OFF'], 'KNOCK')                   # 3 a knock on a door: two raps
a.effect(2, ['C-3', None, None, 'D-3', None, 'OFF'], 'STEP')              # 4 footsteps through a door
a.effect(2, ['C-2', None, 'OFF'], 'THUD')                                 # 5 a lock's clunk
a.effect(2, ['C-5', 'E-5', 'G-5', 'C-6', None, 'OFF'], 'BELL')            # 6 a right answer: a rising chime
a.effect(4, ['E-4', None, 'D-4', None, 'C-4', None, None, 'OFF'], 'SIGH') # 7 a wrong answer: a ghostly sigh, falling
a.effect(2, ['G-6', 'C-7', 'G-6', 'C-7', None, 'OFF'], 'BELLQ')          # 8 a key: a jingle
a.effect(2, ['G-4', 'C-5', None, None, 'OFF'], 'BELL')                    # 9 a candle stub: a warm rise
a.effect(4, ['D-4', 'F-4', 'A-4', 'D-5', None, 'A-4', 'D-5', None, None, 'OFF'], 'FANF')   # 10 the heart won: a fanfare
a.effect(5, ['A-3', None, 'F-3', None, 'D-3', None, None, None, 'OFF'], 'LOWSTR')         # 11 the candle out: falling strings
a.effect(2, ['C-5', 'E-5', 'G-5', None, 'OFF'], 'BELLQ')                  # 12 a record: initials
a.effect(4, ['A-4', 'C-5', 'E-5', None, None, 'OFF'], 'SIGH')             # 13 a ghost appears: a rising whoo

a.write(sys.argv[1], songs=2)
