# {{TITLE}}: Cart Specification

**Version:** 0.1 (draft)
**Status:** Scaffolded: the frame of the game (title, play, pause, game over, top 10, records, sound cues) works; the game is a placeholder
**Cart source:** `carts/src/{{NAME}}/` → `carts/{{NAME}}.nova`

> Fill this in before building (docs/dev/playbook.md, section 1): ask the user the few design questions that change
> the game, choose sensible defaults for the rest, and write the rules with numbers. Delete this note.

---

## 1. Concept

TODO: what the game is, in a paragraph; what the player does, and what makes it fun.

## 2. Core loop

TODO: the loop the player repeats, and how a game ends.

## 3. Controls

| Button | Use |
|---|---|
| D-pad | TODO |
| A | TODO |
| B | TODO |
| START | Pause (RESUME, RESTART, QUIT TO TITLE) |

## 4. Screen layout

TODO: the 256 × 224 screen: what is on which layer (BG0 to BG2, sprites, overlay) and where the HUD goes.

## 5. The rules

TODO: the mechanics, with numbers (speeds, costs, timings, scores), so the tests can assert them.

## 6. Levels or content

TODO.

## 7. Opponents or hazards

TODO.

## 8. Modes

TODO.

## 9. Scoring

TODO.

## 10. Screens and flow

1. **Title:** PLAY, RECORDS.
2. **Play**, with a **Pause** (START): RESUME, RESTART, QUIT TO TITLE.
3. **Game over**, then **initials** if the score is in the top 10, then the **records**.

## 11. Audio

Songs: 0 the title, 1 the game. Channel 1 is for effects (the songs only carry the tempo on it); effects with noise
play on channel 4. TODO: the rest of the songs and effects, the cues (which song where). Levels: the lead alone at most
0.07 RMS and 0.75 of the mix, no vibrato, no jump of more than 1.5x where it enters (`node tools/devkit/music/loud.mjs
carts/{{NAME}}.nova --check`; playbook section 5).

## 12. Video layers

TODO: what is on BG0 to BG2, the sprites and the overlay. The art is made in code by `carts/src/{{NAME}}/art.py` (the art toolkit,
`tools/devkit/art/kit.py`); give the tile and sprite budget in section 14.

## 13. Persistence (save slots)

| Slots | Contents |
|---|---|
| 0 | Format version |
| 1 | Last initials entered |
| 10–39 | Top 10 scores, best first, 3 slots each: score, initials, 1 spare |
| 40–255 | Reserved |

## 14. Asset budget

| Asset | Budget |
|---|---|
| Code | TODO of the 64 KB limit (`node tools/check.js {{NAME}}`) |
| Tiles | TODO of 1,024 |
| Sprites | TODO (128 in OAM, 32 per line) |
| Songs / SFX | TODO |

## 15. Implementation plan

1. **Vertical slice:** the core mechanic playable on a test course, with the frame already in place (scaffolded).
2. **Core mechanics:** the rules of section 5.
3. **Opponents or hazards.**
4. **Content:** levels, tracks or stages.
5. **Flow:** modes, menus, saves and the records for the real game.
6. **Art pass.**
7. **Audio pass.**
8. **Balance and polish:** check with an automatic player, then the label, the PNG cart and the Library
   (`node tools/release.js {{NAME}}`) and a README row.

Each step: build it, run `node tools/check.js {{NAME}}` and `node tools/test.js {{NAME}}`, write its **Built** and
**Results** notes under its number here, commit and push.

## 16. Open questions

- TODO
