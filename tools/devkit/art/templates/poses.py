# The fighter's drawn poses, read off the user's model sheet (docs/reference/fighter-model-sheet.png): the guard and the punch
# at the sheet's own pixel grid (the sheet is an upscaled drawing: trace.recover_grid() finds the grid), snapped to the
# sheet's colours, tidied of one- and two-pixel noise and stripped of the pale halo round the figure.
#   python3 tools/devkit/art/templates/poses.py
# writes docs/reference/fighter/<pose>.txt, one character a pixel (trace.BODY_COLOURS).
import os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..', '..'))
sys.path.insert(0, os.path.join(HERE, '..'))
from trace import recover_grid, strip_halo, BODY_COLOURS

BOXES = {'guard': (550, 470, 890, 990), 'punch': (900, 470, 1440, 990)}      # in the sheet
SIZES = [4.4 + 0.1 * k for k in range(25)]                                    # the cell sizes to try


def tidy(rows, size=2):
    """Clusters of up to `size` pixels in a different colour from their neighbours take the colour most of them have
    (keeps the outline: 'o' is never replaced)."""
    g = [list(r) for r in rows]; H, W = len(g), max(len(r) for r in g)
    g = [r + ['.'] * (W - len(r)) for r in g]
    seen = set()
    for y in range(H):
        for x in range(W):
            c = g[y][x]
            if c in '.o' or (x, y) in seen: continue
            comp, st = [], [(x, y)]; seen.add((x, y))
            while st:
                p = st.pop(); comp.append(p)
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    q = (p[0] + dx, p[1] + dy)
                    if 0 <= q[0] < W and 0 <= q[1] < H and q not in seen and g[q[1]][q[0]] == c: seen.add(q); st.append(q)
            if len(comp) > size: continue
            votes = {}
            for cx, cy in comp:
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    n = g[cy + dy][cx + dx] if 0 <= cy + dy < H and 0 <= cx + dx < W else '.'
                    if n != c and n != '.': votes[n] = votes.get(n, 0) + 1
            if votes:
                best = max(votes, key=votes.get)
                for cx, cy in comp: g[cy][cx] = best
    return [''.join(r) for r in g]


def build():
    out = {}
    for name, box in BOXES.items():
        rows, best = recover_grid(os.path.join(ROOT, 'docs', 'reference', 'fighter-model-sheet.png'), box, SIZES, BODY_COLOURS)
        out[name] = (strip_halo(tidy(tidy(rows))), best)
    return out


if __name__ == '__main__':
    os.makedirs(os.path.join(ROOT, 'docs', 'reference', 'fighter'), exist_ok=True)
    for name, (rows, best) in build().items():
        open(os.path.join(ROOT, 'docs', 'reference', 'fighter', name + '.txt'), 'w').write('\n'.join(rows) + '\n')
        print('%s: %d x %d, grid score %.2f, cell %.1f px' % (name, len(rows[0]), len(rows), best[0], best[1]))
