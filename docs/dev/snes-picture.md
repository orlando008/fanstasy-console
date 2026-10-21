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

`winpos(n, left, right)`: two windows, each a span of columns that can change on every line in `scanline()`
(spotlights, circles, diamonds, wipes, a letterbox). `winmask(target, { w0, w1, op })` hides a target inside the area
of window 0, window 1 or both (each `'in'` or `'out'`, combined by `'or'`, `'and'`, `'xor'` or `'xnor'`), as the SNES's
window logic does. Targets: each background layer, the sprites, the overlay, the blending (so a blend applies only
inside or outside a window) and the screen (black there).

### A3. Mosaic

`mosaic(size, layers)`: blocks of 1 to 16 pixels on the chosen background layers, for the SNES's pixelating transition.
Sprites, the overlay and the backdrop stay sharp, as on the SNES.

## Part B: art tools (`tools/devkit/art/kit.py`)

Built (the playbook's art section has the recipe; each module's header has the details). The user gave Super
Punch-Out!!, Streets of Rage 2 and Street Fighter II as the art to aim at: big characters shaded like sculpture in many
tones, backgrounds of materials (tiles, fences, paving, foliage) pushed back behind them, chunky gradient HUD lettering.

1. **Colour** (`colour.py`): OKLab, `ramp()` (hue-shifted, even, in the console's 5-bit colour, shadows that keep their
   chroma), `gradient()`, `mix()`, `recede()`; palettes that take ramps and `pal.step()`.
2. **Sculpting** (`sculpt.py`): figures from spheres, ellipsoids, capsules and reliefs, smooth blends, rendered with a
   light, a contrast curve, little dither, glossy highlights, cast shadows between parts, selective outlines and
   contours; parts in several palettes give one picture each.
3. **Shading and edges** (`shade.py`): `shaded()` for flat shapes, `outline_sel()`, `inline()`, `rim()`,
   `clean_lines()`, `despeckle()`, `mirrored()`, `recolour()`; `Img.from_rows(mirror=)`, `Art.variant()`.
4. **Textures** (`texture.py`): fifteen materials that repeat seamlessly, tileable noise, `variants()` that join in
   any order and `tile_fill()`.
5. **Scenery** (`scenery.py`): `sky()`, `stars()`, `orb()`, `clouds()`, `mountains()`, `hills()`, `treeline()`,
   `floor()` (perspective), `rope()`, `ellipse()` (a contact shadow); they wrap for scrolling layers.
6. **Big sprites and gradients** (`kit.py`): `art.big_sprite()` with a generated `bigSprite()`, `art.gradient()` with
   a generated `gradientLine()`; `sprites.mjs` shows big sprites.
7. **Lettering** (`lettering.py`): `big_text()`, `hud_bar()`, `frame()`, `scale2x()`.
8. **A quick look** (`preview.py`): a PNG from art.py of pictures, ramps and stacks of layers.
9. **Streamed animations** (`kit.py`): `art.stream()` loads a big character's frames into tile memory as they play,
   from the cart's ROM with `rom=True`.
10. **Drawn figures** (`draw.py`, `figure.py`): characters drawn as an artist designs them, in shapes of flat tone,
   with heads from templates of planes and bodies on the rig's skeleton (the way to draw characters; sculpting stays
   for round and glossy things).

## Part C: measuring it

5. **A "looks SNES" report** beside the colour report: flat-fill share, shades per hue in each sprite, black outlines,
   sprites over 16 px, layers in use and parallax. Calibrated on Operation Ironstorm and Tricksy Towerz (the SNES end)
   against Summit Rush and Python Pass (the NES end).
6. **Starter defaults**: a new game starts with a gradient sky, see-through panels and generated ramps.

## Part D: a demo cart

The `showcase` cart, made only with the part B tools: RINGSIDE (framed as Super Punch-Out!!: our hero sculpted from
behind in the foreground, his opponent a sculpted boxer in two palettes, breathing, over a
receded crowd with camera flashes, ropes, posts, a canvas with an emblem, HUD lettering and a subtracted shadow) and
VALLEY (a sky gradient line by line, clouds, snowy mountains, hills, trees and grass on three parallax layers). 939 of
1,023 tiles; 1,235 saved by sharing.

## How old carts keep working

- When no effect is on (no `blend`, brightness 15, no windows, no mosaic), the renderer runs the same code as before.
- A test renders every cart with the effects path forced on but set to change nothing, and compares it with the plain
  path, pixel for pixel; CI runs it.
- Before the first change, every cart's frames under random play were fingerprinted (18 carts, 2 seeds, 1,500 frames);
  the same run after the change must match.

## Progress

| Step | State | Notes |
|---|---|---|
| A1 | built | `blend()` and `brightness()` in `src/console/ppu.js` and `src/console/api.js` (SPEC 4.10, 4.9, 8); `tests/console/effects.mjs` (37 checks: each effect on a built scene, and every cart renders through the effects path as through the plain one) in CI; the fingerprints of every cart matched before and after (36 runs). The effects path costs up to 0.5 ms a frame more. Demo: the `effects` cart (see-through panel, shadows, light, water, fades). The playbook's art section says when to use them. |
| A2 | built | `winpos()` and `winmask()` (SPEC 4.11); in the tests (each target, inside and outside, the four ways to combine two windows, a window moved in `scanline()`); demo pages SPOTLIGHT, IRIS WIPE, COLOURED GLASS. |
| A3 | built | `mosaic()` (SPEC 4.12); in the tests (blocks of columns and of lines); demo page MOSAIC. The fingerprints of every old cart matched again. |
| B | built | Eight modules (above), each with self-tests in `tools/devkit/art/selftest.py` (the big sprite and the gradient are packed into a cart and checked on the console's screen). Existing carts' art scripts make the same files as before. |
| D | built | The `showcase` cart. |
| Details | built | `detail.py`: `face()` (side and front, four expressions, sized to the head), `hair()` (six styles in lit clumps; long hair hangs), `crease()`, `bunch()`, `stroke()`; a rig draws them in every frame (`face=`, `hair_style=`, `folds=`). The brawler preset got a bigger head, a shorter, thicker neck and deltoids. The `street` brawler uses all of it. |
| Rig | built | `rig.py`: a skeleton with presets (brawler, boxer, hero) dressed in sculpted shapes, poses as joint angles, `animate()` with easing and mirrored walk cycles, built-in WALK, PUNCH, KICK, GUARD, HIT, JUMP, a `filmstrip()` with onion skin and bones; `Art.animation()` (frames sharing their pieces; 8 px pieces where a 16 px one would be mostly empty, which also took the showcase from 939 to 881 tiles); `tools/devkit/gif.mjs`. The `street` cart: a brawler that walks, punches and kicks on a night street. |
| Drawn | built | `draw.py` (Canvas: designed shapes in flat tones, cel shadows, seams, exact ink, a tidy pass; `speckle()`) and `figure.py` (`head()` in four views (side, three-quarters, front, back) with four expressions and seven hair styles, from templates of planes; `Figure`, a drawn body on the rig's skeleton, by default cheated towards the camera as Streets of Rage and Street Fighter draw it (both shoulders, the chest square to us, the face three-quarters, the body twisting into a punch): limbs with muscle profiles, a chest, sleeves, a belt, fists, shoes, one shared outline colour). After the user's critique of the sculpted faces ("still blocky and strange"): characters are drawn, not lit. The `street` brawler is a Figure (speckle 0.08 to 0.13 over its 17 frames, mean 0.10, against 0.10 to 0.16, mean 0.13, for the sculpted one; at 64 px the gain is mostly in the shapes, which the number does not see; heads 32 px tall measure 0.04 to 0.06). |
| Stream | built | `art.stream()` and `streamSprite()`: an animation's frames loaded into a slot of tile rows as they play (only the tiles that changed), their pixels packed into code.js (runs copied from the row above, shared 8 x 8 tiles stored once). The `street` brawler is now 96 px (Streets of Rage 2 size): 128 tiles and 18.5 KB of the cart's ROM for 18 frames (`rom=True`; docs/dev/rom-plan.md), where big sprites would take 1,008 tiles. In the self-tests: a stream packed into a cart, two frames in one slot and a second slot, checked on the console's screen. |
| C | not started | |
