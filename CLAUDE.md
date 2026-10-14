# NOVA-16 fantasy console: notes for agents

- The console is in `src/`; its spec is `docs/SPEC.md` (the cart-facing API is section 8); each game has a spec in
  `docs/carts/<name>.md`.
- **Read `docs/dev/playbook.md` before building or changing a cart.** It has the workflow, the tools, the limits and
  the mistakes that have already cost time.
- Start a new game with `node tools/new-cart.js <name> "Title"` (a working frame, tests, bot, audio script and spec
  template). Build a cart from `carts/src/<name>/` with `node tools/pack.js carts/src/<name> carts/<name>.nova`.
- Before you commit a cart change: `node tools/verify.js` (the carts you changed: audio script, packed cart, checks, soak,
  docs and the cart's tests; add `--fast` to skip the tests, which take minutes, or run them in the background), then
  `node tools/devkit/smoke.mjs <name>` (the real console). After a change to the rules, the physics or the AI:
  `node tools/devkit/sweep.mjs <name>` (the cart's bot over many seeds). If you changed the code or art of a released
  game: `node tools/release.js <name> --keep-label`, so the `.nova.png` and the Library entry match.
- You cannot hear or see a cart directly: measure the audio (`tools/devkit/music/`), and look at art and screens
  with `tools/devkit/tiles.mjs` and `shots.mjs` (open the PNGs with the Read tool).
- Commit and push after every build step. Open a pull request only when the user asks, and merge only when told to.
- Keep the game's spec in step with the code (numbers, tables, the step's Built and Results notes), and keep the docs
  true: `node tools/check-docs.js` fails on a mention of a file that does not exist.
