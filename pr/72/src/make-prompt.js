// The prompt behind Make it with AI (SPEC 11.5): instructions a player copies into an AI agent (Claude Code, Codex,
// Cursor, or a chat) to make their own NOVA-16 game with it. It points the agent at the repository, whose CLAUDE.md
// and playbook hold the workflow; an AI that cannot clone it writes one file for the Code tab instead.
// tests/console/make.mjs checks that every file and tool named here exists.

export const REPO = 'https://github.com/orlando008/fanstasy-console';
export const SITE = 'https://orlando008.github.io/fanstasy-console/';
const RAW = 'https://raw.githubusercontent.com/orlando008/fanstasy-console/main';

export const MAKE_PROMPT = `I want to make my own video game for NOVA-16, a fantasy console that runs in the web browser (a 16-bit console that never existed: 256x224 pixels, tiles and sprites, 6 sound channels, up to 4 players with gamepads or the keyboard). Help me make it, from the idea to a game I can play and share.

The console, its tools and the games already made for it are open source: ${REPO}

1. Clone the repository (or fork it first, so my game can live on my own GitHub). Read CLAUDE.md, then docs/dev/playbook.md before anything else: it has the workflow, the tools, the limits and the mistakes that have already cost time. docs/SPEC.md is the console's specification (the API a game uses is section 8), and the games in carts/src/ are worked examples.
2. Before writing any code, ask me what I want to make: the kind of game, how it plays, how many players, how it should look and sound. Ask a few simple questions at a time and suggest ideas if I am not sure. Then write the game's spec (docs/carts/<name>.md, as the playbook says) with a short plan in steps, and show it to me.
3. Start the game with node tools/new-cart.js <name> "Title" and build it one step at a time. Make the art in code (the cart's art.py) and the music and sound effects in code (its audio.py), and check every step with the repository's tools (node tools/verify.js, node tools/devkit/smoke.mjs <name>) before telling me it works. You cannot see or hear the game, so use the tools the playbook names to look at the art and measure the sound.
4. After each step, tell me what changed and how to try it: start a local server in the repository (python3 -m http.server 8000) and give me the link http://localhost:8000/?cart=<name>. Keyboard: arrows = d-pad, X = A, Z = B, Enter = Start, Esc = the pause menu.
5. When it is done, tell me how to share it: anyone can drop the cart file (carts/<name>.nova) onto ${SITE} to play it, and a pull request to the repository can add it to the Library.

If you cannot run commands or clone a repository (a chat without tools), read the specification at ${RAW}/docs/SPEC.md instead and write the game as one JavaScript file for the console's Code tab: I will open ${SITE}, choose New cart, replace the code in the Code tab with yours and press Esc to play. Draw everything in code (sset() into the tile sheet in init(), or the overlay functions such as rectfill() and print()). When the game shows an error, I will paste it back to you.`;
