# Westward Wagon's book: the words of the journey, packed into the cart's ROM (spec 14: the texts are in the ROM, not the code).
#   python3 carts/src/westward-wagon/book.py            write rom/book.bin
#   python3 carts/src/westward-wagon/book.py --check    only check (exit 1 on a problem, or if rom/book.bin is stale)
#
# rom/book.bin, read by code.js (loadBook): 'WB', a version byte (1), then two sections, each a count byte and its entries, every
# string a length byte and its characters (plain ASCII, capitals), its lines joined by '|' (each at most 28 letters: a card's width):
#   the places: name, about (the paragraph read on LOOK AROUND), a count byte of the people met, and each: who, what they say;
#   the regions: name, the lines shown on entering it.
# History, freely told: the places, the peoples and the trail are real; the people met are our own. The peoples living along the trail
# are met as what they were to the emigrants: traders, guides, neighbours.
import os, sys, textwrap

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'rom', 'book.bin')
WIDTH, MAX_ABOUT, MAX_SAID = 28, 8, 5

PLACES = [
    ('INDEPENDENCE',
     'Spring, 1848. The square is crowded with wagons, oxen and outfitters. From here the trail runs two thousand miles west to the '
     'Willamette Valley. Most parties leave in April or May, when the grass is up for the oxen.',
     [('A STOREKEEPER', 'Buy more food than you think. A person eats near three pounds a day, and it is five months to Oregon.'),
      ('A RETURNING GUIDE', 'Oxen are slower than mules, but they live on the prairie grass and do not run off in the night.'),
      ('A YOUNG MOTHER', 'We have sewn two sets of clothes for each of us. They say the mountains are cold even in August.')]),
    ('KANSAS RIVER',
     'The first great river. A Kansa and French family runs a ferry here for a few dollars. In spring the water runs high and brown '
     'with mud.',
     [('THE FERRYMAN', 'The water is high this spring. I would not ford it. A few dollars is cheaper than a drowned ox.'),
      ('A KANSA HUNTER', 'The river is lower in late summer. In the spring it carries whole trees.'),
      ('A SETTLER', 'We caulked our wagon with tar and floated it. Keep clear of the rocks and it floats like a boat.')]),
    ('BIG BLUE RIVER',
     'A smaller river, but it rises fast after a storm. Parties camp on its banks for days, waiting for the water to fall. The grass '
     'here is good.',
     [('A WAGON CAPTAIN', 'Rest the party when they are poorly. A day lost is better than a grave by the trail.'),
      ("A DOCTOR'S WIFE", 'Boil the water when you can. The cholera follows the crowded camps.'),
      ('A BOY OF TEN', 'I saw a rabbit as big as a dog! Pa says we can hunt if the food runs short.')]),
    ('FORT KEARNEY',
     'Built this year by the army on the Platte River to guard the trail. Its walls are sod and its store is small and dear. From '
     'here the trail follows the wide, shallow Platte west for weeks.',
     [('A SOLDIER', 'Follow the Platte and you cannot lose the trail. The water is muddy, but it is water.'),
      ('A PAWNEE TRADER', 'The buffalo are fewer each year now that so many wagons come. Take only what you can carry.'),
      ('A BLACKSMITH', 'Carry a spare wheel and an axle. There is no smith for hundreds of miles west of here.')]),
    ('CHIMNEY ROCK',
     'A spire of clay and sandstone rising 300 feet above the valley. Travellers see it for days before they reach it, and many write '
     'of it in their diaries. It is the most famous sight on the trail.',
     [('A SCHOOLTEACHER', 'We saw it three days ago and thought we would be there by noon. Distances fool the eye out here.'),
      ('A TRAVELLER', 'They say it was taller once. The wind and rain wear it down, a little each year.'),
      ('A LAKOTA WOMAN', 'The grass is thin west of here. Let your oxen eat well while they can.')]),
    ('FORT LARAMIE',
     'A trading post with adobe walls where the Laramie River meets the North Platte. Lakota families camp nearby to trade. Wagons '
     'stop here to rest, mend and buy supplies before the climb ahead.',
     [('A FUR TRADER', 'The road gets harder from here. Many lighten their wagons and leave furniture by the trail.'),
      ('A LAKOTA TRADER', 'We trade buffalo robes and moccasins. A warm robe is worth more than silver in the snow.'),
      ('AN EMIGRANT', 'We are behind. The Fourth of July is near, and we must reach Independence Rock by then.')]),
    ('INDEPENDENCE ROCK',
     'A great dome of granite. Parties hope to reach it by the Fourth of July, to cross the mountains before the snow. Thousands have '
     'carved or painted their names on it: the Great Register of the Desert.',
     [('A STONECUTTER', 'I carve names for a dollar. Yours will be read by travellers for a hundred years.'),
      ('A WAGON CAPTAIN', 'We made it by the Fourth. Now we have a chance to cross the Blue Mountains before the snow.'),
      ('A GIRL OF TWELVE', 'I climbed to the top! You can see the Sweetwater River winding all the way west.')]),
    ('SOUTH PASS',
     'The trail crosses the Continental Divide here, on a pass so wide and gentle that some barely notice it. West of here the rivers '
     'run to the Pacific. The trail divides: Fort Bridger, or the Sublette Cutoff.',
     [('A MOUNTAIN MAN', 'The cutoff saves near seventy miles, but there is no water for fifty of them. Fill every barrel.'),
      ('A SURVEYOR', 'We stand on the top of the continent, and it is as flat as a farm.'),
      ('AN OLD WOMAN', 'Half way, they tell me. My knees say it is further than that.')]),
    ('FORT BRIDGER',
     'A trading post kept by the mountain man Jim Bridger and his partner, in a green valley by Black\'s Fork. Its blacksmiths mend '
     'wagons, and its store is dear but welcome.',
     [('A BLACKSMITH', 'Bring me your wheels. The dry air shrinks the wood and the iron tires come loose.'),
      ('A SHOSHONE TRADER', 'Our horses are strong and fast. We trade with the fort, and with all who pass in peace.'),
      ('A TRAPPER', 'The beaver are gone now. The wagons are the trade these days.')]),
    ('GREEN RIVER',
     'A swift, deep river, cold with the mountain snow. Ferrymen work the crossing in summer. The cutoff saved days, but the fifty '
     'miles without water before it were hard on the oxen.',
     [('A FERRYMAN', 'The Green is cold and fast. More men have drowned here than at any river on the trail.'),
      ('A TIRED EMIGRANT', 'The cutoff near killed our oxen. Two days without water, and the dust like flour.'),
      ('A TRAPPER', 'Elk come down to the river at dusk. A good shot feeds a family for a week.')]),
    ('SODA SPRINGS',
     'Springs of bubbling water that tastes of soda, some warm, one spouting like a steam engine. Travellers drink it with sugar and '
     'call it as good as lemonade.',
     [('A CHILD', 'The water tickles your nose! Ma put sugar in it.'),
      ('A DOCTOR', 'The springs are said to be good for the health. They will do no harm, at least.'),
      ('A SHOSHONE WOMAN', 'We camp here in the summer. Your people call the one that spouts the Steamboat.')]),
    ('FORT HALL',
     "A trading post of the Hudson's Bay Company on the Snake River. Its traders are British, but they help the American parties, "
     'and warn them that the road ahead is the hardest of all.',
     [('A BRITISH TRADER', 'Many turn south here for California. For Oregon, keep to the Snake and keep your oxen strong.'),
      ('A CLERK', 'Our flour is dear, I know. It came a long way to reach you.'),
      ('A WIDOW', 'We buried my husband at the Big Sandy. I will go on to Oregon. He would have wanted it.')]),
    ('SNAKE RIVER',
     'The trail follows the Snake across a dry land of black rock. At the crossing the river is wide and deep. Shoshone guides know the '
     'shallow way across, and lead wagons over for a fair trade.',
     [('A SHOSHONE GUIDE', 'The river is deep here, but there are islands. I can show you the way across for a set of clothes.'),
      ('AN EMIGRANT', 'The canyon is so deep we could see the water and not get down to it.'),
      ('A SHOSHONE FISHER', 'The salmon come up the river each summer. We dry them for the winter.')]),
    ('FORT BOISE',
     "A small Hudson's Bay post where the Boise River meets the Snake. The trail crosses the Snake again near here and turns north "
     'toward the mountains.',
     [("A HUDSON'S BAY MAN", 'The Blue Mountains are next. Go before the snow, or wait for spring.'),
      ('AN EMIGRANT', 'We traded our last spare axle for flour. Let us hope the wagon holds.'),
      ('A NEZ PERCE TRADER', 'Our horses are the finest in the West. We breed them with care in the valleys north of here.')]),
    ('BLUE MOUNTAINS',
     'The trail climbs into pine forests, so steep in places that wagons are let down the hills on ropes. The Cayuse and Nez Perce '
     'peoples live in the valleys beyond. The nights are cold, even in September.',
     [('A MISSIONARY', 'The way down is so steep we tied trees behind the wagon to slow it.'),
      ('A NEZ PERCE RIDER', 'The pass is clear now. In a month the snow will close it.'),
      ('A WOODCUTTER', 'The first trees since the Missouri! The children ran to touch them.')]),
    ('THE DALLES',
     'The Columbia River runs through a gorge of black rock here, and the road ends. A party must raft its wagon down the river, or '
     'pay the toll on the new Barlow Road around Mount Hood.',
     [('A RIVERMAN', 'The raft is quick, but the rapids have taken many. Steer early and keep clear of the rocks.'),
      ('A TOLLKEEPER', 'The Barlow Road goes round the mountain. It is slow and steep, but it is dry.'),
      ('A WASCO TRADER', 'The river has fed my people for a thousand years. The salmon gather here at the falls.')]),
    ('WILLAMETTE VALLEY',
     'Green, wide and rich: the end of the trail. Oregon City has a mill, a church and land for those who claim it.',
     []),
]

REGIONS = [
    ('THE PRAIRIE', 'Grass to the horizon, rivers to cross and spring storms. The trail is easy here.'),
    ('THE BLUFFS', 'The grass grows short and the land dries. Bluffs of clay rise along the North Platte.'),
    ('THE ROCKY MOUNTAINS', 'The trail climbs the Sweetwater toward the pass. The nights are cold and the ground is rough on wheels.'),
    ('THE HIGH DESERT', 'Sagebrush and black rock as far as the eye can see. The days are hot and the grass is poor.'),
    ('THE FORESTS OF OREGON', 'Pine and fir at last. The road is steep and the rains begin, but the end of the trail is near.'),
]

def lines(text, most, what):
    out = textwrap.wrap(text.upper(), WIDTH)
    if len(out) > most: raise SystemExit(f'{what}: {len(out)} lines (at most {most})')
    for l in out:
        if any(ord(c) < 32 or ord(c) > 126 or c == '|' for c in l): raise SystemExit(f'{what}: a character the book cannot hold in {l!r}')
    return '|'.join(out)

def s(b, t):
    t = t.encode('ascii')
    if len(t) > 255: raise SystemExit(f'too long: {t!r}')
    b.append(len(t)); b.extend(t)

def build():
    b = bytearray(b'WB\x01')
    b.append(len(PLACES))
    for name, about, said in PLACES:
        s(b, name); s(b, lines(about, MAX_ABOUT, name)); b.append(len(said))
        for who, text in said:
            if len(who) > WIDTH: raise SystemExit(f'{name}: the name {who} is too long')
            s(b, who); s(b, lines('"' + text + '"', MAX_SAID, f'{name}, {who}'))
    b.append(len(REGIONS))
    for name, text in REGIONS: s(b, name); s(b, lines(text, 4, name))
    return bytes(b)

if __name__ == '__main__':
    data = build()
    if '--check' in sys.argv:
        old = open(OUT, 'rb').read() if os.path.exists(OUT) else b''
        if old != data: print('rom/book.bin is stale: run python3 carts/src/westward-wagon/book.py'); sys.exit(1)
        print(f'ok: book {len(data)} bytes'); sys.exit(0)
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    open(OUT, 'wb').write(data)
    print(f'wrote {OUT}: {len(data)} bytes, {len(PLACES)} places, {len(REGIONS)} regions')
