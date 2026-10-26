# Flow State's music, as notes: each piece is a melody (the notes the pads follow), a bass and a speed; audio.py compiles them into songs
# (audio.json) and into the charts (rom/charts.bin), so the pads and the sound can not disagree.
#
# A melody is text: tokens 'C4:4' (a note and its length in rows), '_:2' (a rest), a bar's worth to a line is a habit, not a rule.
# A row lasts `speed` frames (60 ticks a second, SPEC 5), so the note on row r sounds `r * speed` frames after the song starts.
# Rows of a song are in patterns of 64: a piece is a whole number of them.
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../../tools/devkit/music'))
from kit import *

DIFFS = [('EASY', 18), ('NORMAL', 10), ('HARD', 6)]          # the shortest gap between two pads, in frames (section 5 of the spec)


class Piece:
    def __init__(s, title, composer, speed, beat, eighth, melody, bass, inner='', lead='PLUCK', bassv='BASS', innerv='PLUCK', key=('C', MAJOR), loop=None, echo=(5, 4, 5, 9)):
        """beat: rows to a beat (the easy chart's pads fall on it); eighth: rows to the shortest note the normal chart keeps.
        inner: an accompaniment on channel 1 (not charted). lead, bassv, innerv: the names of the voices (audio.py defines them)."""
        s.title, s.composer, s.speed, s.beat, s.eighth = title, composer, speed, beat, eighth
        s.lead, s.bassv, s.innerv, s.key, s.loop, s.echo = lead, bassv, innerv, key, loop, echo
        s.notes, s.bass, s.inner = parse(melody), parse(bass), parse(inner)
        end = max(r + d for r, _, d in s.notes)                       # the melody sets the length; the accompaniment is cut to it
        s.bass, s.inner = [x for x in s.bass if x[0] < end], [x for x in s.inner if x[0] < end]
        s.rows = max(r + d for r, _, d in s.notes + s.bass + s.inner)
        s.rows += (-s.rows) % 64

    def flags(s):
        """For each melody note, a byte: bit d set if difficulty d (0 easy, 1 normal, 2 hard) has a pad for it, and its length in rows over 8."""
        out, last = [], [-999, -999, -999]
        for r, p, d in s.notes:
            f = 0
            for k, (name, gap) in enumerate(DIFFS):
                ok = [r % s.beat == 0 or d >= s.beat, d >= s.eighth, True][k]
                if ok and (r - last[k]) * s.speed >= gap:
                    f |= 1 << k; last[k] = r
            out.append(f | (min(d, 31) << 3))
        return out


def parse(text):
    """'C4:4 E4:2 _:2' to [(row, note index, length)]; rests only move the row."""
    out, row = [], 0
    for tok in text.split():
        name, d = tok.split(':'); d = int(d)
        if name != '_': out.append((row, pitch(name), d))
        row += d
    return out


def compile_piece(a, piece):
    """Adds the piece to the audio as a song (played once, or looping to the start if it has a loop): the melody on channel 0,
    the accompaniment on channel 1 and the bass on channel 2."""
    S = a.song(Key(*piece.key), piece.speed, echo=piece.echo)
    rows = [[None] * a.channels for _ in range(piece.rows)]
    for r, p, d in piece.notes: rows[r][0] = cell(p, a.I[piece.lead])
    for r, p, d in piece.inner: rows[r][1] = cell(p, a.I[piece.innerv])
    for r, p, d in piece.bass: rows[r][2] = cell(p, a.I[piece.bassv])
    S.rows = rows
    S.finish(loop=piece.loop)


def charts_blob(pieces):
    """rom/charts.bin: a piece count, a u16 offset for each piece, then for each: speed, 0, the note count (u16), and four bytes a note:
    the frame (u16), the pitch, and the flags (the difficulties in bits 0 to 2, the length in rows in bits 3 to 7)."""
    body = []
    for pc in pieces:
        f = pc.flags()
        b = bytearray([pc.speed, 0, len(pc.notes) & 255, len(pc.notes) >> 8])
        for (r, p, d), fl in zip(pc.notes, f):
            fr = r * pc.speed
            b += bytes([fr & 255, fr >> 8, p, fl])
        body.append(bytes(b))
    off, head = 1 + 2 * len(pieces), bytearray([len(pieces)])
    for b in body:
        head += bytes([off & 255, off >> 8]); off += len(b)
    return bytes(head) + b''.join(body)


# --- 0 Scale Run: a test piece for the first step (C major, 112 bpm), quarters, eighths and sixteenths ---
SCALE_RUN = Piece('SCALE RUN', 'TEST', 8, 4, 2,
    ' '.join(['C4:4 E4:4 G4:4 E4:4', 'F4:4 A4:4 C5:4 A4:4', 'G4:2 A4:2 B4:2 C5:2 B4:2 A4:2 G4:2 F4:2', 'E4:4 G4:4 C5:8',
              'D4:1 E4:1 F4:1 G4:1 A4:1 B4:1 C5:1 D5:1 C5:4 G4:4', 'A4:4 F4:4 D4:4 G4:4', 'C5:2 B4:2 A4:2 G4:2 F4:2 E4:2 D4:2 C4:2', 'C4:8 G3:4 C4:4'] * 2),
    ' '.join(['C3:16', 'F3:16', 'C3:16', 'C3:16', 'G3:16', 'F3:16', 'C3:16', 'C3:16'] * 2))



def bars(*pats, times=1):
    """The patterns one after the other (each a text of notes), all repeated `times`."""
    return ' '.join(pats) * 1 if times == 1 else ' '.join(' '.join(pats) for _ in range(times))


# The notes below are written out from the public domain scores, as simplified arrangements: the theme and its repeat, the harmony as a
# bass. Where a stretch is not the score's own (marked "in the style of"), a listener should say so and the text here is changed.

# --- 1 Minuet in G (Petzold, in the Notebook for Anna Magdalena Bach): G major, 3/4, a row an eighth note, 112 bpm ---
MIN_A = ['D5:2 G4:1 A4:1 B4:1 C5:1', 'D5:2 G4:2 G4:2', 'E5:2 C5:1 D5:1 E5:1 F#5:1', 'G5:2 G4:2 G4:2',
         'C5:2 D5:1 C5:1 B4:1 A4:1', 'B4:2 C5:1 B4:1 A4:1 G4:1', 'A4:2 B4:1 A4:1 G4:1 F#4:1', 'G4:6']
MIN_B = ['B5:2 G5:1 A5:1 B5:1 G5:1', 'A5:2 D5:1 E5:1 F#5:1 G5:1', 'A5:2 D5:2 D5:2', 'C5:2 B4:1 A4:1 B4:1 C5:1',
         'C5:2 D5:1 C5:1 B4:1 A4:1', 'B4:2 C5:1 B4:1 A4:1 G4:1', 'A4:2 B4:1 A4:1 G4:1 F#4:1', 'G4:6']
MIN_BASS_A = ['G3', 'G3', 'C3', 'G3', 'C3', 'G3', 'D3', 'G3']
MIN_BASS_B = ['G3', 'D3', 'D3', 'G3', 'C3', 'G3', 'D3', 'G3']
MINUET = Piece('MINUET IN G', 'BACH', 16, 2, 1,
    bars(*MIN_A, *MIN_A, *MIN_B, *MIN_B, *MIN_A),
    ' '.join(f'{n}:6' for n in MIN_BASS_A * 2 + MIN_BASS_B * 2 + MIN_BASS_A), key=('G', MAJOR))

# --- 2 Air on the G String (Bach, Orchestral Suite 3): D major, 4/4, a row a sixteenth, 60 bpm (the melody in the style of the Air) ---
AIR_A = ['F#5:12 E5:2 D5:2', 'E5:8 C#5:4 A4:4', 'D5:12 C#5:2 B4:2', 'C#5:8 A4:8', 'B4:8 D5:4 F#5:4', 'E5:12 D5:2 C#5:2', 'D5:8 B4:4 G4:4', 'A4:16']
AIR_B = ['A5:12 G5:2 F#5:2', 'G5:8 E5:4 C#5:4', 'F#5:12 E5:2 D5:2', 'E5:8 C#5:4 A4:4', 'D5:6 E5:2 F#5:4 G5:4', 'F#5:6 E5:2 D5:4 C#5:4', 'B4:4 C#5:4 D5:4 E5:4', 'D5:16']
AIR_ROOTS_A = ['D3', 'A2', 'B2', 'F#2', 'G2', 'D3', 'G2', 'A2']
AIR_ROOTS_B = ['D3', 'A2', 'B2', 'F#2', 'G2', 'A2', 'G2', 'D3']
AIR = Piece('AIR ON THE G STRING', 'BACH', 15, 4, 2,
    bars(*AIR_A, *AIR_B, *AIR_A),
    ' '.join(' '.join([f'{n}:4'] * 4) for n in AIR_ROOTS_A + AIR_ROOTS_B + AIR_ROOTS_A), lead='STRINGS', bassv='BASS', key=('D', MAJOR))

# --- 3 Fur Elise (Beethoven): A minor, 3/8, a row a sixteenth ---
E_THEME = ['E5:1 D#5:1 E5:1 B4:1 D5:1 C5:1', 'A4:2 _:1 C4:1 E4:1 A4:1', 'B4:2 _:1 E4:1 G#4:1 B4:1']
E_A1 = 'E5:1 D#5:1 ' + ' '.join(E_THEME) + ' C5:2 _:1 E4:1 E5:1 D#5:1'
E_A2 = ' '.join(E_THEME) + ' C5:2 _:1 E4:1 C5:1 B4:1 A4:6'
E_B = ('G4:1 C5:1 D5:1 E5:3 G4:1 F5:1 E5:1 D5:3 G4:1 E5:1 D5:1 C5:3 E4:1 D5:1 C5:1 B4:3 E4:1 E5:1 E4:1 '
       'E5:1 D#5:1 E5:1 D#5:1 E5:1 B4:1')
E_C = ('A4:1 C5:1 E5:1 A5:3 E5:1 C5:1 A4:1 G4:1 B4:1 D5:1 G5:3 D5:1 B4:1 G4:1 F4:1 A4:1 C5:1 F5:3 C5:1 A4:1 F4:1 '
       'E4:1 G#4:1 B4:1 E5:3 D#5:1 E5:1 D#5:1 E5:1 D#5:1 E5:1 B4:1 D5:1 C5:1')
ELISE_M = ' '.join([E_A1, E_A2, E_B, E_A1, E_A2, E_C, E_A1, E_A2, E_B, E_A1, E_A2, 'A4:6'])
ELISE_BASS = ' '.join(f'{n}:6' for n in ['A2', 'A2', 'E3', 'A2', 'A2', 'E3', 'A2', 'E3', 'A2'] * 20)
ELISE = Piece('FUR ELISE', 'BEETHOVEN', 8, 4, 1, ELISE_M, ELISE_BASS, lead='ELEAD', bassv='BASS', key=('A', MINOR))

# --- 4 Moonlight Sonata, first movement (Beethoven): C sharp minor, 4/4 in triplets, a row a sixth of a beat, 54 bpm (the melody in the style of it) ---
MOON_CH = [('C#3', 'G#3', 'C#4', 'E4'), ('C#3', 'G#3', 'C#4', 'E4'), ('B2', 'G#3', 'C#4', 'E4'), ('A2', 'A3', 'C#4', 'E4'),
           ('F#2', 'A3', 'C#4', 'F#4'), ('G#2', 'G#3', 'C#4', 'E4'), ('G#2', 'G#3', 'B3', 'F4'), ('C#3', 'G#3', 'C#4', 'E4')]
MOON_MEL = ['_:24', '_:24',
            'C#5:9 B4:3 C#5:12', 'E5:9 D#5:3 E5:12', 'E5:9 C#5:3 A4:12', 'A4:9 G#4:3 F#4:12', 'G#4:9 A4:3 B4:12', 'B4:9 A4:3 G#4:12', 'G#4:24', 'G#4:24',
            'C#5:9 D#5:3 E5:6 G#5:6', 'G#5:9 F#5:3 E5:6 D#5:6', 'E5:9 C#5:3 A4:6 C#5:6', 'A5:9 G#5:3 F#5:6 E5:6', 'G#5:6 F#5:6 E5:6 D#5:6', 'E5:6 B4:6 G#4:6 B4:6', 'C#5:24', 'C#5:24']
MOON_CH_ALL = MOON_CH * 3
MOONLIGHT = Piece('MOONLIGHT SONATA', 'BEETHOVEN', 11, 6, 3,
    ' '.join(MOON_MEL),
    ' '.join(f'{c[0]}:24' for c in MOON_CH_ALL[:len(MOON_MEL)]),
    inner=' '.join(' '.join(f'{n}:2' for n in c[1:] * 4) for c in MOON_CH_ALL[:len(MOON_MEL)]),
    lead='EPIANO', bassv='BASS', innerv='EPIANO', key=('C#', MINOR))

# --- 5 Badinerie (Bach, Orchestral Suite 2): B minor, 2/4, a row a sixteenth, about 128 bpm (in the style of the Badinerie) ---
BAD_A = ['B4:1 D5:1 F#5:1 B5:1 F#5:1 D5:1 B4:2', 'A4:1 C#5:1 E5:1 A5:1 E5:1 C#5:1 A4:2', 'G4:1 B4:1 D5:1 G5:1 D5:1 B4:1 G4:2',
         'F#4:1 A4:1 C#5:1 F#5:1 C#5:1 A4:1 F#4:2', 'G4:1 A4:1 B4:1 C#5:1 D5:1 E5:1 F#5:1 G5:1', 'F#5:1 E5:1 D5:1 C#5:1 B4:2 B4:2',
         'C#5:2 A4:2 D5:2 B4:2', 'B4:6 _:2']
BAD_B = ['F#5:2 B5:2 F#5:2 B5:2', 'E5:2 A5:2 E5:2 A5:2', 'D5:1 E5:1 F#5:1 G5:1 A5:1 B5:1 A5:1 G5:1', 'F#5:4 D5:4',
         'G5:2 F#5:2 E5:2 D5:2', 'C#5:2 D5:2 E5:2 C#5:2', 'D5:2 B4:2 C#5:2 A#4:2', 'B4:6 _:2']
BAD_ROOTS_A = ['B2', 'A2', 'G2', 'F#2', 'G2', 'D3', 'F#2', 'B2']
BAD_ROOTS_B = ['D3', 'C#3', 'B2', 'D3', 'E3', 'A2', 'F#2', 'B2']
BADINERIE = Piece('BADINERIE', 'BACH', 7, 4, 2,
    bars(*BAD_A, *BAD_A, *BAD_B, *BAD_B, *BAD_A, *BAD_A, *BAD_B),
    ' '.join(f'{n}:4 {n}:4' for n in (BAD_ROOTS_A * 2 + BAD_ROOTS_B * 2 + BAD_ROOTS_A * 2 + BAD_ROOTS_B)), lead='FLUTE', bassv='BASS', key=('B', MINOR))

# --- The title and the map: the Prelude in C (Bach, the Well-Tempered Clavier I), looping; a row a sixteenth ---
PRE = [('C4 E4 G4 C5 E5', 'C3'), ('C4 D4 A4 D5 F5', 'C3'), ('B3 D4 G4 D5 F5', 'B2'), ('C4 E4 G4 C5 E5', 'C3'),
       ('C4 E4 A4 E5 A5', 'C3'), ('C4 D4 F#4 A4 D5', 'C3'), ('B3 D4 G4 D5 G5', 'B2'), ('B3 C4 E4 G4 C5', 'B2'),
       ('A3 C4 E4 G4 C5', 'A2'), ('D3 A3 D4 F#4 C5', 'D3'), ('G3 B3 D4 G4 B4', 'G2'), ('G3 Bb3 E4 G4 C#5', 'G2'),
       ('F3 A3 D4 A4 D5', 'F2'), ('F#3 C4 D4 A4 D#5', 'F#2'), ('G3 B3 D4 G4 F4', 'G2'), ('C3 E3 G3 C4 E4', 'C2')]
def pre_bar(n):
    a, b, c, d, e = n.split()
    return ' '.join(f'{x}:1' for x in [a, b, c, d, e, c, d, e] * 2)
PRELUDE = Piece('PRELUDE IN C', 'BACH', 7, 4, 2, ' '.join(pre_bar(n) for n, _ in PRE), ' '.join(f'{r}:16' for _, r in PRE), loop=0, key=('C', MAJOR))

PIECES = [SCALE_RUN, MINUET, AIR, ELISE, MOONLIGHT, BADINERIE]
