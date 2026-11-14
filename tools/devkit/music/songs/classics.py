"""Five public domain classics arranged for the NOVA-16 sound chip, from the note text in scores/ (import_scores.py
reads it out of public domain engravings; scores/SOURCES.md has each source and its licence):

    song 0  Mozart, Rondo alla Turca (K. 331), bars 1 to 32       a quick level, an action scene, a rhythm game
    song 1  Joplin, The Entertainer, bars 1 to 36                 a town, a shop, a menu
    song 2  Bach, Toccata and Fugue in D minor, bars 1 to 16      a boss, a castle, a villain's entrance
    song 3  Chopin, Minute Waltz (Op. 64 No. 1), bars 1 to 36     a chase, a timer running out
    song 4  Pachelbel, Canon in D, bars 1 to 24                   a title, a credits roll, a peaceful place

    python3 tools/devkit/music/songs/classics.py carts/src/<name>/audio.json

It writes a whole audio.json with these five songs. To use one beside a cart's own songs, copy its instruments and its
piece() into the cart's audio.py (a Medley, tools/devkit/music/medley.py). Songs use channels 0 to 6 (channel 7 holds
the speed), so an SFX on channel 6 mutes the hats while it plays.
"""
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
from kit import *
from medley import Medley

HERE = os.path.dirname(os.path.abspath(__file__))
a = Audio()
a.instrument('LEAD', 'pulse50', 0, 12, 9, 4, 5, pan=-0.1, echo=3)
a.instrument('KEYS', 'pulse12', 0, 14, 6, 4, 4, pan=0.25, echo=4)
a.instrument('KEYS2', 'pulse12', 0, 14, 6, 4, 3, pan=-0.25, echo=4)
a.instrument('BASS', 'triangle', 0, 20, 10, 3, 13)
a.instrument('ORGAN', 'pulse50', 1, 0, 15, 8, 5, pan=-0.1, echo=8)
a.instrument('ORGAN2', 'saw', 1, 0, 15, 8, 3, pan=0.2, echo=8)
a.instrument('PEDAL', 'triangle', 1, 0, 15, 8, 13, echo=4)
a.instrument('KICK', 'sample', 0, 0, 15, 0, 12, sample=a.sample(kick()))
a.instrument('SNARE', 'sample', 0, 0, 15, 0, 9, sample=a.sample(snare()))
a.instrument('HAT', 'noise-short', 0, 3, 0, 1, 3)
m = Medley(a, os.path.join(HERE, 'scores'))


def beat(piece, bar, hits, until=None):
    """Drums on channels 5 and 6: hits {row in the bar: instrument}, every bar, to the end of the notes (`until` rows)."""
    rows, speeds = piece
    for r in range(0, until or len(rows), bar):
        for k, inst in hits.items():
            rows[r + k][5 if inst != 'HAT' else 6] = cell(48 if inst != 'HAT' else 72, a.I[inst])
    return piece


std = {'lead': (0, 'LEAD', -12), 'bass': (2, 'BASS', 0), 'inner': (3, 'KEYS', -12, 11), 'tenor': (4, 'KEYS2', 0, 11)}
two4 = {0: 'KICK', 2: 'HAT', 4: 'SNARE', 6: 'HAT'}
m.song([beat(m.piece(['alla_turca'], 6, std), 8, two4)], echo=(4, 4, 4, 9))
m.song([beat(m.piece(['entertainer'], 9, std), 8, two4, 288)], echo=(4, 3, 4, 9))
m.song([m.piece(['toccata'], 7, {'lead': (0, 'ORGAN', 0, 9), 'lead@2': (1, 'ORGAN2', -12, 12), 'inner': (3, 'ORGAN2', 0), 'tenor': (4, 'ORGAN2', 0), 'bass': (2, 'PEDAL', 0)})],
       echo=(10, 7, 7, 6))
waltz = {'lead': (0, 'LEAD', -12, 10), 'lead@2': (1, 'KEYS', -24, 12), 'bass': (2, 'BASS', 0), 'inner': (3, 'KEYS', -12), 'tenor': (4, 'KEYS2', 0)}
m.song([beat(m.piece(['minute_waltz'], 3, waltz), 12, {0: 'KICK', 4: 'HAT', 8: 'HAT'}, 432)], echo=(4, 4, 4, 9))
# The Canon: the ground bass on the triangle, the three violins (each the same tune, two bars apart) on three pulses.
m.song([m.piece(['canon'], 7, {'lead': (0, 'LEAD', -12), 'inner': (3, 'KEYS', -12, 13), 'tenor': (4, 'KEYS2', -12, 13), 'bass': (2, 'BASS', 0)})],
       echo=(8, 6, 6, 7))
a.write(sys.argv[1], songs=5)
