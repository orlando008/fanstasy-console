# The Ivory Tower's audio: carts/src/ivory-tower/audio.json.
#   python3 carts/src/ivory-tower/audio.py carts/src/ivory-tower/audio.json
# Four songs (0 the title; 1, 2 and 3 the climb, each adding a layer: floors 0-19, 20-39, 40 and up) and the effects numbered as SFX in code.js. Written with the song
# toolkit (tools/devkit/music/kit.py; its header explains the bar() arguments). Rules (playbook section 5):
# leads are quiet, with no vibrato; songs use channels 0 to 5 and effects 6 and 7 (code.js takes turns); the drums are
# samples on channel 5. The new sound chip (SPEC 5): sampled instruments from samples.py (a.voice) and an echo per song.
# After a change: node tools/devkit/music/loud.mjs carts/ivory-tower.nova --check (levels; the lead alone must stay at most
# 0.07 RMS and 0.75 of the mix) and python3 tools/devkit/music/clash.py on the json.
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../../tools/devkit/music'))
from kit import *

a = Audio(chip=2)
a.sample(kick()); a.sample(snare()); a.sample(hat(0.05, 70, 3))

# D major, 90 bpm: grand and calm. The climb is one tune on one chord round (I V vi iii IV I IV V, twice, 16 bars); each song adds a layer to the last
# (code.js switches at a landmark, starting the new song from its first bar): 1 piano and strings, 2 a flute takes the tune and a light pulse
# comes in, 3 a choir replaces the strings and the bass goes down an octave.
a.voice('PIANO', 'epiano', 6, -0.1)                              # the tune in song 1, the title's arpeggio
a.voice('KEYS', 'epiano', 4, 0.25)                               # the arpeggio under the tune
a.voice('FLUTE', 'flute', 5, -0.15)
a.voice('PAD', 'strings', 5, 0.2)
a.voice('CHOIR', 'choir', 5, 0.2)
a.voice('BASS', 'bass', 12)
a.voice('BELL', 'celesta', 5, -0.1)                               # the title's tune
a.instrument('KICK', 'sample', 0, 0, 15, 0, 8, sample=0, echo=2)
a.instrument('SNARE', 'sample', 0, 0, 15, 0, 6, sample=1, echo=5)
a.instrument('HAT', 'sample', 0, 0, 15, 0, 3, pan=0.25, sample=2)
a.voice('CEL', 'celesta', 7)                                      # effects from here on
a.voice('CELQ', 'celesta', 6)
a.voice('MAR', 'marimba', 10)
a.voice('TOM', 'tom', 9)
a.voice('TOMQ', 'tom', 9)
a.voice('SWELL', 'strings', 5, a=8, r=30)
a.instrument('SWISH', 'noise', 0, 5, 0, 6, 5, pan=0.3)

CH = ['1', '5', '6', '3', '4', '1', '4', '5']
TUNE1 = ['A4 - - - F#4 - A4 -', 'E4 - - - A4 - C#5 -', 'D5 - - - B4 - D5 -', 'C#5 - - - A4 - C#5 -',
         'B4 - - - D5 - B4 -', 'A4 - - - D5 - F#5 -', 'G5 - - - D5 - B4 -', 'A4 - - - E5 - C#5 -']
TUNE2 = ['F#5 - E5 - D5 - A4 -', 'C#5 - E5 - A4 - E4 -', 'D5 - B4 - D5 - F#5 -', 'C#5 - F#5 - A5 - F#5 -',
         'G5 - B4 - D5 - B4 -', 'F#5 - D5 - A4 - D5 -', 'B4 - D5 - G5 - D5 -', 'E5 - C#5 - A4 - - .']
ARP = "1 3 5 8 5 3 1 3"      # the piano's arpeggio, in octave 3 (cbase 36), a chord tone every eighth note

def climb(tune_inst, pad, drums, bass, key_vol=None):
    S = a.song(Key('D', MAJOR), 10, echo=(5, 4, 5, 9))
    for tune in (TUNE1, TUNE2):
        bars(S, 16, CH, tune, li=tune_inst, counter=ARP, ci='KEYS', cbase=36, upper='pad', pi=pad, drums=drums, bass=bass)
    S.finish()

# --- 0 The title: the piano's arpeggio and the strings under it; the bells take the tune for the second half ---
S = a.song(Key('D', MAJOR), 10, echo=(6, 5, 6, 9))
bars(S, 16, CH, None, counter=ARP, ci='KEYS', cbase=36, upper='pad', pi='PAD', bass='long')
bars(S, 16, CH, TUNE1, li='BELL', counter=ARP, ci='KEYS', cbase=36, upper='pad', pi='PAD', bass='long')
S.finish()
# --- 1 Floors 0 to 19: the piano and the strings ---
climb('PIANO', 'PAD', 'none', 'long')
# --- 2 Floors 20 to 39: the flute has the tune, a light pulse in the bass and the drums ---
climb('FLUTE', 'PAD', 'soft', '1 - - - 5 - - -')
# --- 3 Floors 40 and up: the choir joins the strings' place, the bass goes down an octave ---
climb('FLUTE', 'CHOIR', 'soft', '1 - 5 - 1 - 5 -')
a.transpose(-12, channels=(2,), patterns=a.songs[3]['order'])

# --- Effects: the order is the SFX table in code.js ---
a.effect(1, ['A-5', None, 'OFF'], 'CELQ')                          # 0 menu move
a.effect(2, ['D-6', 'A-6', None, 'OFF'], 'CEL')                    # 1 select
a.effect(2, ['A-5', 'D-5', None, 'OFF'], 'CELQ')                   # 2 pause
a.effect(2, ['A-3', 'E-3', 'C#3', 'G-2', 'D-2', None, 'OFF'], 'TOM')   # 3 a miss: the slab falls past and lands far below
a.effect(6, ['F#4', None, 'D-4', None, 'A-3', None, None, 'D-3', None, None, 'OFF'], 'SWELL')   # 4 game over: the strings sink
a.effect(1, ['D-6', None, 'OFF'], 'MAR')                           # 5 the count-in's tick
a.effect(3, ['D-6', 'A-6', 'D-7', None, 'OFF'], 'CEL')             # 6 a place in the top 10
a.effect(1, ['E-2', None, 'OFF'], 'TOMQ')                          # 7 a slab lands, a narrow one
a.effect(1, ['G-2', None, 'OFF'], 'TOMQ')                          # 8 a middling one
a.effect(1, ['B-2', None, 'OFF'], 'TOMQ')                          # 9 a wide one: higher
a.effect(1, ['C-6', 'C-4', 'OFF'], 'SWISH')                        # 10 the slice slides away
a.effect(4, ['A-3', None, None, None, 'E-4', None, 'OFF'], 'SWELL')   # 11 the slab grows back: a swell
a.effect(3, ['D-5', 'F#5', 'A-5', 'D-6', None, 'A-5', 'D-6', 'F#6', 'A-6', None, 'OFF'], 'CEL')   # 12 a landmark: a flourish of bells
a.effect(2, ['A-6', 'D-7', 'F#7', 'A-7', 'F#7', 'D-7', 'A-7', None, 'OFF'], 'CELQ')   # 13 a new best: a sparkle
# 14 to 33: the perfect's chime, a pentatonic ladder (D E F# A B) of 10 notes, then the same ladder an octave higher
LADDER = ['D-4', 'E-4', 'F#4', 'A-4', 'B-4', 'D-5', 'E-5', 'F#5', 'A-5', 'B-5']
for octave_up in (0, 1):
    for n in LADDER:
        note = n[:2] + str(int(n[2]) + octave_up)
        a.effect(2, [note, None, None, 'OFF'], 'CEL')

a.write(sys.argv[1], songs=4)
