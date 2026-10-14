# Making a cart: the playbook

For agents (and people) building games for the NOVA-16 fantasy console. It collects what the first
seven games taught us, so the next one starts from a working kit instead of rebuilding it.
The console's own rules are in `docs/SPEC.md`; each game's design is in `docs/carts/<name>.md`.
`node tools/check-docs.js` keeps every file and tool flag this document mentions real: if you move a tool, fix the docs.

## Quick start

```sh
node tools/new-cart.js my-game "My Game"      # a working cart, tests, audio script and spec template
# write docs/carts/my-game.md, then replace updatePlay/drawPlay in carts/src/my-game/code.js
node tools/pack.js carts/src/my-game carts/my-game.nova
node tools/verify.js --fast                   # audio script, pack, checks, soak, music levels (add the tests: leave out --fast)
node tools/devkit/smoke.mjs my-game           # the real console, headless
node tools/devkit/sweep.mjs my-game           # the bot over many seeds (once tests/carts/my-game/bot.mjs is real)
node tools/release.js my-game                 # when finished: label, .nova.png, Library, README row
```

## Where things live

| Path | What |
|---|---|
| `carts/src/<name>/` | A cart's source: `code.js`, `meta.json`, `tiles.txt`, `palette.txt`, `map.txt`, `audio.json` (made by `audio.py` if there is one), `label.png` |
| `carts/<name>.nova`, `.nova.png`, `labels/`, `index.json` | What `pack.js`, `release.js` and `library.js` build from the source: commit them with it |
| `tests/carts/<name>/` | `lib.mjs` (boots the cart with its variables exposed), `NN-*.mjs` (check scripts, one per build step), `bot.mjs` (the bot for `sweep.mjs`) |
| `docs/carts/<name>.md` | The game's spec, with each step's **Built** and **Results** notes |
| `tools/` | `pack`, `library`, `new-cart`, `verify`, `check`, `test`, `release`, `check-docs` (section 2) |
| `tools/devkit/` | The headless harness, soak, smoke, sweep, shots, tiles, voices, the random player, and `music/`: the song toolkit, loudness checks, effect levels and lead lowering |
| `tools/templates/cart/` | The starter's files |
| `CLAUDE.md`, `docs/dev/playbook.md` | Notes for agents (short) and this guide |

## 1. The shape of a game build

0. **Start from the starter**: `node tools/new-cart.js <name> "Title"` creates the cart, its tests, its audio script and
   the spec template (section 2). Do not copy another game's code to begin with.
1. **Write the spec first** (`docs/carts/<name>.md`, scaffolded): concept, controls, screen layout, the rules with
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
| `node tools/new-cart.js <name> "Title"` | **Start a new cart**: a working frame (title, play, pause, game over, saved top 10 with initials, records, sound and music cues, `skipTitle`), an audio script, tests, a bot and a spec template with the plan. Replace the placeholder game in `updatePlay`/`drawPlay`. `--selftest` checks the starter itself (CI does) |
| `node tools/pack.js carts/src/<name> carts/<name>.nova` | Build the cart from its source folder |
| `node tools/verify.js [name...]` | **Verify what you changed, in one command** (the carts changed since `origin/main`, or the ones you name, or `--all`): `audio.py` regenerates `audio.json`, the source packs to the committed `.nova`, `check.js`, a soak run, the music levels (`loud.mjs --check`), the docs check, and the cart's tests (`--fast` skips them). CI runs it on pull requests |
| `node tools/check.js <name>` / `--all` | Code size against 64 KB, syntax, audio limits, instrument/channel mismatches, PNG fit, **the `.nova.png` decoding to exactly the packed cart** (no browser), the spec (header, TODOs in a released cart, code size in the budget table), label and description |
| `node tools/test.js <name> [filter] [-v]` | Run `tests/carts/<name>/NN-*.mjs` one at a time (about 3 minutes for Moto Crosser: run it in the background) |
| `node tools/check-docs.js` | Every `tools/`, `tests/`, `carts/`, `docs/` and `src/` path the documentation mentions must exist (placeholders like `<name>` are skipped), and every `--flag` on a documented `node tools/...` command must exist in that tool |

**Play it, automatically**

| Command | What it does |
|---|---|
| `node tools/devkit/soak.mjs carts/<name>.nova [--frames 20000] [--seeds 3]` | **Soak test**: random play in the harness for a long time. Fails on an exception, an effect on the wrong voice's channel, or a frozen screen (a soft lock, with the state named); reports frame times, sprites (OAM and per scanline), the states reached and the effects and songs never played. `--all` does every cart (CI) |
| `node tools/devkit/sweep.mjs <name> --seeds 8 --set skill=0.9,1` | **Run the cart's bot** (`tests/carts/<name>/bot.mjs`) over many seeds and variants and summarise (win rates, times, crashes); fails on an exception, a frozen screen, a run that never finishes, or a problem the bot reports (a rival stuck). How balance is checked |
| `node tools/devkit/smoke.mjs <name> [--seconds 12] [--shot f.png]` | **Smoke test in the real console** (headless Chromium): loads the cart, plays with random keys, and reports page and console errors, the cart's logged errors (a cart that throws is stopped), fps, and a frozen or blank screen. Catches what the Node harness cannot |
| `tools/devkit/harness.mjs` | The headless console for tests (see its header comment); `pad.mjs` is the random player |

**See it**

| Command | What it does |
|---|---|
| `node tools/devkit/shots.mjs carts/<name>.nova out/ --at 60,300` | Screenshots from the command line (`--hold A:100-400` to press buttons, `--extra "skipTitle = true;"`) |
| `node tools/devkit/tiles.mjs carts/<name>.nova out.png --from 640 --count 64 --pal 0 [--sprite] [--skip-empty]` | A contact sheet of tiles with their numbers in a palette (open the PNG with the Read tool). `--ascii <n>` prints one tile as `tiles.txt` rows; `--palette out.png` shows all 256 entries |

**Hear it** (measure it: you cannot listen)

| Command | What it does |
|---|---|
| `python3 carts/src/<name>/audio.py carts/src/<name>/audio.json` | Regenerate a game's audio from its script, with the song toolkit in `tools/devkit/music/kit.py` (its header explains `bar()`) |
| `node tools/devkit/music/loud.mjs carts/<name>.nova [--check]` | Per-section loudness of every song, surges, peak, and **the lead alone**: its RMS, its share of the mix and how much the mix jumps when it enters. `--check` fails on the limits in section 5 (`verify.js` runs it) |
| `node tools/devkit/music/lower-leads.mjs carts/src/<name>/audio.json [--write]` | For songs with no audio script: remove the leads' vibrato and lower their volumes until each song's lead is at most 0.05 RMS (instruments shared with effects are copied first) |
| `node tools/devkit/music/render.mjs carts/<name>.nova out/` | WAV files of the songs, with level and clipping |
| `node tools/devkit/music/sfx.mjs carts/<name>.nova <channel> [n...]` | Length, level and pitch (centroid) of effects, on the channel the game uses |
| `python3 tools/devkit/music/clash.py carts/src/<name>/audio.json` | Lead against bass and saw on the beat |
| `node tools/devkit/voices.mjs carts/<name>.nova [frames] [seed]` | Just the wrong-voice check (soak does this too) |

**Release**

| Command | What it does |
|---|---|
| `node tools/release.js <name> [--keep-label]` | Pack, capture the F7 label in headless Chromium, export `.nova.png`, verify it decodes to the packed cart, rebuild the Library index, run the checks |
| `node tools/library.js` | Rebuild `carts/index.json` and `carts/labels/` (release.js does it) |

The starter's template is `tools/templates/cart/` (`code.js` is the frame to build on; its `01-flow.mjs` is the
first test file and its `bot.mjs` the first bot). Examples of a full build: `tests/carts/moto-crosser/` (seven
suites, a `lib.mjs` and a bot) and `carts/src/moto-crosser/audio.py` (songs and effects with the kit).

**CI** (`.github/workflows/check.yml`): syntax of `src/`, `tools/` and `tests/`; the docs check; `check.js --all`; the
starter's self-test; `soak.mjs --all`; and, on pull requests, `verify.js` for the carts the PR changes. The smoke
test is not in CI (it needs Playwright and Chromium). On CI the tests' frame-time limits are 3 times looser.

## 3. Limits and rules of the console

- **Code** 64 KB (65,536 UTF-8 bytes). Moto Crosser is at 93%. Tables of level data are the big spender: keep
  them compact (`[kind, lane, x]` arrays), generate repetitive tiles in code rather than data, and measure with
  `node tools/check.js <name>` as you go, not at the end.
- **Screen** 256 x 224; BG0 front, BG1 middle, BG2 back; sprites 8, 16 or 32 px, **128 in OAM, 32 per scanline**
  (more are dropped: particles and crowds are what hit it, so cap them); Map RAM 256 x 128; tile sheet 128 x 512
  (1,024 tiles). Palettes: BG palette p is entries 16p+k, sprite palette p is 128+16p+k; the overlay colours
  come from a BG palette (Moto Crosser keeps them at 113 and up).
- **Save** 256 int32 slots (`dget`/`dset`). Slot 0 holds a format version.
- **Audio** 6 channels, 32 instruments, 64 patterns of 64 rows, 8 songs, 64 SFX of up to 32 rows, 16 samples in
  16 KB of Sample RAM, 8-bit PCM at 16 kHz. A PNG cart holds a payload of 147,443 bytes (the check reports it).
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

You cannot hear the result, so measure it, and follow the rules that keep players happy:

- **The channel decides the voice** (0 and 1 pulse, 2 triangle, 3 saw, 4 noise, 5 sample), whatever an
  instrument's `wave` says. A noise instrument played on a pulse channel is a pulse. `check.js` flags a song
  cell on the wrong channel as an error, and lists effects whose voice does not suit the cart's `SFX_CH` (unless
  the code has a `SFX_VOICE_CH` table or a `sfx-voice-routed` comment); `voices.mjs` plays the cart and flags
  what it really sends. Put noise effects on channel 4, saw on 3, triangle on 2: copy `sfxv()` and
  `SFX_VOICE_CH` from Python Pass, or Moto Crosser's `fx()`.
- **Reserve channels**: channel 1 for SFX (songs only carry the tempo `F0x` on row 0 of each pattern on it),
  and channel 4 for an engine or other continuous sound. Hats then become short samples on channel 5, on rows
  with no kick or snare (the kit does this).
- **No wobbly or loud leads.** Players complained about vibrato, sudden jumps in level and a lead that "blew out my
  ears". Leads are `pulse25` or `pulse50` at volume 4 to 6 with no vibrato; kick 12, snare 10. `loud.mjs --check`
  turns the complaint into numbers (for songs of 12 s or more): the lead alone at most 0.07 RMS and at most 0.75 of the
  mix, the mix at most 1.5x louder in the section where the lead enters, no section over 1.6x the song's median, the
  loudest 250 ms at most 2.2x the median, the peak at most 0.45, the median level 0.03 to 0.15. Python Pass's first
  version (lead 0.08 to 0.13, 0.8 to 0.9 of the mix, entering up to 2.4x) was what players called blaring; its fixed
  songs are 0.04 to 0.05 and 0.5 to 0.7. A pulse50 lead is louder than a pulse25 at the same volume.
  The first games' leads were as loud as that first version, and were brought down in the same way with
  `lower-leads.mjs` (no vibrato; volumes lowered until each song's lead is at most 0.05 RMS). Only the `chiptune` demo is
  over the limits (a loud sound test, so `verify.js` only warns for it).
- **A held note cannot change pitch** (no API for it). A pitch that follows a value (an engine) is a short loop
  restarted at one of 5 or 6 pitches, changed only after the new pitch has held a few frames.
- **Effect levels**: a song is about 0.06 to 0.08 RMS; effects 0.01 to 0.06; a looping sound 0.02 to 0.03.
  `sfx.mjs` measures them on the right channel.
- **Songs are generated** from a script (`audio.py`, using `kit.py`), which keeps the music in reviewable text
  and makes a change (a quieter lead) a one-line edit. The script must regenerate `audio.json` exactly.
- Cues (`play(song)` that does not restart the song already playing; `fx(n)` for effects) belong in one place in
  the code so a test can check them.

## 6. Art

- Draw from the palette and tile vocabulary of the game, with a tile budget in the spec (Moto Crosser used 196 of
  320 tiles for three settings by designing a tile-aligned vocabulary, after an image-based approach overflowed).
- Scenery that moves (a waving crowd, twinkling stars) is a palette change or a switch between two pictures in
  Map RAM, not a rewrite of the map.
- Count sprites per scanline in a test of a busy scene (the harness exposes `vm.ppu.oamCount`, and layers and
  palettes), and cap the particles.
- **Look at the art**: `tiles.mjs` shows the tiles you wrote with their numbers (a hex-digit `tiles.txt` cannot be judged
  by reading it), and `shots.mjs` shows them in place. Do both after every art change: a tile-aligned scene is easy to
  get slightly wrong (a transparent tile showing a gap).

## 7. Tooling traps

- Scripts that edit big files by slicing text (`s[:a] + new + s[b:]`) fail quietly when an index is in the wrong
  order (a block of `code.js` was duplicated). Assert that each anchor appears exactly once, count after the
  edit, and `node --check` it. Prefer small, exact `Edit`s.
- In Python, `x if cond else y` binds looser than you think inside a larger expression (silently dropped draw
  functions in one game): put each operand in parentheses.
- A tool call stops after 2 minutes: run long jobs in the background (`run_in_background`) and wait for the
  notification, rather than sleeping.
- Do not run suites in parallel (frame-time checks fail under load); `test.js` and `verify.js` run them one at a time.
- A fix to the console's behaviour, to a cart's physics or to the AI changes what the sweep and the tests see: run both,
  and put the new numbers in the spec.
- A label captured by `release.js` depends on frame timing, so each run is a new picture: use `--keep-label`
  when only code changed, so the label and the PNG do not change for no reason.

## 8. Git

- Work on the branch you are given; commit after every step (the stop hook asks for it) and push.
- Never open a pull request until asked. When asked, open it, then merge when the user says so. A merged
  branch is finished: start follow-up work from the latest `main` on the same branch name.
- Commit the cart (`carts/<name>.nova`, `.nova.png`, `labels/`, `index.json`), its source folder, its spec and the
  README row together.

## 9. Fixed in the first games

`check.js`, `soak.mjs` and `loud.mjs` found two kinds of mistake in the first games. Both are fixed, so those games
sound a little different:

- **Noise (and saw) effects played through the pulse effects channel** (Alien Swarm, Planet Racers, Python
  Pass, Smashy Smash): the channel decides the voice, so they sounded like pulse tones. Each cart now has a table,
  `SFX_VOICE_CH`, and plays those effects on channel 4 (noise) or 3 (saw) through `sfxv()`; the rest still use
  `SFX_CH = 1`. A noise effect briefly mutes the music's channel 4 (the hats) while it plays. Noise is somewhat
  louder than a pulse at the same volume (RMS 1.3 to 1.5 times), still well under the music.
- **Smashy Smash, song 2** had an instrument declared as `pulse12` on the saw channel (it always played as a
  saw, with a fast vibrato). Its wave is now `saw`, so the sound is as it was.
- **Loud, wobbly leads** (Alien Swarm, Block Wizard, Planet Racers, Smashy Smash, Summit Rush; Python Pass was
  fixed earlier after two rounds of feedback, which is where the limits came from): leads had vibrato and sat at
  up to 0.13 RMS, 0.7 to 0.9 of the mix. `lower-leads.mjs` removed the vibrato and lowered the volumes so each
  song's lead is at most 0.05 RMS (about half the mix); instruments shared with effects were copied first, so the
  effects did not change.
- **Moto Crosser's Night Mountain** was the first song the lead check flagged (0.76 of the mix, entering 1.53x): its
  brass lead went from volume 5 to 4.
