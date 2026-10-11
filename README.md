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
| M7-M9 Audio, PNG carts, recording | Not started |

The full cart API from SPEC section 8 is callable. `sfx`, `music` and `volume`
queue commands but make no sound until the audio milestone.

## Running locally

Module workers and AudioWorklets need HTTP, so `file://` will not work. From
the repository root:

```sh
python3 -m http.server 8000
```

Then open <http://localhost:8000/>. Pick a demo cart with `?cart=<name>`, and
pin the random seed with `?seed=<n>`. You can also drop a `.nova` file onto
the page. Without `?cart=`, the console reopens your autosaved working cart.

| Cart | Shows |
|---|---|
| `hello` (default) | Overlay drawing, font, input from keyboard and up to 4 gamepads |
| `sprites` | OAM: sizes, flips, sprite palettes, priorities, 128-entry and 32-per-line limits |
| `parallax` | Three scrolling background layers, sub-palettes, tile priority |
| `water` | `scanline()` reflection with per-line wobble and palette swaps |
| `mode7` | Per-line BG2 affine perspective floor and sky gradient |

Keyboard: arrows = d-pad, X = A, Z = B, S = X, A = Y, Q = L, W = R,
Enter = Start, Shift = Select.

Shell shortcuts:

| Key | Action |
|---|---|
| Esc | Switch between the game and the editor. Leaving the editor resumes the game, or restarts it if the cart changed. After an error, Esc opens the code at the failing line. |
| Ctrl+R | Restart the cart with the current code |
| Ctrl+S / Ctrl+Shift+S | Save / save as `.nova` |
| Ctrl+O | Open a `.nova` file |
| Ctrl+F | Find in the code editor (Enter / Shift+Enter for next / previous) |
| Ctrl+Z / Ctrl+Y | Undo / redo in the Sprites, Map and Palette tabs (the code editor uses the browser's own undo) |
| Ctrl+C / Ctrl+V | Copy / paste pixels (Sprites), a rectangle of map cells (Map) or a sub-palette (Palette) |
| P, F, L, R, S | Sprites tools: pencil, fill, line, rectangle, select. Map uses P, F and S. |
| H, V, T, Delete | Sprites: flip horizontally, flip vertically, rotate, clear |

In the Sprites and Map tabs, the left mouse button draws and the right button
picks a color (Sprites) or erases (Map); Alt+click in the Map picks up a tile.
Tile 0 is reserved and can't be drawn in.

The working cart autosaves to this browser every 10 seconds.

## Development

Pure ES modules, no build step and no runtime dependencies. CI runs a syntax
check on every source file:

```sh
find src -name '*.js' -print0 | xargs -0 -n1 node --check
```

Demo carts are built from `carts/src/<name>/` (code, metadata and tile art) by
a Node script:

```sh
node tools/pack.js carts/src/hello carts/hello.nova
```
