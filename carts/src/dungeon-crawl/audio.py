# Dungeon Crawl Pinball's audio: carts/src/dungeon-crawl/audio.json.
#   python3 carts/src/dungeon-crawl/audio.py carts/src/dungeon-crawl/audio.json
# Five songs and the effects numbered as SFX in code.js. Written with the song toolkit (tools/devkit/music/kit.py; its header explains
# the bar() arguments). Rules (playbook section 5): leads are quiet, with no vibrato, in octave 4; songs use channels 0 to 5 and effects
# 6 and 7 (code.js takes turns); the drums are samples on channel 5. The new sound chip (SPEC 5): sampled instruments (a.voice) and an
# echo per song.
#
# Dark orchestral (the user's choice): low strings, a choir, a soft horn and deep drums, in D minor, on one motif (D, F, A, then falling
# to the A below: the way down). The music grows heavier as the player descends (SPEC 11), one song each since a song's channels cannot be
# muted from code: 0 the title (slow: the choir, a tolling bell, the motif once on the horn); 1 Levels 1 and 2 (100 bpm: strings and a
# pulse of bass, a slow drum, the motif); 2 Levels 3 and 4 (the same, heavier: the choir, a counter-melody, the drums doubled); 3 the
# Boss (150 bpm, a battle: the motif driven by the brass over heavy drums); 4 a spell (the first song with bells ringing over it).
# After a change: node tools/devkit/music/loud.mjs carts/dungeon-crawl.nova --check (levels; the lead alone at most 0.07 RMS and 0.75
# of the mix, its pierce at most 0.012) and python3 tools/devkit/music/clash.py on the json; the effects: node tools/devkit/music/sfx.mjs
# carts/dungeon-crawl.nova 6 (0.01 to 0.06 each).
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../../tools/devkit/music'))
from kit import *

a = Audio(chip=2)
a.sample(kick()); a.sample(snare()); a.sample(hat(0.05, 70, 3)); a.sample(hat(0.15, 22, 5))

# --- The voices of the songs ---
a.voice('HORN', 'brass', 6, -0.15, a=6)                 # the lead: a soft horn
a.voice('BASS', 'bass', 12)
a.voice('PAD', 'strings', 5, 0.2)                       # low strings
a.voice('CHOIR', 'choir', 5, -0.1)
a.voice('STRC', 'strings', 4, -0.3)                     # the strings' counter-melody
a.voice('BELL', 'celesta', 6, 0.3, echo=11)             # the title's toll, the spell's bells
a.instrument('HAT', 'sample', 0, 0, 15, 0, 4, pan=0.25, sample=2)
a.instrument('OHAT', 'sample', 0, 0, 15, 0, 4, pan=0.25, sample=3)
a.instrument('KICK', 'sample', 0, 0, 15, 0, 12, sample=0, echo=2)
a.instrument('SNARE', 'sample', 0, 0, 15, 0, 10, sample=1, echo=5)
# --- The voices of the effects: soft and sampled like the music ---
a.voice('TOM', 'tom', 11, 0.0)                          # thunks: the flippers, a drain, the slots
a.voice('TOMQ', 'tom', 8, 0.0)
a.voice('MAR', 'marimba', 13, -0.1)                     # the bumpers' pops, the targets
a.voice('CEL', 'celesta', 7, 0.15)                      # keys, lights, prizes
a.voice('CELQ', 'celesta', 6, 0.15)
a.voice('SWELL', 'strings', 6, 0.0, a=2, r=20)          # a ramp's whoosh, the launch
a.voice('BRASS', 'brass', 6, 0.0, a=4)                  # fanfares
a.voice('HIT', 'orchhit', 12, 0.0)                      # the spells, the Boss beaten
a.voice('GONG', 'crash', 15, 0.0)                       # the gong

CH = ['1', '6', '4', '5+']                              # D minor: Dm, Bb, Gm, A (the dominant, major)
MOTIF_A = ['D4 - - - F4 - A4 -', 'D4 - - - - - Bb3 -', 'G3 - Bb3 - D4 - G4 -', 'E4 - - - C#4 - A3 .']
MOTIF_B = ['F4 - - - A4 - D4 -', 'D4 - - - F4 - Bb4 -', 'G4 - F4 - D4 - Bb3 -', 'C#4 - - - E4 - A4 .']
DRUMS[16]['dirge'] = ('K.......s.......', '..h.....h...h...')   # slow: a kick, a soft snare on 3

# --- 0 The title: D minor, 90 bpm, the choir, a bell tolling on each bar, the motif on the horn ---
S = a.song(Key('D', MINOR), 10, echo=(12, 8, 9, 7))
bars(S, 16, CH, None, bass='long', upper='pad', pi='CHOIR', counter='1 - - - - - - -', ci='BELL')   # the choir and the bell first
bars(S, 16, CH, MOTIF_A, li='HORN', bass='long', upper='pad', pi='CHOIR', counter='1 - - - - - - -', ci='BELL')
S.finish()

# --- 1 Levels 1 and 2: 100 bpm, strings and a pulse of bass, a slow drum, the motif ---
S = a.song(Key('D', MINOR), 9, echo=(8, 6, 6, 8))
bars(S, 16, CH, None, drums='dirge', bass='1 - - 1 - - 5 -', upper='pad')
bars(S, 16, CH, MOTIF_A, li='HORN', drums='dirge', bass='1 - - 1 - - 5 -', upper='pad')
bars(S, 16, CH, MOTIF_B, li='HORN', drums='dirge', bass='1 - - 1 - - 5 -', upper='pad')
S.finish()

# --- 2 Levels 3 and 4: the same, heavier: the choir, the strings' counter-melody, the drums doubled ---
S = a.song(Key('D', MINOR), 9, echo=(8, 6, 6, 8))
bars(S, 16, CH, None, drums='basic', bass='1 - 1 - 1 - 5 -', upper='pad', pi='CHOIR', counter='1 5 8 5 1 5 8 5', ci='STRC', cbase=36)
bars(S, 16, CH, MOTIF_A, li='HORN', drums='basic', bass='1 - 1 - 1 - 5 -', upper='pad', pi='CHOIR', counter='1 5 8 5 1 5 8 5', ci='STRC', cbase=36)
bars(S, 16, CH, MOTIF_B, li='HORN', drums='basic', bass='1 - 1 - 1 - 5 -', upper='pad', pi='CHOIR', counter='1 5 8 5 1 5 8 5', ci='STRC', cbase=36)
S.finish()

# --- 3 The Boss: 150 bpm, a battle: the motif driven by the horn over heavy drums, the choir ---
S = a.song(Key('D', MINOR), 6, echo=(5, 4, 5, 9))
CHB = ['1', '7', '6', '5+']                             # Dm, C, Bb, A
BATTLE_A = ['D4 D4 F4 - A4 - D4 -', 'C4 - E4 - G4 - E4 -', 'Bb3 - D4 - F4 - D4 -', 'A3 - C#4 - E4 - A4 .']
BATTLE_B = ['F4 - D4 - A3 - D4 -', 'G4 - E4 - C4 - E4 -', 'F4 - D4 - Bb3 - D4 -', 'E4 - C#4 - A3 - - .']
bars(S, 16, CHB, BATTLE_A, li='HORN', drums='heavy', bass='1 1 1 1 5 5 8 5', upper='pad', pi='CHOIR')
bars(S, 16, CHB, BATTLE_B, li='HORN', drums='heavy', bass='1 1 1 1 5 5 8 5', upper='pad', pi='CHOIR', fill=[False, False, False, True])
S.finish()

# --- 4 A spell: the first song's chords and motif with bells ringing over them, a little brighter ---
S = a.song(Key('D', MINOR), 8, echo=(8, 6, 7, 8))
bars(S, 16, CH, MOTIF_A, li='HORN', drums='dirge', bass='1 - - 1 - - 5 -', upper='pad', counter='1 3 5 8 5 3 1 3', ci='BELL', cbase=60)
bars(S, 16, CH, MOTIF_B, li='HORN', drums='dirge', bass='1 - - 1 - - 5 -', upper='pad', counter='8 5 3 1 3 5 8 5', ci='BELL', cbase=60)
S.finish()

# --- Effects: the order is the SFX table in code.js ---
a.effect(1, ['G-5', None, 'OFF'], 'CELQ')                                   # 0 menu move
a.effect(2, ['D-6', 'A-6', None, 'OFF'], 'CEL')                             # 1 select
a.effect(2, ['A-5', 'D-5', None, 'OFF'], 'CELQ')                            # 2 pause
a.effect(1, ['D-3', None, None, 'OFF'], 'TOM')                              # 3 a flipper up: a thunk
a.effect(1, ['A-3', None, 'OFF'], 'TOMQ')                                   # 4 a flipper down: softer, higher
for note in ('D-5', 'F-5', 'A-5'):                                          # 5 6 7 the three bumpers: a D minor chord
    a.effect(1, [note, 'OFF'], 'MAR')
a.effect(1, ['F-3', 'C-3', None, 'OFF'], 'TOM')                             # 8 a slingshot
a.effect(2, ['A-5', None, None, 'OFF'], 'MAR')                              # 9 a target
a.effect(2, ['D-5', 'F-5', 'A-5', 'D-6', None, 'OFF'], 'CEL')               # 10 the four targets lit: a set
a.effect(2, ['D-4', 'A-4', 'D-5', 'A-5', None, None, 'OFF'], 'SWELL')       # 11 a ramp: a whoosh up
a.effect(2, ['G-3', 'D-3', None, None, 'OFF'], 'TOM')                       # 12 a cubby takes the ball
a.effect(1, ['A-6', 'E-6', 'A-6', 'C#7', 'E-7', None, 'OFF'], 'CEL')        # 13 a key: a jingle
a.effect(3, ['D-2', 'C#2', 'D-2', 'C-2', 'D-2', None, 'OFF'], 'TOMQ')       # 14 a gate grinds open
a.effect(2, ['D-3', 'A-2', None, 'OFF'], 'TOM')                             # 15 a slot takes the ball
a.effect(3, ['D-4', 'F-4', 'A-4', None, None, 'OFF'], 'HIT')                # 16 the x3 spell
a.effect(4, ['D-4', 'A-4', 'D-5', 'F-5', 'A-5', None, None, 'OFF'], 'HIT')  # 17 the x10 MEGA spell
a.effect(1, ['E-6', 'OFF'], 'CELQ')                                         # 18 the plunger's ratchet, at each zone
a.effect(3, ['D-4', 'A-4', 'D-5', None, None, 'OFF'], 'SWELL')              # 19 the launch
a.effect(3, ['A-4', 'D-5', 'F-5', 'A-5', None, 'OFF'], 'BRASS')             # 20 a skill shot
a.effect(4, ['D-4', 'F-4', 'A-4', 'D-5', None, 'A-4', 'D-5', None, 'OFF'], 'BRASS')   # 21 a level cleared
a.effect(6, ['D-2', 'D#2', 'E-2', 'F-2', None, None, 'OFF'], 'TOM')         # 22 the Pit Lord rises: a low roar
a.effect(2, ['A-2', 'D-2', None, 'OFF'], 'HIT')                             # 23 a hit on the Pit Lord: a jackpot
a.effect(5, ['D-4', 'A-4', 'D-5', None, 'F-5', 'A-5', 'D-6', None, None, 'OFF'], 'HIT')   # 24 the Pit Lord beaten
a.effect(6, ['A-3', 'F-3', 'D-3', 'A-2', None, 'OFF'], 'BRASS')             # 25 the Pit Lord sinks unbeaten
a.effect(2, ['D-6', 'F-6', 'A-6', 'D-7', None, 'OFF'], 'CEL')               # 26 a treasure
a.effect(2, ['D-6', 'F#6', 'A-6', 'D-7', 'F#7', 'A-7', None, 'OFF'], 'CEL') # 27 an extra ball
a.effect(2, ['A-6', 'D-7', None, 'OFF'], 'CEL')                             # 28 a ball saved
a.effect(3, ['F-3', 'D-3', 'A-2', None, 'OFF'], 'TOM')                      # 29 a ball drains
a.effect(1, ['D-6', None, 'OFF'], 'MAR')                                    # 30 a tick of the bonus count
a.effect(4, ['D-5', 'F-5', 'A-5', 'D-6', None, 'A-5', 'D-6', 'OFF'], 'CEL') # 31 a record
a.effect_rows(4, [{'n': 'D-2', 'i': a.I['TOM']}, {'n': 'G-3', 'i': a.I['GONG']}] + [None] * 5 + [{'n': 'OFF'}])   # 32 the gong: a mallet's thud, then the low ring
a.effect(2, ['D-3', 'D-5', 'A-5', None, 'OFF'], 'TOM')                      # 33 a kickback
a.effect(6, ['A-4', 'F-4', 'D-4', None, 'E-4', None, 'D-4', 'OFF'], 'BRASS')   # 34 game over

a.write(sys.argv[1], songs=5)
