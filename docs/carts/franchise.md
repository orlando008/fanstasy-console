# The Franchise: Basketball Edition: Cart Specification

**Version:** 0.1 (draft)
**Status:** Spec agreed in outline (one GM, GM-only game nights, the full set of management layers); scaffolded, the game is still the starter's placeholder
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
the save data is **1 KB** (256 numbers). So the design leans on three ideas: (1) **a menu game**: every screen is a
panel, a table or a list, reachable with the D-pad, A and B; (2) **the league is a function of a seed**: players, names,
careers and the computer's moves are generated, never stored, and the save holds only what the player changed (section
13); (3) **data in ROM**: names, cities and team names are a text blob in the cart's ROM (128 KB), not in code.

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
| Lineup | The starting five and the bench order, **minutes** sliders (0 to 48), and a **training focus** for each player |
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

**Progression** (each offseason, one pure function of the player's id, age, potential, training focus and the year): up to +6 a rating at 19 to 22,
+3 at 23 to 25, 0 to +1 at 26 to 29, -1 to -2 at 30 to 32, -3 to -5 at 33 and over, each plus a bounded noise from a hash of (id, year); the
**training focus** (one rating a player) adds +1 a year to that rating, and costs a little of the others. **Injuries**: each game a player on the court has a 0.4 %
chance of an injury of 1 to 60 days, more for a tired player.

### The game night

A game is **48 minutes** (four quarters of 12) of **possessions** (about 96 a team; pace from the two teams' ATH and PLY). Each possession:
the ball handler is drawn by usage (OUT, INS and PLY of the five on the court), then a turnover (PLY against DEF), or a shot: inside (INS against DEF and REB),
mid-range or three (OUT against DEF), with a foul chance, then a rebound (REB of both sides). The **five on the court** come from the minutes the GM
set, with fatigue (ATH and the minutes already played) and fouls (six and out) making the coach rotate. A game is a pure function of
(the two rosters' state, the game's seed), so a replay gives the same score.

**Targets** (a test and the sweep check them): an average team scores 105 +/- 5 a game; the league's winning percentage has a spread (standard deviation) of
0.15; the best team of a season wins 70 to 85 % of its games; a team of an average overall of 70 beats one of 60 in about 75 % of its games; a 5-point
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
(from a shape and a pair of colours). **Names** of players are generated from a first and a last name table in ROM (about 300 and 500) and an id, so the same
player has the same name for ever.

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

**The save is 256 numbers**, so the league is not saved: it is **generated** from the seed. Every player is a function of an **id** (his name, position, birth year, potential, rating curve with its hashed
noise), every AI team's roster a function of (seed, year) *and the changes the player made*. The save holds: the seed, the year, the day, the GM's own roster (ids, contracts, training), the **moves of
players the GM made** (a trade or a signing: an id and a team, from a date, about 60 of them; older ones fall off after two seasons as the league has since changed), the standings of the year (30 packed
numbers), the owner's state, the finances, and the career's score. Loading rebuilds the league by replaying the seasons from the seed: **a test proves a save and a load give the same
league**, and the load time stays under a second.

| Slots | Contents |
|---|---|
| 0 | Format version |
| 1 | Last initials entered |
| 2-9 | Career: seed, team, year, day, difficulty, phase, owner patience, cash |
| 10-39 | Top 10 legacy scores, best first, 3 slots each: score, initials, 1 spare |
| 40-69 | The GM's roster: player id, contract (salary and years) and training, 2 numbers each |
| 70-129 | Moves: (id, team, day) in 2 numbers each, 30 moves |
| 130-159 | The standings: 30 numbers of wins and losses |
| 160-199 | Finances of the last seasons, awards and the legacy tally |
| 200-255 | Reserved |

## 14. Asset budget

| Asset | Budget |
|---|---|
| Code | TODO KB of the 64 KB limit (`node tools/check.js franchise`); `"strip": true` in `meta.json` from the start. The logic is compact and pure: generation, the game sim, the AI, the screens |
| Tiles | TODO of 1,024: the panels, the court, the font's own, the portraits' frames, the emblems |
| Sprites | TODO (128 in OAM, 32 per line): the game night's ten dots and the ball, a portrait or two a screen |
| ROM | TODO of 128 KB: the names, the cities, the team names |
| Songs / SFX | TODO |

## 15. Implementation plan

1. **The league:** the data model and the **generation** of players and teams from a seed (names from ROM), the ratings and overall, the contracts, progression and ageing, the save and load (a test: save
   then load gives the same league), a **league viewer** screen (a list of the teams, a team's roster). *Checks:* determinism, the rating distributions, the payrolls near the cap, the save budget.
2. **The game night:** the possession simulation, the box score, the live view (the court, the scoreboard, the ticker); the calibration of the scoring and of the strength spread (section 5's targets).
3. **The season:** the schedule, the standings, the playoffs, the hub and the screens' framework (lists, tables, panels, the hints), sim by day, week and to the end.
4. **Roster and lineup:** the lineup and minutes, training focus, injuries, progression and ageing in the offseason, the player card.
5. **Money:** contracts, the cap, the tax, revenue and costs, the owner's patience, firing, the legacy score and the records.
6. **Draft and free agency:** the prospects, scouting, the lottery, the board, the pool, offers, the AI's signings.
7. **Trades:** the value function, the AI's verdict and counter-offers, the AI's own proposals.
8. **Art, audio, balance and polish:** portraits and emblems, the court, the music and effects, a **GM bot** for the sweep (it plays many seasons: a stuck-state check and the balance of
   the AI), the label, the PNG cart and the Library (`node tools/release.js franchise`) and a README row.

Each step: build it, run `node tools/check.js franchise` and `node tools/test.js franchise`, write its **Built** and **Results** notes under its number here, commit and push.

## 16. Open questions

- The **length of a season** (58 games here: every team twice) against a real 82; a shorter season is faster to play, a longer one more real.
- **Two-way depth**: whether to add player **traits** (a sharpshooter, a rim protector) beyond the six ratings, for variety.
- **Real names**: fictional teams and generated players are the plan; no real franchise, league or player name goes in.
- **Game night speed**: a live game takes about 40 seconds at the fastest pace of the play-by-play (skippable); is that right?
