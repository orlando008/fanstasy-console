"""Check each song for clashes: on every beat, the lead against the bass and the saw channel.
A minor second, a tritone or a major seventh (1, 6 and 11 semitones) is flagged.

    python3 tools/devkit/music/clash.py carts/src/my-game/audio.json

Prints the number of clashes for each song and the first dozen (bar, row, lead note, other note, channel).
A flagged note is not always wrong (a passing note on a short stab is fine); a long clash is.
"""
import json, sys
A = json.load(open(sys.argv[1]))
N = ['C-', 'C#', 'D-', 'D#', 'E-', 'F-', 'F#', 'G-', 'G#', 'A-', 'A#', 'B-']
def m(n): return N.index(n[:2]) + 12 * int(n[2:])
for si, s in enumerate(A['songs']):
    rows = [r for p in s['order'] for r in A['patterns'][p]['rows']]
    cur = [None] * 6; bad = []
    for k, r in enumerate(rows):
        for ch in (0, 2, 3):
            c = r[ch]
            if c and 'n' in c: cur[ch] = None if c['n'] == 'OFF' else m(c['n'])
        if k % 4 == 0 and cur[0] is not None:   # on beats, the lead against bass and saw
            for ch in (2, 3):
                if cur[ch] is None: continue
                iv = abs(cur[0] - cur[ch]) % 12
                if iv in (1, 6, 11): bad.append((k // 16, k % 16, N[cur[0] % 12], N[cur[ch] % 12], ch))
    print('song', si, len(bad), bad[:12])
