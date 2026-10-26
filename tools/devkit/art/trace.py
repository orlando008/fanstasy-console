"""Turn an artist's reference drawing into a template the kit can draw at any size: each region of one tone becomes
outline loops in head units (the eye line at v 0, the chin at v 0.5, forward +u), so head() fills them as shapes in
whatever ramps a character uses, scaled, tilted and mirrored. The way a reference informs every head the kit makes,
rather than being pasted in as one sprite. The references and their grids are in docs/reference/heads/.

    from trace import load_grid, trace_head
    rows = load_grid('docs/reference/heads/three-neutral.txt')
    tpl = trace_head(rows, KEY, eye=(27, 30), chin=60, ear=(50, 38), facing=-1, hair=lambda x, y: ...)

The grid is rows of characters, one a pixel (docs/reference/README.md and trace.HEAD_COLOURS list them: '.' empty, 'o' line ...). KEY
maps each character to (part, tone): part 'face' or 'hair' (or 'auto': hair above the brows and behind the ear, face
elsewhere, by the hair() test), tone a role of figure.tones() (line, deep, shade, base, light).
"""
import json

# The characters of a grid and the colours of the head references (docs/reference/heads-*.png): '.' empty, 'o' the
# line colour, 'd' and 'h' the dark browns (hair, and the deepest shadows of the face), 'S' the darker shadow (the jaw
# and the neck), 's' the shadow (the side planes), 'b' the base, 'l' the light.
HEAD_COLOURS = {'.': 'fdfbf7', 'o': '2c1c1a', 'd': '584038', 'h': '4d352e', 'S': 'b57e60', 's': 'cd9573', 'b': 'f9cca9', 'l': 'fad9be'}


def recover_grid(path, box, sizes, colours=HEAD_COLOURS):
    """The pixel art in an upscaled picture of it (a PNG or WebP, as an artist or an image tool hands it over): finds
    the cell size (one of `sizes`, in picture pixels) and offset that make the cells most uniform, and reads each cell's
    middle as the nearest of `colours` (char -> 'rrggbb'). box: (x0, y0, x1, y1) of the drawing. Needs PIL. Returns
    (rows, (score, size, ox, oy)): a score near 1 is a clean grid."""
    from PIL import Image
    rgb = {k: tuple(int(v[i:i + 2], 16) for i in (0, 2, 4)) for k, v in colours.items()}
    near = lambda c: min(rgb, key=lambda k: sum((c[i] - rgb[k][i]) ** 2 for i in range(3)))
    im = Image.open(path).convert('RGB').crop(box); px = im.load(); W, H = im.size
    best = None
    for s in sizes:
        for ox in range(0, int(s), 2):
            for oy in range(0, int(s), 2):
                good = tot = 0
                y = oy + s / 2
                while y + s / 3 < H:
                    x = ox + s / 2
                    while x + s / 3 < W:
                        c = near(px[int(x), int(y)])
                        for dx, dy in ((-s / 3, 0), (s / 3, 0), (0, -s / 3), (0, s / 3)):
                            good += near(px[int(x + dx), int(y + dy)]) == c; tot += 1
                        x += s * 3
                    y += s * 3
                if not best or good / tot > best[0]: best = (good / tot, s, ox, oy)
    _, s, ox, oy = best
    rows, y = [], oy + s / 2
    while y < H:
        row, x = '', ox + s / 2
        while x < W: row += near(px[int(x), int(y)]); x += s
        rows.append(row); y += s
    return rows, best


# The colours of the fighter model sheet (docs/reference/fighter-model-sheet.png): '.' the background, 'o' the line, 'd' to
# 'n' the cloth and hair browns dark to light, 'S' 's' 'b' the skin (shadow, mid, base), 'w' the shirt's white.
BODY_COLOURS = {'.': 'fefefb', 'o': '120c0b', 'd': '261b17', 'k': '33251f', 'c': '46352e', 'm': '564438', 'n': '6f5648',
                'S': 'b27f64', 's': 'be9983', 'b': 'f6cdab', 'w': 'f1e4d8'}


def strip_halo(rows, light='wb', passes=2, speck=3):
    """The pale fringe an upscaled drawing leaves round its figure: pixels of the `light` colours that touch the background
    (or another halo pixel that does) are erased, `passes` deep; then clusters of up to `speck` pixels left floating
    outside the figure. The shirt's white is inside the figure's dark outline, so it is not reached."""
    g = [list(r) for r in rows]; H, W = len(g), max(len(r) for r in g)
    g = [r + ['.'] * (W - len(r)) for r in g]
    out = lambda x, y: not (0 <= x < W and 0 <= y < H) or g[y][x] == '.'
    for _ in range(passes):
        kill = [(x, y) for y in range(H) for x in range(W) if g[y][x] in light and any(out(x + dx, y + dy) for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)))]
        for x, y in kill: g[y][x] = '.'
    seen = set()
    for y in range(H):
        for x in range(W):
            if g[y][x] == '.' or (x, y) in seen: continue
            comp, st = [], [(x, y)]; seen.add((x, y))
            while st:
                p = st.pop(); comp.append(p)
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1), (1, 1), (-1, 1), (1, -1), (-1, -1)):
                    q = (p[0] + dx, p[1] + dy)
                    if 0 <= q[0] < W and 0 <= q[1] < H and q not in seen and g[q[1]][q[0]] != '.': seen.add(q); st.append(q)
            if len(comp) <= speck:
                for cx, cy in comp: g[cy][cx] = '.'
    return [''.join(r) for r in g]


def clean(rows, keep='odh.', size=2):
    """Clusters of up to `size` pixels in a colour not in `keep` (light specks the upscaling left in the hair) take the
    colour most of their neighbours outside the cluster have."""
    g = [list(r) for r in rows]; H, W = len(g), max(len(r) for r in g)
    g = [r + ['.'] * (W - len(r)) for r in g]
    seen = set()
    for y in range(H):
        for x in range(W):
            if g[y][x] in keep or (x, y) in seen: continue
            fam = set(c for c in HEAD_COLOURS if c not in keep)
            comp, st = [], [(x, y)]; seen.add((x, y))
            while st:
                p = st.pop(); comp.append(p)
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    q = (p[0] + dx, p[1] + dy)
                    if 0 <= q[0] < W and 0 <= q[1] < H and q not in seen and g[q[1]][q[0]] in fam: seen.add(q); st.append(q)
            if len(comp) > size: continue
            for cx, cy in comp:
                nb = [g[cy + dy][cx + dx] for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)) if 0 <= cx + dx < W and 0 <= cy + dy < H]
                nb = [c for c in nb if c in keep]
                if nb: g[cy][cx] = max(set(nb), key=nb.count)
    return [''.join(r) for r in g]


def align(base, other):
    """(score, k, dx, dy): the scale and offset that lay `base` (rows) over `other` best (a pixel of base at x, y is at
    x * k + dx, y * k + dy in other), by dark, light and empty: an expression drawn on the same head as a neutral one."""
    cls = lambda c: 0 if c == '.' else 1 if c in 'odh' else 2
    N = [[cls(c) for c in r] for r in base]; E = [[cls(c) for c in r] for r in other]
    pts = [(x, y, v) for y, r in enumerate(N) for x, v in enumerate(r) if v and y < 58][::3]
    best = None
    for k10 in range(80, 126, 2):
        k = k10 / 100
        for dx in range(-25, 26):
            for dy in range(-25, 16):
                hit = sum(1 for x, y, v in pts if 0 <= int(y * k + dy) < len(E) and 0 <= int(x * k + dx) < len(E[int(y * k + dy)]) and E[int(y * k + dy)][int(x * k + dx)] == v)
                if not best or hit > best[0]: best = (hit, k, dx, dy)
    return best[0] / len(pts), best[1], best[2], best[3]


def load_grid(path):
    """The rows of a grid file (blank lines and lines starting with # left out)."""
    return [r for r in open(path, encoding='utf8').read().split('\n') if r and not r.startswith('#')]


def loops(mask):
    """Outline loops of a set of pixels: the pixel edges around it, interior on the right (screen y down), joined into
    closed loops with straight runs merged. Holes come out turning the other way, so the non-zero fill keeps them."""
    edges = {}
    for (x, y) in mask:
        for a, b in (((x, y), (x + 1, y)), ((x + 1, y), (x + 1, y + 1)), ((x + 1, y + 1), (x, y + 1)), ((x, y + 1), (x, y))):
            if (b, a) in edges: del edges[(b, a)]           # shared with a neighbour: not on the outline
            else: edges[(a, b)] = True
    nxt = {}
    for a, b in edges: nxt.setdefault(a, []).append(b)
    out = []
    while nxt:
        start = next(iter(nxt))
        loop, p, prev = [start], start, None
        while True:
            cands = nxt[p]
            if len(cands) > 1 and prev is not None:          # two pixels touching at a corner: turn right
                dx, dy = p[0] - prev[0], p[1] - prev[1]
                right = (p[0] - dy, p[1] + dx)
                q = right if right in cands else cands[0]
            else: q = cands[0]
            cands.remove(q)
            if not cands: del nxt[p]
            prev, p = p, q
            if p == start: break
            loop.append(p)
        # merge straight runs
        pts = [loop[i] for i in range(len(loop)) if not _straight(loop[i - 1], loop[i], loop[(i + 1) % len(loop)])]
        out.append(pts)
    return out


def _straight(a, b, c):
    return (b[0] - a[0]) * (c[1] - b[1]) == (b[1] - a[1]) * (c[0] - b[0])


def trace_head(rows, key, eye, chin, ear, facing, hair=None, cut=None):
    """The template of a head drawing: {'regions': [{'part', 'tone', 'loops'}], 'box'}. eye: (x, y) between the eyes on
    the eye line; chin: the y of the bottom of the chin; ear: (x, y) of the ear's middle (it sits at u -0.15); facing:
    -1 if the drawing faces left (it is mirrored to face right); hair(x, y) -> True for a dark pixel of the hair (for
    characters whose part is 'auto'); cut(x, y) -> True to leave a pixel out (the shoulders below the neck)."""
    S = chin - eye[1]
    scale = 0.5 / S                                          # head units per pixel
    x0 = ear[0] + 0.15 / (facing * scale)                    # the u origin: the ear lands at u -0.15
    to_u = lambda x, y: (facing * (x - x0) * scale, (y - eye[1]) * scale)
    groups = {}
    for y, row in enumerate(rows):
        for x, ch in enumerate(row):
            if ch not in key or (cut and cut(x, y)): continue
            part, tone = key[ch]
            if part == 'auto': part = 'hair' if hair and hair(x, y) else 'face'
            groups.setdefault((part, tone), set()).add((x, y))
    regions = []
    for (part, tone), mask in sorted(groups.items()):
        ls = [[[round(c, 4) for c in to_u(px, py)] for px, py in lp] for lp in loops(mask)]
        if facing < 0: ls = [lp[::-1] for lp in ls]          # mirrored: keep the interior on the right
        regions.append({'part': part, 'tone': tone, 'loops': ls})
    return {'scale': scale, 'regions': regions}


def save(templates, path):
    open(path, 'w', encoding='utf8').write(json.dumps(templates, separators=(',', ':'), sort_keys=True) + '\n')
