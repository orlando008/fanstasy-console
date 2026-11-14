# Merge Café's items, lines 1 to 4 (coffee, dairy, fruit, tableware) and their generators: each a function that draws a 24 x 24
# picture in its line's palette (art.py makes the palettes and calls these). The bakery line is in art.py (the art proof's).
# Drawn in the agreed look: sculpted round things (Sculpt), flat shapes where a drawn edge reads better (Canvas), outlined,
# lit from the upper left.
import math
from kit import *


# --- Coffee: P.bean (4), P.china (3), P.crema (4), P.metal (3) ---
def coffee(P):
    def beans():
        s = Sculpt(24, 24)
        for x, y, r in ((8, 13, -30), (16, 11, 20), (13, 18, 70)):
            s.ellipsoid(x, y, 0, 4.2, 3, 3, Mat(P.bean, gloss=0.6), rot=r)
        im = s.render()
        for x, y, r in ((8, 13, -30), (16, 11, 20), (13, 18, 70)):       # the crease down each bean
            c, sn = math.cos(math.radians(r)), math.sin(math.radians(r))
            for k in range(-2, 3): im.pset(int(round(x + k * c)), int(round(y + k * sn)), P.bean[0])
        return im
    def ground():
        s = Sculpt(24, 24)
        s.ellipsoid(12, 17, 0, 9, 3.5, 5, P.metal)                         # a scoop
        s.capsule((19, 16, 1), (23, 12, 2), 1.4, 1.2, P.metal)
        s.ellipsoid(11, 13, 3, 7, 5, 4, Mat(P.bean, rough=0.9))            # a heap of grounds
        return s.render()
    def cup(h, top, foam=None, saucer=True, tall=False):
        d = Canvas(24, 24)
        if saucer: d.fill(oval(12, 20, 10, 2.6), P.china[1], part='saucer')
        w = 5.5 if not tall else 5
        y0 = 19 - h
        d.fill(poly([(12 - w - 1, y0), (12 + w + 1, y0), (12 + w, 19), (12 - w, 19)]), P.china[2] if not tall else P.crema[1], part='body')
        d.shadow('body', P.china[1] if not tall else P.crema[0], light=(-1, -1), depth=2.5)
        if tall:                                                            # a latte's layers through the glass
            d.fill(poly([(12 - w, y0 + h * 0.55), (12 + w, y0 + h * 0.55), (12 + w, 19), (12 - w, 19)]), P.bean[2], part='low')
            d.fill(poly([(12 - w, y0 + h * 0.3), (12 + w, y0 + h * 0.3), (12 + w, y0 + h * 0.55), (12 - w, y0 + h * 0.55)]), P.crema[2], part='mid')
        else: d.fill(brush([(12 + w + 1, y0 + 2), (12 + w + 4, y0 + 4), (12 + w + 1, y0 + h - 2)], 1.4, 1.4), P.china[2], part='handle')
        d.fill(oval(12, y0, w + 1, 1.8), top, part='top')
        if foam: d.fill(oval(12, y0 - 0.5, w - 0.5, 1.3), foam, part='foam'); d.dot(11, int(y0) - 1, P.bean[1])
        return d.render(outline=P)
    def pot():
        s = Sculpt(24, 24)
        s.capsule((9, 20, 0), (9, 12, 0), 4.5, 3.5, Mat(P.metal, gloss=0.8))    # a moka pot: base and top
        s.capsule((9, 10, 0), (9, 4, 0), 3.5, 4.5, Mat(P.metal, gloss=0.8))
        s.capsule((13, 6, 0), (15, 4, 0), 1, 1, P.metal)
        im = s.render()
        c = cup(6, P.bean[1], saucer=True)                                   # and a cup beside it
        for y in range(24):
            for x in range(24):
                v = c.px[y][x]
                if v and x + 6 < 24 and y >= 6: im.px[y][x + 6] = v if not im.px[y][x + 6] or x > 6 else im.px[y][x + 6]
        return im
    def grinder():
        s = Sculpt(24, 24)
        s.ellipsoid(12, 17, 0, 8, 6, 6, Mat(P.bean, rough=0.3))              # a wooden box
        s.capsule((12, 11, 0), (12, 7, 0), 5, 3, Mat(P.metal, gloss=0.7))   # the brass hopper
        s.capsule((12, 4, 2), (19, 3, 2), 0.9, 0.9, P.metal)                # the crank
        s.sphere(19.5, 3, 3, 1.6, P.crema)
        im = s.render()
        for x in range(9, 16): im.pset(x, 19, P.metal[1])                   # the drawer
        return im
    def latte():
        d = Canvas(24, 24)
        d.fill(poly([(7, 3), (17, 3), (16, 22), (8, 22)]), P.china[1], part='glass')          # the glass, seen through
        d.fill(poly([(6, 14), (18, 14), (18, 22), (6, 22)]), P.bean[2], inside='glass')        # coffee
        d.fill(poly([(6, 9), (18, 9), (18, 14), (6, 14)]), P.crema[2], inside='glass')         # milk
        d.fill(poly([(6, 3), (18, 3), (18, 9), (6, 9)]), P.china[2], inside='glass')           # foam
        d.fill(poly([(8.5, 5), (9.5, 5), (9.5, 20), (8.5, 20)]), P.china[2], inside='glass')   # a glint down the glass
        d.fill(oval(12, 3, 5, 1.3), P.china[2], part='top')
        return d.render(outline=P)
    def pot():
        s = Sculpt(24, 24)
        s.ellipsoid(10, 14, 0, 6.5, 7, 5, Mat(P.china, gloss=0.6))                            # a china coffee pot
        s.capsule((10, 8, 0), (10, 5, 0), 3.5, 2.5, P.china, smooth=1)
        s.sphere(10, 3.5, 2, 1.4, P.metal)
        s.capsule((4, 12, 1), (1, 6, 1), 1.4, 0.9, P.china)                                   # the spout
        s.capsule((16, 9, 0), (17, 16, 0), 1.2, 1.2, P.china)
        im = s.render()
        for x in range(4, 17):
            if im.px[15][x] and im.px[15][x] != P.china[0]: im.px[15][x] = P.bean[2]           # a brown band
        c = cup(5, P.bean[1], saucer=True)
        for y in range(24):
            for x in range(24):
                if c.px[y][x] and x + 5 < 24 and y >= 9 and x >= 4: im.px[y][x + 5] = c.px[y][x]
        return im
    def grinder():
        d = Canvas(24, 24)
        d.fill(poly([(5, 11), (19, 11), (19, 22), (5, 22)]), P.bean[2], part='box')                # a wooden box
        d.shadow('box', P.bean[1], light=(-1, -1), depth=2.5)
        d.fill(poly([(7, 16), (17, 16), (17, 19), (7, 19)]), P.bean[1], part='drawer'); d.dot(12, 17, P.metal[2])
        d.fill(poly([(7, 6), (17, 6), (15, 11), (9, 11)]), P.metal[1], part='hopper')                # the brass hopper
        d.light('hopper', P.metal[2], light=(-1, -1), width=1.2)
        d.fill(brush([(12, 6), (12, 3), (19, 2)], 1, 1), P.metal[1], part='crank'); d.fill(oval(19.5, 2, 1.6, 1.6), P.crema[2], part='knob')
        return d.render(outline=P)
    return [beans(), ground(), cup(6, P.bean[1]), cup(8, P.crema[2], foam=P.china[2]), latte(), pot()], grinder()


# --- Dairy: P.milk (4), P.pink (3), P.choc (4), P.glass (3) ---
def dairy(P):
    def drop():
        d = Canvas(24, 24)
        d.fill(blob([(12, 4), (16, 13), (17, 17), (12, 21), (7, 17), (8, 13)]), P.milk[2], part='drop')
        d.shadow('drop', P.milk[1], light=(-1, -1), depth=2.5)
        d.fill(oval(10, 14, 1.2, 2), P.milk[3], part='glint')
        return d.render(outline=P)
    def jug():
        s = Sculpt(24, 24)
        s.ellipsoid(12, 15, 0, 6.5, 6.5, 5, Mat(P.glass, gloss=0.6))
        s.capsule((12, 8, 0), (12, 5, 0), 4, 4.5, Mat(P.glass, gloss=0.6), smooth=1)
        s.capsule((5, 7, 1), (7, 6, 1), 1.2, 1, P.glass)                    # the spout
        s.capsule((18, 9, 0), (19, 16, 0), 1.3, 1.3, P.glass)               # the handle
        s.ellipsoid(12, 5, 4, 3.5, 1.2, 1, P.milk, front=True)              # the cream inside
        return s.render()
    def whip():
        s = Sculpt(24, 24)
        s.ellipsoid(12, 18, 0, 9, 4, 5, Mat(P.glass, gloss=0.5))            # a bowl
        for k, (x, y, r) in enumerate(((12, 13, 6), (12, 9, 4.5), (12, 6, 3), (12, 3.5, 1.6))):
            s.sphere(x + (k % 2) * 0.8, y, 4 + k, r, P.milk, smooth=1.5)   # a swirl of cream
        return s.render()
    def cone():
        d = Canvas(24, 24)
        d.fill(poly([(7, 11), (17, 11), (12, 23)]), P.choc[2], part='cone')
        for k in range(3): d.ink([(8 + k * 3, 11), (12 + k * 1.5, 21)], P.choc[1], inside='cone')
        d.fill(oval(12, 8, 6.5, 5.5), P.pink[2], part='scoop')
        d.shadow('scoop', P.pink[1], light=(-1, -1), depth=2)
        d.fill(oval(10, 6, 1.6, 1.2), P.milk[3], part='glint')
        return d.render(outline=P)
    def sundae():
        s = Sculpt(24, 24)
        s.capsule((12, 22, 0), (12, 18, 0), 1.2, 1.2, P.glass)              # the stem and foot of the glass
        s.ellipsoid(12, 22, 0, 5, 1.3, 2, P.glass)
        s.ellipsoid(12, 14, 0, 8, 4.5, 5, Mat(P.glass, gloss=0.6))
        s.sphere(9, 10, 3, 4, P.milk); s.sphere(15, 10, 3, 4, P.pink); s.sphere(12, 7, 5, 3.8, P.choc)
        s.sphere(12, 2.8, 7, 2, Mat(P.pink, gloss=0.9))                     # a cherry
        return s.render()
    def parfait():
        d = Canvas(24, 24)
        d.fill(poly([(7, 6), (17, 6), (15, 20), (9, 20)]), P.glass[2], part='glass')
        for k, (y0, y1, c) in enumerate(((16, 20, P.choc[2]), (12, 16, P.milk[2]), (8, 12, P.pink[2]))):
            d.fill(poly([(5, y0), (19, y0), (19, y1), (5, y1)]), c, inside='glass')
        d.fill(oval(12, 22, 4, 1.2), P.glass[1], part='foot'); d.fill(poly([(11.3, 20), (12.7, 20), (12.7, 22), (11.3, 22)]), P.glass[1], part='stem')
        d.fill(oval(12, 5, 5, 2.5), P.milk[3], part='top'); d.fill(oval(12, 2.5, 1.8, 1.8), P.pink[0], part='cherry')
        d.ink([(15, 5), (19, 1)], P.choc[1])                                  # a wafer
        return d.render(outline=P)
    def churn():
        s = Sculpt(24, 24)
        s.capsule((12, 21, 0), (12, 10, 0), 7, 7, Mat(P.glass, gloss=0.7))
        s.capsule((12, 9, 0), (12, 5, 0), 5, 3.5, Mat(P.glass, gloss=0.7), smooth=1)
        s.ellipsoid(12, 3, 2, 4, 1.4, 2, P.choc)                            # the lid
        s.capsule((4, 9, 2), (5, 13, 2), 1, 1, P.glass); s.capsule((20, 9, 2), (19, 13, 2), 1, 1, P.glass)
        im = s.render()
        for x in range(6, 19): im.pset(x, 15, P.glass[0])                    # a band
        return im
    return [drop(), jug(), whip(), cone(), sundae(), parfait()], churn()


# --- Fruit: P.red (4), P.leaf (3), P.berry (3), P.crust (4) ---
def fruit(P):
    def cherries():
        s = Sculpt(24, 24)
        s.sphere(8, 16, 0, 4.5, Mat(P.red, gloss=0.9)); s.sphere(16, 17, 0, 4.5, Mat(P.red, gloss=0.9))
        im = s.render()
        d = Canvas(24, 24); d.fill(brush([(8, 12), (12, 4), (16, 13)], 0.9, 0.9), P.leaf[1], part='stem'); d.fill(oval(14, 4, 3, 1.5, rot=-20), P.leaf[2], part='leaf')
        st = d.render(outline=P)
        for y in range(24):
            for x in range(24):
                if st.px[y][x] and not im.px[y][x]: im.px[y][x] = st.px[y][x]
        return im
    def berry(d, x, y, r=4):
        d.fill(blob([(x, y + r * 1.2), (x - r, y - r * 0.3), (x - r * 0.6, y - r * 0.9), (x + r * 0.6, y - r * 0.9), (x + r, y - r * 0.3)]), P.red[2], part='b%d%d' % (x, y))
        d.shadow('b%d%d' % (x, y), P.red[1], light=(-1, -1), depth=1.8)
        for dx, dy in ((-1, 0), (1, 1), (0, 2), (2, -1)): d.dot(int(x + dx), int(y + dy), P.crust[3])
        d.fill(oval(x, y - r * 0.9, r * 0.7, 1.2), P.leaf[1], part='l%d%d' % (x, y))
    def strawberries():
        d = Canvas(24, 24); berry(d, 7, 10, 4.2); berry(d, 17, 10, 4.2); berry(d, 12, 17, 4.2)
        return d.render(outline=P)
    def bowl():
        s = Sculpt(24, 24)
        s.ellipsoid(12, 17, 0, 10, 5, 6, P.crust)
        for x, y, m in ((7, 11, P.berry), (11, 10, P.red), (15, 11, P.berry), (9, 13, P.red), (13, 13, P.berry), (17, 13, P.red)):
            s.sphere(x, y, 4, 2.6, Mat(m, gloss=0.8))
        return s.render()
    def jam():
        s = Sculpt(24, 24)
        s.capsule((12, 20, 0), (12, 10, 0), 7, 7, Mat(P.red, gloss=0.7))
        s.ellipsoid(12, 6, 3, 7.5, 3, 3, P.leaf)                            # the lid
        im = s.render()
        for y in range(12, 17):
            for x in range(8, 17): im.px[y][x] = P.crust[3] if y not in (12, 16) else P.crust[1]   # a label
        im.pset(10, 14, P.red[1]); im.pset(12, 14, P.red[1]); im.pset(14, 14, P.red[1])
        return im
    def tart():
        s = Sculpt(24, 24)
        s.ellipsoid(12, 15, 0, 11, 6, 4, P.crust)
        s.ellipsoid(12, 13, 2, 9, 4.5, 3, Mat(P.crust, rough=0.3))
        for x, y, m in ((6, 13, P.red), (9, 11, P.berry), (12, 13, P.red), (15, 11, P.berry), (18, 13, P.red), (12, 10, P.red), (9, 15, P.berry), (15, 15, P.berry)):
            s.sphere(x, y, 5, 2, Mat(m, gloss=0.8))
        return s.render()
    def pie():
        s = Sculpt(24, 24)
        s.ellipsoid(12, 15, 0, 11, 6.5, 5, P.crust)
        im = s.render()
        for y in range(10, 20):                                              # the filling through a lattice
            for x in range(3, 21):
                if im.px[y][x] and ((x + y) % 5 == 0 or (x - y) % 5 == 0): im.px[y][x] = P.red[1] if (x * y) % 3 else P.red[2]
        return im
    def basket():
        s = Sculpt(24, 24)
        s.ellipsoid(12, 17, 0, 10, 6, 5, Mat(P.crust, rough=0.8))
        s.sphere(8, 10, 3, 3.5, Mat(P.red, gloss=0.8)); s.sphere(15, 9, 2, 3.8, Mat(P.leaf, gloss=0.6)); s.sphere(12, 12, 5, 2.6, Mat(P.berry, gloss=0.8))
        im = s.render()
        d = Canvas(24, 24); d.fill(brush([(3, 15), (12, 1), (21, 15)], 1.3, 1.3), P.crust[2], part='h')
        h = d.render(outline=P)
        for y in range(24):
            for x in range(24):
                if h.px[y][x] and not im.px[y][x]: im.px[y][x] = h.px[y][x]
        return im
    return [cherries(), strawberries(), bowl(), jam(), tart(), pie()], basket()


# --- Tableware: P.china (4), P.blue (3), P.silver (4), P.gold (3) ---
def tableware(P):
    def spoon():
        s = Sculpt(24, 24)
        s.capsule((5, 20, 0), (15, 9, 0), 1.2, 1.4, Mat(P.silver, gloss=0.9))
        s.ellipsoid(17.5, 6.5, 0, 3.2, 4.5, 2, Mat(P.silver, gloss=0.9), rot=45)
        return s.render()
    def teacup(cx=12, cy=17, small=False):
        d = Canvas(24, 24)
        w = 5 if not small else 4
        d.fill(oval(cx, cy + 4, w + 4, 2), P.china[2], part='saucer')
        d.fill(blob([(cx - w - 1, cy - 6), (cx + w + 1, cy - 6), (cx + w, cy), (cx, cy + 3), (cx - w, cy)]), P.china[3], part='cup')
        d.shadow('cup', P.china[2], light=(-1, -1), depth=2)
        d.fill(poly([(cx - w - 1, cy - 4), (cx + w + 1, cy - 4), (cx + w + 1, cy - 3), (cx - w - 1, cy - 3)]), P.blue[2], inside='cup')
        d.fill(brush([(cx + w + 1, cy - 4), (cx + w + 4, cy - 2), (cx + w, cy)], 1.3, 1.3), P.china[3], part='handle')
        d.fill(oval(cx, cy - 6, w + 1, 1.4), P.china[1], part='rim')
        return d.render(outline=P)
    def teapot():
        s = Sculpt(24, 24)
        s.ellipsoid(12, 15, 0, 8, 6.5, 6, Mat(P.china, gloss=0.6))
        s.capsule((5, 14, 1), (1.5, 8, 1), 1.8, 1, P.china)                 # the spout
        s.capsule((19, 11, 0), (21, 16, 0), 1.4, 1.4, P.china)              # the handle
        s.ellipsoid(12, 8.5, 2, 4.5, 1.6, 2, P.china); s.sphere(12, 6, 3, 1.6, P.gold)
        im = s.render()
        for x in range(5, 20):
            if im.px[16][x] and im.px[16][x] != P.china[0]: im.px[16][x] = P.blue[2]
        for x in range(7, 18, 3): im.pset(x, 13, P.blue[1])
        return im
    def tray():
        s = Sculpt(24, 24)
        s.ellipsoid(12, 15, 0, 11.5, 5.5, 2, Mat(P.silver, gloss=0.8))
        s.capsule((1, 13, 1), (1, 16, 1), 1.2, 1.2, P.silver); s.capsule((23, 13, 1), (23, 16, 1), 1.2, 1.2, P.silver)
        im = s.render()
        for x in range(4, 21): im.pset(x, 17, P.gold[1])
        return im
    def stand():
        d = Canvas(24, 24)
        d.fill(poly([(11.3, 2), (12.7, 2), (12.7, 21), (11.3, 21)]), P.gold[1], part='pole')
        for y, w in ((20, 10.5), (13, 8), (7, 5.5)): d.fill(oval(12, y, w, 1.8), P.china[3], part='p%d' % y); d.fill(oval(12, y + 0.9, w, 1), P.blue[1], part='e%d' % y)
        for x, y, c in ((7, 18, P.gold[2]), (16, 18, P.blue[2]), (12, 11, P.gold[2]), (12, 5, P.blue[2])): d.fill(oval(x, y, 2, 1.4), c, part='c%d%d' % (x, y))
        d.fill(oval(12, 1.5, 1.4, 1.4), P.gold[2], part='knob')
        return d.render(outline=P)
    def service():
        im = tray()
        t = teapot(); small = Img(24, 24)
        for y in range(0, 24, 1):                                             # the teapot at a little under its size, on the tray
            for x in range(24):
                sx, sy = int(x * 1.3) - 2, int(y * 1.3) - 4
                if 0 <= sx < 24 and 0 <= sy < 24 and t.px[sy][sx]: small.px[y][x] = t.px[sy][sx]
        for y in range(24):
            for x in range(24):
                if small.px[y][x] and y < 17: im.px[y][x] = small.px[y][x]
        c = teacup(17, 11, small=True)
        for y in range(24):
            for x in range(24):
                if c.px[y][x] and x > 13: im.px[y][x] = c.px[y][x]
        return im
    def cupboard():
        d = Canvas(24, 24)
        d.fill(poly([(3, 3), (21, 3), (21, 23), (3, 23)]), P.blue[1], part='body')            # a painted dresser
        d.light('body', P.blue[2], light=(-1, -1), width=1.2)
        d.fill(poly([(2, 2), (22, 2), (22, 4), (2, 4)]), P.blue[2], part='cornice')
        d.fill(poly([(5, 6), (19, 6), (19, 13), (5, 13)]), P.china[1], part='shelf')          # an open shelf of plates
        for x in (8, 12, 16): d.fill(oval(x, 9.5, 2, 3), P.china[3], part='plate%d' % x); d.dot(x, 9, P.blue[2])
        d.fill(poly([(5, 15), (11.5, 15), (11.5, 21), (5, 21)]), P.blue[2], part='door1'); d.fill(poly([(12.5, 15), (19, 15), (19, 21), (12.5, 21)]), P.blue[2], part='door2')
        d.dot(10, 18, P.gold[2]); d.dot(14, 18, P.gold[2])
        return d.render(outline=P)
    return [spoon(), teacup(), teapot(), tray(), stand(), service()], cupboard()
