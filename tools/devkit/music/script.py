"""Write an audio script (audio.py) for a game whose audio is only an audio.json, so its music can be edited as text
and regenerated the way the other games' is (docs/dev/sound-chip.md, phase 2).

    python3 tools/devkit/music/script.py carts/src/<name>/audio.json carts/src/<name>/audio.py

The script it writes uses the song toolkit (kit.py): instruments named I00 to I1F in their slots, the kit's drums by
name where a sample is one of them (kick(), snare(), hat()), other samples as base64, every pattern and effect as
tracker text (a row a line, a cell "NNN II V FFF" as in the console's tracker) and the songs as order lists. Running it
makes an audio.json that packs to exactly the same cart (check: pack it and compare the .nova).
"""
import base64, json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kit import cell_text, kick, snare, hat, pcm

src, out = sys.argv[1:3]
j = json.load(open(src))
chip = 2 if j.get('chip') == 2 else 1
width = 8 if chip == 2 else 6
name = os.path.basename(os.path.dirname(os.path.abspath(out)))
DEFAULT = {'wave': 'pulse50', 'a': 0, 'd': 4, 's': 10, 'r': 6, 'vol': 15, 'vib': [0, 0], 'pan': None}
KIT = {pcm(kick())['data']: 'kick()', pcm(snare())['data']: 'snare()', pcm(hat(0.05, 70, 3))['data']: 'hat(0.05, 70, 3)',
       pcm(hat(0.15, 22, 5))['data']: 'hat(0.15, 22, 5)'}

L = [f"# {name}'s audio: carts/src/{name}/audio.json.",
     f'#   python3 carts/src/{name}/audio.py carts/src/{name}/audio.json',
     '# Written by tools/devkit/music/script.py from the audio.json, so the music can be edited as text: instruments',
     '# I00 to I1F are the slots, patterns and effects are tracker text (a row a line; a cell is "NNN II V FFF": note,',
     '# instrument, volume, effect, as in the console\'s tracker), songs are order lists. Song toolkit: tools/devkit/music/kit.py.',
     'import os, sys',
     "sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../../tools/devkit/music'))",
     'from kit import *', '', f'a = Audio({"chip=2" if chip == 2 else ""})', '']
L.append('# --- Samples ---')
for k, smp in enumerate(j.get('samples', [])):
    if not smp:
        L.append(f"a.samples.append(None)  # {k}"); continue
    if smp['data'] in KIT and smp.get('rate', 16000) == 16000 and smp.get('loop') is None:
        L.append(f'a.sample({KIT[smp["data"]]})  # {k}')
    else:
        L.append(f"a.samples.append({{'rate': {smp.get('rate', 16000)}, 'loop': {smp.get('loop')!r}, 'data': '{smp['data']}'}})  # {k}")
L += ['', '# --- Instruments ---']
for k, ins in enumerate(j.get('instruments', [])):
    d = {**DEFAULT, **(ins or {})}
    args = [d['wave'], d['a'], d['d'], d['s'], d['r'], d['vol'], tuple(d['vib']), d['pan']]
    kw = ''.join([f", sample={d['sample']}" if 'sample' in d else '', f", echo={d['echo']}" if d.get('echo') else '',
                  f", curve={d['curve']!r}" if d.get('curve', 'lin') != 'lin' else ''])
    L.append(f"a.instrument('I{k:02X}', {', '.join(map(repr, args))}{kw})")
L += ['', '# --- Patterns ---']
for k, p in enumerate(j.get('patterns', [])):
    rows = [list(r) + [None] * (width - len(r)) for r in (p or {}).get('rows', [])]
    while rows and all(c is None for c in rows[-1]): rows.pop()
    text = '\n'.join(' '.join(cell_text(c) for c in r[:width]) for r in rows)
    L.append(f"a.pattern('''\n{text}\n''')  # {k}" if rows else f'a.pattern(\'\'\'\n{" ".join([cell_text(None)] * width)}\n\'\'\')  # {k} (empty)')
L += ['', '# --- Songs ---']
for k, s in enumerate(j.get('songs', [])):
    if not s: L.append(f'a.songs.append(None)  # {k}'); continue
    echo = s.get('echo')
    e = f", echo=({echo['delay']}, {echo['feedback']}, {echo['volume']}, {echo.get('tone', 10)})" if echo else ''
    L.append(f"a.order({s['order']}, {s.get('loop')!r}{e})  # {k}")
L += ['', '# --- Effects ---']
for k, e in enumerate(j.get('sfx', [])):
    if not e: L.append(f'a.sfx.append(None)  # {k}'); continue
    rows = list(e.get('rows', []))
    while rows and rows[-1] is None: rows.pop()
    text = '\n'.join(cell_text(c) for c in rows) or cell_text(None)
    L.append(f"a.effect_track({e.get('speed', 4)}, '''\n{text}\n''')  # {k}")
L += ['', 'a.write(sys.argv[1])', '']
open(out, 'w').write('\n'.join(L))
print(f'wrote {out}: {len(j.get("patterns", []))} patterns, {len(j.get("sfx", []))} effects, {len(j.get("songs", []))} songs')
