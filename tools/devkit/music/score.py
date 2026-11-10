"""Scores for a cart's songs: read a piece from a MIDI file (a public domain engraving) into plain note text that is
kept in the cart's folder, and read that text back when the songs are made (medley.py plays it).

    from score import deal, write_score, read_score

    PIECES = {'menuet': {'file': 'menuet.mid', 'grid': 96, 'bar': 1152, 'from': 0, 'to': 42, 'tune': [1], 'bass': [2], 'harm': [1, 2]}}
    voices, rows = deal('midi/menuet.mid', PIECES['menuet'])
    write_score('carts/src/my-game/scores/menuet.txt', 'menuet', 'bars 1 to 42 of menuet.mid, 96 ticks a row', voices, rows)

A piece is an excerpt (bars `from` to the bar before `to`, each `bar` ticks long) on a grid (`grid` ticks a row: a
sixteenth is a quarter of the file's ticks a beat), its tracks dealt out to four voices:
  lead   at each row, the highest note that starts there in the `tune` tracks (`tune_low` keeps only notes at or
         above that pitch, for a tune that shares its track with an accompaniment)
  bass   the lowest note that starts there in the `bass` tracks (not the tune's own note again)
  inner, tenor   the two highest of the rest of the `harm` tracks
A voice holds its note until its own end or the voice's next note. The text is a header and a voice a line, one token
a note, 'row:pitch:rows' (pitch a MIDI number, 60 is middle C); a tune written by hand (a game's own theme) is the same
text, from write_score(). Reading a MIDI file needs the mido package (pip install mido); the text needs nothing, so a
cart's audio.py, CI and other people never need the MIDI files. Record each file's source and licence next to the
text (a SOURCES.md): the composition may be public domain while a particular file is not.
To choose an excerpt, look at a file's bars first:  python3 tools/devkit/music/score.py file.mid [bar-ticks] [from] [to]
"""
import os, sys

NAMES = 'C C# D D# E F F# G G# A A# B'.split()


def midi_notes(path, track):
    """The notes of one track of a MIDI file: [(start tick, length in ticks, pitch)]."""
    try:
        import mido
    except ImportError:
        sys.exit('reading a MIDI file needs the mido package: pip install mido')
    out, now, on = [], 0, {}
    for x in mido.MidiFile(path).tracks[track]:
        now += x.time
        if x.type == 'note_on' and x.velocity > 0: on.setdefault(x.note, []).append(now)
        elif x.type in ('note_off', 'note_on') and on.get(x.note):
            s = on[x.note].pop(0); out.append((s, now - s, x.note))
    return sorted(out)


def rows_of(ns, grid, t0, t1):
    """{row: [(pitch, rows)]} for the notes (start, length, pitch) that start between ticks t0 and t1."""
    by = {}
    for s, d, p in ns:
        if t0 <= s < t1: by.setdefault(round((s - t0) / grid), []).append((p, max(1, round(d / grid))))
    return by


def held(xs):
    """A note lasts until the voice's next note at most."""
    return [(r, p, min(d, xs[k + 1][0] - r) if k + 1 < len(xs) else d) for k, (r, p, d) in enumerate(xs)]


def deal_notes(tracks, pc):
    """Deal notes out to the four voices. tracks: {track number: [(start, length, pitch)]}; pc: a piece (see the top).
    Returns ({'lead': [(row, pitch, rows)], 'bass': ..., 'inner': ..., 'tenor': ...}, the excerpt's rows)."""
    t0, t1, g = pc['from'] * pc['bar'], pc['to'] * pc['bar'], pc['grid']
    group = lambda ts: rows_of([n for t in ts for n in tracks[t]], g, t0, t1)
    tune = rows_of([n for t in pc['tune'] for n in tracks[t] if n[2] >= pc.get('tune_low', 0)], g, t0, t1)
    bass, harm = group(pc['bass']), group(pc['harm'])
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


def deal(path, pc):
    """A piece's voices from its MIDI file (deal_notes on the tracks it names)."""
    used = sorted(set(pc['tune']) | set(pc['bass']) | set(pc['harm']))
    return deal_notes({t: midi_notes(path, t) for t in used}, pc)


def write_score(path, name, head, voices, rows):
    """The note text of a piece: '# name: head, N rows', then a voice a line."""
    lines = ['# %s: %s, %d rows' % (name, head, rows)] + ['%s %s' % (v, ' '.join('%d:%d:%d' % x for x in xs)) for v, xs in voices.items()]
    os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
    open(path, 'w').write('\n'.join(lines) + '\n')


def read_score(path):
    """A piece's voices from its note text: ({voice: [(row, pitch, rows)]}, its rows)."""
    lines = open(path).read().split('\n')
    rows = int(lines[0].split()[-2])
    out = {}
    for l in lines[1:]:
        if not l.strip(): continue
        v, *toks = l.split()
        out[v] = [tuple(int(x) for x in t.split(':')) for t in toks]
    return out, rows


def bars(path, bar, b0=0, b1=32, tracks=(1, 2)):
    """Print each bar's notes, the first track's highest and the second's lowest at each start: to pick an excerpt."""
    import mido
    m = mido.MidiFile(path)
    print('%s: %d ticks a beat, %d tracks, %.0f s' % (os.path.basename(path), m.ticks_per_beat, len(m.tracks), m.length))
    for i, t in enumerate(m.tracks):
        sig = [(x.numerator, x.denominator) for x in t if x.type == 'time_signature']
        print('  track %d %r: %d notes%s' % (i, t.name, sum(1 for x in t if x.type == 'note_on' and x.velocity > 0), ', time %s' % sig if sig else ''))
    nm = lambda p: NAMES[p % 12] + str(p // 12 - 1)
    ns = [midi_notes(path, t) for t in tracks]
    for b in range(b0, b1):
        top, low = {}, {}
        for s, _, p in ns[0]:
            if b * bar <= s < (b + 1) * bar: top[s] = max(top.get(s, 0), p)
        for s, _, p in ns[1]:
            if b * bar <= s < (b + 1) * bar: low[s] = min(low.get(s, 999), p)
        print('%3d  %s  |  %s' % (b, ' '.join(nm(top[k]) for k in sorted(top))[:90], ' '.join(nm(low[k]) for k in sorted(low))[:50]))


if __name__ == '__main__':
    if len(sys.argv) < 2: sys.exit('usage: python3 tools/devkit/music/score.py file.mid [bar-ticks, default four beats] [from-bar] [to-bar]')
    import mido
    a = sys.argv
    bars(a[1], int(a[2]) if len(a) > 2 else mido.MidiFile(a[1]).ticks_per_beat * 4, int(a[3]) if len(a) > 3 else 0, int(a[4]) if len(a) > 4 else 32)
