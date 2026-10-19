# Tricksy Towerz's audio: carts/src/tricksy-towerz/audio.json.
#   python3 carts/src/tricksy-towerz/audio.py carts/src/tricksy-towerz/audio.json
# Four songs (0 the title, lobby, help and records; 1 the race; 2 over the line; 3 the finish: a fanfare once, then a calm loop) and the effects numbered as SFX in code.js. Written with the song
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
a.instrument('PLUCK', 'pulse25', 0, 7, 3, 4, 6, pan=-0.15)        # songs again: a plucked lead for the second theme of the race
a.instrument('STRINGS', 'saw', 10, 30, 9, 18, 3, pan=0.2)          # held chord tones on the saw channel (no vibrato)
a.instrument('BRASS', 'pulse25', 1, 8, 10, 10, 6, pan=-0.15)       # the fanfare's lead
a.instrument('HARP', 'saw', 0, 10, 2, 8, 4, pan=0.25)              # the victory loop's slow arpeggio
DRUMS[16]['lull'] = ('K.......s.......', '....h.......h...')   # half time, for the slow victory loop
DRUMS[16]['pulse'] = ('K...K...K...K.K.', '..h...h...h...h.')  # a heartbeat that stumbles at the end of the bar

# --- 0 The title, the lobby, the help and the records: A minor, 128 bpm, loops, 16 bars (30 s) ---
# A horn over a sparkling arpeggio; the tune on the lead with a walking bass; a bridge with strings; the horn's tune again, higher.
S = a.song(Key('A', MINOR), 7)
bars(S, 16, ['1', '6', '3', '7'], ['E5 - A5 B5 C6 - B5 A5', 'A5 - - - F5 - G5 A5', 'G5 - C6 - E5 - G5 -', 'D5 - G5 - B5 - - .'],
     li='SOFTHORN', drums='soft', bass='long', upper='arp1')
bars(S, 16, ['1', '6', '3', '7'], ['A5 - C6 - E6 - D6 C6 B5 - A5 - G5 - E5 -', 'F5 - A5 - C6 - A5 - G5 - A5 - C6 - A5 -',
                                   'E5 - G5 - C6 - E6 - D6 - C6 - D6 - E6 -', 'D6 - - - B5 - G5 - A5 - B5 - D6 - . -'],
     li='LEAD', grid=1, bgrid=2, cgrid=2, drums='basic', bass=['1 - 5 - 8 - 5 -', '1 - 5 - 8 - 5 -', '1 - 5 - 8 - 5 -', '1 - 5 - 8 - 3 -'], upper='arp')
bars(S, 16, ['4', '1', '6', '5+'], ['F6 - - E6 D6 - A5 - - - D6 - E6 - F6 -', 'E6 - - - C6 - A5 - B5 - C6 - B5 - A5 -',
                                    'A5 - C6 - F6 - - - G6 - F6 - C6 - - -', 'G#5 - B5 - E6 - - - D6 - - - B5 - G#5 -'],
     li='LEAD', grid=1, bgrid=2, cgrid=2, drums=['bouncy', 'bouncy', 'bouncy', 'basic'], fill=[False, False, False, True], bass='1 - - 1 - - 5 -',
     counter=['3 - - - 5 - - -', '3 - - - 5 - - -', '3 - - - 5 - - -', '3 - - - 5 - - -'], ci='STRINGS')
bars(S, 16, ['1', '6', '7', '5+'], ['E5 - A5 B5 C6 - B5 A5', 'A5 - C6 - F6 - C6 -', 'B5 - D6 - G6 - D6 -', 'E6 - - - B5 - G#5 -'],
     li='LEAD', drums='drive', bass=['1 - 5 - 1 - 5 -', '1 - 5 - 1 - 5 -', '1 - 5 - 1 - 5 -', '1 - 3 - 5 - 3 -'], upper='arp')
S.finish()

# --- 1 The race: C major, 150 bpm, loops, 32 bars (51 s: a race of a minute hears it about once) ---
# An intro riff on the pluck; the main tune; a second theme in the minor on the pluck with strings; a breakdown with the horn; the main tune with a driving beat.
S = a.song(Key('C', MAJOR), 6)
RACE_A = ['E5 - G5 - C6 - - B5 C6 - G5 - E5 - G5 -', 'D6 - - - B5 - G5 - A5 - B5 - D6 - - -', 'C6 - - B5 A5 - E5 - A5 - B5 - C6 - E6 -', 'D6 - C6 - A5 - F5 - G5 - A5 - C6 - - -',
          'E5 - G5 - C6 - - B5 C6 - E6 - G6 - E6 -', 'D6 - - - B5 - D6 - G6 - - - D6 - B5 -', 'C6 - A5 - F5 - A5 - C6 - D6 - F6 - E6 -', 'G6 - - - F6 - D6 - B5 - - - G5 - - -']
RACE_CH = ['1', '5', '6', '4', '1', '5', '4', '5']
bars(S, 16, ['1', '5', '6', '4'], ['C6 . G5 . E5 G5 C6 .', 'B5 . G5 . D5 G5 B5 .', 'C6 . A5 . E5 A5 C6 .', 'C6 . A5 . F5 A5 G5 .'],
     li='PLUCK', drums='basic', fill=[False, False, False, True], bass='1 - 1 5 - 5 1 -', upper='arp')
bars(S, 16, RACE_CH, RACE_A, li='LEAD', grid=1, bgrid=2, cgrid=2, drums='basic', bass='1 - 5 - 1 - 5 -', upper='arp')
bars(S, 16, ['6', '3', '4', '1', '2', '5', '3', '6'],
     ['A5 C6 E6 C6 B5 A5 E5 A5', 'G5 B5 E6 B5 G5 B5 E6 G6', 'A5 C6 F6 C6 A5 C6 F6 A6', 'G6 - E6 - C6 - G5 -',
      'F5 A5 D6 A5 F5 A5 D6 F6', 'G6 F6 D6 B5 G5 B5 D6 F6', 'E6 D6 B5 G5 E5 G5 B5 D6', 'C6 - - - A5 - - .'],
     li='PLUCK', drums=['bouncy'] * 7 + ['basic'], fill=[False] * 7 + [True], bass='1 - - 1 5 - 1 -',
     counter='3 - - - 5 - - -', ci='STRINGS')
bars(S, 16, ['4', '5', '3', '6'], ['A5 - - - C6 - - -', 'B5 - - - D6 - G5 -', 'G5 - - - B5 - E6 -', 'C6 - - - - - E5 .'],
     li='SOFTHORN', drums='soft', bass='long', upper='arp1')
bars(S, 16, RACE_CH, RACE_A, li='LEAD', grid=1, bgrid=2, cgrid=2, drums='drive', fill=[False] * 7 + [True], bass='1 - 5 - 8 - 5 -', upper='arp')
S.finish()

# --- 2 Over the line: A minor, 112 bpm, loops, 8 bars (17 s; it is heard for a few seconds at a time) ---
# A heartbeat, a ticking arpeggio, a bass that falls a step a bar (A G F E) under a horn that climbs: the tower has only to stand.
S = a.song(Key('A', MINOR), 8)
bars(S, 16, ['1', '1', '6', '5+', '4', '1', '6', '5+'],
     ['A5 - - - B5 - C6 -', 'B5 - - - C6 - D6 -', 'C6 - - - A5 - F6 -', 'E6 - - - - - B5 -',
      'F6 - - - E6 - D6 -', 'E6 - - - C6 - A5 -', 'C6 - - - F6 - A6 -', 'G#6 - - - B5 - E6 .'],
     li='SOFTHORN', drums=['pulse', 'pulse', 'pulse', 'pulse', 'kick', 'kick', 'basic', 'basic'], fill=[False] * 7 + [True],
     bass=['A2 A2 A2 A2 A2 A2 A2 A2', 'G2 G2 G2 G2 G2 G2 G2 G2', 'F2 F2 F2 F2 F2 F2 F2 F2', 'E2 E2 E2 E2 E2 E2 E2 E2',
           'D2 D2 D2 D2 D2 D2 D2 D2', 'C2 C2 C2 C2 C2 C2 C2 C2', 'F2 F2 F2 F2 F2 F2 F2 F2', 'E2 E2 E2 E2 E2 E2 E2 E2'], upper='arp1')
S.finish()

# --- 3 The finish: a fanfare (4 bars), then a slow, gentle victory loop (16 bars at half the pace) under the results, the initials and the records ---
# C major, 180 bpm. The song loops back to its second pattern, so the fanfare is heard once and the calm tune goes round; nothing is held for ever.
S = a.song(Key('C', MAJOR), 5)
bars(S, 16, ['1', '4', '5', '1'], ['C5 - C5 C5 G5 - - - E5 - G5 - C6 - - -', 'A5 - A5 A5 C6 - - - A5 - C6 - F6 - - -', 'G5 - B5 - D6 - G6 - F6 - D6 - B5 - D6 -', 'E6 - - - - - - - C6 - - - - - - .'],
     li='BRASS', grid=1, bgrid=2, cgrid=2, drums=['march', 'march', 'march', 'none'], fill=[False, False, True, False], bass=['1 - 5 - 1 - 5 -', '1 - 5 - 1 - 5 -', '1 - 5 - 1 - 5 -', '1 - - - - - - .'],
     upper=['arp', 'arp', 'arp', None], counter=[None, None, None, '3 - - - 5 - - .'], ci='STRINGS')
bars(S, 16, ['1', '6', '4', '5', '1', '3', '4', '5', '6', '3', '4', '1', '2', '5', '1', '1'],
     ['E5 - G5 -', 'C6 - - -', 'A5 - C6 -', 'B5 - - -', 'G5 - E5 -', 'G5 - B5 -', 'C6 - A5 -', 'D6 - - -',
      'C6 - E6 -', 'D6 - B5 -', 'C6 - A5 -', 'G5 - - -', 'F5 - A5 -', 'B5 - D6 -', 'C6 - - -', '- - - .'],
     li='SOFTHORN', grid=4, cgrid=2, drums=['none'] * 2 + ['lull'] * 14, bass='long', counter="1 3 5 8 5' 8 5 3", ci='HARP')
for r in S.rows[64:]:                  # the calm tune is softer than the fanfare: its bass and lead at 11 and 12 of 15
    for ch, v in ((2, 11), (0, 12)):
        if r[ch] and r[ch].get('n') != 'OFF': r[ch]['v'] = v
S.finish(); a.songs[-1]['loop'] = 1   # back to the calm tune, never to the fanfare

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
