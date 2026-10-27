# Turns one voice of a MIDI score into the note text of pieces.py ('D5:2 G4:1 _:1 ...': a note and its length in rows, '_' a rest).
#   python3 carts/src/flow-state/import_score.py score.mid --tracks 1 --grid 192 [--voice top|bottom|all] [--from TICK] [--to TICK]
#       [--min 96] [--transpose 0] [--below MIDI] [--legato] [--fill TRACK --fill-rows N] [--show]
# The scores come from the Mutopia Project (public domain or Creative Commons), found in marmooo/classical-midi-db; the MIDI files are not
# kept here, the text the tool wrote is (carts/src/flow-state/scores/). --grid: ticks to a row (the score's smallest rhythm). --voice: when
# notes start together, keep the highest (top), the lowest (bottom) or the longest only. --min: drop notes shorter than this many ticks (grace notes).
# --below N: leave out notes above MIDI note N (after the transposition; 60 is middle C), to keep a bass line free of chord notes.
# --legato: a note lasts until the next one starts (a staccato score's notes then count as the beat they sit on).
# --fill T --fill-rows N: where the melody rests for N rows or more, take the notes of track T (its top voice) instead (a flute that rests while the violins play).
# --drop N: leave out the notes N ticks long that start on a multiple of N (the Moonlight's triplets); --only N: keep just those.
# A note lasts until its own end or the next note, whichever is first. --show lists the notes found (tick, length, name) instead.
import argparse, sys
try:
    import mido
except ImportError:
    sys.exit('needs the mido package: pip install mido')

NAMES = 'C C# D D# E F F# G G# A A# B'.split()
name = lambda p: NAMES[p % 12] + str(p // 12 - 1)


def read(path, tracks):
    out = []
    for ti, t in enumerate(mido.MidiFile(path).tracks):
        if tracks and ti not in tracks: continue
        now, on = 0, {}
        for x in t:
            now += x.time
            if x.type == 'note_on' and x.velocity > 0: on.setdefault(x.note, []).append(now)
            elif x.type in ('note_off', 'note_on') and on.get(x.note):
                s = on[x.note].pop(0); out.append((s, now - s, x.note))
    return sorted(out)


def mono(notes, voice, min_len):
    notes = [n for n in notes if n[1] >= min_len]
    by = {}
    for s, d, p in notes: by.setdefault(s, []).append((s, d, p))
    pick = {'top': lambda g: max(g, key=lambda n: n[2]), 'bottom': lambda g: min(g, key=lambda n: n[2]), 'long': lambda g: max(g, key=lambda n: (n[1], n[2]))}[voice]
    return [pick(g) for _, g in sorted(by.items())]


def text(notes, grid, start=0, legato=False):
    toks, row = [], 0
    for k, (s, d, p) in enumerate(notes):
        end = s + d
        if k + 1 < len(notes): end = notes[k + 1][0] if legato else min(end, notes[k + 1][0])
        a, b = round((s - start) / grid), round((end - start) / grid)
        if b <= a: continue
        if a > row: toks.append('_:%d' % (a - row))
        elif a < row: continue
        toks.append('%s:%d' % (name(p), b - a)); row = b
    return ' '.join(toks), row


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('midi'); ap.add_argument('--tracks', type=int, nargs='*', default=[]); ap.add_argument('--grid', type=int, default=96)
    ap.add_argument('--voice', default='top', choices=['top', 'bottom', 'long']); ap.add_argument('--from', dest='a', type=int, default=0)
    ap.add_argument('--to', dest='b', type=int, default=10 ** 9); ap.add_argument('--min', type=int, default=0); ap.add_argument('--transpose', type=int, default=0)
    ap.add_argument('--show', action='store_true'); ap.add_argument('--below', type=int, default=127); ap.add_argument('--legato', action='store_true'); ap.add_argument('--fill', type=int, default=-1); ap.add_argument('--fill-rows', type=int, default=32); ap.add_argument('--drop', type=int, default=0); ap.add_argument('--only', type=int, default=0)
    o = ap.parse_args()
    ns = [(s, d, p + o.transpose) for s, d, p in read(o.midi, o.tracks) if o.a <= s < o.b]
    ns = [n for n in ns if n[2] <= o.below]
    trip = lambda n, L: n[1] == L and n[0] % L == 0
    if o.drop: ns = [n for n in ns if not trip(n, o.drop)]
    if o.only: ns = [n for n in ns if trip(n, o.only)]
    if o.show:
        for s, d, p in ns: print(s, d, name(p))
    else:
        mel = mono(ns, o.voice, o.min)
        if o.fill >= 0:                                                  # fill the long rests from another track
            alt = mono([(s, d, p + o.transpose) for s, d, p in read(o.midi, [o.fill]) if o.a <= s < o.b and p + o.transpose <= o.below], 'top', o.min)
            edges = [(0, mel[0][0])] + [(mel[k][0] + mel[k][1], mel[k + 1][0]) for k in range(len(mel) - 1)] if mel else []
            for lo, hi in edges:
                if hi - lo >= o.fill_rows * o.grid: mel += [n for n in alt if lo <= n[0] < hi]
            mel.sort()
        t, rows = text(mel, o.grid, o.a, o.legato)
        print(t); print('rows:', rows, file=sys.stderr)
