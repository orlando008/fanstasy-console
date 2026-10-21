# An SNES picture: plan and progress

The NOVA-16's picture hardware matches a Super Nintendo's in its numbers (256 x 224, 15-bit colour, 16 palettes of 16,
4 bpp tiles, three layers and a Mode 7 layer, 128 sprites), but the games still read more like NES games: big flat
areas, opaque black menu boxes, small sprites with few shades and black outlines, and little depth. Part of that is the
hardware: the effects that make SNES games look like SNES games (colour math, windows, mosaic) were missing. Part is
the art: the tools draw what an agent asks for, and nothing pushes it towards the SNES look. This document is the plan
for both, and the record of how far the work has got. Read it before working on the PPU, the art tools or a game's art
upgrade.

Decided with the user (October 2026):
- **Console features first**: colour blending, then mosaic and windows; then the art tools, the measures and a demo.
- **Old carts look exactly as they did.** A cart that does not call the new functions renders pixel for pixel as before;
  a check proves it (below).
- Upgrading a game's art comes later, one game at a time, when the user chooses.

## Part A: console features

### A1. Colour blending (SNES "colour math")

`blend({ layers, op, half, color })` makes some pixels translucent; `blend(null)` turns it off.

| Option | Meaning |
|---|---|
| `layers` | which pixels are translucent: `'bg0'`, `'bg1'`, `'bg2'` (every pixel of the layer), `'spr'` (sprites in palettes 4 to 7, as on the SNES, so a game mixes solid and see-through sprites), `'back'` (the backdrop), `'overlay'` (overlay pixels drawn in colours 192 to 255, the CGRAM of sprite palettes 4 to 7) |
| `op` | `'add'` (default): the translucent pixel plus what is below it, for glows, fire, light; `'sub'`: minus, for shadows and darkness |
| `half` | halve the result: with `'add'`, a 50 % mix (water, glass, ghosts, see-through panels) |
| `color` | `[r, g, b]` (0 to 31): blend with this fixed colour instead of what is below, for tints, flashes and fades to white |

The maths is done on the 5-bit channels and clamped (0 to 31), as on the SNES. "Below" is the next pixel down in the
compositing order (SPEC 4.8), or the backdrop. Only one level blends: a translucent pixel over a translucent pixel
mixes with that pixel's own colour. The overlay blends with the finished picture under it.

`brightness(level)`: the whole picture, overlay included, from 0 (black) to 15 (full, the default), as the SNES's master
brightness. For fades to black.

Both can be called in `scanline()`, so blending or brightness can change down the screen (a water line, a lit window).
Both hold from frame to frame until changed, like `bg()` and `affine()`.

### A2. Windows

Two windows, each a span of columns that can change on every line in `scanline()` (spotlights, circles, wipes, a
letterbox). Each layer, the sprites, the overlay and the blending can be masked inside or outside a window, or a
combination of both. Designed when A1 is done.

### A3. Mosaic

`mosaic(size, layers)`: blocks of 1 to 16 pixels on the chosen background layers, for the SNES's pixelating transition.
Designed when A1 is done.

## Part B: art tools (`tools/devkit/art/kit.py`)

1. **Palette ramps**: a 5- or 6-step ramp from one colour, shadows cooler and highlights warmer, even steps in OKLab.
2. **Shading helpers**: shading from a light direction, outlines coloured from the sprite's own ramp, anti-aliased
   corners, dithering and gradient fills, ground tiles that vary so a big area is not flat.
3. **Bigger sprites**: 48 and 64 px characters made of several sprites, and the code that draws them.
4. **Scene helpers**: a sky gradient (the `scanline()` code generated), parallax layers.

## Part C: measuring it

5. **A "looks SNES" report** beside the colour report: flat-fill share, shades per hue in each sprite, black outlines,
   sprites over 16 px, layers in use and parallax. Calibrated on Operation Ironstorm and Tricksy Towerz (the SNES end)
   against Summit Rush and Python Pass (the NES end).
6. **Starter defaults**: a new game starts with a gradient sky, see-through panels and generated ramps.

## Part D: a demo cart

One screen that shows all of it, to judge in the pull request preview.

## How old carts keep working

- When no effect is on (no `blend`, brightness 15, no windows, no mosaic), the renderer runs the same code as before.
- A test renders every cart with the effects path forced on but set to change nothing, and compares it with the plain
  path, pixel for pixel; CI runs it.
- Before the first change, every cart's frames under random play were fingerprinted (18 carts, 2 seeds, 1,500 frames);
  the same run after the change must match.

## Progress

| Step | State | Notes |
|---|---|---|
| A1 | built | `blend()` and `brightness()` in `src/console/ppu.js` and `src/console/api.js` (SPEC 4.10, 4.9, 8); `tests/console/effects.mjs` (20 checks of the maths, and every cart renders through the effects path as through the plain one) in CI; the fingerprints of every cart matched before and after (36 runs). The effects path costs up to 0.5 ms a frame more. Demo: the `effects` cart (see-through panel, shadows, light, water, fades). The playbook's art section says when to use them. |
| A2 | not started | |
| A3 | not started | |
| B, C, D | not started | |
