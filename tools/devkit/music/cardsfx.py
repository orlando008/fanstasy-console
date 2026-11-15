"""Card sounds for a game's audio.py: a shuffle (a riffle), a deal (a card sliding off the deck), a flip (a snap) and a
place (a card set down on the table). Three short samples (about 4 KB of the 32 KB of Sample RAM) and four effects.

    sys.path.insert(0, '<repo>/tools/devkit/music')       # audio.py already has the music folder on its path
    import cardsfx
    CARD = cardsfx.add(a)        # after the game's own effects: {'shuffle': n, 'deal': n, 'flip': n, 'place': n}

The numbers are the effects' SFX numbers: put them in code.js's SFX table (SFX.shuffle = n ...) and play them with
fx(). Levels (tools/devkit/music/sfx.mjs on channel 6): peaks 0.08 to 0.14, as the starter's own effects; RMS over
sfx.mjs's 0.3 s window 0.004 (the flip, two snaps) to 0.014 (the deal), since they are short. A deal is short enough to
play once a card while dealing a hand (one every 4 frames or more).
"""
import math, random

from kit import pcm, RATE


def _click(seed=11):
    """A card's edge snapping past a thumb: a burst of bright noise, 40 ms."""
    rnd, out, last = random.Random(seed), [], 0.0
    for i in range(int(RATE * 0.04)):
        t = i / RATE
        w = rnd.random() * 2 - 1
        v = w - last; last = w * 0.6                         # high-passed: a click, not a hiss
        out.append(v * math.exp(-t * 90) + 0.3 * math.sin(2 * math.pi * 1900 * t) * math.exp(-t * 220))
    return out


def _swish(seed=5):
    """A card sliding over the cloth: soft noise that swells and falls away, 120 ms."""
    rnd, out, lp = random.Random(seed), [], 0.0
    n = int(RATE * 0.12)
    for i in range(n):
        t = i / n
        lp += (rnd.random() * 2 - 1 - lp) * 0.35            # low-passed: a breath, not a hiss
        env = math.sin(math.pi * min(1, t * 1.6)) ** 2 * (1 - t) ** 0.5
        out.append(lp * env)
    return out


def _thud(seed=9):
    """A card set down: a short, low tap with a little paper on top, 90 ms."""
    rnd, out, lp = random.Random(seed), [], 0.0
    for i in range(int(RATE * 0.09)):
        t = i / RATE
        lp += (rnd.random() * 2 - 1 - lp) * 0.2
        out.append(0.8 * math.sin(2 * math.pi * (180 - 600 * t) * t) * math.exp(-t * 45) + 0.6 * lp * math.exp(-t * 60))
    return out


def add(a):
    """Add the samples, instruments and four effects to the Audio `a` (chip 2). Returns {'shuffle', 'deal', 'flip',
    'place'}: their SFX numbers."""
    assert a.chip == 2, 'card sounds are samples: Audio(chip=2)'
    click, swish, thud = a.sample(_click()), a.sample(_swish()), a.sample(_thud())
    a.instrument('CARD_CLICK', 'sample', 0, 0, 15, 0, 15, sample=click)
    a.instrument('CARD_SWISH', 'sample', 0, 0, 15, 0, 15, sample=swish)
    a.instrument('CARD_THUD', 'sample', 0, 0, 15, 0, 15, sample=thud)
    # the riffle: clicks speeding up, then a last flutter as the halves fall together (the pitch wanders, as cards do)
    riffle = ['C-4', None, 'D-4', None, 'B-3', 'C#4', None, 'D-4', 'C-4', 'D#4', 'C-4', 'D-4', 'C#4', 'D-4', 'E-4', 'D-4',
              'C#4', 'E-4', 'D-4', 'F-4', 'E-4', 'D#4', 'F#4', 'E-4', 'G-4', None, None, 'OFF']
    return {'shuffle': a.effect(2, riffle, 'CARD_CLICK'),
            'deal': a.effect(1, ['D-4', None, None, None, None, None, None, 'OFF'], 'CARD_SWISH'),
            'flip': a.effect(2, ['E-4', 'B-4', None, 'OFF'], 'CARD_CLICK'),
            'place': a.effect(1, ['C-4', None, None, None, None, None, 'OFF'], 'CARD_THUD')}
