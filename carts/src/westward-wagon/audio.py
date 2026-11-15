# Westward Wagon's audio: carts/src/westward-wagon/audio.json.
#   python3 carts/src/westward-wagon/audio.py carts/src/westward-wagon/audio.json
# Eight songs of American tunes of the period, in their own notes (scores.py read them from public domain engravings into
# scores/; SOURCES.md there), arranged for a fiddle (strings), a banjo (pluck), a harmonica (flute) and a bass, and the effects
# numbered as SFX in code.js (spec section 11):
#   0 the title       Soldier's Joy (a fiddle tune of the time): fiddle over banjo
#   1 the prairie     G. F. Root, There's Music in the Air (1857): harmonica; then Soldier's Joy again
#   2 the bluffs      S. C. Foster, The Old Folks at Home (1851): fiddle over a picked banjo
#   3 the mountains   Amazing Grace (New Britain, 1835): harmonica over a drone
#   4 the desert      R. Lowry, Hanson Place (1864): fiddle and strings, like a camp meeting
#   5 the forests     S. C. Foster, Slumber My Darling (1862): harmonica over the banjo's arpeggios
#   6 a grave         Amazing Grace, slow, strings alone over the drone
#   7 the arrival     H. R. Bishop, Home! Sweet Home! (1823): fiddle and harmonica together
# The songs are medleys (tools/devkit/music/medley.py): each piece sets its own speed, and Soldier's Joy in two songs is the same
# patterns. Rules (playbook section 5): leads quiet, no vibrato; songs on channels 0 to 5, effects on 6 and 7 (code.js takes turns).
# After a change: node tools/devkit/music/loud.mjs carts/westward-wagon.nova --check, python3 tools/devkit/music/clash.py on the
# json, and node tools/devkit/music/sfx.mjs carts/westward-wagon.nova 6 for the effects.
import os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '../../../tools/devkit/music'))
from kit import *
from medley import Medley
from score import read_score

a = Audio(chip=2)
a.voice('FIDDLE', 'strings', 6, -0.1, a=4)                      # a fiddle: strings with a quicker bow
a.voice('FIDDLEQ', 'strings', 7, 0.15)
a.voice('BANJO', 'pluck', 8, 0.2)
a.voice('BANJOQ', 'pluck', 6, -0.2)
a.voice('HARP', 'flute', 4, 0.0)                                 # a harmonica
a.voice('BASS', 'bass', 10, 0.0)
a.voice('PAD', 'strings', 5, 0.1)
a.voice('CHOIR', 'choir', 5, -0.1)
a.instrument('BLIP', 'pulse12', 0, 3, 0, 0, 8)                   # effects from here on
a.instrument('CHIME', 'pulse50', 0, 6, 5, 6, 9)
a.instrument('CRUNCH', 'noise', 0, 8, 3, 6, 9)
a.instrument('FANFARE', 'pulse25', 0, 6, 11, 6, 9)
a.voice('FXBELL', 'celesta', 9, 0.0)
a.voice('FXTOLL', 'celesta', 11, 0.0, d=90)
a.voice('FXPLUCK', 'pluck', 10, 0.0)

ROOM, HALL = (5, 4, 5, 9), (12, 8, 8, 7)
m = Medley(a, os.path.join(HERE, 'scores'))
_piece = m.piece
def piece(names, speed, parts):
    """A medley piece whose padding to whole patterns (64 rows) passes at a frame a row: the chip has no pattern break, so the
    row after the last note sets the speed to 1, and the next pattern sets its own again."""
    rows, speeds = _piece(names, speed, parts)
    n = sum(read_score(os.path.join(HERE, 'scores', x + '.txt'))[1] for x in names)
    if n % 64: rows[n][7] = {'fx': 'F01'}
    return rows, speeds
m.piece = piece
JOY = m.piece(['joy'], 9, {'lead': (0, 'FIDDLE', 12), 'bass': (1, 'BASS', 0), 'inner': (2, 'BANJO', 12), 'tenor': (3, 'BANJOQ', 12)})
GRACE_PARTS = {'lead': (0, 'HARP', 12), 'bass': (1, 'PAD', 12), 'inner': (2, 'PAD', 12)}

m.song([JOY], ROOM)                                                                                            # 0 the title
m.song([m.piece(['air'], 16, {'lead': (0, 'HARP', 12), 'bass': (1, 'BASS', 12), 'inner': (2, 'BANJOQ', 12), 'tenor': (3, 'BANJOQ', 12)}), JOY], ROOM)   # 1 the prairie
m.song([m.piece(['oldfolks'], 20, {'lead': (0, 'FIDDLE', 12), 'bass': (1, 'BASS', 12), 'inner': (2, 'BANJO', 12), 'tenor': (3, 'BANJOQ', 12)})], ROOM)    # 2 the bluffs
m.song([m.piece(['grace'], 12, GRACE_PARTS)], HALL)                                                           # 3 the mountains
m.song([m.piece(['hanson'], 10, {'lead': (0, 'FIDDLE', 12), 'bass': (1, 'BASS', 12), 'inner': (2, 'CHOIR', 12), 'tenor': (3, 'PAD', 12)})], HALL)       # 4 the desert
m.song([m.piece(['slumber'], 18, {'lead': (0, 'HARP', 12), 'bass': (1, 'BASS', 12), 'inner': (2, 'BANJO', 12), 'tenor': (3, 'BANJOQ', 12)})], ROOM)     # 5 the forests
m.song([m.piece(['grace'], 18, {'lead': (0, 'FIDDLEQ', 12), 'bass': (1, 'PAD', 12), 'inner': (2, 'PAD', 12)})], HALL)                                     # 6 a grave
m.song([m.piece(['home'], 12, {'lead': (0, 'FIDDLE', 12), 'lead@2': (3, 'HARP', 12, 9), 'bass': (1, 'BASS', 12), 'inner': (2, 'BANJOQ', 12), 'tenor': (4, 'PAD', 12)})], HALL)   # 7 the arrival
print('song lengths in frames:', m.frames)

# --- Effects: the order is the SFX table in code.js ---
a.effect(1, ['E-6', 'OFF'], 'BLIP')                                # 0 menu move
a.effect(2, ['C-6', 'G-6', 'OFF'], 'CHIME')                        # 1 select
a.effect(2, ['E-5', 'B-5', 'OFF'], 'CHIME')                        # 2 pause
a.effect(3, ['C-4', 'G-3', 'D-3', 'A-2', 'OFF'], 'CRUNCH')         # 3 bad news
a.effect(6, ['G-4', 'E-4', 'C-4', None, 'D-4', None, 'C-4', 'OFF'], 'FANFARE')   # 4 the party lost
a.effect(1, ['C-6', 'G-6', 'OFF'], 'BLIP')                         # 5 good news
a.effect(4, ['C-5', 'E-5', 'G-5', 'C-6', None, 'G-5', 'C-6', 'OFF'], 'FANFARE')  # 6 a record
a.effect(1, ['A-5', 'D-4', 'OFF'], 'CRUNCH')                       # 7 a shot
a.effect(2, ['G-3', 'E-3', 'C-3', 'A-2', 'OFF'], 'CRUNCH')         # 8 a rock struck in the river
a.effect(8, ['C-4', None, None, None, None, None, 'OFF'], 'FXTOLL')   # 9 a death's toll
a.effect(2, ['E-6', 'A-6', None, 'OFF'], 'FXBELL')                 # 10 the store's till
a.effect(4, ['G-4', 'C-5', 'E-5', 'G-5', None, 'OFF'], 'FXPLUCK')  # 11 a landmark reached
a.effect(3, ['A-5', None, 'OFF'], 'FXBELL')                        # 12 the ox's bell, now and then on the move

a.write(sys.argv[1], songs=8)
