# Clockwork Dominion's audio: carts/src/clockwork-dominion/audio.json.
#   python3 carts/src/clockwork-dominion/audio.py carts/src/clockwork-dominion/audio.json
# Eight songs: public domain classics in their own notes (scores.py read them from public domain engravings into
# scores/; SOURCES.md there), arranged for a music box and a few sampled instruments over a soft clock tick, and the
# effects numbered as SFX in code.js (spec section 11). Rules (playbook section 5): leads quiet, no vibrato; songs on
# channels 0 to 5, effects on 6 and 7 (code.js takes turns). No drums but the tick: it is a game to think in.
#   0 the title       Mozart, Ah, vous dirai-je, Maman: the theme (by hand) and a variation (the engraving), music box
#   1 Act I           Tchaikovsky, March of the Wooden Soldiers: a toy march for the shop, music box and celesta
#   2 Paulo's rest    Brahms, Wiegenlied: the lullaby, music box over strings
#   3 Act II          Grieg, In the Hall of the Mountain King: plucked strings over a bass, ticking
#   4 Act III         Debussy, Clair de lune: a flute over a soft electric piano, strings beneath: the stars
#   5 the Rust        Grieg, Troldtog (March of the Dwarfs): plucked and quick
#   6 Dominion        Bach, The Art of Fugue, the canon at the octave: celesta and pluck in a mechanical tick
#   7 Rest, credits   Satie, Gymnopedie No. 1: the music box, slowly
# Each loops (code.js rests between loops). After a change: node tools/devkit/music/loud.mjs carts/clockwork-dominion.nova
# --check, and node tools/devkit/music/sfx.mjs carts/clockwork-dominion.nova 6 for the effects.
import math, os, random, sys
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


def song(names, speed, parts, echo, tick=0):
    """Pieces played one after another as a song: each voice on a channel with an instrument (parts: {voice: (channel,
    instrument, semitones)}); a note that ends before its voice's next one is let go (OFF). tick: a clock's tick on
    channel 5 every that many rows (tick and tock in turn). Loops to the start."""
    played, base = [], 0
    for name in names:
        voices, n = read(name)
        played.append((voices, base)); base += n
    total = -(-base // 64) * 64
    rows = [[None] * 8 for _ in range(total)]
    for voices, off in played:
        for key, (ch, inst, vs) in parts.items():
            notes = voices.get(key.split('@')[0], [])
            for k, (r, p, d) in enumerate(notes):
                r += off
                if r >= total: break
                rows[r][ch] = cell(p + vs - 12, a.I[inst])                                  # (MIDI 60 is C4: the chip's C-4 is index 48)
                nxt = notes[k + 1][0] + off if k + 1 < len(notes) else total
                if r + d < nxt and r + d < total: rows[r + d][ch] = {'n': 'OFF'}
    if tick:
        for r in range(0, total, tick): rows[r][5] = cell(84 if (r // tick) % 2 else 79, a.I['TICK' if (r // tick) % 2 else 'TOCK'])
    S = a.song(Key('C', MAJOR), speed, echo=echo)
    S.rows = rows
    S.finish(loop=0)

SHOP, ROOM, HALL, SPACE = (5, 4, 5, 9), (6, 5, 6, 8), (10, 6, 7, 7), (14, 9, 8, 6)
song(['theme', 'twinkle'], 9, {'lead': (0, 'MBOX', 0), 'bass': (1, 'MBOXL', 12), 'inner': (2, 'CELQ', 0), 'lead@2': (3, 'CELQ', -12)}, SHOP, tick=8)
song(['soldiers'], 6, {'lead': (0, 'MBOX', 0), 'lead@2': (4, 'CELQ', -12), 'bass': (1, 'PLUCKL', 0), 'inner': (2, 'CELQ', 0), 'tenor': (3, 'CELQ', 0)}, SHOP, tick=4)
song(['lullaby', 'lullaby'], 22, {'lead': (0, 'MBOX', 0), 'inner': (1, 'CELQ', 0), 'tenor': (2, 'CELQ', 0), 'bass': (3, 'STRQ', 0)}, ROOM, tick=6)
song(['mountain'], 13, {'lead': (0, 'PLUCK', 12), 'bass': (1, 'BASS', 12), 'inner': (2, 'STRQ', 12), 'lead@2': (3, 'PLUCKL', 0)}, HALL, tick=2)
song(['clair'], 12, {'lead': (0, 'FLUTE', 0), 'inner': (1, 'EP', 0), 'tenor': (2, 'EPQ', 0), 'bass': (3, 'STR', 0)}, SPACE)
song(['dwarfs'], 4, {'lead': (0, 'PLUCK', 0), 'bass': (1, 'BASS', 0), 'inner': (2, 'STRQ', 0), 'tenor': (3, 'PLUCKL', 0)}, HALL)
song(['canon'], 12, {'lead': (0, 'CEL', 0), 'lead@2': (4, 'STR', -12), 'bass': (1, 'STR', 0), 'bass@2': (3, 'CELQ', 12), 'inner': (2, 'CELQ', 0)}, HALL, tick=3)
song(['gymno'], 28, {'lead': (0, 'MBOX', 0), 'inner': (1, 'EPQ', 0), 'tenor': (2, 'EPQ', 0), 'bass': (3, 'STR', 0)}, ROOM)

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
