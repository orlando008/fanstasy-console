# Moto Crosser's audio: carts/src/moto-crosser/audio.json.
#   python3 carts/src/moto-crosser/audio.py carts/src/moto-crosser/audio.json
# Five songs (SPEC 11): the title, one for each track, and the podium. Channels: 0 lead, 1 kept
# for SFX (it only carries the tempo), 2 bass, 3 saw (arpeggio, chords), 4 kept for the engine
# (a short looping SFX restarted at one of six pitches), 5 sample (kick, snare and hats).
# The effects are numbered as in code.js (SFX = {...}); the engine is 21 to 26.
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
a.instrument('STACC', 'pulse25', 0, 5, 3, 2, 7, pan=-0.1)
a.instrument('ARP', 'saw', 0, 4, 0, 0, 5, pan=0.25)
a.instrument('GLASS', 'pulse25', 2, 18, 9, 16, 5, pan=-0.2)   # a lead's entrance: thin and soft, no wobble
a.instrument('KICK', 'sample', 0, 0, 15, 0, 12, sample=0)
a.instrument('SNARE', 'sample', 0, 0, 15, 0, 10, sample=1)
a.instrument('COUNTER', 'saw', 1, 10, 6, 8, 5, (1, 5), 0.3)
a.instrument('BRASS', 'pulse50', 3, 16, 12, 10, 4)   # the night lead: steady, no wobble
a.instrument('SOLO', 'pulse25', 0, 6, 10, 6, 5, pan=-0.1)   # the last section's lead: steady, no wobble
a.instrument('SOFTHORN', 'pulse25', 6, 20, 10, 12, 6, pan=-0.15)
a.instrument('PAH', 'saw', 0, 3, 2, 1, 5, pan=0.25)   # off-beat chords
a.instrument('BEEP', 'pulse50', 0, 8, 8, 4, 9)   # effects from here on
a.instrument('GO', 'pulse50', 0, 14, 10, 6, 10)
a.instrument('FANFARE', 'pulse25', 0, 6, 11, 6, 9)
a.instrument('BUZZ', 'noise', 0, 12, 6, 4, 9)
a.instrument('BLIP', 'pulse12', 0, 3, 0, 0, 8)
a.instrument('CHIME', 'pulse50', 0, 6, 5, 6, 9)
a.instrument('WHOOSH', 'noise', 0, 6, 2, 3, 6)
a.instrument('THUD', 'pulse50', 0, 4, 0, 0, 11)
a.instrument('CRASH', 'noise', 0, 8, 3, 6, 11)
a.instrument('SPLAT', 'noise-short', 0, 5, 1, 3, 8)
a.instrument('ENG', 'noise', 0, 3, 5, 1, 4)   # the engine runs on the noise channel: a low, buzzing rasp
a.instrument('ENGT', 'noise-short', 0, 2, 5, 1, 4)   # ... and its turbo edge
a.instrument('PUFF', 'noise', 0, 3, 0, 0, 5)   # ... and the exhaust between them


# --- 0 The title: 150 bpm, A minor, a revving build -----------------------------------------------
S = a.song(Key('A', MINOR), 6)
TA = ['A4 - C5 - E5 - A5 -', 'A5 - G5 - F5 - C5 -', 'E5 - G5 - C6 - G5 -', 'D5 - G5 - B5 - G5 -']
TB = ['C5 - E5 - A5 - C6 -', 'C6 - A5 - F5 - A5 -', 'G5 - E5 - C5 - E5 -', 'D5 - G5 - B5 - D6 -']
TC = ['E5 - A5 - C6 - E6 -', 'F6 - C6 - A5 - C6 -', 'G5 - C6 - E6 - G6 -', 'G6 - D6 - B5 - G5 .']
TCH = ['1', '6', '3', '7']
bars(S, 16, TCH, None, drums='soft', bass='long', upper='arp1')
bars(S, 16, TCH, TA, li='GLASS', drums='drive', bass='1 - - - 5 - - -', upper='arp1')
bars(S, 16, TCH, TB, li='SOFTHORN', drums='drive', bass='1 - 1 - 5 - 1 -', upper='arp')
bars(S, 16, TCH, TC, li='SOLO', drums='drive', bass='1 1 8 1 5 5 8 5', upper='arp1', fill=[0, 0, 0, 1])
S.finish()

# --- 1 Stadium Dirt: 150 bpm, a bright bouncy rock tune in D major ----------------------------------
S = a.song(Key('D', MAJOR), 6)
SA = ['F#5 - A5 - D6 - A5 -', 'E5 - A5 - C#6 - A5 -', 'D5 - F#5 - B5 - F#5 -', 'B5 - G5 - D5 - G5 -']
SB = ['A5 - D6 - F#6 - D6 -', 'E6 - C#6 - A5 - C#6 -', 'D6 - B5 - F#5 - B5 -', 'B5 - G5 - D6 - B5 .']
SCH = ['1', '5', '6', '4']
PAH = dict(counter='- 3 - 5 - 3 - 5', ci='PAH', cbase=48)
BOUNCE = dict(drums='bouncy', bass='1 1 8 1 1 1 8 1', **PAH)
bars(S, 16, SCH, None, **BOUNCE)
bars(S, 16, SCH, SA, li='STACC', **BOUNCE)
bars(S, 16, SCH, SB, li='STACC', **BOUNCE)
bars(S, 16, SCH, SA, li='SOLO', fill=[0, 0, 0, 1], **BOUNCE)
S.finish()

# --- 2 Desert Run: 150 bpm, a galloping 6/8 over the Andalusian cadence in A minor -----------------------
S = a.song(Key('A', MINOR), 6)
DA = ['A5 - C6 - E6 -', 'D6 - B5 - G5 -', 'C6 - A5 - F5 -', 'E6 - B5 - G#5 .']
DB = ['E6 - C6 - A5 -', 'B5 - D6 - G5 -', 'A5 - C6 - F6 -', 'E6 - G#5 - B5 .']
DCH = ['1', '7', '6', '5+']
GALLOP = dict(drums='gallop', bass='1 - 1 1 5 1')
bars(S, 12, DCH, None, upper='arp', **GALLOP)
bars(S, 12, DCH, DA, li='SOFTHORN', upper='arp', **GALLOP)
bars(S, 12, DCH, DB, li='SOFTHORN', upper='arp', **GALLOP)
bars(S, 12, DCH, DA, li='SOLO', upper='arp', **GALLOP)
# 16 bars of 12 rows are 3 patterns; the first pattern's tempo row is on its own
S.finish()

# --- 3 Night Mountain: 180 bpm, a driving tune in C# minor -------------------------------------------------
S = a.song(Key('C#', MINOR), 5)
PULSE = '1 . 1 . 8 . 1 . 1 . 5 . 8 . 1 .'
NA = ['G#4 - C#5 - E5 - G#5 -', 'A5 - E5 - C#5 - E5 -', 'B5 - G#5 - E5 - G#5 -', 'F#5 - B5 - D#6 - B5 .']
NB = ['C#6 - - - B5 - G#5 -', 'A5 - - - E5 - A5 -', 'G#5 - B5 - E6 - B5 -', 'D#6 - B5 - F#5 - D#5 .']
NCH = ['1', '6', '3', '7']
NIGHT = dict(bass=PULSE, bgrid=1)
bars(S, 16, NCH, None, drums='heavy', upper='arp', **NIGHT)
bars(S, 16, NCH, NA, li='BRASS', drums='heavy', upper='pad', **NIGHT)
bars(S, 16, NCH, NB, li='BRASS', drums='drive', upper='arp1', **NIGHT)
bars(S, 16, NCH, NA, li='SOLO', drums='drive', upper='arp1', fill=[0, 0, 0, 1], **NIGHT)
S.finish()

# --- 4 The podium: 128 bpm, C major, proud -----------------------------------------------------------------------
S = a.song(Key('C', MAJOR), 7)
P1 = ['C5 - E5 - G5 - C6 -', 'A5 - F5 - A5 - C6 -', 'B5 - G5 - D5 - G5 -', 'C6 - - - E6 - - -']
P2 = ['E6 - C6 - A5 - C6 -', 'C6 - A5 - F5 - A5 -', 'D6 - B5 - G5 - B5 -', 'C6 - E6 - G6 - - .']
bars(S, 16, ['1', '4', '5', '1'], P1, li='SOFTHORN', drums='basic', bass='1 - 5 - 1 - 5 -', upper='arp')
bars(S, 16, ['6', '4', '5', '1'], P2, li='SOLO', drums='basic', bass='1 - 5 - 1 - 5 -', upper='arp1')
S.finish()

# --- SFX (channel 1 for the effects, 4 for the engine and the noisy effects) -----------------------------------------
def engine(speed, note, rows, inst='ENG', puff=4):
    """A rasp of short notes with a puff of exhaust now and then: 30 ticks or a little more."""
    cells = [None] * 32
    for k in range(rows):
        cells[k] = {'n': 'C-6', 'i': a.I['PUFF']} if puff and k % puff == puff - 1 else {'n': note, 'i': a.I[inst]}
    return a.effect_rows(speed, cells)
sfx = a.effect
sfx(5, ['C-5', 'OFF'], 'BEEP')                                        # 0 a starting light
sfx(5, ['C-6', None, 'OFF'], 'GO')                                    # 1 GO
sfx(4, ['C-5', 'E-5', 'G-5', 'C-6', None, 'G-5', 'C-6', 'OFF'], 'FANFARE')   # 2 over the line
sfx(4, ['G-2', 'F-2', 'E-2', 'OFF'], 'BUZZ')                          # 3 a false start
sfx(2, ['C-6', 'G-6', 'OFF'], 'CHIME')                                # 4 menu select
sfx(2, ['E-6', 'OFF'], 'BLIP')                                        # 5 menu move
sfx(2, ['E-5', 'B-5', 'OFF'], 'CHIME')                                # 6 pause
sfx(2, ['E-4', 'A-4', 'C-5', 'OFF'], 'WHOOSH')                        # 7 take-off
sfx(2, ['C-3', 'OFF'], 'THUD')                                        # 8 a clean landing
sfx(3, ['E-3', 'C-3', 'A-2', 'OFF'], 'THUD')                          # 9 a rough landing
sfx(3, ['C-4', 'G-3', 'D-3', 'A-2', 'OFF'], 'CRASH')                  # 10 a crash
sfx(3, ['A-2', 'C-3', 'OFF'], 'SPLAT')                                # 11 mud
sfx(1, ['C-5', 'E-5', 'G-5', 'C-6', 'OFF'], 'BLIP')                   # 12 an arrow strip
sfx(2, ['G-6', 'E-6', 'C-6', 'OFF'], 'CHIME')                         # 13 a cooling pad
sfx(4, ['C-5', 'A-4', 'F-4', 'D-4', 'OFF'], 'BUZZ')                   # 14 the engine overheats
sfx(2, ['C-4', 'G-4', 'C-5', 'OFF'], 'GO')                            # 15 the engine restarts
sfx(2, ['E-3', 'C-3', 'OFF'], 'THUD')                                 # 16 bikes touch
sfx(2, ['C-3', 'G-2', 'OFF'], 'THUD')                                 # 17 a logo letter lands
sfx(2, ['C-7', 'OFF'], 'BLIP')                                        # 18 a tally tick
sfx(5, ['C-5', 'E-5', 'G-5', 'C-6', None, 'G-5', 'C-6', 'E-6', None, 'G-6', None, None, 'C-7', None, None, None, 'OFF'], 'FANFARE')   # 19 the podium
sfx(6, ['G-4', 'E-4', 'C-4', None, 'D-4', None, 'C-4', 'OFF'], 'FANFARE')   # 20 the championship is over
engine(4, 'C-0', 8, 'ENG', 0)                                        # 21 the engine, idling
engine(3, 'C-1', 11, 'ENG', 0)                                       # 22 ... slow
engine(2, 'G-1', 16, 'ENG', 0)                                       # 23 ... cruising
engine(1, 'D-2', 32, 'ENG', 0)                                       # 24 ... fast
engine(1, 'G-2', 32, 'ENGT', 0)                                      # 25 ... turbo
engine(1, 'D#3', 32, 'ENG', 0)                                       # 26 ... in the air, revving
sfx(1, ['C-5', 'E-5', 'G-5', 'OFF'], 'BLIP')                          # 27 a rival is passed
sfx(3, ['G-4', 'D-4', 'OFF'], 'THUD')                                 # 28 a rival passes
sfx(3, ['E-4', 'C-4', 'G-3', 'C-3', 'OFF'], 'CRASH')                  # 29 a hurdle is smashed

a.write(sys.argv[1], songs=5)
