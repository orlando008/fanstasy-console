# Bit's Console Quest: the campaign's stages, written into the ROM (rom/stages.bin, JSON) that code.js reads at start
# (loadStages). Kept here, out of the 64 KB of code, since the second pass made the stages long (spec step 13).
#   python3 carts/src/bits-console-quest/stages.py            write rom/stages.bin
#   python3 carts/src/bits-console-quest/stages.py --check    exit 1 if it is not up to date
# Each stage is [index, name, treasure's name, width, Bit's start height, layout]; code.js's campaignStage() builds the
# rest. The helpers make the same objects as code.js's (practice and the lab are still written there). Coordinates are
# pixels: x along the stage, y down from the top of the screen (a deck's top is where Bit stands); decks are tile aligned.
# After a change: the stage's route (tests/carts/bits-console-quest/solve.mjs, waypoints.mjs) and jump-windows.mjs.
import json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))

def stageDeck(x, w, y, h=24): return dict(x=x, y=y, w=w, h=h)
def ledge(x, w, y): return dict(stageDeck(x, w, y, 8), oneWay=True)
def liftAt(id, x, y, top): return dict(id=id, kind='lift', x=x, y=y, w=56, top=top)
def springAt(id, x, y, w=24): return dict(id=id, kind='spring', x=x, y=y, w=w)
def span(kind, id, x, y, w=128): return dict(kind=kind, id=id, x=x, y=y, w=w)
def shelfAt(id, x, y, target, w=56): return dict(id=id, kind='shelf', x=x, y=y, target=target, w=w)
def power(id, x, y): return dict(id=id, mode='once', x=x, y=y, on=[id])
def mounted(id, dy=-10, dx=28): return dict(id=id, mode='once', mount=id, dx=dx, dy=dy, on=[id])
def relay(id, x, y, on, off=[]): return dict(id=id, mode='switch', x=x, y=y, on=on, off=off)
def contact(x, y, offset=0): return dict(kind='contact', x=x, y=y, w=24, offset=offset)
def press(x, y, offset=0): return dict(kind='press', x=x, y=y, w=40, raisedY=max(22, y - 66), offset=offset)
def point(x, y): return dict(x=x, y=y)
def sign(x, y, text): return dict(x=x, y=y, text=text)
def stage(index, name, treasure_name, width, spawn_y, layout): return [index, name, treasure_name, width, spawn_y, layout]

# Step 11 made the first two zones' stages about twice to three times as long: each keeps its opening (the part the
# first version had, where it teaches its device) and adds two harder sections after it.
STAGE0 = stage(0, 'BUTTON ASSEMBLY', 'PROTOTYPE D-PAD', 3072, 192, dict(
  deck= [
    stageDeck(0, 184, 192, 32), stageDeck(224, 168, 192, 32),
    stageDeck(520, 128, 112), stageDeck(688, 112, 112), stageDeck(928, 224, 112),
    ledge(592, 48, 80),
    # stepping stones, one under a press; a lift to a high deck of contacts
    stageDeck(1208, 40, 112), stageDeck(1296, 40, 128), stageDeck(1384, 176, 112), stageDeck(1656, 192, 48),
    # a long scanline span on its clock, a press and a contact, then a run down to the exit
    stageDeck(1896, 96, 120), stageDeck(2152, 160, 120), stageDeck(2376, 104, 104),
    stageDeck(2552, 200, 152), stageDeck(2800, 272, 152),
  ],
  devices=[liftAt('lift', 424, 192, 112), springAt('spring', 568, 112, 22), span('scanline', 'scanline', 800, 112),
    liftAt('lift2', 1576, 112, 48), span('scanline', 'scan2', 1992, 120, 160)],
  sockets=[mounted('lift'), power('spring', 543, 101), power('scanline', 774, 101), mounted('lift2'), power('scan2', 1966, 109)],
  beacons=[point(304, 192), point(736, 112), point(1424, 112)],
  hazards=[contact(972, 112), press(1056, 112), press(1296, 128, 40), contact(1704, 48, 20), contact(1784, 48, 80),
    press(2200, 120), contact(2264, 120, 60), contact(2600, 152, 10), contact(2680, 152, 70), press(2880, 152, 30)],
  signs=[sign(88, 140, 'A JUMP'), sign(760, 50, 'POWER + RUN')],
  goal=point(3040, 141), treasure=point(616, 62),
  pieces=[point(278, 175), point(607, 49)],
))

STAGES = [
  STAGE0,
  stage(1, 'CABLE WORKS', 'BRAIDED CABLE', 3120, 192, dict(
    deck= [
      stageDeck(0, 224, 192, 32), stageDeck(208, 264, 136),
      stageDeck(592, 320, 72), ledge(736, 48, 40),
      stageDeck(952, 168, 88), stageDeck(1160, 200, 104),
      # drop onto a lift and ride it up; a spring is the only way up to a deck of contacts
      stageDeck(1464, 144, 64), stageDeck(1672, 72, 120), stageDeck(1800, 144, 48),
      # a lift ridden down, presses, and a last run between contacts
      stageDeck(2048, 160, 168), stageDeck(2264, 200, 136),
      # a lift up from a drop, one-way ledges up and over, and two presses before the exit
      stageDeck(2568, 120, 72), ledge(2744, 40, 96), ledge(2832, 40, 72), stageDeck(2920, 200, 104),
    ],
    devices=[springAt('spring', 160, 192), liftAt('lift', 496, 136, 72), liftAt('lift2', 1384, 184, 64),
      springAt('spring2', 1712, 120), liftAt('lift3', 1968, 168, 48), liftAt('lift4', 2488, 184, 72)],
    sockets=[power('spring', 108, 181), mounted('lift'), mounted('lift2'), power('spring2', 1688, 109), power('lift3', 1930, 37),
      mounted('lift4')],
    beacons=[point(332, 136), point(980, 88), point(1500, 64), point(2600, 72)],
    hazards=[press(1240, 104, 32), contact(1856, 48, 40), press(2096, 168), press(2160, 168, 72),
      contact(2328, 136), press(2400, 136, 60), contact(2632, 72, 30), press(2976, 104, 20), press(3040, 104, 92)],
    signs=[sign(114, 129, 'POWER THE SPRING'), sign(504, 82, 'RIDE THE LIFT')],
    goal=point(3088, 93), treasure=point(760, 23),
    pieces=[point(144, 177), point(1008, 73)],
  )),
  stage(2, 'CONTACT MINE', 'CLEAR-SHELL CART', 3320, 184, dict(
    deck= [
      stageDeck(0, 352, 184, 40), stageDeck(536, 288, 184, 40),
      ledge(664, 64, 144), stageDeck(864, 176, 160), stageDeck(1080, 200, 184, 40),
      # a second shelf across a bay; stepping stones with live contacts on them
      stageDeck(1480, 160, 184, 40), stageDeck(1704, 40, 168), stageDeck(1792, 40, 152), stageDeck(1880, 40, 168),
      # a run through a wave of contacts, a third shelf, and a climb to the exit
      stageDeck(1968, 200, 184, 40), stageDeck(2360, 168, 152),
      # stones over a bay, contacts in turn, and a fourth shelf down to the exit
      stageDeck(2592, 40, 136), stageDeck(2688, 40, 120), stageDeck(2784, 160, 152), stageDeck(3144, 176, 184, 40),
    ],
    devices=[shelfAt('shelf', 352, 184, 488), shelfAt('shelf2', 1280, 184, 1416), shelfAt('shelf3', 2168, 184, 2296),
      shelfAt('shelf4', 2944, 152, 3080)],
    sockets=[mounted('shelf'), mounted('shelf2'), mounted('shelf3'), mounted('shelf4')],
    beacons=[point(304, 184), point(784, 184), point(1600, 184), point(2810, 152)],
    hazards=[contact(152, 184, 30), contact(584, 184, 72), contact(1120, 184, 16), contact(1520, 184, 40),
      contact(1576, 184, 100), contact(1712, 168), contact(1888, 168, 60), contact(2016, 184, 20),
      contact(2072, 184, 50), contact(2128, 184, 80), contact(2424, 152, 40), contact(2848, 152), contact(2904, 152, 50)],
    signs=[sign(160, 125, 'JUMP LIVE CONTACTS'), sign(378, 120, 'PLUG IN ON SHELF')],
    goal=point(3288, 173), treasure=point(704, 129),
    pieces=[point(254, 168), point(930, 143)],
  )),
  stage(3, 'SLOT ELEVATOR', 'GOLD CONTACT BOARD', 3240, 200, dict(
    deck= [
      stageDeck(0, 176, 200), stageDeck(288, 288, 120),
      stageDeck(696, 320, 56), stageDeck(1056, 304, 104), ledge(1112, 80, 72),
      # a lift ridden down to contacts; a staircase of two lifts
      stageDeck(1464, 160, 184), stageDeck(1728, 96, 120), stageDeck(1928, 160, 48),
      # a pair of presses, and a last lift up to the exit
      stageDeck(2136, 200, 144), stageDeck(2440, 160, 64),
      # down again past two presses, and a last run between contacts
      stageDeck(2664, 96, 96), stageDeck(2816, 160, 128), stageDeck(3024, 216, 104),
    ],
    devices=[liftAt('lift', 200, 200, 120), liftAt('upperLift', 600, 120, 56), liftAt('lift3', 1384, 184, 104),
      liftAt('lift4', 1648, 184, 120), liftAt('lift5', 1848, 120, 48), liftAt('lift6', 2360, 144, 64)],
    sockets=[mounted('lift'), mounted('upperLift'), power('lift3', 1340, 93), mounted('lift4'), mounted('lift5'), mounted('lift6')],
    beacons=[point(362, 120), point(918, 56), point(1500, 184), point(2160, 144)],
    hazards=[contact(445, 120, 48), press(1232, 104, 88), contact(1520, 184, 10), contact(1584, 184, 70),
      contact(1976, 48, 30), press(2200, 144), press(2264, 144, 72), contact(2496, 64, 50), press(2864, 128, 30),
      press(2928, 128, 102), contact(3080, 104), contact(3144, 104, 60)],
    goal=point(3208, 93), treasure=point(1156, 56),
    pieces=[point(330, 104), point(752, 40)],
  )),
  # Step 12: the Gardens and the Skyline the same way, each opening kept and harder sections after it
  stage(4, 'TRACE TRAIL', 'CERAMIC LOGIC CHIP', 3000, 184, dict(
    deck= [
      stageDeck(0, 232, 184, 40), stageDeck(360, 192, 184, 40),
      stageDeck(592, 216, 160), ledge(664, 64, 120),
      stageDeck(936, 184, 160), stageDeck(1160, 160, 136),
      # a third trace, stones, and a press over a long board
      stageDeck(1448, 120, 136), stageDeck(1632, 40, 112), stageDeck(1728, 176, 96),
      # a fourth trace, a descent, and a last trace onto a board of contacts
      stageDeck(2032, 120, 96), stageDeck(2208, 40, 128), stageDeck(2296, 40, 160), stageDeck(2392, 200, 184, 40),
      stageDeck(2752, 248, 160),
    ],
    devices=[span('bridge', 'firstBridge', 232, 184), span('bridge', 'secondBridge', 808, 160),
      span('bridge', 'thirdBridge', 1320, 136), span('bridge', 'fourthBridge', 1904, 96), span('bridge', 'lastBridge', 2592, 184, 160)],
    sockets=[power('firstBridge', 204, 173), power('secondBridge', 776, 149), power('thirdBridge', 1300, 125),
      power('fourthBridge', 1880, 85), power('lastBridge', 2570, 173)],
    beacons=[point(480, 184), point(768, 160), point(1748, 96), point(2410, 184)],
    hazards=[contact(1000, 160, 46), contact(1488, 136, 30), press(1784, 96, 50), contact(1856, 96, 100),
      contact(2448, 184, 20), contact(2512, 184, 80), contact(2800, 160, 10), contact(2880, 160, 70)],
    signs=[sign(205, 120, 'POWER THE TRACE')],
    goal=point(2968, 149), treasure=point(707, 105),
    pieces=[point(420, 168), point(675, 104)],
  )),
  stage(5, 'RELAY GROVE', 'RELAY MODULE', 2920, 184, dict(
    deck= [
      stageDeck(0, 264, 184, 40), stageDeck(392, 256, 184, 40), ledge(592, 40, 128),
      stageDeck(776, 248, 184, 40), stageDeck(1064, 184, 160), stageDeck(1288, 176, 136), ledge(1376, 48, 72),
      # a third relay trades a spring up to a cache for the bridge on; stones; two presses
      stageDeck(1592, 128, 136), stageDeck(1784, 40, 112), stageDeck(1880, 40, 88), stageDeck(1976, 200, 112),
      # a fourth relay: the bridge powered at first goes nowhere; the one below goes on
      stageDeck(2272, 32, 112), stageDeck(2336, 192, 160), stageDeck(2584, 64, 136), stageDeck(2696, 224, 112),
    ],
    devices=[
      span('bridge', 'firstBridge', 264, 184), shelfAt('shelf', 144, 144, 200),
      span('bridge', 'secondBridge', 648, 184), springAt('spring', 562, 184),
      span('bridge', 'bridge3', 1464, 136), springAt('spring3', 1396, 136),
      span('bridge', 'bridge4', 2176, 160, 160), span('bridge', 'bridge5', 2176, 112, 96),
    ],
    sockets=[relay('firstRelay', 236, 173, ['firstBridge'], ['shelf']),
      relay('secondRelay', 630, 173, ['secondBridge'], ['spring']), relay('thirdRelay', 1440, 125, ['bridge3'], ['spring3']),
      relay('fourthRelay', 2150, 101, ['bridge4'], ['bridge5'])],
    beacons=[point(468, 184), point(790, 184), point(1612, 136), point(2356, 160)],
    hazards=[contact(850, 184, 12), contact(954, 184, 65), contact(1632, 136, 40), contact(1680, 136, 100),
      press(2040, 112), press(2104, 112, 72), contact(2400, 160, 30), contact(2464, 160, 90)],
    signs=[sign(232, 116, 'ROUTE POWER'), sign(583, 92, 'SPRING CACHE')],
    goal=point(2888, 101), treasure=point(622, 111),
    pieces=[point(480, 168), point(1400, 55)],
  )),
  stage(6, 'PHOSPHOR ROOFTOPS', 'PHOSPHOR SWATCH', 3024, 144, dict(
    deck= [
      stageDeck(0, 200, 144), stageDeck(328, 232, 144),
      stageDeck(696, 200, 144), ledge(728, 72, 104),
      stageDeck(936, 176, 120), stageDeck(1152, 160, 96),
      # a third span; two spans in a row with a stone between
      stageDeck(1472, 96, 96), stageDeck(1624, 120, 80), stageDeck(1872, 32, 80), stageDeck(2032, 160, 104),
      # rooftops under presses, and a last long span
      stageDeck(2256, 64, 88), stageDeck(2384, 64, 72), stageDeck(2504, 200, 96), stageDeck(2864, 160, 96),
    ],
    devices=[span('scanline', 'firstScanline', 200, 144), span('scanline', 'secondScanline', 560, 144, 136),
      span('scanline', 'scan3', 1312, 96, 160), span('scanline', 'scan4', 1744, 80), span('scanline', 'scan5', 1904, 80),
      span('scanline', 'scan6', 2704, 96, 160)],
    sockets=[power('firstScanline', 172, 133), power('secondScanline', 532, 133), power('scan3', 1290, 85),
      power('scan4', 1720, 69), power('scan5', 1888, 69), power('scan6', 2680, 85)],
    beacons=[point(496, 144), point(850, 144), point(2052, 104), point(2520, 96)],
    hazards=[contact(426, 144, 45), contact(1004, 120, 25), contact(2096, 104, 20), contact(2160, 104, 80),
      press(2560, 96, 10), press(2640, 96, 82)],
    signs=[sign(165, 80, 'POWER + RUN'), sign(532, 78, 'GOLD MEANS GO')],
    goal=point(2992, 85), treasure=point(775, 89),
    pieces=[point(368, 127), point(746, 88)],
  )),
  stage(7, 'PICTURE LOCK', 'CRT TUNING DIAL', 3024, 192, dict(
    deck= [
      stageDeck(0, 192, 192, 32), stageDeck(312, 224, 112),
      stageDeck(664, 208, 112), ledge(728, 64, 72),
      stageDeck(864, 216, 56), stageDeck(1208, 360, 56),
      # down to a span, a lift up to a deck of contacts
      stageDeck(1624, 96, 104), stageDeck(1848, 120, 104), stageDeck(2048, 192, 48),
      # a long span, a press, and a run of rooftops to the exit
      stageDeck(2296, 64, 112), stageDeck(2520, 120, 112), stageDeck(2696, 64, 136), stageDeck(2808, 216, 120),
    ],
    devices=[liftAt('lift', 216, 192, 112), span('scanline', 'firstScanline', 536, 112),
      springAt('spring', 824, 112), span('scanline', 'lastScanline', 1080, 56),
      span('scanline', 'scan3', 1720, 104), liftAt('lift2', 1968, 104, 48), span('scanline', 'scan4', 2360, 112, 160)],
    sockets=[mounted('lift'), power('firstScanline', 506, 101),
      power('spring', 804, 101), power('lastScanline', 1044, 45),
      power('scan3', 1700, 93), mounted('lift2'), power('scan4', 2336, 101)],
    beacons=[point(378, 112), point(704, 112), point(1016, 56), point(1868, 104), point(2530, 112)],
    hazards=[contact(112, 192, 42), press(424, 112, 76),
      press(1290, 56, 40), contact(1420, 56, 64), contact(1888, 104, 50), contact(2096, 48, 30), contact(2160, 48, 90),
      press(2560, 112, 40), contact(2864, 120), contact(2928, 120, 60)],
    signs=[sign(504, 46, 'POWER + RUN'), sign(820, 24, 'SPRING UP')],
    goal=point(2992, 109), treasure=point(770, 55),
    pieces=[point(388, 96), point(744, 55)],
  )),
]


if __name__ == '__main__':
    data = json.dumps(STAGES, separators=(',', ':')).encode('ascii')
    path = os.path.join(HERE, 'rom', 'stages.bin')
    if '--check' in sys.argv:
        if not os.path.exists(path) or open(path, 'rb').read() != data: sys.exit('rom/stages.bin is not what stages.py makes: run python3 carts/src/bits-console-quest/stages.py')
        print('ok: rom/stages.bin is up to date (%d stages)' % len(STAGES))
    else:
        os.makedirs(os.path.dirname(path), exist_ok=True)
        open(path, 'wb').write(data)
        print('wrote rom/stages.bin (%d bytes, %d stages)' % (len(data), len(STAGES)))
