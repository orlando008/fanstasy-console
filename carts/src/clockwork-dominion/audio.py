# Clockwork Dominion's audio: carts/src/clockwork-dominion/audio.json.
#   python3 carts/src/clockwork-dominion/audio.py carts/src/clockwork-dominion/audio.json
# Eight songs, each a few pieces in turn: Marco's own theme (an original waltz for a music box, scores.py) and public
# domain classics in their own notes (scores.py read them from public domain engravings into scores/; SOURCES.md there),
# arranged for a music box and a few sampled instruments over a soft clock tick, and the effects numbered as SFX in
# code.js (spec section 11). Rules (playbook section 5): leads quiet, no vibrato; songs on channels 0 to 5, effects on 6
# and 7 (code.js takes turns). No drums but the tick: it is a game to think in.
#   0 the title       Marco's theme, on the music box, then its variation (a celesta over the box's arpeggio)
#   1 Act I           Tchaikovsky, March of the Wooden Soldiers; Haydn, the Menuet of the Sonata in G (Hob. XVI:27),
#                     on the music box; Marco's theme
#   2 Paulo's rest    Brahms, Wiegenlied: the lullaby, music box over strings
#   3 Act II          Grieg, In the Hall of the Mountain King, plucked; Grieg, Wedding Day at Troldhaugen, a reed over
#                     plucked chords; the theme's variation
#   4 Act III         Debussy, Clair de lune (a flute over an electric piano, strings beneath); Debussy, the first
#                     Arabesque (a harp's triplets under an electric piano); Marco's theme
#   5 the Rust        Grieg, Troldtog (March of the Dwarfs): plucked and quick
#   6 Dominion        Bach, The Art of Fugue, the canon at the octave; the theme's variation, grand, with strings
#   7 Rest, credits   Satie, Gymnopedie No. 1; Marco's theme on the music box alone, slowing as it runs down
# Each loops (code.js rests after each pass: PASS there is each song's length in frames, which this prints). Each piece
# starts a pattern, with its own speed (the F effect on its patterns' first row), so a reprise of the theme in another
# song is the same patterns, and free. After a change: node tools/devkit/music/loud.mjs carts/clockwork-dominion.nova
# --check, and node tools/devkit/music/sfx.mjs carts/clockwork-dominion.nova 6 for the effects.
import json, math, os, random, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../../tools/devkit/music'))
from kit import *
from samples import additive, looped, oneshot

HERE = os.path.dirname(os.path.abspath(__file__))
a = Audio(chip=2)

# --- The music box: a comb's steel tine, bright at the strike (high partials that die quickly), then a pure ring ---
P, att = 32, []
for c in range(24):
    t = c / 24
    att += additive([1, 0.1 * (1 - t), 0, 0.32 * (1 - t) ** 2, 0, 0.16 * (1 - t) ** 3, 0, 0.08 * (1 - t) ** 4], P)
box = looped(att, additive([1, 0.04], P), P)
BOX = a.sample(box['vals'], box['rate'], box['loop'])
a.instrument('MBOX', 'sample', 0, 40, 0, 14, 7, (0, 0), -0.05, BOX, 9, 'exp')
a.instrument('MBOXL', 'sample', 0, 55, 0, 16, 12, (0, 0), 0.15, BOX, 8, 'exp')
# --- The clock's tick: a tiny click, a burst of noise around a high ping ---
rnd, tick = random.Random(4), []
for i in range(int(8000 * 0.06)):
    tt = i / 8000
    tick.append((math.sin(2 * math.pi * 1800 * tt) * 0.8 + (rnd.random() * 2 - 1) * 0.6) * math.exp(-tt * 80))
tk = oneshot(tick, 8000)
TICK = a.sample(tk['vals'], tk['rate'], tk['loop'])
a.instrument('TICK', 'sample', 0, 0, 15, 0, 5, (0, 0), 0.25, TICK, 2, 'lin')
a.instrument('TOCK', 'sample', 0, 0, 15, 0, 4, (0, 0), -0.25, TICK, 2, 'lin')
# --- A harp: a plucked string, bright at first, then a round tone (the Arabesque's triplets) ---
P, att = 32, []
for c in range(32):
    t = c / 32
    att += additive([1, 0.5 * (1 - t) + 0.1, 0.32 * (1 - t) ** 1.5, 0.2 * (1 - t) ** 2, 0.12 * (1 - t) ** 2.5, 0.07 * (1 - t) ** 3], P)
hp = looped(att, additive([1, 0.12, 0.04], P), P)
HARP = a.sample(hp['vals'], hp['rate'], hp['loop'])
a.instrument('HARP', 'sample', 0, 48, 0, 14, 9, (0, 0), 0.2, HARP, 7, 'exp')
# --- A reed: odd partials, like a clarinet, breathed in (Troldhaugen's tune) ---
rd = looped(additive([1, 0.06, 0.5, 0.04, 0.28, 0.02, 0.14, 0, 0.07], P) * 2, additive([1, 0.05, 0.45, 0.03, 0.25, 0.02, 0.12, 0, 0.06], P), P)
REED = a.sample(rd['vals'], rd['rate'], rd['loop'])
a.instrument('REED', 'sample', 3, 12, 11, 8, 4, (0, 0), -0.1, REED, 5, 'exp')

# --- The other voices of the songs ---
a.voice('CEL', 'celesta', 5, 0.1)
a.voice('CELQ', 'celesta', 9, -0.1)
a.voice('PLUCK', 'pluck', 9, -0.05)
a.voice('PLUCKL', 'pluck', 14, 0.1)
a.voice('BASS', 'bass', 8, 0.0)
a.voice('STR', 'strings', 9, 0.0)
a.voice('STRQ', 'strings', 7, 0.0)
a.voice('FLUTE', 'flute', 4, -0.1)
a.voice('EP', 'epiano', 10, 0.15)
a.voice('EPQ', 'epiano', 9, -0.15)
# --- The voices of the effects ---
a.voice('FXBELL', 'celesta', 9, 0.0)
a.voice('FXBOX', 'celesta', 7, 0.0, d=30)
a.voice('FXMAR', 'marimba', 10, 0.0)
a.voice('FXTAP', 'marimba', 11, 0.0, d=6)
a.voice('FXTHUD', 'tom', 9, 0.0)
a.voice('FXLOW', 'strings', 7, 0.0)
a.voice('FXCHOIR', 'choir', 7, 0.0, a=6)
a.voice('FXBRASS', 'brass', 6, 0.0, a=2)


def read(name):
    """The voices of a piece from scores/<name>.txt: {voice: [(row, pitch, rows)]} and its rows."""
    lines = open(os.path.join(HERE, 'scores', name + '.txt')).read().split('\n')
    rows = int(lines[0].split()[-2])
    out = {}
    for l in lines[1:]:
        if not l.strip(): continue
        v, *toks = l.split()
        out[v] = [tuple(int(x) for x in t.split(':')) for t in toks]
    return out, rows


def piece(names, speed, parts, tick=0, slow=None):
    """A piece of a song: the scores named played one after another, each voice on a channel with an instrument (parts:
    {voice: (channel, instrument, semitones[, volume 0-15])}; 'lead@2' is a second part from the same voice); a note that ends before its
    voice's next one is let go (OFF). tick: a clock's tick on channel 5 every that many rows (tick and tock in turn).
    Its rows are made up to whole patterns; slow: a speed for each of them (a ritardando), or all at `speed`."""
    played, base = [], 0
    for name in names:
        voices, n = read(name)
        played.append((voices, base)); base += n
    total = -(-base // 64) * 64
    rows = [[None] * 8 for _ in range(total)]
    for voices, off in played:
        for key, (ch, inst, vs, *vol) in parts.items():
            notes = voices.get(key.split('@')[0], [])
            for k, (r, p, d) in enumerate(notes):
                r += off
                if r >= total: break
                rows[r][ch] = cell(p + vs - 12, a.I[inst], *vol)                            # (MIDI 60 is C4: the chip's C-4 is index 48)
                nxt = notes[k + 1][0] + off if k + 1 < len(notes) else total
                if r + d < nxt and r + d < total: rows[r + d][ch] = {'n': 'OFF'}
    if tick:
        for r in range(0, base, tick): rows[r][5] = cell(84 if (r // tick) % 2 else 79, a.I['TICK' if (r // tick) % 2 else 'TOCK'])
    return rows, slow or [speed] * (total // 64)


def song(pieces, echo):
    """A song: its pieces in turn, then back to the first. Each pattern starts with its piece's speed (F on channel 7),
    so the same piece in two songs is the same patterns. Prints the song's length in frames (code.js PASS)."""
    S = a.song(Key('C', MAJOR), pieces[0][1][0], echo=echo)
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
    tune = {'order': order, 'loop': 0}
    if S.echo: tune['echo'] = dict(zip(('delay', 'feedback', 'volume', 'tone'), S.echo))
    a.songs.append(tune)
    print('song %d: %d patterns in order, %d frames (%.0f s)' % (len(a.songs) - 1, len(order), frames, frames / 60))

SHOP, ROOM, HALL, SPACE = (5, 4, 5, 9), (6, 5, 6, 8), (10, 6, 7, 7), (14, 9, 8, 6)
THEME = piece(['marco'], 9, {'lead': (0, 'MBOX', 12), 'bass': (1, 'STR', 12), 'bass@2': (4, 'MBOXL', 0, 5), 'inner': (2, 'CELQ', 0), 'tenor': (3, 'CELQ', 0)}, tick=6)
VARIATION = piece(['marco2'], 9, {'lead': (0, 'CEL', 12), 'bass': (1, 'STR', 12), 'inner': (2, 'MBOX', 0, 10)}, tick=6)
song([THEME, VARIATION], SHOP)
song([piece(['soldiers'], 6, {'lead': (0, 'MBOX', 0, 13), 'lead@2': (4, 'CELQ', -12), 'bass': (1, 'PLUCKL', 0), 'inner': (2, 'CELQ', 0), 'tenor': (3, 'CELQ', 0)}, tick=4),
      piece(['menuet'], 8, {'lead': (0, 'MBOX', 0, 9), 'bass': (1, 'PLUCKL', 0), 'bass@2': (4, 'STRQ', 12), 'inner': (2, 'CELQ', 0), 'tenor': (3, 'CELQ', 0)}, tick=6),
      THEME], SHOP)
song([piece(['lullaby', 'lullaby'], 22, {'lead': (0, 'MBOX', 0), 'inner': (1, 'CELQ', 0), 'tenor': (2, 'CELQ', 0), 'bass': (3, 'STRQ', 0)}, tick=6)], ROOM)
song([piece(['mountain'], 13, {'lead': (0, 'PLUCK', 12), 'bass': (1, 'BASS', 12), 'inner': (2, 'STRQ', 12), 'lead@2': (3, 'PLUCKL', 0)}, tick=2),
      piece(['troldhaugen'], 8, {'lead': (0, 'REED', 0), 'bass': (1, 'BASS', 12), 'inner': (2, 'PLUCK', 0), 'tenor': (3, 'PLUCKL', 0)}, tick=4),
      VARIATION], HALL)
song([piece(['clair'], 12, {'lead': (0, 'FLUTE', 0, 10), 'inner': (1, 'EP', 0), 'tenor': (2, 'EPQ', 0), 'bass': (3, 'STR', 0)}),
      piece(['arabesque'], 15, {'lead': (0, 'FLUTE', 0, 9), 'lead@2': (2, 'HARP', -12), 'bass': (1, 'HARP', 0)}),
      THEME], SPACE)
song([piece(['dwarfs'], 4, {'lead': (0, 'PLUCK', 0), 'bass': (1, 'BASS', 0), 'inner': (2, 'STRQ', 0), 'tenor': (3, 'PLUCKL', 0)})], HALL)
song([piece(['canon'], 12, {'lead': (0, 'CEL', 0), 'lead@2': (4, 'STR', -12), 'bass': (1, 'STR', 0), 'bass@2': (3, 'CELQ', 12), 'inner': (2, 'CELQ', 0)}, tick=3),
      piece(['marco2'], 10, {'lead': (0, 'CEL', 12), 'lead@2': (4, 'STR', 0), 'inner': (2, 'MBOX', 0), 'bass': (1, 'STR', 0)}, tick=3)], HALL)
song([piece(['gymno'], 28, {'lead': (0, 'MBOX', 0), 'inner': (1, 'EPQ', 0), 'tenor': (2, 'EPQ', 0), 'bass': (3, 'STR', 0)}),
      piece(['marco'], 12, {'lead': (0, 'MBOX', 12), 'bass': (1, 'MBOXL', 12, 6)}, slow=[12, 13, 15])], ROOM)

# --- Effects: the order is the SFX table in code.js ---
a.effect(1, ['E-5', 'OFF'], 'FXTAP')                                       # 0 move: a tap
a.effect(2, ['E-6', 'B-6', None, 'OFF'], 'FXBOX')                          # 1 select: two tines
a.effect(2, ['B-5', 'E-5', None, 'OFF'], 'FXBOX')                          # 2 pause
a.effect(2, ['C-3', None, 'OFF'], 'FXTHUD')                                # 3 no: a dull thunk
a.effect(3, ['C-6', 'E-6', 'G-6', 'C-7', None, None, 'OFF'], 'FXBELL')     # 4 an invention made: a bright chime
a.effect(1, ['G-6', None, 'OFF'], 'FXMAR')                                 # 5 a cog by hand: a clink
a.effect(3, ['G-5', None, 'D-6', None, None, 'OFF'], 'FXBOX')              # 6 a story line: a soft music box
a.effect(2, ['A-6', 'E-6', None, 'OFF'], 'FXMAR')                          # 7 bought: a coin
a.effect(3, ['C-6', 'G-6', 'E-6', 'C-7', 'G-6', 'C-7', None, None, 'OFF'], 'FXBELL')   # 8 a milestone: a carillon
a.effect(1, ['C-5', 'C-5', 'D-5', 'D-5', 'E-5', 'OFF'], 'FXTAP')            # 9 a spring wound: a ratchet
a.effect(1, ['E-6', 'C-7', 'E-6', 'C-7', None, 'OFF'], 'FXMAR')            # 10 moths launched: a flutter
a.effect(3, ['C-5', 'E-5', 'G-5', None, 'C-6', None, None, 'OFF'], 'FXBELL')       # 11 a riddle solved: gears meshing, a chord
a.effect(2, ['E-4', 'D#4', None, 'OFF'], 'FXMAR')                          # 12 a riddle wrong: a slip
a.effect(1, ['A-5', 'OFF'], 'FXTAP')                                       # 13 a tab: a higher tap
a.effect(2, ['B-5', None, 'E-5', None, 'OFF'], 'FXTAP')                     # 14 the watch: tick, tock
a.effect(4, ['D-3', 'C#3', None, 'C-3', None, None, 'OFF'], 'FXLOW')       # 15 the Rust: a sinking low string
a.effect(6, ['C-4', 'G-4', 'C-5', None, 'E-5', None, 'G-5', None, None, 'OFF'], 'FXCHOIR')    # 16 a new act: a rising choir
a.effect(4, ['G-4', 'C-5', 'E-5', None, 'G-5', None, None, 'OFF'], 'FXBRASS')      # 17 a place integrated: a fanfare

a.write(sys.argv[1], songs=8)
