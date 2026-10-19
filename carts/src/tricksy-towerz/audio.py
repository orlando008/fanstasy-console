# Tricksy Towerz's audio: carts/src/tricksy-towerz/audio.json.
#   python3 carts/src/tricksy-towerz/audio.py carts/src/tricksy-towerz/audio.json
# Four songs (0 the title, lobby, help and records; 1 the race; 2 over the line; 3 the finish, once) and the effects numbered as SFX in code.js. Written with the song
# toolkit (tools/devkit/music/kit.py; its header explains the bar() arguments). Rules (playbook section 5):
# leads are quiet pulses with no vibrato; channel 1 is for effects; the drums are samples on channel 5.
# After a change: node tools/devkit/music/loud.mjs carts/tricksy-towerz.nova --check (levels; the lead alone must stay at most
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
a.instrument('BLIP', 'pulse12', 0, 3, 0, 0, 12)                 # effects from here on
a.instrument('TICK', 'pulse12', 0, 3, 0, 0, 15)
a.instrument('TAP', 'pulse50', 0, 4, 0, 0, 12)
a.instrument('CHIME', 'pulse50', 0, 6, 5, 6, 9)
a.instrument('WHOOSH', 'noise', 0, 10, 4, 8, 8)                 # noise: plays on channel 4 (SFX_VOICE_CH in code.js)
a.instrument('CRUNCH', 'noise', 0, 8, 3, 6, 9)
a.instrument('FANFARE', 'pulse25', 0, 6, 11, 6, 9)

# --- 0 The title, the lobby, the help and the records: A minor, 128 bpm, loops. Four bars of a quiet horn over an arpeggio, then four of the lead ---
S = a.song(Key('A', MINOR), 7)
CH = ['1', '6', '3', '7']
bars(S, 16, CH, ['E5 - A5 - G5 - E5 -', 'F5 - A5 - C6 - A5 -', 'E5 - G5 - E5 - C5 -', 'D5 - G5 - B5 - G5 -'], li='SOFTHORN', drums='soft', bass='long', upper='arp1')
bars(S, 16, CH, ['A5 E5 A5 C6 B5 - A5 -', 'A5 F5 A5 C6 A5 - F5 -', 'G5 E5 G5 C6 B5 - G5 -', 'B5 G5 D5 G5 B5 - - -'], li='LEAD', drums='basic', bass='1 - - - 5 - - -', upper='arp')
S.finish()

# --- 1 The race: C major, 150 bpm, loops. Sixteen bars: the main tune twice, a calmer middle, the main tune again with more drive ---
S = a.song(Key('C', MAJOR), 6)
bars(S, 16, ['1', '5', '6', '4'], ['C5 E5 G5 E5 C6 - G5 -', 'B5 G5 D5 G5 B5 - G5 -', 'A5 C6 E6 C6 A5 - E5 -', 'F5 A5 C6 A5 G5 - F5 -'], li='LEAD', drums='basic', bass='1 - 5 - 1 - 5 -', upper='arp')
bars(S, 16, ['1', '5', '6', '4'], ['E5 G5 C6 G5 E6 - C6 -', 'D6 B5 G5 B5 D6 - B5 -', 'C6 A5 E5 A5 C6 - A5 -', 'A5 F5 C5 F5 A5 - G5 -'], li='LEAD', drums='basic', bass='1 - 5 - 1 - 5 -', upper='arp')
bars(S, 16, ['6', '4', '1', '5'], ['E5 - - - A5 - - -', 'C5 - - - F5 - A5 -', 'E5 - G5 - C6 - - -', 'D5 - G5 - B5 - - -'], li='SOFTHORN', drums='soft', bass='long', upper='arp1')
bars(S, 16, ['1', '5', '6', '4'], ['G5 E5 C5 E5 G5 - C6 -', 'G5 B5 D6 B5 G5 - D5 -', 'E5 A5 C6 A5 E6 - C6 -', 'F5 A5 C6 F6 D6 - C6 .'], li='LEAD', drums='drive', bass='1 - 5 - 1 - 5 -', upper='arp')
S.finish()

# --- 2 Over the line: A minor, 112 bpm, loops. Long notes over a heartbeat of a kick and a fast, thin arpeggio ---
S = a.song(Key('A', MINOR), 8)
bars(S, 16, ['1', '1', '4', '5+'], ['A5 - - - E5 - - -', 'C6 - - - B5 - - -', 'F5 - - - A5 - - -', 'G#5 - - - B5 - - -'], li='SOFTHORN', drums='kick', bass='1 - - - 1 - - -', upper='arp1')
bars(S, 16, ['1', '6', '4', '5+'], ['E6 - - - C6 - - -', 'F6 - - - C6 - - -', 'D6 - - - A5 - - -', 'B5 - - - G#5 - - -'], li='SOFTHORN', drums='kick', bass='1 - - - 1 - - -', upper='arp1')
S.finish()

# --- 3 The finish: a fanfare, C major, once (no loop) ---
S = a.song(Key('C', MAJOR), 5)
bars(S, 16, ['1', '4', '5', '1'], ['C5 - E5 - G5 - C6 -', 'A5 - C6 - F6 - C6 -', 'B5 - D6 - G6 - D6 -', 'E6 - - - C6 - - -'], li='SOFTHORN', drums='march', bass='1 - 5 - 1 - 5 -', upper='arp')
S.finish(); a.songs[-1]['loop'] = None

# --- Effects: the order is the SFX table in code.js ---
a.effect(2, ['E-6', 'OFF'], 'BLIP')                                                # 0 menu move
a.effect(2, ['C-6', 'G-6', 'OFF'], 'CHIME')                                        # 1 select
a.effect(2, ['E-5', 'B-5', 'OFF'], 'CHIME')                                        # 2 pause
a.effect(3, ['C-5', 'G-4', 'D-4', 'A-3', 'E-3', 'OFF'], 'WHOOSH')                  # 3 a piece is lost (noise)
a.effect(3, ['A-4', 'F-4', 'C-4', 'A-3', 'F-3', 'C-3', 'A-2', 'OFF'], 'CRUNCH')    # 4 the tower falls from over the line (noise)
a.effect(2, ['C-3', 'OFF'], 'TAP')                                                 # 5 a piece lands
a.effect(4, ['C-5', 'E-5', 'G-5', 'C-6', None, 'G-5', 'C-6', 'OFF'], 'FANFARE')    # 6 a record
a.effect(3, ['A-6', 'OFF'], 'TICK')                                                # 7 a piece turns
a.effect(3, ['A-5', 'OFF'], 'BLIP')                                                # 8 one of the count of three
a.effect(3, ['C-5', 'E-5', 'G-5', 'C-6', 'OFF'], 'FANFARE')                        # 9 GO
a.effect(2, ['E-5', 'G-5', 'B-5', 'E-6', 'OFF'], 'CHIME')                          # 10 a tower crosses the line
a.effect(2, ['G-5', 'D-6', 'OFF'], 'CHIME')                                        # 11 a pad joins
a.effect(2, ['C-3', 'C-3', 'OFF'], 'CRUNCH')                                       # 12 not allowed (noise)

a.write(sys.argv[1], songs=4)
