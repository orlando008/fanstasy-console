# Lantern Keeper's scores: the notes of the six pieces, read from public domain engravings (MIDI files from the Mutopia Project, found
# in the marmooo/classical-midi-db collection; scores/SOURCES.md has each one) into note text, kept in scores/ (the MIDI files are not):
#   python3 carts/src/lantern-keeper/scores.py <folder with the MIDI files>
# Each piece is an excerpt (from and to a bar), on a grid (ticks to a row). A piano part is dealt out to voices: at each row, the
# notes that start there go to the part's voices from the highest (the right hand: the tune, then its inner voice; the left hand: the
# lowest note is the bass, the rest its chords). A voice holds its note until its own end or the voice's next note. The text a voice:
# one token a note, 'row:pitch:length' (pitch a MIDI number, 60 middle C). audio.py makes the songs from it.
import os, sys
try:
    import mido
except ImportError:
    sys.exit('needs the mido package: pip install mido')

HERE = os.path.dirname(os.path.abspath(__file__))

# name: the MIDI file, the ticks of a row, the excerpt (bars, from 0, to the bar before `to`), the ticks of a bar (the Grieg's metre changes:
# its 'bar' is only a unit of 1152 ticks), and the parts:
# (track, voices from the highest, or 'low' for the bass and then the rest from the highest); 'below': only a note below that is a bass note
# (the Gymnopedie's left hand: a bass note on the first beat, a chord on the second); 'chord:' first: a part whose groups of three
# notes or more are chords (their lowest three to the next three voices) and whose other notes are the tune (the Gymnopedie's right
# hand has both: its chords on the second beat and its tune)
PIECES = {
    'clair': {'file': 'debussy_Ste_Bergamesq_Clair.mid', 'grid': 192, 'bar': 1728, 'from': 0, 'to': 21,
              'parts': [(1, ['lead', 'alto']), (2, ['low:bass', 'tenor'])]},
    'gymnopedie': {'file': 'gymnopedie_1.mid', 'grid': 192, 'bar': 1152, 'from': 0, 'to': 39, 'below': 55,
                   'parts': [(1, ['chord:lead', 'tenor', 'inner', 'third']), (2, ['bass'])]},
    'prelude': {'file': 'wtk1-prelude1.mid', 'grid': 96, 'bar': 1536, 'from': 0, 'to': 16,
                'parts': [(1, ['lead', 'alto']), (2, ['low:bass', 'tenor'])]},
    'gnossienne': {'file': 'no_1.mid', 'grid': 192, 'bar': 1536, 'from': 0, 'to': 16,
                   'parts': [(1, ['lead', 'alto']), (2, ['low:bass', 'tenor', 'inner'])]},
    'chopin': {'file': 'Chop-28-4.mid', 'grid': 192, 'bar': 1536, 'from': 0, 'to': 25,
               'parts': [(1, ['lead']), (2, ['low:bass', 'tenor', 'inner'])]},
    'hjemkomst': {'file': 'Hjemkomst.mid', 'grid': 192, 'bar': 1152, 'from': 0, 'to': 32,
                  'parts': [(1, ['lead']), (2, ['alto', 'tenor']), (3, ['low:bass', 'inner'])]},
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


def deal(ns, voices, grid, t0, t1, below=999):
    """The notes between ticks t0 and t1 on the grid, dealt to the voices: {voice: [(row, pitch, rows)]}."""
    by = {}
    for s, d, p in ns:
        if not t0 <= s < t1: continue
        r = round((s - t0) / grid)
        by.setdefault(r, []).append((p, max(1, round(d / grid))))
    out = {v.split(':')[-1]: [] for v in voices}
    for r in sorted(by):
        group = sorted(by[r], key=lambda n: -n[0])                    # highest first
        names = list(voices)
        if names[0].startswith('chord:'):                             # three notes or more at once: the lowest three a chord, the rest the tune
            if len(group) >= 3:
                for v, n in zip(names[1:4], group[-3:][::-1]): out[v].append((r, n[0], n[1]))
                group = group[:-3]
            if group: out['lead'].append((r, group[0][0], group[0][1]))
            continue
        if names[0].startswith('low:'):                               # the lowest note to the bass (if it is below `below`), the rest from the top
            low = min(group, key=lambda n: n[0])
            if low[0] < below: out['bass'].append((r, low[0], low[1])); group = [n for n in group if n is not low]
            names = names[1:]
        for v, n in zip(names, group): out[v].append((r, n[0], n[1]))
    for v in out:                                                     # a note lasts until the voice's next note at most
        xs = out[v]
        out[v] = [(r, p, min(d, xs[k + 1][0] - r) if k + 1 < len(xs) else d) for k, (r, p, d) in enumerate(xs)]
    return out


def main(folder):
    os.makedirs(os.path.join(HERE, 'scores'), exist_ok=True)
    for name, pc in PIECES.items():
        path = os.path.join(folder, pc['file'])
        t0, t1 = pc['from'] * pc['bar'], pc['to'] * pc['bar']
        rows = (t1 - t0) // pc['grid']
        lines = ['# %s: bars %d to %d of %s, %d ticks a row, %d rows' % (name, pc['from'] + 1, pc['to'], pc['file'], pc['grid'], rows)]
        for track, voices in pc['parts']:
            for v, xs in deal(notes(path, track), voices, pc['grid'], t0, t1, pc.get('below', 999)).items():
                lines.append('%s %s' % (v, ' '.join('%d:%d:%d' % x for x in xs)))
        open(os.path.join(HERE, 'scores', name + '.txt'), 'w').write('\n'.join(lines) + '\n')
        print(name, rows, 'rows', '(%.1f patterns)' % (rows / 64), ', '.join('%s %d' % (l.split()[0], len(l.split()) - 1) for l in lines[1:]))


if __name__ == '__main__':
    main(sys.argv[1])
