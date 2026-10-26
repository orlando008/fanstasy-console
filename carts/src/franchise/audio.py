# The Franchise: Basketball Edition's audio: carts/src/franchise/audio.json.
#   python3 carts/src/franchise/audio.py carts/src/franchise/audio.json
# Two songs (0 the title, 1 the game) and the effects numbered as SFX in code.js. Written with the song
# toolkit (tools/devkit/music/kit.py; its header explains the bar() arguments). Rules (playbook section 5):
# leads are quiet, with no vibrato; songs use channels 0 to 5 and effects 6 and 7 (code.js takes turns); the drums are
# samples on channel 5. The new sound chip (SPEC 5): sampled instruments from samples.py (a.voice) and an echo per song.
# After a change: node tools/devkit/music/loud.mjs carts/franchise.nova --check (levels; the lead alone must stay at most
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
a.voice('EP', 'epiano', 8, -0.1)
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

# --- 1 The hub: F major, 100 bpm, mellow: an electric piano over a soft groove ---
S = a.song(Key('F', MAJOR), 9, echo=(6, 4, 5, 8))
CH = ['1', '5', '6', '4']
bars(S, 16, CH, ['A4 - C5 - A4 - F4 -', 'G4 - C5 - E5 - C5 -', 'F4 - A4 - D5 - A4 -', 'D5 - C5 - A4 - F4 .'], li='EP', drums='soft', bass='1 - - - 5 - - -', upper='pad')
bars(S, 16, CH, ['C5 - A4 - F4 - A4 -', 'E4 - G4 - C5 - G4 -', 'D4 - F4 - A4 - D5 -', 'D5 - Bb4 - F4 - F4 .'], li='EP', drums='soft', bass='1 - - - 5 - - -', upper='arp')
S.finish()

# --- 2 The game night: E minor, 150 bpm, brisk ---
S = a.song(Key('E', MINOR), 6, echo=(5, 4, 5, 9))
CH = ['1', '6', '3', '7']
bars(S, 16, CH, ['E4 - G4 - B4 - G4 -', 'E4 - G4 - C5 - G4 -', 'D4 - G4 - B4 - G4 -', 'F#4 - A4 - D5 - A4 -'], li='SOFTHORN', drums='drive', bass='1 - 1 - 1 - 5 -', upper='arp1')
bars(S, 16, CH, ['B4 - G4 - E4 - G4 -', 'C5 - G4 - E4 - G4 -', 'B4 - G4 - D4 - G4 -', 'A4 - F#4 - D4 - F#4 .'], li='LEAD', drums=['bouncy', 'bouncy', 'bouncy', 'drive'], bass='1 - 1 - 1 - 5 -', upper='arp1', fill=[False, False, False, True])
S.finish()

# --- 3 The draft: D minor, 90 bpm, tense: strings and a plucked line, no drums until the last bars ---
S = a.song(Key('D', MINOR), 10, echo=(8, 5, 6, 7))
CH = ['1', '6', '4', '5']
bars(S, 16, CH, ['A4 - - - F4 - D4 -', 'D5 - - - Bb4 - F4 -', 'G4 - - - Bb4 - D5 -', 'E4 - - - G4 - C5 -'], li='SOFTHORN', drums='none', bass='long', upper='pad', counter='1 - 3 - 5 - 3 -', ci='ARP')
bars(S, 16, CH, ['A4 - D5 - F5 - D5 -', 'F4 - Bb4 - D5 - Bb4 -', 'G4 - Bb4 - D5 - Bb4 -', 'A4 - C5 - E5 - C5 .'], li='SOFTHORN', drums=['kick', 'kick', 'kick', 'basic'], bass='1 - - - 1 - - -', upper='arp')
S.finish()

# --- 4 The title win: C major, 150 bpm, one time through ---
S = a.song(Key('C', MAJOR), 6, echo=(5, 4, 6, 9))
bars(S, 16, ['1', '4', '5', '1'], ['C4 - E4 - G4 - C5 -', 'F4 - A4 - C5 - A4 -', 'G4 - B4 - D5 - B4 -', 'C5 - - - - - - -'], li='SOFTHORN', drums=['march', 'march', 'march', 'basic'], bass='1 - 5 - 1 - 5 -', upper=['arp', 'arp', 'arp', 'pad'], fill=[False, False, True, False])
S.finish(loop=None)

# --- Effects: the order is the SFX table in code.js ---
a.effect(1, ['E-6', 'OFF'], 'BLIP')                                # 0 menu move
a.effect(2, ['C-6', 'G-6', 'OFF'], 'CHIME')                        # 1 select
a.effect(2, ['E-5', 'B-5', 'OFF'], 'CHIME')                        # 2 pause
a.effect(3, ['C-4', 'G-3', 'D-3', 'A-2', 'OFF'], 'CRUNCH')         # 3 a hit (noise)
a.effect(6, ['G-4', 'E-4', 'C-4', None, 'D-4', None, 'C-4', 'OFF'], 'FANFARE')   # 4 game over
a.effect(1, ['C-6', 'G-6', 'OFF'], 'BLIP')                         # 5 a point
a.effect(4, ['C-5', 'E-5', 'G-5', 'C-6', None, 'G-5', 'C-6', 'OFF'], 'FANFARE')  # 6 a record

a.effect(1, ['G-5', 'C-5', 'OFF'], 'BLIP')                         # 7 back
a.effect(8, ['A-3', None, None, 'A-3', None, None, 'OFF'], 'CRUNCH')    # 8 the buzzer
a.effect(1, ['C-7', 'G-6', 'C-6', 'OFF'], 'CRUNCH')                # 9 a swish
a.effect(2, ['E-6', 'E-6', 'G-6', 'G-6', 'E-6', 'OFF'], 'CHIME')   # 10 a whistle
a.effect(2, ['C-5', 'E-5', 'G-5', 'C-6', 'E-6', 'G-6', 'C-7', 'OFF'], 'FANFARE')   # 11 a cheer
a.effect(3, ['G-4', 'F#4', 'F-4', 'E-4', 'D#4', 'OFF'], 'THUD')    # 12 a groan
a.effect(1, ['E-6', 'A-6', 'E-7', 'OFF'], 'CHIME')                 # 13 a cash register
a.effect(3, ['C-3', None, 'C-3', 'G-2', 'OFF'], 'THUD')            # 14 a gavel

a.write(sys.argv[1], songs=5)
