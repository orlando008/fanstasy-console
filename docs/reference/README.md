# Reference art

Drawings the user made for the art kit to learn from (October 2026). The kit does not paste them into games: it traces
them into templates (`tools/devkit/art/trace.py`), so what an artist decided (where a face's shadows fall, how hair
clumps, a character's proportions) shapes every head and figure the kit draws, at any size, in any colours.

| File | What it is | What uses it |
|---|---|---|
| `heads-neutral.png` | One head, three-quarters and profile, in five flat tones (base, shadow, deep shadow, light, line) | `templates/heads.json`: `head(style='shaggy')`, neutral |
| `heads-expressions.png` | The same head angry, hurt and shouting, in both views | `templates/heads.json`: the expressions |
| `fighter-model-sheet.png` | A 96 px fighter: the model, front, three-quarter, side and back views, a guard and a punch, the palette and proportions | the figure's proportions, outfit and fighting poses (in progress) |

`heads/` holds the pixel grids recovered from the head drawings: the drawings are upscaled pictures, so
`trace.recover_grid()` finds the size of an art pixel and reads each cell as the nearest of the reference's colours
(`trace.HEAD_COLOURS`: '.' empty, 'o' line, 'd' and 'h' dark browns, 'S' darker shadow, 's' shadow, 'b' base, 'l'
light). Neutral heads came out 94 % clean (a cell of 10.5 px); the expression sheet is not on one exact grid (5.4 to 6.1
px a cell) and its grids are rougher, the shouting heads most of all (cropped at the neck).

To rebuild the templates after changing a grid or a landmark:

    python3 tools/devkit/art/templates/build.py

Its landmarks (eye line, chin, ear) are read off the neutral grids, and each expression is laid over the neutral head
of its view with `trace.align()`; both are written in `build.py`, so the build does not depend on PIL.
