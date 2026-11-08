# Royal Chess's scores: the notes of its two pieces, read from public domain engravings (MIDI files from the Mutopia
# Project, found in the marmooo/classical-midi-db collection; scores/SOURCES.md has each one) into note text kept in
# scores/ (the MIDI files are not):
#   python3 carts/src/royal-chess/scores.py <folder with the MIDI files>
# Each piece is an excerpt (from and to a bar) on a grid. Its tracks are taken in three groups: the tune (at each row, the
# highest note that starts there), the bass (the lowest) and the harmony (the two highest of the rest, leaving out the
# tune's and the bass's pitches: `inner` above, `tenor` below). A voice holds its note until its own end or the voice's
# next note. The text, a voice a line: one token a note, 'row:pitch:length' (pitch a MIDI number, 60 middle C). audio.py
# makes the songs from it.
import os, sys
try:
    import mido
except ImportError:
    sys.exit('needs the mido package: pip install mido')

HERE = os.path.dirname(os.path.abspath(__file__))

# name: the file, the ticks of a row (`grid`) and of a bar, the excerpt (bars from 0, `from` to the bar before `to`),
# and the tracks of the tune, the bass and the harmony.
PIECES = {
    'minuet': {'file': 'anna-magdalena-04.mid', 'grid': 192, 'bar': 1152, 'from': 0, 'to': 32,
               'tune': [1], 'bass': [2], 'harm': [1, 2]},
    'sheep': {'file': 'Sheep.mid', 'grid': 96, 'bar': 1536, 'from': 0, 'to': 20,
              'tune': [1, 3], 'bass': [4], 'harm': [2, 3]},
}


def notes(path, track):
    """The notes of one track: (start tick, length in ticks, pitch)."""
    out, now, on = [], 0, {}
    for x in mido.MidiFile(path).tracks[track]:
        now += x.time
        if x.type == 'note_on' and x.velocity > 0: on.setdefault(x.note, []).append(now)
        elif x.type in ('note_off', 'note_on') and on.get(x.note):
            s = on[x.note].pop(0); out.append((s, now - s, x.note))
    return sorted(out)


def rows_of(ns, grid, t0, t1):
    """{row: [(pitch, rows)]} for the notes between ticks t0 and t1."""
    by = {}
    for s, d, p in ns:
        if t0 <= s < t1: by.setdefault(round((s - t0) / grid), []).append((p, max(1, round(d / grid))))
    return by


def held(xs):
    """A note lasts until the voice's next note at most."""
    return [(r, p, min(d, xs[k + 1][0] - r) if k + 1 < len(xs) else d) for k, (r, p, d) in enumerate(xs)]


def deal(path, pc):
    t0, t1, g = pc['from'] * pc['bar'], pc['to'] * pc['bar'], pc['grid']
    group = lambda tracks: rows_of([n for t in tracks for n in notes(path, t)], g, t0, t1)
    tune, bass, harm = group(pc['tune']), group(pc['bass']), group(pc['harm'])
    out = {'lead': [], 'bass': [], 'inner': [], 'tenor': []}
    for r in sorted(set(tune) | set(bass) | set(harm)):
        lead = max(tune[r]) if r in tune else None
        low = min(bass[r]) if r in bass else None
        if lead and low and lead[0] == low[0]: low = None              # one note alone: the tune's
        if lead: out['lead'].append((r, lead[0], lead[1]))
        if low: out['bass'].append((r, low[0], low[1]))
        rest = sorted({n for n in harm.get(r, []) if (not lead or n[0] != lead[0]) and (not low or n[0] != low[0])}, key=lambda n: -n[0])
        for v, n in zip(('inner', 'tenor'), rest): out[v].append((r, n[0], n[1]))
    return {v: held(xs) for v, xs in out.items()}, (t1 - t0) // g


def main(folder):
    os.makedirs(os.path.join(HERE, 'scores'), exist_ok=True)
    for name, pc in PIECES.items():
        voices, rows = deal(os.path.join(folder, pc['file']), pc)
        lines = ['# %s: bars %d to %d of %s, %d ticks a row, %d rows' % (name, pc['from'] + 1, pc['to'], pc['file'], pc['grid'], rows)]
        lines += ['%s %s' % (v, ' '.join('%d:%d:%d' % x for x in xs)) for v, xs in voices.items()]
        open(os.path.join(HERE, 'scores', name + '.txt'), 'w').write('\n'.join(lines) + '\n')
        print(name, rows, 'rows', '(%.1f patterns)' % (rows / 64), ', '.join('%s %d' % (v, len(xs)) for v, xs in voices.items()))


if __name__ == '__main__':
    main(sys.argv[1])
