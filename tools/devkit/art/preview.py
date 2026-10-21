"""Look at art while you make it, without packing a cart: a PNG of pictures, ramps and palettes, straight from art.py
(open it with the Read tool). The packed cart's viewers (sprites.mjs, scene.mjs, shots.mjs) remain the final word.

    from kit import *
    sheet = Sheet(scale=4)
    sheet.add('hero', hero_img, hero_pal)          # a picture in a palette (Roles, or a list/dict of index -> 'rrggbb')
    sheet.add('grass', ramp('4a8a2e', 5))          # a ramp as swatches
    sheet.row()                                    # start a new row
    sheet.save('/tmp/look.png')

Transparent pixels show as a dark checker, as in sprites.mjs. Labels use the console's font.
"""
import struct, zlib


def write_png(path, rows, scale=1):
    """Write rows of 'rrggbb' strings (or None for the checker) as a PNG, each pixel scale x scale."""
    h, w = len(rows), max(len(r) for r in rows)
    raw = bytearray()
    for y in range(h * scale):
        raw.append(0)
        src = rows[y // scale]
        for x in range(w * scale):
            v = src[x // scale] if x // scale < len(src) else None
            if v is None: v = '2a2a2a' if ((x // scale // 4) + (y // scale // 4)) % 2 else '343434'
            raw += bytes.fromhex(v)
    def chunk(t, d): return struct.pack('>I', len(d)) + t + d + struct.pack('>I', zlib.crc32(t + d) & 0xffffffff)
    png = b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', w * scale, h * scale, 8, 2, 0, 0, 0))
    png += chunk(b'IDAT', zlib.compress(bytes(raw), 9)) + chunk(b'IEND', b'')
    open(path, 'wb').write(png)


def _colours(pal):
    """index -> 'rrggbb' from Roles, a list (index 0 first) or a dict."""
    if pal is None: return {}
    if hasattr(pal, 'hexes') and hasattr(pal, 'names'):
        return {i: pal.hexes[n] for n, i in pal.names().items()}
    if isinstance(pal, dict): return dict(pal)
    return {i: c for i, c in enumerate(pal) if c}


class Sheet:
    """A contact sheet of labelled pictures and swatches, laid out in rows."""
    def __init__(s, scale=3, bg='181820', label='e8e8f0', gap=6):
        s.scale, s.bg, s.label, s.gap = scale, bg, label, gap
        s.rows, s.cur = [], []

    def add(s, name, thing, pal=None, scale=None):
        """A picture (an Img) in a palette, or a ramp (a list of 'rrggbb') as a row of swatches."""
        k = scale or s.scale
        if isinstance(thing, (list, tuple)) and thing and isinstance(thing[0], str):
            px = [[c for c in thing for _ in range(8)] for _ in range(8)]
            k = max(1, k // 2) * 2
        else:
            cols = _colours(pal)
            px = [[None if v == 0 else cols.get(v, 'ff00ff') for v in r] for r in thing.px]
        big = [[c for c in r for _ in range(k)] for r in px for _ in range(k)]
        s.cur.append((name, big))
        return s

    def row(s):
        if s.cur: s.rows.append(s.cur); s.cur = []
        return s

    def save(s, path):
        from kit import Img
        s.row()
        lines = []
        width = 0
        for row in s.rows:
            hgt = max(len(b) for _, b in row) + 12
            band = [[s.bg] * 0 for _ in range(hgt)]
            x = 0
            for name, big in row:
                w = max(max((len(r) for r in big), default=0), len(name) * 8)
                for y in range(hgt):
                    band[y] += [s.bg] * (w + s.gap)
                lab = Img(w, 8); lab.text(name[: w // 8], 0, 0, 1)
                for y in range(8):
                    for i in range(w):
                        if lab.px[y][i]: band[y][x + i] = s.label
                for y, r in enumerate(big):
                    for i, c in enumerate(r): band[10 + y][x + i] = c
                x += w + s.gap
            width = max(width, x)
            lines += band + [[s.bg] * x for _ in range(s.gap)]
        lines = [r + [s.bg] * (width - len(r)) for r in lines]
        write_png(path, lines)
        return path
