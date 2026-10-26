"""A review of a set of frames, the checks a person makes by eye turned into findings the agent can read (the idea is
from the user's AI sprite engine spec, docs/reference/ai-sprite-engine-spec.md, section 10). It does not say a sprite
looks good: it catches what makes one look wrong without anyone seeing it, so the looking (Sheet at 6x, then the Read
tool) can go to what only a person's eye finds.

    from kit import *
    frames = [fig.render(p) for p in fig.animate(WALK, 8)]
    r = review(frames, name='walk', loop=True, height=96, colours=16)
    print(findings_text(r))                      # one line per finding: severity, code, frame, what to do
    assert r['ok']                               # False only for errors; warnings are for a person to weigh

Findings (each {severity, code, frame, message}); a frame is a picture or {palette: picture}:
  error    EMPTY       a frame with nothing in it
  warning  EDGE        visible pixels touch the picture's edge (the figure may be cut off: a sprite's canvas needs room)
           SMALL       under 1 % of the picture is visible
           SPECKLE     over 15 % of the pixels are in clusters of one or two (noise: dither, stray dots)
           COLOURS     more colours than `colours` in one frame
           HEIGHT      the figure's height is over 15 % off `height` (poses that lean or crouch are not flagged: the
                       tallest frame is what is compared)
           IDENTICAL   two frames next to each other are the same picture (an animation that stalls)
           FEET        for animations that stay on the ground (ground=True, the default): the lowest visible row jumps by
                       more than `jump` px between frames (feet that hop); with smooth=True (an idle, where the feet
                       should stay put) the middle of the lowest rows moving sideways counts too (a walk's feet swing)
           BOUNDS      the visible box changes size by more than 25 % between frames, when `smooth` is True (an idle)
  info     BOX         every frame's visible box (x, y, w, h), with the totals in the report's 'frames'
The loop's last frame is compared with its first when loop=True.
"""


def _px(f):
    """The visible pixels of a frame: {(x, y)} and its width and height."""
    layers = list(f.values()) if isinstance(f, dict) else [f]
    w, h = layers[0].w, layers[0].h
    return {(x, y) for im in layers for y in range(im.h) for x in range(im.w) if im.px[y][x]}, w, h


def _key(f):
    layers = list(f.values()) if isinstance(f, dict) else [f]
    return tuple(im.key() for im in layers)


def review(frames, name='', loop=False, height=None, colours=24, ground=True, jump=3, smooth=False, speckle_limit=0.15):
    """Review frames (see the module's header). Returns {'name', 'ok', 'findings': [...], 'frames': [...]}."""
    from draw import speckle
    out, info = [], []
    add = lambda sev, code, i, msg: out.append({'severity': sev, 'code': code, 'frame': i, 'message': msg})
    boxes = []
    for i, f in enumerate(frames):
        pts, w, h = _px(f)
        if not pts:
            add('error', 'EMPTY', i, 'nothing is drawn in this frame')
            boxes.append(None); info.append({'frame': i, 'box': None}); continue
        xs, ys = [p[0] for p in pts], [p[1] for p in pts]
        box = (min(xs), min(ys), max(xs) - min(xs) + 1, max(ys) - min(ys) + 1)
        boxes.append((box, pts))
        n = len(pts)
        layers = list(f.values()) if isinstance(f, dict) else [f]
        cols = {(k, im.px[y][x]) for k, im in enumerate(layers) for (x, y) in pts if im.px[y][x]}
        sp = max(speckle(im) for im in layers)
        info.append({'frame': i, 'box': box, 'pixels': n, 'colours': len(cols), 'speckle': round(sp, 3)})
        if min(xs) == 0 or min(ys) == 0 or max(xs) == w - 1 or max(ys) == h - 1:
            add('warning', 'EDGE', i, 'visible pixels touch the picture edge (box %s in %d x %d): give the canvas more room' % (box, w, h))
        if n < 0.01 * w * h: add('warning', 'SMALL', i, 'only %d visible pixels (%.1f %% of the picture)' % (n, 100 * n / (w * h)))
        if sp > speckle_limit: add('warning', 'SPECKLE', i, '%.0f %% of the pixels are in clusters of one or two: noise, or dither that should be a flat tone' % (100 * sp))
        if len(cols) > colours: add('warning', 'COLOURS', i, '%d colours in the frame (the target is %d)' % (len(cols), colours))
    if height is not None:
        hs = [b[0][3] for b in boxes if b]
        if hs and abs(max(hs) - height) > 0.15 * height:
            add('warning', 'HEIGHT', None, 'the tallest frame is %d px, the target is %d' % (max(hs), height))
    n = len(frames)
    pairs = [(i, i + 1) for i in range(n - 1)] + ([(n - 1, 0)] if loop and n > 1 else [])
    for a, b in pairs:
        if boxes[a] is None or boxes[b] is None: continue
        if _key(frames[a]) == _key(frames[b]) and not (loop and (a, b) == (n - 1, 0) and n == 2):
            add('warning', 'IDENTICAL', b, 'frame %d is the same picture as frame %d' % (b, a))
        (ba, pa), (bb, pb) = boxes[a], boxes[b]
        if ground:
            fa, fb = _feet(pa), _feet(pb)
            if abs(fa[0] - fb[0]) > jump: add('warning', 'FEET', b, 'the lowest row moves %d px from frame %d (feet hop): keep the soles on one line' % (abs(fa[0] - fb[0]), a))
            elif smooth and abs(fa[1] - fb[1]) > 2 * jump: add('warning', 'FEET', b, 'the feet move %d px sideways from frame %d' % (round(abs(fa[1] - fb[1])), a))
        if smooth and (abs(ba[2] - bb[2]) > 0.25 * ba[2] or abs(ba[3] - bb[3]) > 0.25 * ba[3]):
            add('warning', 'BOUNDS', b, 'the visible box changes from %dx%d to %dx%d' % (ba[2], ba[3], bb[2], bb[3]))
    return {'name': name, 'ok': not any(f['severity'] == 'error' for f in out), 'findings': out, 'frames': info}


def _feet(pts):
    """(the lowest row, the middle x of the lowest 6 rows) of a frame's pixels."""
    low = max(p[1] for p in pts)
    near = [p[0] for p in pts if p[1] > low - 6]
    return low, sum(near) / len(near)


def findings_text(report):
    """The findings of a report as lines: 'warning FEET frame 3: ...'; a clean report says so."""
    fs = report['findings']
    head = '%s: %d frame(s), %d error(s), %d warning(s)' % (report['name'] or 'review', len(report['frames']),
        sum(f['severity'] == 'error' for f in fs), sum(f['severity'] == 'warning' for f in fs))
    return '\n'.join([head] + ['  %-7s %-9s %s %s' % (f['severity'], f['code'], ('frame %d:' % f['frame']) if f['frame'] is not None else 'all:', f['message']) for f in fs])
