# Solitaire's audio: carts/src/solitaire/audio.json.
#   python3 carts/src/solitaire/audio.py carts/src/solitaire/audio.json
# The songs are the song library's (tools/devkit/music/songs/README.md): 0 The Entertainer (the title and the
# records), 1 the Canon in D (play), 2 the Ode to Joy (the win). The Canon's notes are from a CC BY 4.0 file: the
# records screen credits its engraver, Michael Fischer v. Mollard, Mutopia Project. The effects, numbered as SFX in
# code.js: the menus' own (a move, a select, the pause, a soft "no", a hint's chime, the record), then the card kit's
# (a shuffle, a deal, a flip, a place: tools/devkit/music/cardsfx.py). Songs use channels 0 to 6 (the library's hats on 6),
# effects 7, and 6 when two sound at once. After a change: node tools/devkit/music/loud.mjs carts/solitaire.nova --check
# and node tools/devkit/music/sfx.mjs carts/solitaire.nova 7.
import os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '../../../tools/devkit/music'))
sys.path.insert(0, os.path.join(HERE, '../../../tools/devkit/music/songs'))
from kit import *
from library import add
import cardsfx

a = Audio(chip=2)
TITLE = add(a, 'entertainer')        # 0
PLAY = add(a, 'canon')               # 1
WIN = add(a, 'ode_to_joy')           # 2
assert (TITLE, PLAY, WIN) == (0, 1, 2), 'code.js expects the songs as 0, 1 and 2'

# --- The menus' effects: soft, short, bright plucks and chimes; the order is the SFX table in code.js ---
a.instrument('BLIP', 'pulse12', 0, 3, 0, 0, 7)
a.instrument('CHIME', 'triangle', 0, 6, 5, 6, 10)
a.instrument('NOPE', 'triangle', 0, 4, 0, 0, 9)
a.instrument('BELL', 'pulse25', 0, 8, 4, 8, 7)
a.effect(1, ['E-6', 'OFF'], 'BLIP')                                # 0 the hand moves
a.effect(2, ['C-6', 'G-6', 'OFF'], 'CHIME')                        # 1 select: a card picked up or put down
a.effect(2, ['E-5', 'B-5', 'OFF'], 'CHIME')                        # 2 pause
a.effect(3, ['D-4', 'A-3', 'OFF'], 'NOPE')                         # 3 "no": a move the rules do not allow
a.effect(3, ['G-5', 'D-6', 'G-6', 'OFF'], 'BELL')                  # 4 a hint
a.effect(1, ['C-6', 'G-6', 'OFF'], 'BLIP')                         # 5 (spare: a point)
a.effect(4, ['C-5', 'E-5', 'G-5', 'C-6', None, 'G-5', 'C-6', 'OFF'], 'BELL')   # 6 a win, a record
CARD = cardsfx.add(a)
assert CARD == {'shuffle': 7, 'deal': 8, 'flip': 9, 'place': 10}, CARD

a.write(sys.argv[1], songs=3)
