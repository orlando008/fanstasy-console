"""The classics' note text (scores/), read from public domain MIDI engravings of the Mutopia Project, as collected in
the marmooo/classical-midi-db repository (scores/SOURCES.md has each file and its licence; the MIDI files are not in
the repository), and a few written out here by hand. Reading the files needs the mido package (pip install mido):

    python3 tools/devkit/music/songs/import_scores.py [folder with the MIDI files]

Without a folder it writes only the pieces by hand.

Each piece is an excerpt (bars `from` to the bar before `to`, `bar` ticks long) on a grid (`grid` ticks a row), dealt
out to a tune, a bass and two inner voices by tools/devkit/music/score.py. library.py makes the songs from the text.
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
    the chord as a running arpeggio of sixteenths (the drums are added by library.py)."""
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

# Greensleeves (traditional, English, 16th century), in A minor, 6/8: 12 rows a bar (a sixteenth a row, a dotted
# quarter 6). The verse (8 bars), then the refrain that leaps to the high G (8 bars); None is a rest. Bar 16 ends with
# the verse's pickup, so the song loops into it.
GV = [[(72, 4), (74, 2), (76, 3), (77, 1), (76, 2)], [(74, 4), (71, 2), (67, 3), (69, 1), (71, 2)],
      [(72, 4), (69, 2), (69, 3), (68, 1), (69, 2)], [(71, 4), (68, 2), (64, 4), (69, 2)]]
GV_END = [[(72, 3), (71, 1), (69, 2), (68, 3), (66, 1), (68, 2)]]
GREEN = (GV + GV[:2] + GV_END + [[(69, 6), (None, 6)]] +
         [[(79, 6), (79, 3), (78, 1), (76, 2)], GV[1], GV[2], [(71, 4), (68, 2), (64, 6)],
          [(79, 6), (79, 3), (78, 1), (76, 2)], GV[1]] + GV_END + [[(69, 6), (None, 4), (69, 2)]])
GCHORD = {'Am': (45, 60, 64), 'G': (43, 59, 62), 'E': (40, 56, 59), 'C': (48, 55, 60)}
GREEN_CHORDS = ['Am Am', 'G G', 'Am Am', 'E E', 'Am Am', 'G G', 'Am E', 'Am Am',
                'C C', 'G G', 'Am Am', 'E E', 'C C', 'G G', 'Am E', 'Am Am']


def greensleeves():
    """Plain: the tune over a bass a dotted quarter and a harp's eighths up the chord. The variation: the same tune over a
    bass in eighths and a running arpeggio of sixteenths (the drums are added by library.py)."""
    tune, bass, harp, bass2, arp = [], [], [], [], []
    for b, (notes, halves) in enumerate(zip(GREEN, GREEN_CHORDS)):
        r = b * 12
        for p, d in notes:
            if p: tune.append((r, p, d))
            r += d
        for h, c in enumerate(halves.split()):
            lo, c1, c2 = GCHORD[c]; r = b * 12 + h * 6
            bass.append((r, lo, 6))
            for k, p in enumerate((c1, c2, c1 + 12)): harp.append((r + k * 2, p, 2))
            for k in range(3): bass2.append((r + k * 2, lo + 12 * (k % 2), 2))
            for k, p in enumerate((c1, c2, c1 + 12, c2 + 12, c1 + 12, c2)): arp.append((r + k, p, 1))
    return {'lead': tune, 'bass': bass, 'inner': harp}, {'lead': tune, 'bass': bass2, 'inner': arp}

# Rossini, the William Tell overture (1829), the finale's gallop, in E, 2/4: 8 rows a bar (a sixteenth a row). Its
# "da-da-dum" is two sixteenths and an eighth on one note. Bars 1 to 6 are the gallop's head as it is always heard;
# bars 7 and 8, the cadence, are the part least sure from memory (up the chord of E, then down to it through the dominant).
def gallop(p): return [(p, 1), (p, 1), (p, 2)]
TELL = [gallop(71) + gallop(71), [(71, 1), (71, 1), (76, 2), (78, 2), (80, 2)],
        gallop(71) + gallop(71), [(71, 1), (71, 1), (80, 2), (76, 2), (80, 2)],
        gallop(71) + gallop(71), [(71, 1), (71, 1), (76, 2), (78, 2), (80, 2)],
        [(76, 2), (80, 2), (83, 2), (81, 2)], [(78, 2), (75, 2), (76, 4)]]
TELL_CHORDS = ['E E', 'E E', 'B7 B7', 'E E', 'E E', 'E E', 'E A', 'B7 E']
# The rest of the song is the toolkit's own, around Rossini's theme (the overture's other music is not known well
# enough from memory to write out): an intro, a bridge in C# minor, a run up to A major, a way back to E, and a coda.
R = None
TELL_INTRO = ([gallop(64) + gallop(68), gallop(71) + [(76, 4)], gallop(64) + gallop(68), gallop(71) + [(80, 4)]] +
              [[(R, 8)]] * 4, ['E E'] * 4 + ['B7 B7'] * 4)
TELL_BRIDGE = ([gallop(73) + gallop(73), [(73, 1), (73, 1), (76, 2), (80, 2), (78, 2)],
                gallop(71) + gallop(71), [(71, 1), (71, 1), (75, 2), (78, 2), (76, 2)],
                gallop(69) + gallop(69), [(69, 1), (69, 1), (73, 2), (76, 2), (75, 2)],
                gallop(68) + gallop(68), [(68, 1), (68, 1), (71, 2), (75, 2), (71, 2)]],
               ['C#m C#m', 'C#m C#m', 'B B', 'B B', 'A A', 'A A', 'G# G#', 'G# G#'])
TELL_RUN = ([[(p, 1) for p in (64, 66, 68, 69, 71, 73, 74, 76)], gallop(76) + gallop(76),
             [(p, 1) for p in (66, 68, 69, 71, 73, 74, 76, 78)], gallop(78) + gallop(78),
             [(p, 1) for p in (68, 69, 71, 73, 74, 76, 78, 80)], gallop(80) + gallop(80), gallop(83) + gallop(83), [(83, 4), (R, 4)]],
            ['E7 E7'] * 8)
TELL_BACK = ([gallop(69) + gallop(69), [(69, 1), (69, 1), (73, 2), (71, 2), (69, 2)],
              gallop(71) + gallop(71), [(71, 1), (71, 1), (75, 2), (73, 2), (71, 2)],
              gallop(71) + gallop(71), gallop(75) + gallop(75), gallop(78) + gallop(78), [(83, 4), (R, 4)]],
             ['A A', 'A A', 'B B', 'B B', 'B7 B7', 'B7 B7', 'B7 B7', 'B7 B7'])
TELL_CODA = ([gallop(76) + gallop(80), gallop(83) + gallop(80), gallop(76) + gallop(80), gallop(83) + [(83, 4)],
              [(76, 2), (R, 2), (75, 2), (R, 2)], [(76, 2), (R, 2), (75, 2), (R, 2)], [(76, 8)], [(R, 8)]],
             ['E E', 'E E', 'E E', 'E E', 'E B7', 'E B7', 'E E', 'E E'])
TCHORD = {'E': (40, 56, 59), 'B7': (47, 51, 57), 'A': (45, 57, 61), 'C#m': (49, 52, 56), 'B': (47, 51, 54),
          'G#': (44, 48, 51), 'E7': (40, 56, 62)}
E_MAJOR = [4, 6, 8, 9, 11, 1, 3]


def tell_score(bars, chords):
    """A part of the gallop on 8 rows a bar: the tune (None a rest) over an oom-pa (the bass on the beat, the chord on
    the off-beat eighths), with a second voice a third under the tune in E major (`harm`)."""
    tune, bass, inner, tenor, harm = [], [], [], [], []
    for b, (notes, halves) in enumerate(zip(bars, chords)):
        r = b * 8
        for p, d in notes:
            if p:
                tune.append((r, p, d))
                q = p - 1
                while q % 12 not in E_MAJOR: q -= 1
                q -= 1
                while q % 12 not in E_MAJOR: q -= 1
                harm.append((r, q, d))
            r += d
        for h, c in enumerate(halves.split()):
            lo, c1, c2 = TCHORD[c]; r = b * 8 + h * 4
            bass.append((r, lo, 2)); inner.append((r + 2, c2, 2)); tenor.append((r + 2, c1, 2))
    return {'lead': tune, 'bass': bass, 'inner': inner, 'tenor': tenor, 'harm': harm}


def by_hand():
    plain, var = ode()
    write_score(os.path.join(HERE, 'scores', 'ode.txt'), 'ode', "Beethoven's Ode to Joy (by hand), 16 bars of 4/4, a row a sixteenth", plain, 256)
    write_score(os.path.join(HERE, 'scores', 'ode2.txt'), 'ode2', "the Ode to Joy, the variation over an arpeggio (by hand), a row a sixteenth", var, 256)
    print('ode, ode2: 256 rows each (by hand)')
    plain, var = greensleeves()
    write_score(os.path.join(HERE, 'scores', 'green.txt'), 'green', 'Greensleeves (by hand), 16 bars of 6/8, a row a sixteenth', plain, 192)
    write_score(os.path.join(HERE, 'scores', 'green2.txt'), 'green2', 'Greensleeves, the variation over an arpeggio (by hand), a row a sixteenth', var, 192)
    print('green, green2: 192 rows each (by hand)')
    write_score(os.path.join(HERE, 'scores', 'tell.txt'), 'tell', "Rossini's William Tell gallop (by hand), 8 bars of 2/4, a row a sixteenth", tell_score(TELL, TELL_CHORDS), 64)
    for name, (bars, chords), what in (('tell_intro', TELL_INTRO, 'an intro'), ('tell_bridge', TELL_BRIDGE, 'a bridge in C# minor'),
                                       ('tell_run', TELL_RUN, 'a run up to A major'), ('tell_back', TELL_BACK, 'the way back to E'),
                                       ('tell_coda', TELL_CODA, 'a coda')):
        write_score(os.path.join(HERE, 'scores', name + '.txt'), name, "the William Tell gallop's %s (the toolkit's own, by hand), 8 bars of 2/4, a row a sixteenth" % what, tell_score(bars, chords), 64)
    print('tell and its five parts: 64 rows each (by hand)')


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
