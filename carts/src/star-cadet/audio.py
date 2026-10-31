# Star Cadet Pinball's audio: carts/src/star-cadet/audio.json.
#   python3 carts/src/star-cadet/audio.py carts/src/star-cadet/audio.json
# Seven songs and the effects numbered as SFX in code.js. Written with the song toolkit (tools/devkit/music/kit.py; its header
# explains the bar() arguments). Rules (playbook section 5): leads are quiet, with no vibrato; songs use channels 0 to 5 and
# effects 6 and 7 (code.js takes turns); the drums are samples on channel 5. The new sound chip (SPEC 5): sampled instruments
# from samples.py (a.voice) and an echo per song.
#
# The music follows the game (SPEC 11): the title (0); the table in three layers that rise with the rank, one song each since a
# song's channels cannot be muted from code: "Deep Field", drifting in space, for a Cadet to a Pilot (1: a choir, a deep pulse of
# bass and a celesta ringing in a hall), its flute theme comes in for a Lieutenant (2), a slow half-time beat for a Commander and
# above (3); a mission is faster (4), the Admiral's multiball faster and heavier (5), the last mission has the horn over a march (6).
# After a change: node tools/devkit/music/loud.mjs carts/star-cadet.nova --check (levels; the lead alone must stay at most
# 0.07 RMS and 0.75 of the mix) and python3 tools/devkit/music/clash.py on the json; the effects: node tools/devkit/music/sfx.mjs
# carts/star-cadet.nova 6 (0.01 to 0.06 each).
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../../tools/devkit/music'))
from kit import *

a = Audio(chip=2)
a.sample(kick()); a.sample(snare()); a.sample(hat(0.05, 70, 3)); a.sample(hat(0.15, 22, 5))

# --- The voices of the songs ---
a.voice('LEAD', 'flute', 5, -0.15)
a.voice('BASS', 'bass', 12)
a.instrument('HAT', 'sample', 0, 0, 15, 0, 4, pan=0.25, sample=2)
a.instrument('OHAT', 'sample', 0, 0, 15, 0, 4, pan=0.25, sample=3)
a.voice('PAD', 'strings', 5, 0.2)
a.voice('ARP', 'pluck', 13, 0.25)
a.instrument('KICK', 'sample', 0, 0, 15, 0, 12, sample=0, echo=2)
a.instrument('SNARE', 'sample', 0, 0, 15, 0, 10, sample=1, echo=5)
a.voice('SOFTHORN', 'brass', 6, -0.15, a=6)
# --- The table's voices (Deep Field): a choir pad, a celesta that rings in the echo, a deep bass, the flute with a long tail ---
a.voice('CHOIR', 'choir', 5, 0.0)
a.voice('STAR', 'celesta', 6, 0.3, echo=11)
a.voice('DEEP', 'bass', 12, 0.0)
a.voice('SPACELEAD', 'flute', 4, -0.2, echo=9)
# --- The voices of the effects: soft and sampled like the music, never louder than 0.05 on their own ---
a.voice('TOM', 'tom', 11, 0.0)                    # the flippers' thunk, the gate, the drain
a.voice('TOMQ', 'tom', 8, 0.0)
a.voice('MAR', 'marimba', 11, -0.1)               # the bumpers' pops
a.voice('MARQ', 'marimba', 6, -0.1)
a.voice('CEL', 'celesta', 7, 0.15)                # lights, lamps, prizes
a.voice('CELQ', 'celesta', 6, 0.15)
a.voice('SWELL', 'strings', 6, 0.0, a=2, r=20)    # a ramp's whoosh, the launch
a.voice('HORN', 'brass', 6, 0.0, a=4)             # mission and rank fanfares
a.voice('HIT', 'orchhit', 12, 0.0)                 # a jackpot

# --- 0 The title: A minor, 150 bpm ---
S = a.song(Key('A', MINOR), 6, echo=(5, 4, 5, 9))
CH = ['1', '6', '3', '7']
bars(S, 16, CH, None, drums='soft', bass='long', upper='pad', counter='1 3 5 8 5 3 1 3', ci='ARP')   # the pad first, so the lead does not arrive with a jump
bars(S, 16, CH, ['A3 - C4 - E4 - A4 -', 'A4 - G4 - F4 - C4 -', 'E4 - G4 - C5 - G4 -', 'D4 - G4 - B4 - G4 -'], li='SOFTHORN', drums='drive', bass='1 - - - 5 - - -', upper='arp1')
S.finish()

# --- 1 to 3 The table: "Deep Field", E minor, 112 bpm, half time, in a hall's echo ---
# Sixteen bars: a phrase that climbs from E minor and turns, at its end, through G sharp major (a chord from outside the key, the
# lift of a film's starfield) onto B; then an answer that comes home. The celesta repeats one figure over the changing chords (an
# ostinato: the stars turning), the bass pulses in a dotted rhythm under a held choir. The layers: no lead (1), the flute (2), the beat (3).
DRUMS[16]['space'] = ('K.......S.....K.', '..h.h.h...h.h.ho')     # half time: a kick, the snare on 3, hats between, an open hat to breathe
CH = ['1', '6', '3', '7', '1', '6', 'G#', '5+',
      '6', '3', '7', '1', '6', '3', '5+', '5+']
THEME = ['E4 - - - B4 - - -', 'G4 - - - - - E4 -', 'D5 - - - B4 - - -', 'A4 - - - - - F#4 -',
         'E4 - - - B4 - E5 -', 'D5 - - - C5 - G4 -', 'G#4 - - - C5 - D#5 -', 'D#5 - - - - - B4 .',
         'G4 - E4 - G4 - C5 -', 'B4 - - - D5 - - -', 'A4 - F#4 - A4 - D5 -', 'B4 - - - - - - .',
         'E5 - C5 - G4 - E4 -', 'D5 - - - B4 - G4 -', 'F#4 - - - B4 - D#5 -', 'B4 - - - - - - .']
STARS = "1 5 8 3' 5' 3' 8 5"
for lead, drums in ((None, 'none'), ('SPACELEAD', 'none'), ('SPACELEAD', 'space')):
    S = a.song(Key('E', MINOR), 8, echo=(12, 8, 9, 7))
    bars(S, 16, CH, THEME if lead else None, li=lead or 'SPACELEAD', drums=drums, bass='1 - - 1 - - 1 -', bi='DEEP',
         upper='pad', pi='CHOIR', counter=STARS, ci='STAR', cbase=60)
    S.finish()

# --- 4 A mission: A minor, 150 bpm, the pulse quickens ---
S = a.song(Key('A', MINOR), 6, echo=(5, 4, 5, 9))
CH = ['1', '4', '6', '5+']
bars(S, 16, CH, ['A4 - C5 - E5 - C5 -', 'A4 - C5 - F5 - C5 -', 'A4 - C5 - F5 - C5 -', 'G#4 - B4 - E5 - B4 -'], li='SOFTHORN', drums='drive', bass='1 - 1 - 5 - 5 -', upper='arp1')
bars(S, 16, CH, ['E5 - C5 - A4 - C5 -', 'F5 - C5 - A4 - C5 -', 'F5 - C5 - A4 - C5 -', 'D5 - B4 - G#4 - B4 .'], li='SOFTHORN', drums='drive', bass='1 - 1 - 5 - 5 -', upper='arp')
S.finish()

# --- 5 The multiball: D minor, 180 bpm, heavier ---
S = a.song(Key('D', MINOR), 5, echo=(5, 4, 5, 9))
CH = ['1', '7', '6', '5+']
for lines in (['D4 - F4 - A4 - F4 -', 'D4 - G4 - C5 - G4 -', 'D4 - F4 - Bb4 - F4 -', 'C#4 - E4 - A4 - E4 -'],
              ['A4 - F4 - D4 - F4 -', 'C5 - G4 - E4 - G4 -', 'Bb4 - F4 - D4 - F4 -', 'A4 - E4 - C#4 - E4 .'],
              ['D5 - A4 - F4 - A4 -', 'C5 - G4 - E4 - C5 -', 'Bb4 - D5 - F5 - D5 -', 'E5 - A4 - C#5 - A4 -']):
    bars(S, 16, CH, lines, li='SOFTHORN', drums='heavy', bass='1 - 1 1 - 1 5 -', upper='arp1')
S.finish()

# --- 6 The last mission: E minor, 180 bpm, a march ---
S = a.song(Key('E', MINOR), 5, echo=(8, 6, 6, 8))
CH = ['1', '3', '6', '5+']
for lines in (['E4 - G4 - B4 - G4 -', 'G4 - B4 - D5 - B4 -', 'C5 - E5 - G5 - E5 -', 'B4 - D#5 - F#5 - D#5 -'],
              ['B4 - G4 - E4 - G4 -', 'D5 - B4 - G4 - B4 -', 'G5 - E5 - C5 - E5 -', 'F#5 - D#5 - B4 - D#5 .'],
              ['E5 - B4 - G4 - B4 -', 'D5 - G4 - B4 - D5 -', 'C5 - G4 - E5 - G4 -', 'B4 - F#5 - D#5 - B4 -']):
    bars(S, 16, CH, lines, li='SOFTHORN', drums='march', bass='1 - 1 - 5 - 5 -', upper='pad', counter='1 3 5 8 5 3 1 3', ci='ARP')
S.finish()

# --- Effects: the order is the SFX table in code.js ---
a.effect(1, ['G-5', None, 'OFF'], 'CELQ')                                  # 0 menu move
a.effect(2, ['C-6', 'G-6', None, 'OFF'], 'CEL')                            # 1 select
a.effect(2, ['G-5', 'C-5', None, 'OFF'], 'CELQ')                           # 2 pause
a.effect(1, ['D-3', None, None, 'OFF'], 'TOM')                             # 3 a flipper up: a thunk
a.effect(1, ['A-3', None, 'OFF'], 'TOMQ')                                  # 4 a flipper down: softer, higher
for note in ('C-6', 'E-6', 'G-6'):                                         # 5 6 7 the three bumpers: three pops, a chord apart
    a.effect(1, [note, 'OFF'], 'MAR')
a.effect(1, ['C-4', 'G-3', None, 'OFF'], 'TOM')                            # 8 a slingshot: a short, higher thunk
a.effect(2, ['E-6', None, None, 'OFF'], 'CEL')                             # 9 a standup target
a.effect(2, ['A-5', 'E-5', None, 'OFF'], 'MAR')                            # 10 a drop target
a.effect(2, ['C-5', 'E-5', 'G-5', 'C-6', None, 'OFF'], 'CEL')              # 11 the drop bank
a.effect(1, ['C-6', None, 'OFF'], 'CEL')                                   # 12 a lane's tick
a.effect(2, ['C-6', 'E-6', 'G-6', None, None, 'OFF'], 'CEL')               # 13 the three lanes: the multiplier goes up
a.effect(2, ['C-4', 'G-4', 'C-5', 'G-5', None, None, 'OFF'], 'SWELL')      # 14 a ramp: a whoosh up
a.effect(1, ['E-6', None, 'OFF'], 'MAR')                                   # 15 the spinner's tick
a.effect(2, ['G-3', 'D-3', None, None, 'OFF'], 'TOM')                      # 16 the gate swallows the ball
a.effect(2, ['D-5', 'A-5', None, 'OFF'], 'MAR')                            # 17 and spits it out
a.effect(3, ['C-4', 'G-4', 'C-5', None, None, 'OFF'], 'SWELL')             # 18 the plunger's launch
a.effect(3, ['E-3', 'C-3', 'A-2', None, 'OFF'], 'TOM')                     # 19 a ball drains
a.effect(2, ['C-6', 'G-6', 'C-7', None, 'OFF'], 'CEL')                     # 20 a ball saved
a.effect(1, ['A-2', None, 'OFF'], 'TOM')                                   # 21 a nudge
a.effect(3, ['E-5', None, 'E-5', None, 'E-5', None, 'OFF'], 'MAR')         # 22 a warning: three beeps
a.effect(4, ['C-3', 'B-2', 'A#2', 'A-2', None, None, 'OFF'], 'TOM')        # 23 a tilt
a.effect(1, ['C-6', None, 'OFF'], 'MAR')                                   # 24 a tick of the bonus count
a.effect(3, ['E-5', 'G-5', 'B-5', None, None, 'OFF'], 'HORN')              # 25 a mission starts
a.effect(5, ['C-5', 'E-5', 'G-5', 'C-6', None, 'G-5', 'C-6', 'E-6', None, None, 'OFF'], 'HORN')   # 26 a rank up: the fanfare
a.effect(4, ['E-4', 'C-4', 'A-3', None, None, 'OFF'], 'HORN')              # 27 a mission failed
a.effect(2, ['C-6', 'E-6', 'G-6', 'C-7', 'E-7', 'G-7', None, 'OFF'], 'CEL')   # 28 an extra ball
a.effect(4, ['C-5', 'E-5', 'G-5', 'C-6', None, 'G-5', 'C-6', 'OFF'], 'CEL')   # 29 a record
a.effect(6, ['G-4', 'E-4', 'C-4', None, 'D-4', None, 'C-4', 'OFF'], 'HORN')   # 30 game over
a.effect(2, ['G-5', 'C-6', None, 'OFF'], 'CEL')                            # 31 a mission lamp
a.effect(2, ['E-5', 'B-5', 'E-6', None, 'OFF'], 'SWELL')                   # 32 an orbit
a.effect(2, ['C-3', 'C-5', 'C-6', None, 'OFF'], 'TOM')                     # 33 the kickback
a.effect(3, ['C-4', None, 'C-6', 'E-6', 'G-6', 'C-7', None, 'OFF'], 'HIT')    # 34 a jackpot

a.write(sys.argv[1], songs=7)
