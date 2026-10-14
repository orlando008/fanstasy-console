# Making a cart: the playbook

For agents (and people) building games for the NOVA-16 fantasy console. It collects what the first
seven games taught us, so the next one starts from a working kit instead of rebuilding it.
The console's own rules are in `docs/SPEC.md`; each game's design is in `docs/carts/<name>.md`.

## 1. The shape of a game build

1. **Write the spec first** (`docs/carts/<name>.md`): concept, controls, screen layout, the rules with
   numbers, scoring, screens and flow, audio, video layers, save slots, asset budget, and a numbered
   **implementation plan** of about 8 steps. Ask the user the few design questions that really change the
   game (modes, number of levels, features); choose sensible defaults for the rest.
2. **Build one step at a time.** The user says "go ahead" for each. A typical plan: 1 vertical slice,
   2 the core mechanics, 3 opponents or enemies, 4 content (levels, tracks), 5 the flow (title, menus,
   modes, saves), 6 art, 7 audio, 8 balance, polish, label, PNG cart, Library entry, README.
3. **After each step**: run its checks (section 4), write the step's **Built** and **Results** notes into the
   spec (the spec is the memory that survives a long session), commit and push to the branch. Do not
   open a pull request until the user asks ("merge it in").
4. **The spec and the code stay in step.** When a number changes (a speed, a par time, a rating), change
   the spec's table in the same commit.
5. **Context runs out in long builds.** Keep the spec current, keep scripts in the repo (not in a scratch
   directory), and write test files as you go: that is what a resumed session reads to pick up.

## 2. The kit

| Command | What it does |
|---|---|
| `node tools/pack.js carts/src/<name> carts/<name>.nova` | Build the cart from its source folder (`code.js`, `tiles.txt`, `palette.txt`, `map.txt`, `audio.json`, `meta.json`, `label.png`) |
| `node tools/check.js <name>` / `--all` | Code size against 64 KB, syntax, audio limits, instrument/channel mismatches, PNG fit, a stale `.nova`, missing label or description |
| `node tools/test.js <name> [filter] [-v]` | Run `tests/carts/<name>/NN-*.mjs` one at a time (about 3 minutes for Moto Crosser: run it in the background) |
| `node tools/release.js <name> [--keep-label]` | Pack, capture the F7 label in headless Chromium, export `.nova.png`, verify it decodes to the packed cart, rebuild the Library index, run the checks |
| `node tools/library.js` | Rebuild `carts/index.json` and `carts/labels/` (release.js does it) |
| `python3 carts/src/<name>/audio.py carts/src/<name>/audio.json` | Regenerate a game's audio from its script, with the song toolkit in `tools/devkit/music/kit.py` |
| `node tools/devkit/music/loud.mjs carts/<name>.nova` | Per-section loudness of every song |
| `node tools/devkit/music/render.mjs carts/<name>.nova out/` | WAV files of the songs, with level and clipping |
| `node tools/devkit/music/sfx.mjs carts/<name>.nova <channel> [n...]` | Length, level and pitch (centroid) of effects, on the channel the game uses |
| `python3 tools/devkit/music/clash.py carts/src/<name>/audio.json` | Lead against bass and saw on the beat |
| `node tools/devkit/shots.mjs carts/<name>.nova out/ --at 60,300` | Screenshots from the command line (`--hold A:100-400` to press buttons) |
| `tools/devkit/harness.mjs` | The headless console for tests (see its header comment) |

Examples to copy: `tests/carts/moto-crosser/` (a full test suite with a `lib.mjs`), `carts/src/moto-crosser/audio.py`
(songs and effects with the kit).

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
- **an automatic player** (`setAuto`) that drives the same code as a rival or the player, so a whole run can be
  played in a test: it finds stuck states, balance problems and crashes that no hand-written test would. The
  Moto Crosser bot found a rider that sat on a bump for ever (it could not climb a steep slope from a
  standstill: the same thing could have happened to a player).

Checks that proved their worth:
- one `PASS`/`FAIL` line per behaviour, written as a sentence a designer would say ("a crash has its sound");
- **numbers from the spec** asserted in the test (speeds, costs, scores), so a spec change is a visible failure;
- **flow checks** that walk the screens in order (title, menu, game, results, back), including quitting from
  the pause menu and a championship forced through with set results;
- **timing** as the 99th percentile of frame time (under 8 ms), not the worst frame (a garbage collection or
  another process spoils one frame); and one suite at a time (`tools/test.js` does this);
- **audio cues** from `vm.audioLog` (which song and which SFX on which channel, when), not by ear;
- **a test that fails without the fix**: after fixing a bug, put the fix back out and check the new test fails.

## 5. Audio

You cannot hear the result, so measure it, and follow the rules that keep players happy:

- **The channel decides the voice** (0 and 1 pulse, 2 triangle, 3 saw, 4 noise, 5 sample), whatever an
  instrument's `wave` says. A noise instrument played on a pulse channel is a pulse. `check.js` flags a song
  cell on the wrong channel as an error, and lists effects whose voice does not suit the cart's `SFX_CH`.
  Games that need real noise effects play them on channel 4 (Moto Crosser routes them through its `fx()`).
- **Reserve channels**: channel 1 for SFX (songs only carry the tempo `F0x` on row 0 of each pattern on it),
  and channel 4 for an engine or other continuous sound. Hats then become short samples on channel 5, on rows
  with no kick or snare (the kit does this).
- **No wobbly or loud leads.** Players complained about vibrato and sudden jumps in level. Leads are
  `pulse25` or `pulse50` at volume 5 to 7 with no vibrato; kick 12, snare 10. Check `loud.mjs`: sections
  within about 15% of the median, loudest at most 1.5x the median, peak under about 0.35. An intro may be quieter.
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
- Make screenshots (`shots.mjs`) and look at them after every art change; a tile-aligned scene is easy to get
  slightly wrong (a transparent tile showing a gap).

## 7. Tooling traps

- Scripts that edit big files by slicing text (`s[:a] + new + s[b:]`) fail quietly when an index is in the wrong
  order (a block of `code.js` was duplicated). Assert that each anchor appears exactly once, count after the
  edit, and `node --check` it. Prefer small, exact `Edit`s.
- In Python, `x if cond else y` binds looser than you think inside a larger expression (silently dropped draw
  functions in one game): put each operand in parentheses.
- A tool call stops after 2 minutes: run long jobs in the background (`run_in_background`) and wait for the
  notification, rather than sleeping.
- Do not run suites in parallel (frame-time checks fail under load).
- A label captured by `release.js` depends on frame timing, so each run is a new picture: use `--keep-label`
  when only code changed, so the label and the PNG do not change for no reason.

## 8. Git

- Work on the branch you are given; commit after every step (the stop hook asks for it) and push.
- Never open a pull request until asked. When asked, open it, then merge when the user says so. A merged
  branch is finished: start follow-up work from the latest `main` on the same branch name.
- Commit the cart (`carts/<name>.nova`, `.nova.png`, `labels/`, `index.json`), its source folder, its spec and the
  README row together.

## 9. Known issues in the first games

Found by `check.js` when it was written; not changed, because they alter a released game:

- Smashy Smash, song 2: an instrument with a pulse wave sits on channel 3 (saw), so it plays as a saw.
- Alien Swarm, Planet Racers, Python Pass and Smashy Smash send some noise effects through `SFX_CH = 1` (a pulse
  channel), so they sound like pulse tones rather than noise. Moto Crosser fixed this by routing noise effects
  to channel 4.
