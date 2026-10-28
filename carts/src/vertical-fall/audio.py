# Vertical Fall's audio: carts/src/vertical-fall/audio.json.
#   python3 carts/src/vertical-fall/audio.py carts/src/vertical-fall/audio.json
# Eight songs (0 the title, 1 to 4 the areas, 5 the side rooms, 6 the upgrade room, 7 the game over's sting) and the
# effects numbered as SFX in code.js. Written with the song
# toolkit (tools/devkit/music/kit.py; its header explains the bar() arguments). Rules (playbook section 5):
# leads are quiet, with no vibrato; songs use channels 0 to 5 and effects 6 and 7 (code.js takes turns); the drums are
# samples on channel 5. The new sound chip (SPEC 5): sampled instruments from samples.py (a.voice) and an echo per song.
# After a change: node tools/devkit/music/loud.mjs carts/vertical-fall.nova --check (levels; the lead alone must stay at most
# 0.07 RMS and 0.75 of the mix) and python3 tools/devkit/music/clash.py on the json.
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../../tools/devkit/music'))
from kit import *

a = Audio(chip=2)

# --- Chip voices only (the kickoff's choice): pulse, triangle, saw and noise, with the new chip's echo. The drums are the
# noise channel at three pitches (tune_drums): a low thud for the kick, a hiss for the snare, the short metallic noise for
# the hats. Leads: a 50 % square (the softest pulse) or the triangle, in octave 4, quiet (playbook section 5: no vibrato,
# and pulse leads pierce, so the bass and the arpeggios carry the drive). ---
a.instrument('LEAD', 'pulse50', 1, 12, 7, 6, 5, pan=-0.15, echo=5)
a.instrument('TRI', 'triangle', 2, 16, 10, 10, 10, pan=-0.1, echo=6)        # a softer lead: the title, the Deep, the rooms
a.instrument('BASS', 'saw', 0, 6, 9, 3, 6)                                  # gritty
a.instrument('SUB', 'triangle', 0, 4, 13, 4, 12)                            # a round bass (the rooms, the Deep)
a.instrument('ARP', 'pulse25', 0, 4, 3, 2, 4, pan=0.25, echo=4)
a.instrument('PAD', 'pulse50', 10, 30, 6, 20, 3, pan=0.2, echo=7)
a.instrument('COUNTER', 'pulse12', 0, 8, 5, 6, 3, pan=0.3, echo=6)
a.instrument('KICK', 'noise', 0, 3, 0, 0, 13)
a.instrument('SNARE', 'noise', 0, 6, 0, 0, 10, echo=3)
a.instrument('HAT', 'noise-short', 0, 2, 0, 0, 5, pan=0.25)
a.instrument('OHAT', 'noise-short', 0, 7, 0, 2, 4, pan=0.25)
a.instrument('BLIP', 'pulse12', 0, 3, 0, 0, 8)                 # effects from here on
a.instrument('CHIME', 'pulse50', 0, 6, 5, 6, 9)
a.instrument('THUD', 'pulse50', 0, 4, 0, 0, 11)
a.instrument('CRUNCH', 'noise', 0, 8, 3, 6, 9)
a.instrument('FANFARE', 'pulse25', 0, 6, 11, 6, 8)
a.instrument('PEW', 'pulse25', 0, 4, 0, 0, 5)                   # the gunboots: short and quiet, it is heard a lot
a.instrument('TICK', 'noise-short', 0, 2, 0, 0, 9)
a.instrument('GLINT', 'pulse12', 0, 5, 0, 0, 4)                 # a gem: tiny and high, it is heard a lot

def tune_drums(song):
    """bar() writes every drum on C-4; on the noise channel the pitch is the noise's colour: the kick low, the snare in the
    middle, the hats high."""
    pitch_of = {a.I['KICK']: 'C-2', a.I['SNARE']: 'G-4', a.I['HAT']: 'C-7', a.I['OHAT']: 'A-6'}
    for row in song.rows:
        for c in row:
            if c and c.get('i') in pitch_of: c['n'] = pitch_of[c['i']]

def done(S, loop=0):
    tune_drums(S); S.finish(loop)

# --- 0 The title: A minor, 112 bpm, slow and ominous. The pad and the bass first; the triangle's tune after. ---
S = a.song(Key('A', MINOR), 8, echo=(8, 6, 7, 8))
CH = ['1', '6', '4', '5+']
bars(S, 16, CH, None, bass='long', bi='SUB', upper='pad')
bars(S, 16, CH, ['E4 - - - A4 - G4 -', 'F4 - - - E4 - C4 -', 'D4 - F4 - A4 - G4 -', 'G#4 - - - - - . -'], li='TRI', bass='long', bi='SUB', upper='pad', drums='soft')
done(S)

# --- 1 The Shaft: E minor, 150 bpm, driving: the saw bass in eighths and the arpeggio first, then the square's tune. ---
S = a.song(Key('E', MINOR), 6, echo=(4, 4, 5, 9))
CH = ['1', '1', '6', '7']
CH2 = ['1', '4', '6', '5+']
B8 = '1 1 8 1 1 8 5 8'
bars(S, 16, CH, None, drums='drive', bass=B8, upper='arp1')
bars(S, 16, CH, ['E4 - G4 - B4 - - A4', 'G4 - - - F#4 - E4 -', 'C4 - E4 - G4 - - F#4', 'D4 - - - - - . -'], lv=12, drums='drive', bass=B8, upper='arp1')
bars(S, 16, CH2, ['E4 - - B3 E4 - G4 -', 'A4 - - G4 F#4 - E4 -', 'C4 - D4 - E4 - G4 -', 'F#4 - - - D#4 - . -'], lv=12, drums='heavy', bass=B8, upper='arp1')
bars(S, 16, CH, None, drums='basic', bass=B8, upper='arp', counter='1 - 5 - 8 - 5 -', cbase=60)
done(S)

# --- 2 The Ossuary: D minor, 128 bpm, a heavy march. ---
S = a.song(Key('D', MINOR), 7, echo=(6, 5, 5, 8))
CH = ['1', '6', '7', '1']
BM = '1 - 1 5 1 - 1 5'
bars(S, 16, CH, None, drums='march', bass=BM, upper='arp')
bars(S, 16, CH, ['D4 - - - F4 - E4 D4', 'F4 - - - Bb4 - G4 F4', 'E4 - C4 - E4 - G4 -', 'F4 - E4 - D4 - . -'], lv=12, drums='march', bass=BM, upper='arp')
bars(S, 16, ['4', '1', '5+', '1'], ['G4 - - - A4 - Bb4 -', 'A4 - F4 - D4 - - -', 'E4 - - - C#4 - E4 -', 'D4 - - - - - . -'], lv=12, drums='heavy', bass=BM, upper='arp1')
done(S)

# --- 3 The Cistern: C minor, 112 bpm, dripping: plucked arpeggios in a long echo, soft drums. ---
S = a.song(Key('C', MINOR), 8, echo=(12, 9, 8, 6))
CH = ['1', '4', '6', '5']
bars(S, 16, CH, None, drums='soft', bass='1 - - - 5 - - -', bi='SUB', upper='arp')
bars(S, 16, CH, ['G4 - - - Eb4 - - -', 'F4 - - - C4 - - -', 'Ab4 - G4 - Eb4 - - -', 'D4 - - - - - . -'], li='TRI', lv=8, drums='soft', bass='1 - - - 5 - - -', bi='SUB', upper='arp')
done(S)

# --- 4 The Deep: B flat minor, 100 bpm, sparse and low: a held bass, a pad on a flat second, few notes. ---
S = a.song(Key('Bb', MINOR), 9, echo=(10, 7, 7, 5))
CH = ['1', 'B', '1', '5+']   # B: a major chord on the flat second (C flat), meant to unsettle
bars(S, 16, CH, None, bass='long', bi='SUB', upper='pad', drums='none')
bars(S, 16, CH, ['F4 - - - - - Gb4 -', 'F4 - - - . - - -', 'Db4 - - - C4 - Bb3 -', 'A3 - - - - - . -'], li='TRI', bass='long', bi='SUB', upper='pad', drums='none')
done(S)

# --- 5 Side rooms (time stands still; the shop): F major, 90 bpm, calm and muffled: a round bass, a slow arpeggio. ---
S = a.song(Key('F', MAJOR), 10, echo=(6, 4, 6, 5))
bars(S, 16, ['1', '6', '4', '5'], None, bass='long', bi='SUB', upper='arp')
done(S)

# --- 6 The upgrade room: C major, 128 bpm, short and hopeful. ---
S = a.song(Key('C', MAJOR), 7, echo=(5, 4, 5, 8))
bars(S, 16, ['1', '4', '6', '5'], ['E4 - G4 - C5 - - -', 'A4 - - - F4 - - -', 'A4 - C5 - E4 - - -', 'D4 - - - G4 - . -'], li='TRI', bass='1 - 5 - 1 - 5 -', bi='SUB', upper='arp')
done(S)

# --- 7 Game over: a sting in A minor, played once, then silence. ---
S = a.song(Key('A', MINOR), 6, echo=(8, 6, 7, 8))
bars(S, 16, ['1', '6', '4', '1'], ['E4 - D4 - C4 - B3 -', 'A3 - - - - - . -', '. - - - - - - -', '. - - - - - - -'], li='TRI',
     bass=['1 - - - - - - -', '1 - - - - - . -', '. - - - - - - -', '. - - - - - - -'], bi='SUB')
done(S, loop=None)

# --- Effects: the order is the SFX table in code.js ---
a.effect(1, ['E-6', 'OFF'], 'BLIP')                                # 0 menu move
a.effect(2, ['C-6', 'G-6', 'OFF'], 'CHIME')                        # 1 select
a.effect(2, ['E-5', 'B-5', 'OFF'], 'CHIME')                        # 2 pause
a.effect(3, ['C-4', 'G-3', 'D-3', 'A-2', 'OFF'], 'CRUNCH')         # 3 a hit (noise)
a.effect(2, ['C-5', 'G-4', 'D-4', 'A-3', 'E-3', 'C-3', 'A-2', 'OFF'], 'CRUNCH')    # 4 the faller's last hit: a long crunch down (the game over's song follows)
a.effect(4, ['A-5', None, 'OFF', None, 'A-5', None, 'OFF'], 'BLIP')  # 5 down to the last hit point: two warning beeps
a.effect(4, ['C-5', 'E-5', 'G-5', 'C-6', None, 'G-5', 'C-6', 'OFF'], 'FANFARE')  # 6 a record
a.effect(1, ['A-4', 'E-5', 'OFF'], 'BLIP')                         # 7 jump
a.effect(1, ['C-6', 'F-5', 'C-5', 'OFF'], 'PEW')                   # 8 a gunboot shot
a.effect(1, ['A-2', 'OFF'], 'THUD')                                # 9 land
a.effect(1, ['C-2', 'OFF'], 'TICK')                                # 10 out of ammo: a click
a.effect(3, ['C-5', 'E-5', 'G-5', 'C-6', 'OFF'], 'CHIME')          # 11 a level's floor
a.effect(1, ['G-3', 'C-4', 'G-4', 'OFF'], 'THUD')                  # 12 a stomp
a.effect(2, ['C-4', 'A-3', 'E-3', 'C-3', 'OFF'], 'CRUNCH')         # 13 an enemy dies
a.effect(2, ['F-3', 'C-3', 'G-2', 'OFF'], 'CRUNCH')                # 14 a block breaks
a.effect(1, ['E-6', 'OFF'], 'GLINT')                               # 15 a small gem
a.effect(1, ['B-5', 'E-6', 'OFF'], 'GLINT')                        # 16 a large gem
a.effect(2, ['C-5', 'G-5', 'C-6', 'E-6', 'G-6', 'OFF'], 'CHIME')   # 17 gem high
a.effect(3, ['G-4', 'C-5', 'E-5', 'G-5', 'C-6', 'OFF'], 'FANFARE') # 18 a combo pays
a.effect(1, ['A-4', 'OFF'], 'TICK')                                # 19 a hit that does not kill (an enemy, a gem block)
a.effect(3, ['C-3', 'G-3', 'C-4', 'OFF'], 'CHIME')                 # 20 a door to a side room (in or out)
a.effect(2, ['E-5', 'A-5', 'C#6', 'OFF'], 'CHIME')                 # 21 a buy
a.effect(3, ['C-5', 'E-5', 'G-5', 'B-5', 'D-6', 'OFF'], 'FANFARE') # 22 an upgrade or a gun module taken
a.effect(1, ['E-6', 'G-6', 'E-6', 'B-6', 'OFF'], 'GLINT')          # 23 a cache of gems
a.effect(2, ['C-3', 'B-2', 'OFF'], 'THUD')                         # 24 not enough gems
a.effect(1, ['C-7', 'G-6', 'C-6', 'G-5', 'C-5', 'OFF'], 'PEW')     # 25 the laser
a.effect(1, ['A-2', 'E-2', 'OFF'], 'CRUNCH')                       # 26 the puncher

a.write(sys.argv[1], songs=8)
