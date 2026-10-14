# NOVA-16 fantasy console: notes for agents

- The console is in `src/`; the spec is `docs/SPEC.md`; each game has a spec in `docs/carts/<name>.md`.
- **Read `docs/dev/playbook.md` before building or changing a cart.** It has the workflow, the tools and the
  mistakes that have already cost time.
- Start a new game with `node tools/new-cart.js <name> "Title"` (a working frame, tests, audio script and spec template).
- Build a cart from `carts/src/<name>/` with `node tools/pack.js carts/src/<name> carts/<name>.nova`.
- Before you commit a cart change: `node tools/check.js <name>`, then its tests (`node tools/test.js <name>`,
  slow: run it in the background), then `node tools/devkit/soak.mjs carts/<name>.nova` and
  `node tools/devkit/smoke.mjs <name>` (the real console), then, if you changed the code or art of a released game,
  `node tools/release.js <name> --keep-label` so the `.nova.png` and Library entry match.
- Commit and push after every build step. Open a pull request only when the user asks.
- Keep the game's spec in step with the code (numbers, tables, the step's Built and Results notes).
