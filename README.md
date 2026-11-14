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
| M10 SNES effects: colour blending, brightness, windows and mosaic (`docs/dev/snes-picture.md`) | Done |

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
a cart, or opens a phone's share sheet. **Make your own game with AI**, at the top
of the Library, copies a prompt to paste into an AI agent (Claude Code, Codex,
Cursor) or a chat, which then makes a game with you from this repository. You can also drop a `.nova` file or a `.nova.png` PNG cart onto the page.

| Cart | Shows |
|---|---|
| `hello` | Overlay drawing, font, input from keyboard and up to 4 gamepads |
| `sprites` | OAM: sizes, flips, sprite palettes, priorities, 128-entry and 32-per-line limits |
| `parallax` | Three scrolling background layers, sub-palettes, tile priority |
| `water` | `scanline()` reflection with per-line wobble and palette swaps |
| `mode7` | Per-line BG2 affine perspective floor and sky gradient |
| `street` | The art kit's drawn figures: a 96 px brawler drawn in designed shapes on a skeleton, his frames streamed into tile memory as they play, his idle, walk, punch and kick animated from poses, on a night street after Streets of Rage 2 (LEFT/RIGHT, A, B) |
| `brawl` | Streets of Woe: a Streets of Rage style beat 'em up for one or two players, with drawn fighters streamed from the cart's ROM (a hero from the user's model sheet, five kinds of thug, the heavy Brute, three bosses): three stages (the street, the docks, the rooftop), a boss at the end of each, a thug for each stage, the knife-wielding Slasher, the bottle-throwing Chucker and the whip-cracking Lasher, three-hit combos with an uppercut, grabs, throws, a special, weapons, items and breakable crates (D-pad, A attack, B jump, X special, SELECT shows the hit boxes) |
| `franchise` | The Franchise: Basketball Edition: a front-office simulator for one general manager and 30 fictional teams, with a 58-game season and playoffs, live game nights (a court, a ticker, a box score), lineup, minutes and training, injuries, the salary cap and tax, ticket prices and the owner's patience, re-signing, free agency, a scouted draft and trades with the computer. The whole league is a function of a seed, so it fits the 1 KB save (D-pad, A, B, X, Y, L, R; START pauses) |
| `flow-state` | Flow State: a rhythm game to Bach and Beethoven with one button. A frog hops onto the lily pads that float down a river in perspective, one for each note of the melody (the Minuet in G, the Air on the G String, Für Elise, the Moonlight Sonata, the Badinerie); a flow meter instead of a game over, a multiplier that makes the river brighter and brings out fireflies, three difficulties, a map with unlocks and a calibration for the speakers' delay. The chart and the song are made from the same notes, so a pad is on its note to the frame (D-pad, A, B, START, SELECT) |
| `star-cadet` | Star Cadet Pinball: a pinball game on one tall scrolling table, in the spirit of the classic space-themed one. Pop bumpers, slingshots, two ramps (a shot at the right moment: a fast one flies over into an orbit), a spinner, drop and standup targets, a gate, a kickback, a ball save, an extra ball, nudging with a tilt; light three mission lamps and shoot the gate to start the mission of your rank, and rise from Cadet to Fleet Admiral through nine missions (a multiball at Admiral); the table's light and the music follow your rank. One to four players take turns, a top 10 with initials and a best rank are saved, and the title plays a demo by itself. The D-pad is the left flipper and A, B, X, Y the right one, one thumb each (D-pad, A, B, X, Y, L, R, START, SELECT) |
| `dungeon-crawl` | Dungeon Crawl Pinball: a pinball game on a tall, torchlit dungeon table of stone and lava, built from the user's own picture. The plunger's pull picks your ramp (a skill shot in the middle zone); take the keys from the two side cubbies to raise the portcullises on the x3 and x10 slots and cast a spell that multiplies every point for 30 seconds; clear four levels (bumpers, ramps, targets, cubbies), then fight the Pit Lord rising out of the lava in a three-ball multiball, and descend deeper, endlessly. A gong, a kickback in each outlane, treasure (a ball save, the kickbacks, an extra ball), dark orchestral music that grows heavier as you descend. One to four players take turns; a top 10 and the deepest level are saved. The D-pad is the left flipper; A, B, X and Y the right one and the small upper flipper |
| `ivory-tower` | The Ivory Tower: a calm, endless stacking game in the spirit of Stack. A slab of marble slides above the tower; tap to drop it, and whatever overhangs the slab below is sliced off and falls away; a drop dead on keeps the whole slab, and three in a row start to give width back. One player, any button drops (the D-pad, A, B, X, Y), START pauses. Five marbles, a sky from dawn to night with a landmark every ten floors (a banner and a chime for each), music that gains a layer as you climb, a demo on the title, a top 10 with initials and a saved best height |
| `vertical-fall` | Vertical Fall: a remake of Downwell. Fall down an endless well with guns on your boots: on the ground A jumps, in the air it fires straight down, which slows the fall; ammo refills only when you land. Stomp what is pale, shoot what is red, and chain kills in the air into combos that pay gems and hit points. Four areas (the Shaft, the Ossuary, the Cistern, the Deep), each its own colours and song, looping harder; levels built from hand-made chunks; nine kinds of enemy; six gun modules; ten upgrades at each level's floor; side rooms with shops, modules and gem caches where time stands still; a Daily well (one well a day for everyone) and a top 10 |
| `duel-at-the-stump` | Duel at the Stump, by Lucy: a knife-flipping duel for two players at a woodland stump. Hold A to charge and release to flip the knife; it must land tip first on the stump to stick. A power meter's green zones give one flip or two. Two players share one pad and alternate, ten throws each, with scores and streaks. A guest cart, added unchanged |
| `reversi` | Reversi, by Lucy: the classic disc-flipping board game on a green 8×8 board. Trap a line of the other colour to turn it to yours; gold dots mark the legal moves and rings preview the discs that will flip. Two players pass one pad, a turn with no move passes, and a rematch swaps colours. A guest cart, added unchanged |
| `showcase` | The art kit's SNES tools at work (docs/dev/snes-picture.md): two sculpted boxers in a ring, framed as Super Punch-Out!! (our hero from behind), with a receded crowd and HUD lettering, and a parallax valley under a sky gradient (LEFT and RIGHT) |
| `effects` | Colour blending, brightness, windows and mosaic: a see-through panel, shadows, light, water, fades, spotlights, an iris wipe, coloured glass and the mosaic, one page each (LEFT and RIGHT) |
| `chiptune` | A six-channel song and five sound effects on the old sound chip (a version-1 cart, kept as it was), all editable in the Music and SFX tabs |
| `sound-test` | The new sound chip: three songs through the echo unit, and every sampled instrument to play on its own (UP/DOWN and A; B turns the echo off) |
| `summit-rush` | The first real game: race one of seven AI models up three stages, with a title screen, a top-10 leaderboard, and music from the Summit Rush series. Also released as the PNG cart `summit-rush.nova.png` (see docs/carts/summit-rush.md) |
| `block-wizard` | A music-synced falling-block puzzle: climb the eight rooms of a wizard's tower, each with its own art and song, with the wizard gem, practice mode and a top-10 table; SELECT in play shows the sync check. Also released as the PNG cart `block-wizard.nova.png` (see docs/carts/block-wizard.md) |
| `planet-racers` | A Mode 7 Grand Prix where the racers are the eight planets: eight tracks, each with its own hazards (craters, acid pools, wet sand, crosswinds, ice chunks, ice sheets) and its own song after Holst's *The Planets*, three AI rivals a race, championship standings, a top-10 table with initials and a time trial; drift with L or R. Also released as the PNG cart `planet-racers.nova.png` (see docs/carts/planet-racers.md) |
| `smashy-smash` | A cartoon demolition Breakout: 16 stages in 4 worlds (the house, the factory, downtown, the castle), each with its own painted backdrop and song; wall, glass, steel and girder bricks; a paddle with a dash; seven power-up capsules (PLANK, NAILS, GLUE, TRIPLE, SLOW, WRECKER, HARD HAT); a stage-clear tally and a top-10 table with initials. Also released as the PNG cart `smashy-smash.nova.png` (see docs/carts/smashy-smash.md) |
| `alien-swarm` | A space tower defense: 8 maps on 4 planets (Luna Outpost, Frost Moon, Jungle World, The Hive), each painted in its planet's look with its own song, 15 waves each ending with the Queen; five towers (Blaster, Cannon, Laser, Freezer, Missile) with three levels and targeting modes, six aliens, a d-pad cursor with build and tower menus, fast-forward, calling waves early, stars, a hard mode and saved records. Also released as the PNG cart `alien-swarm.nova.png` (see docs/carts/alien-swarm.md) |
| `python-pass` | A snake game through a jungle and into a lost temple: 16 levels in 4 zones (the jungle, the riverbank, the ruins, the temple), each with its own walls, ground and animated colours, a snake drawn as tiles with a turn queue, fruit, golden fruit and combos, five power-ups (SLOW, GHOST, SHRINK, DOUBLE, SHIELD), boulders, scorpions and falling rocks, a level tally, extra lives, a saved top 10 with initials, and five songs and effects. Also released as the PNG cart `python-pass.nova.png` (see docs/carts/python-pass.md) |
| `moto-crosser` | An Excitebike-style dirt-bike racer: four lanes (UP and DOWN change lane), gas, turbo and an engine that overheats, tilting in the air to land on the slope, and ramps, bumps, hills, hurdles, mud, arrow strips and cooling pads. Race five CPU rivals in a Quick Race on one of three tracks (a stadium, a desert and a night mountain road, each with its own scenery and song) or take on the Championship: finish in the top 3 on each track, with points for places, time under par and a clean race, a podium, saved best times and a top 10 with initials. Also released as the PNG cart `moto-crosser.nova.png` (see docs/carts/moto-crosser.md) |
| `rags-to-riches` | A band-on-tour management game: Dot, Zorp and Spike have 10 weeks and $400 to raise $5,000 and save their rehearsal room. Each week pick one action: a concert (venue, ticket price and advertising, with a crowd forecast and a show on stage), writing songs (free, builds fans and freshness) or travel to one of five cities. Fans tire of a city you play too often. Five city hubs, a map, intro panels, a help with tips, a top 10 with initials and seven songs with twelve effects. Also released as the PNG cart `rags-to-riches.nova.png` (see docs/carts/rags-to-riches.md) |
| `ice-breakers` | A match-3 puzzle across twelve hand-made frozen levels: swap two gems, clear runs of three or more, and break the ice under and beside them. Each level has its own goal (break all the ice, collect a number of one colour, or reach a score) and a move budget, and the levels get harder with a faster song from level 7; the HUD shows the goal with a picture, a hint marks a good swap after six seconds, the ice cracks and falls in pieces with its own sounds, and the top 10 records the level reached (a game that clears all twelve is marked WON). Also released as the PNG cart `ice-breakers.nova.png` (see docs/carts/ice-breakers.md) |
| `lantern-keeper` | Lantern Keeper: a calm light-beam puzzle game. The great lamp of a lighthouse has gone out in a storm; carry the light up forty hand-checked rooms on four floors by moving and turning mirrors, splitters, prisms and coloured glass so the beams reach every lens (red and blue make magenta; a lens needs exactly its colour), with doors opened by lenses, black lenses that must stay dark, and dark rooms where only the light shows the way. Each room has a par proven by a solver, and a star for meeting it. Glowing additive beams, lamplight on the floor, rain and lightning, public domain music from Mutopia engravings (Debussy, Satie, Bach, Chopin, Grieg), a story and an ending; progress, best moves and stars are saved. D-pad moves, A picks up and drops, B turns, SELECT undoes |
| `riddlewick-manor` | Riddlewick Manor: a trivia adventure in a haunted manor, in the spirit of the 1990s encyclopedias' trivia mazes. Stand in a candlelit room, choose a door and knock: the ghost who keeps it (the Butler, the Librarian, the Cook, the Knight and more, each with a hat or prop) asks a question with four answers. Right, and the door opens for good; wrong, and it locks and your candle burns down. Find a way through a 7 x 6 manor laid out anew each run, with skeleton keys and candle stubs to find, to the Clock Room and Lady Riddlewick's last question. 1,440 questions written for the game, in eight subjects (or all) at four levels; never shut in, a run saved as you go (CONTINUE), a top 10 with level and subject, and Bach's Toccata and Fugue in D minor and Beethoven's Moonlight Sonata from public domain engravings. Also released as the PNG cart `riddlewick-manor.nova.png` (see docs/carts/riddlewick-manor.md) |
| `clockwork-dominion` | Clockwork Dominion: an incremental game in three acts, with a story. Marco, a little clockwork automaton, is wound up by the old clockmaker Paulo Benedetto in his shop in Rotella and told to make cogs. Sell them, set the price, buy brass from Signore Ferrese, build tinkers and workbenches, earn Paulo's trust, think and invent (gear riddles, the Banca di Rotella). Paulo's last words are "never let it wind down", and Marco takes them at their word: Act II winds the town, Tuscany, Italy and the World with diggers, foundries and cog mills on spring power, and a swarm that works or dreams; Act III sends clockwork moths to wind the stars into an orrery, against the Rust. Then the watch, and a choice: two endings, then new cycles with a gift and a changed rule. About four hours, saved as you go; seven cinematics; a turning Mode 7 globe and galaxy; music-box arrangements of eight public domain classics. Also released as the PNG cart `clockwork-dominion.nova.png` (see docs/carts/clockwork-dominion.md) |
| `tabletop-grand-prix` | Tabletop Grand Prix: a top-down toy-car racer for 1 to 4 players on one console (players 2 to 4 on gamepads, computer drivers in the empty seats). The camera follows the leader: drop off the screen, or off the edge of the table, and you are out of the round; the last car left scores, and the first to five points wins the race. Two cups of four tracks, the breakfast table on a red gingham cloth and the garage workbench on a cutting mat, with crumbs, milk, jam, oil, sawdust, rolling peas and ball bearings, a fan, ramps and jumps between tables; three levels of computer drivers with four characters; each player's colour and name, the Workshop cup to unlock, and public domain music (Lumbye, Suppé, Bellak, Grieg, Elgar). LEFT and RIGHT steer, A is the gas, B brakes; let go of the gas in a turn to slide |
| `royal-chess` | Royal Chess: straight chess on an inlaid maple and walnut board in a palace study, with carved ivory and ebony pieces. Play the computer at one of three gentle levels (BEGINNER makes mistakes on purpose, CASUAL is relaxed, STEADY thinks four moves ahead) as White, Black or a random side, or a friend on the same console (on one pad or two). Every rule of chess (castling, en passant, promotion, and draws by stalemate, repetition, fifty moves and too little material); the cursor picks a piece up and lights its legal moves; the captured pieces and who is ahead; a draw offer and resigning; a game in progress kept for CONTINUE; and Bach's Minuet in G and Sheep May Safely Graze from public domain engravings. Also released as the PNG cart `royal-chess.nova.png` (see docs/carts/royal-chess.md) |
| `tricksy-towerz` | A physics tower-building race for one to four players on one screen (a spiritual successor to *Tricky Towers*): seven tetromino pieces fall and are steered, turned and dropped, then stack under real rigid-body physics (they slide, tip and topple); the first tower to stay over the finish line for two seconds wins. Lobby where up to three more gamepads join by pressing a button and empty places are filled by computer wizards of four levels, a landing guide each person can switch off, a count of three, a wobble warning, a next-piece preview, a night scene with a wizard for each yard, four songs and thirteen effects, and a top 10 of the fastest wins with initials. Also released as the PNG cart `tricksy-towerz.nova.png` (see docs/carts/tricksy-towerz.md) |
| `operation-ironstorm` | A guest cart (by Independent Game Project): a jungle run-and-gun at dusk in the tradition of *Contra*. Run and jump across pits and ledges, shoot riflemen and heavy troopers, aim in eight directions, pick up five weapons from winged capsules and bring down the fortress commander's gunship. Three parallax layers with a waterfall, five songs. Also released as the PNG cart `operation-ironstorm.nova.png` (see docs/carts/operation-ironstorm.md) |
| `wick` | Wick: a precision platformer in the spirit of Super Meat Boy. Wick, a candle flame, runs, jumps and wall-jumps through one-screen rooms of a dark castle to light the lantern in each; his own light is all he sees by. One touch of water, steam, a swinging weight or the rain snuffs him out, and the next try starts in a third of a second. 49 rooms: ten and a chase in each of four worlds (the Dungeon's drips, the Laboratory's steam and rotten shelves, the Clock Tower's gears and pendulums, the Rooftops' wind and rain), each with its own colours and far wall, and the Chimney's five, opened by 12 of the 20 hidden embers. Every hazard keeps one clock, so a room is the same every try; each death leaves its soot, and a room cleared replays every try at once. In a chase room the Snuffer follows Wick's own path two and a half seconds behind. Best times, records and progress are saved; Bach and Scarlatti from public domain engravings on a harpsichord and an organ. Every room is cleared by a recorded run in the tests. Also released as the PNG cart `wick.nova.png` (see docs/carts/wick.md) |
| `neon-drift` | Neon Drift: a trance rhythm game down a neon wormhole. You are a diamond on the tunnel's rim; lights ride the tunnel out to the rim on the beat of five original trance tracks, and you glide round the rim (it drifts when you let go) to be under each one as it arrives. The tunnel is one BG2 picture zoomed a ring step a beat and rolled by one affine matrix, its rings coloured each frame by their radius, so it flows with the kick; three levels follow the kick, the offbeat or the arpeggio; a calibration for the speakers' delay; songs and charts from the same notes (D-pad, A, B, START, SELECT) |

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
