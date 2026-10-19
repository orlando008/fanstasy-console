# NOVA-16 — Fantasy Console Specification

**Version:** 0.1 (draft)
**Status:** Pre-implementation
**Name:** "NOVA-16" is a placeholder. Rename freely.

---

## 1. Overview

NOVA-16 is an imaginary 16-bit game console that runs in the browser. It has fixed, deliberate hardware limits in the spirit of a console that could have existed alongside the SNES. Games ("carts") are written in JavaScript against a small API and built entirely with tools included in the console: code, sprite, map, palette, sound and music editors.

A finished cart can be exported as a PNG image that holds the whole game. Dropping that image onto the console loads and runs it.

## 2. Design principles

1. **The limits are the product.** Resolution, colors, sprite counts, channels and code size are fixed. Features are only added if they fit inside the limits, and the limits are never raised to fit a feature.
2. **Pure JavaScript, no build step.** ES modules are served as static files. There are no frameworks, no bundlers, no transpilers and no third-party runtime dependencies. The repo root deploys directly to GitHub Pages.
3. **Deterministic core.** The same cart, the same random seed and the same per-frame inputs always produce the same frames. This enables replays, recording, and (later) rollback netplay.
4. **Carts are images.** The distribution format is a PNG with the cart data embedded in it.
5. **Everything is in the box.** Every asset type has a built-in editor. A cart never needs external tools.

## 3. Hardware specification

| Component | Specification |
|---|---|
| Display | 256 × 224 pixels, 60 Hz fixed timestep |
| Color RAM (CGRAM) | 256 entries, RGB555 (32 levels per channel) |
| Sub-palettes | 16 × 16 colors: 0–7 for backgrounds, 8–15 for sprites |
| Tile RAM (VRAM) | 1024 tiles, 8 × 8 pixels, 4 bits per pixel (32 KB) |
| Map RAM | 256 × 128 tile entries, 16 bits each (64 KB) |
| Background layers | 3 (BG0, BG1, BG2); BG2 supports affine (Mode 7-style) transforms |
| Sprites (OAM) | 128 per frame; sizes 8 × 8, 16 × 16, 32 × 32; 32 per scanline |
| Overlay | 256 × 224 8-bit immediate-mode drawing layer |
| Audio | 6 channels: 2 pulse, triangle, saw, noise, PCM sample |
| Sample RAM | 16 KB, 8-bit signed PCM |
| Input | Up to 4 pads, 12 buttons each |
| Code | 64 KB of JavaScript source (UTF-8 bytes) |
| Save data | 1 KB per cart (256 × 32-bit signed integers) |
| System font | Built-in 8 × 8 ASCII (32–126), not stored in VRAM |

## 4. Video (PPU)

### 4.1 Output

The PPU renders into a 256 × 224 RGBA image, one scanline at a time. The image is drawn to a canvas that the page scales by the largest integer factor that fits the window, using nearest-neighbor filtering (`image-rendering: pixelated`).

### 4.2 Color RAM

- CGRAM holds 256 colors in RGB555. Each channel 0–31 expands to 8 bits as `(v << 3) | (v >> 2)`.
- Entry 0 is the **backdrop color**, which fills any pixel no layer covers.
- Color 0 of every sub-palette is **transparent** for tiles and sprites.
- Background tiles choose sub-palette 0–7. Sprites choose sub-palette 8–15, which the API exposes as `pal` 0–7.
- The overlay addresses CGRAM directly with indices 1–255. Index 0 is transparent.

### 4.3 Tile RAM

- 1024 tiles, each 8 × 8 at 4 bpp, which is 32 bytes. Pixels are packed two per byte, with the high nibble on the left.
- The tile sheet is addressed as a 128 × 512 pixel image, 16 tiles wide by 64 tiles tall. Tile `n` sits at column `n % 16`, row `floor(n / 16)`.
- A 16 × 16 sprite at tile `n` uses tiles `n, n+1, n+16, n+17`. A 32 × 32 sprite uses the 4 × 4 block starting at `n`.
- **Tile 0 is the reserved empty tile.** It is always fully transparent: `sset` writes to it are ignored and loaders discard any pixels stored there. Because cleared Map RAM is all zeros, empty map entries draw nothing, so background layers can be visible by default without filling the screen.

### 4.4 Map RAM

Map RAM is a single 256 × 128 grid of 16-bit entries. Background layers view rectangular regions of it.

| Bits | Field |
|---|---|
| 0–9 | Tile index (0–1023) |
| 10–12 | Sub-palette (0–7) |
| 13 | Horizontal flip |
| 14 | Vertical flip |
| 15 | Priority (high or low; see 4.8) |

### 4.5 Background layers

Each layer (BG0, BG1, BG2) has this state:

| Property | Meaning |
|---|---|
| `mx, my, mw, mh` | Source rectangle in Map RAM, in tiles |
| `x, y` | Scroll offset in pixels |
| `wrap` | If true, the region tiles infinitely. If false, pixels outside it are transparent. |
| `show` | Layer visibility |

**Affine mode (BG2 only).** When enabled, BG2 samples the map through a 2 × 2 matrix. For screen pixel `(sx, sy)`:

```
px = sx + x - cx
py = sy + y - cy
mapX = a * px + b * py + cx
mapY = c * px + d * py + cy
```

The parameters `a, b, c, d, cx, cy` are quantized to 1/256 (8.8 fixed point) for determinism. Changing them per scanline in `scanline()` produces perspective floors.

### 4.6 Sprites (OAM)

- OAM is cleared automatically at the start of each frame. Each `spr()` call during `draw()` appends one entry.
- 128 entries per frame at most. Calls beyond that return `-1` and draw nothing.
- 32 sprites per scanline at most. Lower OAM indices win, and the rest are not drawn on that line. This flicker is intentional hardware behavior.
- Attributes are tile index, x (−32 to 287), y (−32 to 255), size (8, 16 or 32), palette (0–7), flipX, flipY, and priority (0–3).
- Among sprites of the same priority, a lower OAM index draws on top.

### 4.7 Overlay

The overlay is a 256 × 224 buffer of CGRAM indices for immediate-mode drawing: pixels, lines, shapes and text. Index 0 is transparent. `cls()` clears it. It always composites on top of everything else, so it works well for HUDs, debug output and effects.

### 4.8 Compositing order

From back to front:

1. Backdrop (CGRAM 0)
2. BG2, low-priority tiles
3. Sprites, priority 0
4. BG2 high-priority tiles, BG1 low-priority tiles
5. Sprites, priority 1
6. BG1 high-priority tiles, BG0 low-priority tiles
7. Sprites, priority 2
8. BG0 high-priority tiles
9. Sprites, priority 3
10. Overlay

### 4.9 Scanline rendering and the `scanline()` hook

When `draw()` returns, the PPU snapshots all video state, then renders lines 0–223 in order. If the cart defines `scanline(y)`, it is called before line `y` is rendered.

Inside `scanline()`, only these calls are allowed: `bgscroll`, `bg`, `affine`, `color`, `palcopy` and `t`, plus the pure math helpers (`flr`, `ceil`, `abs`, `sgn`, `mid`, `clamp`, `lerp`). Anything else throws an error. A change applies from that line onward and is **discarded at the end of the frame**, so every frame starts from the state `draw()` left behind.

Typical uses are wavy water (`bgscroll` with a sine offset per line), sky gradients (`color(0, ...)` per line) and Mode 7 floors (`affine` per line).

## 5. Audio (APU)

### 5.1 Channels

| Ch | Voice | Notes |
|---|---|---|
| 0 | Pulse | Duty cycle 12.5 / 25 / 50 / 75 % |
| 1 | Pulse | Duty cycle 12.5 / 25 / 50 / 75 % |
| 2 | Triangle | |
| 3 | Saw | |
| 4 | Noise | Long and short (metallic) modes |
| 5 | Sample | 8-bit PCM from Sample RAM |

Each channel has volume (0–15) and stereo pan (−1 to 1). Pitch covers C0–B7 (96 notes), equal temperament with A4 = 440 Hz.

The channel decides the voice. An instrument's waveform picks the pulse duty (`pulse12`, `pulse25`, `pulse50`, `pulse75`), the noise mode (`noise`, or `noise-short` for the metallic mode) or the sample (`sample` plus a sample slot); `triangle` and `saw` name their channels. `sfx(n)` with `ch = -1` uses a channel whose voice matches the instrument of the SFX's first note: a free one if possible, otherwise the one whose SFX started first.

### 5.2 Instruments

There are 32 instrument slots. Each has a waveform (and duty or sample index where relevant), an ADSR envelope in frames, base volume, vibrato depth and speed, and an optional fixed pan.

Attack, decay and release are lengths in frames (0–255) and sustain is a level (0–15). A note-off (`OFF` in a pattern) starts the release.

### 5.3 Patterns, songs and SFX

- **Timing.** 60 ticks per second. Speed is the number of ticks per row (default 6).
- **Patterns.** 64 patterns, each 64 rows × 6 channels. A cell holds a note, instrument, volume and effect plus parameter.
- **Songs.** 8 songs, each an order list of up to 128 pattern indices with a loop point. A song whose loop point is `null` plays once: at its end every note still sounding is released (it rings out through its release and stops).
- **SFX.** 64 slots. Each is a single-channel pattern of up to 32 rows with its own speed. A playing SFX temporarily takes over a channel, and music on that channel is muted until the SFX ends.

Pattern effects:

| Code | Effect |
|---|---|
| `0xy` | Arpeggio (base, +x, +y semitones) |
| `1xx` | Pitch slide up |
| `2xx` | Pitch slide down |
| `3xx` | Portamento to note |
| `4xy` | Vibrato (speed x, depth y) |
| `Axy` | Volume slide (up x / down y) |
| `Cxx` | Set volume |
| `Exx` | Note cut after xx ticks |
| `Fxx` | Set speed |

An effect lasts for the row it is on. Slides and portamento move 1/16 semitone per tick per unit of `xx`, starting on the second tick of the row. Vibrato (in `4xy` and in instruments) has a depth of `y`/8 semitones and advances `x`/64 of a cycle per tick. `Axy` changes the volume by (x − y)/4 per tick. `000` means no effect.

### 5.4 Samples

Sample RAM is 16 KB shared by up to 16 samples. Each sample has its own playback rate (default 16 000 Hz for C4) and optional loop start and end.

### 5.5 Implementation

All synthesis, mixing and sequencing run in an `AudioWorklet`, so timing is sample-accurate. The console sends commands such as "play SFX 3" or "start song 1" and never per-sample data. Audio is not part of the deterministic simulation.

## 6. Input

| Constant | SNES-style meaning | Default key (P1) | Standard gamepad |
|---|---|---|---|
| `UP` | D-pad up | ↑ | 12 / left stick |
| `DOWN` | D-pad down | ↓ | 13 / left stick |
| `LEFT` | D-pad left | ← | 14 / left stick |
| `RIGHT` | D-pad right | → | 15 / left stick |
| `A` | Right face button | X | 1 |
| `B` | Bottom face button | Z | 0 |
| `X` | Top face button | S | 3 |
| `Y` | Left face button | A | 2 |
| `L` | Left shoulder | Q | 4 |
| `R` | Right shoulder | W | 5 |
| `START` | Start | Enter | 9 |
| `SELECT` | Select | Shift | 8 |

- A gamepad becomes a player the first time one of its buttons is pressed, taking the lowest free player slot (0–3). Players keep their pad until it disconnects. The keyboard always feeds player 0.
- The left stick acts as a d-pad with a deadzone of 0.4.
- The main thread samples input once per frame and sends it to the console as a 12-bit mask per pad. Carts never read devices directly, which keeps input deterministic.
- `btnp` is true on the first frame of a press, then repeats after 15 frames, then every 4 frames.

## 7. Programming model

### 7.1 Lifecycle

```js
function init() {}        // once, after load
function update() {}      // 60 times per second
function draw() {}        // after each update; queue sprites, draw overlay
function scanline(y) {}   // optional; before each line is rendered
```

### 7.2 Execution environment

- The cart source runs in strict mode inside the console Web Worker, wrapped in a `Function` that receives the API as named parameters. The source sits inside a block in that function, so a cart may declare its own variables or functions with API names (for example `const START = 0`); these shadow the built-ins within the cart. A top-level `return` is not allowed.
- The source limit is 65 536 UTF-8 bytes. Larger carts refuse to run, and the editor shows a live byte counter.
- `Math.random` is replaced with the seeded PRNG (xoshiro128\*\*). Carts should use `t()` for time, not `Date`.
- The worker has no DOM access. The page's Content-Security-Policy (`connect-src 'self'`) blocks network requests to other sites.
- An uncaught error stops the cart and shows an error screen with the message and line number. Pressing Esc opens the code editor at that line.

### 7.3 Performance

The console measures how long `update + draw + render` takes each frame. If one frame goes over 16.6 ms, the game slows down, as it would on real hardware. If the clock falls more than 4 frames behind, it drops the backlog to avoid a spiral. `stat('cpu')` reports the last frame's time.

## 8. API reference

### System

| Function | Description |
|---|---|
| `t()` | Frames since the cart started |
| `rnd(n = 1)` | Float in [0, n) from the seeded PRNG |
| `rndi(a, b)` | Integer in [a, b], inclusive |
| `srand(seed)` | Reseed the PRNG |
| `stat(key)` | `'cpu'`, `'sprites'`, `'fps'`, `'frame'` |
| `log(...args)` | Print to the console's debug panel |

### Color

| Function | Description |
|---|---|
| `color(i, r, g, b)` | Set CGRAM entry `i` (channels 0–31) |
| `color(i)` | Get `[r, g, b]` for entry `i` |
| `palcopy(dst, src)` | Copy sub-palette `src` (0–15) into `dst` (0–15) |

### Tiles and maps

| Function | Description |
|---|---|
| `sget(x, y)` / `sset(x, y, c)` | Read or write a tile-sheet pixel (128 × 512 space, value 0–15). Tile 0 always reads 0. |
| `mget(x, y)` / `mset(x, y, entry)` | Read or write a Map RAM entry |
| `tile(n, pal = 0, fx = false, fy = false, pri = false)` | Build a map entry |

### Backgrounds

| Function | Description |
|---|---|
| `bg(layer, opts)` | Set any of `{ mx, my, mw, mh, x, y, wrap, show }` |
| `bgscroll(layer, x, y)` | Set the scroll offset |
| `affine(opts \| null)` | Enable BG2 affine mode with `{ a, b, c, d, cx, cy }`, or turn it off with `null` |

### Sprites

| Function | Description |
|---|---|
| `spr(n, x, y, opts)` | Queue a sprite. `opts`: `{ size: 8\|16\|32, pal: 0–7, fx, fy, prio: 0–3 }`. Returns the OAM index or `-1`. |

### Overlay

| Function | Description |
|---|---|
| `cls()` | Clear the overlay |
| `pset(x, y, c)` / `pget(x, y)` | Pixel |
| `line(x0, y0, x1, y1, c)` | Line |
| `rect(x, y, w, h, c)` / `rectfill(...)` | Rectangle |
| `circ(x, y, r, c)` / `circfill(...)` | Circle |
| `print(text, x, y, c)` | System font text. Returns the width in pixels. |
| `clip(x, y, w, h)` / `clip()` | Set or reset the overlay clipping rectangle |

### Audio

| Function | Description |
|---|---|
| `sfx(n, ch = -1)` | Play an SFX. `ch = -1` picks a free channel. `sfx(-1, ch)` stops one. |
| `music(song, pos = 0)` | Start a song at order position `pos`. `music(-1)` stops music. |
| `volume(v)` | Master volume, 0–1 |

### Input

| Function | Description |
|---|---|
| `btn(b, p = 0)` | True while button `b` on pad `p` is held |
| `btnp(b, p = 0)` | True on press, with auto-repeat |

### Persistence

| Function | Description |
|---|---|
| `dget(i)` / `dset(i, v)` | Read or write save slot `i` (0–255) as a 32-bit signed integer. Changes are saved automatically at the end of the frame. |

### Math helpers

`flr`, `ceil`, `abs`, `sgn`, `mid(a, b, c)`, `clamp(v, lo, hi)`, `lerp(a, b, t)`. The rest of `Math` is available as usual.

### Example cart

```js
let p = { x: 120, y: 100, dir: 1, f: 0 };

function init() {
  bg(0, { mx: 0, my: 0, mw: 64, mh: 28, wrap: true });
}

function update() {
  if (btn(LEFT))  { p.x--; p.dir = -1; }
  if (btn(RIGHT)) { p.x++; p.dir = 1; }
  if (btnp(A)) sfx(0);
  p.f = flr(t() / 8) % 4;
}

function draw() {
  cls();
  bgscroll(0, flr(p.x / 2), 0);
  spr(p.f * 2, p.x, p.y, { size: 16, fx: p.dir < 0 });
  print(`X ${p.x}`, 4, 4, 15);
}

function scanline(y) {
  if (y > 160) bgscroll(0, flr(p.x / 2 + Math.sin((y + t()) / 6) * 3), 0);
}
```

## 9. Cart formats

### 9.1 Source format: `.nova` (JSON)

This is the working and version-control format. It is plain JSON and is laid out to produce readable diffs.

```json
{
  "format": "nova16-cart",
  "version": 1,
  "meta": { "title": "", "author": "", "description": "" },
  "label": "<base64 PNG, 256x224, optional>",
  "code": "<JavaScript source>",
  "palette": ["7fff", "0000", "..."],
  "tiles": ["<128 hex digits per row, 512 rows; one digit per pixel>"],
  "map": ["<256 entries x 4 hex digits per row, 128 rows>"],
  "instruments": [ { "wave": "pulse25", "a": 0, "d": 4, "s": 10, "r": 6, "vol": 15, "vib": [0, 0], "pan": null } ],
  "patterns": [ { "rows": [ [ { "n": "C-4", "i": 0, "v": 15, "fx": "000" } ] ] } ],
  "songs": [ { "order": [0, 1, 1, 2], "loop": 1 } ],
  "sfx": [ { "speed": 4, "rows": [ { "n": "C-5", "i": 1, "v": 12, "fx": "000" } ] } ],
  "samples": [ { "rate": 16000, "loop": null, "data": "<base64>" } ]
}
```

- Palette entries are 4-digit hex RGB555 values: `0bbbbbgggggrrrrr`.
- Empty patterns, SFX and samples may be omitted or left `null`. Loaders must fill in defaults.
- A pattern row is an array of 6 cells, one per channel; an SFX's `rows` is an array of single cells. A cell is `null` when empty, and any of its fields may be omitted. `n` is a note such as `C-4` or `C#4`, or `OFF`.
- Loaders reject unknown `format` values and any `version` newer than they support.

### 9.2 Input recordings: `.replay.json`

A recording holds what is needed to reproduce a run exactly: `{ "format": "nova16-replay", "version": 1, "title", "seed", "save", "frames", "input" }`. `save` is the 1 KB of save data at the start (base64 of 256 little-endian int32s) and `input` is base64 of 4 little-endian uint16 pad masks per frame. Replays never write save data.

### 9.3 Distribution format: `.nova.png`

- A 512 × 384 PNG. Its visible image is a cartridge frame with the cart's label at the center (256 × 224 at x 128, y 44) and the title and author below it. Carts without a label show a "NO LABEL" placeholder.
- **Payload.** A header followed by the cart's minified `.nova` JSON, compressed with `CompressionStream('deflate-raw')`.
- **Header (13 bytes).** Magic `NV16` (4 bytes), format version (1 byte), payload length (uint32, big-endian), CRC32 of the payload (uint32, big-endian).
- **Encoding.** Bits go into the low 2 bits of R, G and B of each pixel, in row-major order. Each byte is split into four 2-bit groups, most significant first, filling R, then G, then B of one pixel before moving to the next. Alpha is always 255, which avoids premultiplication errors.
- **Capacity.** 512 × 384 × 6 bits = 147 456 bytes, so the maximum payload is 147 443 bytes. The export screen shows a capacity meter, and carts over the limit cannot be exported as PNG.
- **Decoding.** Use `createImageBitmap(blob, { colorSpaceConversion: 'none', premultiplyAlpha: 'none' })`, draw it to an `OffscreenCanvas`, then read with `getImageData`.
- **Encoding.** Draw the image, write the bits, then call `toBlob('image/png')`. Never add a color profile.
- **Sharing caveat.** Sites that recompress uploaded images (most social media) destroy the payload. Carts should be shared as raw files, for example on GitHub, itch.io, or Discord attachments.

## 10. Runtime architecture

```
┌──────────────── Main thread ────────────────┐
│ Shell UI + editors                          │
│ Frame clock (rAF + 60 Hz accumulator)       │
│ Input sampling (keyboard, Gamepad API)      │
│ Save data (localStorage)                    │
│ <canvas> → transferred as OffscreenCanvas ──┼──┐
└───────┬─────────────────────────▲───────────┘  │
        │ tick {frame, input}     │ audio cmds,  │
        │ load / pause / reset    │ save, log,   │
        ▼                         │ error, stat  │
┌──────────── Console worker ─────┴───────────┐  │
│ Cart sandbox + API                          │  │
│ Game state, PRNG                            │  │
│ PPU → putImageData on OffscreenCanvas ◄─────┼──┘
└─────────────────────────────────────────────┘
┌──────────── Audio worklet ──────────────────┐
│ Synth voices, mixer, sequencer              │
│ Receives commands relayed by main thread    │
└─────────────────────────────────────────────┘
```

### 10.1 Message protocol

| Direction | Message | Payload |
|---|---|---|
| main → worker | `init` | `OffscreenCanvas` (transferred) |
| main → worker | `load` | Parsed cart object, seed |
| main → worker | `tick` | `{ frame, input: Uint16Array(4) }` |
| main → worker | `pause` / `resume` / `reset` | |
| worker → main | `audio` | Array of commands for this frame |
| worker → main | `save` | `Int32Array(256)` when dirty |
| worker → main | `log` / `error` / `stat` | Text, error with line, frame stats |
| main → worklet | `loadAudio` | Instruments, patterns, songs, SFX, samples |
| main → worklet | `cmd` | Relayed audio commands |

### 10.2 PPU implementation notes

- Keep a `Uint32Array` view over the `ImageData` buffer and a 256-entry CGRAM → RGBA lookup table. Rebuild the table whenever `color` or `palcopy` runs, including mid-frame.
- Render one line at a time into a 256-entry line buffer of `{color index, priority tier}`, then resolve it to RGBA.
- Pre-decode 4 bpp tiles into a `Uint8Array` of one byte per pixel when VRAM changes, so the inner loop never unpacks nibbles.
- Sort the per-line sprite list once per frame by y-range so each line only checks sprites that overlap it.

### 10.3 Security model

Cart code runs in a dedicated worker with no DOM, no cookies and no `localStorage`. The page CSP restricts network access, and the main thread owns save data. The remaining accepted risk for v1 is that a worker can reach same-origin IndexedDB, so the console itself must not store anything sensitive there.

## 11. Built-in tools

The shell has two modes. **Run** shows the game full-screen. **Edit** shows the tabs below. Esc toggles between them, and Ctrl+R restarts the cart. In Run mode the player has a volume control of their own: `-` and `=` (or `+`) step it down and up in tenths, `M` mutes and restores it, and the level is remembered in the browser. It is a square-law gain after the whole APU (so every game is covered with no cart code), separate from the cart's `volume(v)`; clip recordings are taken before it. It does nothing in the editor.

| Tab | Features |
|---|---|
| Code | Lightweight custom editor (no dependencies): textarea with a syntax-highlight overlay, line numbers, find, byte counter against the 64 KB limit, jump-to-error |
| Sprites | Tile-sheet view, zoomed editor for 8/16/32 selections, pencil, fill, line, rectangle, select/move, flip/rotate, sub-palette picker, animation preview with frame range and speed |
| Map | Map RAM view with an overlay showing each BG layer's bounds, paint with the current sheet selection, per-entry palette, flip and priority, fill, rectangle copy/paste |
| Palette | 16 × 16 swatch grid, RGB555 sliders, sub-palette copy and paste |
| SFX | Single-channel tracker grid, keyboard-as-piano (Z–M lower octave, Q–U upper), live preview |
| Music | 6-channel tracker, order list editor, instrument editor with a live ADSR graph |
| Cart | Title, author and description; label capture (F7 while running grabs the current frame); export and import of `.nova` and `.nova.png` with a capacity meter |

**Saving.** Ctrl+S saves a `.nova` file using the File System Access API where available, with a plain download as the fallback. The working cart also autosaves to `localStorage` every 10 seconds. Save data and the working cart are kept under keys starting `nova16.`; a page served from a path containing `/pr/<n>/` (a pull request's preview, hosted next to the main site on the same origin) uses `nova16.pr<n>.` instead, so a preview never reads or overwrites the main site's saves. The volume level is shared.

### 11.1 Library

The **Library** is the console's home page: a shelf of cartridges for every
cart that ships with it. It is a third shell mode beside Run and Edit,
built in HTML like the editor, not inside the console.

- **When it shows.** Opening the page without `?cart=` shows the Library;
  `?cart=<name>` still boots that cart straight away. Backspace in Run mode,
  holding a gamepad's Select and Start together for about a second, or the
  Library button in the editor's bar returns to it, pausing the game.
- **The shelf.** Each cart is drawn as a cartridge, the same picture a
  `.nova.png` export makes: its label, title and author, or a NO LABEL plate.
  The selected cart's description shows below the shelf. The first slot is
  **Your cart**, the autosaved working cart, when there is one; after it come
  the carts in the manifest. **Open file** and **New cart** sit at the end of
  the shelf. Dropping a `.nova` or `.nova.png` onto the page still loads and
  runs it.
- **Controls.** Arrows or a gamepad's d-pad and left stick move between
  cartridges; Enter, Space or a gamepad's A, B or Start plays the selected
  one; the mouse picks and clicks. Choosing the cart that is already loaded
  resumes it where it was paused.
- **Opening a cart.** It loads exactly as `?cart=<name>` does, and the address
  bar changes to match, so a cart's link can be shared and the browser's Back
  button returns to the Library. Unsaved changes to the working cart are
  confirmed first, as when opening a file.
- **The manifest.** The page is static and can't list a folder, so the shelf
  comes from `carts/index.json`: each cart's file name, title, author,
  description and label image, and its `.nova.png` if one exists. Labels are
  copied out of the carts into `carts/labels/<name>.png`, so the shelf loads a
  few small images rather than every cart. `node tools/library.js` regenerates
  both from the `.nova` files in `carts/`: released games (carts with a
  `.nova.png`) first, then the rest, each by title.

## 12. Repository layout

```
/
├── index.html              # Shell page, CSP meta tag
├── style.css
├── package.json            # { "type": "module" } only, for node --check; no dependencies
├── src/
│   ├── main.js             # Boot and wiring: machine, shell, library, files, autosave
│   ├── library.js          # The Library: the home page's shelf of carts (11.1)
│   ├── machine.js          # Console worker lifecycle and 60 Hz frame clock
│   ├── files.js            # .nova save/open (File System Access API, download fallback)
│   ├── input.js            # Keyboard and gamepad sampling
│   ├── storage.js          # Save data and autosave
│   ├── console/            # Runs inside the worker
│   │   ├── worker.js       # Message handling, frame loop
│   │   ├── sandbox.js      # Cart compilation and API injection
│   │   ├── api.js          # Public cart API
│   │   ├── ppu.js          # Video state and scanline renderer
│   │   ├── font.js         # Built-in 8×8 font data
│   │   └── prng.js         # xoshiro128**
│   ├── audio/
│   │   ├── apu.js          # Main-thread side: AudioContext setup
│   │   ├── synth.js        # Voices, envelopes, effects, sequencer (no Web Audio)
│   │   └── worklet.js      # AudioWorklet running the synth at a 60 Hz tick
│   ├── formats/
│   │   ├── audio.js        # Audio data model, defaults, .nova audio sections
│   │   ├── cart.js         # Cart model, defaults, validation
│   │   ├── nova-json.js    # .nova read and write
│   │   └── nova-png.js     # .nova.png encode and decode
│   ├── record/
│   │   ├── clip.js         # Clip capture: WebM via MediaRecorder, frames for GIF
│   │   ├── gif.js          # GIF encoder with per-frame color tables
│   │   ├── replay.js       # Input recordings
│   │   └── webm-duration.js # Adds the duration MediaRecorder leaves out
│   ├── editors/
│   │   ├── shell.js        # Tabs, run/edit switching
│   │   ├── code.js
│   │   ├── highlight.js    # Line-by-line JS syntax highlighting
│   │   ├── sprite.js
│   │   ├── map.js
│   │   ├── palette.js
│   │   ├── sfx.js
│   │   ├── music.js
│   │   ├── audio-base.js   # Shared SFX/Music tab plumbing
│   │   ├── instrument.js   # Instrument panel with ADSR graph and sample import
│   │   └── cart.js
│   └── ui/                 # Shared widgets (buttons, grids, sliders)
│       ├── dom.js          # Element-building helpers
│       ├── history.js      # Undo/redo: changed elements, or snapshots of edited units
│       ├── tracker.js      # Tracker grid shared by SFX and Music
│       ├── pixels.js       # RGB555 conversion and tile-sheet drawing
│       └── sheet-view.js   # Tile-sheet picker shared by Sprites and Map
├── carts/                  # Demo and game carts (.nova, .nova.png), index.json and labels/ for the Library
│   └── src/<name>/         # A cart's source: code.js, meta.json, tiles.txt, palette.txt, map.txt, audio.json (made
│                           #   by audio.py where there is one; tiles.txt, palette.txt, map.txt, art.json by art.py), label.png
├── tests/console/          # Checks of the console itself (node tests/console/volume.mjs in headless Chromium; node tests/console/song-end.mjs)
├── tests/carts/<name>/     # A cart's check scripts (NN-*.mjs: 01-flow, 02-art ...), its lib.mjs and its bot.mjs for the sweep tool
├── tools/                  # Dev tools; see docs/dev/playbook.md for what each is for
│   ├── pack.js             # Builds a .nova from carts/src/<name>/
│   ├── library.js          # Regenerates carts/index.json and carts/labels/
│   ├── new-cart.js         # Scaffolds a new cart (code, art.py, audio.py, tests, spec) from templates/cart/ or a kind in templates/kinds/ (--selftest checks them)
│   ├── verify.js           # Verifies the carts changed since origin/main: audio, pack, checks, soak, tests
│   ├── check.js            # Limits and common mistakes in a cart; the .nova.png must hold the packed cart
│   ├── test.js             # Runs a cart's check scripts one at a time
│   ├── release.js          # Label (F7), .nova.png export, Library index and checks in headless Chromium
│   ├── check-docs.js       # Documentation may only mention files that exist
│   ├── templates/cart/     # The starter's files ({{NAME}}, {{TITLE}} placeholders)
│   ├── templates/kinds/    # A whole game for a kind of game (puzzle); --kind <kind> on new-cart.js
│   └── devkit/             # Headless harness, soak, smoke, sweep, shots, tiles, PNG-cart reader; music/: song toolkit, loudness, lead lowering; art/: art toolkit, scene and sprite viewers
├── docs/
│   ├── SPEC.md             # This document (the cart-facing API is section 8)
│   ├── carts/<name>.md     # Each game's specification, with its build notes
│   └── dev/playbook.md     # How to build a cart: workflow, tools, limits, audio rules, traps
├── CLAUDE.md               # Short notes for agents, pointing to the playbook
└── .github/workflows/
    └── check.yml           # Syntax, cart checks, the starters' self-test, soak runs; verify on pull requests
```

## 13. Development conventions

- Use native ES modules everywhere. Module workers and AudioWorklets need HTTP, so `file://` will not work. Serve locally with `python3 -m http.server` or any static server.
- Deploy with GitHub Pages from the repository root on `main`.
- Keep modules small and single-purpose. Every cart-facing API function has a JSDoc comment; the cart-facing API reference is section 8 of this document.
- The console itself is validated by syntax only: CI runs `node --check` on every `.js` file in `src/`.
- Carts are validated by tools (docs/dev/playbook.md): `tools/check.js` (limits, voices, the PNG cart, the spec),
  `tools/devkit/soak.mjs` (random play), `tools/new-cart.js --selftest` and `tools/verify.js` (the carts a pull request
  changes, with their tests). `tools/check-docs.js` keeps the documentation's file and tool-flag references true.

```yaml
name: check
on: [push, pull_request]
jobs:
  syntax:   # node --check on src/, tools/ and tests/; the documentation's file references
  carts:    # check.js --all, the starters' self-test, soak.mjs --all
  verify:   # pull requests only: tools/verify.js for the carts the PR changes
```

## 14. Milestones

| # | Milestone | Scope | Done when |
|---|---|---|---|
| M1 | Boot | `index.html`, worker, OffscreenCanvas, frame clock, CGRAM, overlay primitives, system font, input | A hardcoded cart moves a rectangle at 60 fps with keyboard and gamepad |
| M2 | Sprites | VRAM, OAM, `spr()`, sizes, flips, priorities, per-line limit, `.nova` loading | An animated sprite cart loads from a `.nova` file |
| M3 | Backgrounds | Map RAM, BG0–2, scrolling, wrap, tile priority, full compositing order | A three-layer parallax demo runs |
| M4 | Raster effects | `scanline()` hook, BG2 affine mode | Water-wobble and Mode 7 floor demos run |
| M5 | Shell and code editor | Run/edit modes, code editor, error screen, save/load `.nova`, autosave | A cart can be written, run, broken, fixed and saved without leaving the console |
| M6 | Graphics editors | Sprite, map and palette tabs | A demo cart's art is made entirely in-console |
| M7 | Audio | Worklet synth, instruments, SFX, patterns, songs, SFX and music tabs | A demo cart has in-console music and sound effects |
| M8 | Persistence and PNG carts | `dget`/`dset`, label capture, `.nova.png` export and import | An exported PNG dropped onto a fresh page boots the game with saves working |
| M9 | Recording | Input recording and replay (seed + inputs), WebM capture with audio, GIF export | A 10-second clip exports as both WebM and GIF |

## 15. Non-goals for v1

- Mouse or touch input for carts (the editors use the mouse)
- Online multiplayer. The deterministic core leaves room for rollback netplay later.
- Raw memory `peek`/`poke`
- 3D beyond affine BG2
- A mobile-friendly editor layout
- Multiple code files per cart
- Cycle-accurate emulation of any real hardware

## 16. Open decisions

- The final name of the console.
- Whether to add a second, smaller 4 × 6 font to the overlay.
- ~~How GIF export handles frames whose mid-frame palette changes produce more than 256 distinct colors.~~ Decided: every GIF frame has its own local color table, and only frames with more than 256 colors are median-cut quantized.
- Whether `peek`/`poke` arrive in v2 over a defined memory map.
