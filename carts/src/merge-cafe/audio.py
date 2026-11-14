# Merge Café's audio: carts/src/merge-cafe/audio.json.
#   python3 carts/src/merge-cafe/audio.py carts/src/merge-cafe/audio.json
# Two songs (0 the title, 1 the game) and the effects numbered as SFX in code.js. Written with the song
# toolkit (tools/devkit/music/kit.py; its header explains the bar() arguments). Rules (playbook section 5):
# leads are quiet, with no vibrato; songs use channels 0 to 5 and effects 6 and 7 (code.js takes turns); the drums are
# samples on channel 5. The new sound chip (SPEC 5): sampled instruments from samples.py (a.voice) and an echo per song.
# After a change: node tools/devkit/music/loud.mjs carts/merge-cafe.nova --check (levels; the lead alone must stay at most
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
a.voice('CEL', 'celesta', 6, 0.15)                             # effects from here on: soft, sampled
a.voice('CELQ', 'celesta', 4, 0.15)
a.voice('MAR', 'marimba', 9, -0.1)
a.voice('MARQ', 'marimba', 6, -0.1)
a.voice('KEYS', 'epiano', 8, 0.0)
a.voice('PLK', 'pluck', 9, 0.1)

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
a.effect(1, ['E-5', None, 'OFF'], 'MARQ')                          # 0 the cursor moves
a.effect(2, ['C-6', 'G-6', None, 'OFF'], 'CEL')                    # 1 select
a.effect(2, ['G-5', 'C-5', None, 'OFF'], 'CELQ')                   # 2 pause
a.effect(2, ['C-3', None, None, 'OFF'], 'MAR')                     # 3 a knock: no room, or not here
a.effect(1, ['G-4', 'C-5', None, 'OFF'], 'MARQ')                   # 4 pick up
a.effect(1, ['C-5', 'G-4', None, 'OFF'], 'MARQ')                   # 5 put down
a.effect(1, ['C-4', 'G-4', 'C-5', None, 'OFF'], 'PLK')             # 6 a generator pops out an item
for k, (r1, r2) in enumerate((('C-5', 'E-5'), ('D-5', 'G-5'), ('E-5', 'A-5'), ('G-5', 'C-6'), ('C-6', 'E-6'))):   # 7 to 11: a merge, tier 2 to 6, rising
    a.effect(2, [r1, r2, None, None, 'OFF'] if k < 4 else [r1, r2, 'G-6', 'C-7', None, None, 'OFF'], 'CEL')
a.effect(2, ['A-5', 'E-6', None, 'OFF'], 'KEYS')                   # 12 a sale: coins
a.effect(2, ['C-4', 'E-4', 'G-4', 'C-5', None, 'OFF'], 'MAR')      # 13 a crate opens
a.effect(2, ['E-6', 'G-6', 'C-7', None, None, 'OFF'], 'CEL')       # 14 a new item found
a.effect(2, ['C-6', None, 'G-6', None, None, 'OFF'], 'KEYS')       # 15 an order served: the till
a.effect(2, ['G-5', 'C-6', 'E-6', 'G-6', None, None, 'OFF'], 'CELQ')   # 16 stars
a.effect(3, ['C-5', 'E-5', 'G-5', 'C-6', None, 'G-5', 'C-6', None, None, 'OFF'], 'KEYS')   # 17 a task done: a little fanfare

a.write(sys.argv[1], songs=2)
