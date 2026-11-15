# NOVA-16 fantasy console: notes for agents

- The console is in `src/`; its spec is `docs/SPEC.md` (the cart-facing API is section 8); each game has a spec in
  `docs/carts/<name>.md`.
- **Read `docs/dev/playbook.md` before building or changing a cart.** It has the workflow, the tools, the limits and
  the mistakes that have already cost time.
- When the user says "I want to start a new game", follow the kickoff in the playbook: ask its questions step by
  step with the multiple-choice question tool, then scaffold, write the spec and report back before building.
- Start a new game with `node tools/new-cart.js <name> "Title"` (a working frame, tests, bot, art and audio scripts
  and spec template; `--kind puzzle` for a whole match-3 game to change into yours, see the playbook). Build a cart from
  `carts/src/<name>/` with `node tools/pack.js carts/src/<name> carts/<name>.nova`.
- **Before you commit a cart change**, run these:
  - `node tools/verify.js`: the carts you changed (art and audio scripts, packed cart, checks, soak, music levels, docs and the cart's tests).
    Add `--fast` to skip the tests, which take minutes; or run them in the background.
  - `node tools/devkit/smoke.mjs <name>`: the real console. It needs Playwright and Chromium, which CI does not run.
  - After a change to the rules, the physics or the AI: `node tools/devkit/sweep.mjs <name>` (the cart's bot over many seeds).
  - After a change to the code or art of a released game: `node tools/release.js <name> --keep-label`, so the
    `.nova.png` and the Library entry match.
- **Music: check the song library before composing.** `tools/devkit/music/songs/README.md` lists ready-made songs (a boss
  theme, a chase, a victory, a town, public domain classics); a game's `audio.py` takes one with `library.add(a, name)`.
- **Small art: check the icon library before drawing.** `tools/devkit/art/icons.py` has hearts, coins, stars, gems, keys,
  potions, a cursor and more at 16 and 8 px. It also has animation frames (`anim()`: a spinning coin, a sparkle, an
  explosion), score digits (`digits()`) and button prompts (`button()`). `docs/dev/art-recipes/icons-library.png` shows them
  all: `art.sprite('heart', icon('heart', 16, items), pal=items)` with `items = items_palette(art, n)`.
- **Card games: use the card kit.** `art.cards(...)` in `art.py` draws a whole deck (32 x 48, 24 x 32 and 16 x 24; drawn
  court cards, a back, flips; a custom deck too) into the ROM and writes the CARDS block of `code.js`: decks, a seeded
  `shuffle`, `deal`, `drawCard`, and on request sorting, poker, blackjack, runs and sets, moves and fans; piles of
  overlapping cards are composed into stack buffers (`stacks=`), which keeps them under the 32 sprites a line shows.
  `tools/devkit/music/cardsfx.py` adds the sounds. Every card of each size: `docs/dev/art-recipes/cards-large.png`,
  `cards-medium.png` and `cards-small.png`. The playbook's "Card games" part of section 2 has the details.
- **Other art: draw with the kit.** `docs/dev/art-recipes.md` has a picture and the code for each recipe (a hero, a big
  character, sculpted things, textures, a landscape, a room, a title). Use the kit's modules (`rig.py` for characters,
  `sculpt.py`, `texture.py`, `scenery.py`, `lettering.py`) before placing pixels by hand; the starter's `art.py` uses them.
- **Look at what you make.** You cannot hear or see a cart directly, so measure the audio (`tools/devkit/music/`) and look
  at the art with `tools/devkit/art/sprites.mjs` and `scene.mjs`, and `tools/devkit/tiles.mjs` and `shots.mjs` (open the PNGs with the Read
  tool). Before a release, `node tools/devkit/gallery.mjs <name>` puts every screen the cart lists in
  `tests/carts/<name>/screens.mjs` on contact sheets: keep that list up to date and look through the sheets.
  `node tools/devkit/art/critique.mjs <name>` reviews those screens for flat or noisy pictures and hard-to-read text.
- **Agree the look early**: once a new game runs, draw its hero, palettes and one screen, run
  `node tools/devkit/art/proof.mjs <name>`, send the picture to the user and write what they say in the spec, before
  drawing the rest (the playbook's art proof step; the playbook says how to send a picture).
- **Branches and pull requests.** Work on the branch you are given. Commit and push after every build step. Open a pull
  request only when the user asks, and merge only when told to. When you open one, give the user its preview link
  (`https://orlando008.github.io/fanstasy-console/pr/<number>/`) and what to try in it. After a merge, restart the branch
  from the latest `main` (the playbook's git section).
- `WORKFLOW-WISHLIST.md` lists tooling and docs still to build; when you build one, tick it there in the same pull request.
- Keep the game's spec in step with the code (numbers, tables, the step's Built and Results notes), and keep the docs
  true: `node tools/check-docs.js` fails on a mention of a file or a tool flag that does not exist.
