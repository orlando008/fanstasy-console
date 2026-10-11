# Summit Rush: Cart Specification

**Version:** 0.1 (draft)
**Status:** In progress: stage 1 with all seven models and the select screen
**Cart source:** `carts/src/summit-rush/` → `carts/summit-rush.nova`

---

## 1. Concept

Pick an AI model and climb a mountain. The screen scrolls upward while you
steer around it, grabbing compute (electricity, GPU, CPU and RAM chips) and
dodging the things that slow AI down (protesters, regulation books, red
tape). Each stage is a round scored on how full your four resource buckets
are at its end. You play alone; the other six models' runs are simulated, and
after every round a scoreboard shows where you stand.

- **Genre:** vertical-scrolling dodge-and-collect score attack.
- **Run length:** about 90 seconds, in three rounds (stages).
- **Players:** 1, against six simulated models on the scoreboard.
- **Tone:** light satire. Obstacles carry jokes; no model or person is mocked.

## 2. Core loop

1. **Select** one of seven models on the title screen. Each has a stat profile and a special ability.
2. **Round:** climb one stage of auto-scrolling mountain. Steer to collect chips and avoid obstacles; the buckets you fill make you better at both.
3. **Tally:** your buckets are scored against tier thresholds, then the **scoreboard** shows every model's round score and running total, ranked.
4. Repeat for stages 2 and 3. Buckets start fresh each round from your model's starting values.
5. **Final standings:** your place among the seven, your total on the leaderboard, initials, then try again or pick another model.

## 3. Controls

| Button | Action |
|---|---|
| LEFT / RIGHT | Move left and right within the track walls |
| UP / DOWN | Move up and down the screen (between y 40 and 200) |
| B | Special ability (per model, see 6.2) |
| START | Pause |
| SELECT | (Title) toggle music |

## 4. The four buckets

Each bucket holds 0–100 and does two jobs: it is a **score resource** at the
end of the round, and it **powers your racer** the way that component powers a
computer. Every effect makes collecting easier, so a good start snowballs; each
round resets the buckets to the model's starting values.

| Bucket | Chip | Color | Effect during the race |
|---|---|---|---|
| ⚡ Electricity | Lightning bolt | Yellow | **Power:** movement speed in all four directions, from 1.4 px/frame at 0 to 2.6 at 100 (times the model's handling). |
| 🎮 GPU | Green chip | Green | **Vision:** reveals bonus chips of the other three types ahead, one every 400 − 3 × GPU px of climb (every ~5 s at the start, ~2 s at 80). |
| 🧠 CPU | Blue chip | Blue | **Reach:** pickup radius; chips within 2 + 0.16 px per point (up to 18 px) of the racer are pulled in. |
| 💾 RAM | Purple stick | Purple | **Memory:** the cap of the other three buckets is 60 + 0.4 × RAM (66 with 15 RAM, 80 with 50, 100 with 100). RAM's own cap is 100. |

- Each chip pickup adds **+5** to its bucket. A rare **Golden Wafer** adds +5 to all four.
- A pickup above the bucket's cap is wasted ("FULL"). When RAM drops, any bucket above the new cap is cut down to it ("OUT OF MEMORY"), so RAM hits hurt twice.
- Reaching Gold (80) in Electricity, GPU or CPU needs RAM 50 or more first: RAM is the gate, so what you grab first matters.
- Each stage places about 20 chips per bucket (plus GPU's bonus chips and a few Golden Wafers). Chip lines go to whichever bucket has had the fewest chips so far, and each eleven stretches of course deal a fixed shuffled mix: 5 chip lines of 4, 1 protester group, 1 red tape with a bait chip, 1 pair of price tags, 1 or 2 stacks of law books, 1 pair of chips on opposite sides, 1 Golden Wafer.
- There is no shield and no button that spends a bucket: protection is dodging, which Electricity and CPU make easier, and each model's special.

### 4.1 Tier thresholds

| Tier | Threshold | Bonus per bucket |
|---|---|---|
| Bronze | 25 | +250 |
| Silver | 50 | +750 |
| Gold | 80 | +2000 |

Gold sits at 80, not 100, so it is reachable with good play without being automatic.

## 5. Scoring and results

At the end of each round (stage):

```
base     = (ELEC + GPU + CPU + RAM) × 10          // max 4000
tiers    = sum of the highest tier bonus reached per bucket
round    = (base + tiers) × multiplier
total    = round 1 + round 2 + round 3
```

- **Multiplier:** ×1.0 by default, ×1.5 if **all four buckets reach Gold**. That is the "AGI Achieved" summit bonus, with its own fanfare and screen.
- With all four at Silver or better, the result screen says "Generalist"; with one bucket at Gold and the rest below Bronze, it says "Specialist" (flavor only).
- **Neither time nor speed scores.** Course length and scroll speed bound a round to roughly 25–40 s, so a time bonus barely separated runs and double-counted GPU. Your **place** is an outcome, not an input: it's where your total lands on the scoreboard.
- A round score runs from about 1,000 (empty-ish buckets) to 16,800 (all four at 100, all Gold).

### 5.1 Simulated models

The six models you aren't playing don't appear on the course. After each round, each gets a round score simulated from its profile: every bucket's final value is drawn as `clamp(mean + spread × noise, 0, 100)` (noise roughly normal, from the per-run random seed), then scored with the same formula, including the all-Gold multiplier. Profiles give each model a consistent character while scores vary a little from run to run:

| Model | Mean ELEC/GPU/CPU/RAM | Spread | Character |
|---|---|---|---|
| Claude | 55 / 55 / 65 / 65 | 10 | Careful, few hits |
| GPT | 60 / 65 / 55 / 50 | 12 | Strong all-rounder |
| Gemini | 55 / 60 / 60 / 60 | 10 | Balanced |
| Grok | 55 / 70 / 45 / 35 | 25 | Wild: sometimes tops the board, sometimes last |
| DeepSeek | 65 / 50 / 65 / 45 | 12 | Efficient, high Electricity |
| GLM | 55 / 55 / 55 / 55 | 6 | Steady, rarely surprises |
| Kimi | 45 / 45 / 55 / 75 | 10 | Hoards RAM |

These put a typical simulated round around 4,500–6,000, so a solid run lands mid-table, a strong one wins, and an all-Gold round (×1.5) is a near-certain 1st.

## 6. The models

### 6.1 Roster

Real model names, used affectionately. The stat profiles are game balance
choices, not claims about the real systems. Seven racers:

| Model | Start ELEC/GPU/CPU/RAM | Handling | Special (B) |
|---|---|---|---|
| Claude | 10 / 10 / 15 / 15 | ★★★★ | **Constitution:** 3 s of immunity to protesters |
| GPT | 15 / 15 / 10 / 10 | ★★★ | **Scale Up:** doubles the next 5 chip pickups |
| Gemini | 10 / 15 / 10 / 15 | ★★★ | **Multimodal:** pickup radius of 40 px for 4 s |
| Grok | 20 / 10 / 10 / 5 | ★★ | **Unfiltered:** smash through obstacles unharmed for 3 s |
| DeepSeek | 5 / 10 / 15 / 10 | ★★★ | **Efficiency:** movement at full Electricity speed (2.6 px/frame) for 5 s |
| GLM | 10 / 10 / 10 / 10 | ★★★★★ | **Agent Mode:** auto-steers toward the nearest chips for 3 s |
| Kimi | 10 / 5 / 10 / 20 | ★★★★ | **Long Context:** caps rise to 100 and RAM can't be lost, for 5 s |

- **Specials** charge once per round: they're available at the start of each stage and used up on activation.
- **Handling** scales top speed: ★★ ×0.9, ★★★ ×1.0, ★★★★ ×1.1, ★★★★★ ×1.2, on top of the Electricity speed.
- **How the specials play:**
  - A timed special draws a ring around the racer and shows its HUD tag (IMMUNE, MAGNET, SMASH, MAX SPD, AGENT, CAP 100). Scale Up shows `X2 *n` until its five doubled chips are used.
  - Multimodal's ring is drawn at the 40 px pickup radius.
  - Unfiltered destroys each obstacle it touches, with no cost or knockback.
  - Agent Mode replaces your steering. It heads for the nearest chip on screen that still has room in its bucket, and veers away from hazards that get close.
  - Long Context: a RAM hit while it runs costs nothing ("RAM SAFE"). When it ends, buckets keep what they gained above the cap, but can't grow further until RAM raises the cap again. A later RAM loss clips them as usual.
- Each model has a 16×16 racer sprite (two-frame climb animation, lean left/right frames) and a portrait for the select screen.
  - **Placeholder art:** all seven share one racer sprite and one 32×32 portrait, tinted per model.
  - The tint goes into a copy of sprite palette 0: color 9 is the body and color 4 the shade.
  - Model colors: Claude clay, GPT white, Gemini violet, Grok charcoal, DeepSeek blue, GLM cyan, Kimi moon yellow.
  - In the race, the chosen model's tint lives in sprite palette 2. On the select screen, palettes 1–7 hold one tint per portrait.
- The other six models never appear on the course; their rounds are simulated (5.1).

## 7. Course

### 7.1 Stages

| Stage | Name | Length | Scroll speed | Theme |
|---|---|---|---|---|
| 1 | Base Camp | ~30 s | 1.0× | Green foothills, server racks as scenery |
| 2 | The Treeline | ~30 s | 1.2× | Pines, switchback walls, narrower course |
| 3 | The Summit | ~30 s | 1.4× | Snow and ice (lower traction), wind gusts |

The racer moves freely around the screen while the course scrolls at the
stage's speed. Protesters slow the scroll for a moment; every hit knocks the
racer 16 px down the screen. There is no fall-off penalty.

### 7.2 Layout

- The playfield is the full 256×224 screen with a HUD strip at the top (see 9).
- The course is bounded by **walls** (BG0 tiles) whose positions vary per row. The course narrows from ~200 px in stage 1 to ~140 px in stage 3.
- Map RAM is only 128 rows tall, so a stage (~320 rows) is streamed: BG0 views a wrapping 32×64-tile window, and rows are written with `mset` just before they scroll into view. Layout is fixed so runs are comparable on the leaderboard: the course shape comes from a per-stage function and pickup and obstacle placement from a fixed-seed generator, so every run of a stage is identical.

| Layer | Use |
|---|---|
| BG0 | Course: walls and track surface, high-priority tree tops over racers |
| BG1 | Mid-ground mountain scenery, scrolls at 0.5× |
| BG2 | Sky and distant peaks, 0.25×. Title screen uses BG2 affine for a spinning-mountain logo. |
| Sprites | Racers, chips, obstacles, effects |
| Overlay | HUD, countdown, popups (+5 GPU) |

## 8. Obstacles

Each obstacle takes from one bucket, so a hit always reads as a specific loss.

| Obstacle | Size | Behavior | Hit cost |
|---|---|---|---|
| Protesters with signs | 16×16 | Walk across the track in groups of 2–4; signs carry short jokes ("PAUSE AI", "TOUCH GRASS", "MY JOB!") | −10 GPU, and the scroll slows to half for 1 s |
| Red tape | 32×8 | Strips across part of the track, with a chip as bait | −10 Electricity |
| High prices | 16×16 | Price tags hanging over the track, in pairs | −10 RAM, then other buckets are cut to the new cap |
| Legislation | 16×16 | Stacks of law books, one or two at a time | −10 CPU |
| Ice patch (stage 3) | 32×16 | Low traction | Drift; no bucket cost |
| Wind gust (stage 3) | — | Pushes the racer sideways for 1 s; arrows warn first | — |

- A hit knocks the racer 16 px down the screen and gives 1 s of invulnerability, shown as sprite flicker.
- **Hazards must read as bad at a glance.** Every hazard has a red outline that pulses about twice a second. It is color 7 of its own sprite palette (palette 1, a copy of palette 0), so a single CGRAM write animates every hazard. Hazards that don't walk also jitter by ±1 px, while pickups bob smoothly. The rule is: red and shaking means avoid it, smooth bobbing means grab it. Each hazard group also gets a blinking white "!" on a tag in the same pulsing red as it scrolls in. The tag disappears once the hazard is past the upper half of the screen, where it is close enough to read on its own.

## 9. HUD

Top 16 px of the overlay:

```
[⚡▮▮▮▯] [🎮▮▮▯▯] [🧠▮▮▮▮] [💾▮▯▯▯]   STAGE 2   3rd   67%
```

- Each bucket is a 40 px bar with tick marks at 25/50/80; the bar color changes when it crosses a tier. A red marker shows the cap RAM currently allows.
- Pickup popups (`+5 GPU`) float up from the racer for 30 frames.
- The special ability shows an icon that lights up when ready.
- The right side shows progress up the mountain (percent of the climb) rather than a clock.

## 10. Screens and flow

1. **Title:** spinning mountain logo (BG2 affine), "PRESS START", top score.
2. **Model select:** seven portraits in a row; LEFT/RIGHT to choose, START (or A) to climb. The chosen model shows its name in its color, handling stars, starting buckets as bars, its special with a two-line description, and its best score. The last model picked is remembered. After the scoreboard, START races again with the same model and B returns here.
3. **Stage intro:** stage name card, 3-2-1-GO countdown.
4. **Race:** three stages with a short stage card between them (buckets carry over).
5. **Round tally:** the bucket tally animating into tier medals and the round score. If all four buckets reach Gold: "AGI ACHIEVED" with fanfare.
6. **Scoreboard:** all seven models ranked by running total, with each one's round score; your row highlighted and an arrow showing places gained or lost this round.
7. After round 3, **final standings**: your place of seven.
8. **Initials entry** if the total makes the top 10.
9. **Leaderboard:** overall top 10, with a tab per model (LEFT/RIGHT).

## 11. Audio

**Songs** (Music tab):

| Song | Use | Feel |
|---|---|---|
| 0 | Title / select | Upbeat, 120 bpm |
| 1 | Stage 1 | Driving, pulse lead |
| 2 | Stage 2 | Faster variant |
| 3 | Stage 3 | Tense, minor, 150 bpm |
| 4 | Summit / AGI fanfare | Short, non-looping |

**SFX** (one each): chip pickup per bucket (4, rising pitches), Golden Wafer, bucket full, out of memory, hit (one per obstacle), special activate, countdown beep, GO, tier-up chime, menu move, menu select. Protester chant: a noise-channel rhythm, if it fits.

## 12. Persistence (save slots)

| Slots | Contents |
|---|---|
| 0 | Format version |
| 1–2 | Options: music on/off (1), last selected model (2) |
| 10–109 | Overall top 10: per entry total, final place, the three round scores, model, initials (packed 3×8 bits), 3 reserved = 10 slots |
| 110–179 | Best score per model (7 × 10 slots, same layout) |
| 180–255 | Reserved |

## 13. Asset budget

| Asset | Budget |
|---|---|
| Code | ≤ 40 KB of the 64 KB limit |
| Tiles | ≤ 600 of 1024: course ~150, scenery ~200, sprites ~200, title/logo ~50 |
| Map RAM | 3 stages × 32×200 tiles, plus scenery strips |
| Sprites on screen | ≤ 60 typical, ≤ 32 per line (pickups and protesters are laid out to stay under the limit) |
| Palettes | BG 0–2 course/scenery per stage, BG 3 snow; sprites: 8 sprite palettes shared by 7 racers, pickups/obstacles and effects (racers share palettes where colors allow) |
| Songs / SFX | 5 songs (~16 patterns total), ~18 SFX |
| PNG cart | Must fit the 147 KB `.nova.png` limit |

## 14. Implementation plan

1. **Vertical slice:** stage 1 only with one model (Claude), placeholder art, the four buckets and HUD, two obstacle types, the round tally and the scoreboard with simulated models. Proves the feel.
2. **Models:** all seven playable, with specials and the select screen.
3. **Stages 2 and 3:** narrowing course, ice and wind, scroll speeds.
4. **Flow:** title, select, stage cards, summit tally, AGI screen, leaderboard with initials and saves.
5. **Art pass:** final sprites, tiles and palettes, all made in the Sprites, Map and Palette tabs.
6. **Audio pass:** songs and SFX in the Music and SFX tabs.
7. **Balance and polish:** tune thresholds so Gold in all four is hard but possible; record replays of good runs (F9/F10); capture a label (F7); export a PNG cart.

Any console bugs or editor gaps found along the way are logged and fixed as separate changes.

## 15. Open questions

- **Balance:** the simulated profiles (5.1) set how hard 1st place is; tune them against real play. Also whether the ×1.5 all-Gold multiplier makes an all-Gold round an automatic win.
- **Real-name sensitivity:** if the cart is ever shared publicly, decide whether to keep real model names or swap to parodies.
