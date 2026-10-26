# AI Sprite Engine — Implementation Specification

**Status:** Experimental / MVP specification  
**Purpose:** Give an AI coding agent a reproducible way to author, render, animate, inspect, and revise 16-bit-era beat-'em-up sprites without requiring manual pixel drawing.  
**Primary visual reference:** *Streets of Rage 2* (Genesis-era aesthetic); target the visual language, not copyrighted character designs or ripped game art.

## 1. Objective

Build a local, deterministic sprite-production engine that accepts **text-authored assets** and exports transparent PNG frames, sprite sheets, and animated previews. Prototype and compare three authoring methods:

1. **ASCII:** one character per logical pixel.
2. **Layered ASCII:** reusable body-part pixel grids, positioned and composited per frame.
3. **Polygons:** flat-color vector polygons rasterized to a low-resolution pixel grid, optionally with pixel-grid corrections.

An AI agent should be able to edit only textual source, invoke a single CLI command, inspect the resulting images, and iteratively improve them. **No cloud AI service or model API is required inside the engine**: the external coding/vision agent supplies generation and critique. Optional automated integrations can be added later.

## 2. MVP boundaries and assumptions

- **Runtime:** Python 3.11+ with Pillow; use PyYAML for human-authored manifests. Keep the dependency list small.
- **Platform:** Windows-first development, cross-platform execution.
- **Logical canvas:** 96 × 112 pixels per frame by default; configurable per asset. The visible fighter should be ~80–100 pixels tall.
- **Palette:** indexed semantic palette with a maximum of 24 visible colors per character by default; transparent pixel is not counted as a color.
- **Pixel fidelity:** integer coordinates, no antialiasing, nearest-neighbor preview enlargement, no smoothing.
- **Outputs:** per-frame RGBA PNGs, a PNG spritesheet plus JSON metadata, an animated GIF for quick review, a contact sheet PNG, and a machine-readable validation report.
- **Content:** create one original, unarmed street-fighter test character. Start with a stationary guard pose before attempting walk or punch animation.
- **Out of scope for MVP:** Blender integration, skeletal inverse kinematics, automatic text-to-sprite generation by a built-in LLM, procedural motion synthesis, game engine integration, asset marketplaces, sophisticated image-quality scoring, and multi-character libraries.
- **No requirement to simulate actual Genesis/SNES hardware limits.** The target is a convincing 16-bit aesthetic rather than strict hardware compliance.

## 3. Repository structure

```text
ai-sprite-engine/
  README.md
  pyproject.toml
  src/sprite_engine/
    __init__.py
    cli.py
    schema.py
    palettes.py
    raster.py
    compose.py
    formats/
      ascii.py
      layered.py
      polygon.py
    animation.py
    export.py
    validate.py
    metrics.py
  assets/
    fighter_ascii/
      sprite.yaml
      idle.txt
    fighter_layered/
      sprite.yaml
      parts/
        head.txt
        torso.txt
        upper_arm.txt
        forearm.txt
        hand.txt
        pelvis.txt
        leg.txt
        boot.txt
    fighter_polygon/
      sprite.yaml
  output/                 # gitignored generated files
  tests/
    test_ascii.py
    test_layers.py
    test_polygons.py
    test_animation.py
    test_export.py
    fixtures/
  docs/
    authoring-guide.md
    comparison.md
```

The suggested structure may be adjusted to fit the repository, but preserve a clear separation between **source formats, rasterization, validation, and export**.

## 4. Shared asset manifest

Each character project has `sprite.yaml`. All three methods must use the same canvas, palette and metadata semantics.

```yaml
schema_version: 1
id: fighter_a
name: Fighter A
method: ascii            # ascii | layered | polygon
canvas: [96, 112]        # [width, height] in logical pixels
pivot: [48, 108]         # foot-ground pivot, in canvas coordinates
transparent: "."
palette:
  K: "#23202C"          # near-black outline
  S: "#C98D69"          # skin base
  H: "#E9B795"          # skin light
  D: "#865440"          # skin shadow
  J: "#365D87"          # jacket base
  j: "#223D60"          # jacket shadow
  P: "#444450"          # pants base
  p: "#292A34"          # pants shadow
  W: "#EEE6D7"          # eye/highlight
animations:
  idle:
    loop: true
    frames:
      - {source: idle.txt, duration_ms: 150}
```

**Schema rules**

- `id` is a stable slug; `schema_version` is required.
- All color keys must be **single distinct printable non-whitespace characters**, except the reserved transparent character; keys are case-sensitive. Every nontransparent character appearing in a grid must exist in the palette. Hex values are `#RRGGBB` or `#RRGGBBAA`; for MVP require all palette entries other than transparency to be fully opaque.
- Paths are relative to the manifest's directory. Reject absolute paths or traversal outside the asset directory.
- `canvas`, `pivot`, frame duration, layer order, and methods are explicitly validated; no silent dimension truncation or unknown-color replacement.
- RGB colors are stored in an RGBA render buffer; transparent pixels have alpha 0.
- Coordinates use origin **top-left**, x increases right, y increases down; canvas bounds are `0..width-1`, `0..height-1`.
- `pivot` means the point placed at the character's ground contact when imported into a game. Keep pivots identical across frames of the same animation unless explicitly changed.
- Each frame has `duration_ms` > 0. Duration is stored precisely in JSON; GIF timing may be rounded to its supported granularity and must not be the timing authority.

## 5. Method A — direct ASCII grid

Each `.txt` contains a contiguous rectangular pixel grid, one Unicode-independent ASCII symbol per pixel. Example (12 × 8 illustration only):

```text
...KKKKKK...
..KJJJJJJK..
.KJjJJJJjJK.
.KSSKSSKSSK.
.KSHSSSSHSSK.
..KSSDDSSK..
...KPPPPK...
....KKKK....
```

**Implementation rules:**

- Read as UTF-8 but permit only single-byte printable ASCII grid symbols. Normalize CRLF/LF when parsing.
- Preserve trailing `.` characters (no `strip()` of each line). Ignore at most one final empty line created by a terminal newline.
- All rows must have identical width. For `method: ascii`, grid dimensions **must match canvas dimensions exactly**; otherwise report the actual and expected dimensions and fail.
- Never silently pad, crop, scale, infer missing colors, or trim whitespace.
- Draw one logical output pixel for every source symbol; `.` means RGBA `(0,0,0,0)`.
- Allow multiple source files for animation frames.

## 6. Method B — layered ASCII parts

The character comprises independent rectangular ASCII grids with transparent backgrounds. A frame describes an ordered list of part instances and explicit placements.

Illustrative manifest fragment:

```yaml
method: layered
parts:
  head: {source: parts/head.txt}
  torso: {source: parts/torso.txt}
  upper_arm: {source: parts/upper_arm.txt}
  forearm: {source: parts/forearm.txt}
  hand: {source: parts/hand.txt}
  pelvis: {source: parts/pelvis.txt}
  leg: {source: parts/leg.txt}
  boot: {source: parts/boot.txt}
animations:
  idle:
    loop: true
    frames:
      - duration_ms: 150
        layers:
          - {part: leg, at: [35, 63]}
          - {part: boot, at: [34, 93]}
          - {part: pelvis, at: [35, 60]}
          - {part: torso, at: [31, 34]}
          - {part: upper_arm, at: [25, 40]}
          - {part: forearm, at: [18, 51]}
          - {part: hand, at: [15, 60]}
          - {part: head, at: [39, 12]}
```

**Implementation rules:**

- Each part's text grid is rectangular, but it does **not** have to match the full canvas.
- The sequence in `layers` is **back-to-front**; later layers overwrite earlier layers only where their alpha is nonzero.
- Reuse the same part multiple times with different placements if desired.
- Negative placements or positions extending beyond the canvas are **validation errors by default**. An explicit `allow_clip: true` on a layer permits intentional clipping, which must still be reported as a warning.
- `at: [x, y]` means the grid's top-left source pixel maps exactly to that destination pixel. No implicit alignment or auto-centering.
- MVP transforms: translation only. For rotated arms or alternative viewpoints, provide alternate part grids as separate source files. **Do not** claim arbitrary rotation without implementing deterministic pivot, rasterization, and nearest-neighbor rules.
- Shared part references must be deterministic: the same source and placement render identically in every frame.
- Include at least one frame with both arms and both legs, demonstrating deliberate draw order and occlusion.

## 7. Method C — polygon-based rasterization

An agent authors simple filled polygons in **canvas-space integer coordinates**, with explicit render order. Polygon features are meant to express larger flat shading planes efficiently.

Illustrative fragment:

```yaml
method: polygon
animations:
  idle:
    loop: true
    frames:
      - duration_ms: 150
        shapes:
          - type: polygon
            color: K
            points: [[31, 35], [59, 35], [65, 65], [28, 67]]
          - type: polygon
            color: J
            points: [[34, 38], [57, 38], [61, 62], [31, 64]]
          - type: polygon
            color: j
            points: [[32, 54], [40, 57], [38, 62], [31, 64]]
```

**Implementation rules:**

- Draw shapes sequentially in list order; last opaque shape wins.
- The supported MVP primitive is a filled polygon with 3+ integer point coordinates and a semantic palette key.
- Define the exact rasterization implementation and pin the Pillow dependency version for repeatable results. Use the same rasterizer for all polygon examples and tests.
- Antialiasing, gradients, floating-point scaling, arbitrary curves and blurred shadows are prohibited in MVP.
- Support transparent background and an optional final `overrides` grid (ASCII-sized full canvas, with `.` meaning **no override** rather than erasure). This permits selective exact-pixel cleanup above polygon fills. If transparent erasure is needed, define an explicit separate erase token; do not overload `.` ambiguously.
- Intentional off-canvas shapes require an explicit `allow_clip: true`; otherwise validation fails.
- Document polygon edge behavior (including shared edges) with golden-image fixtures; do not assume that two rasterizers produce the same boundary pixels.

## 8. Frames, animation and alignment

- Every render produces a fixed-size full-canvas RGBA image, even when most pixels are transparent.
- **Frame bounds:** record the tight nontransparent bounding box `(x, y, width, height)` in metadata, but never use it to crop frames unless an explicit future export option is added.
- **Pivot:** keep the feet anchored at the same ground baseline for idle/walk/punch frames, unless a pose intentionally leaves the ground.
- **Timing:** animation frames have individual durations. An idle can be 4 frames with subtle shoulder movement, while attacks can hold contact frames for different lengths.
- **Facing direction:** author only facing-right in MVP. A game can mirror exported frames later; do not bake mirroring into the MVP output unless it is clearly tagged.
- **Motion/registration tests:** validation should flag unexpected large changes in bounding box, centroid or foot position across adjacent idle frames, but flag them as warnings rather than hard failures (attacks and jumps legitimately move).

## 9. CLI and outputs

Provide a command-line entry point `sprite-engine` with commands equivalent to:

```bash
sprite-engine validate assets/fighter_ascii/sprite.yaml
sprite-engine render assets/fighter_ascii/sprite.yaml --out output/fighter_ascii
sprite-engine render assets/fighter_layered/sprite.yaml --out output/fighter_layered
sprite-engine render assets/fighter_polygon/sprite.yaml --out output/fighter_polygon
sprite-engine compare output/fighter_ascii output/fighter_layered output/fighter_polygon --out output/comparison
```

`render` should automatically validate first and fail with nonzero exit status on invalid inputs. Artifacts per character:

```text
output/fighter_ascii/
  frames/idle_000.png
  frames/idle_001.png
  ...
  spritesheet.png
  spritesheet.json
  idle.gif
  contact_sheet.png
  validation.json
```

**Spritesheet rules**

- Use a deterministic row-major layout with one cell per full-size frame (MVP can use a single row); avoid automatic trimming.
- Metadata records `schema_version`, character ID, canvas size, pivot, each animation's loop flag, and for each frame: sheet rectangle, duration_ms, animation name, frame index and visible-pixel bounds.
- A consumer must be able to reconstruct each full RGBA frame from `spritesheet.png` + `spritesheet.json` without guessing placement or duration.
- `contact_sheet.png` shows labeled frames against a neutral checkerboard, scaled 3× or 4× by nearest neighbor. The checkerboard exists only in preview images, never on exported gameplay sprite assets.
- GIF exports must preserve pixelated edges and transparent background when possible; exact color reproduction and alpha behavior are verified with PNG outputs, not GIF.
- Stable output names and ordering. Re-rendering unchanged assets with the same engine/library versions produces pixel-identical PNGs.

## 10. Validation and diagnostics

Hard errors:

- Invalid YAML/schema, unsupported method, missing referenced part/file, unsafe relative path.
- Missing/duplicate/conflicting palette symbol, unknown grid symbol, malformed row widths.
- Mismatched ASCII canvas size, invalid dimensions, bad coordinates, invalid frame durations, empty animations.
- Off-canvas part or polygon if clipping was not explicitly allowed.
- Unsupported transforms/options (fail rather than ignoring).

Warnings (include structured JSON codes and actionable messages):

- Sprite touches canvas edge or has a suspiciously small/nonexistent visible area.
- Palette usage exceeds configured target, or too many rare one-pixel colors/isolated pixels.
- Idle frame foot/bounds jump noticeably; rendered frames unexpectedly identical.
- Layer overlap hides a large portion of an intended visible body part.
- Explicit clipping, unusual deviations from target height, or missing outline clusters.

Validation must return an exit code and write structured findings with severity, asset, animation/frame, and location where relevant. Do not present aesthetic heuristics as proof that a sprite looks good.

## 11. Automatic visual review loop (external agent)

The engine itself remains deterministic. The **AI agent orchestrates**:

1. Write/edit `sprite.yaml`, text grids, or polygon source.
2. Run `sprite-engine validate` and fix all hard failures.
3. Render sprite frames and a magnified contact sheet.
4. Inspect **the rendered PNG**, not only the source text. Check silhouette, 3/4 perspective, readable head/hands/feet, consistent costume, tonal grouping and feet alignment.
5. Record specific defects: e.g., "right fist merges into chest" or "rear leg reads as a single column." Avoid vague critiques.
6. Make localized source edits; preserve the palette, reference proportions, baseline, and already successful areas.
7. Re-render and compare before/after images. Repeat with a fixed limit (e.g. **up to 5 revision rounds per pose**), keeping the best version.

**Important:** A coding agent may not actually have image-reading abilities in every runtime. If it cannot inspect the resulting PNG, it should report that and stop claiming to have performed a visual review. Text-only validation is not a substitute for visual inspection.

### Suggested aesthetic review rubric (human or vision-model assessed)

Score each category 1–5 and save a short justification:

| Category | Question |
|---|---|
| Silhouette | Is the pose instantly understandable at 1×? |
| Anatomy | Do the head, limbs, hands and feet read plausibly? |
| Character consistency | Are the same proportions, clothing and face maintained? |
| Shading | Do flat shadow and highlight clusters describe volume? |
| Pixel discipline | Are there intentional clusters rather than noisy isolated pixels? |
| Animation | Is motion readable, stable and well-timed? |

Automated geometry metrics can support this rubric but **cannot reliably replace visual judgment**.

## 12. Controlled A/B/C experiment

The initial goal is **to learn which representation works best**, not to build a full animation suite immediately.

### Phase 1 — engine foundation

Implement strict manifest parsing, palette management, ASCII renderer, deterministic PNG export, CLI, validation and unit tests. Create a tiny synthetic test image to prove exact symbol-to-pixel mapping.

**Gate:** A valid 16 × 16 ASCII fixture renders byte-identically to a checked-in golden PNG. Invalid widths and undefined palette keys fail clearly.

### Phase 2 — all three formats

Implement layered composition and polygon rasterization plus a shared frame/output pipeline. Provide small fixtures that prove compositing order, transparency and polygon boundaries.

**Gate:** Each method outputs identical **canvas geometry, metadata conventions and artifact types**. Re-rendering produces identical pixel data.

### Phase 3 — single-pose comparison

Create the **same original fighter** at one facing-right three-quarter guard pose in three versions. Use one canonical design brief and the same palette, canvas, size, costume and ground pivot:

- ~96 pixels visible height, 96 × 112 canvas.
- 12–24 visible colors, bold outlines and 3–5 flat tones per material.
- Distinct head, torso, two fists, two legs and boots; recognizable near/far limb overlap.
- Avoid source art tracing or using existing commercial game characters.

Record the time/iteration count, source character count, finished PNG size, visible color count, and qualitative visual review for each approach. **Do not claim one approach won unless the comparison actually supports it.**

**Gate:** Three visually reviewable PNG previews plus `docs/comparison.md` stating strengths, failures, and preferred next method with reasons.

### Phase 4 — minimal animation trial

Take the highest-potential method (or a hybrid) and create:

- `idle`: 4 frames with subtle motion.
- `punch`: 5 frames (wind-up, extension, contact, retract, return), variable timing.

Use sprite-sheet metadata, contact sheet and GIF to inspect consistency. Prefer explicit pose variants over naive limb rotation when pixel quality suffers.

**Gate:** Frames are aligned, identifiable, export correctly, and produce an animation the agent can inspect. Document any unresolved visual artifacts rather than pretending they are fixed.

## 13. Test requirements

At minimum, tests must cover:

1. Exact palette lookup and alpha transparency.
2. Rectangular ASCII parsing, newline normalization and trailing dots.
3. Unknown characters, malformed widths and missing files.
4. Part placement, back-to-front occlusion and intentional clipping behavior.
5. Polygon boundaries, ordering and exact-pixel override semantics.
6. Out-of-bounds and invalid coordinate handling.
7. Identical full-canvas frame dimensions and pivot metadata.
8. Individual frame durations and loop state in JSON.
9. PNG sprite-sheet reconstruction matching individual frames pixel-for-pixel.
10. Determinism across two renders in the same pinned environment.
11. Clear nonzero CLI failure status plus machine-readable validation errors.
12. No aliasing or non-palette colors in gameplay PNG output.

Run `pytest` in CI if the repository supports it; otherwise provide `python -m pytest` instructions and demonstrate a local passing run.

## 14. Acceptance criteria / definition of done

The prototype is complete when:

- All three authoring methods are supported from documented text assets.
- One command validates/renders each character and produces individual PNGs, sprite sheet, JSON, GIF and contact sheet.
- Invalid input fails early with precise, actionable error messages.
- Same source produces the same pixel output in a pinned environment.
- Exported PNG frames are transparent, palette-restricted and crisp at any integer scale.
- All formats produce consistent pivot, canvas and animation metadata.
- A single original fighter has been produced as the **same design** in each of the three methods.
- An explicit side-by-side comparison explains which method is most suitable for automated sprite production.
- The chosen method has a working idle and punch animation prototype.
- Tests pass; the README explains setup, the three formats, exact CLI usage, and how an AI agent should run the review loop.

## 15. Implementation guidance for the coding agent

- Favor clear, maintainable code over general-purpose engine architecture.
- Use Pillow for image operations; do not introduce Blender, Node, game engines, browser infrastructure or remote APIs for this proof of concept.
- Implement formats behind a simple common interface returning full-canvas RGBA frames. Keep export logic format-agnostic.
- Keep source files readable and easy for an LLM to modify. Comments are welcome in YAML, but ASCII grids must contain pixels only.
- Pin dependencies and document exact commands to recreate golden test outputs.
- Preserve source assets; place generated data under `output/`.
- Prefer explicit errors over clever repair logic.
- **Focus first on visual evidence.** A successful CLI is not evidence that the character looks good.
- If delivery scope becomes too large, finish Phases 1–3 with tests and report Phase 4 as pending rather than shipping unverified animation code.

## 16. Handoff request for the agent

> Build the experimental AI Sprite Engine described in this specification. Do not just implement renderers: generate and render an original beat-'em-up fighter with all three methods and objectively compare their outputs. Start with strict parsing and deterministic rendering, then validate export and metadata, then perform visual comparisons, and finally attempt a 4-frame idle and 5-frame punch using the preferred method. Show the rendered previews, include commands to reproduce everything, list tests executed, and explicitly report any visual inspection that could not be completed. Avoid copyrighted character likenesses and do not expand into a game engine.
