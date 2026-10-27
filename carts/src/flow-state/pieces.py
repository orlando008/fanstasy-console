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
    def __init__(s, title, composer, speed, beat, eighth, melody, bass, inner='', lead='PLUCK', bassv='BASS', innerv='PLUCK', key=('C', MAJOR), loop=None, echo=(5, 4, 5, 9), extra_mod=None, extra_src='inner'):
        """beat: rows to a beat (the easy chart's pads fall on it); eighth: rows to the shortest note the normal chart keeps.
        inner: an accompaniment on channel 1; extra_mod = ((modulus, (rows,)), ...) for easy, normal and hard: the inner notes that start at those rows of each
        modulus are pads too (the Moonlight's triplets, under a melody too slow to play alone). lead, bassv, innerv: the names of the voices (audio.py defines them)."""
        s.title, s.composer, s.speed, s.beat, s.eighth = title, composer, speed, beat, eighth
        s.lead, s.bassv, s.innerv, s.key, s.loop, s.echo, s.extra_mod, s.extra_src = lead, bassv, innerv, key, loop, echo, extra_mod, extra_src
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
                ok = [(r % s.beat == 0 or d >= s.beat) and d >= s.eighth, d >= s.eighth, True][k]     # easy is a part of normal
                if ok and (r - last[k]) * s.speed >= gap:
                    f |= 1 << k; last[k] = r
            out.append(f | (min(d, 31) << 3))
        return out


    def chart(s):
        """The pads, in time order: (row, pitch, flags, channel): the melody's (flags above), then the inner notes the extra_mod rules add that
        keep their distance from the melody's pads of the same difficulty."""
        out = [(r, p, fl, 0) for (r, p, d), fl in zip(s.notes, s.flags())]
        if s.extra_mod:
            kept = [[r for (r, p, d), fl in zip(s.notes, s.flags()) if fl >> k & 1] for k in range(3)]
            flags = {}
            for k, (name, gap) in enumerate(DIFFS):
                last = -999
                for r, p, d in (s.inner if s.extra_src == 'inner' else s.bass):
                    if r % s.extra_mod[k][0] not in s.extra_mod[k][1]: continue
                    near = [m for m in kept[k] if abs(m - r) * s.speed < gap]
                    if near or (r - last) * s.speed < gap: continue
                    flags[(r, p, d)] = flags.get((r, p, d), 0) | 1 << k; last = r
            out += [(r, p, fl | (min(d, 31) << 3), 1 if s.extra_src == 'inner' else 2) for (r, p, d), fl in flags.items()]
        return sorted(out)


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
        ch = pc.chart()
        b = bytearray([pc.speed, 0, len(ch) & 255, len(ch) >> 8])
        for r, p, fl, _ in ch:
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



def score(name):
    """The note text the importer (import_score.py) wrote for a part of a piece: scores/<name>."""
    return open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'scores', name)).read().strip()


def rows_of(text):
    return sum(int(t.split(':')[1]) for t in text.split())


def pad_to(text, rows):
    """The text, ended with a rest so it lasts `rows` rows (a part shorter than the melody stays in step)."""
    n = rows - rows_of(text)
    return text + (' _:%d' % n if n > 0 else '')


# The five stretches are the public domain scores as the Mutopia Project engraved them (the Badinerie is John Hamm's 1995 sequence),
# read from their MIDI files by import_score.py (the notes are in scores/): the melody is the top voice of the right hand or the flute, the
# bass the bottom voice of the left hand. The speed (frames to a row) sets the tempo; it is ours, close to the usual one.

# --- 1 Minuet in G (Petzold, Notebook for Anna Magdalena Bach, BWV Anh. 114): G major, 3/4, a row an eighth note, the 32 bars and the first 8 again ---
MINUET = Piece('MINUET IN G', 'BACH', 16, 2, 1, score('minuet.mel') + ' ' + score('minuet.mel2'),
    pad_to(score('minuet.bass'), 192) + ' ' + score('minuet.bass2'), key=('G', MAJOR))

# --- 2 Air on the G String (Bach, Orchestral Suite 3, BWV 1068): D major, 4/4, a row a sixteenth, about 64 bpm ---
AIR = Piece('AIR ON THE G STRING', 'BACH', 14, 4, 2, score('air.mel'), score('air.bass'), lead='STRINGS', key=('D', MAJOR),
    extra_src='bass', extra_mod=((4, (0,)), (2, (0,)), (2, (0,))))      # the bass's steady pulse is the pads' beat: each beat on easy, each eighth on normal and hard

# --- 3 Fur Elise (Beethoven, WoO 59): A minor, 3/8, a row a sixteenth; the whole piece ---
ELISE = Piece('FUR ELISE', 'BEETHOVEN', 11, 4, 2, score('elise.mel'), score('elise.bass'), lead='ELEAD', key=('A', MINOR))

# --- 4 Moonlight Sonata, first movement (Beethoven, Op. 27 no. 2): C sharp minor, 4/4, a row a twelfth of a beat (the triplets are 4 rows), 60 bpm; bars 4 to 27 ---
MOONLIGHT = Piece('MOONLIGHT SONATA', 'BEETHOVEN', 5, 12, 6, score('moon.mel'), score('moon.bass'), inner=score('moon.inner'),
    lead='EPIANO', bassv='BASS', innerv='EPIANO', key=('C#', MINOR), extra_mod=((12, (0,)), (12, (0, 8)), (4, (0,))))      # easy: each beat; normal: the beat and the third triplet; hard: every triplet

# --- 5 Badinerie (Bach, Orchestral Suite 2, BWV 1067): B minor, 2/4, a row a sixteenth, about 112 bpm; the flute's line ---
BADINERIE = Piece('BADINERIE', 'BACH', 8, 4, 2, score('badinerie.mel'), score('badinerie.bass'), lead='FLUTE', key=('B', MINOR))

# --- The title and the map: the Prelude in C (Bach, the Well-Tempered Clavier I, bars 1 to 24), looping; a row a sixteenth; the bass is the first note of each half bar an octave down ---
def prelude_bass(mel):
    out, row = [], 0
    for t in mel.split():
        n, d = t.split(':')
        if row % 8 == 0 and n != '_': out.append('%s%d:8' % (n[:-1], int(n[-1]) - 1))
        row += int(d)
    return ' '.join(out)
PRELUDE = Piece('PRELUDE IN C', 'BACH', 7, 4, 2, score('prelude.mel'), prelude_bass(score('prelude.mel')), lead='SOFTPLUCK', loop=0, key=('C', MAJOR))

PIECES = [SCALE_RUN, MINUET, AIR, ELISE, MOONLIGHT, BADINERIE]
