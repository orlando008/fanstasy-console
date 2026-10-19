# Workflow wishlist

Tooling, documentation and process that would make building games for the NOVA-16 faster and the games better. It came
from an evaluation of the repository after the Tricksy Towerz polish pass (October 2026).

**How to use it.** Pick an item, build it, and tick its box in the same pull request: `- [x]` plus the PR link and the
date. Then add the new tool or rule to `docs/dev/playbook.md` (and `CLAUDE.md` if every agent needs it). If an item is
dropped, strike it through and say why. Paths below that do not exist yet are proposals. This file sits outside `docs/`,
so `node tools/check-docs.js` does not check it.

**Why these items.** Every problem the user raised in the Tricksy Towerz polish was invisible to the automated checks:
- a note held for ever on the initials screen (a console bug, in three released games);
- muddy brown and grey panels;
- songs that sounded basic;
- pieces that arrived too fast to steer.

The tools measure against limits and bots, not against how a person experiences the game. So most of this list closes
that gap.

---

## 1. Close the loop with a real player (highest value)

- [ ] **A headless replay tool** (`tools/devkit/replay.mjs`).
  - **What:** run a `.replay.json` recorded in the console (seed, save and every pad press; SPEC 9.2) in the harness, and
    output screenshots at chosen frames or on every state change, a state timeline, and the audio log.
  - **Why:** the user records the moment ("this note never stops", "no time to turn it") and hands it to an agent, who
    then sees exactly what the user saw. The console records replays already; no tool reads them.
  - **Notes:** the harness already drives four pads (`vm.step(mask, [m1, m2, m3])`) and takes a save.
- [ ] **A hosted build.**
  - **What:** a GitHub Pages deploy of `main`, and a preview build for each pull request.
  - **Why:** playing a branch today means running a local web server. With a preview link, the user plays a change on
    any device before it merges, and feedback comes per PR instead of after release.
- [ ] **A playtest log in each game's spec.**
  - **What:** a section in `docs/carts/<name>.md` (and in the starter's spec template) listing what the player
    reported, when, and what was changed.
  - **Why:** every spec says "nobody has played it"; the log keeps the human feedback in the document the next session
    reads.

## 2. Tune for people, not just bots

- [ ] **A pacing section in the playbook.**
  - **Rule:** the difficulty comes from decisions, not reflexes.
  - **What else:** reaction windows by genre (time to place a piece, warning before a hazard, time to read a menu), and
    "a button to speed up beats a fast default".
  - **Why:** Tricksy Towerz was tuned so a bot's race took about a song. That left a person about a second to steer a
    piece, and nothing flagged it.
- [ ] **"Feel" numbers in the bot's results.**
  - **What:** the bot reports the time a player has to act, such as seconds from spawn to landing or warning time before
    a hazard; `sweep.mjs` prints it next to win rates; the spec states a target for each.
  - **Done when:** the starter's bot and spec template have it.

## 3. Audio: measure what a listener notices

- [ ] **A held-note detector** (in `tools/devkit/music/loud.mjs --check` or `tools/check.js`).
  - **What:** flag any voice sounding longer than a few seconds, and anything still sounding after a song that plays
    once ends.
  - **Why:** it would have caught the stuck note in Tricksy Towerz, Rags to Riches and Summit Rush before a person heard
    it. The console bug is fixed (`tests/console/song-end.mjs`), but a cart can still hold a note for too long.
- [ ] **A monotony report** (in `loud.mjs`, information first, then limits once calibrated):
  - **Level spread:** the spread of section levels; every Tricksy Towerz section sat at 0.08.
  - **Repetition:** the number of distinct bars and patterns.
  - **Length against screen time:** the loop length against how long the screen that plays it usually lasts; a 26 s race
    song looped through races of 40 to 60 s.
- [ ] **A piano-roll picture of a song** (`tools/devkit/music/roll.mjs`).
  - **What:** a PNG of every channel's notes over time, with the sections marked.
  - **Why:** an agent can see repetition, structure and long notes, as it sees art through `shots.mjs`.
- [ ] **Song toolkit fixes** (`tools/devkit/music/kit.py`):
  - [ ] more than one chord in a bar;
  - [ ] the arpeggio's instrument chosen by the caller (it is fixed to `ARP`);
  - [ ] bass and counter lines that do not inherit the lead's `grid` (a lead in sixteenths breaks the bass unless
        `bgrid` is set too);
  - [ ] volume per note or per bar, not one constant for a line;
  - [ ] a song-form helper: sections A, B, A' with fills at phrase ends and a breakdown.
- [ ] **A richer starter `audio.py`** (`tools/templates/cart/audio.py`): songs with more than one section, a counter
  line and fills, so a new game starts above "basic".

## 4. Art: better defaults, better ways to look

- [ ] **Fix the starter's panel colours.**
  - **Problem:** `panel()` in `tools/templates/cart/code.js` uses the default palette's entry 1 (a brown) and entry 3 (a
    grey), so every new game starts with muddy panels.
  - **What:** the starter's `art.py` sets the overlay's `SHADOW` and `PANEL` to colours that suit a dark screen; panels
    get an inner line and corner studs (as Tricksy Towerz now has).
- [ ] **A `blit()` helper in the starter.**
  - **What:** draw a sprite on the overlay a pixel at a time, from the tile sheet (`sget`).
  - **Why:** sprites can never appear over an overlay panel, so this is how characters stand on results and menu panels.
- [ ] **A one-command screen gallery** (`tools/devkit/gallery.mjs`).
  - **What:** each cart lists its screens in `tests/carts/<name>/screens.mjs` (title, lobby, mid-game, results, initials,
    pause...); the tool writes one contact sheet and zoomed crops.
  - **Why:** for Tricksy Towerz I wrote a throwaway gallery script and used Python's image library (PIL) to zoom.
- [ ] **Animated capture.**
  - **What:** a GIF or animated PNG from the harness (`src/record/gif.js` already exists in the console).
  - **Why:** screenshots cannot show motion such as twinkling stars or a jumping winner.
- [ ] **A release polish bar in the playbook**, a checklist before release:
  - colours that belong together (no default palette in panels);
  - shading on game pieces;
  - characters on the result screens;
  - no silent screens after the game ends;
  - jingles that end cleanly;
  - songs at least as long as the screen they play under.

## 5. Make the older games safe to polish

- [ ] **Minimal tests and a bot for each released game without them.**
  - **Which:** Alien Swarm, Block Wizard, Planet Racers, Python Pass, Smashy Smash and Summit Rush.
  - **What:** a `tests/carts/<name>/lib.mjs`, a flow test and a bot for each.
  - **Why:** a polish pass on these games today has nothing to stop it silently breaking them.
- [ ] **An `audio.json` to `audio.py` decompiler** (`tools/devkit/music/decompile.py`).
  - **What:** turn a game's songs into a script of rows, so they can be edited as text and regenerated.
  - **Which:** every game except Moto Crosser, Ice Breakers, Rags to Riches and Tricksy Towerz.
- [ ] **Art scripts for the older games, where they are worth redrawing.**
  - **Which:** seven released games (Alien Swarm, Block Wizard, Moto Crosser, Planet Racers, Python Pass, Smashy Smash,
    Summit Rush) and the six demos have no `art.py`.
  - **Note:** their pictures can only be edited as files (playbook section 6); redraw a game's art with the kit only
    when it gets a polish pass.

## 6. Smaller items

- [ ] **A frame diff tool** (`tools/devkit/frame-diff.mjs`).
  - **Problem:** the starter's frame (title, pause, initials, records, saves) is copied into every cart, so fixes to it
    never reach the older games.
  - **What:** show how a cart's frame functions differ from the template's, so a fix can be ported.
- [ ] **Spec numbers from a tool** (`tools/stats.js <name>`).
  - **What:** print code size, tiles, patterns, effects, instruments, the number of test checks, song levels and the last
    sweep medians, ready to paste into a step's **Results** note.
  - **Why:** hand-counted numbers drift; the Tricksy Towerz polish notes were off by one check.
- [ ] **More starter kinds** (`node tools/new-cart.js <name> "Title" --kind <kind>`).
  - **What:** add platformer, shooter, racer and physics stacker kinds; only `puzzle` exists.
  - **Why:** those genres cover most of the library, and a kind is a whole working game to start from.
