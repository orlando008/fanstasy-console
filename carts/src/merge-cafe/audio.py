# Merge Café's audio: carts/src/merge-cafe/audio.json.
#   python3 carts/src/merge-cafe/audio.py carts/src/merge-cafe/audio.json
# Three songs (0 the title, 1 the café: two pieces in turn, 2 the grand reopening) and the effects numbered as SFX in code.js. Written with the song
# toolkit (tools/devkit/music/kit.py; its header explains the bar() arguments). Rules (playbook section 5):
# leads are quiet, with no vibrato; songs use channels 0 to 5 and effects 6 and 7 (code.js takes turns); the drums are
# samples on channel 5. The new sound chip (SPEC 5): sampled instruments from samples.py (a.voice) and an echo per song.
# After a change: node tools/devkit/music/loud.mjs carts/merge-cafe.nova --check (levels; the lead alone must stay at most
# 0.07 RMS and 0.75 of the mix) and python3 tools/devkit/music/clash.py on the json.
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../../tools/devkit/music'))
from kit import *

a = Audio(chip=2)
a.sample(snare()); a.sample(hat(0.05, 70, 3)); a.sample(hat(0.15, 22, 5)); a.sample(kick())

# --- The band: cosy café jazz (spec 11): a flute's quiet tune, an electric piano comping, a walking bass, brushes and a ride ---
a.voice('LEAD', 'flute', 4, -0.2, a=2)
a.voice('COMP', 'epiano', 11, 0.15)
a.voice('BASS', 'bass', 14, 0.0, d=30, s=4)
a.instrument('RIDE', 'sample', 0, 0, 15, 0, 5, pan=0.3, sample=1)
a.instrument('RIDE2', 'sample', 0, 0, 15, 0, 6, pan=0.3, sample=2, echo=3)
a.instrument('BRUSH', 'sample', 0, 0, 15, 0, 4, pan=-0.2, sample=0, echo=4)
a.instrument('KICK', 'sample', 0, 0, 15, 0, 7, sample=3)
a.voice('CEL', 'celesta', 6, 0.15)                             # effects from here on: soft, sampled
a.voice('CELQ', 'celesta', 4, 0.15)
a.voice('MAR', 'marimba', 9, -0.1)
a.voice('MARQ', 'marimba', 6, -0.1)
a.voice('KEYS', 'epiano', 8, 0.0)
a.voice('PLK', 'pluck', 9, 0.1)

# A bar is 12 rows: 3 to a beat, so an eighth note "swings" (on the beat, then on the beat's third row). Speed 12: 100 bpm.
NOTE = {'C': 0, 'Db': 1, 'D': 2, 'Eb': 3, 'E': 4, 'F': 5, 'Gb': 6, 'G': 7, 'Ab': 8, 'A': 9, 'Bb': 10, 'B': 11}
QUAL = {'maj7': (0, 4, 7, 11), 'm7': (0, 3, 7, 10), '7': (0, 4, 7, 10), 'm7b5': (0, 3, 6, 10)}
def chord(name):
    root = name[:2] if name[1:2] == 'b' else name[:1]
    return NOTE[root], QUAL[name[len(root):]]
# The tune: for each bar a rhythm (rows) and the chord tones it climbs (0 root, 1 third, 2 fifth, 3 seventh, 4 the octave...), a phrase of 4 bars
TUNES = [[(0, 2), (3, 3), (5, 4), (9, 3)], [(2, 2), (6, 1), (8, 2)], [(0, 4), (5, 3), (6, 2), (11, 1)], [(0, 0), (6, None)]]
def tone(r, q, k, base):
    return base + r + q[k % 4] + 12 * (k // 4)
def piece(S, chords, lead=True, drums=True, comp=True, last=None):
    I = a.I
    for n, ch in enumerate(chords):
        r, q = chord(ch)
        nr, nq = chord(chords[(n + 1) % len(chords)])
        rows = [[None] * 8 for _ in range(12)]
        bass = [r, r + q[1 + n % 2], r + q[2], (nr - 1 if (nr - r) % 12 != 1 else nr + 1)]   # walking: root, third or fifth, fifth, a step into the next chord
        for k, p in enumerate(bass): rows[k * 3][2] = cell(36 + (p % 12) - (12 if (p % 12) > 7 else 0), I['BASS'])
        if comp:                                                   # the Charleston: the shell (third and seventh) on 1 and on the and of 2
            for at in (0, 5):
                rows[at][1] = cell(48 + r + q[1] - (12 if r + q[1] > 11 else 0), I['COMP'], 11 if at else 13)
                top = q[3] if q[3] != 11 else 9                       # a major seventh under the tune's root rubs: voice it as a sixth chord
                rows[at][3] = cell(48 + r + top - (12 if r + top > 13 else 0), I['COMP'], 10 if at else 12)
            rows[2][1] = {'n': 'OFF'}; rows[7][1] = {'n': 'OFF'}; rows[2][3] = {'n': 'OFF'}; rows[7][3] = {'n': 'OFF'}
        if drums:                                                  # the ride: ding, ding-ga; brushes on 2 and 4; a soft kick now and then
            for at, inst in ((0, 'RIDE2'), (3, 'RIDE'), (5, 'RIDE'), (6, 'RIDE2'), (9, 'RIDE'), (11, 'RIDE')): rows[at][4] = cell('C-4', I[inst])
            rows[3][5] = cell('C-4', I['BRUSH']); rows[9][5] = cell('C-4', I['BRUSH'])
            if n % 4 == 0: rows[0][5] = cell('C-4', I['KICK'])
        if lead:
            if TUNES[n % 4][0][0] > 0: rows[0][0] = {'n': 'OFF'}        # a note held from the bar before would rub against the new chord
            for at, k in TUNES[n % 4]:
                rows[at][0] = {'n': 'OFF'} if k is None else cell(tone(r, q, k, 60 if r < 5 else 48), I['LEAD'])
        S.rows += rows
    if last: S.rows[-12][0] = cell(last, I['LEAD'])

A = ['Gm7', 'C7', 'Fmaj7', 'D7', 'Gm7', 'C7', 'Am7', 'D7', 'Gm7', 'C7', 'Fmaj7', 'Dm7', 'Bbmaj7', 'C7', 'Fmaj7', 'Fmaj7']
B = ['Cm7', 'F7', 'Bbmaj7', 'G7', 'Cm7', 'F7', 'Dm7', 'G7', 'Ebmaj7', 'Ab7', 'Bbmaj7', 'G7', 'Cm7', 'F7', 'Bbmaj7', 'Bbmaj7']
C = ['Cmaj7', 'Am7', 'Dm7', 'G7', 'Cmaj7', 'Am7', 'Dm7', 'G7', 'Fmaj7', 'Fm7', 'Em7', 'A7', 'Dm7', 'G7', 'Cmaj7', 'Cmaj7']

# --- 0 The title: the first piece, piano and bass alone, then the band ---
S = a.song(Key('F', MAJOR), 12, echo=(6, 5, 5, 8))
piece(S, A[:8], lead=False, drums=False); piece(S, A[8:], lead=True, drums=False)
S.finish()
# --- 1 The café: two pieces in turn (a medley: F major, then B flat), looping ---
S = a.song(Key('F', MAJOR), 12, echo=(6, 5, 5, 8))
piece(S, A, drums=True, lead=False); piece(S, A); piece(S, B); piece(S, B[:8]) ; piece(S, B[8:], lead=False)
S.finish()
# --- 2 The grand reopening: C major, the whole band ---
S = a.song(Key('C', MAJOR), 10, echo=(6, 5, 6, 8))
piece(S, C); piece(S, C)
S.finish()

# --- Effects: the order is the SFX table in code.js ---
a.effect(1, ['E-5', None, 'OFF'], 'MARQ')                          # 0 the cursor moves
a.effect(2, ['C-6', 'G-6', None, 'OFF'], 'CEL')                    # 1 select
a.effect(2, ['G-5', 'C-5', None, 'OFF'], 'CELQ')                   # 2 pause
a.effect(2, ['C-3', None, None, 'OFF'], 'MAR')                     # 3 a knock: no room, or not here
a.effect(1, ['G-4', 'C-5', None, 'OFF'], 'MARQ')                   # 4 pick up
a.effect(1, ['C-5', 'G-4', None, 'OFF'], 'MARQ')                   # 5 put down
a.effect(1, ['C-4', 'G-4', 'C-5', None, 'OFF'], 'PLK')             # 6 a generator pops out an item
for k, (r1, r2) in enumerate((('C-5', 'E-5'), ('D-5', 'G-5'), ('E-5', 'A-5'), ('G-5', 'C-6'), ('C-6', 'E-6'))):   # 7 to 11: a merge, tier 2 to 6, rising
    a.effect(2, [r1, r2, None, None, 'OFF'] if k < 4 else [r1, r2, 'G-6', 'C-7', None, None, 'OFF'], 'CEL')
a.effect(2, ['A-5', 'E-6', None, 'OFF'], 'KEYS')                   # 12 a sale: coins
a.effect(2, ['C-4', 'E-4', 'G-4', 'C-5', None, 'OFF'], 'MAR')      # 13 a crate opens
a.effect(2, ['E-6', 'G-6', 'C-7', None, None, 'OFF'], 'CEL')       # 14 a new item found
a.effect(2, ['C-6', None, 'G-6', None, None, 'OFF'], 'KEYS')       # 15 an order served: the till
a.effect(2, ['G-5', 'C-6', 'E-6', 'G-6', None, None, 'OFF'], 'CELQ')   # 16 stars
a.effect(3, ['C-5', 'E-5', 'G-5', 'C-6', None, 'G-5', 'C-6', None, None, 'OFF'], 'KEYS')   # 17 a task done: a little fanfare
a.effect(3, ['E-6', 'C-6', None, None, None, 'OFF'], 'CELQ')                          # 18 the doorbell: a customer comes in

a.write(sys.argv[1], songs=3)
