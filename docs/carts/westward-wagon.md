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
| Landmark | A painted scene, a paragraph about the place (history, freely told), the fort's store if it has one |
| River | Its width and depth, and the choices: ford, caulk and float, take the ferry, wait a day |
| Hunt | A prairie scene. Animals cross; the d-pad aims and A fires. Bullets are limited and the time is 30 seconds |
| Float | Steer the wagon down the current between rocks for about 10 seconds |
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
  - by the pace: 12 at steady, 16 at strenuous, 20 at grueling;
  - x the oxen (each yoke beyond 2 adds 5 %, fewer than 2 yokes halves it, tired or hurt oxen less);
  - x the terrain (plains 1, bluffs 0.9, mountains 0.6);
  - x the weather (rain or snow 0.7, deep snow 0.3).
- **Food a day** for each person alive: 3 pounds at filling, 2 at meager, 1 at bare bones.
- **Health a day:** a person loses health from:
  - the pace (strenuous 1, grueling 3);
  - the rations (meager 1, bare bones 3, none 8);
  - the weather (heat or cold without enough clothing 2 to 5);
  - an illness (2 to 6 a day, by the illness).

  They gain 2 to 4 from resting, and 1 when the day is easy. At 0 they die.
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
- **Caulk and float:** the **float**, a steering sequence of about 10 seconds. Steer between rocks and eddies; a hit loses supplies or worse.
- **The ferry** where there is one: $5 to $20, and a day or more of waiting.
- **A guide** where one offers: they lead the crossing for a set of clothing.
- **Wait a day** for the water to fall.

### 5.5 Hunting and trading

- **The hunt:** 30 seconds in a prairie or forest scene. Animals (rabbits, squirrels, deer, buffalo, bear, elk, by region) cross at their own speeds. The d-pad aims and A fires; a shot uses a bullet. Meat shot: rabbit 2 lb, squirrel 1, deer 50, elk 80, bear 100, buffalo 400. **At most 100 pounds can be carried back.** Hunting takes a day.
- **Trading:** a passer-by (or the fort's trader) offers one good for another: "a spare axle for 50 pounds of food". Accept or decline, and come back another day for a new offer.

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
   - **Agreed:** TODO (the date, and the changes asked for)
3. **The trail's dangers:** illness, events (5.3), weather and seasons, the forts' prices, the fork.
4. **Rivers, the float, the hunt and trading** (5.4, 5.5).
5. **Content:** every landmark and its text, the regions, the events' texts, the people met.
6. **The flow:** the title, naming with the keyboard, the diary, the graves (written and passed), the top 10, saving and resuming the journey.
7. **Art pass:** the other regions, the landmark scenes (ROM), the event pictures, the hunt's animals (`gallery.mjs` and `critique.mjs` over every screen).
8. **Audio:** the folk tunes from public-domain scores, and the effects.
9. **Balance and release:** the bot over many seeds and strategies (how many arrive, how many survive, by background and month, choices that matter), the label, the PNG cart, the Library (`node tools/release.js westward-wagon`) and a README row.

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
