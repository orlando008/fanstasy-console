# Highway Rush's vehicles and road props, drawn as vector shapes (tools/devkit/art/draw.py) so that one design gives every
# size: a sports car seen from behind at 56 px wide for the player and the nearest rivals, and smaller and smaller for the
# ones further up the road (the console has no sprite scaling: each size is drawn on its own, from the same shapes).
# All coordinates are in a 56 x 30 design box and are scaled by W / 56. A pose leans the car into a turn.
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../../tools/devkit/art'))
from kit import *
from draw import Canvas, oval, blob, poly, brush, flipx, move

DW, DH = 56.0, 31.0


def car(P, W, lean=0, tiny=False):
    """The car at W px wide, as an Img W x ceil(W * DH / DW). P: the sprite palette's roles. lean -1, 0, 1: left, straight, right."""
    k = W / DW
    H = int(math.ceil(DH * k)) + 1
    d = Canvas(W, H, ss=6 if W < 30 else 4)
    cx = 28.0

    def T(pts):
        """Scale a shape and lean it: the top of the car swings towards the turn, the far side narrows a little."""
        out = []
        for x, y in pts:
            f = 1.0 - y / DH                       # 1 at the roof, 0 at the road
            side = (x - cx) * (1 - 0.045 * lean * (1 if x * 0 + (x - cx) * lean > 0 else -1) * 0)  # (kept straight: see below)
            xx = cx + (x - cx) * (1 - 0.05 * lean * ((x - cx) / 28.0)) + lean * 4.2 * f
            out.append((xx * k, y * k))
        return out

    def both(f):
        return f, flipx(f, cx)

    # ground shadow
    d.fill(T(oval(cx, 28.4, 27, 2.6)), P.shadow, part='shadow', pri=1)
    # tyres: dark blocks with a lighter tread edge, wider than the body
    for sx in (0, 1):
        tx = (2.0, 11.0) if sx == 0 else (45.0, 54.0)
        d.fill(T(poly([(tx[0], 16), (tx[1], 16), (tx[1] + 0.6 * (1 if sx else -1), 29.5), (tx[0] - 0.6 * (1 if sx else -1), 29.5)])), P.tyre0, part='tyre%d' % sx, pri=1)
        d.fill(T(poly([(tx[0] + 1.2, 18.5), (tx[1] - 1.2, 18.5), (tx[1] - 1.2, 20.5), (tx[0] + 1.2, 20.5)])), P.tyre1, inside='tyre%d' % sx, pri=2)
    # lower body and diffuser
    d.fill(T(blob([(6, 14), (50, 14), (52.5, 19), (49.5, 25.5), (40, 27.2), (16, 27.2), (6.5, 25.5), (3.5, 19)], k=4)), P.body[1], part='lower', pri=2)
    d.fill(T(poly([(10, 24), (46, 24), (44, 27.4), (12, 27.4)])), P.body[0], inside='lower', pri=3)        # the diffuser, in shade
    d.fill(T(poly([(8, 14.5), (48, 14.5), (49, 16.8), (7, 16.8)])), P.body[2], inside='lower', pri=2)       # the lit shoulder
    # cabin and rear window
    d.fill(T(blob([(11, 13), (15, 3.2), (41, 3.2), (45, 13)], k=4)), P.body[2], part='roof', pri=2)
    d.fill(T(poly([(15.5, 12.2), (18, 5.8), (38, 5.8), (40.5, 12.2)])), P.glass0, part='glass', pri=3)
    d.fill(T(poly([(19.5, 7.0), (24.5, 7.0), (21.5, 11.4), (17.6, 11.4)])), P.glass1, inside='glass', pri=3)   # a glint across the glass
    # spoiler: a blade on two posts
    d.fill(T(poly([(5, 10.2), (51, 10.2), (52, 13.2), (4, 13.2)])), P.body[0], part='wing', pri=4)
    d.fill(T(poly([(5.5, 10.2), (50.5, 10.2), (51, 11.2), (5, 11.2)])), P.body[3], inside='wing', pri=4)
    # tail lights: a bar across the back, bright at the inner end
    for sx in (0, 1):
        x0, x1 = (6.0, 22.0) if sx == 0 else (34.0, 50.0)
        d.fill(T(poly([(x0, 18.2), (x1, 18.2), (x1, 22.2), (x0 + 1, 22.2)] if sx == 0 else [(x0, 18.2), (x1, 18.2), (x1 - 1, 22.2), (x0, 22.2)])), P.lamp[0], part='lamp%d' % sx, pri=4)
        a, b = (x0 + 1.5, x1 - 1.5) if sx == 0 else (x0 + 1.5, x1 - 1.5)
        d.fill(T(poly([(a, 19.2), (b, 19.2), (b, 21.2), (a, 21.2)])), P.lamp[1], inside='lamp%d' % sx, pri=4)
        mid = (17.0, 21.0) if sx == 0 else (35.0, 39.0)
        d.fill(T(poly([(mid[0], 19.4), (mid[1], 19.4), (mid[1], 20.8), (mid[0], 20.8)])), P.lamp[2], inside='lamp%d' % sx, pri=5)
    # plate and tail pipes
    d.fill(T(poly([(23.5, 22), (32.5, 22), (32.5, 26), (23.5, 26)])), P.chrome[1], part='plate', pri=3)
    for px_ in (12.0, 44.0):
        d.fill(T(oval(px_, 25.6, 3.2, 2.0)), P.tyre0, part='pipe', pri=5)
        d.fill(T(oval(px_, 25.6, 2.0, 1.1)), P.chrome[1], pri=6)
    out = d.render(outline=P.edge)
    return out


def tiers():
    return [56, 44, 34, 26, 20, 15, 11, 8]


if __name__ == '__main__':
    art = Art()
    art.region('spr', 256, 1023)
    P = art.sprite_palette(0, {'edge': '1a0f24', 'body': ramp('d03a2c', 4), 'glass': ramp('3a4a78', 2), 'tyre': ['1a1620', '5a5666'],
                               'lamp': ['d83a20', 'ff9a30', 'fff0b0'], 'chrome': ['9aa0b4', 'e8ecf4'], 'shadow': '2a2036'})
    # glass0/glass1 etc. are roles 'glass' ramps: expose by index
    class R: pass
    sh = Sheet(scale=4)
    for lean in (-1, 0, 1):
        sh.add('lean%d' % lean, car(P, 56, lean), P)
    sh.row()
    for w in tiers()[1:]:
        sh.add(str(w), car(P, w), P, scale=4)
    sh.save(sys.argv[1] if len(sys.argv) > 1 else '/tmp/cars.png')
