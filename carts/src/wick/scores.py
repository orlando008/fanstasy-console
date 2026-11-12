# Wick's scores: the notes of its music, read from public domain engravings (MIDI files from the Mutopia Project, found
# in the marmooo/classical-midi-db collection; scores/SOURCES.md has each one) into note text kept in scores/ (the MIDI
# files are not):
#   python3 carts/src/wick/scores.py <folder with the MIDI files>
# The reading is tools/devkit/music/score.py's: each piece an excerpt (from and to a bar) on a grid, its tracks dealt
# out to a tune, a bass and two inner voices. audio.py makes the songs from the text.
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../../tools/devkit/music'))
from score import deal, write_score

HERE = os.path.dirname(os.path.abspath(__file__))

# name: the file, the ticks of a row (`grid`) and of a bar, the excerpt (bars from 0, `from` to the bar before `to`),
# and the tracks of the tune, the bass and the harmony. Every file has 384 ticks a beat: 96 is a sixteenth, 48 a
# thirty-second, 64 a sixteenth of a triplet. (The fugue starts half way through a bar: its `bar` is half a bar.)
PIECES = {
    'toccata': {'file': 'ToccataFugue.mid', 'grid': 48, 'bar': 1536, 'from': 0, 'to': 3, 'tune': [1], 'bass': [3, 2], 'harm': [1, 2]},
    'toccata2': {'file': 'ToccataFugue.mid', 'grid': 64, 'bar': 1536, 'from': 3, 'to': 10, 'tune': [1], 'bass': [3, 2], 'harm': [1, 2]},
    'fugue': {'file': 'ToccataFugue.mid', 'grid': 96, 'bar': 768, 'from': 59, 'to': 107, 'tune': [1], 'bass': [3, 2], 'harm': [1, 2]},
    'invention4': {'file': 'bach-invention-04.mid', 'grid': 96, 'bar': 576, 'from': 0, 'to': 52, 'tune': [1], 'bass': [2], 'harm': [1, 2]},
    'invention13': {'file': 'bach-invention-13.mid', 'grid': 96, 'bar': 1536, 'from': 0, 'to': 25, 'tune': [1], 'bass': [2], 'harm': [1, 2]},
    'k11': {'file': 'sonatensatz.mid', 'grid': 96, 'bar': 1536, 'from': 0, 'to': 15, 'tune': [1], 'bass': [2], 'harm': [1, 2]},
    'prelude6': {'file': 'bwv851a.mid', 'grid': 64, 'bar': 1536, 'from': 0, 'to': 8, 'tune': [1], 'bass': [2], 'harm': [1, 2]},
    'prelude2': {'file': 'bwv847a.mid', 'grid': 96, 'bar': 1536, 'from': 0, 'to': 24, 'tune': [1], 'bass': [2], 'harm': [1, 2]},
    'fantasia': {'file': 'bwv542.mid', 'grid': 48, 'bar': 1536, 'from': 0, 'to': 10, 'tune': [1], 'bass': [3, 2], 'harm': [1, 2]},
    'prelude1': {'file': 'wtk1-prelude1.mid', 'grid': 96, 'bar': 1536, 'from': 0, 'to': 35, 'tune': [1], 'bass': [2], 'harm': [1, 2]},
}


def main(folder):
    os.makedirs(os.path.join(HERE, 'scores'), exist_ok=True)
    for name, pc in PIECES.items():
        voices, rows = deal(os.path.join(folder, pc['file']), pc)
        head = 'ticks %d to %d of %s, %d ticks a row' % (pc['from'] * pc['bar'], pc['to'] * pc['bar'], pc['file'], pc['grid'])
        write_score(os.path.join(HERE, 'scores', name + '.txt'), name, head, voices, rows)
        print(name, rows, 'rows', '(%.1f patterns)' % (rows / 64), ', '.join('%s %d' % (v, len(xs)) for v, xs in voices.items()))


if __name__ == '__main__':
    if len(sys.argv) < 2: sys.exit('python3 carts/src/wick/scores.py <folder with the MIDI files>')
    main(sys.argv[1])
