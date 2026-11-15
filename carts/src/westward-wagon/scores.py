# Westward Wagon's scores: the notes of its tunes, read from public domain engravings (MIDI files from the Mutopia Project;
# scores/SOURCES.md has each one) into note text kept in scores/ (the MIDI files are not):
#   python3 carts/src/westward-wagon/scores.py <folder with the MIDI files>
# The MIDI files are read by midi.py (no packages needed); the dealing out is tools/devkit/music/score.py's (deal_notes): each piece
# an excerpt (bars `from` to the bar before `to`) on a grid, its tracks dealt to a tune, a bass and two inner voices. Two additions:
#   skyline   the tune is the notes with nothing higher sounding as they start (a guitar arrangement, the tune and its accompaniment
#             on one track: the highest note starting on a row would take the accompaniment while the tune holds a note)
#   graces    notes shorter than this many beats are left out (Amazing Grace is engraved for the bagpipes, with grace notes), and a
#             note of the same pitch right after one is joined to it
#   drone     (pitches, rows) a held chord on each bar's first row, for a tune engraved alone (the game's own accompaniment)
import os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '../../../tools/devkit/music')); sys.path.insert(0, HERE)
from score import deal_notes, write_score
from midi import read

PIECES = {
    'joy':      {'file': 'soldiers-joy.mid', 'grid': 192, 'bar': 1536, 'from': 0, 'to': 18, 'tune': [1], 'bass': [2], 'harm': [2]},
    'air':      {'file': 'musicinair.mid', 'grid': 192, 'bar': 1536, 'from': 8, 'to': 24, 'tune': [1], 'bass': [3], 'harm': [2]},
    'oldfolks': {'file': 'oldfolks.mid', 'grid': 192, 'bar': 1536, 'from': 0, 'to': 24, 'tune': [1], 'bass': [1], 'harm': [1], 'skyline': True, 'tune_low': 57},
    'grace':    {'file': 'amazing-mutopia.mid', 'grid': 96, 'bar': 1728, 'from': 0, 'to': 16, 'tune': [1], 'bass': [], 'harm': [], 'graces': 0.4, 'drone': ([39, 46], 18)},
    'hanson':   {'file': 'hanson_place.mid', 'grid': 96, 'bar': 1536, 'from': 0, 'to': 16, 'tune': [1], 'bass': [2], 'harm': [1, 2]},
    'slumber':  {'file': 'slumber.mid', 'grid': 192, 'bar': 1152, 'from': 0, 'to': 36, 'tune': [1], 'bass': [3], 'harm': [2]},
    'home':     {'file': 'homeshome.mid', 'grid': 96, 'bar': 1536, 'from': 0, 'to': 24, 'tune': [1], 'bass': [6], 'harm': [5]},
}


def notes_of(path, pc):
    m = read(path); q = m['tpq']
    tracks = {k: [(s, l, p) for s, p, l, c in tr] for k, tr in enumerate(m['tracks'])}
    if pc.get('graces'):
        for k in pc['tune']:
            kept = []
            for s, l, p in tracks[k]:
                if l < pc['graces'] * q * 0.25: continue                     # a grace note
                if kept and kept[-1][2] == p and s - (kept[-1][0] + kept[-1][1]) < q * 0.6: kept[-1] = (kept[-1][0], s + l - kept[-1][0], p); continue
                kept.append((s, l, p))
            tracks[k] = kept
    if pc.get('skyline'):
        k = pc['tune'][0]; ns = tracks[k]; sky = []
        for s, l, p in ns:
            if any(s2 <= s < s2 + l2 and p2 > p for s2, l2, p2 in ns) or any(s2 == s and p2 > p for s2, l2, p2 in ns): continue
            sky.append((s, l, p))
        tracks['sky'] = sky; pc = dict(pc, tune=['sky'])
        tracks[k] = [n for n in ns if n not in sky]                              # the rest: the bass and the chords
    return tracks, pc


def piece(folder, name):
    pc = PIECES[name]
    tracks, pc2 = notes_of(os.path.join(folder, pc['file']), pc)
    for k in list(pc2['bass']) + list(pc2['harm']) + list(pc2['tune']): tracks.setdefault(k, [])
    voices, rows = deal_notes(tracks, pc2)
    if pc.get('drone'):
        pitches, every = pc['drone']
        voices['bass'] = [(r, pitches[0], every) for r in range(0, rows, every)]
        voices['inner'] = [(r, pitches[1], every) for r in range(0, rows, every)]
    return voices, rows


if __name__ == '__main__':
    folder = sys.argv[1]
    for name, pc in PIECES.items():
        voices, rows = piece(folder, name)
        write_score(os.path.join(HERE, 'scores', name + '.txt'), name, 'bars %d to %d of %s, %d ticks a row' % (pc['from'] + 1, pc['to'], pc['file'], pc['grid']), voices, rows)
        print('%-9s %3d rows, tune %d notes, bass %d' % (name, rows, len(voices['lead']), len(voices['bass'])))
