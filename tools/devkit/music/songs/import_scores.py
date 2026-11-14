"""The classics' note text (scores/), read from public domain MIDI engravings of the Mutopia Project, as collected in
the marmooo/classical-midi-db repository (scores/SOURCES.md has each file and its licence; the MIDI files are not in
the repository). Needs the mido package (pip install mido):

    python3 tools/devkit/music/songs/import_scores.py <folder with the MIDI files>

Each piece is an excerpt (bars `from` to the bar before `to`, `bar` ticks long) on a grid (`grid` ticks a row), dealt
out to a tune, a bass and two inner voices by tools/devkit/music/score.py. classics.py makes the songs from the text.
"""
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
from score import deal, write_score

HERE = os.path.dirname(os.path.abspath(__file__))
PIECES = {
    'alla_turca': {'file': 'KV331_3_RondoAllaTurca.mid', 'grid': 96, 'bar': 768, 'from': 0, 'to': 32, 'tune': [1], 'bass': [2], 'harm': [1, 2]},
    'entertainer': {'file': 'entertainer.mid', 'grid': 96, 'bar': 768, 'from': 0, 'to': 36, 'tune': [1], 'bass': [2], 'harm': [1, 2]},
    'toccata': {'file': 'ToccataFugue.mid', 'grid': 64, 'bar': 1536, 'from': 0, 'to': 16, 'tune': [1], 'bass': [3, 2], 'harm': [1, 2]},
    'minute_waltz': {'file': 'chopin_valse_op64_no1.m2.mid', 'grid': 96, 'bar': 1152, 'from': 0, 'to': 36, 'tune': [1], 'bass': [2], 'harm': [1, 2]},
}


def main(folder):
    for name, pc in PIECES.items():
        voices, rows = deal(os.path.join(folder, pc['file']), pc)
        write_score(os.path.join(HERE, 'scores', name + '.txt'), name,
                    'bars %d to %d of %s, %d ticks a row' % (pc['from'] + 1, pc['to'], pc['file'], pc['grid']), voices, rows)
        print(name, rows, 'rows', '(%.1f patterns)' % (rows / 64), ', '.join('%s %d' % (v, len(xs)) for v, xs in voices.items()))


if __name__ == '__main__':
    main(sys.argv[1])
