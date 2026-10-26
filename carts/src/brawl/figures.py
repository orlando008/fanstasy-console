# The fighters of Streets of Woe, drawn with the art kit's Figure (tools/devkit/art/figure.py) on the rig's skeleton and posed
# frame by frame. art.py streams them into tile memory (art.stream) from the cart's ROM; the game picks a frame by
# animation name (docs/carts/brawl.md, section 12).
#
# Every fighter shares one palette layout (a line colour, three ramps of 3 for skin, hair, shirt and pants, two trim
# colours = 15), so the same frames show in any of the eight sprite palettes: a second hero, a thug's coat for each stage, a
# Slasher, a Chucker, all one set of pixels. Frames face right, are CW x CH pixels, and stand on their bottom row with the
# body's middle (the pivot) on the middle column, so a mirrored frame stays on its feet.
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../../tools/devkit/art'))
from kit import *

CW, CH = 96, 84                       # a frame: the figure's height 72 plus the rig's margin
PIVOT = CW // 2


def layout(skin, hair, shirt, pants, trim, line='180c14'):
    """The roles of a fighter palette, in the order every palette must keep."""
    return {'line': line, 'skin': ramp(skin, 3, at=1, step=0.11), 'hair': ramp(hair, 3, at=1, step=0.11),
            'shirt': ramp(shirt, 3, at=1, step=0.11), 'pants': ramp(pants, 3, at=1, step=0.11), 'trim': trim}


# The palettes: 0 and 1 the heroes; the rest are the thugs (2: the stage's thug, rewritten when a stage starts).
PALS = {
    0: layout('e0a070', '5a3820', '4a4448', '584c3c', ['b8b0b0', 'f0ece4']),
    1: layout('d89868', 'b8602c', '9a2c34', '3a4a78', ['b8b0b0', 'f0ece4']),
    2: layout('e0a878', '3a2418', 'c03830', '38384c', ['302830', '605868']),     # the street's thug (rewritten for each stage)
    3: layout('d8986c', '2a1c14', '8a5a30', '3c3c44', ['c02828', 'e8eef8']),     # the Slasher: a brown vest, a red bandana, a steel blade
    4: layout('e0a878', '3a2c20', '3a7a40', '4a4034', ['d86820', 'f0a040']),     # the Chucker: green, an orange beanie
    5: layout('e8b090', '18101c', '2c8a9a', '2a2a48', ['6a4020', 'a8703c']),     # the Lasher: a teal top, black hair
    6: layout('d89068', '4a2a20', 'd86820', '3a2a28', ['b02020', 'e84040']),     # the Fire-breather: an orange vest, a red scarf (and the Brute, the last boss's palette: rewritten as they come)
}


def to_frame(img):
    """Re-seat a rig picture on a CW x CH frame with the pivot on the middle column (the sole is already on the bottom row)."""
    out = Img(CW, CH)
    dx = PIVOT - int(img.w * 0.45)
    out.blit(img, dx, CH - img.h)
    return out


def bbox_rows(img):
    ys = [y for y in range(img.h) if any(img.px[y])]
    return (ys[0], ys[-1]) if ys else (0, 0)


# --- Poses. Angles in degrees as the rig takes them (rig.py): arms and thighs from hanging down, positive forward; lean the
# spine forward; y > 0 lowers the body. The hero fights from the model sheet's low guard (STANCE). ---
G = STANCE
LOW = dict(G, y=15, lean=10)


def hero_poses(fig):
    P = {}
    P['idle'] = [G, pose(G, y=8, arm_n=48, fore_n=124, arm_f=58, fore_f=116, lean=7)]
    guard_walk = dict(arm_n=46, fore_n=118, arm_f=58, fore_f=110, lean=6, neck=4, head=2)
    P['walk'] = [pose(k, **guard_walk) for k in fig.animate(WALK, 8)]
    cross = lambda n: CROSS[n]
    P['punch1'] = [cross(1), cross(2), cross(3)]
    far = lambda p: pose(p, arm_n=p['arm_f'], fore_n=p['fore_f'], arm_f=p['arm_n'], fore_f=p['fore_n'])
    P['punch2'] = [far(cross(1)), far(cross(2)), far(cross(3))]
    P['hook'] = [pose(G, lean=-2, arm_n=-10, fore_n=110, x=-2),
                 pose(G, lean=20, arm_n=88, fore_n=62, arm_f=40, fore_f=120, x=4, thigh_n=50, shin_n=-50, thigh_f=-40, shin_f=-4),
                 pose(G, lean=12, arm_n=60, fore_n=80, x=2)]
    P['uppercut'] = [pose(G, y=19, lean=12, arm_n=18, fore_n=80, thigh_n=50, shin_n=-60),
                     pose(G, y=-1, lean=-6, arm_n=150, fore_n=8, arm_f=40, fore_f=120, thigh_n=18, shin_n=-6, thigh_f=-14, shin_f=-4),
                     pose(G, y=4, lean=0, arm_n=100, fore_n=50)]
    P['jump'] = [JUMP]
    P['jkick'] = [pose(JUMP, lean=-8, thigh_n=70, shin_n=-100, thigh_f=10, shin_f=-80),
                  pose(JUMP, lean=-16, arm_n=40, fore_n=60, thigh_n=88, shin_n=-4, foot_n=10, thigh_f=-8, shin_f=-70)]
    P['land'] = [pose(G, y=18, lean=14)]
    P['hurt'] = [HIT]
    P['fly'] = [pose(HIT, lean=-50, head=-10, y=12, thigh_n=60, shin_n=-20, thigh_f=30, shin_f=-40, arm_n=-50, fore_n=30)]
    P['lie'] = [pose(HIT, lean=-90, head=-8, y=30, x=2, thigh_n=84, shin_n=-6, foot_n=8, thigh_f=78, shin_f=-8, arm_n=-70, fore_n=20, arm_f=-60, fore_f=20)]
    P['getup'] = [pose(HIT, lean=-45, head=0, y=24, x=8, thigh_n=80, shin_n=-70, thigh_f=60, shin_f=-60, arm_n=-20, fore_n=30),
                  pose(G, y=19, lean=14)]
    P['grab'] = [pose(G, lean=10, arm_n=75, fore_n=35, arm_f=80, fore_f=40, x=2)]
    P['gpunch'] = [pose(G, lean=2, arm_n=20, fore_n=120, arm_f=80, fore_f=40, x=-2),
                   pose(G, lean=14, arm_n=88, fore_n=20, arm_f=80, fore_f=40, x=4)]
    P['suplex'] = [pose(G, lean=-24, y=3, arm_n=150, fore_n=15, arm_f=156, fore_f=12, thigh_n=10, shin_n=-6, thigh_f=-8, shin_f=-6)]
    P['revive'] = [pose(G, y=28, lean=20, arm_n=40, fore_n=40, arm_f=50, fore_f=34, thigh_n=84, shin_n=-96, thigh_f=-8, shin_f=-90)]
    P['special'] = [pose(G, y=20, lean=16, arm_n=40, fore_n=60, arm_f=-30, fore_f=60),
                    pose(G, y=6, lean=0, arm_n=90, fore_n=0, arm_f=-90, fore_f=0, thigh_n=34, shin_n=-34, thigh_f=-34, shin_f=-34),
                    pose(G, y=2, lean=-6, arm_n=80, fore_n=0, arm_f=-80, fore_f=0, thigh_n=68, shin_n=-10, thigh_f=-14, shin_f=-14)]
    P['dash'] = [pose(G, y=16, lean=20, arm_n=-10, fore_n=100, arm_f=40, fore_f=110, x=-3),
                 pose(G, y=8, lean=34, arm_n=96, fore_n=0, arm_f=40, fore_f=120, x=6, thigh_n=62, shin_n=-64, thigh_f=-58, shin_f=-2),
                 pose(G, y=12, lean=18, arm_n=70, fore_n=50, thigh_n=44, shin_n=-46)]
    P['wpipe'] = [pose(G, lean=-8, arm_n=150, fore_n=20, arm_f=152, fore_f=18, x=-2),
                  pose(G, lean=24, arm_n=84, fore_n=6, arm_f=82, fore_f=8, x=4, thigh_n=46, shin_n=-46, thigh_f=-38, shin_f=-6),
                  pose(G, lean=14, arm_n=60, fore_n=40, arm_f=60, fore_f=44)]
    return P


def walk6():
    """A six-frame walk: the stride, the step down and the passing step, then the same on the other foot (the push-off is left out)."""
    from rig import mirror_sides
    return [WALK[0], WALK[1], WALK[2], mirror_sides(WALK[0]), mirror_sides(WALK[1]), mirror_sides(WALK[2])]


def thug_poses(fig, attack=True, lite=False):
    """The plain thug: a street fighter's upright guard, a swung punch, and the same falls as the hero."""
    hp = hero_poses(fig)
    P = {k: hp[k] for k in ('hurt', 'fly', 'lie', 'getup')}
    P['getup'] = [hp['getup'][0], pose(TG, y=14, lean=18)]
    P['idle'] = [TG, pose(TG, y=3, arm_n=34, arm_f=48, lean=9)]
    guard_walk = dict(arm_n=34, fore_n=110, arm_f=48, fore_f=105, lean=7)
    P['walk'] = [pose(k, **guard_walk) for k in walk6()]
    if lite:                                              # the other kinds of thug: a still idle and a four-frame walk, to save ROM
        P['idle'] = P['idle'][:1]
        P['walk'] = stomp(**guard_walk)
    if attack: P['tpunch'] = [pose(TG, lean=-6, arm_n=-20, fore_n=100, x=-2),            # the arm drawn back
                   pose(TG, lean=16, arm_n=90, fore_n=2, arm_f=34, fore_f=110, x=4, thigh_n=26, thigh_f=-22),   # the blow
                   pose(TG, lean=10, arm_n=50, fore_n=60)]
    P['held'] = [pose(HIT, lean=-6, head=14, arm_n=-20, fore_n=30, arm_f=-40, fore_f=30, thigh_n=8, thigh_f=-12)]
    return P


def make_thug(P, margin=6):
    return Figure('brawler', height=72, line=P.line, skin=P.skin, hair=P.hair, shirt=P.shirt, pants=P.pants, shoes=P.hair,
                  margin=margin, face='angry', hair_style='short', top='tee')


def make_hero(P, margin=6):
    """The hero: the model sheet's fighter (a short dark jacket over a white tee, cargo trousers, boots, fingerless gloves)."""
    return Figure('fighter', height=72, line=P.line, skin=P.skin, hair=P.hair, shirt=P.shirt, pants=P.pants, shoes=P.hair, hands=P.shirt,
                  margin=margin, inner=P.trim, face='angry', hair_style='shaggy', top='jacket', legs='cargo', boots=True, fingerless=True)


AIR = ('jump', 'jkick', 'fly')
ANCHORS = {}                           # 'clip:i' -> (hand x, hand y, head x, head y), from the pivot and the ground (up is negative)


def render_clips(make, poses, acc=None, tag='', size=None):
    """Every pose as frames, each drawn on a tall canvas and seated so its lowest pixel is on the bottom row (a crouch or a
    lunge keeps its feet on the ground whatever the rig's offsets did); the poses in AIR keep the rig's own height. acc(img,
    joints, pose) draws a hat or a scarf on the picture. The near hand's and the head's places go in ANCHORS."""
    big = make(24)
    cw, ch = size or (CW, CH)
    pv = cw // 2
    out = {}
    for k, v in poses.items():
        frames = []
        for n, p in enumerate(v):
            im = big.render(p)
            J = big.joints(p)
            if acc: acc(im, J, p)
            _, low = bbox_rows(im)
            dy = ch - 1 - low
            dx = pv - int(im.w * 0.45)
            f = Img(cw, ch)
            f.blit(im, dx, dy)
            frames.append(f)
            ANCHORS['%s%s:%d' % (tag, k, n)] = (round(J['hand_n'][0] + dx - pv), round(J['hand_n'][1] + dy - (ch - 1)),
                                                 round(J['head'][0] + dx - pv), round(J['head'][1] + dy - (ch - 1)))
        out[k] = frames
    return out


# --- The other thugs: the same body with another head, a hat or a scarf, an attack of their own ---
def head_frame(J, p, d, u):
    """The place d px forward and u px up from the head's middle, along the way the head is tilted."""
    import math
    ah = math.radians(p.get('lean', 0) + p.get('neck', 0) + p.get('head', 0))
    nx, ny = J['head']
    return (nx + math.cos(ah) * d + math.sin(ah) * u, ny + math.sin(ah) * d - math.cos(ah) * u)


def accessory(kind, P):
    """Draws a bandana (the Slasher), a beanie (the Chucker) or a scarf (the Fire-breather) in the palette's trim colours."""
    ink, lo, hi = P.line, P.trim[0], P.trim[1]
    def band(im, J, p, ps, col):
        pts = [head_frame(J, p, d, u) for d, u in ps]
        im.poly([(x + 0.5 * 0, y) for x, y in pts], col)
    def acc(im, J, p):
        if kind == 'bandana':
            band(im, J, p, [(-8, 3.5), (8, 3.5), (8.5, 0.5), (-8, 0.5)], ink)
            band(im, J, p, [(-7.5, 3), (8, 3), (8, 1), (-7.5, 1)], lo)
            band(im, J, p, [(-8, 2.5), (-12, 4), (-13, 0), (-11, -2), (-8, 0.5)], ink)       # the knot's two tails
            band(im, J, p, [(-8, 2), (-11.5, 3), (-12, 0.5), (-8, 1)], lo)
        elif kind == 'beanie':
            band(im, J, p, [(-8.5, 1), (-8, 6), (-4, 9.5), (4, 9.5), (8.5, 6), (9, 1)], ink)
            band(im, J, p, [(-7.5, 1.5), (-7, 5.5), (-3.5, 8.5), (3.5, 8.5), (7.5, 5.5), (8, 1.5)], lo)
            band(im, J, p, [(-7.8, 1.5), (-7.6, 3.5), (8.2, 3.5), (8, 1.5)], hi)             # the turned-up brim
        elif kind == 'scarf':
            nx, ny = J['neck']
            for yy, x0, x1 in ((0, -8, 8), (1, -8, 8), (2, -7, 7)):
                for xx in range(x0, x1 + 1): im.pset(nx + xx, ny + yy - 1, lo if yy else hi)
            for xx in range(-9, 10): im.pset(nx + xx, ny - 2, ink); im.pset(nx + xx, ny + 3, ink)
            for yy in range(0, 9): im.pset(nx - 8, ny + yy, lo); im.pset(nx - 9, ny + yy, ink); im.pset(nx - 7, ny + yy, ink)   # a tail hanging behind
    return acc


def make_type(hair, face='angry'):
    def mk(P, margin=6):
        return Figure('brawler', height=72, line=P.line, skin=P.skin, hair=P.hair, shirt=P.shirt, pants=P.pants, shoes=P.hair,
                      margin=margin, face=face, hair_style=hair, top='tee')
    return mk


TG = pose(GUARD, lean=8, y=2)


def stab_poses():
    """The Slasher's lunge: a crouch with the knife arm back, the lunge, the recovery."""
    return {'sstab': [pose(TG, y=12, lean=20, arm_n=-30, fore_n=70, thigh_n=50, shin_n=-56, thigh_f=-30, shin_f=-14, x=-2),
                      pose(TG, y=8, lean=34, arm_n=98, fore_n=0, arm_f=30, fore_f=100, x=8, thigh_n=62, shin_n=-64, thigh_f=-58, shin_f=-2),
                      pose(TG, y=6, lean=16, arm_n=60, fore_n=40)]}


def throw_poses():
    """The Chucker's bottle: held up, thrown, followed through."""
    return {'cthrow': [pose(TG, lean=-8, arm_n=150, fore_n=20, arm_f=40, fore_f=110, x=-2),
                       pose(TG, lean=14, arm_n=100, fore_n=-10, arm_f=36, fore_f=110, x=3),
                       pose(TG, lean=20, arm_n=60, fore_n=10, arm_f=30, fore_f=100, x=4)]}


def lash_poses():
    """The Lasher's whip: the arm back over her shoulder, the crack, the recovery."""
    return {'wlash': [pose(TG, lean=-10, arm_n=-40, fore_n=110, arm_f=40, fore_f=110, x=-3),
                      pose(TG, lean=14, arm_n=95, fore_n=4, arm_f=36, fore_f=110, x=4, thigh_n=26, thigh_f=-22),
                      pose(TG, lean=8, arm_n=50, fore_n=60)]}


def breath_poses():
    """The Fire-breather: the chest drawn up, the breath out (the head thrust forward), the recovery."""
    return {'fbreath': [pose(TG, lean=-16, head=-10, y=0, arm_n=20, fore_n=40, arm_f=20, fore_f=40, x=-2),
                        pose(TG, lean=18, head=14, y=4, arm_n=30, fore_n=40, arm_f=30, fore_f=40, x=3, thigh_n=24, thigh_f=-20),
                        pose(TG, lean=8, arm_n=30, fore_n=50, arm_f=40, fore_f=60)]}


# kind: (clip prefix, hair, hat, its attack poses, the face while he attacks)
TYPES = {'knife': ('k_', 'mohawk', 'bandana', stab_poses), 'chucker': ('c_', 'flat', 'beanie', throw_poses),
         'lasher': ('l_', 'long', None, lash_poses), 'fire': ('f_', 'bald', 'scarf', breath_poses)}


# --- The Brute: a wide body (the boxer's build), bare arms, a vest, a bald head ---
def make_brute(P, margin=6):
    return Figure('boxer', height=76, line=P.line, skin=P.skin, hair=P.hair, shirt=P.shirt, pants=P.pants, shoes=P.hair,
                  margin=margin, face='angry', hair_style='bald', top='tank')


def brute_poses(fig):
    hp = thug_poses(fig, attack=False)
    BG = pose(GUARD, lean=4, y=2, thigh_n=14, thigh_f=-14, arm_n=24, fore_n=70, arm_f=34, fore_f=64)
    P = {k: hp[k] for k in ('hurt', 'fly', 'lie', 'getup')}
    P['getup'] = [hp['getup'][0], pose(BG, y=14, lean=18)]
    P['idle'] = [BG, pose(BG, y=3, arm_n=28, arm_f=38)]
    P['walk'] = stomp(arm_n=24, fore_n=70, arm_f=34, fore_f=64, lean=5)
    P['hsmash'] = [pose(BG, lean=-10, arm_n=165, fore_n=8, arm_f=165, fore_f=8, x=-2),
                   pose(BG, lean=32, y=8, arm_n=66, fore_n=6, arm_f=62, fore_f=8, x=5, thigh_n=34, thigh_f=-30),
                   pose(BG, lean=16, arm_n=50, fore_n=40, arm_f=52, fore_f=40)]
    return P


# --- The bosses: BULL (a heavy; KINGPIN is the same body in a darker vest, with a slam of his own) and RAZOR (slim and quick).
# They are drawn on a bigger frame and streamed into two of the fighters' slots while a boss is on (art.py). ---
BW, BH = 128, 104


def make_bull(P, margin=6):
    return Figure('boxer', height=82, line=P.line, skin=P.skin, hair=P.hair, shirt=P.shirt, pants=P.pants, shoes=P.hair,
                  margin=margin, face='angry', hair_style='bald', top='tank')


def make_razor(P, margin=6):
    return Figure('brawler', height=76, line=P.line, skin=P.skin, hair=P.hair, shirt=P.shirt, pants=P.pants, shoes=P.hair,
                  margin=margin, face='angry', hair_style='spiky', top='long')


def stomp(keys_from=(0, 2), **arms):
    """A four-frame walk: a stride, the passing step, the stride on the other foot, the passing step."""
    from rig import mirror_sides
    a, b = WALK[keys_from[0]], WALK[keys_from[1]]
    return [pose(k, **arms) for k in (a, b, mirror_sides(a), mirror_sides(b))]


def bull_acc(P):
    """BULL's red headband and gold belt (the palette's trim)."""
    ink, lo, hi = P.line, P.trim[0], P.trim[1]
    def acc(im, J, p):
        band = lambda ps, col: im.poly([head_frame(J, p, d, u) for d, u in ps], col)
        band([(-9.5, 3.5), (9.5, 3.5), (10, 0.5), (-9.5, 0.5)], ink)
        band([(-9, 3), (9.5, 3), (9.5, 1), (-9, 1)], lo)
        band([(-9, 2.5), (-14, 4), (-15, -1), (-12, -3), (-9, 0.5)], ink)
        band([(-9, 2), (-13, 3), (-14, 0), (-9, 1)], lo)
        hx, hy = J['hip']
        for yy in range(-3, 2):
            for xx in range(-9, 10): im.pset(hx + xx, hy + yy, ink if yy in (-3, 1) or abs(xx) == 9 else hi)
    return acc


def bull_poses(fig):
    hp = hero_poses(fig)
    BP = pose(GUARD, lean=6, y=2, thigh_n=16, thigh_f=-16, arm_n=26, fore_n=72, arm_f=34, fore_f=66)
    P = {'hurt': [HIT], 'fly': hp['fly'], 'lie': hp['lie'], 'getup': [hp['getup'][0], pose(BP, y=14, lean=18)]}
    P['idle'] = [BP, pose(BP, y=3, arm_n=30, arm_f=40)]
    P['walk'] = stomp(arm_n=26, fore_n=72, arm_f=34, fore_f=66, lean=7)
    P['bpunch'] = [pose(BP, lean=-12, arm_n=-34, fore_n=96, x=-4),
                   pose(BP, lean=30, y=6, arm_n=94, fore_n=2, arm_f=40, fore_f=100, x=7, thigh_n=34, thigh_f=-28),
                   pose(BP, lean=16, arm_n=60, fore_n=50)]
    P['bcharge'] = [pose(BP, lean=34, y=12, arm_n=-30, fore_n=40, arm_f=-24, fore_f=44, thigh_n=56, shin_n=-60, thigh_f=-34, shin_f=-14, x=-2),
                    pose(BP, lean=46, y=4, arm_n=-50, fore_n=30, arm_f=-44, fore_f=30, thigh_n=50, shin_n=-40, thigh_f=-40, shin_f=-50, x=8),
                    pose(BP, lean=40, y=6, arm_n=12, fore_n=12, arm_f=8, fore_f=14, thigh_n=22, thigh_f=-10)]
    P['bstun'] = [pose(BP, lean=18, head=26, arm_n=8, fore_n=16, arm_f=4, fore_f=14, thigh_n=8, thigh_f=-8)]
    P['kslam'] = [pose(BP, lean=-14, arm_n=168, fore_n=8, arm_f=168, fore_f=8, x=-3),
                  pose(BP, lean=34, y=10, arm_n=62, fore_n=6, arm_f=58, fore_f=8, x=6, thigh_n=40, thigh_f=-30),
                  pose(BP, lean=20, arm_n=40, fore_n=20, arm_f=40, fore_f=20)]
    return P


def razor_acc(P):
    """RAZOR's headband-free look needs nothing; his blades are drawn by the game from the hand's place."""
    return None


def razor_poses(fig):
    hp = hero_poses(fig)
    RP = pose(GUARD, lean=10, y=3, arm_n=44, fore_n=100, arm_f=50, fore_f=96, thigh_n=18, thigh_f=-16)
    P = {'hurt': [HIT], 'fly': hp['fly'], 'lie': hp['lie'], 'getup': [hp['getup'][0], pose(RP, y=16, lean=20)]}
    P['idle'] = [RP, pose(RP, y=4, arm_n=48, arm_f=54)]
    P['walk'] = stomp(arm_n=44, fore_n=100, arm_f=50, fore_f=96, lean=9)
    P['rslash1'] = [pose(RP, lean=-6, y=8, arm_n=-24, fore_n=84, x=-3),
                    pose(RP, lean=26, y=8, arm_n=96, fore_n=2, arm_f=40, fore_f=100, x=7, thigh_n=54, shin_n=-54, thigh_f=-46, shin_f=-4),
                    pose(RP, lean=14, arm_n=60, fore_n=46)]
    P['rslash3'] = [pose(RP, lean=-14, y=6, arm_n=152, fore_n=14, arm_f=40, fore_f=100, x=-4),
                    pose(RP, lean=34, y=14, arm_n=56, fore_n=-4, arm_f=40, fore_f=110, x=9, thigh_n=64, shin_n=-66, thigh_f=-56, shin_f=-2),
                    pose(RP, lean=18, y=6, arm_n=40, fore_n=50)]
    P['rcrouch'] = [pose(RP, lean=24, y=18, arm_n=30, fore_n=70, arm_f=30, fore_f=70, thigh_n=60, shin_n=-72, thigh_f=-32, shin_f=-30)]
    P['rleap'] = [pose(JUMP, lean=-6, y=0, arm_n=140, fore_n=20, arm_f=130, fore_f=20, thigh_n=70, shin_n=-100, thigh_f=40, shin_f=-100)]
    P['rdive'] = [pose(JUMP, lean=26, arm_n=-30, fore_n=40, arm_f=-20, fore_f=40, thigh_n=62, shin_n=-14, foot_n=20, thigh_f=20, shin_f=-80)]
    P['rland'] = [pose(RP, lean=22, y=16, arm_n=20, fore_n=40, arm_f=20, fore_f=40, thigh_n=54, shin_n=-60, thigh_f=-24, shin_f=-20)]
    return P


if __name__ == '__main__':             # python3 figures.py out.png [clip ...]: a contact sheet of the hero's clips
    art = Art()
    art.region('spr', 414, 1023)
    P = art.sprite_palette(0, PALS[0])
    hero = make_hero(P)
    clips = render_clips(lambda m: make_hero(P, m), hero_poses(hero))
    names = sys.argv[2:] or list(clips)
    sh = Sheet(scale=3)
    k = 0
    for n in names:
        for i, f in enumerate(clips[n]):
            sh.add('%s%d' % (n, i), f, P); k += 1
            if k % 8 == 0: sh.row()
    sh.save(sys.argv[1])
    for n in clips:
        print(n, len(clips[n]), [bbox_rows(f) for f in clips[n]][:1])


def grounding(make, poses, skip=('jump', 'jkick', 'fly')):
    """Where each pose's lowest pixel sits against the ground line (0 = on it, > 0 sunk below the frame, < 0 floating):
    the figure is drawn again on a taller canvas, where nothing is cut off."""
    fig = make(24)
    base = 24 + 72 + (83 - 78)
    out = {}
    for k, v in poses.items():
        if k in skip: continue
        out[k] = [max(bbox_rows(fig.render(p)), key=lambda r: r) - base for p in v]
    return out


# The palettes that change while the game runs (art.py writes them into code.js as SWAP; setPal() sets one):
SWAP = {
    'thug': [PALS[2], layout('d8a070', '2a2418', '6a7a38', '3a4050', ['302830', '605868']),       # the dockhand's olive
             layout('d8a078', '14101c', '2e3050', '22222c', ['302830', '605868'])],               # the enforcer's dark suit
    'fire': PALS[6],
    'brute': layout('d89870', '1c1018', '8a2c3c', '3a3040', ['a08020', 'f0c030']),
    # the bosses (palette 6 while one is on): BULL, RAZOR, KINGPIN, and KINGPIN in his rage
    'boss': [layout('e0904c', '5a2a18', 'd05028', '3a2c4a', ['c02828', 'e8b830']),
             layout('e8c0a0', 'd8d8e8', '18505a', '282830', ['b8c0d0', 'f0f4ff']),
             layout('d8a078', '1a1a20', '20203a', '181828', ['303040', 'e8b830']),
             layout('d8a078', '1a1a20', '8a1c24', '281018', ['e83030', 'ffd848'])],
}


def packed(lay):
    """A layout as 15 console colours (5 bits a channel, r | g << 5 | b << 10), in the palette's order."""
    from colour import console
    out = []
    for v in lay.values():
        for c in (v if isinstance(v, (list, tuple)) else [v]):
            r, g, b = (int(console(c)[i:i + 2], 16) >> 3 for i in (0, 2, 4))
            out.append(r | g << 5 | b << 10)
    return out
