"""Rush D: an original escalating piece for the NOVA-16 sound chip (8 channels, 81 s, 19 patterns, 10 instruments).
A calm tune in D major that keeps speeding up and filling in: thirds, sixteenth ornaments, an arpeggio storm (speed 4
to 2), runs a semitone a frame and hammered chords, a sudden silence, the tune again quietly, a last run and a big chord.
For a rhythm game, a boss fight or a timer running out. It uses all 8 channels (the tempo is on channel 7), so a
cart that plays SFX over it will mute a part while one plays.

    python3 tools/devkit/music/songs/rush_d.py carts/src/<name>/audio.json

It writes a whole audio.json with this one song (song 0); to put it beside a cart's own songs, copy what it does
into the cart's audio.py.
"""
import os, sys, random
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
from kit import *
random.seed(7)
a = Audio()
a.instrument('LEAD', 'pulse50', 0, 10, 9, 4, 5, pan=-0.1, echo=4)
a.instrument('HARM', 'pulse50', 0, 12, 7, 4, 4, pan=0.25, echo=4)
a.instrument('BASS', 'triangle', 0, 20, 10, 3, 13)
a.instrument('ARP', 'pulse12', 0, 6, 4, 2, 4, pan=0.3, echo=6)
a.instrument('ARP2', 'saw', 0, 6, 3, 2, 3, pan=-0.3, echo=6)
a.instrument('CHORD', 'pulse12', 0, 10, 5, 3, 4)
a.instrument('KICK', 'sample', 0, 0, 15, 0, 12, sample=a.sample(kick()))
a.instrument('SNARE', 'sample', 0, 0, 15, 0, 10, sample=a.sample(snare()))
a.instrument('HAT', 'noise-short', 0, 3, 0, 1, 4)
a.instrument('GLISS', 'pulse50', 0, 4, 6, 1, 4, echo=6)
I = a.I

rows = []  # each: [speed, cells(8)]
offs = {}
def block(n, speed):
    start = len(rows)
    for _ in range(n): rows.append([speed, [None]*8])
    return start
def put(r, ch, midi, inst, v=None, dur=None):
    if inst in ('LEAD', 'HARM'): midi -= 12
    while midi > 100: midi -= 12
    rows[r][1][ch] = cell(midi-12, I[inst], v)
    if dur: offs[(r+dur, ch)] = True

D,E,Fs,G,A_,B,Cs = 74,76,78,79,81,83,85
theme = [(Fs,1),(Fs,.5),(G,.5),(A_,1),(Fs,1),(B,1),(A_,.5),(G,.5),(Fs,2),
         (E,1),(Fs,.5),(G,.5),(A_,1),(D+12,1),(Cs,1),(B,1),(A_,2),
         (Fs,1),(Fs,.5),(G,.5),(A_,1),(B,1),(D+12,1),(B,.5),(A_,.5),(G,2),
         (E,1),(G,1),(Fs,1),(E,1),(D,3),(A_-12,1)]
chords = [[50,54,57],[55,59,62],[57,61,64],[50,54,57],[47,50,54],[55,59,62],[57,61,64],[50,54,57]]
pcs = {2,4,6,7,9,11,1}
def step(m, s):
    x = m
    for _ in range(abs(s)):
        x += 1 if s > 0 else -1
        while x % 12 not in pcs: x += 1 if s > 0 else -1
    return x
def melody(r0, R):
    out, c = [], r0
    for m, b in theme: n = int(b*R); out.append((c, m, n)); c += n
    return out
def drums(r0, bars, R, full=True):
    for b in range(bars*4):
        r = r0 + b*R
        rows[r][1][5] = cell(48, I['KICK' if b % 2 == 0 else 'SNARE'])
        if full: rows[r + R//2][1][6] = cell(72, I['HAT'])

# A: calm. speed 9, 4 rows a beat
R = 4; r0 = block(8*16, 9)
for c, m, n in melody(r0, R): put(c, 0, m, 'LEAD', 10, n-1)
for i, ch in enumerate(chords):
    put(r0+i*16, 2, ch[0]-12, 'BASS', 10, 15)
    for k, x in enumerate(ch): put(r0+i*16+8, 3+k, x+12, 'CHORD', 8, 7)

# B: thirds, oom-pah, a light beat. speed 7
r0 = block(8*16, 7)
for c, m, n in melody(r0, R): put(c, 0, m, 'LEAD', 12, n-1); put(c, 1, step(m, -2), 'HARM', 11, n-1)
for i, ch in enumerate(chords):
    for k in range(8):
        r = r0+i*16+k*2
        if k % 2 == 0: put(r, 2, ch[0]-12, 'BASS', None, 2)
        else:
            for j, x in enumerate(ch): put(r, 3+j, x+12, 'CHORD', 9, 1)
for b in range(32): rows[r0+b*4][1][5] = cell(48, I['KICK']) if b % 4 == 0 else (cell(48, I['SNARE']) if b % 4 == 2 else None)

# C: every note an ornament of sixteenths. speed 5
r0 = block(8*16, 5)
for c, m, n in melody(r0, R):
    pat = [0, 1, 0, -1]
    for k in range(n): put(c+k, 0, step(m, pat[k % 4]), 'LEAD')
    put(c, 1, m-12, 'HARM', 12, n-1)
for i, ch in enumerate(chords):
    for k in range(8): put(r0+i*16+k*2, 2, ch[0]-12+12*(k % 2), 'BASS', None, 2)
    for k in range(16): put(r0+i*16+k, 3, ch[k % 3]+12*(1 + k//3 % 2), 'ARP', 9)
drums(r0, 8, R)

# D: the storm. two arpeggio channels, tempo up every few bars
for bar in range(16):
    speed = 4 if bar < 6 else 3 if bar < 12 else 2
    r0 = block(16, speed); ch = chords[bar % 8]
    arp = [ch[j % 3] + 12*(j//3) for j in range(9)]; arp = arp + arp[-2:0:-1]
    for k in range(16):
        put(r0+k, 3, arp[k % len(arp)]+12, 'ARP')
        put(r0+k, 4, arp[(k+5) % len(arp)]+24, 'ARP2')
    for b in range(4):
        top = ch[(b+bar) % 3]+24
        put(r0+b*4, 0, top, 'LEAD', None, 3); put(r0+b*4, 1, top-12, 'HARM', None, 3)
        put(r0+b*4, 2, ch[0]-12, 'BASS', None, 2); put(r0+b*4+2, 2, ch[0], 'BASS', None, 2)
    for b in range(4):
        rows[r0+b*4][1][5] = cell(48, I['KICK' if b % 2 == 0 else 'SNARE'])
        rows[r0+b*4+2][1][5] = cell(48, I['KICK']) if bar >= 12 else None
        for h in (0, 2): rows[r0+b*4+h][1][6] = cell(72, I['HAT'])

# E: chaos. runs a semitone a row at speed 1, clusters under them
for rep in range(6):
    lo, hi = 45+rep*2, 100-rep
    run = list(range(lo, hi)) if rep % 2 == 0 else list(range(hi, lo, -1))
    r0 = block(len(run), 1)
    for k, m in enumerate(run):
        put(r0+k, 0, m, 'GLISS')
        if k % 3 == 0: put(r0+k, 1, m-12, 'HARM', 9)
    for k in range(0, len(run), 6):
        base = random.choice([50, 55, 57, 62])
        put(r0+k, 2, base-12, 'BASS'); put(r0+k, 3, base+7, 'CHORD'); put(r0+k, 4, base+12, 'CHORD'); put(r0+k, 6, base+16, 'CHORD')
        rows[r0+k][1][5] = cell(48, I['KICK' if (k//6) % 2 == 0 else 'SNARE'])
# hammered chords, the gaps shrinking
gaps = [8,8,7,7,6,6,6,5,5,5,4,4,4,4,3,3,3,3,3,2,2,2,2,2,2,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
r0 = block(sum(gaps), 2); r = r0
for k, g in enumerate(gaps):
    ch = chords[(k//5) % 8]
    put(r, 0, ch[2]+24, 'LEAD'); put(r, 1, ch[0]+24, 'HARM'); put(r, 2, ch[0]-12, 'BASS')
    put(r, 3, ch[1]+12, 'CHORD'); put(r, 4, ch[2]+12, 'CHORD'); put(r, 6, ch[0]+12, 'CHORD')
    rows[r][1][5] = cell(48, I['SNARE' if k % 2 else 'KICK'])
    r += g
# silence... then the theme, quietly, as if nothing happened
r0 = block(14, 6)
for chn in range(8):
    if chn != 5: offs[(r0, chn)] = True
r0 = block(36, 10)
for c, m, n in melody(r0, 4)[:9]: put(c, 0, m, 'LEAD', 8, n-1)
put(r0, 2, 38, 'BASS', 8, 30)
# one last run, then a huge chord
run = list(range(38, 100)); r0 = block(len(run), 1)
for k, m in enumerate(run): put(r0+k, 0, m, 'GLISS'); put(r0+k, 1, m-12, 'HARM', 10)
r0 = block(48, 6)
for chn, (m, ins) in enumerate([(86, 'LEAD'), (78, 'HARM'), (38, 'BASS'), (66, 'CHORD'), (69, 'CHORD'), (None, None), (74, 'CHORD'), (90, 'ARP')]):
    if m: put(r0, chn, m, ins, None, 44)
rows[r0][1][5] = cell(48, I['KICK'])

for (r, ch), _ in offs.items():
    if r < len(rows) and rows[r][1][ch] is None: rows[r][1][ch] = {'n': 'OFF'}
while len(rows) % 64: rows.append([6, [None]*8])
order = []
for p in range(len(rows)//64):
    chunk = rows[p*64:(p+1)*64]; prev = None; out = []
    for j, (sp, cells) in enumerate(chunk):
        if sp != prev:
            cells[7] = dict(cells[7] or {}, fx='F%02X' % sp)
        prev = sp; out.append(cells)
    a.patterns.append({'rows': out}); order.append(len(a.patterns)-1)
a.order(order, loop=0, echo=(6, 5, 5, 8))
a.write(sys.argv[1])
