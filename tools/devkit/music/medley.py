"""Songs made of pieces in turn (a medley), from note text (score.py): for a game with long stretches of play, where one
short loop wears thin. Each piece is arranged on its own (which voice plays on which channel, with which instrument),
starts a pattern and sets its own speed there, so pieces of different tempos sit in one song, and a piece used in two
songs is the same patterns: a reprise (a game's theme coming back in each act) costs no patterns.

    from kit import *
    from medley import Medley
    a = Audio(chip=2)
    ... instruments ...
    m = Medley(a, 'carts/src/my-game/scores')
    theme = m.piece(['theme'], 9, {'lead': (0, 'BOX', 12), 'bass': (1, 'STR', 0)}, tick=('TOCK', 'TICK', 6))
    m.song([m.piece(['march'], 6, {...}), m.piece(['menuet'], 8, {...}), theme], echo=(5, 4, 5, 9))
    m.song([theme])                                # the title: the same patterns again

piece(names, speed, parts, tick=None, slow=None):
  names   scores played one after another without a gap, as one piece (a tune and its repeat)
  speed   ticks a row for this piece
  parts   {voice: (channel, instrument name, semitones[, volume 0-15])}; 'lead@2' is a second part from the voice
          'lead' (a doubling an octave down on another instrument). A volume scales the instrument's own: 15 is the
          instrument as it is.
  tick    (first instrument, second, every-rows[, channel 5]): a clock's two sounds in turn (the first a G, the
          second the C above), on their own channel
  slow    a speed for each of the piece's patterns in place of `speed` (a music box running down: [12, 13, 15])
A note that ends before its voice's next one is let go (OFF). A piece's rows are made up to whole patterns, so keep an
excerpt's length close to a multiple of 64 rows, or the gap before the next piece is long.
song(pieces, echo=None, loop=0) adds the song and returns its length in frames (a game that rests its music after a
whole pass needs it; tools/devkit/music/loud.mjs times a medley by each row's speed).
"""
import json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kit import MAJOR, Key, cell
from score import read_score


class Medley:
    def __init__(s, audio, folder):
        """audio: the kit's Audio (chip=2); folder: where the cart keeps its note text (<name>.txt)."""
        assert audio.chip == 2, 'a medley needs Audio(chip=2): the speed is set on channel 7'
        s.a, s.folder, s.frames = audio, folder, []

    def piece(s, names, speed, parts, tick=None, slow=None):
        a = s.a
        played, base = [], 0
        for name in names:
            voices, n = read_score(os.path.join(s.folder, name + '.txt'))
            played.append((voices, base)); base += n
        total = -(-base // 64) * 64
        rows = [[None] * 8 for _ in range(total)]
        for voices, off in played:
            for key, (ch, inst, vs, *vol) in parts.items():
                assert 0 <= ch <= 6, 'channel 7 carries the speed'
                notes = voices.get(key.split('@')[0], [])
                for k, (r, p, d) in enumerate(notes):
                    r += off
                    if r >= total: break
                    rows[r][ch] = cell(p + vs - 12, a.I[inst], *vol)                        # (MIDI 60 is C4: the chip's C-4 is index 48)
                    nxt = notes[k + 1][0] + off if k + 1 < len(notes) else total
                    if r + d < nxt and r + d < total: rows[r + d][ch] = {'n': 'OFF'}
        if tick:
            tock, tick_i, every, ch = (*tick, 5)[:4]
            for r in range(0, base, every): rows[r][ch] = cell(84 if (r // every) % 2 else 79, a.I[tick_i if (r // every) % 2 else tock])
        speeds = slow or [speed] * (total // 64)
        assert len(speeds) == total // 64, 'slow needs a speed for each of the piece\'s %d patterns' % (total // 64)
        return rows, speeds

    def song(s, pieces, echo=None, loop=0):
        a = s.a
        tune = a.song(Key('C', MAJOR), pieces[0][1][0], echo=echo)       # (for its echo; the patterns are made here)
        order, frames = [], 0
        for rows, speeds in pieces:
            for k, sp in enumerate(speeds):
                pat = [list(r) for r in rows[k * 64:(k + 1) * 64]]
                pat[0][7] = {'fx': 'F%02X' % sp}
                key = json.dumps(pat)
                if key not in a.index:
                    a.index[key] = len(a.patterns)
                    a.patterns.append({'rows': pat})
                order.append(a.index[key]); frames += 64 * sp
        out = {'order': order, 'loop': loop}
        if tune.echo: out['echo'] = dict(zip(('delay', 'feedback', 'volume', 'tone'), tune.echo))
        a.songs.append(out)
        s.frames.append(frames)
        return frames
