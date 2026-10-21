# The head templates (heads.json) from the artist's reference heads (docs/reference/heads-neutral.png and
# heads-expressions.png, their grids in docs/reference/heads/: see docs/reference/README.md).
#   python3 tools/devkit/art/templates/build.py
# Each grid's landmarks: the eye line, the chin, the ear (read off the neutral grids; the expressions are aligned to the
# neutral head of their view with trace.align(), and the alignment is kept here so the build is the same every time).
import os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..', '..'))
sys.path.insert(0, os.path.join(HERE, '..'))
from trace import load_grid, clean, trace_head, save

# grid characters -> (part, tone); 'auto' is hair above the brows and behind the ear, face elsewhere (HAIR below)
KEY = {'o': ('auto', 'line'), 'd': ('auto', 'deep'), 'h': ('auto', 'deep'), 'S': ('face', 'deep'), 's': ('face', 'shade'),
       'b': ('face', 'base'), 'l': ('face', 'light')}
# in the neutral grids: eye line y, chin y, ear (x, y); the hair test; where the shoulders start (left out)
NEUTRAL = {
    'three': dict(eye=30, chin=60, ear=(50, 38), hair=lambda x, y: y < 27 or x >= 45 or (x <= 11 and y < 38), cut=66),
    'side': dict(eye=29.5, chin=61.5, ear=(53, 41), hair=lambda x, y: y < 27 or x >= 45 or (y < 31 and x < 13), cut=68),
}
# each expression grid laid over its neutral one: (k, dx, dy) from trace.align()
ALIGN = {'angry': {'three': (0.90, 7, 2), 'side': (0.96, 7, 1)}, 'hurt': {'three': (1.00, 8, -1), 'side': (0.88, 8, 0)},
         'shout': {'three': (0.82, 9, -3), 'side': (0.80, 10, -4)}}


def build():
    out = {}
    for view, n in NEUTRAL.items():
        for expr in ('neutral', 'angry', 'hurt', 'shout'):
            k, dx, dy = (1.0, 0, 0) if expr == 'neutral' else ALIGN[expr][view]
            to = lambda x, y: (x * k + dx, y * k + dy)                 # neutral grid -> this grid
            back = lambda x, y: ((x - dx) / k, (y - dy) / k)          # this grid -> neutral grid
            rows = clean(load_grid(os.path.join(ROOT, 'docs', 'reference', 'heads', '%s-%s.txt' % (view, expr))))
            ex, ey = to(n['ear'][0], n['ear'][1])
            tpl = trace_head(rows, KEY, eye=(0, to(0, n['eye'])[1]), chin=to(0, n['chin'])[1], ear=(ex, ey), facing=-1,
                             hair=lambda x, y: n['hair'](*back(x, y)), cut=lambda x, y: back(x, y)[1] > n['cut'])
            out['%s-%s' % (view, expr)] = tpl
    return out


if __name__ == '__main__':
    t = build()
    save(t, os.path.join(HERE, 'heads.json'))
    print('heads.json: %s' % ', '.join(sorted(t)))
