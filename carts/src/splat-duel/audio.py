# Splat Duel's audio: carts/src/splat-duel/audio.json.
#   python3 carts/src/splat-duel/audio.py carts/src/splat-duel/audio.json
# Two songs (0 the title, 1 the game) and the effects numbered as SFX in code.js. Written with the song
# toolkit (tools/devkit/music/kit.py; its header explains the bar() arguments). Rules (playbook section 5):
# leads are quiet, with no vibrato; songs use channels 0 to 5 and effects 6 and 7 (code.js takes turns); the drums are
# samples on channel 5. The new sound chip (SPEC 5): sampled instruments from samples.py (a.voice) and an echo per song.
# After a change: node tools/devkit/music/loud.mjs carts/splat-duel.nova --check (levels; the lead alone must stay at most
# 0.07 RMS and 0.75 of the mix) and python3 tools/devkit/music/clash.py on the json.
# Ready-made songs (a boss theme, a victory, a town...): tools/devkit/music/songs/README.md, added after the game's own
# with library.add(a, name), which returns the song's number.
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../../tools/devkit/music'))
from kit import *

a = Audio(chip=2)
a.sample(kick()); a.sample(snare()); a.sample(hat(0.05, 70, 3)); a.sample(hat(0.15, 22, 5))

a.voice('LEAD', 'flute', 5, -0.15)
a.voice('BASS', 'bass', 12)
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

# --- 0 The title: A minor, 150 bpm ---
S = a.song(Key('A', MINOR), 6, echo=(5, 4, 5, 9))
CH = ['1', '6', '3', '7']
bars(S, 16, CH, None, drums='soft', bass='long', upper='pad', counter='1 3 5 8 5 3 1 3', ci='ARP')   # the pad first, so the lead does not arrive with a jump
bars(S, 16, CH, ['A3 - C4 - E4 - A4 -', 'A4 - G4 - F4 - C4 -', 'E4 - G4 - C5 - G4 -', 'D4 - G4 - B4 - G4 -'], li='SOFTHORN', drums='drive', bass='1 - - - 5 - - -', upper='arp1')
S.finish()

# --- 1 The game: C major, 128 bpm ---
S = a.song(Key('C', MAJOR), 7, echo=(5, 4, 5, 9))
CH = ['1', '5', '6', '4']
bars(S, 16, CH, ['C4 - E4 - G4 - E4 -', 'D4 - G4 - B4 - G4 -', 'E4 - A4 - C5 - A4 -', 'C4 - F4 - A4 - F4 -'], li='LEAD', drums='basic', bass='1 - 5 - 1 - 5 -', upper='arp')
bars(S, 16, CH, ['G4 - E4 - C4 - E4 -', 'B4 - G4 - D4 - G4 -', 'A4 - C5 - E5 - C5 -', 'A4 - F4 - C4 - F4 .'], li='SOFTHORN', drums='basic', bass='1 - 5 - 1 - 5 -', upper='arp1')
S.finish()

# --- Effects: the order is the SFX table in code.js ---
a.instrument('POP', 'noise', 0, 5, 0, 0, 10)
a.instrument('SQUISH', 'noise', 1, 9, 0, 6, 8)
a.instrument('TWANG', 'pulse25', 0, 5, 0, 0, 9)
a.instrument('SPARK', 'triangle', 0, 7, 6, 8, 10)
a.effect(1, ['E-6', 'OFF'], 'BLIP')                                # 0 menu move
a.effect(2, ['C-6', 'G-6', 'OFF'], 'CHIME')                        # 1 select
a.effect(2, ['E-5', 'B-5', 'OFF'], 'CHIME')                        # 2 pause
a.effect(1, ['A-5', 'OFF'], 'BLIP')                                # 3 an aiming step
a.effect(1, ['G-3', 'D-4', 'A-4', 'E-5', 'OFF'], 'TWANG')          # 4 the slingshot lets go
a.effect(2, ['C-5', 'G-4', 'D-4', 'A-3', 'OFF'], 'POP')            # 5 a splat on a wall
a.effect(2, ['G-3', 'D-3', 'OFF'], 'SQUISH')                       # 6 a splat on the ground
a.effect(2, ['E-6', 'G-6', 'B-6', 'E-7', 'OFF'], 'SPARK')          # 7 a power-up revealed
a.effect(3, ['C-5', 'E-5', 'G-5', 'C-6', 'E-6', 'OFF'], 'FANFARE') # 8 a power-up collected
a.effect(3, ['G-5', 'C-6', 'OFF'], 'CHIME')                        # 9 the handoff is ready for a press
a.effect(2, ['C-4', 'D-4', 'E-4', 'F-4', 'G-4', 'OFF'], 'SQUISH')  # 10 the paint roller
a.effect(3, ['A-4', 'F-4', 'D-4', 'OFF'], 'SQUISH')                # 11 the sponge
a.effect(5, ['C-5', 'E-5', 'G-5', 'C-6', None, 'G-5', 'C-6', 'OFF'], 'FANFARE')  # 12 a win
a.effect(1, ['C-4', 'OFF'], 'THUD')                                # 13 an aiming step at the limit

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../../tools/devkit/music/songs'))
from library import add
WIN = add(a, 'ode_to_joy')            # 2: SONG.win in code.js
assert WIN == 2, WIN
a.write(sys.argv[1], songs=3)
