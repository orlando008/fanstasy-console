# Operation Ironstorm: Cart Specification

**Version:** 5.4b
**Status:** Released: a guest cart, made outside this repository and added to the Library as it came (`tools/unpack.js`); also as the PNG cart `carts/operation-ironstorm.nova.png`
**Cart source:** `carts/src/operation-ironstorm/` → `carts/operation-ironstorm.nova`
**Author:** Independent Game Project

---

## 1. Concept

A side-scrolling run-and-gun through a jungle at dusk, in the tradition of *Contra*. A commando runs right across
2240 pixels of jungle, jumping pits and platforms, shooting riflemen and heavy troopers, and picking up weapons, to
reach the fortress at the end and its commander.

- **Genre:** run-and-gun (the Library's Arcade shelf).
- **Players:** 1.
- **Lives:** 3, with 5 hit points each. A fall into a pit costs a life at once. One checkpoint, halfway (x 1035).

## 2. Controls

| Button | Keyboard | Action |
|---|---|---|
| D-pad left / right | arrows | run |
| D-pad up / down | arrows | aim up, or down while in the air (diagonals with left or right); down on the ground crouches |
| A | X | jump |
| B | Z | fire (hold) |
| X, Y or Select | S, A, Shift | next weapon |
| Start | Enter | start, and the game's own pause |

## 3. The game

- **Weapons:** rifle, spread (three shots), rapid, laser (2 damage) and rocket (4 damage and a blast), picked up along
  the way (four pickups, 100 points each) or cycled with the weapon button.
- **Enemies:** 14 along the way: riflemen (3 hits, 100 points) and heavy troopers (6 hits, 250 points, sometimes a
  3-round burst). They patrol, chase the commando when he is near and fire aimed shots.
- **The boss:** the fortress commander enters at x 1940 and clears the field: 55 hit points, aimed five-shot spreads,
  a ring of shots below 45% health and faster fire as he weakens (5000 points). Beating him wins the mission.
- **Screens:** title, play with a HUD (hit points, lives, score, weapon), the game's own pause, mission failed and
  mission complete.
- **Art:** drawn in code with the overlay (sprites as run-length rows), with parallax jungle layers; no tiles or map.
- **Audio:** one song in 4 orders and 11 sound effects on 5 instruments.

## 4. Asset budget

| Asset | Use |
|---|---|
| Code | 31.2 KB of the 64 KB limit |
| Tiles, map, palette | none (the default palette) |
| Audio | 5 instruments, 3 patterns, 1 song, 11 SFX |
| Save slots | none |

## 5. Results

Added to the Library unchanged from the author's cart: `node tools/unpack.js` turned the `.nova` into this source
folder and checked that it packs back to the same cart; the label is the author's own. The console's smoke test (12 s
of random presses) runs it at 60 fps with no errors.
