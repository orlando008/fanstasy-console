"""HUD lettering and pieces for the art kit (docs/dev/snes-picture.md, part B): the chunky, outlined, gradient-filled
text of SNES title screens and fighting-game HUDs, life bars and window frames.

    from kit import *
    title = big_text('ROUND 1', pal.gold, scale=2, outline=pal.ink, shadow=pal.shadow)   # an Img, to use as a sprite or tiles
    bar = hud_bar(96, 8, pal.life, fill=0.7, frame=pal.ink, empty=pal.dark)
    box = frame(120, 64, pal.metal, fill=pal.panel)                                      # a bevelled window

  big_text(text, ramp, scale, outline, shadow, bevel)  the console's font scaled up smoothly (Scale2x keeps diagonals round),
                                                       filled with a gradient down the ramp (light at the top), an inner
                                                       bevel, a 1 px outline and a drop shadow
  hud_bar(w, h, ramp, fill, frame, empty)              a bar shaded like a tube, `fill` (0 to 1) of it full
  frame(w, h, ramp, fill, border)                      a window frame: a bevelled border lit from the upper left
  scale2x(img), smooth_scale(img, k)                   pixel-art upscaling that rounds diagonals (k 2 or 4; others nearest)
"""


def scale2x(img):
    """Scale2x (EPX): twice the size, diagonals rounded instead of stepped."""
    from kit import Img
    W, H = img.w, img.h
    out = Img(W * 2, H * 2)
    g = img.get
    for y in range(H):
        for x in range(W):
            P, A, B, C, D = g(x, y), g(x, y - 1), g(x + 1, y), g(x - 1, y), g(x, y + 1)
            e0 = A if C == A and C != D and A != B else P
            e1 = B if A == B and A != C and B != D else P
            e2 = C if D == C and D != B and C != A else P
            e3 = D if B == D and B != A and D != C else P
            out.px[2 * y][2 * x], out.px[2 * y][2 * x + 1], out.px[2 * y + 1][2 * x], out.px[2 * y + 1][2 * x + 1] = e0, e1, e2, e3
    return out


def smooth_scale(img, k):
    """k times the size: Scale2x once (k 2) or twice (k 4); any other k by repeating pixels."""
    from kit import Img
    if k == 1: return img.copy()
    if k == 2: return scale2x(img)
    if k == 4: return scale2x(scale2x(img))
    out = Img(img.w * k, img.h * k)
    for y in range(out.h):
        for x in range(out.w): out.px[y][x] = img.px[y // k][x // k]
    return out


def big_text(text, ramp, scale=2, outline=None, shadow=None, bevel=True, spacing=0):
    """Text in the console's 8 x 8 font, `scale` times bigger (2 and 4 smoothed), filled with a gradient down `ramp`
    (its light end at the top), with an inner bevel (light on the upper left edges, dark on the lower right), a 1 px
    outline in colour `outline` and a drop shadow in colour `shadow` (indices). Returns an Img just big enough."""
    from kit import Img
    from texture import level
    w = len(text) * (8 + spacing)
    mask = Img(w, 8)
    for k, ch in enumerate(text):
        mask.text(ch, k * (8 + spacing), 0, 1)
    big = smooth_scale(mask, scale)
    pad = 1 + (1 if shadow is not None else 0) + (scale // 2 if shadow is not None else 0)
    out = Img(big.w + 2 + pad, big.h + 2 + pad)
    ys = [y for y in range(big.h) if any(big.px[y])]
    top, bot = (min(ys), max(ys)) if ys else (0, 1)
    n = len(ramp)
    inside = lambda x, y: 0 <= x < big.w and 0 <= y < big.h and big.px[y][x]
    for y in range(big.h):
        for x in range(big.w):
            if not big.px[y][x]: continue
            t = 1 - (y - top) / max(1, bot - top)                     # 1 at the top, 0 at the bottom
            c = level(ramp, 0.15 + 0.8 * t, x, y, 0.15)
            if bevel:
                if not inside(x - 1, y) or not inside(x, y - 1): c = ramp[-1]
                elif not inside(x + 1, y) or not inside(x, y + 1): c = ramp[max(0, n // 3 - 1)]
            out.px[y + 1][x + 1] = c
    if outline is not None:
        o = out.copy()
        for y in range(out.h):
            for x in range(out.w):
                if out.px[y][x]: continue
                if any(out.get(x + dx, y + dy) for dx in (-1, 0, 1) for dy in (-1, 0, 1)): o.px[y][x] = outline
        out = o
    if shadow is not None:
        d = max(1, scale // 2)
        s = out.copy()
        for y in range(out.h):
            for x in range(out.w):
                if not out.px[y][x] and out.get(x - d, y - d): s.px[y][x] = shadow
        out = s
    return out


def hud_bar(w, h, ramp, fill=1.0, frame=None, empty=None):
    """A life or power bar: the full part shaded like a tube lying left to right (light along the top), the rest in
    `empty`, a 1 px border in `frame` (indices)."""
    from kit import Img
    from texture import level
    out = Img(w, h)
    x0, y0, x1, y1 = (1, 1, w - 1, h - 1) if frame is not None else (0, 0, w, h)
    full = x0 + round((x1 - x0) * max(0.0, min(1.0, fill)))
    for y in range(y0, y1):
        t = (y - y0 + 0.5) / (y1 - y0) * 2 - 1
        I = 0.9 - 0.75 * (t + 1) / 2 + (0.1 if t < -0.4 else 0)
        for x in range(x0, x1):
            out.px[y][x] = level(ramp, I, x, y, 0.1) if x < full else (empty or 0)
    if frame is not None:
        for x in range(w): out.px[0][x] = out.px[h - 1][x] = frame
        for y in range(h): out.px[y][0] = out.px[y][w - 1] = frame
    return out


def frame(w, h, ramp, fill=None, border=3):
    """A window frame `border` px wide, bevelled and lit from the upper left (a ramp of 3 or more steps), with the inside
    filled with `fill` (an index; leave it out for a transparent inside, or use a colour 192-255 and blend() for a
    see-through window)."""
    from kit import Img
    out = Img(w, h)
    n = len(ramp)
    for y in range(h):
        for x in range(w):
            d = min(x, y, w - 1 - x, h - 1 - y)
            if d >= border:
                if fill is not None: out.px[y][x] = fill
                continue
            if d == 0 or d == border - 1: c = ramp[0]                                  # dark lines out and in
            elif x - d <= y - d and (x == d or y == d) and x < w - 1 - d and y < h - 1 - d: c = ramp[-1]
            else:
                lit = (x == d and y < h - 1 - d) or (y == d and x < w - 1 - d)
                c = ramp[-1] if lit else ramp[max(1, n // 2)]
            out.px[y][x] = c
    return out
