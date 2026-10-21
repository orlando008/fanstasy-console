# Ice Breakers's audio: carts/src/ice-breakers/audio.json.
#   python3 carts/src/ice-breakers/audio.py carts/src/ice-breakers/audio.json
# Three songs (0 the title, 1 the game: levels 1 to 6, 2 the late game: levels 7 to 12) and the effects numbered as SFX in code.js. Written with the song
# toolkit (tools/devkit/music/kit.py; its header explains the bar() arguments). Rules (playbook section 5):
# leads are quiet, with no vibrato, in octave 4 (up high they pierce); songs use channels 0 to 5 and the effects take turns
# on 6 and 7 (fx() in code.js). The new sound chip (SPEC 5): an icy set of sampled instruments (a celesta lead, flute,
# harp, strings) and an echo for each song.
# After a change: node tools/devkit/music/loud.mjs carts/ice-breakers.nova --check (levels; the lead alone must stay at most
# 0.07 RMS and 0.75 of the mix) and python3 tools/devkit/music/clash.py on the json.
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../../tools/devkit/music'))
from kit import *

a = Audio(chip=2)
a.sample(kick()); a.sample(snare()); a.sample(hat(0.05, 70, 3)); a.sample(hat(0.15, 22, 5))

a.voice('LEAD', 'celesta', 7, -0.15)
a.voice('BASS', 'bass', 12)
a.instrument('HAT', 'sample', 0, 0, 15, 0, 4, pan=0.25, sample=2)
a.instrument('OHAT', 'sample', 0, 0, 15, 0, 4, pan=0.25, sample=3, echo=3)
a.voice('PAD', 'strings', 5, 0.2)
a.voice('ARP', 'pluck', 12, 0.25)
a.instrument('KICK', 'sample', 0, 0, 15, 0, 12, sample=0, echo=2)
a.instrument('SNARE', 'sample', 0, 0, 15, 0, 10, sample=1, echo=5)
a.voice('SOFTHORN', 'flute', 5, -0.15, a=6)
a.instrument('BLIP', 'pulse12', 0, 3, 0, 0, 8, echo=4)          # effects from here on
a.voice('CHIME', 'celesta', 12)
a.instrument('CRUNCH', 'noise', 0, 8, 3, 6, 8)
a.voice('FANFARE', 'brass', 10, d=6, s=11, r=6)
a.instrument('SNAP', 'noise', 0, 3, 0, 2, 9, echo=6)            # the ice cracking: a short burst of noise
a.voice('TINK', 'celesta', 10, d=12, r=4)                       # bits of ice falling: short bright notes

# --- 0 The title: A minor, 150 bpm ---
S = a.song(Key('A', MINOR), 6, echo=(6, 5, 6, 9))
CH = ['1', '6', '3', '7']
bars(S, 16, CH, None, drums='soft', bass='1 - - - 5 - - -', upper='pad', counter='1 3 5 8 5 3 5 1', ci='ARP')   # the pad first: the lead does not arrive with a jump
bars(S, 16, CH, octave(['A4 - C5 - E5 - A5 -', 'A5 - G5 - F5 - C5 -', 'E5 - G5 - C6 - G5 -', 'D5 - G5 - B5 - G5 -']), li='SOFTHORN', drums='drive', bass='1 - - - 5 - - -', upper='arp1')
S.finish()

# --- 1 The game, levels 1 to 6: a calm tune in F major, 120 bpm, 16 bars (31 s) so that it can play for a long time ---
S = a.song(Key('F', MAJOR), 7, echo=(10, 7, 8, 8))   # the calm tune rings, like a frozen hall
CH = ['1', '5', '6', '4']
bars(S, 16, CH, octave(['A5 - C6 - F5 - C6 -', 'G5 - C6 - E6 - C6 -', 'F5 - A5 - D6 - A5 -', 'D6 - Bb5 - F5 - Bb5 -']), li='LEAD', drums='soft', bass='1 - 5 - 1 - 5 -', upper='arp')
bars(S, 16, CH, octave(['C6 - A5 - F5 - A5 -', 'E6 - C6 - G5 - C6 -', 'D6 - A5 - F5 - A5 -', 'Bb5 - D6 - F5 - Bb5 .']), li='SOFTHORN', drums='soft', bass='1 - 5 - 1 - 5 -', upper='arp1')
CH2 = ['6', '4', '1', '5']                                        # Dm, Bb, F, C: the second half goes to the relative minor and back
bars(S, 16, CH2, octave(['F5 - A5 - D6 - A5 -', 'D6 - Bb5 - F5 - Bb5 -', 'C6 - A5 - F5 - A5 -', 'G5 - E6 - C6 - G5 -']), li='LEAD', drums='soft', bass='1 - 5 - 1 - 5 -', upper='arp')
bars(S, 16, CH2, octave(['A5 - D6 - F6 - D6 -', 'F6 - D6 - Bb5 - D6 -', 'A5 - C6 - F6 - C6 -', 'G5 - C6 - E6 - C6 .']), li='SOFTHORN', drums='soft', bass='1 - 5 - 1 - 5 -', upper='arp1')
S.finish()

# --- 2 The game, levels 7 to 12: D minor, 150 bpm, a little faster and lower, with the drums driving; 16 bars (26 s) ---
S = a.song(Key('D', MINOR), 6, echo=(5, 4, 5, 9))
CHL = ['1', '6', '3', '7']                                        # Dm, Bb, F, C
bars(S, 16, CHL, ['D4 - F4 - A4 - D5 -', 'D5 - Bb4 - F4 - Bb4 -', 'A4 - C5 - F5 - C5 -', 'G4 - C5 - E5 - C5 -'], li='LEAD', drums='drive', bass='1 - - - 5 - - -', upper='arp1')
bars(S, 16, CHL, ['A4 - D5 - F5 - D5 -', 'F5 - D5 - Bb4 - D5 -', 'C5 - A4 - F4 - A4 -', 'E5 - C5 - G4 - E5 -'], li='SOFTHORN', drums='drive', bass='1 - - - 5 - - -', upper='arp1')
CHL2 = ['4', '1', '6', '7']                                       # Gm, Dm, Bb, C
bars(S, 16, CHL2, ['G4 - Bb4 - D5 - Bb4 -', 'F4 - A4 - D5 - A4 -', 'D5 - Bb4 - F5 - D5 -', 'G4 - C5 - E5 - C5 -'], li='LEAD', drums='drive', bass='1 - - - 5 - - -', upper='arp1')
bars(S, 16, CHL2, ['D5 - G5 - Bb5 - G5 -', 'A4 - D5 - F5 - D5 -', 'F5 - D5 - Bb4 - D5 -', 'E5 - C5 - G4 - C5 .'], li='SOFTHORN', drums='drive', bass='1 - - - 5 - - -', upper='arp1')
S.finish()

# --- Effects: the order is the SFX table in code.js (match: 5 to 9, a step higher for each link of a chain) ---
a.effect(1, ['E-6', 'OFF'], 'BLIP')                                # 0 menu move, cursor move
a.effect(2, ['C-6', 'G-6', 'OFF'], 'CHIME')                        # 1 select (a gem picked up)
a.effect(2, ['E-5', 'B-5', 'OFF'], 'CHIME')                        # 2 pause
a.effect(1, ['G-5', 'C-6', 'OFF'], 'BLIP')                         # 3 a swap
a.effect(3, ['E-3', 'C-3', 'OFF'], 'CRUNCH')                       # 4 a swap that makes nothing (noise: channel 4)
a.effect(2, ['C-5', 'E-5', 'G-5', 'OFF'], 'CHIME')                 # 5 a match
a.effect(2, ['D-5', 'F#5', 'A-5', 'OFF'], 'CHIME')                 # 6 a chain of 2
a.effect(2, ['E-5', 'G#5', 'B-5', 'OFF'], 'CHIME')                 # 7 3
a.effect(2, ['F#5', 'A#5', 'C#6', 'OFF'], 'CHIME')                 # 8 4
a.effect(2, ['G#5', 'C-6', 'D#6', 'OFF'], 'CHIME')                 # 9 5 or more
a.effect(4, ['C-5', 'E-5', 'G-5', 'C-6', None, 'G-5', 'C-6', 'E-6', 'OFF'], 'FANFARE')   # 10 level clear
a.effect(6, ['G-4', 'E-4', 'C-4', None, 'D-4', None, 'C-4', 'OFF'], 'FANFARE')           # 11 game over
a.effect(1, ['C-4', 'D-4', 'E-4', 'F-4', 'G-4', 'A-4', 'B-4', 'OFF'], 'CRUNCH')           # 12 the board is stuck: reshuffled (noise)
a.effect(4, ['C-5', 'E-5', 'G-5', 'C-6', None, 'G-5', 'C-6', 'OFF'], 'FANFARE')          # 13 a high score

a.effect(1, ['C-7', 'F-6', 'OFF'], 'SNAP')                         # 14 ice cracks (noise: channel 4)
a.effect(1, ['E-7', 'C-7', 'A-6', 'E-7', 'C-7', 'G-6', 'E-6', 'OFF'], 'TINK')   # 15 three or more cells of ice at once: the pieces fall
a.effect(5, ['C-5', 'E-5', 'G-5', 'C-6', None, 'G-5', 'C-6', 'E-6', None, 'G-5', 'C-6', 'E-6', 'G-6', None, None, 'E-6', 'G-6', 'C-7', None, None, None, None, 'OFF'], 'FANFARE')   # 16 the game is won
a.effect(3, ['A-4', 'E-5', 'A-5', 'OFF'], 'CHIME')                  # 17 a level opens

a.write(sys.argv[1], songs=3)
