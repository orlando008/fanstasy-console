# NOVA-16

A fantasy 16-bit game console that runs in the browser. Games ("carts") are
written in JavaScript against a small API, under fixed SNES-era hardware
limits.

- Specification: [docs/SPEC.md](docs/SPEC.md)

## Status

| Milestone | State |
|---|---|
| M1 Boot: worker, frame clock, CGRAM, overlay, font, input | Done |
| M2 Sprites: VRAM, OAM, sizes, flips, priorities, per-line limit, `.nova` loading | Done |
| M3 Backgrounds: Map RAM, BG0-2, scrolling, wrap, tile priority, compositing | Done |
| M4 Raster effects: `scanline()` hook, BG2 affine mode | Done |
| M5 Shell and code editor: run/edit modes, error screen, save/load `.nova`, autosave | Done |
| M6 Graphics editors: Sprites, Map and Palette tabs | Done |
| M7 Audio: worklet synth, instruments, SFX, patterns, songs, SFX and Music tabs | Done |
| M8 Persistence and PNG carts: `dget`/`dset`, label capture, `.nova.png` export and import | Done |
| M9 Recording: input recording and replay, WebM and GIF clips | Done |

The full cart API from SPEC section 8 is callable.

## Playing it online

The console is hosted on GitHub Pages: **<https://orlando008.github.io/fanstasy-console/>**, published from
`main` on every merge. Each pull request gets a playable preview at
`https://orlando008.github.io/fanstasy-console/pr/<number>/` (a comment on the pull request gives the link;
the preview is removed when it closes), with its own saves, apart from the main site's. The workflow is
`.github/workflows/pages.yml`, and `node tools/site.js check` builds the site and tries it in headless Chromium
under the same paths.

Once visited, the site works offline: the whole Library, every game and your saves (SPEC section 11.3). It also
installs as an app with its own icon, full screen: in Chrome or Edge, Install app (Android: the ⋮ menu; desktop: the
icon in the address bar); on an iPhone or iPad, Share, then Add to Home Screen.

## Running locally

Module workers and AudioWorklets need HTTP, so `file://` will not work. From
the repository root:

```sh
python3 -m http.server 8000
```

Then open <http://localhost:8000/>. The home page is the **Library**: the carts
below as cartridges on a shelf for each genre (Arcade, Puzzle, Racing, Strategy,
then the tech demos), led by your autosaved working cart. Pick one with the
arrows or a gamepad's d-pad and play it with Enter or A. While a cart runs, Esc
(or holding a gamepad's Select and Start for a second) opens the pause menu, and
Backspace, the browser's Back or the Library button in the corner returns to the
Library. `?cart=<name>` opens a cart directly, and `?seed=<n>` pins the random
seed; **Share link** (in the Library, S, or in the pause menu) copies that link for
a cart, or opens a phone's share sheet. You can also drop a `.nova` file or a `.nova.png` PNG cart onto the page.

| Cart | Shows |
|---|---|
| `hello` | Overlay drawing, font, input from keyboard and up to 4 gamepads |
| `sprites` | OAM: sizes, flips, sprite palettes, priorities, 128-entry and 32-per-line limits |
| `parallax` | Three scrolling background layers, sub-palettes, tile priority |
| `water` | `scanline()` reflection with per-line wobble and palette swaps |
| `mode7` | Per-line BG2 affine perspective floor and sky gradient |
| `chiptune` | A six-channel song and five sound effects, all editable in the Music and SFX tabs |
| `summit-rush` | The first real game: race one of seven AI models up three stages, with a title screen, a top-10 leaderboard, and music from the Summit Rush series. Also released as the PNG cart `summit-rush.nova.png` (see docs/carts/summit-rush.md) |
| `block-wizard` | A music-synced falling-block puzzle: climb the eight rooms of a wizard's tower, each with its own art and song, with the wizard gem, practice mode and a top-10 table; SELECT in play shows the sync check. Also released as the PNG cart `block-wizard.nova.png` (see docs/carts/block-wizard.md) |
| `planet-racers` | A Mode 7 Grand Prix where the racers are the eight planets: eight tracks, each with its own hazards (craters, acid pools, wet sand, crosswinds, ice chunks, ice sheets) and its own song after Holst's *The Planets*, three AI rivals a race, championship standings, a top-10 table with initials and a time trial; drift with L or R. Also released as the PNG cart `planet-racers.nova.png` (see docs/carts/planet-racers.md) |
| `smashy-smash` | A cartoon demolition Breakout: 16 stages in 4 worlds (the house, the factory, downtown, the castle), each with its own painted backdrop and song; wall, glass, steel and girder bricks; a paddle with a dash; seven power-up capsules (PLANK, NAILS, GLUE, TRIPLE, SLOW, WRECKER, HARD HAT); a stage-clear tally and a top-10 table with initials. Also released as the PNG cart `smashy-smash.nova.png` (see docs/carts/smashy-smash.md) |
| `alien-swarm` | A space tower defense: 8 maps on 4 planets (Luna Outpost, Frost Moon, Jungle World, The Hive), each painted in its planet's look with its own song, 15 waves each ending with the Queen; five towers (Blaster, Cannon, Laser, Freezer, Missile) with three levels and targeting modes, six aliens, a d-pad cursor with build and tower menus, fast-forward, calling waves early, stars, a hard mode and saved records. Also released as the PNG cart `alien-swarm.nova.png` (see docs/carts/alien-swarm.md) |
| `python-pass` | A snake game through a jungle and into a lost temple: 16 levels in 4 zones (the jungle, the riverbank, the ruins, the temple), each with its own walls, ground and animated colours, a snake drawn as tiles with a turn queue, fruit, golden fruit and combos, five power-ups (SLOW, GHOST, SHRINK, DOUBLE, SHIELD), boulders, scorpions and falling rocks, a level tally, extra lives, a saved top 10 with initials, and five songs and effects. Also released as the PNG cart `python-pass.nova.png` (see docs/carts/python-pass.md) |
| `moto-crosser` | An Excitebike-style dirt-bike racer: four lanes (UP and DOWN change lane), gas, turbo and an engine that overheats, tilting in the air to land on the slope, and ramps, bumps, hills, hurdles, mud, arrow strips and cooling pads. Race five CPU rivals in a Quick Race on one of three tracks (a stadium, a desert and a night mountain road, each with its own scenery and song) or take on the Championship: finish in the top 3 on each track, with points for places, time under par and a clean race, a podium, saved best times and a top 10 with initials. Also released as the PNG cart `moto-crosser.nova.png` (see docs/carts/moto-crosser.md) |
| `rags-to-riches` | A band-on-tour management game: Dot, Zorp and Spike have 10 weeks and $400 to raise $5,000 and save their rehearsal room. Each week pick one action: a concert (venue, ticket price and advertising, with a crowd forecast and a show on stage), writing songs (free, builds fans and freshness) or travel to one of five cities. Fans tire of a city you play too often. Five city hubs, a map, intro panels, a help with tips, a top 10 with initials and seven songs with twelve effects. Also released as the PNG cart `rags-to-riches.nova.png` (see docs/carts/rags-to-riches.md) |
| `ice-breakers` | A match-3 puzzle across twelve hand-made frozen levels: swap two gems, clear runs of three or more, and break the ice under and beside them. Each level has its own goal (break all the ice, collect a number of one colour, or reach a score) and a move budget, and the levels get harder with a faster song from level 7; the HUD shows the goal with a picture, a hint marks a good swap after six seconds, the ice cracks and falls in pieces with its own sounds, and the top 10 records the level reached (a game that clears all twelve is marked WON). Also released as the PNG cart `ice-breakers.nova.png` (see docs/carts/ice-breakers.md) |
| `tricksy-towerz` | A physics tower-building race for one to four players on one screen (a spiritual successor to *Tricky Towers*): seven tetromino pieces fall and are steered, turned and dropped, then stack under real rigid-body physics (they slide, tip and topple); the first tower to stay over the finish line for two seconds wins. Lobby where up to three more gamepads join by pressing a button and empty places are filled by computer wizards of four levels, a landing guide each person can switch off, a count of three, a wobble warning, a next-piece preview, a night scene with a wizard for each yard, four songs and thirteen effects, and a top 10 of the fastest wins with initials. Also released as the PNG cart `tricksy-towerz.nova.png` (see docs/carts/tricksy-towerz.md) |

Keyboard: arrows = d-pad, X = A, Z = B, S = X, A = Y, Q = L, W = R,
Enter = Start, Shift = Select.

Gamepads join as players in the order you first press a button on them, so
press a button on a controller after the page loads to make it P1.

On a phone or tablet the game gets touch controls: a d-pad, A, B, Start,
Select and ☰ for the pause menu, under the game in portrait and either side of
it in landscape (SPEC section 6.1).

Shell shortcuts:

| Key | Action |
|---|---|
| Esc | The pause menu over a running game: Resume, Restart, Controls, Volume, Library, Code editor (a gamepad: hold Select + Start; the mouse: the Menu button in the top left corner). In the editor, Esc runs the game (resuming it, or restarting it if the cart changed), and for a game started from the editor Esc goes straight back to the code. After an error, Esc opens the code at the failing line. |
| Backspace | Back to the Library from a running cart (also the Library button in the top left corner, or the browser's Back); choosing the same cart there resumes it |
| Ctrl+R | Restart the cart with the current code |
| Ctrl+S / Ctrl+Shift+S | Save / save as `.nova` |
| Ctrl+O | Open a `.nova` file or a `.nova.png` PNG cart |
| - / = (or +) | Turn the volume down / up in tenths while a cart runs (a square-law control, so each step sounds about equal); the level is remembered between visits and is separate from the cart's own `volume()` |
| M | Mute, or bring the volume back to where it was |
| F7 | Capture the current frame as the cart's label |
| F8 | Start or stop recording a clip (saved as WebM or GIF from the Cart tab) |
| F9 | Restart the cart and record its input; F9 again stops |
| F10 | Replay the recorded input from the same seed and save data |
| Ctrl+F | Find in the code editor (Enter / Shift+Enter for next / previous) |
| Ctrl+Z / Ctrl+Y | Undo / redo in the Sprites, Map and Palette tabs (the code editor uses the browser's own undo) |
| Ctrl+C / Ctrl+V | Copy / paste pixels (Sprites), a rectangle of map cells (Map) or a sub-palette (Palette) |
| P, F, L, R, S | Sprites tools: pencil, fill, line, rectangle, select. Map uses P, F and S. |
| H, V, T, Delete | Sprites: flip horizontally, flip vertically, rotate, clear |
| Z–M, Q–U | SFX and Music: enter notes from a two-octave piano; 1 enters a note-off, `[` / `]` change octave |
| Space | SFX and Music: play or stop |

In the Sprites and Map tabs, the left mouse button draws and the right button
picks a color (Sprites) or erases (Map); Alt+click in the Map picks up a tile.
Tile 0 is reserved and can't be drawn in.

Browsers start audio only after the first click or key press on the page.

The working cart autosaves to this browser every 10 seconds. Save data written
with `dset` is kept per cart (by title and author) in this browser.

## Recording

F8 records a clip of up to 30 seconds. The Cart tab previews it and saves it
as WebM (768×672 at 60 fps, with sound) or as a looping GIF (30 fps, 1–3×).
F9 records every frame of input from a fresh start; F10 replays it, and since
the console is deterministic the game plays out identically. Input recordings
can be saved and loaded as `.replay.json` files.

## PNG carts

The Cart tab exports the cart as a `.nova.png`: a picture of a cartridge with
the label on it and the whole game hidden in the pixels. Dropping it onto the
console plays it. A meter shows how full the PNG would be (up to 147,443
compressed bytes). Share PNG carts as files: sites that recompress images
destroy the data.

## Development

Pure ES modules, no build step and no runtime dependencies (the dev tools use Node 20 or later; the release and
smoke tools use Playwright with Chromium, and the audio scripts use Python 3). CI (`.github/workflows/check.yml`)
runs a syntax check on the console, the dev tools and the tests; checks that the documentation only mentions
files that exist; checks every cart against the console's limits; runs the starters' self-test and a
random-play soak run on every cart; and, on pull requests, verifies the carts the PR changes.

```sh
find src -name '*.js' -print0 | xargs -0 -n1 node --check    # the console's syntax check
```

Carts are built from `carts/src/<name>/` (code, metadata, tile art, audio and label) by a Node script:

```sh
node tools/pack.js carts/src/hello carts/hello.nova
```

After adding or repacking a cart, regenerate the Library's manifest (`carts/index.json`) and its label images
(`carts/labels/`):

```sh
node tools/library.js
```

### Making a cart

`docs/dev/playbook.md` is the guide to building a game: the workflow, the console's limits, how to test and
measure the audio, how to see the art, and the traps. Agents start with `CLAUDE.md`. The tools:

```sh
node tools/new-cart.js <name> "Title"      # a new cart: a working frame, tests, bot, audio script, spec template
node tools/new-cart.js <name> "Title" --kind puzzle   # or a whole small game of a kind (puzzle: match-3) to change into yours
node tools/verify.js                       # the carts you changed: audio, pack, checks, soak, docs, tests
node tools/check.js <name>                 # limits and common mistakes (--all for every cart)
node tools/test.js <name>                  # a cart's check scripts in tests/carts/<name>/
node tools/release.js <name>               # label, .nova.png, Library entry, checks
node tools/check-docs.js                   # the documentation mentions only files that exist
node tools/devkit/soak.mjs carts/<name>.nova                     # random play: exceptions, soft locks, frame time, wrong-voice effects
node tools/devkit/smoke.mjs <name>                               # the cart in the real console (headless Chromium)
node tools/devkit/sweep.mjs <name> --seeds 8                     # the cart's bot over many seeds: balance, stuck states
node tools/devkit/shots.mjs carts/<name>.nova out/ --at 60,300   # screenshots without a browser
node tools/devkit/tiles.mjs carts/<name>.nova out.png --from 0   # a contact sheet of tiles with their numbers
node tools/devkit/art/sprites.mjs carts/<name>.nova out.png      # the cart's sprites at their real sizes; art/scene.mjs shows a map region
python3 carts/src/<name>/art.py carts/src/<name>                 # a cart's tiles, palette and map, made in code with tools/devkit/art/kit.py
node tools/devkit/music/loud.mjs carts/<name>.nova --check       # each song's level, and the lead's loudness and entrance
```

The song toolkit (`tools/devkit/music/kit.py`) and the headless test harness (`tools/devkit/harness.mjs`) are
used by `carts/src/moto-crosser/audio.py` and `tests/carts/moto-crosser/`, which are the examples to start from.
