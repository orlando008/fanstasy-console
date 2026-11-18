"""Regenerate Bit’s sprites, the practice wing, and the four zone backdrops."""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../../tools/devkit/art'))
from kit import Art, Img, big_text, ramp

art = Art()
art.region('bg', 1, 255)
art.region('spr', 256, 767)
art.region('campaign', 768, 1023)

art.gradient('sky', ['141126', '251b37', '41243f'], y0=0, y1=223)
art.gradient('labSky', ['121125', '1f1b38', '34284a'], y0=0, y1=223)
art.gradient('cavernSky', ['141124', '2d2036', '422942'], y0=0, y1=223)
art.gradient('gardenSky', ['102324', '1b3332', '2c4c3b'], y0=0, y1=223)
art.gradient('skylineSky', ['121427', '272543', '433050'], y0=0, y1=223)
overlay = {
    'INK': '151222', 'PANEL': '201a34', 'TRIM': '52446c', 'MUTED': 'b9afca',
    'WHITE': 'fff0d9', 'GOLD': 'ffca70', 'CYAN': '67f1e3', 'PURPLE': '9975c9',
    'CORAL': 'ec8868', 'STEEL': '665374', 'DARK': '382d4a',
    'HOT': 'ff665c', 'SIGNAL': 'afffd4',
}
for index, (name, rgb) in enumerate(overlay.items(), 225):
    art.color(index, rgb, name)

deck = art.palette(1, {
    'ink': '2b2139', 'face': ramp('8e675c', 4), 'rim': ramp('eb9874', 3),
})
top = Img(8, 8)
top.rect(0, 0, 8, 8, deck.face[1])
top.rect(0, 0, 8, 1, deck.rim[2])
top.rect(0, 1, 8, 2, deck.rim[1])
top.rect(0, 3, 8, 1, deck.ink)
top.rect(1, 5, 2, 1, deck.face[3])
art.tile('deckTop', top, pal=deck, region='bg')

side = Img(8, 8)
side.rect(0, 0, 8, 8, deck.face[0])
side.rect(0, 0, 8, 1, deck.ink)
side.line(0, 7, 6, 1, deck.face[1])
side.line(4, 7, 7, 4, deck.face[1])
art.tile('deckSide', side, pal=deck, region='bg')

far = art.palette(2, {
    'shadow': '201b33', 'steel': '342644', 'edge': '50344f', 'lamp': '78475a',
    'mould': '44304f', 'pin': '634059',
})
factory = Img(256, 224)
factory.rect(0, 36, 256, 6, far.steel)
factory.rect(0, 38, 256, 1, far.edge)
factory.rect(0, 86, 256, 4, far.shadow)
factory.rect(0, 152, 256, 3, far.steel)
for x, y, h in [(8, 68, 116), (72, 100, 94), (136, 60, 132), (200, 88, 104)]:
    factory.rect(x + 8, 40, 4, y - 40, far.steel)
    factory.rect(x, y, 24, h, far.shadow)
    factory.rect(x, y, 24, 2, far.edge)
    factory.rect(x + 2, y + 2, 2, h - 2, far.steel)
    factory.rect(x + 8, y + 8, 8, 2, far.lamp)
    for dy in range(24, h, 16):
        factory.rect(x + 8, y + dy, 12, 2, far.steel)
# Controller shells hang above the line, with the case halves and button cutouts still exposed.
mould = Img(96, 56)
mould.rect(43, 0, 10, 22, far.shadow)
mould.rect(44, 0, 3, 18, far.edge)
mould.rect(38, 15, 20, 5, far.pin)
mould.poly([(15, 19), (81, 19), (92, 30), (92, 49), (84, 55),
            (12, 55), (4, 49), (4, 30)], far.shadow)
mould.poly([(16, 20), (80, 20), (90, 30), (90, 46), (82, 51),
            (14, 51), (6, 46), (6, 30)], far.mould)
mould.line(16, 21, 79, 21, far.pin)
mould.line(15, 49, 80, 49, far.steel)
mould.disc(26, 36, 11, far.steel)
mould.rect(23, 28, 6, 18, far.shadow)
mould.rect(17, 34, 18, 6, far.shadow)
mould.rect(24, 29, 4, 1, far.edge)
mould.disc(65, 40, 6.5, far.shadow)
mould.disc(77, 32, 6.5, far.shadow)
mould.disc(65, 39, 4, far.pin)
mould.disc(77, 31, 4, far.pin)
mould.rect(43, 29, 9, 2, far.pin)
for x, y in [(24, 64), (152, 96)]:
    factory.rect(x + 44, 39, 5, y - 38, far.shadow)
    factory.blit(mould, x, y)
art.scene('factory', factory, pal=far, at=(0, 32), region='bg')

# The practice wing reuses the deck shapes in the lab's cooler palette.
art.palette(4, {
    'ink': '232039', 'face': ['2b2348', '393056', '57416e', '806099'],
    'rim': ['4d2a72', '814caa', 'b48add'],
})
practice = art.palette(5, {
    'shadow': '18172a', 'wall': '2b2244', 'panel': '352750',
    'purple': '51366e', 'standby': '396675', 'circuit': '3e3159',
})
wing = Img(256, 224)
wing.rect(0, 45, 256, 9, practice.shadow)
wing.rect(0, 47, 256, 1, practice.purple)
wing.rect(0, 156, 256, 14, practice.shadow)
wing.rect(0, 159, 256, 2, practice.circuit)
for x in range(0, 256, 64):
    wing.rect(x + 5, 55, 4, 102, practice.circuit)
    wing.rect(x + 13, 74, 43, 59, practice.shadow)
    wing.rect(x + 15, 76, 39, 55, practice.wall)
    wing.rect(x + 18, 80, 33, 20, practice.panel)
    wing.rect(x + 20, 82, 4, 1, practice.standby)
    wing.rect(x + 22, 113, 24, 2, practice.circuit)
    wing.rect(x + 22, 118, 14, 2, practice.circuit)
    wing.rect(x + 13, 140, 12, 3, practice.purple)
art.scene('lab', wing, pal=practice, at=(64, 32), region='bg')

# The campaign reuses five backdrop roles, recolored per zone at load time.
zones = art.palette(6, {
    'shadow': '1d172d', 'panel': '2d233f', 'rim': '4b3051',
    'detail': '6d4c67', 'light': '96695c',
})
art.palette(7, {
    'ink': '251c34', 'face': ['433046', '59404e', '83574e', 'ae7962'],
    'rim': ['6d3c5b', 'bd7865', 'f0b887'],
})

cavern = Img(256, 224)
for x, y in [(8, 58), (136, 86)]:
    cavern.rect(x + 28, 24, 4, y - 24, zones.rim)
    cavern.poly([(x + 6, y), (x + 100, y), (x + 112, y + 16), (x + 112, y + 93),
                 (x, y + 93), (x, y + 8)], zones.shadow)
    cavern.rect(x + 5, y + 8, 102, 75, zones.panel)
    cavern.rect(x + 10, y + 14, 91, 2, zones.rim)
    cavern.rect(x + 18, y + 26, 75, 24, zones.rim)
    cavern.rect(x + 21, y + 29, 69, 18, zones.panel)
    cavern.rect(x + 10, y + 60, 90, 14, zones.shadow)
    for pin in range(15, 97, 8):
        cavern.rect(x + pin, y + 62, 3, 9, zones.detail)
        cavern.pset(x + pin, y + 62, zones.light)
art.scene('cavern', cavern, pal=zones, at=(96, 32), region='campaign')

garden = Img(256, 224)
for x, y in [(12, 64), (82, 108), (150, 62), (210, 115)]:
    garden.rect(x, y, 38, 37, zones.shadow)
    garden.rect(x + 3, y + 3, 32, 31, zones.panel)
    garden.rect(x + 7, y + 7, 24, 2, zones.rim)
    garden.rect(x + 8, y + 11, 3, 3, zones.light)
    for dy in (11, 18, 25):
        garden.line(x - 10, y + dy + 14, x - 1, y + dy + 5, zones.rim)
        garden.line(x - 1, y + dy + 5, x + 5, y + dy + 5, zones.rim)
        garden.line(x + 33, y + dy, x + 45, y + dy, zones.detail)
        garden.rect(x + 45, y + dy - 1, 2, 3, zones.detail)
    garden.line(x + 18, y + 38, x + 18, 181, zones.rim)
    garden.disc(x + 18, 181, 3, zones.detail)
art.scene('garden', garden, pal=zones, at=(128, 32), region='campaign')

skyline = Img(256, 224)
skyline.rect(0, 170, 256, 54, zones.shadow)
for x, y in [(9, 69), (82, 100), (157, 54)]:
    skyline.rect(x + 3, y + 52, 55, 117 - y + 52, zones.shadow)
    skyline.poly([(x + 7, y), (x + 58, y), (x + 64, y + 6), (x + 64, y + 48),
                  (x + 58, y + 54), (x, y + 54), (x, y + 8)], zones.shadow)
    skyline.rect(x + 4, y + 5, 55, 43, zones.rim)
    skyline.rect(x + 7, y + 8, 49, 36, zones.panel)
    for line_y in range(y + 11, y + 42, 5):
        skyline.rect(x + 10, line_y, 43, 1, zones.detail)
    skyline.rect(x + 50, y + 50, 4, 2, zones.light)
for x, y in [(6, 46), (66, 31), (122, 54), (146, 36), (225, 87), (243, 34)]:
    skyline.pset(x, y, zones.detail)
art.scene('skyline', skyline, pal=zones, at=(160, 32), region='campaign')

logo = art.palette(3, {
    'gold': ramp('ffbf70', 5), 'edge': '21182b', 'shade': '684254',
})
title = Img(256, 48)
for row, text in enumerate(["BIT'S", 'CONSOLE QUEST']):
    letters = big_text(text, logo.gold, scale=2, outline=logo.edge, shadow=logo.shade)
    title.blit(letters, (256 - letters.w) // 2, 24 * row)
art.scene('logo', title, pal=logo, at=(0, 16), region='bg')

bit = art.sprite_palette(0, {
    'ink': '151223', 'visor': '151e37', 'joint': ['352e4d', '696182'],
    'shell': ['8e6876', 'bf9c93', 'ebd4b9', 'fff1d2'],
    'aqua': ['237787', '21cbd1', '8dfff1'], 'pack': ['492a65', '7849a0', 'b06bd2'],
    'pin': 'ffc76c',
})
ink, joint, shell, aqua, pack = bit.ink, bit.joint, bit.shell, bit.aqua, bit.pack

boot = Img(9, 8)
boot.poly([(0, 1), (5, 0), (7, 2), (9, 4), (9, 7), (7, 8), (1, 8), (0, 6)], ink)
boot.poly([(1, 2), (5, 1), (6, 3), (8, 4), (8, 6), (7, 7), (1, 7)], shell[1])
boot.rect(2, 3, 5, 2, shell[2])
boot.rect(3, 3, 3, 1, shell[3])
boot.rect(1, 6, 6, 1, aqua[0])
boot.rect(4, 6, 3, 1, aqua[1])
boot.rect(6, 6, 1, 1, aqua[2])

glove = Img(7, 6)
glove.poly([(1, 0), (5, 0), (7, 2), (7, 5), (5, 6), (1, 6), (0, 4), (0, 2)], ink)
glove.poly([(2, 1), (5, 1), (6, 2), (6, 4), (4, 5), (1, 4), (1, 2)], shell[2])
glove.rect(2, 1, 2, 1, shell[3])
glove.rect(3, 4, 2, 1, shell[1])

def hero(helmet, hip, boots, hands, cable, eyes='open'):
    img = Img(32, 32)
    hx, hy = helmet
    bx, by = hip
    tip_x, tip_y = cable[-1]
    path = [(bx - 4, by + 2), *cable]
    for (x, y), (nx, ny) in zip(path, path[1:]):
        img.line(x, y, nx, ny, ink).line(x, y + 1, nx, ny + 1, ink)
    for (x, y), (nx, ny) in zip(path, path[1:]):
        img.line(x, y, nx, ny, joint[0])
    img.poly([(tip_x - 2, tip_y - 1), (tip_x + 2, tip_y - 2), (tip_x + 4, tip_y),
              (tip_x + 3, tip_y + 3), (tip_x - 1, tip_y + 3)], ink)
    img.rect(tip_x - 1, tip_y, 4, 2, joint[1])
    img.pset(tip_x + 1, tip_y + 1, bit.pin).pset(tip_x + 3, tip_y + 1, bit.pin)

    def limb(x, y, dx, dy):
        img.line(x - 1, y, dx - 1, dy, ink).line(x + 1, y, dx + 1, dy, ink)
        img.line(x, y, dx, dy, joint[1])

    for which, (x, y) in enumerate(boots):
        limb(bx + (3 if which else -4), by + 2, x + 3, y - 4)
        img.blit(boot, x, y - 7)

    # Far arm, cartridge backpack and case, then the near arm in front of the body.
    x, y = hands[0]
    limb(bx + 5, by - 4, x + 2, y + 2)
    img.blit(glove, x, y)
    img.rect(bx - 9, by - 7, 8, 11, ink)
    img.rect(bx - 8, by - 6, 6, 9, pack[0])
    img.rect(bx - 8, by - 6, 5, 1, pack[2])
    img.rect(bx - 7, by - 5, 3, 6, pack[1])
    img.rect(bx - 7, by - 8, 4, 2, bit.pin)
    img.poly([(bx - 6, by - 6), (bx + 6, by - 6), (bx + 8, by - 1),
              (bx + 5, by + 5), (bx - 4, by + 5), (bx - 6, by + 3)], ink)
    img.poly([(bx - 4, by - 4), (bx + 5, by - 4), (bx + 6, by),
              (bx + 4, by + 4), (bx - 3, by + 4), (bx - 5, by + 1)], shell[1])
    img.rect(bx - 2, by - 3, 6, 5, shell[2])
    img.line(bx + 1, by, bx, by + 1, pack[1]).line(bx + 3, by, bx + 2, by + 1, pack[1])
    x, y = hands[1]
    limb(bx - 5, by - 4, x + 2, y + 2)
    img.blit(glove, x, y)

    def helmet_poly(points, colour):
        img.poly([(hx + x, hy + y) for x, y in points], colour)

    helmet_poly([(4, 3), (8, 0), (19, 0), (23, 1), (26, 5), (26, 11),
                 (23, 15), (8, 16), (4, 14), (2, 11), (2, 6)], ink)
    helmet_poly([(5, 4), (8, 1), (20, 1), (23, 3), (25, 5), (25, 11),
                 (22, 14), (8, 15), (5, 13), (3, 11), (3, 6)], shell[1])
    helmet_poly([(6, 4), (9, 1), (20, 1), (23, 2), (24, 4), (9, 6), (4, 7)], shell[3])
    helmet_poly([(9, 6), (24, 4), (25, 6), (25, 11), (22, 14), (8, 15), (7, 12)], shell[2])
    helmet_poly([(10, 6), (22, 5), (24, 6), (24, 10), (22, 12), (9, 14), (8, 12)], bit.visor)
    img.line(hx + 5, hy + 8, hx + 6, hy + 9, shell[0])
    img.line(hx + 5, hy + 10, hx + 6, hy + 11, shell[0])
    for ex, ey in [(hx + 13, hy + 8), (hx + 20, hy + 7)]:
        if eyes == 'smile':
            img.line(ex - 1, ey + 2, ex + 1, ey, aqua[1]).line(ex + 1, ey, ex + 3, ey + 2, aqua[1])
            img.pset(ex + 1, ey, aqua[2])
        elif eyes == 'blink':
            img.line(ex, ey + 2, ex + 2, ey + 2, aqua[0])
        else:
            img.rect(ex, ey, 2, 4, aqua[1])
            img.pset(ex, ey + 1, aqua[2])
            img.pset(ex + 1, ey + 3, aqua[0])
    return img

poses = {
    # Coordinates are anchored to the same feet line as the collision body.
    'heroIdle':  ((2, 2), (16, 21), [(8, 30), (18, 30)], [(24, 19), (7, 20)], [(6, 25), (3, 25), (2, 22)]),
    'heroBlink': ((2, 2), (16, 21), [(8, 30), (18, 30)], [(24, 19), (7, 20)], [(6, 25), (3, 25), (2, 22)], 'blink'),
    'heroWalk1': ((3, 3), (17, 22), [(4, 29), (21, 30)], [(20, 19), (8, 21)], [(7, 26), (3, 26), (2, 23)]),
    'heroWalk2': ((3, 2), (17, 21), [(13, 28), (16, 30)], [(25, 18), (10, 21)], [(7, 25), (3, 24), (2, 21)]),
    'heroWalk3': ((3, 3), (17, 22), [(20, 30), (6, 29)], [(25, 20), (6, 19)], [(6, 26), (3, 27), (2, 25)]),
    'heroWalk4': ((3, 2), (17, 21), [(16, 30), (14, 28)], [(22, 19), (8, 20)], [(6, 25), (3, 25), (2, 22)]),
    'heroJump':  ((3, 1), (16, 19), [(8, 28), (20, 25)], [(24, 14), (7, 20)], [(5, 24), (3, 22), (2, 19)]),
    'heroFall':  ((3, 2), (17, 21), [(11, 30), (19, 28)], [(25, 15), (6, 17)], [(7, 25), (4, 23), (2, 19)]),
    'heroPlug':  ((3, 4), (16, 22), [(9, 30), (19, 30)], [(25, 17), (7, 22)], [(7, 27), (3, 26), (2, 21)]),
    'heroLand':  ((2, 6), (16, 23), [(7, 30), (19, 30)], [(25, 21), (5, 22)], [(6, 27), (3, 27), (2, 24)]),
    'heroCheer': ((2, 2), (16, 21), [(8, 30), (18, 29)], [(25, 10), (1, 12)], [(6, 25), (3, 24), (2, 21)], 'smile'),
}
for name, pose in poses.items():
    art.sprite(name, hero(*pose), pal=bit, region='spr')

item = art.sprite_palette(1, {
    'ink': '3d2541', 'gold': ramp('ffca70', 4), 'white': 'fff4cf',
})
treasure = Img(16, 16)
treasure.rect(5, 1, 6, 14, item.ink)
treasure.rect(1, 5, 14, 6, item.ink)
treasure.rect(6, 2, 4, 12, item.gold[2])
treasure.rect(2, 6, 12, 4, item.gold[2])
treasure.rect(6, 6, 4, 4, item.gold[3])
treasure.rect(7, 3, 1, 9, item.white)
treasure.rect(3, 7, 9, 1, item.white)
art.sprite('treasure', treasure, pal=item, region='spr')

chip = art.sprite_palette(4, {
    'edge': '211936', 'dark': '287e90', 'mid': '35b3c6', 'light': '9cfff1', 'highlight': 'edfff7',
})
piece = Img(16, 16)
piece.rect(3, 5, 10, 8, chip.edge)
piece.rect(6, 2, 4, 5, chip.edge)
piece.rect(11, 7, 4, 4, chip.edge)
piece.rect(4, 6, 8, 6, chip.dark)
piece.rect(7, 3, 2, 4, chip.mid)
piece.rect(5, 6, 6, 4, chip.mid)
piece.rect(11, 8, 3, 2, chip.mid)
piece.rect(5, 6, 5, 1, chip.light)
piece.pset(7, 4, chip.highlight)
art.sprite('piece', piece, pal=chip, region='spr')

hardware = art.sprite_palette(2, {
    'ink': '151222', 'frame': '937bab', 'idle': 'ffca70', 'live': '67f1e3',
})
for name, pins in [('socketIdle', hardware.idle), ('socketLive', hardware.live)]:
    socket = Img(16, 16)
    socket.rect(2, 2, 12, 12, hardware.frame)
    socket.rect(3, 3, 10, 10, hardware.ink)
    socket.rect(5, 6, 2, 4, pins)
    socket.rect(9, 6, 2, 4, pins)
    art.sprite(name, socket, pal=hardware, region='spr')

# Native-size exhibit study from the supplied NOVA-16 reference. It carries the proposed lab palette.
lab = art.sprite_palette(3, {
    'labDark': ['121222', '23243e', '44456a'],
    'labPurple': ['492273', '7832af', 'ad4de1'],
    'labCyan': ['176d85', '19c8db', '83fffb'],
})
console = Img(32, 32)
console.poly([(8, 6), (24, 6), (31, 12), (31, 21), (25, 27),
              (7, 27), (1, 21), (1, 12)], lab.labDark[0])
console.poly([(8, 8), (24, 8), (30, 13), (30, 20), (24, 25),
              (8, 25), (2, 20), (2, 13)], lab.labPurple[1])
console.poly([(9, 8), (23, 8), (28, 12), (28, 18), (23, 22),
              (9, 22), (4, 18), (4, 12)], lab.labCyan[1])
console.poly([(9, 9), (23, 9), (27, 13), (27, 18), (23, 21),
              (9, 21), (5, 18), (5, 13)], lab.labDark[1])
console.rect(9, 12, 14, 5, lab.labDark[2])
console.rect(10, 13, 12, 3, lab.labDark[0])
console.rect(23, 10, 2, 1, lab.labCyan[2])
console.rect(12, 19, 8, 1, lab.labPurple[2])
for x in (9, 19):
    console.rect(x, 22, 4, 4, lab.labPurple[0])
    console.rect(x, 23, 4, 2, lab.labCyan[1])
    console.rect(x, 24, 4, 1, lab.labCyan[0])
art.sprite('labConsole', console, pal=lab, region='spr')

art.write(sys.argv[1])
