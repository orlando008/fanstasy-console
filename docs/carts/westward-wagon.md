# Westward Wagon: Cart Specification

**Version:** 0.2 (design agreed with the user, not built)
**Status:** Scaffolded (`node tools/new-cart.js westward-wagon "Westward Wagon"`: the frame of the game works, the game is a placeholder). Next: step 1 of section 15
**Cart source:** `carts/src/westward-wagon/` → `carts/westward-wagon.nova`

---

## 1. Concept

An original wagon-trail game in the spirit of the classic educational games about the Oregon Trail. (The name "The Oregon Trail" is a trademark: the game, its title, its events, its people and its art are our own; the route and the landmarks are history.)

It is spring 1848 in Independence, Missouri. You lead a party of five, a leader and four companions, along 2,040 miles of the real trail to the Willamette Valley in Oregon. You:
- outfit the wagon at the store;
- set the pace and the rations as the days roll by;
- decide how to cross each river;
- hunt for food and trade at the forts;
- meet what the trail brings: illness, broken axles, thieves, storms, kindness from strangers.

The wagon rolls across the screen through a landscape that changes with the route, from prairie to bluffs, mountains, high desert and forest, under the weather of the season. The real landmarks (Chimney Rock, Fort Laramie, South Pass...) are big painted scenes. Not everyone makes it, but good choices usually get most of the party through. Those who fall get a grave with your epitaph, and later parties pass their graves.

**Decisions made with the user:**
- **Name:** Westward Wagon, one player, on the Strategy shelf.
- **Setting:** historical, freely told: the real route, landmarks and dangers, with events and characters our own. The peoples met along the way, Native nations included, are drawn with respect, as individuals: traders, guides and neighbours, never as a threat to shoot at.
- **Structure:** one journey of about 45 minutes, different each time.
- **Action:** hunting, river crossings (the float as a short steering sequence) and trading.
- **Party:** a leader and four companions, named by the player, with a background for the leader (banker, carpenter or farmer) that is also the difficulty.
- **Difficulty:** classic and fair.
- **Look:** a side view with parallax layers, the landmarks as big scenes.
- **Extras, all four:** graves that persist, a diary, scores and a top 10, weather and seasons.
- **Music:** public-domain folk tunes of the period.
- **Time:** days roll on by themselves, and A stops the wagon to use the menu.

## 2. Core loop

**Before you leave:**
1. Name the leader and the four companions.
2. Choose the leader's background.
3. Choose the month you set out, March to August.
4. Spend your money at the store.

**On the trail:** each day the wagon covers miles set by the pace, the oxen, the terrain and the weather, and the party eats by the rations. Health rises with rest and food and falls with hard pace, bad weather, illness and hunger. Events come along the way.
- **At a landmark** you look around, read about it, and at a fort you can buy and trade.
- **At a river** you choose how to cross.
- **At a fork** you choose a route.
- **At any time** you can stop and hunt, rest, trade with a passer-by, change the pace or the rations, or read the diary.

**The end:** the journey ends in the Willamette Valley, with a score and the diary, or on the trail, when the whole party is gone.

## 3. Controls

| Button | Use |
|---|---|
| A | On the trail: stop the wagon and open the menu. In menus: choose |
| B | Back; in the menu, continue on the trail |
| D-pad | Menus; in the hunt, move the aim; in the river float, steer |
| START | Pause (also a way to the menu) |
| SELECT | On the trail: the supplies and the party at a glance |

Naming people uses an on-screen keyboard, as in the console's other games: the d-pad and A, with B to delete.

## 4. Screen layout

256 x 224.

| Area | What |
|---|---|
| Lines 0 to 151: the trail | The sky (a gradient set line by line, by the time of the season and the weather); BG2 the far range (mountains or bluffs), scrolling slowest; BG1 the near hills and trees; BG0 the ground and the trail. Sprites are the wagon, the oxen walking, the party's dog, the weather (rain, snow) and the grass. |
| Lines 152 to 223: the HUD | The date, the weather, the party's health in words (good, fair, poor, very poor), the food in pounds, the next landmark and its distance, the miles travelled, all on a wooden board |

| Screen | What |
|---|---|
| Title | The logo over a wagon at sunset; NEW JOURNEY, CONTINUE (when one is saved), TOP 10, THE GRAVES |
| Setup | The background, the names, the month |
| Store | The goods, their prices and what you have: oxen, food, clothing, ammunition, spare parts (wheel, axle, tongue) |
| Trail | The rolling wagon and the HUD |
| Menu | Continue, the supplies, the map, the pace, the rations, rest, trade, hunt, the diary |
| Landmark | A painted scene and a card: LOOK AROUND (a paragraph about the place, history freely told), TALK TO SOMEONE (three people at each, met in turn), BUY SUPPLIES at a fort, then GO ON, CROSS THE RIVER or CHOOSE THE WAY |
| Region | A card on entering each of the five regions |
| River | Its width and depth, and the choices: ford, caulk and float, take the ferry, wait a day |
| Hunt | The region's scene. Animals cross in three lanes; the d-pad aims and A fires, B stops. Bullets are limited and the time is 30 seconds |
| Float | From above: steer the caulked wagon (LEFT, RIGHT) down the current between rocks and eddies, 6 to 11 seconds at a river and 20 down the Columbia |
| Event | A picture and a line ("Ella has dysentery." "A wagon wheel broke.") with the choice it asks, if any |
| Grave | When someone dies: their name, the date, and your epitaph |
| End | The arrival scene and the score, or the last grave; then the diary, and the top 10 |

## 5. The rules

All numbers are first values. Step 9 tunes them with the bot, and the tests assert them.

### 5.1 The party, money and the store

- **Backgrounds:**

| Background | Money | Score multiplier | Gift |
|---|---|---|---|
| Banker | $1,600 | x1 | |
| Carpenter | $800 | x2 | a broken wagon part is mended without a spare 50 % of the time |
| Farmer | $400 | x3 | oxen tire more slowly |

- **Health:** each person has health 0 to 100, starting at 100, and at most one illness at a time. The party's health in words is the average.
- **The store at Independence:**

| Item | Price | Notes |
|---|---|---|
| Oxen | $40 a yoke of two | 2 to 9 yokes; 3 or more advised |
| Food | $0.20 a pound | |
| Clothing | $10 a set | |
| Ammunition | $2 a box of 20 | |
| Spare wheel, axle, tongue | $10 each | at most 3 of each |

  Prices at the forts go up the further west they are, from x1.25 at Fort Kearney to x2 at Fort Boise.

### 5.2 A day on the trail

- **Miles a day:**
  - by the pace: 15 at steady, 19 at strenuous, 24 at grueling (history: 15 to 20);
  - x the oxen (each yoke beyond 2 adds 5 %, fewer than 2 yokes halves it, tired or hurt oxen less);
  - x the terrain (plains 1, bluffs 0.9, mountains 0.6);
  - x the weather (rain or snow 0.7, deep snow 0.3).
- **Food a day** for each person alive: 3 pounds at filling, 2 at meager, 1 at bare bones.
- **Health a day** (tenths of a point; tuned in step 1, when whole points killed a party on meager rations in five months): a person loses health from:
  - the pace (strenuous 0.5, grueling 1.5);
  - the rations (meager 0.4, bare bones 1.2, none 4);
  - the weather (very hot 1, hot 0.3; cold 1 to 3 a degree of cold, less with one set of clothing each, none with two);
  - an illness (1 to 4 a day by the illness: cholera worst).

  They gain 3 a day of rest (4 on filling rations), and 0.6 on an easy day (steady, filling, well). At 0 they die. A well person falls ill on a day with a chance of 0.6 % x (1 + the pace + the rations + 2 if their health is under 50 + 1 in the cold), half that resting; an illness passes with a chance of 12 % a day, 30 % resting.
- **Clothing:** without 2 sets each in the cold months, the cold hurts.
- **The date:** each day moves the date. The month and the place set the **weather**: very hot, hot, warm, cool, cold, very cold, rain, heavy rain, snow, heavy snow, fog.

### 5.3 Events

Each day, a chance of one event, weighted by the place, the season, the pace, the rations and the party's health:
- **Illness:** dysentery, cholera, measles, typhoid, exhaustion, fever, a broken arm or leg, a snakebite.
- **The wagon:** a broken wheel, axle or tongue. Mend it with a spare; otherwise try to fix it (the carpenter is better at this) or trade for one.
- **Oxen:** one is injured or wanders off.
- **Losses:** a thief comes in the night; supplies are lost in a river or a fire.
- **Delays:** the party loses the trail (days lost), or meets rough trail, bad water, little grass or a storm (hail, blizzard, fog).
- **Good fortune:** wild fruit, an abandoned wagon to salvage, a helpful stranger, a guide who shows a shortcut, another party sharing food.

Events and their texts are data in the ROM (section 14).

### 5.4 Rivers

Each river has a **width** and a **depth** that change with the season and the rain. The choices:
- **Ford:** safe under 2.5 ft; risky to 3 ft; worse beyond (supplies lost, the wagon tips, a person may drown).
- **Caulk and float:** the **float**, a steering sequence of 6 to 11 seconds (0.6 frames a foot of width), rocks coming more often in deeper water and eddies pushing the wagon sideways. No rock struck: safe. One: 8 % of the food. Two: 15 % of the food, clothing and bullets, and a 15 % chance someone drowns. Three or more: the wagon swamps, 35 % and a 35 % chance. **Rafting down the Columbia** at The Dalles is the same game, 20 seconds and faster, with 25 % and 50 %.
- **The ferry** where there is one: $5 to $20, and a day or more of waiting.
- **A guide** where one offers (a Shoshone guide at the Snake River): they lead the crossing safely by the shallows for a set of clothing, in a day.
- **Wait a day** for the water to fall.

### 5.5 Hunting and trading

- **The hunt:** 30 seconds in a prairie or forest scene. Animals (rabbits, squirrels, deer, buffalo, bear, elk, by region) cross at their own speeds. The d-pad aims and A fires; a shot uses a bullet. Meat shot: rabbit 2 lb, squirrel 1, deer 50, elk 80, bear 100, buffalo 400. **At most 100 pounds can be carried back.** Hunting takes a day.
- **Trading:** TRADE in the menu spends a day waiting by the trail; then (85 % of days) a trader comes: one of the region's people (a Pawnee, Lakota, Shoshone or Nez Perce trader, 60 %) or another traveller (a settler, a French trapper, a mountain man, a family going east). They offer one good for another the party has, worth 0.8 to 1.6 times as much (oxen $40 a yoke, food 20 cents a pound, clothing $10 a set, bullets 10 cents, spare parts $10), never the party's last yoke. Accept or decline.
- **Ammunition** is sold in boxes of 20 and kept, and shown, in bullets.

### 5.6 The journey's end, score and graves

- **Arriving:** the score is, for each person alive, 500 x their health in words (good 4, fair 3, poor 2, very poor 1), plus what is left (a wagon 50, a yoke of oxen 4, each spare part 2, each clothing set 2, each 50 bullets 1, each 25 lb of food 1, each $5 1), x the background's multiplier.
- **The top 10:** with the leader's name.
- **Graves:** up to 12 kept in the save, each with its mile and your epitaph (16 characters). Later journeys pass them on the trail: the wagon goes by a grave marker on the way, and A stops to read it.
- **The diary:** each day's line is written as the journey goes ("May 3. Crossed the Kansas River by ferry. Ella is better."), and can be read in the menu and at the end.

## 6. Levels or content

The trail, 2,040 miles (the miles and the order are the historical route, rounded):

| Mile | Landmark | Kind |
|---|---|---|
| 0 | Independence, Missouri | start, store |
| 102 | Kansas River | river (ferry) |
| 185 | Big Blue River | river |
| 304 | Fort Kearney | fort |
| 554 | Chimney Rock | landmark |
| 640 | Fort Laramie | fort |
| 830 | Independence Rock | landmark ("the Great Register of the Desert") |
| 932 | South Pass | the fork: Fort Bridger, or the Sublette Cutoff (shorter, no water) |
| 989 / 1,057 | Green River / Fort Bridger | a river / a fort, by the fork |
| 1,151 | Soda Springs | landmark |
| 1,208 | Fort Hall | fort |
| 1,390 | Snake River | river (a guide offers) |
| 1,504 | Fort Boise | fort |
| 1,600 | Blue Mountains | landmark, mountain road |
| 1,800 | The Dalles | the end's choice: raft down the Columbia (a float), or the Barlow Road (a toll, slower, safer) |
| 2,040 | Willamette Valley | the end |

**Regions** (each its own parallax layers and colours): the prairie (Missouri, Kansas, Nebraska), the bluffs (western Nebraska, Wyoming), the Rocky Mountains, the high desert (Idaho), the forests (Oregon).

## 7. Opponents or hazards

The trail itself (section 5.3). No combat.

## 8. Modes

One journey. The backgrounds are the difficulty levels.

## 9. Scoring

Section 5.6, with the top 10 saved.

## 10. Screens and flow

1. **Title:** NEW JOURNEY, CONTINUE, TOP 10, THE GRAVES.
2. **Setup:** the background, the names, the month.
3. **The store at Independence.**
4. **The trail**, with its menu, landmarks, rivers, the fork, events, hunts, floats, graves and trades.
5. **The end:** arrival and score, or the last grave; then the diary and the top 10.

The journey is **saved** each day (CONTINUE resumes it), so a 45-minute game can be played in pieces.

## 11. Audio

**Songs**, public-domain American folk tunes of the period on the sampled instruments: a fiddle-like strings lead, a banjo-like pluck, a harmonica-like flute, a simple bass, a light drum where it suits. The candidates:
- the title: "Oh! Susanna" (Foster, 1848);
- the prairie: "Buffalo Gals" (1844);
- the bluffs: "Old Dan Tucker" (1843);
- the mountains: "Shenandoah" (traditional);
- the desert: "Sweet Betsy from Pike" (a trail song, 1850s);
- the forests: "Camptown Races" (1850);
- a grave: "Shenandoah", slow;
- the arrival: "Oh! Susanna" in full.

The notes are taken from public-domain scores, not from memory (the playbook's lesson from Flow State).

**Effects:**
- the wagon's creak and the oxen's bell, quietly, while it rolls;
- a gunshot and a hit;
- the river's splash;
- an event's chime: good or bad;
- a death's toll;
- menu sounds;
- the store's till;
- a landmark's arrival.

Levels: `node tools/devkit/music/loud.mjs carts/westward-wagon.nova --check` (playbook section 5).

## 12. Video layers

- **BG2:** the far range, for each region.
- **BG1:** the near hills and trees.
- **BG0:** the ground and the trail.
- **The sky:** a gradient line by line.
- **The landmarks' painted scenes** are big pictures. Fifteen of them would not fit in the tile sheet, so they are kept in the ROM and copied into a reserved block of BG tiles when one is shown (Merge Café's picture pool, for a background).
- **Sprites:** the wagon and oxen (two frames of walking), the dog, the hunted animals, the hunter's aim, the float's rocks, the weather, the graves.
- **The overlay:** the HUD's text, the menus and the event cards, on wooden panels.

The art is made in code by `carts/src/westward-wagon/art.py` with the kit (`scenery.py` for skies, mountains, hills and trees; `texture.py` for ground and wood; `sculpt.py` and `draw.py` for the wagon, the oxen and the animals).

## 13. Persistence (save slots)

| Slots | Contents |
|---|---|
| 0 | Format version |
| 1 to 80 | The journey in progress: date, miles, money, supplies, pace, rations, the party (names, health, illness), the oxen, the route chosen, the random seed's state |
| 100 to 139 | The top 10: score, the leader's name (packed), the background, the date of arrival |
| 140 to 199 | The graves: 12, each with a mile, a date, a name and the epitaph (packed, 16 characters) |
| 200 to 255 | Reserved (the diary is in RAM, for the journey being played; a resumed journey starts a new page) |

## 14. Asset budget

| Asset | Budget |
|---|---|
| Code | about 50 KB of the 64 KB limit, `"strip"` and `"mangle"` if needed; the texts (events, landmarks, diary phrases) in the ROM, read at the start (`carts/src/clockwork-dominion/book.py` is the pattern) |
| Tiles | 5 regions' parallax layers (repeating, about 60 tiles each); the HUD board; the wagon, oxen and animals as sprites (about 250); one landmark scene at a time, copied from the ROM (a reserved area of about 200 tiles) |
| ROM | the landmark scenes (about 15 of up to 200 tiles each, packed: about 50 KB), the texts (about 15 KB) |
| Songs / SFX | 6 to 8 folk tunes; about 20 effects |

## 15. Implementation plan

1. **The journey (a vertical slice):**
   - the setup (background, plain names, month);
   - the store;
   - the days rolling (miles, food, health, the date, the weather);
   - the menu (pace, rations, rest);
   - the landmarks' list (plain cards);
   - arriving or dying;
   - the score.
   
   Tests for every number of section 5.1 and 5.2, and a **bot** that plays a whole journey with a strategy.
2. **The art proof:** the look, agreed before the rest is drawn:
   - the wagon and oxen (walking, every frame);
   - the prairie's parallax layers and sky;
   - one landmark scene (Chimney Rock);
   - the palettes.
   
   Then `node tools/devkit/art/proof.mjs westward-wagon`, the picture sent to the user, and what they said written here.
   - **Built:** the prairie's trail in layers (a sky gradient set line by line; BG2 fair-weather clouds and far hills, BG1 near hills with cottonwoods, BG0 the grass and the trail's ruts, each 256 px wide and wrapping, scrolled at its own speed), the wagon (canvas over hoops, a wooden box, spoked wheels turning in 4 frames) and a yoke of oxen (walking in 4 frames) as big sprites, the logo, and **Chimney Rock as a landmark scene in the ROM**: `art.py` packs it (181 tiles with flips shared, its map and its colours) into `rom/scenes.bin`, and `loadScene` copies it into the 256 tiles reserved from tile 768 and a stretch of Map RAM, shown on BG2. The technique the fifteen scenes need works.
   - **Sent** on 14 November 2026: the wagon and oxen frames, the trail, Chimney Rock, the title.
   - **Agreed** on 14 November 2026: "It looks good", with one fix: the far bluffs were drawn after Chimney Rock, so one covered the foot of its cone; now the horizon is drawn first and the rock stands in front. The rest of the scenes are drawn in this order (far to near).
3. **The trail's dangers:** illness, events (5.3), weather and seasons, the forts' prices, the fork.
4. **Rivers, the float, the hunt and trading** (5.4, 5.5).
5. **Content:** every landmark and its text, the regions, the events' texts, the people met.
6. **The flow:** the title, naming with the keyboard, the diary, the graves (written and passed), the top 10, saving and resuming the journey.
7. **Art pass:** the other regions, the landmark scenes (ROM), the event pictures, the hunt's animals (`gallery.mjs` and `critique.mjs` over every screen).
8. **Audio:** the folk tunes from public-domain scores, and the effects.
9. **Balance and release:** the bot over many seeds and strategies (how many arrive, how many survive, by background and month, choices that matter), the label, the PNG cart, the Library (`node tools/release.js westward-wagon`) and a README row.

**Step 1, built:** the journey as pure functions on one object (`newJourney`, `dayOnTrail`, `personDay`, `rollWeather`, `nextMark` and `markMile` with the two routes after South Pass, `crossRiver`, `scoreOf`), and the screens that drive it: the title, the setup (the background, the month; the names fixed as MARY, JOHN, SARAH, WILL and ELLA until step 6), the store (Independence's, and the forts' at their prices), the trail (a day every 50 frames; A stops), the menu (continue, supplies, pace, rations, rest 1, 3 or 5 days), cards for deaths, illnesses and landmarks, the rivers' four choices (fording by the depth, caulking and floating by chance until step 4's float, the ferry, waiting), the forks (South Pass: Fort Bridger or the Sublette Cutoff; The Dalles: the raft or the Barlow Road, its toll and days), the end with the score and the top 10 (the leader's name, packed in two slots). The trail is drawn with the starter's art and a wagon of rectangles until the art proof. Tests: `01-flow` (the screens in order, the store's bill, the days rolling, the menu's choices, a river's card, the end and the top 10), `02-rules` (every number of 5.1, 5.2, 5.4, 5.6). `bot.mjs` makes a whole journey with the buttons: it outfits the wagon, crosses by the depth, eats less when the food will not last, rests when the party is poor or ill (`care`), buys food at the forts.

**Step 1, results** (the bot, 4 seeds each, leaving in April): a banker arrives every time, with 3.75 of 5 alive resting never and 4.5 resting when needed, in 177 to 205 days; a carpenter the same (twice the score); a farmer, whose $400 buys about 1,200 lb of food for a trip that eats 2,600, arrives a quarter to half of the time with one or two: the hunt (step 4) is how a farmer eats. Two bugs found by the bot: a menu's choice was dropped on the frame the button was let go, and a person who fell ill and got better the same day crashed the day's card.

**Step 3, built:** the events of 5.3 (`EVENTS`: each a chance a day, when it can happen and what it does), one at most on a day of travel that reached no landmark, their chances x 1.3 at strenuous and x 1.6 at grueling:

| Event | Chance a day | What it does |
|---|---|---|
| a broken wheel, axle or tongue | 1.2 % | a spare mends it; without one a carpenter mends it half the time, anyone else a third; else 3 to 6 days waiting for a passing party to trade one (for up to 40 lb of food) |
| a lame ox | 0.4 % | a yoke fewer (a farmer nurses it back half the time) |
| a thief in the night | 0.6 % | 10 to 30 % of the food, 30 % of the bullets |
| lost the trail | 0.5 % | 2 to 4 days |
| bad water (west of the prairie) | 0.7 % | everyone -6 health |
| little grass (bluffs, desert) | 0.6 % | a day lost |
| rough trail (mountains, forest) | 0.6 % | 1 or 2 days lost |
| a hailstorm (in rain) | 0.4 % | 10 % of the food, everyone -3 |
| a blizzard (in snow) | 3 % | 2 to 4 days snowed in |
| a fire in the wagon | 0.3 % | 15 % of the food, 20 % of the clothing |
| wild berries (summer) | 0.8 % | +20 to 40 lb |
| an abandoned wagon | 0.5 % | 50 lb of food, 2 sets of clothing, or a spare part |
| a doctor travelling west | 0.5 % | one person well, +10 health |
| another party shares food | 0.4 % | +60 lb (when short) |
| a guide's shortcut (a Shoshone guide in the desert, a trapper elsewhere) | 0.4 % | 10 to 25 miles |
| a Shoshone or Lakota family shows the party a spring | 0.5 % | everyone +5 health |

The weather now varies around each month's average (a step either way): the first version made midsummer very hot on every dry day, and that, not the events, was killing parties in the desert. **The weather you can see:** rain and heavy rain fall as streaks, snow drifts down and whitens the ground, fog washes the far hills out (a translucent overlay), the clouds go grey and the sky dims in bad weather (the sky's gradient scaled line by line); and the grass browns from September to November. Tests: `03-events.mjs` (a spare used, the carpenter's odds, days lost, about 8 events in 150 days, a blizzard only in snow, July and December's weather).

**Step 3, results** (6 seeds each, April): a banker arrives every time, with 4.7 of 5 alive when resting when needed (3.8 when never); a carpenter 2.5 and a farmer 0.2 to 0.7, both short of food: the deaths left are starvation in the last 300 miles, in October. Hunting (step 4) is the food the poorer backgrounds need, as in the classic game. The bot now buys up to 1,000 lb at a fort.

**Step 4, built:** the hunt (`toHunt`, `updateHunt`, `endHunt`): over the trail's layers, animals of the region (`GAME`: the prairie and bluffs rabbits, squirrels, deer, buffalo; the mountains and forest squirrels, deer, elk, bear; the desert rabbits, deer, elk; fewer in winter) walk across three lanes at their own speeds (rabbit 1.5 px a frame to buffalo 0.5), at most five at once; the aim moves 2 px a frame and is drawn on the overlay; a shot uses a bullet, a hit blinks the animal out with its meat rising, a miss startles those near it (x 1.8 speed); 30 seconds or B; then a card, the meat (at most 100 lb) and a day. The float (`toFloat`, `updateFloat`, `floatOutcome`): from above, on the overlay, the banks winding, rocks and eddies coming down the current, a wagon that steers with momentum; it is the CAULK AND FLOAT of every river and the raft down the Columbia. Trading (`tradeOffer`, `applyTrade`, `seekTrade`) from the menu, which is now continue, supplies, pace, rations, rest, hunt, trade. Two effects: a shot, a rock struck. Long river results are split into a line a sentence. The art: the six animals in two frames (the four big ones in 16 px pieces, shared between frames, so they fit the sprite region). Tests: `04-hunt.mjs` (bullets by the box, the hunt from the menu, a shot's meat and bullet, the aim's speed, 100 lb carried back and a day, no bullets no hunt; the float's steering, rocks struck or passed, what the hits cost, a river's float; fair trade offers, a trade, TRADE from the menu with lines that fit). The bot hunts when the food runs short (aiming at the human's speed, a shot at most every 18 frames, the big animals first) and steers the float away from the rock coming at it.

**Step 4, results** (6 seeds each, April, the bot resting when needed and hunting every third day at most while the food will not last): a banker and a carpenter arrive every time with all five; a farmer every time with 3 (2 to 5), after 8 to 14 hunts. Before the bot hunted early, the farmer cut the rations instead, and the illness that short rations bring killed the party (0.2 arrived). The float: a bot that looks only at the nearest rock struck 3 to 6 on the Snake and 3 to 10 down the Columbia; one that looks ahead for the clearest lane strikes 0 to 2, so the float is fair and rewards looking ahead (the deepest rivers now send a rock every 18 frames at most, not 14). Journeys take 195 to 242 days, arriving in October or November: step 9 looks at the pace of the trip.

**Step 5, built:** the book (`book.py` writes `rom/book.bin`, 8.4 KB; `loadBook` reads it at the start): for each of the 17 places a paragraph (up to 8 lines of 28 letters) and three people met there (a storekeeper, a ferryman, soldiers, emigrants, children; a Kansa hunter, Pawnee, Lakota, Shoshone, Nez Perce and Wasco traders and guides, each speaking of their own country and trade), and a card for each region (the prairie, the bluffs, the Rocky Mountains, the high desert, the forests of Oregon), shown on first entering it. A landmark's card offers LOOK AROUND, TALK TO SOMEONE (each person in turn), BUY SUPPLIES at a fort, and GO ON, CROSS THE RIVER or CHOOSE THE WAY; leaving Independence's store shows a card about setting out. The Snake River offers a Shoshone guide (a set of clothing, a day, a safe crossing). Results longer than a line are wrapped to the card (`wrapText`). The events' texts stay in the code, since each carries its numbers. `book.py` checks every line fits a card, and `--check` that the ROM is up to date (run by `05-book.mjs`). Tests: `05-book.mjs` (every place's paragraph and three people, every line fits, look, talk in turn, a fort's store at its prices, a region's card, the guide, setting out). The bot goes on at landmarks, buys at forts, and hires the guide when it has clothing to spare.

**Step 5, results** (6 seeds each, April): unchanged in balance: a banker and a carpenter arrive with all five, a farmer with 2.8 (1 to 5); every run finishes cleanly through the new cards.

Each step: build it, run `node tools/check.js westward-wagon` and `node tools/test.js westward-wagon`, write its **Built** and **Results** notes under its number here, commit and push.

## 16. Open questions

Defaults I chose that you did not confirm (all easy to change):

- **The year and the route:** 1848, with the historical landmarks and miles of section 6. There are two forks: South Pass, and the end at The Dalles.
- **The numbers of section 5:** prices, miles a day, food, health, the score (modelled on the classic game's feel, with our own values).
- **The illnesses:** they include cholera and dysentery, as history did. Deaths are handled gently: a grave and an epitaph, no gore.
- **Native nations:** met as traders, guides and helpers (for example a guide at the Snake River), drawn with respect.
- **Saving:** the journey is saved each day so it can be resumed.
- **Folk tunes:** the list in section 11 (all public domain).
- **The landmark scenes:** kept in the ROM and loaded one at a time. This is an untried technique for a background, so step 2 proves it.
