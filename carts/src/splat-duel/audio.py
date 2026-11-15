# Splat Duel's audio: carts/src/splat-duel/audio.json.
#   python3 carts/src/splat-duel/audio.py carts/src/splat-duel/audio.json
# Songs: 0 the game (this script's own), 1 the title (the library's Entertainer), 2 the victory (the library's Ode to
# Joy); SONG in code.js. Effects in the order of SFX in code.js. Written with the song toolkit
# (tools/devkit/music/kit.py; its header explains the bar() arguments). Rules (playbook section 5): leads quiet and
# without vibrato, in octave 4 to 5; songs on channels 0 to 6 and effects on 6 and 7 (code.js takes turns).
# After a change: node tools/devkit/music/loud.mjs carts/splat-duel.nova --check, python3 tools/devkit/music/clash.py
# carts/src/splat-duel/audio.json, and node tools/devkit/music/sfx.mjs carts/splat-duel.nova 7 for the effects.
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../../tools/devkit/music'))
from kit import *

a = Audio(chip=2)
a.sample(kick()); a.sample(snare()); a.sample(hat(0.05, 70, 3)); a.sample(hat(0.15, 22, 5))

# The game song's band: the tune on a soft flute doubled by a marimba (the flute gives it body, the marimba its
# attack: a marimba alone decays too fast to lead, 0.019 RMS at full volume), a plucked arpeggio, a bass, strings in the
# middle section, and soft drums. Calm and cheerful: the players are thinking between shots, so nothing in it insists.
a.voice('FLT', 'flute', 5, -0.1, vib=(0, 0))
a.voice('MAR', 'marimba', 11, 0.1)
a.voice('PLK', 'pluck', 5, 0.3)
a.voice('BASS', 'bass', 14)
a.voice('PAD', 'strings', 5, 0.15)
a.instrument('HAT', 'sample', 0, 0, 15, 0, 3, pan=0.25, sample=2)
a.instrument('OHAT', 'sample', 0, 0, 15, 0, 3, pan=0.25, sample=3)
a.instrument('KICK', 'sample', 0, 0, 15, 0, 12, sample=0, echo=2)
a.instrument('SNARE', 'sample', 0, 0, 15, 0, 8, sample=1, echo=5)

# Effects' own voices: chip blips for the menus, noise for the paint, sampled bells and a marimba for the moments that
# matter (a power-up revealed, collected, the pad ready to pass).
a.instrument('BLIP', 'pulse12', 0, 3, 0, 0, 7)
a.instrument('CHIME', 'pulse50', 0, 6, 5, 6, 8)
a.instrument('THUD', 'pulse50', 0, 4, 0, 0, 9)
a.instrument('FANFARE', 'pulse25', 0, 6, 11, 6, 8)
a.instrument('POP', 'noise', 0, 5, 0, 0, 10)
a.instrument('SQUISH', 'noise', 1, 9, 0, 6, 7)
a.instrument('TWANG', 'pulse25', 0, 5, 0, 0, 8)
a.voice('FXCEL', 'celesta', 15, 0.0)
a.voice('FXMAR', 'marimba', 15, 0.0)

# --- 0 The game: G major, 100 bpm (16 rows a bar at speed 9), 36 bars, about 86 s before it loops ---
S = a.song(Key('G', MAJOR), 9, echo=(5, 4, 5, 9))
# Intro: the counter-line, bass and drums before the tune, so the tune does not arrive with a jump.
bars(S, 16, ['1', '6', '4', '5'], None, upper='arp', ai='PLK', bass='1 - 5 - 1 - 5 -', bi='BASS', drums='soft')
A = ['G4 - B4 D5 - - B4 -', 'E4 - G4 B4 - - G4 -', 'C5 - B4 A4 G4 - E4 -', 'F#4 - A4 - D5 - - .',
     'G4 - B4 D5 - - G5 -', 'E5 - D5 B4 - - G4 -', 'A4 - C5 B4 A4 - G4 -', 'F#4 - G4 A4 - - - .']
A2 = A[:6] + ['A4 - C5 - B4 - A4 -', 'G4 - - - - - - .']
# A: the tune twice, the second time home to G.
bars(S, 16, ['1', '6', '4', '5', '1', '6', '2', '5'], A, li='FLT', counter=A, ci='MAR', upper='arp', ai='PLK', bass='1 - 5 - 1 - 5 -', bi='BASS', drums='soft')
bars(S, 16, ['1', '6', '4', '5', '1', '6', '5', '1'], A2, li='FLT', counter=A2, ci='MAR', upper='arp', ai='PLK', bass='1 - 5 - 1 - 5 -', bi='BASS', drums='soft')
# B: the middle, longer notes over held strings, lifting to the dominant.
B = ['E5 - - - D5 - C5 -', 'D5 - - - A4 - - -', 'D5 - - - B4 - F#4 -', 'G4 - - - B4 - - -',
     'C5 - - - E5 - - -', 'D5 - - - B4 - A4 -', 'B4 - - - G4 - E4 -', 'F#4 - - - A4 - - .']
bars(S, 16, ['4', '5', '3', '6', '4', '5', '6', '5'], B, li='FLT', counter=B, ci='MAR', upper='pad', bass='1 - - - 5 - - -', bi='BASS', drums='kick')
# A once more, home.
bars(S, 16, ['1', '6', '4', '5', '1', '6', '5', '1'], A2, li='FLT', counter=A2, ci='MAR', upper='arp', ai='PLK', bass='1 - 5 - 1 - 5 -', bi='BASS', drums='soft')
S.finish()

# --- Effects: the order is the SFX table in code.js ---
I = a.I
a.effect(2, ['E-6', 'OFF'], 'BLIP')                                # 0 menu move
a.effect(2, ['C-6', 'G-6', 'OFF'], 'CHIME')                        # 1 select
a.effect(2, ['E-5', 'B-5', 'OFF'], 'CHIME')                        # 2 pause
a.effect_rows(2, [cell('G-5', I['FXMAR'], 8), {'n': 'OFF'}])       # 3 an aiming step: a soft wooden tick (it repeats while held)
a.effect(1, ['G-3', 'D-4', 'A-4', 'E-5', 'OFF'], 'TWANG')          # 4 the slingshot lets go
a.effect_rows(2, [cell('C-5', I['POP']), cell('G-4', I['POP']), cell('C-3', I['POP'], 12), cell('A-2', I['POP'], 9), {'n': 'OFF'}])  # 5 a splat on a wall: a pop, then a low thud (noise: one voice an effect)
a.effect(2, ['G-3', 'D-3', 'OFF'], 'SQUISH')                       # 6 a splat on the ground
a.effect_rows(2, [cell('E-6', I['FXCEL'], 12), cell('G#6', I['FXCEL'], 13), cell('B-6', I['FXCEL'], 14), cell('E-7', I['FXCEL']),
                  None, None, None, {'n': 'OFF'}])                 # 7 a power-up revealed: a rising sparkle of bells
a.effect_rows(2, [cell('C-5', I['FXMAR']), cell('E-5', I['FXMAR']), cell('G-5', I['FXMAR']), cell('C-6', I['FXMAR']),
                  cell('E-6', I['FXCEL'], 12), None, cell('G-6', I['FXCEL'], 10), None, None, {'n': 'OFF'}])  # 8 a power-up collected
a.effect_rows(4, [cell('G-5', I['FXCEL'], 8), cell('C-6', I['FXCEL'], 9), None, None, {'n': 'OFF'}])  # 9 the handoff is ready for a press
a.effect(2, ['C-4', 'D-4', 'E-4', 'F-4', 'G-4', 'OFF'], 'SQUISH')  # 10 the paint roller
a.effect(3, ['A-4', 'F-4', 'D-4', 'OFF'], 'SQUISH')                # 11 the sponge
a.effect(5, ['C-5', 'E-5', 'G-5', 'C-6', None, 'G-5', 'C-6', 'OFF'], 'FANFARE')  # 12 a win
a.effect(2, ['C-4', 'OFF'], 'THUD')                                # 13 an aiming step at the limit

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../../tools/devkit/music/songs'))
from library import add
TITLE = add(a, 'entertainer')       # 1: SONG.title in code.js
WIN = add(a, 'ode_to_joy')          # 2: SONG.win
assert (TITLE, WIN) == (1, 2), (TITLE, WIN)
# The library's songs are about 0.085 RMS, the game's about 0.05: this cart's copies of their instruments are 30%
# softer, so moving from the title to the game and on to the victory does not jump in loudness.
for name, i in a.I.items():
    if name.startswith('L.'): a.instruments[i]['vol'] = max(1, round(a.instruments[i]['vol'] * 0.7))
a.write(sys.argv[1], songs=3)
