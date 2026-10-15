# Rags to Riches's audio: carts/src/rags-to-riches/audio.json.
#   python3 carts/src/rags-to-riches/audio.py carts/src/rags-to-riches/audio.json
# Seven songs and twelve effects, numbered as SONG and SFX in code.js. Written with the song toolkit
# (tools/devkit/music/kit.py; its header explains the bar() arguments). The songs share one motif, the band's
# climb: a triad going up (A C E A on the title, C E G E on the road, E G B E in the concert, C E G C in the victory).
#   0 title (A minor, 150 bpm, loops)   1 the tour: hub, venues, setup, map (C major, 128 bpm, loops)
#   2 the concert and its result (E minor, 180 bpm, loops)   3 new songs (F major jingle)   4 the road (G major jingle)
#   5 victory (C major fanfare)   6 defeat (A minor, slow)       the jingles play once (no loop) Rules (playbook section 5):
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
a.instrument('BLIP', 'pulse25', 0, 4, 3, 2, 9)                 # effects from here on
a.instrument('CHIME', 'pulse50', 0, 6, 5, 6, 9)
a.instrument('THUD', 'pulse50', 0, 4, 0, 0, 11)
a.instrument('CRUNCH', 'noise', 0, 8, 3, 6, 9)                  # noise: plays on channel 4 (SFX_VOICE_CH in code.js)
a.instrument('FANFARE', 'pulse25', 0, 6, 11, 6, 9)
a.instrument('COIN', 'pulse50', 0, 5, 6, 8, 8)                   # a coin: two bright notes that ring
a.instrument('WAH', 'pulse50', 2, 10, 8, 8, 8)                   # the sad slide of a loss
a.instrument('ROAR', 'noise', 8, 30, 7, 14, 9)                   # a crowd (noise: channel 4)
a.instrument('ROLL', 'noise', 0, 2, 0, 1, 11)                     # a drum roll (noise: channel 4)
a.instrument('HONK', 'pulse50', 0, 3, 12, 3, 8)                  # the van's horn

# --- 0 The title: A minor, 150 bpm ---
S = a.song(Key('A', MINOR), 6)
CH = ['1', '6', '3', '7']
bars(S, 16, CH, None, drums='soft', bass='long', upper='arp1')
bars(S, 16, CH, ['A4 - C5 - E5 - A5 -', 'A5 - G5 - F5 - C5 -', 'E5 - G5 - C6 - G5 -', 'D5 - G5 - B5 - G5 -'], li='SOFTHORN', drums='drive', bass='1 - - - 5 - - -', upper='arp1')
S.finish()

# --- 1 The tour: C major, 128 bpm ---
S = a.song(Key('C', MAJOR), 7)
CH = ['1', '5', '6', '4']
bars(S, 16, CH, ['C5 - E5 - G5 - E5 -', 'D5 - G5 - B5 - G5 -', 'E5 - A5 - C6 - A5 -', 'C5 - F5 - A5 - F5 -'], li='LEAD', drums='basic', bass='1 - 5 - 1 - 5 -', upper='arp')
bars(S, 16, CH, ['G5 - E5 - C5 - E5 -', 'B5 - G5 - D5 - G5 -', 'A5 - C6 - E6 - C6 -', 'A5 - F5 - C5 - F5 .'], li='SOFTHORN', drums='basic', bass='1 - 5 - 1 - 5 -', upper='arp1')
S.finish()

# --- 2 The concert: E minor, 180 bpm: a punk riff over a driving bass, then the same a little higher ---
S = a.song(Key('E', MINOR), 5)
CH = ['1', '1', '6', '7', '1', '6', '7', '5+']
bars(S, 16, CH, ['E5 - G5 - B5 - E6 -', 'E5 - G5 - B5 - A5 G5', 'G5 - G5 E5 - C5 E5 G5', 'A5 - A5 F#5 - D5 F#5 A5',
                 'B5 - B5 G5 - E5 G5 B5', 'C6 - C6 G5 - E5 G5 C6', 'D6 - A5 F#5 - A5 D6 -', 'D#6 - B5 F#5 - B5 D#6 .'],
     li='LEAD', drums=['drive', 'drive', 'drive', 'drive', 'heavy', 'heavy', 'heavy', 'heavy'], fill=[False, False, False, True, False, False, False, True],
     bass='1 1 1 1 1 1 1 1', upper=['arp', 'arp', 'arp', 'arp', 'arp1', 'arp1', 'arp1', 'arp1'])
S.finish()

# --- 3 New songs: F major, 150 bpm, one pattern, played once ---
S = a.song(Key('F', MAJOR), 6)
bars(S, 16, ['1', '4', '5', '1'], ['F5 - A5 - C6 - A5 -', 'D6 C6 A5 C6 D6 - F6 -', 'E6 D6 C6 D6 E6 G6 E6 C6', 'F6 - C6 - A5 - F5 .'],
     li='LEAD', drums=['soft', 'soft', 'basic', 'soft'], fill=[False, False, False, False], bass='1 - 5 - 1 - 5 -', upper='arp')
S.finish(); a.songs[-1]['loop'] = None

# --- 4 The road: G major, 150 bpm, one pattern, played once: the motor in the kick, the motif on top ---
S = a.song(Key('G', MAJOR), 6)
bars(S, 16, ['1', '1', '4', '5'], ['D5 - G5 - B5 - G5 -', 'D5 - G5 - B5 - D6 -', 'E5 - G5 - C6 - G5 -', 'F#5 - A5 - D6 - A5 .'],
     li='SOFTHORN', drums='kick', bass='1 - 1 - 1 - 1 -', upper='arp')
S.finish(); a.songs[-1]['loop'] = None

# --- 5 Victory: C major, 180 bpm, one pattern, played once ---
S = a.song(Key('C', MAJOR), 5)
bars(S, 16, ['1', '4', '5', '1'], ['C5 - E5 - G5 - C6 -', 'F5 - A5 - C6 - F6 -', 'G5 - B5 - D6 - G6 -', 'E6 - G6 - C6 - - -'],
     li='LEAD', drums=['basic', 'basic', 'heavy', 'basic'], fill=[False, False, True, False], bass='1 - 5 - 1 - 5 -', upper='arp1')
S.finish(); a.songs[-1]['loop'] = None

# --- 6 Defeat: A minor, 100 bpm, one pattern, played once: the motif falls instead of climbing ---
S = a.song(Key('A', MINOR), 9)
bars(S, 16, ['1', '6', '4', '1'], ['E5 - D5 - C5 - A4 -', 'C5 - A4 - C5 - F4 -', 'A4 - G4 - F4 - E4 -', 'E4 - - - A3 - - -'],
     li='SOFTHORN', drums='none', bass='long', upper='arp')
S.finish(); a.songs[-1]['loop'] = None

# --- Effects: the order is the SFX table in code.js ---
a.effect(2, ['E-6', 'OFF'], 'BLIP')                                # 0 move
a.effect(2, ['C-6', 'G-6', 'OFF'], 'CHIME')                        # 1 select
a.effect(2, ['G-5', 'C-5', 'OFF'], 'CHIME')                        # 2 back
a.effect(2, ['E-5', 'B-5', 'OFF'], 'CHIME')                        # 3 pause
a.effect(3, ['C-4', 'G-3', 'D-3', 'A-2', 'OFF'], 'CRUNCH')         # 4 refuse: a buzz (noise)
a.effect(3, ['B-5', 'E-6', 'OFF'], 'COIN')                         # 5 coin: a profit
a.effect(4, ['G-4', 'F#4', 'F-4', 'E-4', 'OFF'], 'WAH')            # 6 a loss: a slide down
a.effect(3, ['C-5', 'E-5', 'G-5', 'C-6', 'OFF'], 'FANFARE')        # 7 sold out
a.effect(8, ['C-3', None, None, None, None, None, 'OFF'], 'ROAR')  # 8 a cheer (noise)
a.effect_rows(2, [cell('C-4', a.I['ROLL'], 6 + k) for k in range(10)] + [{'n': 'OFF'}])      # 9 a drum roll, rising (noise)
a.effect(3, ['F-4', None, 'A-4', None, None, 'OFF'], 'HONK')       # 10 the van's horn
a.effect(4, ['C-5', 'E-5', 'G-5', 'C-6', None, 'G-5', 'C-6', 'OFF'], 'FANFARE')   # 11 a new record

a.write(sys.argv[1], songs=7)
