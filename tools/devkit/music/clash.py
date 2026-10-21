"""Check each song for clashes: on every beat, the lead against the bass and the chords (the saw channel on the old chip;
on the new one, "chip": 2, the counter-melody, the pad and its fifth: channels 1, 3 and 4).
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
    others = (1, 2, 3, 4) if A.get('chip') == 2 else (2, 3)
    # Drums (an instrument playing a sample that does not loop) have no pitch to clash with.
    drum = {k for k, ins in enumerate(A['instruments']) if ins and ins.get('wave') == 'sample' and not (A['samples'][ins.get('sample', 0)] or {}).get('loop')}
    cur = [None] * 8; bad = []
    for k, r in enumerate(rows):
        for ch in (0,) + others:
            c = r[ch]
            if c and 'n' in c: cur[ch] = None if c['n'] == 'OFF' or c.get('i') in drum else m(c['n'])
        if k % 4 == 0 and cur[0] is not None:   # on beats, the lead against the others
            for ch in others:
                if cur[ch] is None: continue
                iv = abs(cur[0] - cur[ch]) % 12
                if iv in (1, 6, 11): bad.append((k // 16, k % 16, N[cur[0] % 12], N[cur[ch] % 12], ch))
    print('song', si, len(bad), bad[:12])
