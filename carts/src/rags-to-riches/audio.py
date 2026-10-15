# Rags to Riches's audio: carts/src/rags-to-riches/audio.json.
#   python3 carts/src/rags-to-riches/audio.py carts/src/rags-to-riches/audio.json
# Two songs (0 the title, 1 the game) and the effects numbered as SFX in code.js. Written with the song
# toolkit (tools/devkit/music/kit.py; its header explains the bar() arguments). Rules (playbook section 5):
# leads are quiet pulses with no vibrato; channel 1 is for effects; the drums are samples on channel 5.
# After a change: node tools/devkit/music/loud.mjs carts/rags-to-riches.nova --check (levels; the lead alone must stay at most
# 0.07 RMS and 0.75 of the mix) and python3 tools/devkit/music/clash.py on the json.
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../../tools/devkit/music'))
from kit import *

a = Audio()
a.sample(kick()); a.sample(snare()); a.sample(hat(0.05, 70, 3)); a.sample(hat(0.15, 22, 5))

a.instrument('LEAD', 'pulse25', 0, 10, 8, 8, 6, pan=-0.15)
a.instrument('BASS', 'triangle', 0, 0, 15, 3, 10)
a.instrument('HAT', 'sample', 0, 0, 15, 0, 4, pan=0.25, sample=2)
a.instrument('OHAT', 'sample', 0, 0, 15, 0, 4, pan=0.25, sample=3)
a.instrument('PAD', 'saw', 8, 24, 6, 14, 5, (1, 4), 0.2)
a.instrument('ARP', 'saw', 0, 4, 0, 0, 5, pan=0.25)
a.instrument('KICK', 'sample', 0, 0, 15, 0, 12, sample=0)
a.instrument('SNARE', 'sample', 0, 0, 15, 0, 10, sample=1)
a.instrument('SOFTHORN', 'pulse25', 6, 20, 10, 12, 6, pan=-0.15)
a.instrument('BLIP', 'pulse12', 0, 3, 0, 0, 8)                 # effects from here on
a.instrument('CHIME', 'pulse50', 0, 6, 5, 6, 9)
a.instrument('THUD', 'pulse50', 0, 4, 0, 0, 11)
a.instrument('CRUNCH', 'noise', 0, 8, 3, 6, 9)                  # noise: plays on channel 4 (SFX_VOICE_CH in code.js)
a.instrument('FANFARE', 'pulse25', 0, 6, 11, 6, 9)

# --- 0 The title: A minor, 150 bpm ---
S = a.song(Key('A', MINOR), 6)
CH = ['1', '6', '3', '7']
bars(S, 16, CH, None, drums='soft', bass='long', upper='arp1')
bars(S, 16, CH, ['A4 - C5 - E5 - A5 -', 'A5 - G5 - F5 - C5 -', 'E5 - G5 - C6 - G5 -', 'D5 - G5 - B5 - G5 -'], li='SOFTHORN', drums='drive', bass='1 - - - 5 - - -', upper='arp1')
S.finish()

# --- 1 The game: C major, 128 bpm ---
S = a.song(Key('C', MAJOR), 7)
CH = ['1', '5', '6', '4']
bars(S, 16, CH, ['C5 - E5 - G5 - E5 -', 'D5 - G5 - B5 - G5 -', 'E5 - A5 - C6 - A5 -', 'C5 - F5 - A5 - F5 -'], li='LEAD', drums='basic', bass='1 - 5 - 1 - 5 -', upper='arp')
bars(S, 16, CH, ['G5 - E5 - C5 - E5 -', 'B5 - G5 - D5 - G5 -', 'A5 - C6 - E6 - C6 -', 'A5 - F5 - C5 - F5 .'], li='SOFTHORN', drums='basic', bass='1 - 5 - 1 - 5 -', upper='arp1')
S.finish()

# --- Effects: the order is the SFX table in code.js ---
a.effect(1, ['E-6', 'OFF'], 'BLIP')                                # 0 menu move
a.effect(2, ['C-6', 'G-6', 'OFF'], 'CHIME')                        # 1 select
a.effect(2, ['E-5', 'B-5', 'OFF'], 'CHIME')                        # 2 pause
a.effect(3, ['C-4', 'G-3', 'D-3', 'A-2', 'OFF'], 'CRUNCH')         # 3 a hit (noise)
a.effect(6, ['G-4', 'E-4', 'C-4', None, 'D-4', None, 'C-4', 'OFF'], 'FANFARE')   # 4 game over
a.effect(1, ['C-6', 'G-6', 'OFF'], 'BLIP')                         # 5 a point
a.effect(4, ['C-5', 'E-5', 'G-5', 'C-6', None, 'G-5', 'C-6', 'OFF'], 'FANFARE')  # 6 a record

a.write(sys.argv[1], songs=2)
