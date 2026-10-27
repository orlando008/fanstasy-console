# Making a cart: the playbook

For agents (and people) building games for the NOVA-16 fantasy console. It collects what the first
seven games taught us, so the next one starts from a working kit instead of rebuilding it.
The console's own rules are in `docs/SPEC.md`; each game's design is in `docs/carts/<name>.md`.
`node tools/check-docs.js` keeps every file and tool flag this document mentions real: if you move a tool, fix the docs.

## Quick start

```sh
node tools/new-cart.js my-game "My Game"      # a working cart, art and audio scripts, tests and spec template
# for a puzzle game, start from a whole match-3 game instead:  node tools/new-cart.js my-game "My Game" --kind puzzle
# write docs/carts/my-game.md, then replace updatePlay/drawPlay in carts/src/my-game/code.js, and the art in art.py
# set the genre and players in carts/src/my-game/meta.json: the Library's shelf (one of src/genres.js) and its badge ("1", "1-4")
node tools/pack.js carts/src/my-game carts/my-game.nova
node tools/verify.js --fast                   # audio and art scripts, pack, checks, soak, music levels (add the tests: leave out --fast)
node tools/devkit/smoke.mjs my-game           # the real console, headless
node tools/devkit/sweep.mjs my-game           # the bot over many seeds (once tests/carts/my-game/bot.mjs is real)
node tools/release.js my-game                 # when finished: label, .nova.png, Library, README row
```

## Where things live

| Path | What |
|---|---|
| `carts/src/<name>/` | A cart's source: `code.js`, `meta.json`, `tiles.txt`, `palette.txt`, `map.txt` and `art.json` (made by `art.py`), `audio.json` (made by `audio.py`), `label.png`, `rom/<name>.bin` (the cart's ROM: 128 KB of data read with `rom(name)`; SPEC 9.1) |
| `carts/<name>.nova`, `.nova.png`, `labels/`, `index.json` | What `pack.js`, `release.js` and `library.js` build from the source: commit them with it |
| `tests/carts/<name>/` | `lib.mjs` (boots the cart with its variables exposed), `NN-*.mjs` (check scripts, one per build step), `bot.mjs` (the bot for `sweep.mjs`) |
| `tests/console/` | Checks of the console itself: the player's volume keys, the pause menu and ways back to the Library, the Library's genre shelves, the touch controls, the site offline and installable, sharing a cart's link and the prompt for making a game with AI (`volume.mjs`, `menu.mjs`, `library.mjs`, `touch.mjs`, `offline.mjs`, `share.mjs`, `make.mjs`: headless Chromium), a song that plays once falling silent at its end (`song-end.mjs`, in CI); not part of a cart build |
| `docs/carts/<name>.md` | The game's spec, with each step's **Built** and **Results** notes |
| `tools/` | `pack`, `library`, `new-cart`, `verify`, `check`, `test`, `release`, `check-docs` (section 2) |
| `tools/devkit/` | The headless harness, soak, smoke, sweep, shots, tiles, voices, the random player; `music/`: the song toolkit, loudness checks, effect levels and lead lowering; `art/`: the art toolkit and the scene and sprite viewers |
| `tools/templates/cart/` | The starter's files |
| `tools/templates/kinds/<kind>/` | A whole game for a kind of game (`--kind`) |
| `CLAUDE.md`, `docs/dev/playbook.md` | Notes for agents (short) and this guide |

## 1. The shape of a game build

0. **Start from the starter**: `node tools/new-cart.js <name> "Title"` creates the cart, its tests, its art and audio scripts and
   the spec template (section 2). Do not copy another game's code to begin with. If the game is of a kind that has a
   starter (`--kind`, below), start from that: it is a whole small game of that type, to change into yours.
1. **Write the spec first** (`docs/carts/<name>.md`, scaffolded): concept, controls (playable on the d-pad, A, B, Start
   and Select, the buttons a phone's touch controls have; X, Y, L and R only for extras), screen layout, the rules with
   numbers, scoring, screens and flow, audio, video layers, save slots, asset budget, and a numbered
   **implementation plan** of about 8 steps. Ask the user the few design questions that really change the
   game (modes, number of levels, features); choose sensible defaults for the rest.
2. **Build one step at a time.** The user says "go ahead" for each. A typical plan: 1 vertical slice,
   2 the core mechanics, 3 opponents or enemies, 4 content (levels, tracks), 5 the flow (title, menus,
   modes, saves), 6 art, 7 audio, 8 balance, polish, label, PNG cart, Library entry, README.
3. **A step is done when**: its checks pass (`node tools/verify.js`, then `smoke.mjs`; `sweep.mjs` after changes to
   the rules or the AI), the step's **Built** and **Results** notes are in the spec (the spec is the memory that
   survives a long session), and it is committed and pushed to the branch. Do not open a pull request until
   the user asks, and do not merge until the user says "merge it in".
4. **The spec and the code stay in step.** When a number changes (a speed, a par time, a rating), change
   the spec's table in the same commit.
5. **Context runs out in long builds.** Keep the spec current, keep scripts in the repo (not in a scratch
   directory), and write test files as you go: that is what a resumed session reads to pick up.

## 2. The kit

**Build and verify**

| Command | What it does |
|---|---|
| `node tools/new-cart.js <name> "Title"` | **Start a new cart**: a working frame (title, play, pause, game over, saved top 10 with initials, records, sound and music cues, `skipTitle`), an art script (a gradient sky, receded hills, a ground, a ship and a gem, in ramps, with see-through panels: the SNES look from the start), an audio script, tests, a bot and a spec template with the plan. Replace the placeholder game in `updatePlay`/`drawPlay`. `--kind puzzle` starts from a whole match-3 game instead (see "Starters by kind"). `--selftest` checks every starter (CI does) |
| `node tools/pack.js carts/src/<name> carts/<name>.nova` | Build the cart from its source folder |
| `node tools/unpack.js <cart.nova> carts/src/<name>` | The reverse, for a cart made elsewhere (the console's editors, a friend) that is to join the Library: writes its source folder and checks it packs back to the same cart. Then add the `genre` and `players` to its `meta.json`, write its spec and release it (Operation Ironstorm came in this way) |
| `node tools/verify.js [name...]` | **Verify what you changed, in one command** (the carts changed since `origin/main`, or the ones you name, or `--all`): `audio.py` regenerates `audio.json`, the source packs to the committed `.nova`, `check.js`, a soak run, the music levels (`loud.mjs --check`), the docs check, and the cart's tests (`--fast` skips them). CI runs it on pull requests |
| `node tools/check.js <name>` / `--all` | Code size against 64 KB, syntax, audio limits, instrument/channel mismatches, PNG fit, **the `.nova.png` decoding to exactly the packed cart** (no browser), the spec (header, TODOs in a released cart, code size in the budget table), label and description, and a `genre` and `players` in `meta.json` (the Library's shelf, one of `src/genres.js`, and the badge on the cartridge) that `carts/index.json` matches |
| `node tools/test.js <name> [filter] [-v]` | Run `tests/carts/<name>/NN-*.mjs` one at a time (about 3 minutes for Moto Crosser: run it in the background) |
| `node tools/site.js check` | The hosted site (GitHub Pages, `.github/workflows/pages.yml`): builds it as it is published (`index.html`, `style.css`, `src/`, `carts/` without the sources, the manifest and icons, and `sw.js` with the offline copy's list of files), lays it out as the gh-pages branch (main at the root, previews in `pr/<n>/`), publishes it through git to a throwaway remote, and loads the main site and a preview in headless Chromium under a subpath: the Library, the labels, a cart running, the preview's own saves, no errors; and that the offline copy holds every cart and label and the icons are up to date. Run it after changing what the site loads, and `tests/console/offline.mjs` after changing `sw.js` |
| `node tools/check-docs.js` | Every `tools/`, `tests/`, `carts/`, `docs/` and `src/` path the documentation mentions must exist (placeholders like `<name>` are skipped), and every `--flag` on a documented `node tools/...` command must exist in that tool |

**Play it, automatically**

| Command | What it does |
|---|---|
| `node tools/devkit/soak.mjs carts/<name>.nova [--frames 20000] [--seeds 3]` | **Soak test**: random play in the harness for a long time. Fails on an exception, an effect on the wrong voice's channel, or a frozen screen (a soft lock, with the state named); reports frame times, sprites (OAM and per scanline), the states reached and the effects and songs never played. `--all` does every cart (CI) |
| `node tools/devkit/sweep.mjs <name> --seeds 8 --set skill=0.9,1` | **Run the cart's bot** (`tests/carts/<name>/bot.mjs`) over many seeds and variants and summarise (win rates, times, crashes); fails on an exception, a frozen screen, a run that never finishes, or a problem the bot reports (a rival stuck). How balance is checked |
| `node tools/devkit/smoke.mjs <name> [--seconds 12] [--shot f.png]` | **Smoke test in the real console** (headless Chromium): loads the cart, plays with random keys, and reports page and console errors, the cart's logged errors (a cart that throws is stopped), fps, and a frozen or blank screen. Catches what the Node harness cannot |
| `tools/devkit/harness.mjs` | The headless console for tests (see its header comment); `pad.mjs` is the random player |

**Make and see the art** (`tools/devkit/art/`; section 6)

| Command | What it does |
|---|---|
| `python3 carts/src/<name>/art.py carts/src/<name>` | Regenerate the cart's `tiles.txt`, `palette.txt`, `map.txt`, `art.json` and the `ART` block of its `code.js` from its art script, written with the toolkit in `tools/devkit/art/kit.py` (its header lists what it checks) |
| `node tools/devkit/art/sprites.mjs carts/<name>.nova out.png [--names a,b]` | The cart's sprites (from `art.json`) at their real sizes in their sprite palettes, with names, scaled up, and its big sprites assembled from their parts; or one with `--tile n --size 16 --pal 0` (open the PNG with the Read tool). `--ascii hero` prints a sprite as text instead: a letter for each role, x and y rulers, and a `key={...}` for `Img.from_rows` (`--ascii --tile n --size s` prints hex indices, no manifest needed) |
| `node tools/devkit/art/scene.mjs carts/<name>.nova out.png --scene field [--holes]` | A Map RAM region as the map places it (palettes, flips); `--rect x,y,w,h` for any region; `--holes` paints empty cells magenta |
| `node tools/devkit/tiles.mjs carts/<name>.nova out.png --from 640 --count 64 --pal 0 [--sprite] [--skip-empty]` | A contact sheet of tiles with their numbers in a palette. `--ascii <n>` prints one tile as `tiles.txt` rows; `--palette out.png` shows all 256 entries |
| `node tools/devkit/art/snes.mjs carts/<name>.nova` | **Does it look like a SNES game?** Plays the cart and scores its screens 0 to 100 (shades per colour, colours, sprite size, layers, parallax, a gradient sky, effects), each low measure with what to do about it in the kit; `--all` ranks every cart. Information, not a gate: calibrated so Operation Ironstorm scores 62 and Summit Rush 13 |
| `node tools/devkit/art/colors.mjs carts/<name>.nova [--png out.png] [--check]` | How the colours read: plays the cart with random buttons and measures its screens in OKLab. Muddy panels (dull brown or grey on overlay panels; limit 0.3), palette ramps out of order (`art.json`), and as information mud, contrast, faint edges and the overlay's default colours; `--png` marks mud magenta and faint edges cyan (in the PNG only); `--extra "src"` as in `shots.mjs` |
| `node tools/devkit/shots.mjs carts/<name>.nova out/ --at 60,300` | Screenshots from the command line (`--hold A:100-400` to press buttons, `--extra "skipTitle = true;"`) |
| `node tools/devkit/gif.mjs carts/<name>.nova out.gif --from 60 --to 240` | An animated GIF of the cart (`--hold`, `--crop x,y,w,h`, `--every 2`): to show a person an animation you cannot watch |
| `python3 tools/devkit/art/selftest.py` | The kit's own checks (CI runs it) |

**Hear it** (measure it: you cannot listen)

| Command | What it does |
|---|---|
| `python3 carts/src/<name>/audio.py carts/src/<name>/audio.json` | Regenerate a game's audio from its script, with the song toolkit in `tools/devkit/music/kit.py` (its header explains `bar()`) |
| `node tools/devkit/music/loud.mjs carts/<name>.nova [--check]` | Per-section loudness of every song, surges, peak, and **the lead alone**: its RMS, its share of the mix, how much the mix jumps when it enters, and how much it pierces (2 to 5 kHz). `--check` fails on the limits in section 5 (`verify.js` runs it) |
| `node tools/devkit/music/render.mjs carts/<name>.nova out/` | WAV files of the songs, with level and clipping |
| `node tools/devkit/music/sfx.mjs carts/<name>.nova <channel> [n...]` | Length, level (both sides together, so a channel's pan does not change it) and pitch (centroid) of effects, on the channel the game uses |
| `python3 tools/devkit/music/clash.py carts/src/<name>/audio.json` | Lead against bass and chords on the beat (drums left out) |
| `python3 tools/devkit/music/script.py carts/src/<name>/audio.json carts/src/<name>/audio.py` | An audio script, with every pattern and effect as tracker text, for a game that has only an `audio.json`; it packs to the same cart |
| `node tools/devkit/music/compat.mjs [carts/<name>.nova...] [--converted]` | Carts in the old format (version 1) played on the frozen old chip (`tests/audio/legacy-synth.js`) and on the console's: they must give the same samples. `--converted` converts them to the new chip first (interpolation off) and checks the same. Run it, and `node tests/audio/chip.mjs`, after any change to `src/audio/` or `src/formats/audio.js` (CI does). See `docs/dev/sound-chip.md` |
| `node tools/devkit/voices.mjs carts/<name>.nova [frames] [seed]` | Just the wrong-voice check (soak does this too) |

**Release**

| Command | What it does |
|---|---|
| `node tools/release.js <name> [--keep-label]` | Pack, capture the F7 label in headless Chromium, export `.nova.png`, verify it decodes to the packed cart, rebuild the Library index, run the checks |
| `node tools/library.js` | Rebuild `carts/index.json` and `carts/labels/` (release.js does it): the carts in the order of the Library's shelves, with each one's genre and players from its `meta.json` |

The starter's template is `tools/templates/cart/` (`code.js` is the frame to build on; its `01-flow.mjs` is the
first test file and its `bot.mjs` the first bot).

**Starters by kind.** `node tools/new-cart.js <name> "Title" --kind <kind>` scaffolds a whole small game of that type on
the same frame, with its own art, sound, rules tests, bot and spec; any file a kind does not have comes from the generic
starter. Its files are in `tools/templates/kinds/<kind>/`. Change it into your game (the spec says where), keep the
tests green as you go, and delete what you do not use. The kinds so far:

| Kind | The game | What it gives you |
| --- | --- | --- |
| `puzzle` | A match-3 board (8 × 8, six gems, swap two neighbours, runs of three or more pop, the gems above fall, chains) with moves, a goal and levels | The board rules as pure functions (`findRuns`, `matched`, `swapped`, `hasMoves`) with tests; a cursor, pick-and-push input; pop, fall and chain scoring; a stuck board dealt again; six gems in six shapes and palettes; sound for every action; a bot (`skill`) whose sweep tunes the goals | Examples of a full build: `tests/carts/moto-crosser/` (seven
suites, a `lib.mjs` and a bot) and `carts/src/moto-crosser/audio.py` (songs and effects with the kit).

**CI** (`.github/workflows/check.yml`): syntax of `src/`, `tools/` and `tests/`; the docs check; `check.js --all`; the
starter's self-test; `soak.mjs --all`; and, on pull requests, `verify.js` for the carts the PR changes. The smoke
test is not in CI (it needs Playwright and Chromium). On CI the tests' frame-time limits are 3 times looser.

## 3. Limits and rules of the console

- **Code** 64 KB (65,536 UTF-8 bytes). A cart whose `meta.json` says `"strip": true` is packed **without its comments, blank lines and indentation**
  (`tools/devkit/strip.mjs`): write the reasons in the source as you like, and the shipped cart does not pay for them (Streets of Woe's
  source is 80 KB, its cart 60 KB). It is the first thing to try when a game nears the limit; the second is `"mangle": true` next to it (`tools/devkit/mangle.mjs`), which renames the functions, consts and lets the code declares at its top level to `$a`, `$b`... (properties, strings, the console's own names and the hooks stay; The Franchise gets 9 % back, 60.7 KB to 55.3 KB). The cart's tests then read its variables through `rename(text, map)` of that tool (see `tests/carts/franchise/lib.mjs`), and `state` and `skipTitle` keep their names for the dev tools. After it, the console's own `clamp`, `abs` and `sgn` are shorter than the `Math` forms, and a short name for a call you make a hundred times (`const rf = rectfill`) is worth its bytes. Moto Crosser is at 93%. Tables of level data are the big spender: keep
  them compact (`[kind, lane, x]` arrays), generate repetitive tiles in code rather than data, and measure with
  `node tools/check.js <name>` as you go, not at the end.
- **Screen** 256 x 224; BG0 front, BG1 middle, BG2 back; sprites 8, 16 or 32 px, **128 in OAM, 32 per scanline**
  (more are dropped: particles and crowds are what hit it, so cap them); Map RAM 256 x 128; tile sheet 128 x 512
  (1,024 tiles). Palettes: BG palette p is entries 16p+k, sprite palette p is 128+16p+k; the overlay colours
  come from a BG palette (Moto Crosser keeps them at 113 and up).
- **Save** 256 int32 slots (`dget`/`dset`). Slot 0 holds a format version.
- **Audio** 8 channels (the instrument decides the voice), 32 instruments, 64 patterns of 64 rows, 8 songs, 64 SFX of
  up to 32 rows, 32 samples in 32 KB of Sample RAM (8-bit PCM), an echo unit (SPEC 5). Games not converted yet are carts
  for the old chip (format version 1: 6 channels, the channel decides the voice, 16 KB; section 5). A PNG cart holds a payload of 147,443 bytes (the check reports it).
- **Determinism**: use the console's `rndi` and seed for everything that matters, so a test and a replay see the
  same game (the harness seeds it from `boot(..., { seed })`).

## 4. Writing carts so they can be tested

The cart's code runs in one scope. A test appends source to it (`extra`) and `__expose`s what it needs:

```js
// tests/carts/<name>/lib.mjs
const PROBE = `__expose(() => ({ get state() { return state; }, get riders() { return riders; }, ... }));`;
export const newGame = (seed) => boot(CART, { seed, extra: 'skipTitle = true;' + PROBE });
```

Build the cart with these in mind from the start:
- a **`skipTitle`** variable that `init` checks, so a test lands in the game;
- one **state variable** and one function per state (`updateTitle`, `updateRace`...), driven by `update()`;
- a **pause** that stops the world but not the audio command stream, and a **restart** that keeps the seed;
- **an automatic player**, in `tests/carts/<name>/bot.mjs` (the starter has one; Moto Crosser's drives the rivals' AI
  for the player): it drives the same code as a rival or a player, so a whole run is played by `sweep.mjs` over
  many seeds. It finds stuck states, balance problems and crashes that no hand-written test would. The Moto
  Crosser bot found a rider that sat on a bump for ever (it could not climb a steep slope from a standstill: the
  same thing could have happened to a player). Give the bot a skill option and sweep it (`--set skill=0.9,1`):
  a perfect run should win most races and a player 5% off the pace should place mid-field, not last.
  **Balance by measuring, not guessing** (Ice Breakers' twelve levels, `tests/carts/ice-breakers/bot.mjs`): let the bot play
  one level at a time (`--set level=N`), give it more moves than the level has (`--set moves=40`) and read how many it
  `used`: that is the level's cost. Set the level's budget to the cost plus about 4.5 (scores vary by 3 or 4 moves from game
  to game), then check the win rate over 40 seeds. A bot that loses with moves to spare is a weak bot, not a hard level:
  make it chase the goal harder before changing the level. If one feature (a corner of ice that only three clears can reach)
  decides a level, it is luck, not difficulty; take it out.


Checks that proved their worth (the test files in `tests/carts/moto-crosser/` are the examples):
- one `PASS`/`FAIL` line per behaviour, written as a sentence a designer would say ("a crash has its sound");
- **numbers from the spec** asserted in the test (speeds, costs, scores), so a spec change is a visible failure;
- **flow checks** that walk the screens in order (title, menu, game, results, back), including quitting from
  the pause menu and a championship forced through with set results;
- **timing** as the 99th percentile of frame time (under 8 ms), not the worst frame (a garbage collection or
  another process spoils one frame); and one suite at a time (`tools/test.js` does this);
- **audio cues** from `vm.audioLog` (which song and which SFX on which channel, when), not by ear;
- **a test that fails without the fix**: after fixing a bug, put the fix back out and check the new test fails.

### Soak and smoke

`node tools/verify.js` runs the checks, the soak and the tests for the carts you changed. Run the soak and the smoke test before you call a step done, and again after the art and audio passes:

- `soak.mjs` is quick (seconds) and runs in CI. A **frozen screen** failure is the generic form of "a rival sat
  on a bump for ever": the random player pressed buttons for 15 s and the picture never changed. Give the cart
  a `state` variable and the failure names the state. The "never played" lists show what random play cannot reach;
  cover those with a test or a bot (a bot is a function that returns the pad each frame: `makePad` in
  `tools/devkit/pad.mjs` is the random one; a game's own auto-player should drive the same code as a human).
- `smoke.mjs` takes about 15 s and needs Playwright with Chromium (not in CI). It is the only check that runs the
  cart in the real worker and page. Use `--keys Enter:300,Enter:300` to get past a title, and `--shot` to look.

## 5. Audio

You cannot hear the result, so measure it, and follow the rules that keep players happy. The console has an SNES-style
sound chip (SPEC 5): 8 channels that play any instrument, sampled instruments read with a soft interpolation, and an echo
unit. Games made before it are carts for the old chip (format version 1) until each is converted
(`docs/dev/sound-chip.md`); the last part of this section is about them.

- **Use the sampled instruments.** `Audio(chip=2)` in `audio.py`, then `a.voice('STR', 'strings', 5, 0.2)` for each
  (`tools/devkit/music/samples.py` lists them: strings, choir, brass, flute, electric piano, bass, pluck, marimba,
  celesta, orchestra hit, tom, clap, crash, with their sizes). Each comes with an envelope that suits it (`curve: 'exp'`,
  so notes die away) and an echo send; change any of them in the call. Pulse, triangle, saw and noise are still there
  for chip-style sounds. Sample RAM is 32 KB: the kit's four drums take 7 KB, strings and choir 3 KB each.
- **Channels by convention**: songs on 0 to 5 (the kit: lead 0, counter-melody 1, bass 2, pad or arpeggio 3, the pad's
  fifth or the hats 4, drums 5; the tempo on row 0 of channel 7), effects on 6 and 7. The starter's `fx(n)` takes turns
  between 6 and 7, so two effects can sound at once and neither cuts into the music. `check.js` warns about an
  `SFX_CH` under 6, and lists the channels each song uses.
- **Echo**: give each song its own (`a.song(key, speed, echo=(delay, feedback, volume, tone))`, SPEC 5.6) and send the
  instruments that should ring into it (`echo=` on the instrument): pads, leads, snare, bells; not the bass or the kick,
  which turn to mud. About (5, 4, 5, 9) is a room; (12, 8, 9, 7) a hall. A cart can change it in code with `echo()`
  (a cave), and `echo(0)` turns it off.
- **No wobbly or loud leads.** Players complained about vibrato, sudden jumps in level and a lead that "blew out my
  ears". Leads have no vibrato and sit at about 0.04 RMS on their own; kick 12, snare 10. `loud.mjs --check`
  turns the complaint into numbers (for songs of 12 s or more): the lead alone at most 0.07 RMS and at most 0.75 of the
  mix, the mix at most 1.5x louder in the section where the lead enters, no section over 1.6x the song's median, the
  loudest 250 ms at most 2.2x the median, the peak at most 0.45, the median level 0.03 to 0.15. Python Pass's first
  version (lead 0.08 to 0.13, 0.8 to 0.9 of the mix, entering up to 2.4x) was what players called blaring; its fixed
  songs are 0.04 to 0.05 and 0.5 to 0.7. On their own at volume 15 the sampled instruments measure about: flute 0.10,
  brass 0.09, strings 0.07, choir and celesta 0.05, bass 0.04 to 0.07, electric piano 0.02 to 0.06 (it decays); so a
  brass lead is about volume 7, a flute 5.
- **No piercing leads.** A lead can be within every level above and still hurt: the Sound Test's first brass (a bright,
  saw-like horn, playing in octave 5) was "a loud blaring sound, it pierces my ear a bit". The ear is most sensitive at
  2 to 5 kHz, and a bright instrument high up puts its harmonics there. `loud.mjs` reports the lead's energy in that band
  as **pierce** and fails a new-chip song over 0.012 (those two songs measured 0.017 and 0.014; the one the user called
  beautiful 0.009; fixed, 0.005 to 0.007). The fixes: write leads in octave 4 (to the 5 at the top of a phrase), not 5
  and 6; and pick a darker instrument (the brass is now a soft horn). Every pulse lead of the old chip is 0.014 to 0.027.
  When a song is close to a limit, render it (`render.mjs`) and send the WAV to the user to listen to. An intro without the pad makes the lead's entrance a jump: start the pad
  (or a counter-melody) before the lead comes in. `clash.py` checks the lead against the bass and the chords.
- **The player can turn the volume down** (`-` and `=`, `M` mutes: a console feature, so no cart code), but do not rely on it:
  keep the levels within the limits above.
- **A held note cannot change pitch** (no API for it). A pitch that follows a value (an engine) is a short loop
  restarted at one of 5 or 6 pitches, changed only after the new pitch has held a few frames.
- **Effect levels**: a song is about 0.06 to 0.08 RMS; effects 0.01 to 0.06; a looping sound 0.02 to 0.03.
  `sfx.mjs` measures them on the right channel.
- **Songs are generated** from a script (`audio.py`, using `kit.py`), which keeps the music in reviewable text
  and makes a change (a quieter lead) a one-line edit. The script must regenerate `audio.json` exactly. A game with
  only an `audio.json` gets a script with `python3 tools/devkit/music/script.py carts/src/<name>/audio.json
  carts/src/<name>/audio.py` (every pattern as tracker text), which packs to the same cart.
- Cues (`play(song)` that does not restart the song already playing; `fx(n)` for effects) belong in one place in
  the code so a test can check them.
- The `sound-test` demo plays every sampled instrument on its own and three songs (`carts/src/sound-test/audio.py`).

**Carts for the old chip (format version 1)**: the `chiptune` demo, and any old cart someone opens. They play as they
always did (SPEC 5.7): six channels whose channel decides the voice (0 and 1 pulse, 2 triangle, 3 saw, 4 noise, 5
sample), so a noise effect sent to a pulse channel sounds like a pulse. `check.js`, `soak.mjs` and `voices.mjs` flag
that on such a cart, and `tools/devkit/music/compat.mjs` proves they still sound as before. To bring one onto the new
chip, convert it (`convertToChip2` in `src/formats/audio.js`), give it an audio script with `script.py`, and re-voice
that (the games were done this way: `docs/dev/sound-chip.md`). The `chiptune` demo is over the loudness limits (a loud
sound test, so `verify.js` only warns for it).

## 6. Art

Write the art as code, in `carts/src/<name>/art.py`, with the toolkit (`tools/devkit/art/kit.py`: read its header). The
starter has a small `art.py` (a gradient sky, hills, a ground, a ship, a gem) to start from. A cart's art script owns `tiles.txt`, `palette.txt`,
`map.txt` and `art.json`, and the `ART` block in `code.js`; `verify.js` fails if they are not what it makes.

```python
art = Art(); art.region('bg', 1, 255); art.region('spr', 256, 1023)
field = art.palette(1, {'dark': '2c5a1e', 'mid': '346524'})          # BG palette 1: roles by name, never bare numbers
ship = art.sprite_palette(0, {'edge': '140c1c', 'hull': '597dce'})
art.sprite('player', Img.from_rows(['.......oo.......', ...], key={'o': ship.edge, 'b': ship.hull}), pal=ship, region='spr')
art.scene('field', Img.make(256, 224, lambda x, y: field.mid), pal=field, at=(0, 0), solid=True)
art.write(sys.argv[1])
```

```js
// in code.js, from the generated ART block:
bg(0, { mx: ART.scenes.field.mx, my: ART.scenes.field.my, mw: ART.scenes.field.w, mh: ART.scenes.field.h, show: true });
sprite(ART.sprites.player, x, y);          // spr(tile, x, y, { size, pal, prio: 3 })
```

What the kit does for you (each was a bug or a lost hour in a real game):
- **Palettes by role.** `field.mid` is an index; entry 0 of a sub-palette is always transparent, so an artist who means
  opaque black and draws 0 gets a hole: the kit has no way to draw "black" except as a role. A picture that uses a colour
  its palette does not define is an error (it would show a default colour).
- **Tiles are shared**, identical or flipped (the map and `spr` flip for free), so a 256 x 224 picture costs only its distinct
  tiles. **Sprites are placed** where the console expects them (a 16 px sprite at tile n uses n, n+1, n+16, n+17), at an aligned,
  free spot. **Regions** keep BG tiles and sprites apart, and a full region is an error that names it.
- **`solid=True`** on a scene refuses a transparent cell: a hole in ground or sky, from a tile left empty, is caught at
  build time. `scene.mjs --holes` shows them for art you did not build this way.
- **BG palette 0 is the overlay's** (it shares CGRAM entries 1 to 15 with `print` and `rectfill`'s colours): use palettes
  1 to 7, or give the overlay its own colours with `art.color(113, 'ffffff', 'WHITE')`, as Moto Crosser does.
- Scenery that moves (a waving crowd, twinkling stars) is a palette change or a switch between two pictures in Map RAM,
  not a rewrite of the map.

**The first games' art has no script.** Only their generated `tiles.txt`, `palette.txt` and `map.txt` were kept (the scripts that
made them were lost with a scratch directory), so those games cannot be regenerated: to change a picture, edit the file,
or redraw just that piece with the kit and paste its `tiles.txt` rows in. The kit is for new games and new pieces. To look at
such a game's art, use `tiles.mjs`, `scene.mjs --rect x,y,w,h` and `sprites.mjs --tile n --size s --pal p` (no manifest needed).

**Colour blending and brightness** (SPEC 4.10; the `effects` demo has one page for each): `blend()` makes a layer, the
sprites in palettes 4 to 7, the backdrop or the overlay's colours 192 to 255 translucent, and `brightness()` fades the
whole picture. Use them for what made SNES games look like SNES games, instead of opaque boxes and black:
- **see-through panels:** fill the panel with a colour in CGRAM 192-255 and `blend({ layers: ['overlay'], half: true })`;
  draw its text and frame in colours under 192, which stay solid;
- **shadows** (`op: 'sub'`) and **light, fire, glows** (`op: 'add'`): put those sprites in palettes 4 to 7;
- **water, glass, ghosts:** a layer with `half: true`;
- **fades:** `brightness(0-15)` to black, `color: [31, 31, 31]` to white, a colour for a tint or a flash.

One blend setting holds for a whole line; `scanline()` can change it part way down the screen.

**Windows and mosaic** (SPEC 4.11, 4.12): two windows, each a span of columns set line by line in `scanline()`, hide a
layer, the sprites, the overlay, the blending or the whole picture inside or outside them: spotlights, iris and
diamond wipes, a letterbox, light through a pane of glass. `mosaic(size)` is the pixelating scene change. Use them for
scene changes instead of a cut.

**The SNES look, with the kit** (`docs/dev/snes-picture.md`; the `showcase` cart's `art.py` uses every one of these).
The difference between NES-looking and SNES-looking art is mostly shading, depth and size, and the kit does the work:
- **Colour by ramps, never single colours.** `ramp('d2aa99', 5)` gives shades of one colour, even to the eye, cooler in
  the shadows and warmer in the light, already in the console's 5-bit colour; a palette takes ramps (`pal.skin`, dark
  to light) and `pal.step(i, 1)` moves along one. Give a material 4 to 6 steps. Push backgrounds back with
  `recede(ramp, 0.5, haze)`, so sprites stand out.
- **Characters: draw them in designed shapes** (`draw.py`, `figure.py`). Lit 3D volumes with noise look like
  mannequins (the user, on the sculpted heads: "still blocky and strange"); a pixel artist designs each tone as a
  shape. `Canvas(w, h)` takes vector shapes (`oval()`, `blob()` through points, `brush()` tapering strokes, `poly()`)
  in flat tones, as named parts; `shadow(part, tone, light, depth)` gives a part its shadow side as one clean crescent,
  `light()` a lit band, `seam()` a line where one part overlaps another, `ink()` and `dot()` pixel-exact lines and
  glints (eyes, mouths); `render()` counts the samples into pixels, outlines and tidies (folds stray pixels away).
  `head(d, x, y, H, skin, hair, view='side' | 'three' | 'front' | 'back', expression=, style=)` draws a head from templates of
  planes (brow ridge, sockets, nose, cheekbone, jaw) at any size; `style='shaggy'` is the head traced from the user's
  reference drawings (`docs/reference/`, `trace.py`), its planes, hair and expressions, from 26 px tall. Reference art
  from the person beats any template of mine: ask for it (flat tones, real pixel size), trace it, keep it in
  `docs/reference/` with what it informs, and `Figure('brawler', height, line=, skin=, hair=,
  shirt=, pants=, shoes=, top='tee' | 'tank' | 'long' | 'bare')` a whole character on a rig's skeleton, posed and
  animated like a rig. Its default `view='three'` cheats the chest and face towards the camera as Streets of Rage and
  Street Fighter do (a pure profile hides the chest behind a bulky near shoulder: the user's note on the first one). Give it one `line` colour for all its outlines (Streets of Rage does): one sprite palette then
  holds skin, hair, shirt and pants. `speckle(img)` measures the clutter (the share of pixels in clusters of one or two: about 0.10 for a 64 px figure,
  0.05 for a head 32 px tall; more means noise). Look at it at 6x
  with a Sheet and criticise it as an artist would: the faces, the hair, the torso.
- **Sculpt the round and glossy** (`Sculpt`: gloves, balls, armour, a boss's shell, background props): spheres,
  ellipsoids, capsules and reliefs blended with `smooth=`, lit, shaded along each part's ramp and outlined. Cut a big
  silhouette as a flat shape and give it depth with `relief()`; round parts alone read as balloons (the showcase's
  first hero). For flat shapes, `shaded(mask, ramp, kind)`, then `inline()` or `outline_sel()`, `rim()` for a back
  light, `clean_lines()` and `despeckle()`.
- **Big characters are big sprites.** `art.big_sprite(name, picture or {palette: picture})` cuts any size into parts
  and code.js draws it with `bigSprite(ART.big.name, x, y, { fx })`. Animate the part that moves as a big sprite of its
  own (the showcase's boxer breathes with his top half: two whole frames cost about 300 tiles, the split costs none).
  Several palettes give a character more than 15 colours (skin in one, clothes in another).
- **Backgrounds in layers, never flat.** `sky()`, `clouds()`, `mountains()`, `hills()`, `treeline()`, `stars()`,
  `orb()` draw the far layers (they wrap, for scrolling); `texture(kind, w, h, ramp)` fills ground, walls and floors
  with a material (grass, dirt, stone, brick, tiles, planks, leaves, water, fence ...) that repeats seamlessly, and
  `variants()` with `tile_fill()` break up a big area for a few tiles. `floor()` lays a texture in perspective. A sky
  can cost no tiles at all: `art.gradient()` and `gradientLine()` in `scanline()`.
- **Characters that move: rig them.** `Figure(...)` (drawn) and `Rig('brawler' | 'boxer' | 'hero', height, ...)`
  (sculpted) share a skeleton; a pose is a dict of joint angles (`pose(GUARD, arm_n=80)`),
  and `rig.animate(WALK, 8)` makes the frames between key poses (WALK, PUNCH, KICK, IDLE-like pairs; give at least a
  frame a key). `filmstrip(path, figure, poses, pal)` shows every frame with an onion skin of the one before and the
  skeleton (near limbs pink, far limbs blue): check it for a limb that jumps or a foot that slides. `art.animation()`
  makes the frames big sprites that share every piece that does not change (a 64 px brawler: 18 frames in about 480
  tiles). Then `gif.mjs` makes a GIF for the person to judge the timing, which a still cannot show.
- **Big fighters: stream their frames.** Tiles cost grows with a character's area: the same 18 frames at 96 px take
  1,008 tiles as big sprites, the whole budget. `art.stream(name, {clip: [frames]}, pal=)` loads each frame into a slot
  of tile rows as it plays, as SNES games did, and `streamSprite(ART.streams.name, frame, x, y, { fx, slot })` draws it
  (`ART.streams.name.clips.walk` is [first frame, count]). Give it `rom=True` and the frames go in the cart's ROM
  (`rom/<name>.bin`, 128 KB in all: docs/dev/rom-plan.md), out of the 64 KB of code: the `street` brawler (96 px, 18
  frames) is 128 tiles and 18.5 KB of ROM, so six or so such fighters fit (without `rom=True` the same frames are
  20 KB of `code.js`). One slot per copy on screen at once (`slots=`); loading costs no measurable time.
- **A whole cast: Streets of Woe's way** (`carts/src/brawl/figures.py`, `art.py`; its spec section 12). Seven fighters on the
  screen cannot each have 128 tiles, nor 40 frames of ROM each, so: (1) draw them at 72 px (a 64-tile slot, 0.7 KB a frame) and make the
  game's boxes fit them; (2) **give every fighter one palette layout** (an outline, three ramps of 3, two trim colours) so the same frames
  show in any of the eight sprite palettes, and a second hero or a thug's coat for each stage is a palette, not frames (`color()`
  rewrites one while the game plays); (3) put the whole cast in **one stream** with `slots=7` and hand the slots out in the game
  (a map of fighter to slot, kept while he is on the screen); (4) a variant (a head, a hat, a scarf) is the same poses drawn again: the
  body's tiles are shared in ROM, so it costs about 0.3 KB a frame; (5) seat each frame on its lowest pixel and its pivot on the
  middle column in `render_clips()` (a crouch or a lunge then keeps its feet on the floor, and `fx` mirrors it in place); (6) keep
  where the hand and the head are in each frame (`ANCHORS`, in a small ROM blob), for a knife, a whip or a flame drawn by code; (7) **a
  second stream can lie over the first one's slots** (a boss over two of them, a title's logo over five): make it, then set its `base`
  in `art.streams` and free its tiles in `art.used`; the game reloads (`st.loaded = []`) when who is on changes; (8) `art.stream(...,
  fewer=2, cap=64)` covers a frame in fewer, bigger pieces while it still fits the slot: fewer sprites on a line (a 72 px fighter was
  14 to 18 of the 128 sprites; now 9 on average). Everything that has to sort with the fighters (props, pickups, shadows) must be a
  sprite too: the overlay is always above sprites. Check the sprites with a long random play (`soak.mjs` reports the OAM and the
  scanline maxima) and the **PNG payload** (`check.js`): packed frames compress to about 0.65 and the `.nova.png` holds 147 KB, so it fills before the ROM does (110 KB of the 128). The **label** counts too: the F7 capture of a busy frame is 17 to 24 KB; squeeze it to 24 colours (`Image.quantize`: 7 KB) and release with `--keep-label`.
  Drawing 160 frames takes minutes: `BRAWL_FIG_CACHE=<dir>` keeps each fighter's frames between runs (delete one file after changing its poses).
- **Review a character the way a person would, then check what a person can't.** `review(frames, name=, loop=,
  height=, colours=)` (`review.py`) turns the by-eye checks into findings: a frame touching the picture's edge, noise
  (clusters of one or two pixels), too many colours, a figure the wrong height, a stalled animation, feet that hop
  between frames (`FEET`; a walk's feet swing sideways and are not flagged, an idle's are with `smooth=True`). It
  catches what makes a sprite look wrong without anyone seeing it, and it never says a sprite looks good: only
  looking does (a `Sheet` at 6x, then the Read tool; if you cannot look at the picture, say so and do not claim a
  visual review). The revision loop, from the user's sprite engine spec (`docs/reference/`): write down specific
  defects ("the near fist merges into the chest", not "looks off"), change only the source that causes them, keep
  the palette, proportions and every area that already works, render again and compare before and after, at most
  five rounds per pose, keeping the best version. Score a pose 1 to 5 on each of: silhouette (understood at 1x?),
  anatomy (head, limbs, hands and feet plausible?), consistency (same proportions, costume and face as the others?),
  shading (do flat clusters describe volume?), pixel discipline (clusters, not noise?) and, for an animation,
  motion (readable, steady, well timed?), and note why. For exact fixes after a render: `Img.patch(rows)` ('.' leaves
  a pixel, '~' erases); for a grid someone handed over: `Img.from_rows(rows, strict=True, size=(w, h))`.
- **Details on sculpted figures** (`detail.py`): `face()`, `hair()`, `crease()`, `bunch()`, `stroke()` draw on a
  rendered Sculpt or Rig (`Rig(..., face='angry', hair_style='swept', folds=True)`). For a character, prefer `Figure`.
- **HUD and titles:** `big_text()` (smooth scaled, gradient-filled, outlined, shadowed), `hud_bar()`, `frame()`.
- **Look while you work:** `Sheet().add(name, img, pal)` (and `add_layers()` for a stack of layers) saves a PNG from
  art.py without packing.

**Look at the art, always.** `sprites.mjs` (every sprite at its real size, in its palette), `scene.mjs` (a map region, with
`--holes`), `tiles.mjs` (the sheet with numbers) and `shots.mjs` (the game in place) all make PNGs to open with the Read tool.
Do it after every change; a tile-aligned scene is easy to get slightly wrong. To check exact pixels (is the outline
one pixel wide, is the highlight where the light comes from, is the sprite centred), `sprites.mjs --ascii <name>` is cheaper than
an image: count along the rulers. Before a release, run `colors.mjs --check`: the PNGs show what a picture looks like, the report says whether its
colours are muddy (the default palette's brown and grey panels are what made Tricksy Towerz look unfinished). **Layering:** sprites are drawn between the
background layers by priority (SPEC 4.8), and the overlay is always on top. To put something over a sprite (frost over a gem)
use a background layer's high-priority tiles (bit 15 of the map entry; `art.scene(..., prio=1)`) and a lower sprite priority;
a sprite can never appear over an overlay panel, so a picture for a banner cannot be a sprite. Layer 0 is on by default and
shows the map from (0, 0): if the background goes on another layer, hide it (`bg(0, { show: false })`), or it covers the
sprites (the gems and the ice vanished in Ice Breakers until it was). Count sprites per scanline in a test of a busy
scene (`vm.ppu.oamCount`, `oamY`, `oamSize`), cap particles, and give the budget in the spec (Moto Crosser used 196 of 320
tiles for three settings by designing a tile-aligned vocabulary, after an image-based approach overflowed).

## 7. Tooling traps

- Scripts that edit big files by slicing text (`s[:a] + new + s[b:]`) fail quietly when an index is in the wrong
  order (a block of `code.js` was duplicated). Assert that each anchor appears exactly once, count after the
  edit, and `node --check` it. Prefer small, exact `Edit`s.
- In Python, `x if cond else y` binds looser than you think inside a larger expression (silently dropped draw
  functions in one game): put each operand in parentheses.
- A tool call stops after 2 minutes: run long jobs in the background (`run_in_background`) and wait for the
  notification, rather than sleeping.
- Do not run suites in parallel (frame-time checks fail under load); `test.js` and `verify.js` run them one at a time.
  Sweeps do not time frames, so a big grid can be split over several `sweep.mjs` processes (one per group of levels, no
  more than there are cores) and the outputs put together.
- A fix to the console's behaviour, to a cart's physics or to the AI changes what the sweep and the tests see: run both,
  and put the new numbers in the spec.
- A label captured by `release.js` depends on frame timing, so each run is a new picture: use `--keep-label`
  when only code changed, so the label and the PNG do not change for no reason.

## 8. Git

- Work on the branch you are given; commit after every step (the stop hook asks for it) and push.
- Never open a pull request until asked. When asked, open it, then merge when the user says so. A merged
  branch is finished: start follow-up work from the latest `main` on the same branch name.
- **Every pull request gets a playable preview** at `https://orlando008.github.io/fanstasy-console/pr/<number>/`
  (`.github/workflows/pages.yml`; a comment on the pull request gives the link a minute or two after it opens, and each
  push updates it). When you open a pull request, give the user that link with what to try in it: playing the change
  before it merges is how the problems no check can see get found (a held note, a piece that falls too fast). The
  preview keeps its own saves, so trying it cannot touch the main site's records. Main is published to
  `https://orlando008.github.io/fanstasy-console/` on every merge.
- Commit the cart (`carts/<name>.nova`, `.nova.png`, `labels/`, `index.json`), its source folder, its spec and the
  README row together.

## 9. Fixed in the first games

What the checks found in the games, so the same is not done again:

- **Leads that were loud and wobbly** (players: "it blew out my ears"): vibrato, and leads at up to 0.13 RMS and 0.7 to
  0.9 of the mix. Python Pass was fixed after two rounds of feedback, which is where `loud.mjs`'s limits came from; the
  other games were then brought under them (October 2026).
- **Leads that pierced**: on the new chip, the Sound Test's first brass lead, a bright horn in octave 5, was within
  every level limit and still "blaring". That gave `loud.mjs` its pierce limit; every game's leads moved an octave down.
- **Effects in the wrong voice** (on the old chip, a noise effect sent to the pulse effects channel sounded like a
  tone): the reason the old games had a `SFX_VOICE_CH` table. On the new chip every channel plays every voice.
- **Measuring what is not there**: `loud.mjs` read a song's tempo only from channel 1, so Summit Rush (tempo on channel
  5) was measured at the wrong speed and its title lead was over the limit unseen; `sfx.mjs` read the left side only,
  so effects panned right looked quieter than they were. Both now measure what the player hears.

## 10. A rhythm game on this console (Flow State)

What building `flow-state` taught (its spec is `docs/carts/flow-state.md`; every point has a test in `tests/carts/flow-state/`):

- **The music is the clock.** A song's speed is the ticks (60 to a second) of a row, so a note on row `r` sounds `r x speed` frames after `music(song, pos)`.
  Write the notes once (`pieces.py`) and make the song and the chart from them (`audio.py` writes `rom/charts.bin` as well as `audio.json`): they cannot
  disagree, and a test reads both back and checks every pad against the song (`04-music.mjs`). No audio analysis is needed.
- **A voice must start when its row says.** A slow attack makes a note sound late against its pad, and a player taps what they hear: the Air's strings were 94 ms
  to full level and every tap landed three frames behind. `tools/devkit/music/onset.mjs` prints when each song's first note reaches a quarter of its level;
  set a rhythm game's lead voices to attack 0 and keep it under about 15 ms.
- **A chart follows one thing the player can hear.** Pads on both the bass and the melody ornaments of the Air could not be tapped to; pads on the bass alone, played as
  a clear tick, could. Say on the menu what each chart follows. Make a slow melody playable with a second voice (`extra_src`, `extra_mod`), and a hard chart with
  every note, but not faster than a person can tap (no two pads closer than 9 frames).
- **Scores from public domain files.** `carts/src/flow-state/import_score.py` turns one voice of a MIDI file (Mutopia has engravings; the `marmooo/classical-midi-db`
  repository collects them) into note text; `scores/SOURCES.md` records where each came from and its licence. The first versions written from memory were wrong in
  the Air, the Moonlight and the Minuet's second half: take the notes from a score.
- **The calibration is a number of frames.** Tap to a tick on a steady beat, take the **median** of how late the taps are (a stray tap does not spoil it), limit it
  to -15 to 15, and subtract it from the song time (`st = tm - lag`) for the pads and the judgement alike. Offer it the first time, and save it.
- **A meter that counts saturates.** A flow or health meter that goes up a fixed amount a hit and down a fixed amount a miss goes to the top for every player better
  than a coin toss. Move it a part of the way to a target with each judgement (`code.js`: `JUDGE`, `MISS_K`) and it measures how well the player has been playing.
  Simulate the rule offline for a few accuracies before changing it (the first step of `step 7` in the spec).
- **Balance with a bot that is human.** `bot.mjs` taps with a timing error (`sd` frames) that grows when the pads come fast; run it at 0, 3, 6 and 10 over every
  piece and difficulty (`sweep.mjs ... --set sd=0,3,6,10`) and write down what grade and share of flow state each should get (`08-balance.mjs`).
- **The picture.** A floor in perspective is the `mode7` demo's affine matrix per line; a thing on the floor (a pad) uses the same formula (`y = horizon + height x
  focal / z`), so it sits on the water; the five times of day are tints of one palette set (`color(i)` reads an entry), not five pictures. Every procedural detail
  of a big repeating picture must repeat with the tile (a 1,024 px river costs 518 tiles when everything repeats every 64 px, and over 1,000 when it does not).
  The overlay is above the sprites, so a big letter or a character beside a panel stands on open ground, not behind the panel; sprites in palettes 4 to 7 with
  `blend({ layers: ['spr'], op: 'add' })` are the glows.
- **No sound for a failure that the screen already shows** (the miss's splash cut into the music's flow), and nothing that needs the player to see the screen to hear a
  beat. Effects are sampled and soft (0.006 to 0.022 RMS against a song's 0.04 to 0.07); a hit's plink has the pitch class of its note (one effect for each).

