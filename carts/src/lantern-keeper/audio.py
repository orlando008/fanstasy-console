# Lantern Keeper's audio: carts/src/lantern-keeper/audio.json.
#   python3 carts/src/lantern-keeper/audio.py carts/src/lantern-keeper/audio.json
# Six songs, public domain pieces in their own notes (scores.py read them from Mutopia's engravings into scores/; SOURCES.md there),
# arranged for the sampled instruments with a hall's echo, and the effects numbered as SFX in code.js (SPEC 11). Rules (playbook
# section 5): leads quiet, no vibrato; songs on channels 0 to 5, effects on 6 and 7 (code.js takes turns); no drums.
#   0 the title and the story: Debussy, Clair de lune (bars 1 to 21): electric piano over soft strings
#   1 the Stair: Satie, Gymnopedie no. 1 (bars 1 to 39): the piano alone
#   2 the Glass Room: Bach, Prelude in C, BWV 846 (bars 1 to 16): celesta, the glass ringing
#   3 the Clockwork: Satie, Gnossienne no. 1 (bars 1 to 16): a flute over plucked chords, ticking
#   4 the Lamp Gallery: Chopin, Prelude in E minor, Op. 28 no. 4 (all of it): piano over strings, the dark before the end
#   5 the ending: Grieg, Hjemkomst (Homecoming, the first 192 rows): strings and a choir: the ships turn for home
# Each loops; a piece shorter than a whole number of patterns is filled out with its own opening accompaniment, so the loop runs on.
# After a change: node tools/devkit/music/loud.mjs carts/lantern-keeper.nova --check, python3 tools/devkit/music/clash.py on the json,
# and node tools/devkit/music/sfx.mjs carts/lantern-keeper.nova 6 for the effects.
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../../tools/devkit/music'))
from kit import *

HERE = os.path.dirname(os.path.abspath(__file__))
a = Audio(chip=2)

# --- The voices of the songs ---
a.voice('EP', 'epiano', 15, -0.05)                 # the piano's tune
a.voice('EPL', 'epiano', 12, -0.05)                # the tune, quieter (where the piano plays alone)
a.voice('EPS', 'epiano', 13, 0.15)                 # its inner voices and chords
a.voice('EPB', 'epiano', 15, -0.2)                 # the piano's left hand
a.voice('EPSQ', 'epiano', 8, 0.1)                  # a chord's notes, soft (three struck at once)
a.voice('PAD', 'strings', 9, -0.15, a=10)          # a soft pad holding the harmony between the piano's notes (the Gymnopedie is sparse)
a.voice('STR', 'strings', 9, 0.2)                  # strings under it
a.voice('STRL', 'strings', 7, -0.1, a=8)           # a tune on the strings (the ending)
a.voice('BASS', 'bass', 11)
a.voice('CEL', 'celesta', 7, -0.1, echo=11)        # the Glass Room's arpeggio
a.voice('CELB', 'celesta', 7, 0.2)
a.voice('FLUTE', 'flute', 5, -0.1, a=4)            # the Clockwork's tune
a.voice('PLUCK', 'pluck', 9, 0.2)                  # its chords: ticking
a.voice('CHOIR', 'choir', 6, 0.1)                  # the ending
# --- The voices of the effects: soft, sampled like the music ---
a.voice('TICK', 'marimba', 9, 0.0)
a.voice('BELL', 'celesta', 8, 0.1)
a.voice('BELLQ', 'celesta', 5, 0.1)
a.voice('WOOD', 'marimba', 11, 0.0)
a.voice('THUD', 'bass', 10, 0.0)
a.voice('SWELL', 'strings', 7, 0.0, a=4, r=30)
a.voice('GLASS', 'celesta', 10, 0.0, echo=12)
a.voice('RUMBLE', 'bass', 13, 0.0, d=90, s=2, r=40)


def read(name):
    """The voices of a piece from scores/<name>.txt: {voice: [(row, pitch, rows)]} and its rows."""
    lines = open(os.path.join(HERE, 'scores', name + '.txt')).read().split('\n')
    rows = int(lines[0].split()[-2])
    out = {}
    for l in lines[1:]:
        if not l.strip(): continue
        v, *toks = l.split()
        out[v] = [tuple(int(x) for x in t.split(':')) for t in toks]
    if 'bass' in out: out['bass2'] = [(r, p + 12, d) for r, p, d in out['bass']]   # (the bass an octave up: for a piece whose left hand is thin)
    return out, rows


def song(name, speed, parts, echo, shift=0, fill=()):
    """A piece as a song: each of its voices on a channel with an instrument (parts: {voice: (channel, instrument)}), moved `shift`
    semitones; a note that ends before its voice's next one is let go (OFF). The piece is filled out to whole patterns with its opening
    in the voices `fill` (the accompaniment), so it loops without a gap. Loops to the start."""
    voices, n = read(name)
    total = -(-n // 64) * 64
    rows = [[None] * 8 for _ in range(total)]
    for key, part in parts.items():
        ch, inst, vs = part if len(part) == 3 else (*part, 0)                                  # (a voice may be moved on its own: vs semitones)
        v, legato = key.rstrip('~'), key.endswith('~')                                           # ('inner~': the voice again, each note held to the next)
        notes = list(voices.get(v, []))
        if key in fill: notes += [(r + n, p, d) for r, p, d in voices[v] if r + n < total]   # (the opening again, to the end of the pattern)
        notes.sort()
        for k, (r, p, d) in enumerate(notes):
            if r >= total: break
            rows[r][ch] = cell(p + shift + vs - 12, a.I[inst])                                # (MIDI 60 is C4: the chip's C-4 is index 48)
            nxt = notes[k + 1][0] if k + 1 < len(notes) else total
            end = nxt if legato else r + d
            if end < nxt and end < total: rows[end][ch] = {'n': 'OFF'}
    S = a.song(Key('C', MAJOR), speed, echo=echo)
    S.rows = rows
    S.finish(loop=0)

HALL = (12, 7, 8, 7)
song('clair', 24, {'lead': (0, 'EPL'), 'alto': (1, 'EPS'), 'bass': (2, 'STR', 12), 'tenor': (3, 'EPS')}, HALL, shift=-12)   # (an octave down: high, the piano pierced)
song('gymnopedie', 26, {'lead': (0, 'EPL'), 'inner~': (1, 'PAD'), 'bass': (2, 'EPB'), 'tenor': (3, 'EPSQ'), 'inner': (4, 'EPSQ'), 'third': (5, 'EPSQ')}, HALL,
     fill=('bass', 'tenor', 'inner', 'third', 'inner~'))
song('prelude', 13, {'lead': (0, 'CEL'), 'bass': (2, 'STR'), 'bass2': (3, 'CELB')}, (10, 7, 8, 8))
song('gnossienne', 24, {'lead': (0, 'FLUTE'), 'alto': (1, 'PLUCK'), 'bass': (2, 'BASS'), 'tenor': (3, 'PLUCK'), 'inner': (4, 'PLUCK')}, (9, 6, 7, 8))
song('chopin', 28, {'lead': (0, 'EP'), 'bass': (2, 'EPB'), 'tenor': (3, 'STR'), 'inner': (4, 'EPS')}, HALL, fill=('bass', 'tenor', 'inner'))
song('hjemkomst', 22, {'lead': (0, 'STRL'), 'alto': (1, 'CHOIR'), 'tenor': (3, 'EPS'), 'bass': (2, 'BASS'), 'inner': (4, 'EPS')}, HALL)

# --- Effects: the order is the SFX table in code.js ---
a.effect(1, ['E-6', None, 'OFF'], 'TICK')                          # 0 the cursor moves
a.effect(2, ['C-6', 'G-6', None, 'OFF'], 'BELLQ')                  # 1 select
a.effect(2, ['G-5', 'C-5', None, 'OFF'], 'BELLQ')                  # 2 pause and resume
a.effect(1, ['G-5', 'C-6', None, 'OFF'], 'WOOD')                   # 3 a piece picked up: a wooden lift
a.effect(1, ['C-5', 'G-4', None, 'OFF'], 'WOOD')                   # 4 put down
a.effect(1, ['D-6', 'A-5', 'OFF'], 'TICK')                         # 5 turned: a click of the mount
a.effect(2, ['C-3', None, 'OFF'], 'THUD')                          # 6 no: a soft thud
a.effect(1, ['A-5', 'E-5', None, 'OFF'], 'BELLQ')                  # 7 undo
a.effect(1, ['E-5', 'A-5', None, 'OFF'], 'BELLQ')                  # 8 redo
for note in ('C-6', 'D-6', 'E-6', 'G-6', 'A-6', 'C-7', 'E-7'):     # 9 to 15 a lens lights: a chime, its pitch its colour's (red 1 .. white 7)
    a.effect(2, [note, None, None, None, 'OFF'], 'GLASS')
a.effect(3, ['G-2', 'A-2', 'C-3', None, None, 'OFF'], 'THUD')      # 16 a door opens: the shutter's grind
a.effect(3, ['C-5', 'E-5', 'G-5', 'C-6', None, None, None, 'OFF'], 'SWELL')   # 17 the room solved: a rising chord
a.effect(2, ['G-6', 'C-7', 'E-7', 'G-7', None, None, 'OFF'], 'BELL')          # 18 a star
a.effect(4, ['C-4', 'G-4', 'C-5', 'E-5', 'G-5', None, None, None, 'OFF'], 'SWELL')   # 19 a floor done: the stair opens
a.effect(2, ['E-5', None, 'OFF'], 'BELLQ')                         # 20 a page of the story turns
a.effect(6, ['C-2', None, None, None, None, None, None, 'OFF'], 'RUMBLE')     # 21 thunder, far off

a.write(sys.argv[1], songs=6)
