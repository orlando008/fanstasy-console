# Wick's audio: carts/src/wick/audio.json.
#   python3 carts/src/wick/audio.py carts/src/wick/audio.json
# Seven songs, dark baroque in its own notes (scores.py read them from public domain engravings into scores/;
# SOURCES.md there), on a harpsichord and an organ made here, and the effects numbered as SFX in code.js (spec section
# 11). Rules (playbook section 5): leads quiet, no vibrato; songs on channels 0 to 5, effects on 6 and 7 (code.js
# takes turns). No drums: the pieces have their own pulse.
#   0 the title, the map   Bach, Toccata in D minor (BWV 565): the opening, then its running triplets; organ
#   1 the Dungeon          Bach, Inventions No. 4 in D minor and No. 13 in A minor; harpsichord
#   2 the Laboratory       Scarlatti, Sonata in C minor K. 11 (its first half); Bach, Prelude in D minor (WTC I); harpsichord
#   3 the Clock Tower      Bach, Prelude in C minor (WTC I): sixteenths like a movement running; harpsichord
#   4 the Rooftops         Bach, Fantasia in G minor (BWV 542); organ
#   5 the chase            Bach, the Fugue in D minor (BWV 565); organ, quick
#   6 the ending           Bach, Prelude in C major (WTC I); harpsichord over a soft organ
# The songs are medleys (tools/devkit/music/medley.py): each piece starts a pattern with its own speed. After a change:
# node tools/devkit/music/loud.mjs carts/wick.nova --check, and node tools/devkit/music/sfx.mjs carts/wick.nova 6.
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../../tools/devkit/music'))
from kit import *
from samples import additive, looped
from medley import Medley

HERE = os.path.dirname(os.path.abspath(__file__))
a = Audio(chip=2)

# --- A harpsichord: a plucked string, every partial there at the pluck (a bright buzz), the high ones gone in a moment ---
P, att = 32, []
for c in range(28):
    t = c / 28
    att += additive([1, 0.75 * (1 - t) + 0.2, 0.6 * (1 - t) + 0.1, 0.5 * (1 - t) ** 1.5 + 0.05, 0.4 * (1 - t) ** 2, 0.3 * (1 - t) ** 2, 0.22 * (1 - t) ** 3, 0.15 * (1 - t) ** 3], P)
hs = looped(att, additive([1, 0.2, 0.1, 0.05], P), P)
HARPSI = a.sample(hs['vals'], hs['rate'], hs['loop'])
a.instrument('HARPS', 'sample', 0, 40, 0, 10, 10, (0, 0), -0.12, HARPSI, 5, 'exp')     # the right hand
a.instrument('HARPSL', 'sample', 0, 70, 0, 12, 15, (0, 0), 0.12, HARPSI, 4, 'exp')     # the left
a.instrument('HARPS2', 'sample', 0, 44, 0, 10, 12, (0, 0), 0.05, HARPSI, 4, 'exp')      # the tune's second string, an octave down
a.instrument('HARPSQ', 'sample', 0, 36, 0, 8, 7, (0, 0), 0.0, HARPSI, 5, 'exp')       # inner notes
# --- An organ: pipes at the octave and the twelfth over the note, steady for as long as the key is down ---
og = looped(additive([1, 0.55, 0.3, 0.32, 0.08, 0.14, 0.03, 0.1], P) * 2, additive([1, 0.5, 0.28, 0.3, 0.07, 0.12, 0.03, 0.09], P), P)
ORGAN_S = a.sample(og['vals'], og['rate'], og['loop'])
a.instrument('ORGAN', 'sample', 1, 0, 15, 5, 4, (0, 0), -0.1, ORGAN_S, 7, 'lin')      # the tune
a.instrument('ORGANB', 'sample', 1, 0, 15, 6, 10, (0, 0), 0.1, ORGAN_S, 5, 'lin')      # the pedals
a.instrument('ORGAN2', 'sample', 1, 0, 15, 5, 5, (0, 0), 0.05, ORGAN_S, 6, 'lin')       # the tune's second stop, an octave down
a.instrument('ORGANQ', 'sample', 1, 0, 15, 5, 5, (0, 0), 0.0, ORGAN_S, 7, 'lin')      # inner parts, and a bed under the harpsichord
# --- The voices of the effects ---
a.instrument('BLIP', 'pulse12', 0, 3, 0, 0, 7)
a.instrument('HISS', 'noise', 0, 10, 0, 4, 9)
a.instrument('SNAP', 'noise', 0, 3, 0, 0, 7)
a.voice('FXBELL', 'celesta', 9, 0.0)
a.voice('FXTAP', 'marimba', 9, 0.0, d=6)
a.voice('FXLOW', 'strings', 7, 0.0)
a.instrument('FXPLUCK', 'sample', 0, 20, 0, 6, 8, (0, 0), 0.0, HARPSI, 4, 'exp')

m = Medley(a, os.path.join(HERE, 'scores'))
def song(pieces, echo):
    frames = m.song(pieces, echo)
    print('song %d: %d patterns in order, %d frames (%.0f s)' % (len(a.songs) - 1, len(a.songs[-1]['order']), frames, frames / 60))

VAULT, ROOM, HALL = (12, 8, 8, 6), (5, 4, 4, 9), (9, 6, 6, 7)
# (the tune is doubled an octave down on a second, quieter stop, as both instruments do with a second set of pipes or
# strings: where a fugue's or an invention's voice begins alone, it is not one thin channel on its own)
ORG = {'lead': (0, 'ORGAN', 0), 'lead@2': (4, 'ORGAN2', -12), 'bass': (1, 'ORGANB', 0), 'inner': (2, 'ORGANQ', 0), 'tenor': (3, 'ORGANQ', 0)}
HPS = {'lead': (0, 'HARPS', 0), 'lead@2': (4, 'HARPS2', -12), 'bass': (1, 'HARPSL', 0), 'inner': (2, 'HARPSQ', 0), 'tenor': (3, 'HARPSQ', 0)}
song([m.piece(['toccata'], 10, ORG), m.piece(['toccata2'], 7, ORG)], VAULT)                       # 0 the title
song([m.piece(['invention4'], 7, HPS), m.piece(['invention13'], 8, HPS)], ROOM)                   # 1 the Dungeon
song([m.piece(['k11'], 8, HPS), m.piece(['prelude6'], 8, HPS)], ROOM)                             # 2 the Laboratory
song([m.piece(['prelude2'], 8, HPS)], ROOM)                                                       # 3 the Clock Tower
song([m.piece(['fantasia'], 9, ORG)], VAULT)                                                      # 4 the Rooftops
song([m.piece(['fugue'], 7, ORG)], HALL)                                                          # 5 the chase
song([m.piece(['prelude1'], 12, {'lead': (0, 'HARPS', 0), 'bass': (1, 'ORGANQ', 0), 'bass@2': (2, 'HARPSL', 0), 'inner': (3, 'HARPSQ', 0)})], HALL)   # 6 the ending

# --- Effects: the order is the SFX table in code.js ---
a.effect(1, ['E-5', 'OFF'], 'FXTAP')                                       # 0 a menu move: a tap
a.effect(2, ['D-5', 'A-5', None, 'OFF'], 'FXPLUCK')                        # 1 select: two plucked notes
a.effect(2, ['A-5', 'D-5', None, 'OFF'], 'FXPLUCK')                        # 2 pause
a.effect(2, ['C-6', 'G-5', 'C-5', 'F-4', 'OFF'], 'HISS')                   # 3 snuffed out: a hiss, falling
a.effect(1, ['A-4', 'D-5', 'OFF'], 'BLIP')                                 # 4 a jump: a small rising blip
a.effect(1, ['D-5', 'A-5', 'OFF'], 'BLIP')                                 # 5 a wall jump: the same, higher
a.effect(3, ['D-5', 'F-5', 'A-5', 'D-6', None, None, 'OFF'], 'FXBELL')     # 6 the lantern lit: a rising chime
a.effect(1, ['C-3', 'OFF'], 'FXTAP')                                       # 7 a landing: a soft knock
a.effect(2, ['A-6', 'E-7', None, 'OFF'], 'FXBELL')                         # 8 an ember: two bright notes
a.effect(1, ['G-4', 'C-4', 'OFF'], 'SNAP')                                 # 9 a shelf cracking
a.effect(3, ['D-6', 'A-6', 'D-7', None, 'A-6', 'D-7', None, None, 'OFF'], 'FXBELL')   # 10 a new best time
a.effect(4, ['D-3', 'C#3', None, 'D-3', None, 'OFF'], 'FXLOW')             # 11 the Snuffer starts after him: a low string
a.effect(4, ['D-4', 'A-4', 'D-5', None, 'F-5', None, 'A-5', None, None, 'OFF'], 'FXBELL')   # 12 a world lit: a slow rising chord

a.write(sys.argv[1], songs=7)
