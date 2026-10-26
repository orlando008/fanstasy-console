# The Franchise: Basketball Edition: Cart Specification

**Version:** 0.1 (draft)
**Status:** Spec agreed in outline (one GM, GM-only game nights, the full set of management layers, a base league in ROM with later years generated); scaffolded, the game is still the starter's placeholder
**Cart source:** `carts/src/franchise/` → `carts/franchise.nova`

---

## 1. Concept

A basketball front-office simulator for one player. You take over one of 30 fictional pro teams as its general manager and
run it season after season: set the lineup and minutes, train the young, sign free agents under a salary cap, draft,
trade with the computer's teams, and watch the games play out as a live scoreboard with a play-by-play ticker and a box
score. You win by building a team that wins titles, and you lose the job if the owner's patience runs out.

**Decisions made with the user:** one GM (no hot-seat); **GM only** (no court action: the game night is a simulation
with a live view, no coach calls); **all four management layers**: roster, lineup and training; draft and free agency;
trades with the computer; salary cap and finances.

**Why it can work on this console.** The screen is 256 x 224 (32 x 28 characters of the 8 px font), the code is 64 KB and
the save data is **1 KB** (256 numbers). So the design leans on three ideas, the way real SNES sports games did: (1) **a menu
game**: every screen is a panel, a table or a list, reachable with the D-pad, A and B; (2) **the starting league lives in ROM**: all 450
players of year 0 and the 30 teams are a table the cart's own build script generates once and ships in the cart's ROM (128 KB); (3) **after
year 0 every team, player and year is a function of the seed**: a player's whole career (his ratings at each age, his contracts, when he leaves) is a closed form, nothing is replayed, and the save holds only the few
players the GM touched (section 13).

## 2. Core loop

A **season** is: preseason (re-sign, train, lineup) → a **regular season** of 58 games in weeks (sim a day, a week, to
the next decision or to the end) with trades and signings open until the deadline → the **playoffs** → the **offseason**
(awards and the owner's verdict, contracts end, the **draft**, **free agency**, progression and ageing) → the next preseason.

A **career** ends when the owner **fires** you (patience at 0), when you retire after 20 seasons, or when you quit. The career gets a
**legacy score** (titles, wins, playoff runs, finals, profit, young stars developed), which goes into the top 10 and the records.

## 3. Controls

The core is the D-pad, A, B, START and SELECT (the buttons a phone's touch controls have). X, Y, L and R are shortcuts only.

| Button | Use |
|---|---|
| D-pad | Move in a list or a table (up and down: rows; left and right: columns, or the value of a slider or a tab) |
| A | Select, confirm, advance (sim the next step) |
| B | Back, cancel, close a panel |
| SELECT | The screen's side menu (sort by, filter, help) |
| X / Y | Shortcuts: X sorts the column, Y shows a player's card |
| L / R | Previous and next tab |
| START | Pause (RESUME, SAVE AND QUIT TO TITLE, QUIT WITHOUT SAVING) |

## 4. Screen layout

256 x 224, 32 columns of 8 px text, a panel look on a dark court-floor background. Every screen has: a **header** (team name and
record, the date, the cap room), a **body** (table, list or panel) and a **footer** (the hints for A, B and the tabs).

| Screen | What |
|---|---|
| Hub | The GM's desk: the next game, the news (injuries, trades, contract offers), and the menu: ROSTER, LINEUP, SCHEDULE, STANDINGS, FINANCES, TRADES, FREE AGENTS, DRAFT, LEAGUE, SIM |
| Roster | The 15 players: name, position, age, overall, the six ratings, salary and years, health; a player card (Y) with the career line |
| Lineup | In the GM's roster screen (the third view, A to edit): who starts, each player's **minutes** (AUTO, DNP, 2 to 48), his **training focus** and his injury; Y shows the **player card** (ratings as bars and the overall year by year) |
| Schedule and standings | The next 10 games, the results, the conferences' tables, the playoff picture |
| Finances | Payroll against the cap and the tax line, the revenue lines, the ticket price slider, the owner's patience bar |
| Trades | Your roster against a team's: pick players and picks on both sides, the AI's verdict |
| Free agents | The pool, each one's asking price and mood, an offer (salary and years) |
| Draft | The board of prospects (the scouting reveal), the lottery, your picks |
| Game night | The court (ten dots and the ball), the scoreboard, a ticker of the last plays, and at the end the box score |

## 5. The rules

### The league

**30 teams** in two conferences of 15 (East, West), each with 15 players on the roster (13 active). **58 games** a season: every team plays every
other twice, once at home and once away. The top **8 of each conference** make the playoffs: best of 7, four rounds, the
better record has home court. The 14 teams that miss it enter the **draft lottery** (the worst record has the best odds).

### Players

A player has: a **position** (PG, SG, SF, PF, C), **age** (19 to 38), **height**, six **ratings** from 20 to 99: **INS** (inside
scoring), **OUT** (outside shooting), **PLY** (playmaking and ball handling), **DEF** (defence), **REB** (rebounding), **ATH**
(athleticism: speed, jumping, stamina); a hidden **potential** (the ceiling of the **overall**), a **contract** (salary in
$0.1M units and years left), **health** (injured for n days) and a **mood** for re-signing.

**Overall** = the position's weights over the six ratings (PG: PLY 3, OUT 2, DEF 1, ATH 1, INS 1; C: INS 3, REB 3, DEF 2, ATH 1, ... the tables are in the
code, and a test asserts their sums), rounded.

**Progression and ageing** (built in steps 1 and 4): a player's ratings in a year are a closed form of his peak ratings and his age (a growth gap before his peak age, a decline after it, athleticism falling first, plus a bounded noise
from a hash of (id, year)), so ageing needs no state. The **training focus** (one rating a player, set in the lineup editor) is the one thing the GM adds: in each offseason the focused rating gains a point with a chance by age (85 % up to 21, 65 % to 24,
45 % to 27, 25 % to 30, 10 % after; +2 now and then up to 22), kept as a **bonus** of 0 to 7 in the player's entry. **Injuries** (built in step 4) are a closed form of (seed, player, year, day): a player has a chance of 0.5 % a day (0.8 % over 30) to start an
injury of 1 to 5 games (60 %), 6 to 15 (30 %), 16 to 30 (8 %) or 31 to 60 (2 %); the hurt do not play, in every team's games. They heal in the offseason. The **minutes** the GM sets for a player (AUTO, DNP, or 2 to 48 in twos) are a part of his
entry too (5 bits), as the focus is (3 bits); a player the GM has only touched has an entry with no contract (0 years), which changes no roster and no payroll.

### The game night

A game is **48 minutes** (four quarters of 12) of **possessions** (about 96 a team; pace from the two teams' ATH and PLY). Each possession:
the ball handler is drawn by usage (OUT, INS and PLY of the five on the court), then a turnover (PLY against DEF), or a shot: inside (INS against DEF and REB),
mid-range or three (OUT against DEF), with a foul chance, then a rebound (REB of both sides). The **five on the court** come from the minutes the GM
set, with fatigue (ATH and the minutes already played) and fouls (six and out) making the coach rotate. A game is a pure function of
(the two rosters' state, the game's seed), so a replay gives the same score.

**Targets** (a test and the sweep check them): an average team scores 105 +/- 5 a game; the league's winning percentage has a spread (standard deviation) of
0.13 (0.10 to 0.18 passes); the best team of a season wins 70 to 85 % of its games; a team of an average overall of 70 beats one of 60 in about 75 % of its games; a 5-point
better starting five is worth about 8 wins in 58.

### Money and the cap

A **soft salary cap** of $120M (a team over it can still re-sign its own players and sign minimum contracts), a **tax line** at $150M (every $1 over is taxed $1.5), a
**minimum payroll** of $90M. Rookie scale contracts by the draft slot (4 years). A **veteran minimum** of $1.5M. Contracts run 1 to 5 years; raises are 5 % a year.

**Revenue** a home game: tickets (arena of 18,000 times the **price** you set times the **demand**, a function of the team's win rate, star power and **hype**), plus
concessions, plus a fixed TV share of $60M a season and playoff gates. **Costs**: the payroll, the tax, **scouting** ($0 to 5M), **facilities** ($0 to 5M: they raise the
training bonus and the demand), a fixed upkeep. The **profit** goes in the owner's mood.

**Owner patience** (0 to 100, starts at 60): +1 to +2 a win above .500, +10 a playoff round won, +25 a title, -10 a losing season, -15 a season with a loss of more than $20M,
-25 a missed playoffs after a rebuild promised and failed; at 0 you are **fired**. A **goal** is set each preseason (win n games, reach round n), and
missing it costs patience.

### The draft

60 prospects a year (generated from the seed and the year), two rounds. **Scouting** (the budget) decides how true the displayed potential is (error of +/-15 with no scouting, +/-3 with the maximum).
The lottery for the 14 non-playoff teams; the AI drafts the best available by its own scouted value with a bit of noise. The GM picks when his slot comes, or
auto-picks. Drafted players sign the rookie scale; second-rounders sign for the minimum.

### Free agency

A pool of the players whose contracts ended and who were not re-signed: each has an **ask** (a function of overall, age and potential) and a **mood** towards your team (winning,
playing time, money, hype). Free agency runs **three rounds** ("days 1, 7 and 30"): you make offers, the AI teams with cap room make theirs, and a player signs with the
best **offer value** (salary, years and mood). Your own expiring players are in the pool too; offering first with a bonus makes them stay.

### Trades

Value of a player to the AI = a function of overall, age, potential and contract (a rookie of high potential is worth more than a 33 year old of the same overall; an overpaid player is
negative). The AI accepts a trade when **the value it receives is at least 1.1 times what it gives**, and when both payrolls stay legal (a team over the cap must send out at
least as much salary as it takes). Draft picks have a value by the owner's record. The AI proposes trades to you in the news, now and then.

## 6. Levels or content

There are no levels: the content is the league. **30 teams** (fictional nicknames on real cities, so nothing is a trademark): East: Boston Harbors,
Brooklyn Bridges, Philadelphia Founders, Toronto Northmen, Atlanta Peaches, Miami Tides, Charlotte Queens... (the final list is in `rom/names`), West: Los Angeles Surf, Golden Gate Fog, Seattle Rain, Denver Peaks, Phoenix
Heat Waves, Dallas Wranglers, Houston Gushers... (the final list is in `rom/names`; none of the 30 may be a real franchise's name). Each team has a **home arena**, two **colours**, and an **emblem**
(from a shape and a pair of colours). **Names** of players come from a first and a last name table in ROM (about 300 and 500): a player's id picks his pair for ever, so the same
player has the same name in every season. The players of year 0 are **rows of a ROM table** (below); later draft classes are generated with the same name tables.

## 7. Opponents or hazards

The 29 other teams are run by the computer (**AI GM**): it signs and drafts by value, trades when a trade is a gain, keeps its payroll legal, and rebuilds or contends by its roster's age. There are
three **difficulty** settings (Rookie, Pro, Hall of Fame): the AI's trade margin (1.3, 1.1, 1.05) and the owner's patience loss.

## 8. Modes

One mode: the **career**, with a choice of team (or **random**), a difficulty and a **seed** (shown and enterable to share a league). A **quick start** begins a season
at once with a random team.

## 9. Scoring

The **legacy score** at the end of a career: 100 a title, 30 a finals, 10 a conference finals, 3 a playoff series won, 1 a win above .500 over the career, 20 for each MVP
or rookie of the year you drafted, 1 for each $10M of profit over the career, ... ; capped at 999,999. The **top 10 table** keeps the legacy score with three initials.

## 10. Screens and flow

1. **Title:** NEW CAREER, CONTINUE (when a career is saved), RECORDS.
2. **New career:** the team (a scrolling list of the 30 with their overall and payroll), the difficulty, the seed.
3. **Hub** and its screens (section 4), a **Pause** (START).
4. **Game night** (live or skipped), **season recap**, **offseason steps** (awards, contracts, the draft, free agency, progression).
5. **Fired** or **retired**: the career summary and the legacy score, then **initials** if it is in the top 10, then the **records**.

## 11. Audio

Songs: 0 the title, 1 the hub (a mellow looping groove), 2 the game night (a brisk beat, a crowd swell on big plays), 3 the draft (tense, a stinger on each pick), 4 the
title win (a fanfare). Effects: menu move, select, back, a buzzer, a swish, a dribble run, a whistle, a crowd cheer and groan, a cash register (a signing), a gavel
(a trade). Songs use channels 0 to 5; effects take turns on 6 and 7. Levels: the lead alone at most 0.07 RMS and 0.75 of the mix, no
vibrato, no jump of more than 1.5x where it enters (`node tools/devkit/music/loud.mjs carts/franchise.nova --check`; playbook section 5).

## 12. Video layers

BG0 a panel look (the court floor in dark wood tones, a frame), BG1 and BG2 the arena silhouette behind the game night; sprites: the **court** dots (ten players
and the ball), the **portraits** (a 24 x 24 face for each player drawn from his id: a skin tone, a hairstyle, a face shape, drawn with the art kit's `head()` and
shared between palettes: 6 hairstyles x 2 face shapes in frames, 4 skin tones and 5 hair colours in palettes) and the **emblems** (30 from a shape and two colours); the overlay: the text and the tables. The art is made in code by
`carts/src/franchise/art.py` (the art toolkit); the tile and sprite budget is in section 14.

## 13. Persistence (save slots)

**The save is 256 numbers**, so the league is not saved, and it is not replayed either (a replay would need every old move kept for ever, and dropping one would change the league). **Every team, player and year is a closed-form function of
(the seed, the team, the slot, the year)**; the save holds only the **entries**: the few players the GM has touched.

- **Slots and people.** A team has **15 slots** (three of each position; slot 0 to 4 the best of the team, 5 to 9 the second string, 10 to 14 the reserves). A slot holds a **person** for a run of years, then the next person:
  person *k* of slot *(t, s)* starts the year the person *k - 1* leaves. Person 0 of each slot is a **row of the base league in ROM** (year 0); every later person is generated from a hash of (seed, t, s, k): his origin
  (a rookie of 19 to 22 or a veteran of 24 to 31), his **peak ratings** and **peak age**, his name, his contracts. No person depends on any other, so nothing cascades and the league is the same whatever the order it is asked in.
- **A person's ratings in a year are a closed form**: his peak ratings less a **growth gap** before his peak age and a **decline** after it (integer tables, a different rate for each rating: athleticism falls first, shooting last), plus a
  small noise from a hash of (id, year) that does not accumulate. A **career** is the walk through his contracts (a contract of 1 to 5 years, then he stays on a new contract or leaves, or retires at his retirement age); the walk is a pure function too.
- **The base league** (`rom/league.bin`, made by a build script with a fixed seed, like `art.py`, that step 1 adds): the **30 teams** (city, nickname, colours, emblem, arena, **talent**) and the **450 persons of year 0** in 15 bytes each (name ids 4,
  height, age, six peak ratings, peak age, salary and years left): about 7 KB. The career's seed jitters each year-0 rating by -3 to +3 and makes every later person; a team's **talent** decides how good its new persons are (and wanders a little with the years), so teams rise and fall.
- **Free agents and the draft class** of a year are also functions: the persons whose contracts end and who leave their slot that year (they sign somewhere else, in the game's terms: with a fresh person arriving in the slot of the team that would have bid), and 60 **prospects** from (seed, year, i). The computer's teams do not trade among themselves; their rosters turn over by the slots' own timelines.
- **The save holds the entries.** An **entry** is a person the GM has touched (drafted, signed, traded for, traded away): his id (a slot person is (t, s, k), a prospect is (year, i)), his **team** now, **contract** (salary, years), the year it started, and his **training bonus** (3 bits for each of the six ratings). A person on an AI team that the GM took leaves his slot **that year**, and the slot's next person starts then; a person the GM trades to an AI team simply stands on its roster (above 15 the AI drops its weakest). **About 90 entries fit** (two numbers each); when the table is full, the oldest entries of players who are not
  on the GM's team are folded back (the player goes back to his own run); retired players' entries are dropped. The GM's roster is the entries on his team and his team's own slots that he has not given away.
- **No history is needed to load**: the league of any year is computed on demand (cached per team and year), so "next year" only changes the year. **Tests:** a person's career is the same however it is asked (year by year, backwards, or only at the end); a
  save and a load give the same league (every roster, field by field); the payrolls, ages and rating distributions of the base league and of a league 10 and 20 years on stay in range; a **save version** in slot 0 (a change to a rule bumps it and an older save is refused with a message).

| Slots | Contents |
|---|---|
| 0 | Format version |
| 1 | Last initials entered |
| 2-9 | Career: seed, team and difficulty, year and day, phase, owner patience, cash |
| 10-39 | Top 10 legacy scores, best first, 3 slots each: score, initials, 1 spare |
| 40-54 | The standings: wins and losses of two teams to a number (6 bits each) |
| 55-56 | (the day and the phase are slots 5 and 6) |
| 57-59 | The playoff teams of the round: 5 bits each, 6 to a number |
| 60-61 | The series' wins in the round: 3 bits for each side, 4 series to a number |
| 62-63 | The playoff round; the champion of the year (+1) |
| 65-70 | The career tally: titles, finals, conference finals, series won, wins, losses |
| 72-73 | The GM's results of the season, a bit a day (1 is a win) |
| 64, 71, 74 | Spare (finances and awards come with their steps) |
| 75 | The number of entries |
| 76-255 | The entries, two numbers each: **90** |

## 14. Asset budget

| Asset | Budget |
|---|---|
| Code | 48.3 KB of the 64 KB limit after step 4 (`node tools/check.js franchise`); `"strip": true` in `meta.json` from the start. The logic is compact and pure: the league, then the game sim, the AI, the screens |
| Tiles | none yet (the backdrop is one colour); the panels, the court, the portraits' frames and the emblems come with the art pass (of 1,024) |
| Sprites | none yet (128 in OAM, 32 per line): later the game night's ten dots and the ball, a portrait or two a screen |
| ROM | 15.0 KB of 128 KB after step 3: `league.bin` (7.0 KB: 30 teams, 450 people) and `names.bin` (8.0 KB: 369 first names, 739 last names, the cities and nicknames) |
| Songs / SFX | the starter's two songs and seven effects until the audio pass |

## 15. Implementation plan

1. **The league:** the build script for the base league and the name tables into ROM, the slots and persons (closed-form careers and ratings), the seed's jitter, the contracts, the entries and the save and
   load (tests: a career is the same however it is asked; save then load gives the same league), a **league viewer** (new career: pick a team; the teams' list; a roster; "next year" to see the league age). *Checks:* determinism, the rating distributions
   10 and 20 years on, the payrolls near the cap, the save budget.
2. **The game night:** the possession simulation, the box score, the live view (the court, the scoreboard, the ticker); the calibration of the scoring and of the strength spread (section 5's targets).
3. **The season:** the schedule, the standings, the playoffs, the hub and the screens' framework (lists, tables, panels, the hints), sim by day, week and to the end.
4. **Roster and lineup:** the lineup and minutes, training focus, injuries, progression and ageing in the offseason, the player card.
5. **Money:** contracts, the cap, the tax, revenue and costs, the owner's patience, firing, the legacy score and the records.
6. **Draft and free agency:** the prospects, scouting, the lottery, the board, the pool, offers, the AI's signings.
7. **Trades:** the value function, the AI's verdict and counter-offers, the AI's own proposals.
8. **Art, audio, balance and polish:** portraits and emblems, the court, the music and effects, a **GM bot** for the sweep (it plays many seasons: a stuck-state check and the balance of
   the AI), the label, the PNG cart and the Library (`node tools/release.js franchise`) and a README row.

Each step: build it, run `node tools/check.js franchise` and `node tools/test.js franchise`, write its **Built** and **Results** notes under its number here, commit and push.

### Built and results: step 1, the league

**Built:** `league.py` (the base league and the name tables into `rom/league.bin` and `rom/names.bin`, a fixed seed), and in `code.js` the league as closed forms: `hash` and `stream`
(a small xorshift), `person` generation (`gen`, `mkPerson`), `career` (the contracts and the year a person leaves), the ratings of a person in a year (a peak less a growth gap or a decline, athleticism
falling first, plus a hashed noise that does not build up), the slot timelines (`extend`, `slotAt`), `roster`, `payroll`, `strength`, the draft class (`prospect`), the **entries** (two numbers each, 90 of
them, from slot 76) with `saveEntries` and `loadEntries`, `newCareer` and `loadCareer`. The screens: the title (NEW CAREER, CONTINUE, RECORDS), the team list with a seed (X rolls it), the hub (ROSTER, LEAGUE, NEXT YEAR,
RETIRE; step 2 adds PLAY A GAME), the league table, a roster with two views of its columns (age, overall, pay, years; and the six ratings). RETIRE ends a career with a placeholder legacy score (100 a year and the team's strength) that goes into the
top 10, so the initials and records frame is exercised. Tests: `01-flow.mjs` (the frame and its screens), `02-league.mjs` (the ROM, determinism, the seed, the shape of the league 0, 5, 10 and 20 years on for four seeds,
careers, prospects, the entries and the save, the load time); the bot runs a 25-year career (a sweep finds no stuck run and every team keeps 15 players).

**Decisions and what they cost.** (1) **No replay**: the first design replayed the offseasons from year 0, but then every move the GM made would have to be kept for ever, and dropping one would change
the league; the slot model above has no history at all, and the 90 entries are the only state. (2) **The computer's teams do not trade among themselves** and do not react to the GM: their rosters turn over by the slots' own timelines.
(3) **`MANUAL` is false**: the GM's team gets people in its empty slots for free, like the others, until steps 5 and 6 (contracts, the draft, free agency) give him the tools; then it is true and an empty slot stays empty until he fills it.
(4) A **person in the GM's team that he traded away leaves his slot** that year; on an AI team the slot's next person starts at once. (5) Salaries (units of $0.25M) were tuned so a team's payroll is about $117M in
year 0 and $105 to $125M on average later, but a few generated teams reach $200M or more in some years: step 5 gives the computer a payroll rule (it lets people go over the tax line).

**Results:** the league of year 20 is worked out from nothing in 13 ms. Across seeds and years: 15 players a team, ages 19 to 38, an overall of 55 to 58 on average, 8 to 19 stars (80 and over), team strengths of 54 to 76 with a
spread of 3 to 4. The save: 256 numbers hold the header (2 to 9), the top 10 (10 to 39), the season (40 to 74), the count (75) and 90 entries.

### Built and results: step 2, the game night

**Built:** in `code.js`, `playGame(y, ht, at, seed)`, a pure function: possessions of 9 to 22 seconds on a 12-minute quarter clock (five-minute overtimes), the ball handler drawn by usage, turnovers, inside, mid-range
and three-point shots with fouls, blocks, free throws and rebounds, all scaled by one constant `SENS` that sets how much a rating point matters; the coach's rotation from a minutes plan by rank (`TARGET`), with fatigue,
six fouls and garbage time; a log of short phrases for the ticker and a box score. The screens: the hub's PLAY A GAME (pick an opponent from the league list), the live view (the court with the ten players, the scoreboard, the ticker,
three speeds on the pad) and the box score (X flips the columns, LEFT and RIGHT flip the team). Tests: `03-game.mjs` (purity, a box score that adds up over 870 games, the league's numbers, strength against margin, the coach, the log,
the screens), run for five league seeds.

**Calibration** (what moved from the first guess): the first version scored 112 and was far too decisive (2.3 points of margin per strength point), so `SENS` and the base probabilities were rebased and the talent spread widened in `league.py`
(team strengths now run 51 to 80 with a spread of 4 to 6, and payrolls 35 to 313, which step 5 reins in); the clock is clamped so a period never overshoots; a fouler is picked only from players under six fouls; home advantage is +0.018 on the shot probability.

**Results:** about 104 points a team, 47 % from the field, 36 % from three, 76 % at the line, about 95 possessions, home wins 53 %, overtime in 2 % of games, 1.7 % of players foul out, a strength point is worth about 1.0 of margin. The winning
percentage spread is about 0.13 (the spec asked for 0.15; the test accepts 0.10 to 0.18) and the best team reaches 0.78 to 0.81. A game costs about 1.8 ms. Code is 32.3 KB, ROM unchanged.

### Built and results: step 3, the season

**Built:** in `code.js`, the **season** as closed forms and a small saved state. `pairs(day)` is the schedule: two round robins of 29 days (a circle method over a shuffled team order, and the days in a shuffled order, from a hash of the seed and the year), so every
team plays every other twice, once at home, 58 games, 15 games a day. `advanceDay()` plays a day: every game is `playGame` with a seed from (seed, year, day, home), the results go into the standings, and the GM's game comes back whole for the live view.
After day 58 the **playoffs** begin: the top 8 of each conference (wins, then a hashed tie-break), 1 against 8, 4 against 5, 3 against 6, 2 against 7, **best of seven** with the home court 2-2-1-1-1 to the better record, four rounds, the finals between the conferences;
`endRound` counts the GM's titles, finals, conference finals and series. The **hub** is now by the date: PLAY NEXT GAME (the live view and the box score of step 2, for the day's game), SIM DAY, SIM WEEK, SIM TO PLAYOFFS (SIM TO END in the playoffs), ROSTER, STANDINGS (East, West, the
playoff round), SCHEDULE (the 58 games, W or L), LEAGUE, RETIRE, QUIT; after the final it offers NEXT YEAR. A sim runs a game a frame on its own screen (B stops it at the end of the day), so the frame time stays low. The **legacy score** now comes from the tally
(100 a title, 30 a finals, 10 a conference finals, 3 a series, 1 for every two wins above .500); the rest of section 9 comes with the steps that have the facts (profit, awards). The exhibition game of step 2 is gone: every game is a day's game.
Tests: `04-season.mjs` (the schedule, 6 seasons and their playoffs, the save at every day, repeatability, the sim controls and the screens); the bot sims 25 seasons.

**Results:** the schedule is exact (every pair twice, 29 home games each). Over six seasons: a winning percentage spread of 0.13, the best team at 0.78 on average (0.83 at most), a correlation of 0.88 between strength and wins, and different champions. A
season of 870 games takes about 1.6 s of CPU, which is why a sim spends a frame on each game.

### Built and results: step 4, roster, lineup and training

**Built:** in `code.js`: `injuries(p, y)` and `hurt(p, y, day)` (the closed form above; `playGame` takes the day as a fifth argument and leaves the hurt out), `plan(t, y, day)` (the rotation of a team for a game: the fit players best first, each with minutes planned, and the
starting five: the coach's, with a player of each position, or the GM's five with the most minutes once he has set any), `touch` and `edit` (an entry with no contract; one that does nothing is dropped), `trainAll` and `nextYear` (the training and the
offseason report), and the screens: the roster's third view (`*` starts, MIN with a `*` when it is the GM's, FOC, OUT n), the editor (A; UP and DOWN pick the field, LEFT and RIGHT change it, B closes), the **player card** (Y) and the **offseason report** (what became of each player: age,
overall before and after, what training gave, new and gone). The entry format took the 3 spare bits (focus) and 5 spare bits (minutes) it had; no slot moved. Tests: `05-lineup.mjs` (injury rates and lengths, a hurt player out of the game, the minutes plan and what it does to a game, the save, training by age,
the screens and the report); the bot tinkers with a lineup every offseason.

**Results:** 7.5 injuries a team a season, 7 games long on average (the longest 40), 0.5 of a team out at a time. A player set to 48 minutes plays about 42 and the DNP not at all. Training: the gain a year is 1.0 for the 21 and under, 0.7 to 24, 0.3 to 27, 0.2 to 30, 0.04 after.
The code is 48.3 KB of 64: the money, the draft and the trades still have to fit in 16 KB, so the next steps write compactly and share the list and table code (a tracker for the budget is in the open questions).

## 16. Open questions

- The **length of a season** (58 games here: every team twice) against a real 82; a shorter season is faster to play, a longer one more real.
- **Two-way depth**: whether to add player **traits** (a sharpshooter, a rim protector) beyond the six ratings, for variety.
- **Real names**: fictional teams and generated players are the plan; no real franchise, league or player name goes in.
- **More than one base league**: one table of 7 KB plus the seed's jitter is the plan; two or three base leagues (different eras of talent) would cost only 7 KB each if the jitter proves too samey.
- **Game night speed**: a live game takes about 40 seconds at the fastest pace of the play-by-play (skippable); is that right?
- **The code budget**: 48 KB of 64 KB after step 4. If steps 5 to 7 do not fit, the first things to trim are the offseason report's rows, the card's chart and the SHORT phrase table; a second table in ROM (text) does not count against the code.
