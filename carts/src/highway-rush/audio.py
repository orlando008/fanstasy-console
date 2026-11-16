# Highway Rush's audio: carts/src/highway-rush/audio.json.
#   python3 carts/src/highway-rush/audio.py carts/src/highway-rush/audio.json
# Three songs (0 the title, 1 the results, 2 the race) and the effects numbered as SFX in code.js (the engine's six pitches are 19 to 24). Written with the song
# toolkit (tools/devkit/music/kit.py; its header explains the bar() arguments). Rules (playbook section 5):
# leads are quiet, with no vibrato; songs use channels 0 to 5, the engine channel 6 and the effects channel 7; the drums are
# samples on channel 5. The new sound chip (SPEC 5): sampled instruments from samples.py (a.voice) and an echo per song.
# After a change: node tools/devkit/music/loud.mjs carts/highway-rush.nova --check (levels; the lead alone must stay at most
# 0.07 RMS and 0.75 of the mix) and python3 tools/devkit/music/clash.py on the json.
# Ready-made songs (a boss theme, a victory, a town...): tools/devkit/music/songs/README.md, added after the game's own
# with library.add(a, name), which returns the song's number.
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../../tools/devkit/music'))
from kit import *

a = Audio(chip=2)
a.sample(kick()); a.sample(snare()); a.sample(hat(0.05, 70, 3)); a.sample(hat(0.15, 22, 5))

a.voice('LEAD', 'flute', 5, -0.15)
a.voice('BASS', 'bass', 12)
a.instrument('HAT', 'sample', 0, 0, 15, 0, 4, pan=0.25, sample=2)
a.instrument('OHAT', 'sample', 0, 0, 15, 0, 4, pan=0.25, sample=3)
a.voice('PAD', 'strings', 5, 0.2)
a.voice('ARP', 'pluck', 13, 0.25)
a.instrument('KICK', 'sample', 0, 0, 15, 0, 12, sample=0, echo=2)
a.instrument('SNARE', 'sample', 0, 0, 15, 0, 10, sample=1, echo=5)
a.voice('SOFTHORN', 'brass', 6, -0.15, a=6)
# effects from here on (they play on channel 7; the engine on 6)
a.instrument('BEEP', 'pulse50', 0, 8, 8, 4, 9, echo=4)
a.voice('GO', 'brass', 11, d=14, s=10, r=6)
a.voice('FANFARE', 'brass', 11, d=6, s=11, r=6)
a.instrument('BLIP', 'pulse12', 0, 3, 0, 0, 8, echo=4)
a.voice('CHIME', 'celesta', 12)
a.voice('THUD', 'tom', 12)
a.voice('CRASH', 'crash', 15)
a.instrument('ZAP', 'saw', 0, 5, 4, 3, 7)                    # sweeps: the boost, the red pad
a.instrument('SPLAT', 'noise-short', 0, 5, 1, 3, 8)
a.instrument('SCRAPE', 'noise-short', 0, 3, 3, 2, 6)
a.instrument('ENG', 'noise', 0, 3, 5, 1, 4)                  # the engine runs on the noise voice: a low, buzzing rasp
a.instrument('ENGT', 'noise-short', 0, 2, 5, 1, 4)           # ... and its turbo edge
a.instrument('PUFF', 'noise', 0, 3, 0, 0, 5)

# --- 0 The title: A minor, 150 bpm ---
S = a.song(Key('A', MINOR), 6, echo=(5, 4, 5, 9))
CH = ['1', '6', '3', '7']
bars(S, 16, CH, None, drums='soft', bass='long', upper='pad', counter='1 3 5 8 5 3 1 3', ci='ARP')   # the pad first, so the lead does not arrive with a jump
bars(S, 16, CH, ['A3 - C4 - E4 - A4 -', 'A4 - G4 - F4 - C4 -', 'E4 - G4 - C5 - G4 -', 'D4 - G4 - B4 - G4 -'], li='SOFTHORN', drums='drive', bass='1 - - - 5 - - -', upper='arp1')
S.finish()

# --- 1 The results: C major, 128 bpm ---
S = a.song(Key('C', MAJOR), 7, echo=(5, 4, 5, 9))
CH = ['1', '5', '6', '4']
bars(S, 16, CH, ['C4 - E4 - G4 - E4 -', 'D4 - G4 - B4 - G4 -', 'E4 - A4 - C5 - A4 -', 'C4 - F4 - A4 - F4 -'], li='LEAD', drums='basic', bass='1 - 5 - 1 - 5 -', upper='arp')
bars(S, 16, CH, ['G4 - E4 - C4 - E4 -', 'B4 - G4 - D4 - G4 -', 'A4 - C5 - E5 - C5 -', 'A4 - F4 - C4 - F4 .'], li='SOFTHORN', drums='basic', bass='1 - 5 - 1 - 5 -', upper='arp1')
S.finish()

# --- 2 The race: E minor, 180 bpm, a driving ostinato under a lead that climbs ---
S = a.song(Key('E', MINOR), 5, echo=(4, 4, 5, 9))
CH = ['1', '6', '3', '7']
bars(S, 16, CH, None, drums='basic', bass='1 - 1 5 1 - 5 1', upper='arp', counter='1 5 8 5 1 5 8 5', ci='ARP')    # the groove alone first
bars(S, 16, CH, ['B4 - B4 A4 G4 - E4 -', 'A4 - A4 G4 E4 - C4 -', 'G4 - B4 D5 B4 - G4 -', 'F#4 - A4 - D5 - A4 -'], li='LEAD', drums='drive', bass='1 - 1 5 1 - 5 1', upper='arp')
bars(S, 16, CH, ['E5 - D5 B4 - G4 B4 -', 'E5 - C5 A4 - E4 G4 -', 'D5 - B4 G4 - B4 D5 -', 'F#5 - D5 A4 - D5 F#5 -'], li='SOFTHORN', drums='drive', bass='1 - 1 5 1 - 5 1', upper='arp1')
bars(S, 16, CH, ['B4 - D5 - E5 - D5 B4', 'C5 - E5 - G5 - E5 C5', 'B4 - D5 - G5 - D5 B4', 'A4 - D5 - F#5 - D5 A4'], li='LEAD', drums='drive', bass='1 - 1 5 1 - 5 1', upper='arp')
S.finish()

# --- Effects: the order is the SFX table in code.js ---
def engine(speed, note, rows, inst='ENG', puff=4):
    """A rasp of short notes with a puff of exhaust now and then."""
    cells = [None] * 32
    for k in range(rows):
        cells[k] = {'n': 'C-6', 'i': a.I['PUFF']} if puff and k % puff == puff - 1 else {'n': note, 'i': a.I[inst]}
    return a.effect_rows(speed, cells)
sfx = a.effect
sfx(1, ['E-6', 'OFF'], 'BLIP')                                                                # 0 menu move
sfx(2, ['C-6', 'G-6', 'OFF'], 'CHIME')                                                        # 1 select
sfx(2, ['E-5', 'B-5', 'OFF'], 'CHIME')                                                        # 2 pause
sfx(5, ['C-5', 'OFF'], 'BEEP')                                                                # 3 a countdown beep
sfx(5, ['C-6', None, 'OFF'], 'GO')                                                            # 4 GO
sfx(1, ['C-3', 'E-3', 'G-3', 'C-4', 'E-4', 'G-4', 'C-5', 'E-5', 'G-5', 'C-6', 'OFF'], 'ZAP')   # 5 turbo: a rising sweep
sfx(1, ['C-5', 'G-5', 'C-6', 'E-6', 'OFF'], 'BLIP')                                           # 6 a green pad
sfx(1, ['C-4', 'A-3', 'F-3', 'D-3', 'B-2', 'OFF'], 'ZAP')                                     # 7 a red pad: a falling sweep
sfx(2, ['E-3', 'C-3', 'A-2', 'OFF'], 'THUD')                                                  # 8 a cone
sfx(2, ['A-3', 'F-3', 'C-3', 'A-2', 'OFF'], 'SPLAT')                                          # 9 oil
sfx(1, ['G-5', 'C-6', 'E-6', 'G-6', 'C-7', 'OFF'], 'CHIME')                                   # 10 a mystery cube
sfx(2, ['C-5', 'E-5', 'G-5', 'C-6', 'OFF'], 'CHIME')                                          # 11 a shield goes up
sfx(2, ['C-7', 'G-6', 'D-6', 'OFF'], 'SPLAT')                                                 # 12 the shield breaks
sfx(2, ['G-4', 'D-4', 'OFF'], 'BLIP')                                                         # 13 an oil drop
sfx(3, ['C-4', 'G-3', 'D-3', 'A-2', 'OFF'], 'CRASH')                                          # 14 a collision
sfx(2, ['A-5', 'G-5', 'OFF'], 'SCRAPE')                                                       # 15 scraping the rail
sfx(1, ['C-5', 'E-5', 'G-5', 'OFF'], 'BLIP')                                                  # 16 you pass a car
sfx(5, ['C-5', 'E-5', 'G-5', 'C-6', None, 'G-5', 'C-6', 'E-6', None, 'G-6', None, None, 'C-7', None, None, None, 'OFF'], 'FANFARE')   # 17 the finish
sfx(4, ['C-5', 'E-5', 'G-5', 'C-6', None, 'G-5', 'C-6', 'OFF'], 'FANFARE')                    # 18 a good place
engine(4, 'C-0', 8, 'ENG', 0)                                                                # 19 the engine, idling
engine(3, 'C-1', 11, 'ENG', 0)                                                               # 20 ... slow
engine(2, 'G-1', 16, 'ENG', 0)                                                               # 21 ... medium
engine(1, 'D-2', 32, 'ENG', 0)                                                               # 22 ... fast
engine(1, 'G-2', 32, 'ENG', 0)                                                               # 23 ... flat out
engine(1, 'D#3', 32, 'ENGT', 0)                                                              # 24 ... with the turbo

a.write(sys.argv[1], songs=3)
