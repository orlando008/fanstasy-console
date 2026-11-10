"""Checks of score.py and medley.py (no MIDI file or mido needed): python3 tools/devkit/music/selftest.py"""
import os, sys, tempfile
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kit import *
from score import deal_notes, read_score, write_score
from medley import Medley

fails = 0
def ok(c, name, extra=''):
    global fails
    print('%s %s %s' % ('PASS' if c else 'FAIL', name, extra))
    if not c: fails += 1

# --- score.py: dealing notes to the voices. Track 1 a tune over a chord, track 2 a bass; a bar is 16 rows of 10 ticks.
T = {1: [(0, 40, 72), (0, 40, 64), (0, 40, 67), (40, 20, 74), (60, 100, 76), (160, 40, 79)], 2: [(0, 80, 48), (80, 80, 43), (160, 40, 36)]}
PC = {'grid': 10, 'bar': 160, 'from': 0, 'to': 1, 'tune': [1], 'bass': [2], 'harm': [1, 2]}
v, rows = deal_notes(T, PC)
ok(rows == 16, 'an excerpt of one bar is 16 rows', rows)
ok(v['lead'] == [(0, 72, 4), (4, 74, 2), (6, 76, 10)], 'the lead is the highest note at each row, held to its end', v['lead'])
ok(v['bass'] == [(0, 48, 8), (8, 43, 8)], 'the bass the lowest', v['bass'])
ok(v['inner'] == [(0, 67, 4)] and v['tenor'] == [(0, 64, 4)], 'the two highest of the rest are the inner voices', (v['inner'], v['tenor']))
ok(all(r < 16 for x in v.values() for r, _, _ in x), 'notes of the next bar are left out')
v2, _ = deal_notes({1: [(0, 100, 72), (40, 20, 74)], 2: []}, PC)
ok(v2['lead'] == [(0, 72, 4), (4, 74, 2)], 'a note is cut at its voice\'s next note', v2['lead'])
v3, _ = deal_notes(T, {**PC, 'tune_low': 73})
ok(v3['lead'][0] == (4, 74, 2), 'tune_low keeps the low notes out of the tune', v3['lead'])
with tempfile.TemporaryDirectory() as d:
    write_score(os.path.join(d, 'a.txt'), 'a', 'one bar by hand', v, rows)
    back, n = read_score(os.path.join(d, 'a.txt'))
    ok(back == v and n == rows, 'note text written is read back the same')

    # --- medley.py: pieces in turn, each with its speed; a piece used twice is the same patterns
    write_score(os.path.join(d, 'b.txt'), 'b', 'five bars', {'lead': [(k * 16, 60 + k, 8) for k in range(5)], 'bass': [(0, 36, 80)]}, 80)
    a = Audio(chip=2)
    a.voice('L', 'celesta', 8); a.voice('B', 'bass', 8); a.voice('K', 'marimba', 6)
    m = Medley(a, d)
    A = m.piece(['a'], 6, {'lead': (0, 'L', 0), 'lead@2': (2, 'L', -12, 9), 'bass': (1, 'B', 0)}, tick=('K', 'K', 4))
    B = m.piece(['b'], 9, {'lead': (0, 'L', 0), 'bass': (1, 'B', 0)}, slow=[9, 12])
    f1, f2 = m.song([A, B, A], echo=(5, 4, 5, 9)), m.song([A])
    s1, s2 = a.songs[-2], a.songs[-1]
    ok(len(A[0]) == 64 and len(B[0]) == 128, 'a piece is made up to whole patterns', (len(A[0]), len(B[0])))
    ok(s1['order'][0] == s1['order'][3] == s2['order'][0] and len(a.patterns) == 3, 'a piece used again, in this song or another, is the same patterns', (s1['order'], s2['order'], len(a.patterns)))
    fx = [a.patterns[n]['rows'][0][7]['fx'] for n in s1['order']]
    ok(fx == ['F06', 'F09', 'F0C', 'F06'], 'each pattern begins with its piece\'s speed (and a slowing gives each its own)', fx)
    ok(f1 == 64 * (6 + 9 + 12 + 6) and f2 == 64 * 6 and m.frames == [f1, f2], 'song() returns its length in frames', (f1, f2))
    r0 = a.patterns[s1['order'][0]]['rows']
    ok(r0[0][0]['n'] == 'C-5' and r0[0][2]['n'] == 'C-4' and r0[0][2].get('v') == 9 and 'v' not in r0[0][0], 'a second part from a voice, an octave down, with its volume', (r0[0][0], r0[0][2]))
    ok(r0[4][5] is not None and r0[0][5] is not None and r0[2][5] is None, 'the tick is on channel 5, every so many rows')
    ok(r0[14][2] is None and a.patterns[s1['order'][1]]['rows'][8][0] == {'n': 'OFF'}, 'a note that ends before the next is let go')
    ok(s1.get('echo', {}).get('delay') == 5 and 'echo' not in s2, 'a song keeps its echo')

print('SOME FAILED' if fails else 'ALL PASS')
sys.exit(1 if fails else 0)
