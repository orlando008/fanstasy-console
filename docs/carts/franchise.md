# The Franchise: Basketball Edition: Cart Specification

**Version:** 1.0
**Status:** Built in eight steps (the league, the game night, the season, the lineup, the money, the draft and free agency, the trades, the art and audio) and released; section 15 has what each step built and measured
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
| SELECT | The screen's second action: a player's card (rosters), fill the roster (free agents), a new seed (the team list), make the deal or ask what they want (a trade). The touch controls have only the D-pad, A, B, START and SELECT, so nothing needs more |
| X / Y | Shortcuts for the same: X rolls a seed, fills the roster, makes the deal; Y shows a card |
| L / R | Previous and next tab; R asks what they want in a trade |
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
(athleticism: speed, jumping, stamina); the screens spell them out where there is room (the player card, the training editor) and the roster's ratings view has a legend under its table; a hidden **potential** (the ceiling of the **overall**), a **contract** (salary in
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

A **soft salary cap** of $120M (a team over it can still re-sign its own players), a **tax line** at $150M (every $1 over is taxed $1.5, paid at the end of the regular season), a **minimum payroll** of $90M (a team under it pays the
shortfall). **The payroll rule**: the contracts that came with the league are scaled (30 to 300 %) so every team's payroll sits between the minimum and $5M under the tax line; the GM's own signings are not scaled. A **veteran minimum** of $1.5M. Contracts run 1 to 5 years.
Rookie scale contracts by the draft slot come with step 6.

**Revenue** for the GM's team (the others have none): a home game brings the **gate** (the arena's seats, about 15,000 to 20,500, times the **fill** times the ticket price) plus $18 a head of concessions; the fill is the **demand** (45, plus 0.35 times the
market, plus 80 times the win rate above .500, plus 2 for each player of 78 or more, plus 2 for each level of facilities, plus a tenth of the owner's patience above 50) less 0.8 a dollar above $70, from 40 to 100 %, and 1.3 times that in the playoffs, when the
tickets cost 1.5 times as much. The **TV share** is $100M a season. **Costs**: the payroll, $12M upkeep, **scouting** ($0 to 5M, for the draft in step 6) and **facilities** ($0 to 5M: they raise the demand and the chance of a training gain). The ticket price
is 30 + 10 a level, 0 to 10 (the best price is about $50 to $60 for a middling team, higher for a star team). Money moves a day at a time (the TV share and the costs) and with each home game (the gate); the tax and the shortfall at the end of the season.

**Re-signing.** A player whose run of contracts ends (his last year, which is when the league lets him go) can be re-signed in the offseason (RE-SIGN in the hub): he asks his market price, 92 to 108 % by his mood (a little more after a season out of the
playoffs), 3 % a year more for each year over one for a player of 29 and over, 2 % a year less for the young, from 1 to 5 years, and the deal is his from the next year (a man who is already on a deal of his own has it rewritten from this year, so there is no gap); he stays and the slot's next person waits for the end of it. Other contracts renew by themselves, as before.
**Release**: in the lineup editor (RELEASE, A twice) a player goes at once and half of what is left of his deal is paid now; the slot is filled at once by a new man at a market price (until step 6 gives the GM the free agents).

**Owner patience** (0 to 100, starts at 60) is settled at the end of the playoffs: one for each two wins above 29 (and as many below), -10 for a losing season, +4 for each playoff series won and +15 for the title, -5 if a goal of the playoffs was missed,
+5 for a profit of more than $10M and -15 for a loss of more than $20M, +6 for meeting the **goal** of the season (wins, set in the preseason from the team's strength against the league's: 15 to 46 wins; the playoffs too from 30), -6 for missing it; and the patience then drifts an eighth of the way to 50.
At 0 you are **fired** when you press NEXT YEAR. The **legacy score** adds 1 for each $10M of profit over the career to the tally of section 9.

### The draft

60 prospects a year (generated from the seed and the year), two rounds of 30 picks, the worst records first (the wins, with a hashed nudge: a small lottery). The class is thin: the first 12 to 15 are players
of a peak of 55 to 75; the rest are fillers. **Scouting** (the budget, $0 to 5M) decides how true the numbers on the board are: the overall shown is off by up to 5 and the potential (the peak overall) by up to 10 with no scouting, and exact at the maximum (a fixed error for each
prospect). The computer takes the best left (the peak plus the overall now); the GM picks when his slot comes, or presses B and the rest is picked for him. Rookie scale: pick 1 gets $8.5M for four years, down to the minimum by about pick 20; the second round, two years at the minimum. The draft is one sitting: leaving it
unfinished changes nothing. The players the computer drafts do not appear in the league (its teams fill their places by the slots' own timelines).

### Free agency

The pool, in the offseason: the **street class** (38 ordinary players a year, ids from 15360, made like the reserves) and **everybody whose deal ends** on the other 29 teams, and the GM's own whose deals end (marked `*`; the old RE-SIGN is part of it); in the season, only the street class. Each has an **ask**
(section above: his market price by his overall, age and a mood of 92 to 108 %, a little more for years over one for the old, a little less for the young) and the GM chooses the years (1 to 5) and signs (A). **The soft cap**: a team over the $120M cap can only sign its own players, or a player who asks $3M or less. A roster is 15 at the most. X
signs the GM's own and then the best affordable ones until the roster has 13. A deal starts next year (now, in the season); the player the GM signs is gone from his old team's slot, which gets its next person. There are no rounds, and no bidding by the computer: the pool is what is left for the GM. **The roster rules**: with fewer than 10 players the GM cannot sim or play (he must sign), and NEXT YEAR needs 10 to 15 players on next year's roster.

### Trades

TRADES is in the hub from the start of the season to day 40 (the deadline) and again after the playoffs; you pick a team and then, on a screen of two rosters, up to three of your men and up to three of theirs. **The value of a man to the computer** is his
market price for his overall (the pay table of the section above), times 1.25 up to 23 years old, 1.1 to 27, 1 to 30, 0.8 to 33 and 0.6 after, plus 0.3 of what his deal saves (the price less his pay) for each of the next four years: an overpaid man is worth little or
less than nothing. The computer says yes when **what it receives is at least 1.1 times what it gives**, and when both payrolls stay legal (a team that goes over the $120M cap must send out at least as much pay as it takes), and when your roster would not pass 15. A man signed or drafted this offseason cannot be traded. The computer shows the verdict as you pick
and R asks it which of your men it would take to make a no into a yes. The computer's players that you get are on your roster at once (next year, in the offseason) with the deal they had; the one you give is on the other team's roster, which lets its weakest man go if it passes 15, and the slot you
took him from has its next person from then on. A trade makes one entry for each man who moves; the minutes and the focus of a man you give are cleared, his training bonus stays. Draft picks cannot be traded (the save has nothing to hold them), and the computer proposes no trades to you (its teams do nothing on their own); both are left out on purpose.

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

Songs (`audio.py`): 0 the title (A minor, 150 bpm), 1 the hub (F major, 100 bpm, mellow: an electric piano over a soft groove and a strings pad), 2 the game night (E minor, 150 bpm, brisk: a soft horn and a flute lead, an arpeggio, a driving beat),
3 the draft (D minor, 90 bpm, tense: strings and a plucked line, the beat comes in for the last bars), 4 the title win (C major, a fanfare once through). Effects (the `SFX` table in `code.js`): 0 menu move, 1 select, 2 pause, 3 a hit, 4 game over, 5 a free throw, 6 a record,
7 back (B), 8 the buzzer (the end of a period), 9 a swish (a basket), 10 a whistle (a foul), 11 a cheer (a three), 12 a groan (your turnover), 13 a cash register (a signing), 14 a gavel (a pick, a trade). The cues: the game night plays song 2 and the hub song comes back with the box score; the draft plays song 3;
a title won plays song 4 when the playoffs end. Songs use channels 0 to 5; effects take turns on 6 and 7. All five songs pass `loud.mjs --check` (the lead alone 0.020 to 0.035 RMS and 0.52 to 0.72 of the mix, no jump where it enters) and `clash.py` (no lead note against its chord). Sample RAM 14.0 of 32 KB.

## 12. Video layers

**BG0 is the floor**, two full-screen pictures in Map RAM that code.js switches between: a dark hardwood floor behind the menus and the tables, and the **court** (lighter wood, the lines, the keys, the free throw circles, the three-point arcs, the centre circle) behind the game night, whose dots and hoops are drawn over it. The planks repeat 32 x 16, so the two cost 206 of the 255 BG tiles together with the lines.
Sprites: the **emblems** (six shapes of 16 px: a ball, a shield, a star, a diamond, a hexagon with a band, a bolt; a team's emblem is its shape in its two colours, set with `color()` when it is drawn, in palette 6 or 7: the header of the hub, a team, a trade, and both teams on the scoreboard), the **portraits** (six hair styles of 32 px, drawn with the art kit's `head()` on a jersey: the skin (four tones), the hair (five colours, grey after 33 for some) and the style come from the player's id, the jersey from his team; shown on the player card) and the title's **logo** (a big sprite) with a ball.
The overlay: the text and the tables, on see-through indigo panels; its colours 1, 3 and 10 are set by the art script (an indigo shadow, a blue frame, a pale blue for the quiet text) so no panel is the default brown and grey (`colors.mjs --check`: muddy panels 0.00). The art is made in code by `carts/src/franchise/art.py` (the art toolkit); the budget is in section 14.

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
| 7-9 | Owner patience; cash; the ticket price (4 bits), scouting (3) and facilities (3) |
| 55-56 | The season's goal: wins; the playoffs (0 or 1) |
| 64, 71, 74 | Last season's profit; the cash at the start of this season; the playoff result of the year (0 missed, 1 in, +1 a series won) |
| 40-54 | The standings: wins and losses of two teams to a number (6 bits each) |
| 57-59 | The playoff teams of the round: 5 bits each, 6 to a number |
| 60-61 | The series' wins in the round: 3 bits for each side, 4 series to a number |
| 62-63 | The playoff round (5 once the draft is done); the champion of the year (+1) |
| 65-70 | The career tally: titles, finals, conference finals, series won, wins, losses |
| 72-73 | The GM's results of the season, a bit a day (1 is a win) |
| 75 | The number of entries |
| 76-255 | The entries, two numbers each: **90** |

## 14. Asset budget

| Asset | Budget |
|---|---|
| Code | 62.5 KB of the 64 KB limit after step 8's art (`node tools/check.js franchise`); `"strip": true` and `"mangle": true` in `meta.json` (55.3 KB after step 6's size pass, 59.5 KB with the trades, 62.5 KB with the art block and the screens that use it) |
| Tiles | 436 of 1,024: 206 of the 255 BG tiles (the two floors), 120 sprite tiles (6 emblems, 6 portraits, the logo) |
| Sprites | at most 5 on a screen (two emblems on the scoreboard, a portrait, a logo), of 128 in OAM |
| ROM | 15.0 KB of 128 KB: `league.bin` (7.0 KB: 30 teams, 450 people) and `names.bin` (8.0 KB: 369 first names, 739 last names, the cities and nicknames) |
| Songs / SFX | 5 songs (9 patterns), 15 effects, sample RAM 14.0 of 32 KB |

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
(3) **`MANUAL` is true from step 6**: the GM's team no longer gets people in its empty slots for free (before it did); an empty place stays empty until he fills it with a re-signing, a free agent or a rookie. The save format is 2.
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

### Built and results: step 5, money

**Built:** in `code.js`: the payroll rule (`kOf`, `contractAt` over `rawC`), the money (`gate`, `fill`, `demand`, `costs`, the day's accrual and the tax in `endDay`, a home game's gate in `playOne`), the owner (`verdict`, `setGoals`, the settling in `endRound`, the firing at NEXT YEAR),
the re-signing (`expiring`, `ask`, and in `extend` a re-signed man keeps his slot while the next person waits), the release (a third field of the lineup editor), the legacy score with profit, and the screens FINANCES (the payroll against the cap and the tax line, the three budget lines to change,
the fill and the gate, this season and last, the owner's bar and the goal), RE-SIGN, VERDICT, and a hub with the cash and the owner on its panel (the hub's menu is 10 pixels a line to fit eleven items). The training chance rises 2 points for each level of facilities. Tests: `06-money.mjs` (profits across teams, the price curve, the exact cost of
scouting, the payroll rule, a re-signing and the roster that stays 15, the tax, the owner, the firing, the save, the screens); the bot re-signs everyone and sims 25 seasons (or until it is fired).

**Results:** the payroll rule puts every team between $89.5M and $146M. A season's profit with the usual budget runs from -$26M to +$14M across eight teams (the mean about $0), a bad payroll plus the tax can lose $130M. A team of the worst strength is fired in about 12 seasons if the GM does nothing; a strong team's patience stays at 85 to 100.
Nobody's deal ends before the third season (the league's first contracts are 3 to 5 years), so RE-SIGN starts in the third offseason. **The code is 56.6 KB of 64: 8.9 KB left for the draft, free agency and trades, which is not much; see the open questions.**

### Built and results: step 6, the draft and free agency

**Built:** `MANUAL` is true and the save format is 2. In `code.js`: the street class (`street`, ids 15360 up), `pool`, `canSign` (the soft cap and the roster of 15), `signDeal` and `ask` working for the next year (`VY`: the year the GM works on, next year in the offseason), the FREE AGENTS screen (LEFT and RIGHT the years, A signs, X fills to 13), the draft
(`startDraft`, `takeP`, `runAI`, `est`, `value`, `rookie`, the DRAFT screen with the board sorted by what scouting shows, the last five picks under it), the roster rules in the hub (under 10 players no sim and no game; NEXT YEAR needs 10 to 15), the roster screen showing next year's roster in the offseason, a release that costs nothing for a deal made this offseason, and the GM's payroll scaled
only down (the league's payroll rule has a floor for the computer only). The hub's menu is 9 pixels a line (twelve items). A draft class is a little deeper (the rank slope 3/4 instead of 5/4). Tests: `07-draft.mjs` (the street class, the pool, the cap rule, the order, the picks, the rookie deals, the save, scouting, the screens and the roster limits); `06-money.mjs`'s long re-signing test
now fills the roster as well; the bot drafts (B), signs (X) and plays 25 seasons.

**Results:** the pool has about 100 players in an offseason (38 street, about 60 leaving other teams, a few of the GM's own). The street class averages an overall of 45 (the best near 65); with a payroll of $124M most of the good ones are beyond the cap and the cheap ones are the street class. The draft has about 12 real prospects.
**The code was 60.7 KB of 64: 4.9 KB left, which trades (step 7) would not fit. A size pass came first: `"mangle": true` in `meta.json` (`tools/devkit/mangle.mjs`, tested by `tests/console/mangle.mjs`) shortens the names the code declares at its top level and gives 5.3 KB back: 55.3 KB, 10.2 KB left.**

### Built and results: step 7, trades

**Built:** in `code.js`: `worth`, `tradeCheck` (the reasons in words: PICK PLAYERS, THREE EACH AT MOST, YOUR ROSTER WOULD PASS 15, TOO MANY DEALS (the save holds 90 entries; a trade needs room), OVER THE CAP, THEY ARE OVER THE CAP, THEY WANT MORE (a and b of what they need)),
`counter` (the least valuable man of yours who turns a no into a yes), `tradable`, `doTrade`, the trade screen (A picks, LEFT and RIGHT change sides, X proposes, R asks, Y shows a card and B comes back) and the TRADES item (the league list in a mode of its own). The hub lost its QUIT TO TITLE item (the pause menu has it) to fit thirteen
items. An entry for a deal that has run out is dropped at NEXT YEAR. Tests: `08-trades.mjs` (the worth of a man, the verdicts, a trade's entries, rosters and deals, the save, a dozen trades in a row with every roster whole, who cannot be traded and when, the screens); the bot tries a trade each offseason.

**Results:** the computer refuses most lopsided trades by the cap rule (its payroll sits near the cap by the payroll rule, so the pay must match), which makes a trade a matter of matching pay and worth; a one-for-one that it accepts is easy to find (a good young man for an older one of the same pay). The code is 59.5 KB of 64 (4.5 KB left for the art and the polish of step 8).

### Built and results: step 8 (so far), the audio and the art

**Built:** the audio (section 11) and the art (section 12) above, and in `code.js` the cues (`SFX` and `SONG` tables, the sounds in `updateLive`, the draft and the trade, a back sound on B), `emblem()` and `portrait()` (colours set with `color()` as they are drawn), the floor switch in `draw()`, the title's logo, the header with an emblem. `tools/devkit/harness.mjs` no longer counts a test's appended hooks against the 64 KB (the probe is 3 KB and the cart is near the limit); the console itself still checks the whole code. A team's two colours are never the backdrop's (`league.py`; five teams changed, nothing else in the league).
**A bug the tests found:** a portrait from a negative hash picked a skin tone that did not exist (a crash on the card for some players); `09-art.mjs` draws the card of all 15 players. Tests: `09-art.mjs` (the scenes, the sprites, the teams' colours and shapes, the faces, the card's time).
**The code is 62.6 KB of 64: 2.9 KB left.**

**Balance** (`bot.mjs`, `node tools/devkit/sweep.mjs franchise --seeds 6 --set skill=0,1`; skill 0 is a GM who benches his best man, skill 1 one who only sets a training focus; both draft by B, fill the roster with X, re-sign, try a trade once a year and sim 25 seasons; no run is stuck): a GM who does little keeps a middling team for ten years (25 to 33 wins of 58, patience 45 to 100) and then it fades, since the computer's teams are given new people by the slots' own timelines and his are not;
he is fired in about 4 careers of 6, between seasons 10 and 21; the best one-title run is 1 in 6. That is the point of the bot: the owner's patience does run out for a GM who does nothing, and the market gives a real one room (about $60 to 80M of cap room a year in the later seasons and 5 to 9 players of 70 or more in the free agent pool, the best 84, asking $38M).
Two stuck states were found with it, both the bot's (the league list with the GM's team last), and a game crash by a GM who sets more than eight players to DNP (`plan()` now keeps five on the floor, and the hurt play when fewer than five are fit; `05-lineup.mjs` checks both).
**Not built from the outline** (section 7 to 10): the three difficulty settings, the quick start, mood and playing time in a player's ask, awards (MVP, rookie of the year) in the legacy score, scouting reveals that change with time, draft picks as assets in a trade, the computer's own trade proposals, the SELECT side menus and the sort by columns. The spec keeps them above as the next ideas.
**Released:** `node tools/release.js franchise --keep-label` (the label is the logo over a game night, made from two screenshots; the PNG cart is 66.9 KB of the 147 KB payload), the Library entry and the README row.

## 16. Open questions

- The **length of a season** (58 games here: every team twice) against a real 82; a shorter season is faster to play, a longer one more real.
- **Two-way depth**: whether to add player **traits** (a sharpshooter, a rim protector) beyond the six ratings, for variety.
- **Real names**: fictional teams and generated players are the plan; no real franchise, league or player name goes in.
- **More than one base league**: one table of 7 KB plus the seed's jitter is the plan; two or three base leagues (different eras of talent) would cost only 7 KB each if the jitter proves too samey.
- **Game night speed**: a live game takes about 40 seconds at the fastest pace of the play-by-play (skippable); is that right?
- **The code budget**: 59.5 KB of 64 KB after step 7 (the size pass, `"mangle": true`, took the code from 60.7 to 55.3 KB before the trades): 4.5 KB left for the art and the polish. Before that: 48 KB after step 4. If steps 5 to 7 do not fit, the first things to trim are the offseason report's rows, the card's chart and the SHORT phrase table; a second table in ROM (text) does not count against the code.
