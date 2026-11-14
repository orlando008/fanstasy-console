# Neon Drift's art: carts/src/neon-drift/tiles.txt, palette.txt, map.txt and art.json, and the ART block in code.js.
#   python3 carts/src/neon-drift/art.py carts/src/neon-drift
# Written with the art toolkit (tools/devkit/art/kit.py). This cart owns those files: change the pictures here, not in them.
# Look at the result with tools/devkit/art/sprites.mjs, scene.mjs, tiles.mjs and shots.mjs (pack first).
#
# The tunnel (spec section 5.4) is one picture on BG2, zoomed and rolled by one affine matrix a frame: rings at radii
# RING0 / RHO^k around the picture's centre and RAILS radial lines. The pixels of a ring, and of the rails between it and the
# next ring in, are two palette entries of their own (a line and its glow), BAND k: code.js sets the colours of each band every
# frame from the band's radius on the screen, so the rings brighten as they come out of the hole and the picture loops
# seamlessly when the zoom wraps by RHO. The picture is symmetric about its centre, which is on a tile corner, so the four
# quarters are the same tiles flipped.
import math, os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../../tools/devkit/art'))
from kit import *

RHO, RING0, RINGS, RAILS, HOLE = 1.6, 160.0, 7, 16, 9.0    # the ring step, the outermost ring's radius (the rim is the next, 100), the ring count, rails, the hole
TUN = 512                                                   # the tunnel picture: 512 x 512 px (64 x 64 tiles), its centre at (256, 256)

art = Art()
art.region('bg', 1, 479)
art.region('spr', 480, 1023)
art.backdrop('04020c')
art.color(200, '0a0c28', 'GLASS')                            # the see-through panels' fill

# --- Palettes ---
band = {}
for k in range(RINGS): band['line%d' % k] = '40e0ff'
for k in range(RINGS): band['glow%d' % k] = '103850'
tunnel = art.palette(1, band)
space = art.palette(2, {'star': ramp('8090c0', 3), 'haze': ramp('3a1868', 4, shift=0)})
logo_pal = art.palette(3, {'neon': ramp('40e8ff', 5), 'edge': '0c0420', 'shade': '401060', 'pink': ramp('ff40c0', 3)})
gem = art.sprite_palette(0, {'facet': ramp('60c8ff', 6, shift=0.5), 'edge': 'f0ffff', 'core': 'ffffff', 'ink': '081030'})
glow = art.sprite_palette(4, {'g': ramp('ff3cc8', 6, shift=0.3)})       # the lights: added to the picture (blend 'add'), so dark is faint
halo = art.sprite_palette(5, {'h': ramp('0c4878', 5, shift=0.3, light='3090c0')})       # the diamond's afterimage and halo, added
burst = art.sprite_palette(6, {'b': ramp('ffe070', 5, shift=0.5)})      # the catch burst, added

# --- The tunnel (BG2) ---
def tunnel_pixel(x, y):
    dx, dy = x + 0.5 - TUN / 2, y + 0.5 - TUN / 2
    r = math.hypot(dx, dy)
    if r < HOLE: return 0
    best = None
    for k in range(RINGS):                                   # a ring: a line about a pixel wide (wider further out), a glow beside it
        rk = RING0 / RHO ** k
        if rk < HOLE: break
        d, w = abs(r - rk), 0.45 + rk / 220
        if d < w: return getattr(tunnel, 'line%d' % k)
        if d < w + 1.1 + rk / 160: best = best or getattr(tunnel, 'glow%d' % k)
    if best: return best
    k = 0                                                    # the band this radius is in: rails between ring k and the next ring in take its colours
    while k < RINGS - 1 and r < RING0 / RHO ** k / math.sqrt(RHO): k += 1
    a = math.atan2(dx, dy) % (2 * math.pi / RAILS)
    d = min(a, 2 * math.pi / RAILS - a) * r                  # the distance to the nearest rail
    if d < 0.5 + r / 400: return getattr(tunnel, 'line%d' % k)
    if d < 1.4 + r / 200: return getattr(tunnel, 'glow%d' % k)
    return 0
tun = Img.make(TUN, TUN, tunnel_pixel)
art.scene('tunnel', tun, pal=tunnel, at=(0, 0))

# --- The space behind (BG1): faint stars, and the haze of the hole at its centre (screen centre (128, 112), code.js CX, CY) ---
sp = Img(256, 224)
for k in range(110):
    x, y = hsh(k * 31 + 7) % 256, hsh(k * 17 + 3) % 224
    sp.px[y][x] = space.star[hsh(k * 5 + 1) % 3]
for y in range(224):
    for x in range(256):
        r = math.hypot(x + 0.5 - 128, y + 0.5 - 112)
        lv = max(0.0, 1 - r / 38) * 4.2                      # the light at the end of the tunnel: rings of haze, dithered between
        if lv > 0.2:
            i = int(lv)
            if dither(x, y, int((lv - i) * 16)): i += 1
            if i: sp.px[y][x] = space.haze[min(3, i - 1)]
art.scene('space', sp, pal=space, at=(64, 0))

# --- The diamond: 9 turns from 0 to 90 degrees (code.js flips them for the rest of the half turn), its long axis along the rim ---
W, H = 13.5, 7.5
def diamond(turn):
    c, s = math.cos(turn), math.sin(turn)
    def px(x, y):
        dx, dy = x + 0.5 - 16, y + 0.5 - 16
        u, v = dx * c + dy * s, -dx * s + dy * c             # into the diamond's frame
        q = abs(u) / W + abs(v) / H
        if q > 1.08: return 0
        if q > 0.86: return gem.edge
        if q < 0.18: return gem.core
        lit = (-dx - dy * 1.4) / 24                          # facets lit from the upper left of the screen, whatever the turn
        f = (u > 0) * 1 + (v > 0) * 2                        # the four facets
        lv = 2.6 + 1.6 * lit + [0.7, 0.0, -0.2, -0.9][f]
        return gem.facet[max(0, min(5, int(round(lv))))]
    return Img.make(32, 32, px)
for k in range(9): art.sprite('gem%d' % k, diamond(k * math.pi / 16), pal=gem, region='spr')
# the halo behind it (added light), round so it fits every turn
art.sprite('halo', Img.make(32, 32, lambda x, y: (lambda r: 0 if r > 14 else halo.h[max(0, min(4, int(4.4 - r / 3.0)))])(math.hypot(x + 0.5 - 16, y + 0.5 - 16))), pal=halo, region='spr')

# --- The lights: a glowing orb, three sizes by distance ---
def orb(n):
    R = n / 2
    def px(x, y):
        r = math.hypot(x + 0.5 - R, y + 0.5 - R) / R
        if r > 1: return 0
        return glow.g[max(0, min(5, int(6.2 - r * 6.2)))]
    return Img.make(n, n, px)
for n in (8, 16, 32): art.sprite('light%d' % n, orb(n), pal=glow, region='spr')

# --- The catch burst: a ring that grows (4 frames) and a spark ---
def ring_frame(r0):
    def px(x, y):
        r = math.hypot(x + 0.5 - 16, y + 0.5 - 16)
        d = abs(r - r0)
        return 0 if d > 2.2 else burst.b[4 if d < 0.8 else 2 if d < 1.6 else 0]
    return Img.make(32, 32, px)
for k, r0 in enumerate((5, 8.5, 11.5, 14)): art.sprite('burst%d' % k, ring_frame(r0), pal=burst, region='spr')
art.sprite('spark', Img.from_rows(['...2....', '...3....', '..242...', '2344432.', '..242...', '...3....', '...2....', '........'],
                                  key={'2': burst.b[1], '3': burst.b[2], '4': burst.b[4]}), pal=burst, region='spr')

# --- The title: NEON DRIFT in big neon letters (BG0, shown on the title) ---
logo = Img(256, 48)
t1 = big_text('NEON', logo_pal.neon, scale=2, outline=logo_pal.edge, shadow=logo_pal.shade)
t2 = big_text('DRIFT', logo_pal.pink, scale=2, outline=logo_pal.edge, shadow=logo_pal.shade)
logo.blit(t1, (256 - t1.w) // 2, 0); logo.blit(t2, (256 - t2.w) // 2, 22)
art.scene('logo', logo, pal=logo_pal, at=(96, 0))

# --- The grades D to S: big letters as sprites, beside the results' panel (a sprite under an overlay panel would be dimmed) ---
grade_pal = art.sprite_palette(1, {'gold': ramp('ffd040', 5), 'edge': '180818', 'shade': '502060'})
for g in 'DCBAS':
    art.big_sprite('grade' + g, big_text(g, grade_pal.gold, scale=4, outline=grade_pal.edge, shadow=grade_pal.shade), pal=grade_pal, region='spr')

art.write(sys.argv[1])
