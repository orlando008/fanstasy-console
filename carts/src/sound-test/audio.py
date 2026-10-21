# Sound Test's audio: carts/src/sound-test/audio.json, the demo of the new sound chip (docs/dev/sound-chip.md).
#   python3 carts/src/sound-test/audio.py carts/src/sound-test/audio.json
# Three songs (0 Kingdom: strings, harp, brass and flute; 1 Lullaby: electric piano, celesta and flute in a long echo;
# 2 Siege: choir, orchestra hits and brass) and an effect for every sampled instrument, in the order of the list in
# code.js (an arpeggio: C, E, G, C), then three game sounds. Written with the song toolkit (tools/devkit/music/kit.py)
# and its sampled instruments (samples.py). Songs use channels 0 to 5 and effects 6 and 7.
# After a change: node tools/devkit/music/loud.mjs carts/sound-test.nova --check.
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../../tools/devkit/music'))
from kit import *

a = Audio(chip=2)
a.sample(kick()); a.sample(snare()); a.sample(hat(0.05, 70, 3)); a.sample(hat(0.15, 22, 5))
a.instrument('KICK', 'sample', 0, 0, 15, 0, 12, sample=0, echo=2)
a.instrument('SNARE', 'sample', 0, 0, 15, 0, 10, sample=1, echo=5)
a.instrument('HAT', 'sample', 0, 0, 15, 0, 4, pan=0.25, sample=2)
a.instrument('OHAT', 'sample', 0, 0, 15, 0, 4, pan=0.25, sample=3, echo=3)

# The instruments, in the order code.js lists them (each has an audition effect below).
LIST = [('STRINGS', 'strings', 5, 0.2), ('CHOIR', 'choir', 6, -0.2), ('BRASS', 'brass', 8, -0.15), ('FLUTE', 'flute', 5, 0.1),
        ('KEYS', 'epiano', 9, 0.15), ('BASS', 'bass', 12, None), ('HARP', 'pluck', 13, 0.25), ('MARIMBA', 'marimba', 11, -0.25),
        ('BELL', 'celesta', 9, 0.3), ('HIT', 'orchhit', 10, None), ('TOM', 'tom', 11, -0.1), ('CLAP', 'clap', 11, 0.1),
        ('CRASH', 'crash', 7, 0.2)]
for name, kind, vol, pan in LIST: a.voice(name, kind, vol, pan)
a.instrument('BLIP', 'pulse25', 0, 4, 0, 2, 7, echo=6)       # game sounds: the old chip waves, now with echo
a.instrument('NOISE', 'noise', 0, 14, 0, 6, 8, echo=8)

# --- 0 Kingdom: D major, 150 bpm, loops, 16 bars (26 s) --------------------------------------------------------------------
S = a.song(Key('D', MAJOR), 6, echo=(5, 4, 5, 9))
bars(S, 16, ['1', '5', '6', '4'], None, drums='soft', bass='long', upper='pad', pi='STRINGS', counter='1 3 5 8 5 3 1 3', ci='HARP')
bars(S, 16, ['1', '5', '6', '4', '1', '5', '4', '5'],
     ['F#5 - A5 - D6 - A5 -', 'E5 - - - C#5 - E5 -', 'D5 - F#5 - B5 - A5 -', 'G5 - - - - - . -',
      'F#5 - A5 - D6 - E6 -', 'C#6 - B5 - A5 - E5 -', 'G5 - B5 - D6 - B5 -', 'A5 - - - - - . -'],
     li='BRASS', drums=['basic'] * 7 + ['basic'], fill=[False] * 7 + [True], bass='1 - - 5 - - 1 -', upper='pad', pi='STRINGS')
bars(S, 16, ['6', '4', '1', '5'],
     ['B5 - A5 - F#5 - D5 -', 'G5 - A5 - B5 - D6 -', 'A5 - F#5 - D5 - F#5 -', 'E5 - - - - - . -'],
     li='FLUTE', drums='soft', bass='1 - 5 - 1 - 5 -', counter='3 - - - 5 - - -', ci='STRINGS', upper='arp', ai='HARP')
S.finish()

# --- 1 Lullaby: F major, 112 bpm, loops, 12 bars (26 s); a long, dark echo -------------------------------------------------
S = a.song(Key('F', MAJOR), 8, echo=(12, 8, 9, 7))
bars(S, 16, ['1', '6', '4', '5'], None, drums='none', bass='long', upper='arp', ai='BELL')
bars(S, 16, ['1', '6', '4', '5', '1', '3', '4', '5'],
     ['A5 - - - C6 - A5 -', 'F5 - - - D5 - C5 -', 'D5 - F5 - Bb5 - G5 -', 'E5 - - - - - . -',
      'A5 - - - C6 - F6 -', 'E6 - - - C6 - A5 -', 'Bb5 - D6 - C6 - Bb5 -', 'G5 - - - - - . -'],
     li='FLUTE', drums='soft', bass='long', upper='pad', pi='KEYS')
S.finish()

# --- 2 Siege: D minor, 180 bpm, loops, 8 bars (11 s) -----------------------------------------------------------------------
S = a.song(Key('D', MINOR), 5, echo=(8, 6, 6, 8))
SIEGE = ['1', '6', '7', '1']
bars(S, 16, SIEGE, None, drums='heavy', bass='1 1 8 1 5 1 8 1', upper='pad', pi='CHOIR',
     counter='1 . . 1 . . 3 .', ci='HIT')
bars(S, 16, SIEGE, ['D5 - - - F5 - A5 -', 'Bb5 - - - A5 - F5 -', 'G5 - - - E5 - C5 -', 'D5 - - - - - . -'],
     li='BRASS', drums=['heavy'] * 3 + ['heavy'], fill=[False] * 3 + [True], bass='1 1 8 1 5 1 8 1', upper='pad', pi='CHOIR',
     counter='1 . . 1 . . 3 .', ci='HIT')
S.finish()

# --- Effects: an audition for each instrument in LIST (0-12), then 13 a coin, 14 a jump, 15 an explosion ---------------------
for name, kind, vol, pan in LIST:
    low = name == 'BASS'
    a.effect(8, ['C-3', 'E-3', 'G-3', 'C-4', None, None, 'OFF'] if low else ['C-5', 'E-5', 'G-5', 'C-6', None, None, 'OFF'], name)
a.effect(3, ['B-5', 'E-6', None, None, 'OFF'], 'BELL')
a.effect(1, ['C-5', 'D-5', 'E-5', 'G-5', 'C-6', 'OFF'], 'BLIP')
a.effect_rows(4, [{'n': 'C-3', 'i': a.I['NOISE']}, None, None, None, None, None, {'n': 'OFF'}])

a.write(sys.argv[1], songs=3)
