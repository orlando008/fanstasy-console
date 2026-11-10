# Clockwork Dominion's scores: the notes of its pieces, read from public domain engravings (MIDI files from the Mutopia
# Project, found in the marmooo/classical-midi-db collection; scores/SOURCES.md has each one) into note text kept in
# scores/ (the MIDI files are not), and Marco's own theme, written here by hand (an original waltz for a music box):
#   python3 carts/src/clockwork-dominion/scores.py <folder with the MIDI files>
# The reading is tools/devkit/music/score.py's: each piece an excerpt (from and to a bar) on a
# grid, its tracks taken in three groups: the tune (at each row, the highest note that starts there; `tune_low` keeps
# only notes at or above that pitch), the bass (the lowest) and the harmony (the two highest of the rest: `inner`,
# `tenor`). A voice holds its note until its own end or the voice's next note. The text, a voice a line: one token a
# note, 'row:pitch:length' (pitch a MIDI number, 60 middle C). audio.py makes the songs from it.
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../../tools/devkit/music'))
from score import deal, write_score

HERE = os.path.dirname(os.path.abspath(__file__))

# name: the file, the ticks of a row (`grid`) and of a bar, the excerpt (bars from 0, `from` to the bar before `to`),
# and the tracks of the tune, the bass and the harmony.
PIECES = {
    'soldiers': {'file': '05MarchOfTheWoodenSoldiers.mid', 'grid': 96, 'bar': 768, 'from': 0, 'to': 48, 'tune': [1], 'bass': [2], 'harm': [1, 2]},
    'menuet': {'file': 'hob-xvi-27-ii-menuet-trio.mid', 'grid': 96, 'bar': 1152, 'from': 0, 'to': 42, 'tune': [1], 'bass': [2], 'harm': [1, 2]},
    'lullaby': {'file': 'LullabyBrahms-C.mid', 'grid': 192, 'bar': 1152, 'from': 0, 'to': 16, 'tune': [1], 'bass': [2], 'harm': [2]},
    'mountain': {'file': 'Dans_l_antre_du_roi_de_la_montagne.mid', 'grid': 192, 'bar': 1536, 'from': 1, 'to': 25, 'tune': [1], 'bass': [2], 'harm': [1, 2]},
    'troldhaugen': {'file': 'troldhaugen.mid', 'grid': 96, 'bar': 1536, 'from': 0, 'to': 20, 'tune': [1], 'bass': [2], 'harm': [1, 2]},
    'clair': {'file': 'debussy_Ste_Bergamesq_Clair.mid', 'grid': 96, 'bar': 1728, 'from': 0, 'to': 28, 'tune': [1], 'bass': [2], 'harm': [1, 2]},
    'arabesque': {'file': 'debussy_Arabesque_1.mid', 'grid': 128, 'bar': 1536, 'from': 0, 'to': 26, 'tune': [1], 'bass': [2], 'harm': [1, 2]},
    'dwarfs': {'file': 'Troldtog.mid', 'grid': 48, 'bar': 768, 'from': 1, 'to': 29, 'tune': [1], 'bass': [2], 'harm': [1, 2]},
    'canon': {'file': 'contrapunctusXII.mid', 'grid': 96, 'bar': 864, 'from': 0, 'to': 28, 'tune': [1], 'bass': [2], 'harm': [1, 2]},
    'gymno': {'file': 'gymnopedie_1.mid', 'grid': 192, 'bar': 1152, 'from': 0, 'to': 32, 'tune': [1], 'tune_low': 62, 'bass': [2], 'harm': [1, 2]},
}

# Marco's theme: an original waltz for a music box, in C, 16 bars of 3/4 on a grid of sixteenths (12 rows a bar). It
# winds up (a rising arpeggio, bars 1 and 9) and runs down (bars 5 and 14); the first half ends open, on D, the second
# home. Each bar: the tune in eighths, (pitch, eighths), and the chord: its bass and two notes of it.
MARCO_TUNE = [
    [(55, 1), (60, 1), (64, 1), (67, 3)], [(69, 2), (67, 1), (65, 1), (64, 2)], [(62, 1), (64, 1), (65, 1), (69, 3)], [(67, 4), (64, 2)],
    [(65, 2), (64, 1), (62, 1), (60, 2)], [(57, 2), (59, 1), (60, 1), (62, 2)], [(64, 3), (60, 1), (62, 1), (64, 1)], [(62, 6)],
    [(55, 1), (60, 1), (64, 1), (67, 3)], [(69, 2), (67, 1), (65, 1), (64, 2)], [(62, 1), (64, 1), (65, 1), (72, 3)], [(71, 2), (69, 1), (67, 1), (65, 2)],
    [(64, 2), (69, 2), (67, 2)], [(65, 2), (62, 2), (59, 2)], [(60, 3), (64, 1), (62, 1), (59, 1)], [(60, 6)],
]
MARCO_CHORDS = [(48, 64, 67), (53, 69, 72), (50, 65, 69), (52, 64, 67), (50, 65, 69), (50, 66, 69), (45, 64, 69), (43, 62, 67),
                (48, 64, 67), (53, 69, 72), (50, 65, 72), (43, 62, 67), (45, 64, 69), (43, 62, 67), (43, 64, 67), (48, 64, 67)]
# (the chords under a tune that steps down through them leave out the note it would rub against: F major as A and C,
# G as D and G; clash.py checks)


def marco():
    """The theme twice over: plain (the tune, a bass a bar, the chord on the second and third beats: a waltz), and a
    variation (the same tune, over a running arpeggio of eighths)."""
    tune, bass, inner, tenor, arp = [], [], [], [], []
    for b, (notes, (lo, c1, c2)) in enumerate(zip(MARCO_TUNE, MARCO_CHORDS)):
        r = b * 12
        for p, d in notes: tune.append((r, p, d * 2)); r += d * 2
        bass.append((b * 12, lo, 8))                                    # two beats: the third is the tune's
        for k in (4, 8): inner.append((b * 12 + k, c2, 4)); tenor.append((b * 12 + k, c1, 4))
        for k, p in enumerate((lo + 12, c1, c2, lo + 24, c2, c1)): arp.append((b * 12 + k * 2, p, 2))
    return {'lead': tune, 'bass': bass, 'inner': inner, 'tenor': tenor}, {'lead': tune, 'bass': bass, 'inner': arp}


def write(name, head, voices, rows): write_score(os.path.join(HERE, 'scores', name + '.txt'), name, head, voices, rows)


def main(folder):
    os.makedirs(os.path.join(HERE, 'scores'), exist_ok=True)
    plain, var = marco()
    write('marco', "Marco's theme (by hand), 16 bars of 3/4, 96 ticks a row", plain, 192)
    write('marco2', "Marco's theme, the variation over an arpeggio (by hand), 96 ticks a row", var, 192)
    for name, pc in PIECES.items():
        voices, rows = deal(os.path.join(folder, pc['file']), pc)
        write(name, 'bars %d to %d of %s, %d ticks a row' % (pc['from'] + 1, pc['to'], pc['file'], pc['grid']), voices, rows)
        print(name, rows, 'rows', '(%.1f patterns)' % (rows / 64), ', '.join('%s %d' % (v, len(xs)) for v, xs in voices.items()))


if __name__ == '__main__':
    main(sys.argv[1])
