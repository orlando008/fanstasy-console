"""Regenerate the Controller Foundry prototype art from the NOVA-16 art kit."""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../../tools/devkit/art'))
from kit import Art, Img, big_text, ramp

art = Art()
art.region('bg', 1, 255)
art.region('spr', 256, 1023)

art.gradient('sky', ['141126', '251b37', '41243f'], y0=0, y1=223)
overlay = {
    'INK': '151222', 'PANEL': '201a34', 'TRIM': '52446c', 'MUTED': 'b9afca',
    'WHITE': 'fff0d9', 'GOLD': 'ffca70', 'CYAN': '67f1e3', 'PURPLE': '9975c9',
    'CORAL': 'ec8868', 'STEEL': '665374', 'DARK': '382d4a',
}
for index, (name, rgb) in enumerate(overlay.items(), 113):
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
    'shadow': '261e38', 'steel': '362849', 'edge': '533752', 'lamp': '855368',
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
art.scene('factory', factory, pal=far, at=(0, 32), region='bg')

logo = art.palette(3, {
    'gold': ramp('ffbf70', 5), 'edge': '21182b', 'shade': '684254',
})
title = Img(256, 48)
for row, text in enumerate(["BIT'S", 'CONSOLE QUEST']):
    letters = big_text(text, logo.gold, scale=2, outline=logo.edge, shadow=logo.shade)
    title.blit(letters, (256 - letters.w) // 2, 24 * row)
art.scene('logo', title, pal=logo, at=(0, 16), region='bg')

bit = art.sprite_palette(0, {
    'ink': '171326', 'screen': '282039', 'shell': ramp('ffedcf', 3),
    'boot': '318c97', 'eye': '64f6e7', 'pack': ramp('a278c8', 3), 'pin': 'ffd177',
})

# A compact stand-in for the supplied robot. The art proof will establish the final proportions and poses.
def hero(near, far, bob, side=False):
    img = Img(32, 32)
    img.line(7, 22 + bob, 4, 25, bit.ink)
    img.line(4, 25, 1, 23, bit.pack[0])
    img.rect(0, 20, 4, 4, bit.ink)
    img.rect(1, 21, 2, 1, bit.pin)
    img.rect(5, 16 + bob, 21, 9, bit.ink)
    img.rect(6, 17 + bob, 5, 7, bit.pack[1])
    img.rect(11, 19 + bob, 11, 5, bit.shell[0])
    img.rect(12, 19 + bob, 9, 3, bit.shell[1])
    for x, dx in ((9, far), (19, near)):
        img.rect(x + dx, 24, 6, 7, bit.ink)
        img.rect(x + dx + 1, 25, 4, 4, bit.shell[1])
        img.rect(x + dx + 1, 29, 4, 1, bit.eye if x == 19 else bit.boot)
    img.rect(5, 4 + bob, 23, 16, bit.ink)
    img.rect(7, 2 + bob, 19, 17, bit.shell[0])
    img.rect(8, 3 + bob, 17, 3, bit.shell[2])
    img.rect(7, 6 + bob, 4, 10, bit.shell[1])
    img.rect(11, 6 + bob, 16, 11, bit.screen)
    img.rect(13 if not side else 15, 9 + bob, 2, 5, bit.eye)
    img.rect(21 if not side else 23, 9 + bob, 2, 5, bit.eye)
    return img

for name, near, far_step, bob, side in [
    ('heroIdle', 0, 0, 0, False), ('heroWalk1', 2, -2, 0, True),
    ('heroWalk2', 0, 1, 1, True), ('heroWalk3', -2, 2, 0, True),
    ('heroWalk4', 1, 0, 1, True), ('heroJump', 3, -1, -1, True),
]:
    art.sprite(name, hero(near, far_step, bob, side), pal=bit, region='spr')

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

art.write(sys.argv[1])
