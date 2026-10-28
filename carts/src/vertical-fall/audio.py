# Vertical Fall's audio: carts/src/vertical-fall/audio.json.
#   python3 carts/src/vertical-fall/audio.py carts/src/vertical-fall/audio.json
# Two songs for now (0 the title, 1 the game: the starter's, until the audio pass, step 7) and the effects numbered as SFX in code.js. Written with the song
# toolkit (tools/devkit/music/kit.py; its header explains the bar() arguments). Rules (playbook section 5):
# leads are quiet, with no vibrato; songs use channels 0 to 5 and effects 6 and 7 (code.js takes turns); the drums are
# samples on channel 5. The new sound chip (SPEC 5): sampled instruments from samples.py (a.voice) and an echo per song.
# After a change: node tools/devkit/music/loud.mjs carts/vertical-fall.nova --check (levels; the lead alone must stay at most
# 0.07 RMS and 0.75 of the mix) and python3 tools/devkit/music/clash.py on the json.
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
a.instrument('PEW', 'pulse25', 0, 4, 0, 0, 5)                   # the gunboots: short and quiet, it is heard a lot
a.instrument('TICK', 'noise-short', 0, 2, 0, 0, 6)

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
a.effect(1, ['E-6', 'OFF'], 'BLIP')                                # 0 menu move
a.effect(2, ['C-6', 'G-6', 'OFF'], 'CHIME')                        # 1 select
a.effect(2, ['E-5', 'B-5', 'OFF'], 'CHIME')                        # 2 pause
a.effect(3, ['C-4', 'G-3', 'D-3', 'A-2', 'OFF'], 'CRUNCH')         # 3 a hit (noise)
a.effect(6, ['G-4', 'E-4', 'C-4', None, 'D-4', None, 'C-4', 'OFF'], 'FANFARE')   # 4 game over
a.effect(1, ['C-6', 'G-6', 'OFF'], 'BLIP')                         # 5 a point
a.effect(4, ['C-5', 'E-5', 'G-5', 'C-6', None, 'G-5', 'C-6', 'OFF'], 'FANFARE')  # 6 a record
a.effect(1, ['A-4', 'E-5', 'OFF'], 'BLIP')                         # 7 jump
a.effect(1, ['C-6', 'F-5', 'C-5', 'OFF'], 'PEW')                   # 8 a gunboot shot
a.effect(1, ['A-2', 'OFF'], 'THUD')                                # 9 land
a.effect(1, ['C-2', 'OFF'], 'TICK')                                # 10 out of ammo: a click
a.effect(3, ['C-5', 'E-5', 'G-5', 'C-6', 'OFF'], 'CHIME')          # 11 a level's floor

a.write(sys.argv[1], songs=2)
