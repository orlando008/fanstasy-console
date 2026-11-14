"""The song library: ready-made songs that any game can add to its own audio (README.md is the catalogue). In a game's
audio.py, after its Audio(chip=2) and its own instruments:

    sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../../tools/devkit/music/songs'))
    from library import add
    BOSS = add(a, 'toccata')          # the song's number, for music(BOSS) in code.js

add() puts in the song's instruments (named 'L.LEAD', 'RD.BASS' and so on, so they never meet the game's own, and each
added once however many songs use it), the kick and snare samples, and its patterns, after the game's songs so far.
Songs use channels 0 to 6 and the speed on 7 (Rush D all 8), so an SFX on channel 6 mutes the hats while it plays.

From the command line, for a file of songs alone (to hear them: listen.mjs):

    python3 tools/devkit/music/songs/library.py out/audio.json [song ...]     (every song while they fit)
    python3 tools/devkit/music/songs/library.py --list

One audio.json holds at most 8 songs and 64 patterns (the console's format), so a game picks what it needs.
"""
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
from kit import *
from medley import Medley
from shared import instruments, room
import rush_d

HERE = os.path.dirname(os.path.abspath(__file__))
INSTRUMENTS = {
    'LEAD': ('pulse50', 0, 12, 9, 4, 5, {'pan': -0.1, 'echo': 3}),
    'KEYS': ('pulse12', 0, 14, 6, 4, 4, {'pan': 0.25, 'echo': 4}),
    'KEYS2': ('pulse12', 0, 14, 6, 4, 3, {'pan': -0.25, 'echo': 4}),
    'BASS': ('triangle', 0, 20, 10, 3, 13, {}),
    'ORGAN': ('pulse50', 1, 0, 15, 8, 5, {'pan': -0.1, 'echo': 8}),
    'ORGAN2': ('saw', 1, 0, 15, 8, 3, {'pan': 0.2, 'echo': 8}),
    'PEDAL': ('triangle', 1, 0, 15, 8, 13, {'echo': 4}),
    'KICK': ('sample', 0, 0, 15, 0, 12, {'sample': 'kick'}),
    'SNARE': ('sample', 0, 0, 15, 0, 9, {'sample': 'snare'}),
    'HAT': ('noise-short', 0, 3, 0, 1, 3, {}),
}
P = 'L.'   # the classics' instruments are 'L.LEAD' and so on in the game's Audio
two4 = {0: 'KICK', 2: 'HAT', 4: 'SNARE', 6: 'HAT'}
four4 = {0: 'KICK', 4: 'HAT', 8: 'SNARE', 12: 'HAT'}
six8 = {0: 'KICK', 2: 'HAT', 4: 'HAT', 6: 'SNARE', 8: 'HAT', 10: 'HAT'}


def parts(table):
    """A Medley's parts with the library's instrument names: {voice: (channel, 'LEAD', semitones[, volume])}."""
    return {v: (ch, P + inst, *rest) for v, (ch, inst, *rest) in table.items()}


def beat(a, piece, bar, hits, until=None):
    """Drums on channels 5 and 6: hits {row in the bar: instrument}, every bar, to the end of the notes (`until` rows)."""
    rows, speeds = piece
    for r in range(0, until or len(rows), bar):
        for k, inst in hits.items():
            rows[r + k][5 if inst != 'HAT' else 6] = cell(48 if inst != 'HAT' else 72, a.I[P + inst])
    return piece


def stop(piece, channels):
    """Let go, at a piece's start, of a channel it does not play (the last note of the piece before would ring on)."""
    for ch in channels: piece[0][0][ch] = piece[0][0][ch] or {'n': 'OFF'}
    return piece


STD = {'lead': (0, 'LEAD', -12), 'bass': (2, 'BASS', 0), 'inner': (3, 'KEYS', -12, 11), 'tenor': (4, 'KEYS2', 0, 11)}


def alla_turca(a, m):
    m.song([beat(a, m.piece(['alla_turca'], 6, parts(STD)), 8, two4)], echo=(4, 4, 4, 9))


def entertainer(a, m):
    m.song([beat(a, m.piece(['entertainer'], 9, parts(STD)), 8, two4, 288)], echo=(4, 3, 4, 9))


def toccata(a, m):
    m.song([m.piece(['toccata'], 7, parts({'lead': (0, 'ORGAN', 0, 9), 'lead@2': (1, 'ORGAN2', -12, 12), 'inner': (3, 'ORGAN2', 0),
                                           'tenor': (4, 'ORGAN2', 0), 'bass': (2, 'PEDAL', 0)}))], echo=(10, 7, 7, 6))


def minute_waltz(a, m):
    waltz = {'lead': (0, 'LEAD', -12, 10), 'lead@2': (1, 'KEYS', -24, 12), 'bass': (2, 'BASS', 0), 'inner': (3, 'KEYS', -12), 'tenor': (4, 'KEYS2', 0)}
    m.song([beat(a, m.piece(['minute_waltz'], 3, parts(waltz)), 12, {0: 'KICK', 4: 'HAT', 8: 'HAT'}, 432)], echo=(4, 4, 4, 9))


def canon(a, m):
    """The ground bass on the triangle, the three violins (each the same tune, two bars apart) on three pulses."""
    m.song([m.piece(['canon'], 7, parts({'lead': (0, 'LEAD', -12), 'inner': (3, 'KEYS', -12, 13), 'tenor': (4, 'KEYS2', -12, 13), 'bass': (2, 'BASS', 0)}))],
           echo=(8, 6, 6, 7))


def jesu(a, m):
    """The triplet line (and the chorale's top note where it is played as chords) on the lead in its own octave, the left
    hand's bass on the triangle, and the right hand's other notes quieter under the tune, at their own pitch."""
    m.song([m.piece(['jesu'], 13, parts({'lead': (0, 'LEAD', 0, 13), 'inner': (3, 'KEYS', 0, 9), 'tenor': (4, 'KEYS2', 0, 9), 'bass': (2, 'BASS', 0)}))],
           echo=(8, 6, 6, 7))


def ode_to_joy(a, m):
    """Three times: plain; the variation over drums; the variation a step up (E major) and quicker."""
    plain = {'lead': (0, 'LEAD', 0), 'bass': (2, 'BASS', 0), 'inner': (3, 'KEYS', 0, 11), 'tenor': (4, 'KEYS2', 0, 11)}
    var = {'lead': (0, 'LEAD', -12), 'lead@2': (1, 'KEYS2', 0, 10), 'bass': (2, 'BASS', 0), 'inner': (3, 'KEYS', 0, 10)}
    up = {k: (ch, inst, semis + 2, *vol) for k, (ch, inst, semis, *vol) in var.items()}
    m.song([m.piece(['ode'], 7, parts(plain)), stop(beat(a, m.piece(['ode2'], 7, parts(var)), 16, four4), [4]),
            stop(beat(a, m.piece(['ode2'], 6, parts(up)), 16, four4), [4])], echo=(5, 4, 5, 8))


def greensleeves(a, m):
    """Twice: plain over a harp's eighths; then the tune doubled an octave down, over a running arpeggio and drums."""
    plain = {'lead': (0, 'LEAD', 0), 'bass': (2, 'BASS', 0), 'inner': (3, 'KEYS', 0, 11)}
    var = {'lead': (0, 'LEAD', 0), 'lead@2': (1, 'KEYS2', -12, 11), 'bass': (2, 'BASS', 0), 'inner': (3, 'KEYS', 0, 10)}
    m.song([stop(m.piece(['green'], 8, parts(plain)), [1]), beat(a, m.piece(['green2'], 7, parts(var)), 12, six8)], echo=(7, 5, 6, 7))


CLASSICS = {f.__name__: f for f in (alla_turca, entertainer, toccata, minute_waltz, canon, jesu, ode_to_joy, greensleeves)}
SONGS = ['rush_d'] + list(CLASSICS)


def add(a, name):
    """Add the song `name` (one of SONGS) to the Audio `a` (chip 2) as its next song; returns the song number."""
    assert a.chip == 2, 'the library is for the new sound chip: Audio(chip=2)'
    if name not in SONGS: raise KeyError('no song %r in the library: %s' % (name, ', '.join(SONGS)))
    if name == 'rush_d': n = rush_d.add(a)
    else:
        instruments(a, P, INSTRUMENTS)
        n = len(a.songs)
        CLASSICS[name](a, Medley(a, os.path.join(HERE, 'scores')))
    room(a, name)
    return n


if __name__ == '__main__':
    args = sys.argv[1:]
    if not args or args[0] == '--list':
        for name in SONGS: print(name)
        sys.exit(0 if args else 'usage: library.py out/audio.json [song ...]  (--list for the names)')
    out, names = args[0], args[1:] or SONGS
    unknown = [n for n in names if n not in SONGS]
    if unknown: sys.exit('no song %s (--list for the names)' % ', '.join(unknown))
    if len(names) > 8: sys.exit('an audio.json holds at most 8 songs: name the ones you want (--list)')
    a = Audio()
    for n in names: add(a, n)
    if len(a.patterns) > 64: sys.exit('these songs need %d patterns, more than the 64 an audio.json holds: name fewer' % len(a.patterns))
    a.write(out, songs=len(names))
    for k, n in enumerate(names): print('song %d: %s' % (k, n))
