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
    def __init__(s, title, composer, speed, beat, eighth, melody, bass):
        """beat: rows to a beat (the easy chart's pads fall on it); eighth: rows to the shortest note the normal chart keeps."""
        s.title, s.composer, s.speed, s.beat, s.eighth = title, composer, speed, beat, eighth
        s.notes, s.bass = parse(melody), parse(bass)
        s.rows = max(r + d for r, _, d in s.notes + s.bass)
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


def compile_piece(a, piece, lead, bassv, echo=(5, 4, 5, 9), key=None):
    """Adds the piece to the audio as a song (played once): the melody on channel 0, the bass on channel 2."""
    S = a.song(key or Key('C', MAJOR), piece.speed, echo=echo)
    rows = [[None] * a.channels for _ in range(piece.rows)]
    for r, p, d in piece.notes: rows[r][0] = cell(p, a.I[lead])
    for r, p, d in piece.bass: rows[r][2] = cell(p, a.I[bassv])
    S.rows = rows
    S.finish(loop=None)


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

PIECES = [SCALE_RUN]
