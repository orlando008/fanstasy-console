# Operation Ironstorm's audio: carts/src/operation-ironstorm/audio.json.
#   python3 carts/src/operation-ironstorm/audio.py carts/src/operation-ironstorm/audio.json
# Five songs (0 the jungle, 1 the title, 2 the fortress commander, 3 mission complete: a fanfare once, 4 mission failed:
# once) and the eleven effects in the numbers code.js plays (0 rifle, 1 jump, 2 hurt, 3 an enemy down, 4 checkpoint,
# 5 lost a life, 6 rocket, 7 laser, 8 spread, 9 rapid, 10 the boss destroyed). Written with the song toolkit
# (tools/devkit/music/kit.py; its header explains the bar() arguments). Rules (playbook section 5): leads are quiet
# pulses with no vibrato; channel 1 is for effects; the drums are samples on channel 5, so channel 4 is free for the
# gunfire (noise). After a change: node tools/devkit/music/loud.mjs carts/operation-ironstorm.nova --check.
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../../tools/devkit/music'))
from kit import *

a = Audio()
a.sample(kick()); a.sample(snare()); a.sample(hat(0.05, 70, 3)); a.sample(hat(0.15, 22, 5))

a.instrument('LEAD', 'pulse25', 0, 10, 8, 8, 5, pan=-0.15)
a.instrument('BASS', 'triangle', 0, 0, 15, 3, 10)
a.instrument('HAT', 'sample', 0, 0, 15, 0, 4, pan=0.25, sample=2)
a.instrument('OHAT', 'sample', 0, 0, 15, 0, 4, pan=0.25, sample=3)
a.instrument('PAD', 'saw', 8, 24, 6, 14, 4, pan=0.2)
a.instrument('ARP', 'saw', 0, 4, 0, 0, 4, pan=0.25)
a.instrument('KICK', 'sample', 0, 0, 15, 0, 12, sample=0)
a.instrument('SNARE', 'sample', 0, 0, 15, 0, 10, sample=1)
a.instrument('BRASS', 'pulse25', 2, 12, 10, 12, 5, pan=-0.15)       # the title's and the fanfare's horn
a.instrument('STRINGS', 'saw', 10, 30, 9, 18, 3, pan=0.2)          # held chord tones on the saw channel
a.instrument('STAB', 'pulse50', 0, 6, 4, 4, 4, pan=-0.1)           # the boss theme's short lead
a.instrument('GUN', 'noise', 0, 5, 0, 2, 9)                       # effects from here on: gunfire on the noise channel
a.instrument('GUNHI', 'noise-short', 0, 3, 0, 1, 7)
a.instrument('BOOM', 'noise', 0, 22, 2, 10, 7)
a.instrument('ZAP', 'pulse12', 0, 6, 0, 0, 9)
a.instrument('BLIP', 'pulse25', 0, 5, 3, 3, 9)
a.instrument('OUCH', 'pulse50', 0, 8, 2, 4, 8)
a.instrument('CHIME', 'pulse50', 0, 8, 5, 8, 8)
DRUMS[16]['stomp'] = ('K..KS..KK..KS.KS', 'h.h.h.h.h.h.h.h.')   # the boss: a heavier, busier beat

# --- 0 The jungle: E minor, 150 bpm, loops, 32 bars (51 s) -----------------------------------------------------------------
# A drum-and-bass intro; the main tune; a second theme climbing over strings; the main tune again over a driving beat;
# a bridge that builds to a snare roll.
S = a.song(Key('E', MINOR), 6)
OSTINATO = '1 1 8 1 5 1 8 1'
bars(S, 16, ['1', '1', '6', '7'], None, drums='march', bass=OSTINATO, upper='arp')
MAIN = ['E5 - G5 - B5 - A5 G5', 'G5 - E5 - C5 - E5 -', 'D5 - G5 - B5 - D6 -', 'C6 - B5 - A5 - F#5 -',
        'E5 - G5 - B5 - E6 -', 'D6 - C6 - B5 - G5 -', 'A5 - C6 - B5 - A5 G5', 'F#5 - - - D#5 - B4 .']
MAIN_CH = ['1', '6', '3', '7', '1', '6', '4', '5+']
bars(S, 16, MAIN_CH, MAIN, li='LEAD', drums='basic', bass=OSTINATO, upper='arp')
bars(S, 16, ['4', '1', '6', '7', '4', '1', '6', '5+'],
     ['A4 - C5 - E5 - C5 -', 'B4 - E5 - G5 - E5 -', 'C5 - E5 - G5 - E5 -', 'D5 - F#5 - A5 - F#5 -',
      'E5 - A5 - C6 - A5 -', 'G5 - B5 - E6 - B5 -', 'G5 - C6 - E6 - C6 -', 'D#6 - B5 - F#5 - D#5 -'],
     li='LEAD', drums=['bouncy'] * 7 + ['basic'], fill=[False] * 7 + [True], bass='1 - 5 - 1 - 5 -',
     counter='3 - - - 5 - - -', ci='STRINGS')
bars(S, 16, MAIN_CH, MAIN, li='LEAD', drums='drive', bass=OSTINATO, upper='arp')
bars(S, 16, ['6', '7', '1', '5+'], ['C6 - - - G5 - - -', 'A5 - - - F#5 - - -', 'G5 - - - B5 - E6 -', 'D#6 - - - - - . -'],
     li='BRASS', drums=['heavy', 'heavy', 'heavy', 'basic'], fill=[False, False, False, True], bass='1 - - 1 - - 5 -', upper='arp1')
S.finish()

# --- 1 The title: E minor, 128 bpm, loops, 16 bars (30 s) ------------------------------------------------------------------
# A horn over held strings, then the tune on the lead with a marching beat.
S = a.song(Key('E', MINOR), 7)
bars(S, 16, ['1', '6', '3', '7', '1', '6', '4', '5+'],
     ['E5 - - - B4 - E5 -', 'G5 - - - E5 - C5 -', 'D5 - - - G5 - B5 -', 'A5 - - - - - . -',
      'E5 - - - B4 - E5 G5', 'C6 - - - G5 - E5 -', 'A5 - - - C6 - E6 -', 'D#6 - - - - - . -'],
     li='BRASS', drums='soft', bass='long', counter='3 - - - 5 - - -', ci='STRINGS')
bars(S, 16, ['4', '1', '6', '7', '4', '1', '6', '5+'],
     ['C6 - B5 - A5 - E5 -', 'G5 - F#5 - E5 - B4 -', 'E5 - G5 - C6 - E6 -', 'D6 - - - A5 - F#5 -',
      'A5 - C6 - E6 - D6 C6', 'B5 - G5 - E5 - G5 -', 'C6 - B5 - A5 - G5 -', 'F#5 - - - B4 - - .'],
     li='LEAD', drums=['march'] * 7 + ['basic'], fill=[False] * 7 + [True], bass='1 - 5 - 1 - 5 -', upper='arp')
S.finish()

# --- 2 The fortress commander: E minor with a menacing F (the flat second), 180 bpm, loops, 16 bars (21 s) -----------------
S = a.song(Key('E', MINOR), 5)
BOSS_CH = ['Em', 'F', 'Em', 'D', 'Em', 'F', 'G', 'B']
BOSS_BASS = ['E2 E2 E3 E2 B1 E2 G2 E2', 'F2 F2 F3 F2 A2 F2 C3 F2', 'E2 E2 E3 E2 B1 E2 G2 E2', 'D2 D2 D3 D2 F#2 D2 A2 D2',
             'E2 E2 E3 E2 B1 E2 G2 E2', 'F2 F2 F3 F2 A2 F2 C3 F2', 'G2 G2 G3 G2 B2 G2 D3 G2', 'B1 B1 B2 B1 D#2 B1 F#2 B1']
bars(S, 16, BOSS_CH, ['E5 . E5 . G5 - B5 .', 'F5 - - - A5 - C6 .', 'B5 . B5 . E6 - D6 .', 'D6 - C6 - A5 - F#5 .',
                      'E6 . E6 . G6 - E6 .', 'F6 - C6 - A5 - C6 .', 'G5 - B5 - D6 - G6 .', 'F#6 - D#6 - B5 - F#5 .'],
     li='STAB', drums='stomp', bass=BOSS_BASS, upper='arp1')
bars(S, 16, BOSS_CH, ['E6 - - - B5 - - -', 'F6 - - - C6 - - -', 'G6 - - - E6 - B5 -', 'A5 - - - D6 - F#6 -',
                      'E6 - D6 - B5 - G5 -', 'A5 - C6 - F6 - A6 -', 'G6 - - - D6 - B5 -', 'F#6 - - - - - . -'],
     li='BRASS', drums=['heavy'] * 7 + ['stomp'], fill=[False] * 7 + [True], bass=BOSS_BASS, counter='3 - - - 5 - - -', ci='STRINGS')
S.finish()

# --- 3 Mission complete: a fanfare in E major, once (6 s) ------------------------------------------------------------------
S = a.song(Key('E', MAJOR), 6)
bars(S, 16, ['1', '4', '5', '1'], ['E5 - G#5 - B5 - E6 -', 'C#6 - A5 - E6 - - -', 'D#6 - F#6 - B5 - D#6 -', 'E6 - - - - - . -'],
     li='BRASS', drums=['basic', 'basic', 'basic', 'kick'], bass=['1 - 5 - 8 - 5 -', '1 - 5 - 8 - 5 -', '1 - 5 - 8 - 5 -', 'long'], upper='arp1')
S.finish()
a.songs[-1]['loop'] = None

# --- 4 Mission failed: a slow fall in E minor, once (9 s) ------------------------------------------------------------------
S = a.song(Key('E', MINOR), 9)
bars(S, 16, ['1', '7', '5+', '1'], ['B4 - - - A4 - - -', 'A4 - - - F#4 - - -', 'F#4 - - - D#4 - - -', 'E4 - - - - - . -'],
     li='BRASS', drums='none', bass='long', counter='3 - - - 5 - - -', ci='STRINGS')
S.finish()
a.songs[-1]['loop'] = None

# --- Effects, in the numbers code.js plays -----------------------------------------------------------------------------------
a.effect(1, ['A-6', 'D-6', 'G-5', 'OFF'], 'GUN')                                   # 0 rifle
a.effect(2, ['C-5', 'G-5', 'C-6', 'OFF'], 'BLIP')                                  # 1 jump
a.effect(2, ['E-4', 'C-4', 'G#3', 'E-3', 'OFF'], 'OUCH')                           # 2 hurt
a.effect(2, ['G-5', 'C-5', 'F-4', 'C-4', 'G-3', 'OFF'], 'BOOM')                   # 3 an enemy down
a.effect(3, ['C-6', 'E-6', 'G-6', 'C-7', None, 'OFF'], 'CHIME')                    # 4 checkpoint
a.effect(4, ['C-5', 'B-4', 'A-4', 'G-4', 'E-4', 'C-4', None, 'OFF'], 'OUCH')       # 5 lost a life
a.effect(2, ['D-5', 'A-4', 'F-4', 'D-4', 'A-3', 'F-3', 'OFF'], 'BOOM')             # 6 rocket
a.effect(1, ['C-7', 'G-6', 'D-6', 'A-5', 'E-5', 'OFF'], 'ZAP')                     # 7 laser
a.effect(1, ['F-6', 'C-6', 'F-5', 'OFF'], 'GUN')                                   # 8 spread
a.effect(1, ['C-7', 'G-6', 'OFF'], 'GUNHI')                                        # 9 rapid
a.effect(4, ['C-6', 'G-5', 'D-5', 'A-4', 'E-4', 'C-4', 'A-3', 'F-3', 'D-3', 'C-3', None, 'OFF'], 'BOOM')   # 10 the boss destroyed
a.write(sys.argv[1], songs=5)
