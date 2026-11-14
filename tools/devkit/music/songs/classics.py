"""Public domain classics arranged for the NOVA-16 sound chip, from the note text in scores/ (import_scores.py
reads it out of public domain engravings; scores/SOURCES.md has each source and its licence):

    alla_turca    Mozart, Rondo alla Turca (K. 331), bars 1 to 32       a quick level, an action scene, a rhythm game
    entertainer   Joplin, The Entertainer, bars 1 to 36                 a town, a shop, a menu
    toccata       Bach, Toccata and Fugue in D minor, bars 1 to 16      a boss, a castle, a villain's entrance
    minute_waltz  Chopin, Minute Waltz (Op. 64 No. 1), bars 1 to 36     a chase, a timer running out
    canon         Pachelbel, Canon in D, bars 1 to 24                   a title, a credits roll, a peaceful place
    jesu          Bach, Jesu, Joy of Man's Desiring (BWV 147), all      an ending, a church, a hall of heroes
    ode_to_joy    Beethoven, Ode to Joy (Symphony No. 9), by hand       a victory, a level cleared, a festival
    greensleeves  Greensleeves (traditional), by hand                   a village, a tavern, a forest, a sad scene

    python3 tools/devkit/music/songs/classics.py out/audio.json [song ...]
    python3 tools/devkit/music/songs/classics.py --list

It writes an audio.json with the songs named (by their names in --list), in that order, or every song while they all
fit. One audio.json holds at most 8 songs and 64 patterns (the console's format), so the library can grow past that and
each run picks what it needs. To use one beside a game's own songs, copy its instruments and its function into the
game's audio.py (a Medley, tools/devkit/music/medley.py). Songs use channels 0 to 6 (channel 7 holds the speed), so an
SFX on channel 6 mutes the hats while it plays.
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


def stop(piece, channels):
    """Let go, at a piece's start, of a channel it does not play (the last note of the piece before would ring on)."""
    for ch in channels: piece[0][0][ch] = piece[0][0][ch] or {'n': 'OFF'}
    return piece


std = {'lead': (0, 'LEAD', -12), 'bass': (2, 'BASS', 0), 'inner': (3, 'KEYS', -12, 11), 'tenor': (4, 'KEYS2', 0, 11)}
two4 = {0: 'KICK', 2: 'HAT', 4: 'SNARE', 6: 'HAT'}
four4 = {0: 'KICK', 4: 'HAT', 8: 'SNARE', 12: 'HAT'}
six8 = {0: 'KICK', 2: 'HAT', 4: 'HAT', 6: 'SNARE', 8: 'HAT', 10: 'HAT'}


def alla_turca():
    m.song([beat(m.piece(['alla_turca'], 6, std), 8, two4)], echo=(4, 4, 4, 9))


def entertainer():
    m.song([beat(m.piece(['entertainer'], 9, std), 8, two4, 288)], echo=(4, 3, 4, 9))


def toccata():
    m.song([m.piece(['toccata'], 7, {'lead': (0, 'ORGAN', 0, 9), 'lead@2': (1, 'ORGAN2', -12, 12), 'inner': (3, 'ORGAN2', 0),
                                     'tenor': (4, 'ORGAN2', 0), 'bass': (2, 'PEDAL', 0)})], echo=(10, 7, 7, 6))


def minute_waltz():
    waltz = {'lead': (0, 'LEAD', -12, 10), 'lead@2': (1, 'KEYS', -24, 12), 'bass': (2, 'BASS', 0), 'inner': (3, 'KEYS', -12), 'tenor': (4, 'KEYS2', 0)}
    m.song([beat(m.piece(['minute_waltz'], 3, waltz), 12, {0: 'KICK', 4: 'HAT', 8: 'HAT'}, 432)], echo=(4, 4, 4, 9))


def canon():
    """The ground bass on the triangle, the three violins (each the same tune, two bars apart) on three pulses."""
    m.song([m.piece(['canon'], 7, {'lead': (0, 'LEAD', -12), 'inner': (3, 'KEYS', -12, 13), 'tenor': (4, 'KEYS2', -12, 13), 'bass': (2, 'BASS', 0)})],
           echo=(8, 6, 6, 7))


def jesu():
    """The triplet line (and the chorale's top note where it is played as chords) on the lead in its own octave, the left
    hand's bass on the triangle, and the right hand's other notes quieter under the tune, at their own pitch."""
    m.song([m.piece(['jesu'], 13, {'lead': (0, 'LEAD', 0, 13), 'inner': (3, 'KEYS', 0, 9), 'tenor': (4, 'KEYS2', 0, 9), 'bass': (2, 'BASS', 0)})],
           echo=(8, 6, 6, 7))


def ode_to_joy():
    """Three times: plain; the variation over drums; the variation a step up (E major) and quicker."""
    plain = {'lead': (0, 'LEAD', 0), 'bass': (2, 'BASS', 0), 'inner': (3, 'KEYS', 0, 11), 'tenor': (4, 'KEYS2', 0, 11)}
    var = {'lead': (0, 'LEAD', -12), 'lead@2': (1, 'KEYS2', 0, 10), 'bass': (2, 'BASS', 0), 'inner': (3, 'KEYS', 0, 10)}
    up = {k: (ch, inst, semis + 2, *vol) for k, (ch, inst, semis, *vol) in var.items()}
    m.song([m.piece(['ode'], 7, plain), stop(beat(m.piece(['ode2'], 7, var), 16, four4), [4]),
            stop(beat(m.piece(['ode2'], 6, up), 16, four4), [4])], echo=(5, 4, 5, 8))


def greensleeves():
    """Twice: plain over a harp's eighths; then the tune doubled an octave down, over a running arpeggio and drums."""
    plain = {'lead': (0, 'LEAD', 0), 'bass': (2, 'BASS', 0), 'inner': (3, 'KEYS', 0, 11)}
    var = {'lead': (0, 'LEAD', 0), 'lead@2': (1, 'KEYS2', -12, 11), 'bass': (2, 'BASS', 0), 'inner': (3, 'KEYS', 0, 10)}
    m.song([stop(m.piece(['green'], 8, plain), [1]), beat(m.piece(['green2'], 7, var), 12, six8)], echo=(7, 5, 6, 7))


SONGS = {f.__name__: f for f in (alla_turca, entertainer, toccata, minute_waltz, canon, jesu, ode_to_joy, greensleeves)}

if __name__ == '__main__':
    args = sys.argv[1:]
    if not args or args[0] == '--list':
        for name, f in SONGS.items(): print(name)
        sys.exit(0 if args else 'usage: classics.py out/audio.json [song ...]  (--list for the names)')
    out, names = args[0], args[1:] or list(SONGS)
    unknown = [n for n in names if n not in SONGS]
    if unknown: sys.exit('no song %s (--list for the names)' % ', '.join(unknown))
    if len(names) > 8: sys.exit('an audio.json holds at most 8 songs: name the ones you want (--list)')
    for n in names: SONGS[n]()
    if len(a.patterns) > 64: sys.exit('these songs need %d patterns, more than the 64 an audio.json holds: name fewer' % len(a.patterns))
    a.write(out, songs=len(names))
    for k, n in enumerate(names): print('song %d: %s' % (k, n))
