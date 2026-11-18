# Bit’s Console Quest's audio: carts/src/bits-console-quest/audio.json.
#   python3 carts/src/bits-console-quest/audio.py carts/src/bits-console-quest/audio.json
# Song 0 plays on the title; 1 to 4 in the four zones (Foundry, Caverns, Gardens, Skyline); 5 is the lab and practice theme. Effects follow SFX in code.js. Written with the song
# toolkit (tools/devkit/music/kit.py; its header explains the bar() arguments). Rules (playbook section 5):
# leads are quiet, with no vibrato; songs use channels 0 to 5 and effects 6 and 7 (code.js takes turns); the drums are
# samples on channel 5. The new sound chip (SPEC 5): sampled instruments from samples.py (a.voice) and an echo per song.
# After a change: node tools/devkit/music/loud.mjs carts/bits-console-quest.nova --check (levels; the lead alone must stay at most
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
a.voice('KEYS', 'epiano', 9, -0.15)
a.voice('MARIMBA', 'marimba', 9, 0.25)
a.instrument('CRT', 'pulse25', 0, 10, 8, 8, 5, pan=-0.15)         # the Skyline's lead: a soft square, no vibrato
a.instrument('BLIP', 'pulse12', 0, 3, 0, 0, 8)                 # effects from here on
a.instrument('CHIME', 'pulse50', 0, 6, 5, 6, 9)
a.instrument('THUD', 'pulse50', 0, 4, 0, 0, 11)
a.instrument('CRUNCH', 'noise', 0, 8, 3, 6, 9)
a.instrument('FANFARE', 'pulse25', 0, 6, 11, 6, 9)
a.instrument('BOING', 'triangle', 0, 6, 0, 0, 11)
a.instrument('HUM', 'saw', 0, 4, 6, 4, 6)

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

# --- 2 Cartridge Caverns: D minor, slow, in a big echoing cave ---
S = a.song(Key('D', MINOR), 8, echo=(12, 8, 8, 7))
bars(S, 16, ['1', '6', '7', '1'], None, drums='none', bass='long', upper='pad', counter='1 - 5 - 8 - 5 -', ci='MARIMBA')
A = ['D4 - - - F4 - A4 -', 'Bb4 - - - F4 - D4 -', 'G4 - A4 - C5 - A4 -', 'A4 - - - E4 - - .']
bars(S, 16, ['1', '6', '7', '5'], A, li='KEYS', drums='soft', bass='1 - - - 5 - - -', upper='pad', counter='1 - 5 - 8 - 5 -', ci='MARIMBA')
bars(S, 16, ['4', '6', '1', '5'], ['G4 - Bb4 - D5 - C5 -', 'Bb4 - F4 - D4 - F4 -', 'F4 - - - D4 - A4 -', 'E4 - - - D4 - - .'],
     li='KEYS', drums='soft', bass='1 - - - 5 - - -', upper='pad', counter='1 - 5 - 8 - 5 -', ci='MARIMBA')
bars(S, 16, ['1', '6', '7', '5'], A, li='KEYS', drums='soft', bass='1 - - - 5 - - -', upper='pad', counter='1 - 5 - 8 - 5 -', ci='MARIMBA', fill=[False, False, False, True])
S.finish()

# --- 3 Circuit Gardens: G major, bright and bouncy, marimba ---
S = a.song(Key('G', MAJOR), 6, echo=(5, 4, 5, 9))
bars(S, 16, ['1', '5', '6', '4'], None, drums='kick', bass='1 - 5 - 1 - 5 -', upper='pad', counter='1 3 5 3 8 5 3 5', ci='MARIMBA')
bars(S, 16, ['1', '5', '6', '4'], ['G4 - B4 - D5 - B4 -', 'A4 - - - F#4 - D4 -', 'E4 - G4 - B4 - A4 G4', 'C5 - B4 - A4 - - .'],
     li='LEAD', drums='bouncy', bass='1 - 5 - 1 - 5 -', upper='pad', counter='1 3 5 3 8 5 3 5', ci='MARIMBA')
bars(S, 16, ['1', '3', '4', '5'], ['B4 - D5 - G4 - - -', 'B4 - A4 - F#4 - D4 -', 'E4 - G4 - C5 - B4 A4', 'A4 - - - D4 - - .'],
     li='LEAD', drums='bouncy', bass='1 - 5 - 1 - 5 -', upper='pad', counter='1 3 5 3 8 5 3 5', ci='MARIMBA')
bars(S, 16, ['1', '5', '4', '1'], ['G4 - B4 - D5 - B4 -', 'A4 - - - F#4 - D4 -', 'C5 - B4 - A4 - E4 -', 'G4 - - - - - - .'],
     li='LEAD', drums='bouncy', bass='1 - 5 - 1 - 5 -', upper='pad', counter='1 3 5 3 8 5 3 5', ci='MARIMBA', fill=[False, False, False, True])
S.finish()

# --- 4 CRT Skyline: E minor, driving, a square-wave lead over a fast arpeggio ---
S = a.song(Key('E', MINOR), 6, echo=(7, 6, 6, 8))
bars(S, 16, ['1', '6', '3', '7'], None, drums='kick', bass='1 1 5 1 1 1 5 1', upper='pad')
A = ['E4 - G4 - B4 - G4 -', 'C5 - B4 - G4 - E4 -', 'G4 - - - B4 - D5 -', 'D5 - C5 - B4 - A4 -']
bars(S, 16, ['1', '6', '3', '7'], A, li='CRT', drums='drive', bass='1 1 5 1 1 1 5 1', upper='arp1')
bars(S, 16, ['4', '1', '6', '5'], ['A4 - C5 - E5 - D5 -', 'B4 - G4 - E4 - G4 -', 'C5 - - - E4 - G4 -', 'B4 - - - F#4 - - .'],
     li='CRT', drums='drive', bass='1 1 5 1 1 1 5 1', upper='arp1')
bars(S, 16, ['1', '6', '3', '7'], A, li='CRT', drums='drive', bass='1 1 5 1 1 1 5 1', upper='arp1', fill=[False, False, False, True])
S.finish()

# --- Effects: the order is the SFX table in code.js ---
a.effect(1, ['E-6', 'OFF'], 'BLIP')                                # 0 menu move
a.effect(2, ['C-6', 'G-6', 'OFF'], 'CHIME')                        # 1 select
a.effect(2, ['E-5', 'B-5', 'OFF'], 'CHIME')                        # 2 pause
a.effect(3, ['C-4', 'G-3', 'D-3', 'A-2', 'OFF'], 'CRUNCH')         # 3 fall
a.effect(3, ['C-5', 'E-5', 'G-5', None, 'E-5', 'C-6', None, 'OFF'], 'FANFARE')   # 4 treasure
a.effect(1, ['C-6', 'G-6', 'OFF'], 'BLIP')                         # 5 puzzle piece
a.effect(4, ['C-5', 'E-5', 'G-5', 'C-6', None, 'G-5', 'C-6', 'OFF'], 'FANFARE')  # 6 stage clear

a.effect(2, ['G-4', 'C-5', 'G-5', 'OFF'], 'BLIP')                  # 7 jump
a.effect(2, ['A-3', 'E-4', 'A-4', 'OFF'], 'CHIME')                 # 8 plug
a.effect(4, ['E-5', 'G-5', 'C-6', 'OFF'], 'CHIME')                 # 9 checkpoint
a.effect(2, ['C-3', 'E-3', 'G-3', 'C-4', None, 'OFF'], 'HUM')      # 10 device power: a short rising hum
a.effect(2, ['G-4', 'C-5', 'E-5', 'OFF'], 'CHIME')                 # 11 respawn: Bit boots up again
a.effect(1, ['C-3', 'G-3', 'C-4', 'G-4', 'C-5', 'OFF'], 'BOING')   # 12 spring launch

# Scott Joplin, The Entertainer (1902), bars 1–36. See the song library's scores/SOURCES.md.
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../../tools/devkit/music/songs'))
from library import add

add(a, 'entertainer')
a.write(sys.argv[1], songs=6)
