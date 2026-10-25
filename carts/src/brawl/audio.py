# Brawl's audio: carts/src/brawl/audio.json.
#   python3 carts/src/brawl/audio.py carts/src/brawl/audio.json
# Two songs (0 the title, 1 the game) and the effects numbered as SFX in code.js. Written with the song
# toolkit (tools/devkit/music/kit.py; its header explains the bar() arguments). Rules (playbook section 5):
# leads are quiet, with no vibrato; songs use channels 0 to 5 and effects 6 and 7 (code.js takes turns); the drums are
# samples on channel 5. The new sound chip (SPEC 5): sampled instruments from samples.py (a.voice) and an echo per song.
# After a change: node tools/devkit/music/loud.mjs carts/brawl.nova --check (levels; the lead alone must stay at most
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
a.voice('TOM', 'tom', 13)
a.instrument('WHOOSH', 'noise', 2, 6, 0, 4, 9)
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

# --- 1 The street: E minor, 128 bpm, a driving funk groove (a hook in the horn, a flute answer) ---
S = a.song(Key('E', MINOR), 7, echo=(4, 3, 4, 9))
CH = ['1', '1', '6', '7']
bars(S, 16, CH, None, drums='funk', bass='1 - 1 1 - 5 - 1', upper='pad', counter='1 - 3 - 5 - 3 -', ci='ARP')   # the groove first, so the lead does not arrive with a jump
bars(S, 16, CH, ['E4 - - G4 - B4 - G4', 'E4 - G4 - B4 - D5 B4', 'C4 - E4 - G4 - E4 -', 'D4 - F#4 - A4 - F#4 -'], li='SOFTHORN', drums='funk', bass='1 - 1 1 - 5 - 1', upper='arp1')
CH2 = ['4', '6', '7', '1']
bars(S, 16, CH2, ['A4 - C5 - B4 - A4 -', 'G4 - G4 - E5 - G4 -', 'F#4 - A4 - D5 - A4 -', 'E4 - G4 - B4 - G4 .'], li='LEAD', drums='heavy', bass='1 - 1 - 5 - 1 5', upper='arp')
bars(S, 16, ['1', '5', '6', '7'], ['B4 - G4 - E4 - G4 -', 'D5 - B4 - F#4 - B4 -', 'C5 - A4 - E4 - A4 -', 'D5 - F#4 - A4 - D5 .'], li='SOFTHORN', drums='funk', bass='1 - 1 1 - 5 - 1', upper='arp1', fill=[False, False, False, True])
S.finish()

# --- 2 The boss: E minor, 150 bpm, heavy drums and a pounding bass (a short, tense loop) ---
S = a.song(Key('E', MINOR), 6, echo=(4, 3, 4, 8))
CHB = ['1', '1', '6', '7']
bars(S, 16, CHB, None, drums='heavy', bass='1 1 - 1 1 - 5 -', upper='pad', counter='1 - 1 - 5 - 1 -', ci='ARP')   # the pounding first, so the lead does not arrive with a jump
bars(S, 16, CHB, ['E4 - E4 - G4 - B4 -', 'E4 - G4 - B4 - D5 -', 'C4 - E4 - G4 - C5 -', 'D4 - F#4 - A4 - F#4 .'], li='SOFTHORN', drums='heavy', bass='1 1 - 1 1 - 5 -', upper='arp1')
S.finish()

# --- 3 The docks: D minor, 128 bpm, a rolling bounce with a flute tune over a walking bass (it loops past the groove intro) ---
S = a.song(Key('D', MINOR), 7, echo=(6, 4, 5, 9))
CD = ['1', '6', '7', '1']
bars(S, 16, CD, None, drums='bouncy', bass='1 - 5 - 1 - 5 5', upper='pad', counter='1 - 3 - 5 - 3 -', ci='ARP')   # the groove first, so the lead does not arrive with a jump
bars(S, 16, CD, ['D4 - F4 - A4 - F4 -', 'Bb3 - D4 - F4 - D4 -', 'C4 - E4 - G4 - E4 -', 'D4 - A4 - F4 - D4 .'], li='LEAD', drums='bouncy', bass='1 - 5 - 1 - 5 5', upper='arp1')
bars(S, 16, ['4', '1', '5', '1'], ['G4 - Bb4 - D5 - Bb4 -', 'A4 - F4 - D4 - F4 -', 'A4 - C5 - E4 - A4 -', 'D4 - F4 - A4 - D5 .'], li='SOFTHORN', drums='bouncy', bass='1 - 5 - 1 - 5 5', upper='arp1')
S.finish(loop=1)

# --- 4 The second boss: A minor, 150 bpm, a nervous driving loop with a clanking beat ---
S = a.song(Key('A', MINOR), 6, echo=(4, 3, 4, 8))
CR = ['1', '1', '6', '5']
bars(S, 16, CR, None, drums='clank', bass='1 1 - 1 1 - 1 5', upper='pad', counter='1 - 1 - 3 - 5 -', ci='ARP')
bars(S, 16, CR, ['A4 - A4 - C5 - E5 -', 'A4 - C5 - E5 - C5 -', 'F4 - A4 - C5 - A4 -', 'E4 - G4 - B4 - G4 .'], li='SOFTHORN', drums='clank', bass='1 1 - 1 1 - 1 5', upper='arp1')
S.finish(loop=1)

# --- Effects: the order is the SFX table in code.js ---
a.effect(1, ['E-6', 'OFF'], 'BLIP')                                # 0 menu move
a.effect(2, ['C-6', 'G-6', 'OFF'], 'CHIME')                        # 1 select
a.effect(2, ['E-5', 'B-5', 'OFF'], 'CHIME')                        # 2 pause
a.effect(3, ['C-4', 'G-3', 'D-3', 'A-2', 'OFF'], 'CRUNCH')         # 3 a hit (noise)
a.effect(6, ['G-4', 'E-4', 'C-4', None, 'D-4', None, 'C-4', 'OFF'], 'FANFARE')   # 4 game over
a.effect(1, ['C-6', 'G-6', 'OFF'], 'BLIP')                         # 5 a point
a.effect(4, ['C-5', 'E-5', 'G-5', 'C-6', None, 'G-5', 'C-6', 'OFF'], 'FANFARE')  # 6 a record

# the fighting (added after the starter's seven)
a.effect(1, ['G-5', 'C-5', 'OFF'], 'WHOOSH')                       # 7 a swing (a punch or a kick in the air)
a.effect(2, ['G-3', 'C-3', 'C-2', 'G-1', 'OFF'], 'TOM')                   # 8 a hook or a jump kick lands (a heavy thump)
a.effect(3, ['G-2', 'D-2', 'A-1', 'OFF'], 'TOM')                   # 9 a body hits the ground
a.effect(1, ['C-4', 'E-4', 'G-4', 'C-5', 'OFF'], 'BLIP')           # 10 a jump
a.effect(2, ['E-6', 'A-6', 'OFF'], 'CHIME')                        # 11 a weapon or money is picked up
a.effect(2, ['C-5', 'E-5', 'G-5', 'C-6', 'OFF'], 'CHIME')          # 12 food (a rising arpeggio)
a.effect(4, ['C-3', 'A-2', 'F-2', 'D-2', 'OFF'], 'CRUNCH')         # 13 a crate breaks (a long low crunch)

a.write(sys.argv[1], songs=5)
