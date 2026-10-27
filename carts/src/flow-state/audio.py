# Flow State's audio: carts/src/flow-state/audio.json.
#   python3 carts/src/flow-state/audio.py carts/src/flow-state/audio.json
# Songs: 0 the title, then the pieces (pieces.py: the notes; this script compiles them into songs and into rom/charts.bin) and the effects numbered as SFX in code.js. Written with the song
# toolkit (tools/devkit/music/kit.py; its header explains the bar() arguments). Rules (playbook section 5):
# leads are quiet, with no vibrato; songs use channels 0 to 2 and effects 6 and 7 (code.js takes turns); there are no drums
# in this game. The new sound chip (SPEC 5): sampled instruments from samples.py (a.voice) and an echo per song.
# After a change: node tools/devkit/music/loud.mjs carts/flow-state.nova --check (levels; the lead alone must stay at most
# 0.07 RMS and 0.75 of the mix) and python3 tools/devkit/music/clash.py on the json.
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../../tools/devkit/music'))
from kit import *
from pieces import *

a = Audio(chip=2)

# --- The voices of the songs (the pieces' notes are in pieces.py), then of the effects ---
a.voice('BASS', 'bass', 14)
a.voice('PLUCK', 'pluck', 15, -0.1)
a.voice('STRINGS', 'strings', 8, 0.1, a=0)
a.voice('EPIANO', 'epiano', 15, 0.0)
a.voice('ELEAD', 'epiano', 5, 0.0)
a.voice('TICK', 'epiano', 15, 0.0)                                   # the Air's bass pulse: an electric piano tick, so the beat the pads follow can be heard
a.voice('FLUTE', 'flute', 4, -0.1, a=0)
a.voice('SOFTPLUCK', 'pluck', 10, -0.1)
# Effects: sampled and soft like the music (a bell, a wooden bar, a swell of strings), never louder than 0.05 on their own; a hit's plink has the pitch
# class of the pad that was hit (the music's note and the plink then agree) in three softnesses: a perfect is a bell, a good a bar, an ok a quiet bar.
a.voice('CEL', 'celesta', 7, 0.15)
a.voice('CELQ', 'celesta', 4, 0.15)
a.voice('MAR', 'marimba', 9, -0.1)
a.voice('MARQ', 'marimba', 5, -0.1)
a.voice('SWELL', 'strings', 6, 0.0, a=14, r=40)
a.voice('CLICK', 'marimba', 15, 0.0, d=24)

# --- Song 0, the title and the map: the Prelude in C; then the pieces (songs 1 on): the pads and the sound from the same notes ---
compile_piece(a, PRELUDE)
for pc in PIECES: compile_piece(a, pc)

# --- Effects: the order is the SFX table in code.js ---
a.effect(1, ['G-5', None, 'OFF'], 'CELQ')                          # 0 menu move
a.effect(2, ['C-6', 'G-6', None, 'OFF'], 'CEL')                    # 1 select
a.effect(2, ['G-5', 'C-5', None, 'OFF'], 'CELQ')                   # 2 pause and resume
a.effect(2, ['A-3', None, None, 'OFF'], 'MARQ')                    # 3 a stray tap, or a closed door: a soft thup
a.effect(2, ['C-6', 'E-6', None, None, 'OFF'], 'CEL')              # 4 the multiplier is x2
a.effect(2, ['C-6', 'E-6', 'G-6', None, None, 'OFF'], 'CEL')       # 5 x3 (and a stretch opens)
a.effect(6, ['C-5', 'E-5', 'G-5', 'C-6', None, None, None, None, 'OFF'], 'SWELL')     # 6 flow state: a swell of strings climbing a chord
a.effect(3, ['C-5', 'E-5', 'G-5', 'C-6', None, 'G-5', 'E-6', None, None, 'OFF'], 'CEL')     # 7 the end of a stretch, a good grade: an arpeggio of bells
a.effect(4, ['G-5', 'C-6', None, None, 'OFF'], 'CELQ')             # 8 the end of a stretch, a lower grade: two soft bells
a.effect(2, ['C-6', 'E-6', 'G-6', 'C-7', 'E-7', 'G-7', None, 'OFF'], 'CEL')                 # 9 a new best: a sparkle running up
a.effect(2, ['C-5', None, 'OFF'], 'CLICK')                         # 10 the calibration's tick
a.effect(2, ['A-4', None, 'OFF'], 'MAR')                           # 11 the count-in: 3, 2, 1
a.effect(2, ['E-5', 'A-5', None, 'OFF'], 'MAR')                    # 12 GO
for g, (inst, octave) in enumerate((('CEL', 6), ('MAR', 5), ('MARQ', 5))):                  # 13 on: the plinks, 12 pitch classes for each judgement
    for pc in range(12): a.effect(2, [nn(12 * octave + pc), None, None, 'OFF'], inst)

a.write(sys.argv[1], songs=1 + len(PIECES))
os.makedirs(os.path.join(os.path.dirname(os.path.abspath(sys.argv[1])), 'rom'), exist_ok=True)
open(os.path.join(os.path.dirname(os.path.abspath(sys.argv[1])), 'rom', 'charts.bin'), 'wb').write(charts_blob(PIECES))   # the charts, from the same notes
