# Reference art

Drawings the user made for the art kit to learn from (October 2026). The kit does not paste them into games: it traces
them into templates (`tools/devkit/art/trace.py`), so what an artist decided (where a face's shadows fall, how hair
clumps, a character's proportions) shapes every head and figure the kit draws, at any size, in any colours.

| File | What it is | What uses it |
|---|---|---|
| `heads-neutral.png` | One head, three-quarters and profile, in five flat tones (base, shadow, deep shadow, light, line) | `templates/heads.json`: `head(style='shaggy')`, neutral |
| `heads-expressions.png` | The same head angry, hurt and shouting, in both views | `templates/heads.json`: the expressions |
| `fighter-model-sheet.png` | A 96 px fighter: the model, front, three-quarter, side and back views, a guard and a punch, the palette and proportions | the figure's proportions, outfit and fighting poses (in progress) |
| `dungeon-crawl-table.webp` | The user's picture of the Dungeon Crawl Pinball table (October 2026): the layout (two curling ramps, the side cubbies with keys, the x3 and x10 slots behind gates at the top, the upper flipper, the lava pit with the levels and the Boss), the colours and the mood | `docs/carts/dungeon-crawl.md`: the table's layout (section 4) and the look (sections 6 and 12) |

`ai-sprite-engine-spec.md` is a specification the user supplied for a text-authored sprite engine (ASCII grids, layered
parts, polygons; a review loop and a rubric). The art kit has taken its useful ideas rather than building it: strict
grids (`Img.from_rows(strict=True)`), exact-pixel patches with an explicit erase (`Img.patch()`), a frame review
(`review.py`: edges, noise, colours, feet that hop, stalled animations), and the revision loop and rubric in the
playbook. Not taken: the PNG-and-JSON sprite sheet export (a NOVA-16 cart packs tiles, palettes and ROM), and the
standalone Python and Pillow project.

`fighter/` holds the guard and the punch of the model sheet, read off its own pixel grid (a cell of 4.4 to 4.7 sheet pixels:
the grids score 0.88 and 0.90 for clean cells) with `trace.recover_grid()`, snapped to the sheet's 11 colours
(`trace.BODY_COLOURS`), tidied of one- and two-pixel noise and stripped of the pale halo round the figure
(`trace.strip_halo()`): `python3 tools/devkit/art/templates/poses.py`. They are the user's drawing, not my shapes: much
closer to the sheet than a figure built from the kit. The faces came out dark (the eye sockets and brows merge) and
need a hand clean.

`heads/` holds the pixel grids recovered from the head drawings: the drawings are upscaled pictures, so
`trace.recover_grid()` finds the size of an art pixel and reads each cell as the nearest of the reference's colours
(`trace.HEAD_COLOURS`: '.' empty, 'o' line, 'd' and 'h' dark browns, 'S' darker shadow, 's' shadow, 'b' base, 'l'
light). Neutral heads came out 94 % clean (a cell of 10.5 px); the expression sheet is not on one exact grid (5.4 to 6.1
px a cell) and its grids are rougher, the shouting heads most of all (cropped at the neck).

To rebuild the templates after changing a grid or a landmark:

    python3 tools/devkit/art/templates/build.py

Its landmarks (eye line, chin, ear) are read off the neutral grids, and each expression is laid over the neutral head
of its view with `trace.align()`; both are written in `build.py`, so the build does not depend on PIL.
