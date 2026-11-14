"""The classics' note text (scores/), read from public domain MIDI engravings of the Mutopia Project, as collected in
the marmooo/classical-midi-db repository (scores/SOURCES.md has each file and its licence; the MIDI files are not in
the repository), and a few written out here by hand. Reading the files needs the mido package (pip install mido):

    python3 tools/devkit/music/songs/import_scores.py [folder with the MIDI files]

Without a folder it writes only the pieces by hand.

Each piece is an excerpt (bars `from` to the bar before `to`, `bar` ticks long) on a grid (`grid` ticks a row), dealt
out to a tune, a bass and two inner voices by tools/devkit/music/score.py. classics.py makes the songs from the text.
"""
import os, statistics, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
from score import deal, deal_notes, midi_notes, write_score

HERE = os.path.dirname(os.path.abspath(__file__))
PIECES = {
    'alla_turca': {'file': 'KV331_3_RondoAllaTurca.mid', 'grid': 96, 'bar': 768, 'from': 0, 'to': 32, 'tune': [1], 'bass': [2], 'harm': [1, 2]},
    'entertainer': {'file': 'entertainer.mid', 'grid': 96, 'bar': 768, 'from': 0, 'to': 36, 'tune': [1], 'bass': [2], 'harm': [1, 2]},
    'toccata': {'file': 'ToccataFugue.mid', 'grid': 64, 'bar': 1536, 'from': 0, 'to': 16, 'tune': [1], 'bass': [3, 2], 'harm': [1, 2]},
    'canon': {'file': 'canon_per_3_violini_e_basso.mid', 'grid': 48, 'bar': 1536, 'from': 0, 'to': 24, 'tune': [1], 'bass': [4], 'harm': [2, 3]},
    'minute_waltz': {'file': 'chopin_valse_op64_no1.m2.mid', 'grid': 96, 'bar': 1152, 'from': 0, 'to': 36, 'tune': [1], 'bass': [2], 'harm': [1, 2]},
}

# A performance, not an engraving: played in by hand, its notes are on no grid and its tempo drifts. `played()` puts
# it on one: a row is the beat of its steady stream (here the triplet eighths), followed as the player's tempo moves.
PLAYED = {
    'jesu': {'file': 'Jesu-Joy-Of-Man-Desiring.mid', 'track': 1, 'row': 230, 'split': 55, 'grid': 1, 'bar': 9, 'from': 0,
             'to': 73, 'tune': [1], 'bass': [2], 'harm': [3]},
}


def played(path, track, row, split):
    """A performed track on a grid: notes that start within 70 ticks are a chord; starts a fraction of a row apart are
    one row (a chord spread by the hand); each gap is a whole number of rows of the current row length, which follows the
    median of the last 8 one-row gaps. A pianist holds notes with the pedal and lets the keys go, so a note lasts to
    the next note of its own hand (below `split`, the left; at or above it, the right), at most a bar of 9 rows.
    Returns {1: every note, 2: the left hand's, 3: the right hand's}, each [(row, rows, pitch)]."""
    chords = []
    for s, d, p in midi_notes(path, track):
        if chords and s - chords[-1][0] < 70: chords[-1][1].append((s, d, p))
        else: chords.append([s, [(s, d, p)]])
    rows, recent, r, prev = [], [row] * 8, 0, None
    for s, ns in chords:
        if prev is not None:
            g = s - prev; P = statistics.median(recent); k = round(g / P)
            if k == 0 and rows: rows[-1][2].extend(ns); continue
            if 0.75 < g / P < 1.3: recent = recent[1:] + [g]
            r += max(1, k)
        rows.append((r, s, list(ns))); prev = s
    hands = {2: [], 3: []}
    for r, s, ns in rows:
        for h in (2, 3):
            ps = sorted({p for _, _, p in ns if (p < split) == (h == 2)})
            if ps: hands[h].append((r, ps))
    out = {1: [], 2: [], 3: []}
    for h, xs in hands.items():
        for k, (r, ps) in enumerate(xs):
            d = min(9, (xs[k + 1][0] if k + 1 < len(xs) else r + 9) - r)
            for p in ps: out[h].append((r, d, p)); out[1].append((r, d, p))
    return {h: sorted(v) for h, v in out.items()}

# Written by hand (a tune known well enough to write out), on a grid of sixteenths, 16 rows a bar of 4/4.
# Beethoven, Symphony No. 9, the finale's "Ode to Joy" theme, in D: (MIDI pitch, sixteenths) a note.
ODE = [[(66, 4), (66, 4), (67, 4), (69, 4)], [(69, 4), (67, 4), (66, 4), (64, 4)], [(62, 4), (62, 4), (64, 4), (66, 4)],
       [(66, 6), (64, 2), (64, 8)],
       [(66, 4), (66, 4), (67, 4), (69, 4)], [(69, 4), (67, 4), (66, 4), (64, 4)], [(62, 4), (62, 4), (64, 4), (66, 4)],
       [(64, 6), (62, 2), (62, 8)],
       [(64, 4), (64, 4), (66, 4), (62, 4)], [(64, 4), (66, 2), (67, 2), (66, 4), (62, 4)],
       [(64, 4), (66, 2), (67, 2), (66, 4), (64, 4)], [(62, 4), (64, 4), (57, 8)],
       [(66, 4), (66, 4), (67, 4), (69, 4)], [(69, 4), (67, 4), (66, 4), (64, 4)], [(62, 4), (62, 4), (64, 4), (66, 4)],
       [(64, 6), (62, 2), (62, 8)]]
# The chord of each half bar, D or A: (bass, the two inner notes).
CHORD = {'D': (38, 57, 62), 'A': (45, 52, 61)}   # D as A and D: the tune's G passes over it without rubbing on an F#
ODE_CHORDS = 'DD DA DD DA DD DA DD AD AD AD AA DA DD DA DD AD'.split()


def ode():
    """The theme plain (half-note chords under it), and a variation: the tune an octave up over a bass in eighths and
    the chord as a running arpeggio of sixteenths (the drums are added by classics.py)."""
    tune, bass, inner, tenor, bass2, arp = [], [], [], [], [], []
    for b, (notes, halves) in enumerate(zip(ODE, ODE_CHORDS)):
        r = b * 16
        for p, d in notes: tune.append((r, p, d)); r += d
        for h, c in enumerate(halves):
            lo, c1, c2 = CHORD[c]; r = b * 16 + h * 8
            bass.append((r, lo, 8)); inner.append((r, c2, 8)); tenor.append((r, c1, 8))
            for k in range(4): bass2.append((r + k * 2, lo + 12 * (k % 2), 2))
            for k, p in enumerate((c1, c2, lo + 24, c2, c1 + 12, c2 + 12, lo + 36, c2 + 12)): arp.append((r + k, p, 1))
    up = [(r, p + 12, d) for r, p, d in tune]
    return {'lead': tune, 'bass': bass, 'inner': inner, 'tenor': tenor}, {'lead': up, 'bass': bass2, 'inner': arp}


def by_hand():
    plain, var = ode()
    write_score(os.path.join(HERE, 'scores', 'ode.txt'), 'ode', "Beethoven's Ode to Joy (by hand), 16 bars of 4/4, a row a sixteenth", plain, 256)
    write_score(os.path.join(HERE, 'scores', 'ode2.txt'), 'ode2', "the Ode to Joy, the variation over an arpeggio (by hand), a row a sixteenth", var, 256)
    print('ode, ode2: 256 rows each (by hand)')


def main(folder):
    by_hand()
    if folder is None: return
    for name, pc in PLAYED.items():
        voices, rows = deal_notes(played(os.path.join(folder, pc['file']), pc['track'], pc['row'], pc['split']), pc)
        write_score(os.path.join(HERE, 'scores', name + '.txt'), name,
                    'all of %s (a performance, on a grid of its triplets), a row a triplet eighth' % pc['file'], voices, rows)
        print(name, rows, 'rows', '(%.1f patterns)' % (rows / 64), ', '.join('%s %d' % (v, len(xs)) for v, xs in voices.items()))
    for name, pc in PIECES.items():
        voices, rows = deal(os.path.join(folder, pc['file']), pc)
        write_score(os.path.join(HERE, 'scores', name + '.txt'), name,
                    'bars %d to %d of %s, %d ticks a row' % (pc['from'] + 1, pc['to'], pc['file'], pc['grid']), voices, rows)
        print(name, rows, 'rows', '(%.1f patterns)' % (rows / 64), ', '.join('%s %d' % (v, len(xs)) for v, xs in voices.items()))


if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else None)
