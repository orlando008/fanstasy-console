"""The classics' note text (scores/), read from public domain MIDI engravings of the Mutopia Project, as collected in
the marmooo/classical-midi-db repository (scores/SOURCES.md has each file and its licence; the MIDI files are not in
the repository). Needs the mido package (pip install mido):

    python3 tools/devkit/music/songs/import_scores.py <folder with the MIDI files>

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


def main(folder):
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
    main(sys.argv[1])
