# Neon Drift's audio: carts/src/neon-drift/audio.json (and rom/charts.bin, the lights, from the same notes).
#   python3 carts/src/neon-drift/audio.py carts/src/neon-drift/audio.json
# Songs: 0 the title and the track list, then the tracks (tracks.py: the notes; song i + 1 is track i). Effects are numbered
# as SFX in code.js. Rules (playbook section 5): leads quiet, no vibrato, attack 0 for the parts the lights follow (a light and
# its note must arrive together); songs use channels 0 to 5, effects 6 and 7 (code.js takes turns).
# After a change: node tools/devkit/music/loud.mjs carts/neon-drift.nova --check
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../../tools/devkit/music'))
from kit import *
from tracks import *

a = Audio(chip=2)
a.sample(kick()); a.sample(snare()); a.sample(hat(0.05, 70, 3)); a.sample(hat(0.15, 22, 5))
a.instrument('KICK', 'sample', 0, 0, 15, 0, 15, sample=0, echo=1)
a.instrument('SNARE', 'sample', 0, 0, 15, 0, 9, sample=1, echo=6)
a.instrument('HAT', 'sample', 0, 0, 15, 0, 6, pan=0.25, sample=2)
a.instrument('OHAT', 'sample', 0, 0, 15, 0, 9, pan=-0.2, sample=3, echo=3)
a.voice('CLAP', 'clap', 12, 0.05)
a.voice('CRASH', 'crash', 6, 0.1)
a.voice('BASS', 'bass', 15, 0.0, d=14, s=6)
a.voice('ARP', 'pluck', 14, 0.2, echo=8)
a.voice('PAD', 'choir', 11, -0.1)
a.voice('LEAD', 'strings', 5, -0.1, a=0, r=10, echo=7)
# effects
a.voice('CEL', 'celesta', 6, 0.15)
a.voice('CELQ', 'celesta', 4, 0.15)
a.voice('MARQ', 'marimba', 5, -0.1)
a.voice('SWELL', 'strings', 6, 0.0, a=14, r=40)
a.voice('CLICK', 'marimba', 15, 0.0, d=24)

# --- Song 0: the title and the track list, a calm loop of the first track's chords ---
TITLE = Track('TITLE', 7, ('A', MINOR), EVENT_HORIZON.chords, ' '.join(EVENT_HORIZON.arp), ' '.join(EVENT_HORIZON.bass), [' '.join(l) for l in EVENT_HORIZON.lead],
              form=[('break', 4, 'Pa', (0, 0, 0)), ('break', 4, 'PaH', (0, 0, 0))], loop=0)
TITLE.song(a)
for t in TRACKS: t.song(a)

# --- Effects: the order is the SFX table in code.js ---
a.effect(1, ['G-5', None, 'OFF'], 'CELQ')                          # 0 menu move
a.effect(2, ['C-6', 'G-6', None, 'OFF'], 'CEL')                    # 1 select
a.effect(2, ['G-5', 'C-5', None, 'OFF'], 'CELQ')                   # 2 pause and resume
a.effect(2, ['A-3', None, None, 'OFF'], 'MARQ')                    # 3 a closed door
a.effect(2, ['A-5', 'C-6', None, None, 'OFF'], 'CEL')              # 4 the multiplier is x2
a.effect(2, ['A-5', 'C-6', 'E-6', None, None, 'OFF'], 'CEL')       # 5 x3 (and a track opens)
a.effect(6, ['A-4', 'C-5', 'E-5', 'A-5', None, None, None, None, 'OFF'], 'SWELL')     # 6 x4: a swell climbing a chord
a.effect(3, ['A-5', 'C-6', 'E-6', 'A-6', None, 'E-6', 'C-7', None, None, 'OFF'], 'CEL')     # 7 the end of a track, a good grade
a.effect(4, ['E-5', 'A-5', None, None, 'OFF'], 'CELQ')             # 8 the end of a track, a lower grade
a.effect(2, ['C-6', 'E-6', 'G-6', 'C-7', 'E-7', 'G-7', None, 'OFF'], 'CEL')                 # 9 a new best
a.effect(2, ['C-5', None, 'OFF'], 'CLICK')                         # 10 the calibration's tick
a.effect(2, ['A-4', None, 'OFF'], 'CELQ')                          # 11 the count-in
a.effect(2, ['E-5', 'A-5', None, 'OFF'], 'CEL')                    # 12 GO
for pc in range(12): a.effect(2, [nn(12 * 6 + pc), None, None, 'OFF'], 'CELQ')   # 13 on: a catch, at the pitch class of its note

a.write(sys.argv[1], songs=1 + len(TRACKS))
rom = os.path.join(os.path.dirname(os.path.abspath(sys.argv[1])), 'rom')
os.makedirs(rom, exist_ok=True)
open(os.path.join(rom, 'charts.bin'), 'wb').write(charts_blob(TRACKS))
