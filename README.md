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

## Running locally

Module workers and AudioWorklets need HTTP, so `file://` will not work. From
the repository root:

```sh
python3 -m http.server 8000
```

Then open <http://localhost:8000/>. Pick a demo cart with `?cart=<name>`, and
pin the random seed with `?seed=<n>`. You can also drop a `.nova` file onto
the page, or a `.nova.png` PNG cart. Without `?cart=`, the console reopens your
autosaved working cart.

| Cart | Shows |
|---|---|
| `hello` (default) | Overlay drawing, font, input from keyboard and up to 4 gamepads |
| `sprites` | OAM: sizes, flips, sprite palettes, priorities, 128-entry and 32-per-line limits |
| `parallax` | Three scrolling background layers, sub-palettes, tile priority |
| `water` | `scanline()` reflection with per-line wobble and palette swaps |
| `mode7` | Per-line BG2 affine perspective floor and sky gradient |
| `chiptune` | A six-channel song and five sound effects, all editable in the Music and SFX tabs |
| `summit-rush` | The first real game, in progress: playable end to end: title, model select, three stages (Base Camp, the Treeline, the Summit), and a top-10 leaderboard (see docs/carts/summit-rush.md) |

Keyboard: arrows = d-pad, X = A, Z = B, S = X, A = Y, Q = L, W = R,
Enter = Start, Shift = Select.

Gamepads join as players in the order you first press a button on them, so
press a button on a controller after the page loads to make it P1.

Shell shortcuts:

| Key | Action |
|---|---|
| Esc | Switch between the game and the editor. Leaving the editor resumes the game, or restarts it if the cart changed. After an error, Esc opens the code at the failing line. |
| Ctrl+R | Restart the cart with the current code |
| Ctrl+S / Ctrl+Shift+S | Save / save as `.nova` |
| Ctrl+O | Open a `.nova` file or a `.nova.png` PNG cart |
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

Pure ES modules, no build step and no runtime dependencies. CI runs a syntax
check on every source file:

```sh
find src -name '*.js' -print0 | xargs -0 -n1 node --check
```

Demo carts are built from `carts/src/<name>/` (code, metadata, tile art and
audio) by a Node script:

```sh
node tools/pack.js carts/src/hello carts/hello.nova
```
