# Moto Crosser's audio: carts/src/moto-crosser/audio.json.
#   python3 carts/src/moto-crosser/audio.py carts/src/moto-crosser/audio.json
# Five songs (SPEC 11): the title, one for each track, and the podium. The new sound chip (SPEC 5): sampled instruments
# and an echo for each song. Channels: 0 lead, 1 counter-melody and off-beat chords, 2 bass, 3 arpeggio or the pad,
# 4 hats (or the pad's fifth), 5 kick and snare; 6 is kept for the engine (a short looping SFX restarted at one of six
# pitches) and 7 for the effects (the tempo goes on it too). The effects are numbered as in code.js (SFX = {...}); the
# engine is 21 to 26. Leads sit in octave 4 (playbook section 5: a lead up high pierces).
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../../tools/devkit/music'))
from kit import *

a = Audio(chip=2)
a.sample(kick()); a.sample(snare()); a.sample(hat(0.05, 70, 3)); a.sample(hat(0.15, 22, 5))

a.voice('LEAD', 'flute', 5, -0.15)
a.voice('BASS', 'bass', 12)
a.instrument('HAT', 'sample', 0, 0, 15, 0, 4, pan=0.25, sample=2)
a.instrument('OHAT', 'sample', 0, 0, 15, 0, 4, pan=0.25, sample=3, echo=3)
a.voice('PAD', 'strings', 5, 0.2)
a.voice('STACC', 'brass', 7, -0.1, d=6, s=3, r=3)              # the stadium's staccato horn
a.voice('ARP', 'pluck', 13, 0.25)
a.voice('GLASS', 'flute', 5, -0.2, a=3)                          # a lead's entrance: soft, no wobble
a.instrument('KICK', 'sample', 0, 0, 15, 0, 12, sample=0, echo=2)
a.instrument('SNARE', 'sample', 0, 0, 15, 0, 10, sample=1, echo=5)
a.voice('COUNTER', 'strings', 5, 0.3)
a.voice('BRASS', 'brass', 6)                                     # the night lead: steady, no wobble
a.voice('SOLO', 'brass', 7, -0.1)                                # the last section's lead
a.voice('SOFTHORN', 'brass', 6, -0.15, a=6)
a.voice('PAH', 'epiano', 8, 0.25, d=10, s=0)                     # off-beat chords: short keys
a.instrument('BEEP', 'pulse50', 0, 8, 8, 4, 9, echo=4)            # effects from here on: the start lights stay chip beeps
a.voice('GO', 'brass', 11, d=14, s=10, r=6)
a.voice('FANFARE', 'brass', 11, d=6, s=11, r=6)
a.instrument('BUZZ', 'noise', 0, 12, 6, 4, 9)
a.instrument('BLIP', 'pulse12', 0, 3, 0, 0, 8, echo=4)
a.voice('CHIME', 'celesta', 12)
a.instrument('WHOOSH', 'noise', 0, 6, 2, 3, 6)
a.voice('THUD', 'tom', 12)
a.voice('CRASH', 'crash', 10)
a.instrument('SPLAT', 'noise-short', 0, 5, 1, 3, 8)
a.instrument('ENG', 'noise', 0, 3, 5, 1, 4)   # the engine runs on the noise channel: a low, buzzing rasp
a.instrument('ENGT', 'noise-short', 0, 2, 5, 1, 4)   # ... and its turbo edge
a.instrument('PUFF', 'noise', 0, 3, 0, 0, 5)   # ... and the exhaust between them


# --- 0 The title: 150 bpm, A minor, a revving build -----------------------------------------------
S = a.song(Key('A', MINOR), 6, echo=(5, 4, 5, 9))
TA = octave(['A4 - C5 - E5 - A5 -', 'A5 - G5 - F5 - C5 -', 'E5 - G5 - C6 - G5 -', 'D5 - G5 - B5 - G5 -'])
TB = octave(['C5 - E5 - A5 - C6 -', 'C6 - A5 - F5 - A5 -', 'G5 - E5 - C5 - E5 -', 'D5 - G5 - B5 - D6 -'])
TC = octave(['E5 - A5 - C6 - E6 -', 'F6 - C6 - A5 - C6 -', 'G5 - C6 - E6 - G6 -', 'G6 - D6 - B5 - G5 .'])
TCH = ['1', '6', '3', '7']
bars(S, 16, TCH, None, drums='drive', bass='1 - - - 5 - - -', upper='pad', counter='1 3 5 8 5 3 5 1', ci='ARP')   # the pad first: the lead does not arrive with a jump
bars(S, 16, TCH, TA, li='GLASS', drums='drive', bass='1 - - - 5 - - -', upper='arp1')
bars(S, 16, TCH, TB, li='SOFTHORN', drums='drive', bass='1 - 1 - 5 - 1 -', upper='arp')
bars(S, 16, TCH, TC, li='SOLO', drums='drive', bass='1 1 8 1 5 5 8 5', upper='arp1', fill=[0, 0, 0, 1])
S.finish()

# --- 1 Stadium Dirt: 150 bpm, a bright bouncy rock tune in D major ----------------------------------
S = a.song(Key('D', MAJOR), 6, echo=(4, 3, 4, 10))
SA = octave(['F#5 - A5 - D6 - A5 -', 'E5 - A5 - C#6 - A5 -', 'D5 - F#5 - B5 - F#5 -', 'B5 - G5 - D5 - G5 -'])
SB = octave(['A5 - D6 - F#6 - D6 -', 'E6 - C#6 - A5 - C#6 -', 'D6 - B5 - F#5 - B5 -', 'B5 - G5 - D6 - B5 .'])
SCH = ['1', '5', '6', '4']
PAH = dict(counter='- 3 - 5 - 3 - 5', ci='PAH', cbase=48)
BOUNCE = dict(drums='bouncy', bass='1 1 8 1 1 1 8 1', **PAH)
bars(S, 16, SCH, None, **BOUNCE)
bars(S, 16, SCH, SA, li='STACC', **BOUNCE)
bars(S, 16, SCH, SB, li='STACC', **BOUNCE)
bars(S, 16, SCH, SA, li='SOLO', fill=[0, 0, 0, 1], **BOUNCE)
S.finish()

# --- 2 Desert Run: 150 bpm, a galloping 6/8 over the Andalusian cadence in A minor -----------------------
S = a.song(Key('A', MINOR), 6, echo=(7, 5, 6, 8))
DA = octave(['A5 - C6 - E6 -', 'D6 - B5 - G5 -', 'C6 - A5 - F5 -', 'E6 - B5 - G#5 .'])
DB = octave(['E6 - C6 - A5 -', 'B5 - D6 - G5 -', 'A5 - C6 - F6 -', 'E6 - G#5 - B5 .'])
DCH = ['1', '7', '6', '5+']
GALLOP = dict(drums='gallop', bass='1 - 1 1 5 1')
bars(S, 12, DCH, None, upper='arp', **GALLOP)
bars(S, 12, DCH, DA, li='SOFTHORN', upper='arp', **GALLOP)
bars(S, 12, DCH, DB, li='SOFTHORN', upper='arp', **GALLOP)
bars(S, 12, DCH, DA, li='SOLO', upper='arp', **GALLOP)
# 16 bars of 12 rows are 3 patterns; the first pattern's tempo row is on its own
S.finish()

# --- 3 Night Mountain: 180 bpm, a driving tune in C# minor -------------------------------------------------
S = a.song(Key('C#', MINOR), 5, echo=(9, 6, 7, 7))
PULSE = '1 . 1 . 8 . 1 . 1 . 5 . 8 . 1 .'
NA = octave(['G#4 - C#5 - E5 - G#5 -', 'A5 - E5 - C#5 - E5 -', 'B5 - G#5 - E5 - G#5 -', 'F#5 - B5 - D#6 - B5 .'])
NB = octave(['C#6 - - - B5 - G#5 -', 'A5 - - - E5 - A5 -', 'G#5 - B5 - E6 - B5 -', 'D#6 - B5 - F#5 - D#5 .'])
NCH = ['1', '6', '3', '7']
NIGHT = dict(bass=PULSE, bgrid=1)
bars(S, 16, NCH, None, drums='heavy', upper='arp', **NIGHT)
bars(S, 16, NCH, NA, li='BRASS', drums='heavy', upper='pad', **NIGHT)
bars(S, 16, NCH, NB, li='BRASS', drums='drive', upper='arp1', **NIGHT)
bars(S, 16, NCH, NA, li='SOLO', drums='drive', upper='arp1', fill=[0, 0, 0, 1], **NIGHT)
S.finish()

# --- 4 The podium: 128 bpm, C major, proud -----------------------------------------------------------------------
S = a.song(Key('C', MAJOR), 7, echo=(6, 5, 6, 9))
P1 = octave(['C5 - E5 - G5 - C6 -', 'A5 - F5 - A5 - C6 -', 'B5 - G5 - D5 - G5 -', 'C6 - - - E6 - - -'])
P2 = octave(['E6 - C6 - A5 - C6 -', 'C6 - A5 - F5 - A5 -', 'D6 - B5 - G5 - B5 -', 'C6 - E6 - G6 - - .'])
bars(S, 16, ['1', '4', '5', '1'], P1, li='SOFTHORN', drums='basic', bass='1 - 5 - 1 - 5 -', upper='arp')
bars(S, 16, ['6', '4', '5', '1'], P2, li='SOLO', drums='basic', bass='1 - 5 - 1 - 5 -', upper='arp1')
S.finish()

# --- SFX (channel 7 for the effects, 6 for the engine) ------------------------------------------------------------------
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
