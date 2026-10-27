# Flow State's audio: carts/src/flow-state/audio.json.
#   python3 carts/src/flow-state/audio.py carts/src/flow-state/audio.json
# Songs: 0 the title, then the pieces (pieces.py: the notes; this script compiles them into songs and into rom/charts.bin) and the effects numbered as SFX in code.js. Written with the song
# toolkit (tools/devkit/music/kit.py; its header explains the bar() arguments). Rules (playbook section 5):
# leads are quiet, with no vibrato; songs use channels 0 to 5 and effects 6 and 7 (code.js takes turns); the drums are
# samples on channel 5. The new sound chip (SPEC 5): sampled instruments from samples.py (a.voice) and an echo per song.
# After a change: node tools/devkit/music/loud.mjs carts/flow-state.nova --check (levels; the lead alone must stay at most
# 0.07 RMS and 0.75 of the mix) and python3 tools/devkit/music/clash.py on the json.
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../../tools/devkit/music'))
from kit import *
from pieces import *

a = Audio(chip=2)
a.sample(kick()); a.sample(snare()); a.sample(hat(0.05, 70, 3)); a.sample(hat(0.15, 22, 5))

a.voice('LEAD', 'flute', 5, -0.15)
a.voice('BASS', 'bass', 14)
a.instrument('HAT', 'sample', 0, 0, 15, 0, 4, pan=0.25, sample=2)
a.instrument('OHAT', 'sample', 0, 0, 15, 0, 4, pan=0.25, sample=3)
a.voice('PAD', 'strings', 5, 0.2)
a.voice('ARP', 'pluck', 13, 0.25)
a.instrument('KICK', 'sample', 0, 0, 15, 0, 12, sample=0, echo=2)
a.instrument('SNARE', 'sample', 0, 0, 15, 0, 10, sample=1, echo=5)
a.voice('SOFTHORN', 'brass', 6, -0.15, a=6)
a.instrument('BLIP', 'pulse12', 0, 3, 0, 0, 8)                 # effects from here on
a.instrument('CHIME', 'pulse50', 0, 6, 5, 6, 9)
a.instrument('THUD', 'pulse50', 0, 4, 0, 0, 11)
a.instrument('CRUNCH', 'noise', 0, 8, 3, 6, 9)
a.instrument('FANFARE', 'pulse25', 0, 6, 11, 6, 9)

# --- 0 The title and the map: the Prelude in C; then the pieces (1 on), the pads and the sound from the same notes ---
a.voice('PLUCK', 'pluck', 15, -0.1)
a.voice('STRINGS', 'strings', 8, 0.1, a=0)
a.voice('EPIANO', 'epiano', 15, 0.0)
a.voice('ELEAD', 'epiano', 5, 0.0)
a.voice('FLUTE', 'flute', 4, -0.1, a=0)
a.voice('SOFTPLUCK', 'pluck', 10, -0.1)
compile_piece(a, PRELUDE)
for pc in PIECES: compile_piece(a, pc)

# --- Effects: the order is the SFX table in code.js ---
a.effect(1, ['E-6', 'OFF'], 'BLIP')                                # 0 menu move
a.effect(2, ['C-6', 'G-6', 'OFF'], 'CHIME')                        # 1 select
a.effect(2, ['E-5', 'B-5', 'OFF'], 'CHIME')                        # 2 pause
a.effect(3, ['C-4', 'G-3', 'D-3', 'A-2', 'OFF'], 'CRUNCH')         # 3 a hit (noise)
a.effect(6, ['G-4', 'E-4', 'C-4', None, 'D-4', None, 'C-4', 'OFF'], 'FANFARE')   # 4 game over
a.effect(1, ['C-6', 'G-6', 'OFF'], 'BLIP')                         # 5 a point
a.effect(4, ['C-5', 'E-5', 'G-5', 'C-6', None, 'G-5', 'C-6', 'OFF'], 'FANFARE')  # 6 a record

a.write(sys.argv[1], songs=1 + len(PIECES))
os.makedirs(os.path.join(os.path.dirname(os.path.abspath(sys.argv[1])), 'rom'), exist_ok=True)
open(os.path.join(os.path.dirname(os.path.abspath(sys.argv[1])), 'rom', 'charts.bin'), 'wb').write(charts_blob(PIECES))   # the charts, from the same notes
