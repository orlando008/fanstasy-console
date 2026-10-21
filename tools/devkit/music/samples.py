"""Sampled instruments for the new sound chip (SPEC 5, docs/dev/sound-chip.md), made in code: nothing is recorded.

    from kit import *
    a = Audio(chip=2)
    a.voice('STR', 'strings', 6)            # a sample of the kind 'strings', and an instrument with its envelope
    a.voice('KEYS', 'epiano', 7, echo=8)    # any preset can be changed: vol, pan, echo, a, d, s, r, curve

Every sample is tuned so that it plays the note it is given: a looped one has a whole number of cycles of C4 in its loop
(its rate is 261.63 Hz times the samples in a cycle); a one-shot one (a hit, a drum) is made at its own rate with its
root at C4. The chip reads samples through a Gaussian interpolation, which rounds them off like an SNES's.

  kind      sound                                       bytes   envelope (a d s r, curve, echo)
  strings   an ensemble: three detuned saws, dark       3,072   slow in, held, slow out; echo 6
  choir     'aah': two voices through vowel formants    3,072   slow in, held, slow out; echo 8
  brass     a soft horn whose tone opens as it starts     224   quick, held a little lower
  flute     breath, then a nearly pure tone               544   soft attack, held
  epiano    an electric piano (FM), its bell fades        1,312   struck, dies away over 1.5 s
  bass      a fingered bass, round after the pluck        672   struck, held low
  pluck     a harp or guitar string (Karplus-Strong)      992   struck, dies away
  marimba   wood bars: fundamental and 4th partial        352   struck, short
  celesta   a music box or celesta                        672   struck, rings
  orchhit   the 90s orchestra hit: a chord and a crash  2,000   one shot
  tom       a tuned tom: plays at any pitch             1,600   one shot
  clap      a hand clap                                 1,650   one shot
  crash     a cymbal                                    3,600   one shot
  kick, snare, hat, ohat: the kit's drums (kick(), snare(), hat())
"""
import math, random

C4 = 261.6256

def _clean(vals):
    peak = max(abs(v) for v in vals) or 1
    return [v / peak for v in vals]

def additive(harmonics, P, phases=None):
    """One cycle of P samples from harmonic amplitudes [a1, a2, ...], leaving out any at or over P/2."""
    out = [0.0] * P
    for k, amp in enumerate(harmonics, 1):
        if not amp or 2 * k >= P: continue
        ph = phases[k - 1] if phases else 0.0
        for i in range(P): out[i] += amp * math.sin(2 * math.pi * k * i / P + ph)
    return out

def looped(attack, loop, P):
    """A sample: an attack, then a loop played for as long as the note is held. Rate puts C4 at P samples a cycle."""
    vals = _clean(attack + loop)
    return {'vals': vals, 'loop': [len(attack), len(vals)], 'rate': round(C4 * P)}

def oneshot(vals, rate, taper=64):
    vals = _clean(vals)
    for k in range(min(taper, len(vals))): vals[-1 - k] *= k / taper
    return {'vals': vals, 'loop': None, 'rate': rate}

def saw_harm(n, roll=1.0):
    return [1 / k ** roll for k in range(1, n + 1)]

def ensemble(harm, P, cycles, detune):
    """Voices of the same harmonics a few cycles apart over the loop (a slow chorus), so the loop joins up."""
    n = P * cycles
    out = [0.0] * n
    rnd = random.Random(11)
    for dc in detune:
        ph = [rnd.random() * 2 * math.pi for _ in harm]
        c = cycles + dc
        for k, amp in enumerate(harm, 1):
            if 2 * k * c >= n: continue   # over the sample's Nyquist
            for i in range(n): out[i] += amp * math.sin(2 * math.pi * k * c * i / n + ph[k - 1])
    return out

def strings():
    return looped([], ensemble(saw_harm(10, 1.15), 24, 128, (0, 1, -1)), 24)

def choir():
    # 'aah': formants near 700, 1200 and 2600 Hz over a C4 voice.
    f = lambda hz: math.exp(-((hz - 700) / 180) ** 2) + 0.6 * math.exp(-((hz - 1200) / 220) ** 2) + 0.25 * math.exp(-((hz - 2600) / 300) ** 2)
    harm = [0.35 / k + f(k * C4) for k in range(1, 12)]
    return looped([], ensemble(harm, 24, 128, (0, 1)), 24)

def brass_harm(open_):
    """A horn played softly: the upper harmonics fall away fast (a saw's would pierce: users heard it as blaring).
    open_ 0 to 1 is how far the tone has opened."""
    return [1 / k ** 1.1 * math.exp(-(k - 1) / (2 + 2 * open_)) for k in range(1, 11)]

def brass():
    P, attack = 32, []
    for c in range(6):   # the tone opens over six cycles
        attack += additive(brass_harm(c / 6), P)
    return looped(attack, additive(brass_harm(1), P), P)

def flute():
    P, rnd, attack = 32, random.Random(5), []
    tone = additive([1, 0.2, 0.06], P)
    for c in range(16):
        g = c / 16
        attack += [g * t + (1 - g) * 0.35 * (rnd.random() * 2 - 1) for t in tone]
    return looped(attack, tone, P)

def epiano():
    P, attack = 32, []
    def cyc(index, tine):
        return [math.sin(2 * math.pi * i / P + index * math.sin(2 * math.pi * i / P)) + tine * math.sin(2 * math.pi * 7 * i / P) for i in range(P)]
    for c in range(40):
        t = c / 40
        attack += cyc(0.3 + 2.2 * (1 - t) ** 2, 0.5 * (1 - t) ** 3)
    return looped(attack, cyc(0.3, 0), P)

def bass():
    P, attack = 32, []
    for c in range(20):
        t = c / 20
        attack += additive([1, 0.5, 0.35 * (1 - t), 0.25 * (1 - t) ** 2, 0.15 * (1 - t) ** 2, 0.1 * (1 - t) ** 3], P)
    return looped(attack, additive([1, 0.5], P), P)

def pluck():
    P, rnd = 32, random.Random(3)
    line = [rnd.random() * 2 - 1 for _ in range(P)]
    out = []
    for c in range(31):
        for i in range(P):
            v = 0.5 * (line[i] + line[i - 1]) * 0.996
            line[i] = v
            out.append(v)
    return looped(out[:-P], out[-P:], P)

def marimba():
    P, attack = 32, []
    for c in range(10):
        attack += additive([1, 0, 0, 0.8 * (1 - c / 10) ** 2], P)
    return looped(attack, additive([1], P), P)

def celesta():
    P, attack = 32, []
    for c in range(20):
        t = c / 20
        attack += additive([1, 0.3 * (1 - t), 0.5 * (1 - t) ** 2, 0, 0.3 * (1 - t) ** 3], P)
    return looped(attack, additive([1, 0.1], P), P)

def orchhit():
    rate, rnd = 8000, random.Random(9)
    n, out, ph = int(rate * 0.25), [], [0.0] * 4
    for i in range(n):
        t = i / rate
        v = 0
        for k, ratio in enumerate((1, 1.5, 2, 2.52)):   # root, fifth, octave, tenth
            ph[k] += 2 * math.pi * C4 * ratio / rate
            v += ((ph[k] / (2 * math.pi)) % 1 * 2 - 1) * (0.6 if k == 0 else 0.4)
        v = v * math.exp(-t * 9) + 0.5 * (rnd.random() * 2 - 1) * math.exp(-t * 30)
        out.append(v)
    return oneshot(out, rate)

def tom():
    rate, out, ph = 8000, [], 0.0
    for i in range(int(rate * 0.2)):
        t = i / rate
        ph += 2 * math.pi * C4 * (1 + 0.6 * math.exp(-t * 25)) / rate
        out.append(math.sin(ph) * math.exp(-t * 14))
    return oneshot(out, rate)

def clap():
    rate, rnd, out, last = 11025, random.Random(4), [], 0.0
    for i in range(int(rate * 0.15)):
        t = i / rate
        env = sum(math.exp(-(t - d) * 180) for d in (0, 0.01, 0.02) if t >= d) + 0.4 * math.exp(-t * 25)
        w = rnd.random() * 2 - 1
        out.append((w - 0.7 * last) * env)
        last = w
    return oneshot(out, rate)

def crash():
    rate, rnd, out, last = 8000, random.Random(8), [], 0.0
    for i in range(int(rate * 0.45)):
        t = i / rate
        w = rnd.random() * 2 - 1
        out.append((w - 0.85 * last) * math.exp(-t * 6))
        last = w
    return oneshot(out, rate, 400)

# kind: (generator, preset instrument settings)
SAMPLED = {
    'strings': (strings, dict(a=12, d=0, s=15, r=24, curve='exp', echo=6)),
    'choir': (choir, dict(a=16, d=0, s=15, r=30, curve='exp', echo=8)),
    'brass': (brass, dict(a=2, d=20, s=11, r=10, curve='exp', echo=4)),
    'flute': (flute, dict(a=4, d=10, s=13, r=10, curve='exp', echo=6)),
    'epiano': (epiano, dict(a=0, d=90, s=0, r=20, curve='exp', echo=6)),
    'bass': (bass, dict(a=0, d=60, s=6, r=6, curve='exp', echo=0)),
    'pluck': (pluck, dict(a=0, d=50, s=0, r=12, curve='exp', echo=6)),
    'marimba': (marimba, dict(a=0, d=30, s=0, r=8, curve='exp', echo=4)),
    'celesta': (celesta, dict(a=0, d=60, s=0, r=15, curve='exp', echo=8)),
    'orchhit': (orchhit, dict(a=0, d=0, s=15, r=4, curve='lin', echo=6)),
    'tom': (tom, dict(a=0, d=0, s=15, r=0, curve='lin', echo=2)),
    'clap': (clap, dict(a=0, d=0, s=15, r=0, curve='lin', echo=4)),
    'crash': (crash, dict(a=0, d=0, s=15, r=0, curve='lin', echo=2)),
}
