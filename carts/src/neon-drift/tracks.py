# Neon Drift's tracks, as music: each is a key, four chords (a bar each), an arpeggio, a bass figure, an eight-bar lead and a form
# (the sections, the parts that play in each and how dense its lights are on each level). audio.py compiles them into songs
# (audio.json) and into the charts (rom/charts.bin), so the lights and the music cannot disagree (spec sections 5.1, 5.5).
#
# A bar is 16 rows (4 a beat). A row lasts `speed` frames (60 ticks a second), so the note on row r sounds r * speed frames
# after the song starts. Channels: 0 lead, 1 arpeggio, 2 bass, 3 pad, 4 hats, clap and snare rolls, 5 kick; the tempo goes on
# row 0 of channel 7 (kit.Song.finish); effects use 6 and 7.
import os, sys, math
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../../tools/devkit/music'))
from kit import *

# The diamond (code.js; spec 5.3): its top speed in angle units (256 a turn) a frame. The charts never ask for a jump it cannot make.
VMAX, ACC = 3.2, 0.4
LEVELS = ('CHILL', 'DRIVE', 'OVERDRIVE')
STEP = (22, 13, 7)           # how far round the rim the next light is (units), on each level, before the melody's wiggle
WIGGLE = (3.0, 2.0, 1.2)     # units a semitone the pitch moves it
SECTION_KINDS = ('intro', 'groove', 'build', 'drop', 'break', 'rise', 'outro')

# Parts of a section: K kick, H hats, C clap, B bass, A arpeggio, a soft arpeggio, P pad, L lead, R a snare roll in the last bar,
# Q a snare roll over the whole section (quarters, eighths, then sixteenths), X a crash on the first beat.
# Lights: (chill, drive, overdrive) rows between lights (0: none). The lights fall on the rows the parts play.
FORM = [
    ('intro', 4, 'KH', (0, 0, 0)),
    ('groove', 4, 'KHBa', (4, 4, 2)),
    ('build', 8, 'KHCBAPR', (4, 2, 2)),
    ('drop', 8, 'KHCBAPLX', (4, 2, 1)),
    ('break', 8, 'PLa', (8, 4, 2)),
    ('rise', 4, 'PLAQ', (4, 2, 2)),
    ('drop', 16, 'KHCBAPLX', (4, 2, 1)),
    ('outro', 4, 'KHP', (0, 0, 0)),
]


class Track:
    def __init__(s, title, speed, key, chords, arp, bass, lead, form=FORM, echo=(6, 5, 5, 9), loop=None):
        """arp: 16 chord-tone tokens (a bar of sixteenths: '1', '3', '5', '8', "3'" an octave up); bass: 16 tokens ('1' the root,
        '5' the fifth, '-' nothing, '.' release); lead: 8 bars of 8 tokens (eighths: chord tones, '-' hold, '.' release)."""
        s.loop, s.title, s.speed, s.key, s.chords, s.arp, s.bass, s.lead, s.form, s.echo = loop, title, speed, Key(*key), chords, arp.split(), bass.split(), [l.split() for l in lead], form, echo
        assert len(s.arp) == 16 and len(s.bass) == 16 and len(s.lead) == 8 and all(len(l) == 8 for l in s.lead), title
        s.bars = sum(f[1] for f in form)

    def tone(s, chord, tok, base):
        t = s.key.chord(chord)
        return t['1358'.index(tok[0])] + base + (12 * tok.count("'"))

    def build(s, a):
        """The song's rows, and the events the charts follow: {row: (part, pitch)} for the arp, the lead, the bass and the kick."""
        I, rows, ev = a.I, [], {'A': {}, 'L': {}, 'B': {}, 'K': {}, 'P': {}}
        bar, before = 0, ''
        for kind, n, parts, _ in s.form:
            for b in range(n):
                ch = s.chords[bar % 4]
                r = [[None] * 8 for _ in range(16)]
                R0 = bar * 16
                if 'K' in parts:
                    for q in (0, 4, 8, 12): r[q][5] = cell('C-4', I['KICK']); ev['K'][R0 + q] = s.tone(ch, '1', 36)
                if 'H' in parts:
                    for q in range(1, 16, 2): r[q][4] = cell('C-4', I['HAT'])
                    for q in (2, 6, 10, 14): r[q][4] = cell('C-4', I['OHAT'])
                if 'C' in parts:
                    for q in (4, 12): r[q][4] = cell('C-4', I['CLAP'])
                if 'X' in parts and b % 8 == 0: r[0][4] = cell('C-4', I['CRASH'])
                roll = ('R' in parts and b == n - 1) or 'Q' in parts
                if roll:
                    step = 4 if ('Q' in parts and b == 0) else 2 if ('Q' in parts and b == 1) else 1
                    for q in range(0, 16, step): r[q][4] = cell('C-4', I['SNARE'], min(15, 6 + (b * 16 + q) * 9 // (n * 16) if 'Q' in parts else 6 + q // 2))
                if 'B' in parts:
                    for q, t in enumerate(s.bass):
                        if t == '.': r[q][2] = {'n': 'OFF'}
                        elif t != '-': p = s.tone(ch, t, 24); r[q][2] = cell(p, I['BASS']); ev['B'][R0 + q] = p
                if 'A' in parts or 'a' in parts:
                    for q, t in enumerate(s.arp):
                        p = s.tone(ch, t, 48); r[q][1] = cell(p, I['ARP'], None if 'A' in parts else 9); ev['A'][R0 + q] = p
                if 'P' in parts and (b == 0 or s.chords[bar % 4] != s.chords[(bar - 1) % 4]):
                    r[0][3] = cell(s.tone(ch, '3', 36), I['PAD']); ev['P'][R0] = s.tone(ch, '1', 36)
                if 'L' in parts:
                    for k, t in enumerate(s.lead[b % 8]):
                        if t == '-': continue
                        if t == '.': r[k * 2][0] = {'n': 'OFF'}; continue
                        p = s.tone(ch, t, 36); r[k * 2][0] = cell(p, I['LEAD']); ev['L'][R0 + k * 2] = p
                if b == 0:                                   # a held lead or pad stops where its section ends
                    for part, c in (('L', 0), ('P', 3)):
                        if part in before and part not in parts and r[0][c] is None: r[0][c] = {'n': 'OFF'}
                rows += r; bar += 1
            before = parts
        return rows, ev

    def song(s, a):
        S = a.song(s.key, s.speed, echo=s.echo)
        S.rows, s.ev = s.build(a)
        S.finish(loop=s.loop)

    def sections(s):
        """[(row, kind index)] at the start of each section."""
        out, row = [], 0
        for kind, n, _, _ in s.form:
            out.append((row, SECTION_KINDS.index(kind))); row += n * 16
        return out

    def lights(s, level):
        """The chart of a level: [(frame, angle 0-255, pitch)], from the rows the section's parts play on its grid.
        The angle: a step round the rim in the phrase's direction (it turns back every four bars), moved by how far the pitch moved,
        and limited to what the diamond can do in the frames between (spec 5.5)."""
        out, row = [], 0
        ang, last_f, last_p, dirn = 0.0, None, None, 1
        for si, (kind, n, parts, grids) in enumerate(s.form):
            g = grids[level]
            for q in range(row, row + n * 16):
                if q % 64 == 0 and q: dirn = -dirn
                if not g or q % g: continue
                # what this light follows: the arpeggio at sixteenths and eighths, the kick or the lead on beats, the pad in a break
                pitch = None
                for src in (('A', 'L', 'B', 'K', 'P') if g <= 2 else ('K', 'L', 'B', 'A', 'P')):
                    if q in s.ev[src]: pitch = s.ev[src][q]; break
                if pitch is None: continue
                f = q * s.speed
                if last_f is None: ang = 0.0
                else:
                    df = f - last_f
                    step = dirn * STEP[level] + WIGGLE[level] * (pitch - last_p) * dirn
                    reach = 0.8 * VMAX * df + 16 if df > 2 * VMAX / ACC else 0.25 * ACC * df * df + 16
                    step = max(-min(8, reach), min(reach, step)) if dirn > 0 else min(min(8, reach), max(-reach, step))
                    ang += step
                out.append((f, int(round(ang)) & 255, pitch))
                last_f, last_p = f, pitch
            row += n * 16
        return out


def charts_blob(tracks):
    """rom/charts.bin: a track count, a u16 offset for each track; then for each: the speed, the section count, each section
    (u16 frame, kind), and for each of the three levels a u16 light count and four bytes a light: the frame (u16), the angle, the pitch."""
    body = []
    for t in tracks:
        secs = t.sections()
        b = bytearray([t.speed, len(secs)])
        for row, kind in secs: f = row * t.speed; b += bytes([f & 255, f >> 8, kind])
        for lv in range(3):
            ls = t.lights(lv)
            b += bytes([len(ls) & 255, len(ls) >> 8])
            for f, ang, p in ls: b += bytes([f & 255, f >> 8, ang, p])
        body.append(bytes(b))
    off, head = 1 + 2 * len(tracks), bytearray([len(tracks)])
    for b in body:
        head += bytes([off & 255, off >> 8]); off += len(b)
    return bytes(head) + b''.join(body)


# --- The set list (spec section 6) ---
EVENT_HORIZON = Track('EVENT HORIZON', 7, ('A', MINOR), ['1', '6', '3', '7'],
    "1 5 8 5 3' 5 8 5 1 5 8 5 3' 8 5 8",
    "- - 1 . - - 1 . - - 1 . - - 1 .",
    ["8 - - 5 - - 3' -", "8 - - 5 - - 3 -", "5 - - 3 - - 8 -", "5 - - 8 - - 3' -",
     "8 - - 5 - - 3' -", "3' - - 8 - - 5 -", "5 - - 8 - - 3' -", "8 - 5 - 3 - 5 -"])

TRACKS = [EVENT_HORIZON]
