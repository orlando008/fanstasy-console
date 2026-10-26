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
    1: layout('d89868', 'd8b040', '9a2c34', '3a4a78', ['b8b0b0', 'f0ece4']),
    2: layout('e0a878', '3a2418', 'c03830', '38384c', ['302830', '605868']),     # the street's thug (rewritten for each stage)
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
    P['throw'] = [pose(G, lean=-6, arm_n=60, fore_n=30, arm_f=60, fore_f=30, x=-2)]
    P['pick'] = [pose(G, y=26, lean=26, arm_n=40, fore_n=15, arm_f=44, fore_f=20, thigh_n=60, shin_n=-70, thigh_f=-10, shin_f=-80)]
    P['wthrow'] = [pose(G, lean=-6, arm_n=140, fore_n=-70, arm_f=50, fore_f=110, x=-2),
                   pose(G, lean=18, arm_n=90, fore_n=4, arm_f=44, fore_f=116, x=3, thigh_n=48, shin_n=-48, thigh_f=-36, shin_f=-6)]
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
    P['wknife'] = [cross(1), pose(cross(2), fore_n=2), cross(3)]
    return P


def thug_poses(fig):
    """The plain thug: a street fighter's upright guard, a swung punch, and the same falls as the hero."""
    hp = hero_poses(fig)
    TG = pose(GUARD, lean=8, y=2)
    P = {k: hp[k] for k in ('hurt', 'fly', 'lie', 'getup')}
    P['getup'] = [hp['getup'][0], pose(TG, y=14, lean=18)]
    P['idle'] = [TG, pose(TG, y=3, arm_n=34, arm_f=48, lean=9)]
    guard_walk = dict(arm_n=34, fore_n=110, arm_f=48, fore_f=105, lean=7)
    P['walk'] = [pose(k, **guard_walk) for k in fig.animate(WALK, 8)]
    P['tpunch'] = [pose(TG, lean=-6, arm_n=-20, fore_n=100, x=-2),            # the arm drawn back
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


def render_clips(make, poses):
    """Every pose as frames, each drawn on a tall canvas and seated so its lowest pixel is on the bottom row (a crouch or a
    lunge keeps its feet on the ground whatever the rig's offsets did); the poses in AIR keep the rig's own height."""
    big = make(24)
    out = {}
    for k, v in poses.items():
        frames = []
        for p in v:
            im = big.render(p)
            _, low = bbox_rows(im)
            dy = CH - 1 - low if k not in AIR else CH - 1 - low + (low - (24 + 72 + 5)) - 0
            f = Img(CW, CH)
            f.blit(im, PIVOT - int(im.w * 0.45), dy)
            frames.append(f)
        out[k] = frames
    return out


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
