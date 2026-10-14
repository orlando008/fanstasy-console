"""Song toolkit for NOVA-16 carts: turn bars of chords, a lead line, a bass line, an arpeggio and a
drum pattern into patterns, songs and sound effects (the audio.json that tools/pack.js reads).

    import sys; sys.path.insert(0, '<repo>/tools/devkit/music')
    from kit import *
    a = Audio()
    a.instrument('LEAD', 'pulse25', 0, 10, 8, 8, 6, pan=-0.15)
    ...
    s = a.song(Key('A', MINOR), speed=6)
    bars(s, 16, ['1', '6', '3', '7'], ['A4 - C5 - E5 - A5 -', ...], li='LEAD', drums='drive', bass='1 - - - 5 - - -', upper='arp1')
    s.finish()
    a.effect(2, ['C-5', 'G-5', 'OFF'], 'CHIME')
    a.write(sys.argv[1])

Channels (the voice is fixed by the channel, whatever an instrument's wave says; SPEC 5.1):
  0 pulse   lead              3 saw       arpeggio, chords
  1 pulse   kept for SFX      4 noise     hats or, in a game with an engine sound, kept for that
  2 triangle bass             5 sample    kick and snare (and hats, if channel 4 is kept)
Bars of 16 rows are 4/4 (4 rows a beat), 12 rows are 6/8 or 3/4, 20 rows are 5/4. A song's patterns
are 64 rows, so it needs a whole number of 64 rows (4 bars of 16; 16 bars of 12 make 3 patterns).
Pitch names are 'A4', 'C#5', 'Bb4'; in effects they are 'C-5' style as in the editor. A number
in a line ('1', '3', '5', '8', with ' for an octave up) is a chord tone of that bar's chord.

Level rules learned the hard way (a lead that is loud, wobbly or sharp is what players complain about):
leads are pulse25 or pulse50 at volume 4 to 6 with no vibrato; drums kick 12 and snare 10 of 15; check
the result with `loud.mjs --check` (the lead alone at most 0.07 RMS and 0.75 of the mix, no jump of more than 1.5x where
it enters) and clash.py.
"""
import base64, json, math, random, sys

NAMES = ['C-', 'C#', 'D-', 'D#', 'E-', 'F-', 'F#', 'G-', 'G#', 'A-', 'A#', 'B-']
def nn(m): return NAMES[m % 12] + str(m // 12)
def pitch(name):
    """'A4', 'C#5', 'Bb4' to a note index (C0 = 0)."""
    letter, rest = name[0], name[1:]
    acc = 0
    if rest[0] in '#b': acc = 1 if rest[0] == '#' else -1; rest = rest[1:]
    return int(rest) * 12 + NAMES.index(letter + '-') + acc
MINOR, MAJOR = [0, 2, 3, 5, 7, 8, 10], [0, 2, 4, 5, 7, 9, 11]
ROOTS = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}

# --- Samples: 8-bit signed PCM at 16 kHz (Sample RAM is 16 KB for all of them) -----------------
RATE = 16000
def taper(out, n=64):
    for k in range(n): out[-1 - k] *= k / n   # fade the end so a cut sample does not click
    return out
def kick():
    out, ph = [], 0.0
    for i in range(int(RATE * 0.13)):
        t = i / RATE
        ph += 2 * math.pi * (50 + 120 * math.exp(-t * 28)) / RATE
        v = math.sin(ph) * math.exp(-t * 20)
        if i < 40: v += (1 - i / 40) * 0.5 * (1 if i % 2 else -1)
        out.append(v)
    return taper(out)
def snare():
    rnd = random.Random(7)
    out, ph = [], 0.0
    for i in range(int(RATE * 0.12)):
        t = i / RATE
        ph += 2 * math.pi * 185 / RATE
        out.append(0.55 * math.sin(ph) * math.exp(-t * 36) + 0.75 * (rnd.random() * 2 - 1) * math.exp(-t * 24))
    return taper(out)
def hat(length=0.05, decay=70, seed=3):
    """A hi-hat: high-passed noise. hat(0.05, 70, 3) is closed, hat(0.15, 22, 5) open."""
    rnd = random.Random(seed)
    out, last = [], 0.0
    for i in range(int(RATE * length)):
        t = i / RATE
        w = rnd.random() * 2 - 1
        out.append((w - 0.6 * last) * math.exp(-t * decay))
        last = w
    return taper(out)
def pcm(vals):
    peak = max(abs(v) for v in vals)
    return {'rate': RATE, 'loop': None, 'data': base64.b64encode(bytes((int(round(v / peak * 120)) & 255) for v in vals)).decode()}

def cell(note, i=None, v=None):
    c = {'n': note if isinstance(note, str) else nn(note)}
    if i is not None: c['i'] = i
    if v is not None: c['v'] = v
    return c

# --- Harmony ---------------------------------------------------------------------------------------
class Key:
    def __init__(s, root, scale): s.root, s.scale = ROOTS[root[0]] + (1 if '#' in root else -1 if 'b' in root[1:] else 0), scale
    def chord(s, spec):
        """'1'..'7': a triad on that degree ('+' raises its third, as V in minor). A name such
        as 'Bb', 'G#m' or 'D5' (a bare fifth) is that chord whatever the key. Returns root,
        third, fifth and octave as semitones (0 = C)."""
        if spec[0] in ROOTS:
            r = ROOTS[spec[0]] + (1 if spec[1:2] == '#' else -1 if spec[1:2] == 'b' else 0)
            q = spec[1:].lstrip('#b')
            third = 7 if q == '5' else 3 if q == 'm' else 4
            return [r % 12, r % 12 + third, r % 12 + 7, r % 12 + 12]
        deg = int(spec.rstrip('+')) - 1
        out = []
        for rel in (0, 2, 4, 7):
            d = deg + rel
            semi = s.scale[d % 7] + 12 * (d // 7)
            if spec.endswith('+') and rel == 2: semi += 1
            out.append(s.root + semi)
        return out

# Drums by bar length: (sample channel K kick, S snare, s soft snare; h hat, o open hat).
# Hats go on the sample channel too, on rows with no kick or snare (channel 4 stays free).
DRUMS = {
    16: {'kick': ('K...K...K...K...', '..h...h...h...h.'),
         'basic': ('K...S...K...S...', '..h...h...h...h.'),
         'soft': ('K...s...K...s...', '..h...h...h...h.'),
         'bouncy': ('K..KS...K.K.S...', 'h.hhh.hhh.hhh.ho'),
         'drive': ('K...S.K.K...S...', 'h.h.h.h.h.h.h.h.'),
         'heavy': ('K.K.S..KK.K.S.KK', '..h...o...h...o.'),
         'none': ('................', '................'),
         'march': ('K...S...K...S.SS', 'h...h...h...h...'),
         'funk': ('K..K..S..KK...S.', 'hhhohhhhhhhohhhh'),
         'clank': ('K.K.S..KK.K.S..K', 'h.hhh.hhh.hhh.ho')},
    12: {'gallop': ('K.....S.....', 'h.h.h.h.h.h.'),       # 6/8
         'skip': ('K..K..S.....', 'h.hh.hh.hh.h'),
         'hymn': ('K...s...s...', '..h...h...h.'),         # 3/4
         'waltz': ('K...S...S...', 'h.h.h.h.h.h.')},
    20: {'mars': ('K...K...S...K.K.S...', 'h.h.h.h.h.h.h.h.h.h.'),  # 5/4
         'still': ('K.......................'[:20], '....h.......h.......')},
}

class Audio:
    """The whole audio.json: instruments (by name), samples, patterns, songs and effects."""
    def __init__(s):
        s.instruments, s.I, s.samples, s.patterns, s.songs, s.sfx, s.index = [], {}, [], [], [], [], {}
    def sample(s, vals):
        s.samples.append(pcm(vals)); return len(s.samples) - 1
    def instrument(s, name, wave, a, d, sus, r, vol, vib=(0, 0), pan=None, sample=None):
        """wave: pulse12/25/50/75, triangle, saw, noise, noise-short or sample. a, d, r are frames, sus a level 0-15."""
        out = {'wave': wave, 'a': a, 'd': d, 's': sus, 'r': r, 'vol': vol, 'vib': list(vib), 'pan': pan}
        if sample is not None: out['sample'] = sample
        s.I[name] = len(s.instruments); s.instruments.append(out)
    def song(s, key, speed):
        return Song(s, key, speed)
    def effect(s, speed, notes, inst):
        """An SFX: one note name a row (None to hold, 'OFF' to release), up to 32 rows, `speed` ticks a row."""
        rows = [None] * 32
        for i, note in enumerate(notes):
            if note is None: continue
            rows[i] = {'n': 'OFF'} if note == 'OFF' else {'n': note, 'i': s.I[inst]}
        s.sfx.append({'speed': speed, 'rows': rows}); return len(s.sfx) - 1
    def effect_rows(s, speed, rows):
        """An SFX from ready-made rows (to mix instruments in one effect)."""
        s.sfx.append({'speed': speed, 'rows': rows + [None] * (32 - len(rows))}); return len(s.sfx) - 1
    def write(s, path, songs=None):
        ram = sum(len(base64.b64decode(x['data'])) for x in s.samples)
        assert len(s.patterns) <= 64 and len(s.songs) <= 8 and len(s.sfx) <= 64 and len(s.instruments) <= 32 and ram <= 16384 and len(s.samples) <= 16, \
            (len(s.patterns), len(s.songs), len(s.sfx), len(s.instruments), ram)
        if songs is not None: assert len(s.songs) == songs, len(s.songs)
        json.dump({'instruments': s.instruments, 'patterns': s.patterns, 'songs': s.songs, 'sfx': s.sfx, 'samples': s.samples}, open(path, 'w'), indent=1)
        print('patterns', len(s.patterns), 'instruments', len(s.instruments), 'sfx', len(s.sfx), 'songs', len(s.songs), 'sample bytes', ram)

class Song:
    def __init__(s, audio, key, speed):
        s.audio, s.key, s.speed, s.rows = audio, key, speed, []
    def bar(s, length, chord, lead=None, li='LEAD', grid=2, drums='none', bass=None, bgrid=None, upper=None,
            counter=None, ci='COUNTER', cgrid=None, cbase=48, lv=None, fill=False):
        """One bar. lead/bass/counter: a line of tokens, one per `grid` rows ('-' holds, '.' releases, '1358' chord tones).
        bass: 'long' for one held root. upper: 'pad', 'arp' (every 2 rows) or 'arp1' (every row). fill: the last half
        bar is a snare roll. Instruments are by name: li, ci; BASS, PAD, ARP, KICK, SNARE, HAT, OHAT are expected to exist."""
        I = s.audio.I
        rows = [[None] * 6 for _ in range(length)]
        tones = s.key.chord(chord)
        def line(tokens, g, ch, inst, base=None, v=None):
            toks = tokens.split()
            assert len(toks) * g == length, (tokens, length, g)
            for k, t in enumerate(toks):
                if t == '-': continue
                if t == '.': rows[k * g][ch] = {'n': 'OFF'}; continue
                if t[0] in '1358':   # a chord tone: 1 root, 3 third, 5 fifth, 8 octave; ' an octave up
                    n = tones['1358'.index(t[0])] + base + (12 if t.endswith("'") else 0)
                else: n = pitch(t)
                rows[k * g][ch] = cell(n, I[inst], v)
        if lead: line(lead, grid, 0, li, v=lv)
        if bass:
            if bass == 'long': rows[0][2] = cell(tones[0] + 24, I['BASS'])
            else: line(bass, bgrid or grid, 2, 'BASS', 24)
        if counter: line(counter, cgrid or grid, 3, ci, cbase)
        elif upper == 'pad':
            rows[0][3] = cell(tones[1] + 48, I['PAD']); rows[length // 2][3] = cell(tones[2] + 48, I['PAD'])
        elif upper in ('arp', 'arp1'):
            seq = [0, 1, 2, 3, 2, 1]
            for k, r in enumerate(range(0, length, 1 if upper == 'arp1' else 2)):
                rows[r][3] = cell(tones[seq[k % 6]] + 48, I['ARP'])
        smp, noi = DRUMS[length][drums]
        for r in range(length):
            if fill and r >= length // 2:
                if r % 2 == 0: rows[r][5] = cell('C-4', I['SNARE'], 8 + (r - length // 2) // 2)
                continue
            c = smp[r]
            if c == 'K': rows[r][5] = cell('C-4', I['KICK'])
            elif c == 'S': rows[r][5] = cell('C-4', I['SNARE'])
            elif c == 's': rows[r][5] = cell('C-4', I['SNARE'], 7)
            h = noi[r]   # hats share the drum channel, so they only fill rows without a kick or snare
            if rows[r][5] is None and h in 'ho': rows[r][5] = cell('C-4', I['HAT' if h == 'h' else 'OHAT'])
        s.rows += rows
    def finish(s):
        """Cut the song into 64-row patterns (the tempo goes on row 0 of each, on channel 1) and add it to the project."""
        a = s.audio
        assert len(s.rows) % 64 == 0, len(s.rows)
        order = []
        for k in range(0, len(s.rows), 64):
            rows = [list(r) for r in s.rows[k:k + 64]]
            rows[0][1] = {'fx': 'F%02X' % s.speed}
            key = json.dumps(rows)
            if key not in a.index:
                a.index[key] = len(a.patterns)
                a.patterns.append({'rows': rows})
            order.append(a.index[key])
        a.songs.append({'order': order, 'loop': 0})
        print('song', len(a.songs) - 1, 'patterns', len(order))

def bars(song, length, chords, leads, **kw):
    """Several bars: one chord each, and a lead line each; any other bar() argument may be a list (one per bar) or a single value."""
    for k, ch in enumerate(chords):
        lead = leads[k] if leads else None
        extra = {key: (v[k] if isinstance(v, list) else v) for key, v in kw.items()}
        song.bar(length, ch, lead, **extra)

def echo(leads, shift=2):
    """A line that repeats the lead `shift` steps later (echoing bells)."""
    out = []
    for l in leads:
        t = l.split()
        out.append(' '.join((['-'] * shift + t)[:len(t)]))
    return out
