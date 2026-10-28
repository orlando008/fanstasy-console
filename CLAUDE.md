# NOVA-16 fantasy console: notes for agents

- The console is in `src/`; its spec is `docs/SPEC.md` (the cart-facing API is section 8); each game has a spec in
  `docs/carts/<name>.md`.
- **Read `docs/dev/playbook.md` before building or changing a cart.** It has the workflow, the tools, the limits and
  the mistakes that have already cost time.
- When the user says "I want to start a new game", follow the kickoff in the playbook: ask its questions in one
  message, then scaffold, write the spec and report back before building.
- Start a new game with `node tools/new-cart.js <name> "Title"` (a working frame, tests, bot, art and audio scripts
  and spec template; `--kind puzzle` for a whole match-3 game to change into yours, see the playbook). Build a cart from `carts/src/<name>/` with `node tools/pack.js carts/src/<name> carts/<name>.nova`.
- Before you commit a cart change: `node tools/verify.js` (the carts you changed: audio script, packed cart, checks, soak,
  docs and the cart's tests; add `--fast` to skip the tests, which take minutes, or run them in the background), then
  `node tools/devkit/smoke.mjs <name>` (the real console). After a change to the rules, the physics or the AI:
  `node tools/devkit/sweep.mjs <name>` (the cart's bot over many seeds). If you changed the code or art of a released
  game: `node tools/release.js <name> --keep-label`, so the `.nova.png` and the Library entry match.
- You cannot hear or see a cart directly: measure the audio (`tools/devkit/music/`), make the art in code (a cart's
  `art.py`, with `tools/devkit/art/kit.py`) and look at it with `tools/devkit/art/sprites.mjs`, `scene.mjs`, `tiles.mjs`
  and `shots.mjs` (open the PNGs with the Read tool).
- Commit and push after every build step. Open a pull request only when the user asks, and merge only when told to.
  When you open one, give the user its preview link (`https://orlando008.github.io/fanstasy-console/pr/<number>/`) and
  what to try in it.
- `WORKFLOW-WISHLIST.md` lists tooling and docs still to build; when you build one, tick it there in the same pull request.
- Keep the game's spec in step with the code (numbers, tables, the step's Built and Results notes), and keep the docs
  true: `node tools/check-docs.js` fails on a mention of a file or a tool flag that does not exist.
