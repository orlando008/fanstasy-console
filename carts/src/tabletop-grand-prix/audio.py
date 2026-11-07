# Tabletop Grand Prix's audio: carts/src/tabletop-grand-prix/audio.json.
#   python3 carts/src/tabletop-grand-prix/audio.py carts/src/tabletop-grand-prix/audio.json
# Five songs, lively public domain pieces in their own notes (scores.py read them from public domain and CC0 MIDI files
# into scores/; SOURCES.md there), arranged for the sampled instruments, and the effects numbered as SFX in code.js
# (spec 11). Rules (playbook section 5): leads quiet, in octave 4, no vibrato; songs on channels 0 to 5, effects on 6 and
# 7 (code.js takes turns).
#   0 the title: Lumbye, Champagne Galop (32 bars): a soft horn over plucked chords, a galop's drums, the cork's pop
#   1 the menus: Suppe, Poet and Peasant overture, the opening chorale (16 bars): strings and a choir, calm
#   2 the Breakfast races: Bellak, Musket Galop (32 bars): a flute over the piano's chords, quick drums
#   3 the Workshop races: Grieg, In the Hall of the Mountain King (16 bars): the theme plucked and doubled on a soft horn, drums
#   4 the results and the podium: Elgar, Pomp and Circumstance March No. 1, the trio (40 bars): strings and a choir
# Each loops. After a change: node tools/devkit/music/loud.mjs carts/tabletop-grand-prix.nova --check, python3
# tools/devkit/music/clash.py on the json, and node tools/devkit/music/sfx.mjs carts/tabletop-grand-prix.nova 6 for the effects.
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../../tools/devkit/music'))
from kit import *

HERE = os.path.dirname(os.path.abspath(__file__))
a = Audio(chip=2)
a.sample(kick()); a.sample(snare()); a.sample(hat(0.05, 70, 3))

# --- The voices of the songs ---
a.voice('HORN', 'brass', 6, -0.1, a=3)              # a soft horn's tune
a.voice('FLUTE', 'flute', 5, -0.1)                  # the Breakfast tune
a.voice('STRL', 'strings', 7, -0.1)                 # a tune on the strings (the podium)
a.voice('STRLQ', 'strings', 6, -0.1)                # the chorale's tune, a little quieter (the menus)
a.voice('STR', 'strings', 6, 0.2)                   # strings under it
a.voice('CHOIR', 'choir', 6, 0.15)
a.voice('PLUCK', 'pluck', 11, 0.2)                  # chords, plucked
a.voice('PLUCKL', 'pluck', 15, -0.05)               # the Mountain King's theme, plucked like a bassoon's staccato
a.voice('HORNQ', 'brass', 4, 0.1, a=2)               # and doubled softly on a horn
a.voice('EP', 'epiano', 12, 0.15)                   # the galop's piano chords
a.voice('BASS', 'bass', 12)
a.instrument('KICK', 'sample', 0, 0, 15, 0, 10, sample=0, echo=2)
a.instrument('SNARE', 'sample', 0, 0, 15, 0, 7, sample=1, echo=4)
a.instrument('HAT', 'sample', 0, 0, 15, 0, 3, pan=0.25, sample=2)
# --- The voices of the effects: soft, mostly sampled ---
a.voice('TICK', 'marimba', 11, 0.0)
a.voice('BELL', 'celesta', 8, 0.1)
a.voice('BELLQ', 'celesta', 5, 0.1)
a.voice('THUD', 'bass', 11, 0.0)
a.voice('FANF', 'brass', 7, 0.0, a=2)
a.instrument('CRUNCH', 'noise', 0, 6, 0, 2, 7)
a.instrument('SKID', 'noise-short', 0, 10, 0, 4, 4)


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


# A bar's drums (bar length in rows: a pattern a beat of 4 rows): K kick, S snare, s soft snare, h hat.
GALOP = 'K.h.S.h.'                 # 2/4: oom-pah
MARCH = 'K.h.S.h.K.h.S.hS'         # 4/4, a roll at the end


def song(name, speed, parts, echo, drums=None, shift=0):
    """A piece as a song: each of its voices on a channel with an instrument (parts: {voice: (channel, instrument,
    semitones)}), moved `shift` semitones more; a note that ends before its voice's next one is let go (OFF). drums: a
    bar's pattern, repeated, on channel 5. Loops to the start."""
    voices, n = read(name)
    total = -(-n // 64) * 64
    rows = [[None] * 8 for _ in range(total)]
    for key, (ch, inst, vs) in parts.items():
        notes = voices.get(key.split('@')[0], [])   # ('lead@2': the same voice again, on another channel)
        for k, (r, p, d) in enumerate(notes):
            if r >= total: break
            rows[r][ch] = cell(p + shift + vs - 12, a.I[inst])                                # (MIDI 60 is C4: the chip's C-4 is index 48)
            nxt = notes[k + 1][0] if k + 1 < len(notes) else total
            if r + d < nxt and r + d < total: rows[r + d][ch] = {'n': 'OFF'}
    if drums:
        for r in range(total):
            c = drums[r % len(drums)]
            if c == 'K': rows[r][5] = cell('C-4', a.I['KICK'])
            elif c == 'S': rows[r][5] = cell('C-4', a.I['SNARE'])
            elif c == 's': rows[r][5] = cell('C-4', a.I['SNARE'], 6)
            elif c == 'h': rows[r][5] = cell('C-4', a.I['HAT'])
    S = a.song(Key('C', MAJOR), speed, echo=echo)
    S.rows = rows
    S.finish(loop=0)

ROOM, HALL = (5, 4, 5, 9), (12, 7, 8, 7)
song('champagne', 5, {'lead': (0, 'HORN', 0), 'inner': (1, 'PLUCK', 0), 'tenor': (3, 'PLUCK', 0), 'bass': (2, 'BASS', 12)}, ROOM, GALOP)
song('poet', 12, {'lead': (0, 'STRLQ', 0), 'inner': (1, 'STR', 0), 'tenor': (3, 'CHOIR', 0), 'bass': (2, 'BASS', 12)}, HALL)
song('musket', 5, {'lead': (0, 'FLUTE', -12), 'inner': (1, 'EP', -12), 'tenor': (3, 'EP', -12), 'bass': (2, 'BASS', 0)}, ROOM, GALOP)
song('mountain', 6, {'lead': (0, 'PLUCKL', 12), 'lead@2': (3, 'HORNQ', 12), 'inner': (1, 'HORN', 12), 'bass': (2, 'BASS', 24)}, ROOM, MARCH)
song('pomp', 8, {'lead': (0, 'STRL', 0), 'inner': (1, 'CHOIR', 0), 'tenor': (3, 'STR', 0), 'bass': (2, 'BASS', 12)}, HALL)

# --- Effects: the order is the SFX table in code.js ---
a.effect(1, ['E-6', None, 'OFF'], 'TICK')                          # 0 menu move
a.effect(2, ['C-6', 'G-6', None, 'OFF'], 'BELLQ')                  # 1 select
a.effect(2, ['G-5', 'C-5', None, 'OFF'], 'BELLQ')                  # 2 pause and resume
a.effect(2, ['C-3', None, 'OFF'], 'THUD')                          # 3 a bump against a wall
a.effect(3, ['C-6', 'A-5', 'F-5', 'D-5', 'B-4', 'G-4', 'E-4', 'OFF'], 'BELLQ')   # 4 a fall off the table: a falling whistle
a.effect(1, ['E-3', None, 'OFF'], 'THUD')                          # 5 a landing
a.effect(2, ['C-5', 'G-4', 'OFF'], 'CRUNCH')                       # 6 a car out (a pop)
a.effect(2, ['C-5', None, 'OFF'], 'TICK')                          # 7 the count: a tick
a.effect(2, ['C-6', None, None, None, 'OFF'], 'BELL')              # 8 GO!
a.effect(2, ['C-5', 'E-5', 'G-5', 'C-6', None, None, 'OFF'], 'BELL')            # 9 a round won: a little jingle
a.effect(4, ['C-4', 'E-4', 'G-4', 'C-5', None, 'G-4', 'C-5', None, None, 'OFF'], 'FANF')   # 10 a race won: a fanfare
a.effect(1, ['C-5', 'E-5', 'G-5', 'C-6', 'OFF'], 'TICK')           # 11 a jump: up the ramp
a.effect(2, ['D-4', 'A-3', 'OFF'], 'THUD')                         # 12 a bump against a car
a.effect(2, ['C-6', None, None, 'OFF'], 'SKID')                    # 13 a skid (a person's car starts to slide)
a.effect(3, ['C-5', 'E-5', 'G-5', 'C-6', 'E-6', 'G-6', None, None, None, 'OFF'], 'BELL')   # 14 the Workshop cup unlocked

a.write(sys.argv[1], songs=5)
