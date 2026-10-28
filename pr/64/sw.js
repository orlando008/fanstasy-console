// The hosted console's service worker (SPEC 11.3): the site works offline once it has been visited. On install it
// keeps a copy of everything the console loads (the page, its code, every cart in the Library and its label); after
// that it fetches each file from the network as before, and only when the network fails answers from that copy. So
// an online player always gets the site as it is now, and an offline one the version this worker was built with.
//
// tools/site.js build fills in VERSION (a hash of the files) and FILES, and marks index.html so main.js registers
// this worker; the repository's own copy, served locally, is never registered. A new deploy is a new VERSION: the
// browser installs the new worker, which keeps the new files and deletes the old ones.
//
// The main site and each pull request's preview (pr/<n>/, on the same origin) have a worker each, with its own copy:
// the main site's leaves pr/ alone.

const VERSION = 'e1cef0417a3d';
const FILES = [
  "./",
  "carts/alien-swarm.nova",
  "carts/block-wizard.nova",
  "carts/brawl.nova",
  "carts/chiptune.nova",
  "carts/effects.nova",
  "carts/flow-state.nova",
  "carts/franchise.nova",
  "carts/hello.nova",
  "carts/ice-breakers.nova",
  "carts/index.json",
  "carts/ivory-tower.nova",
  "carts/labels/alien-swarm.png",
  "carts/labels/block-wizard.png",
  "carts/labels/brawl.png",
  "carts/labels/chiptune.png",
  "carts/labels/effects.png",
  "carts/labels/flow-state.png",
  "carts/labels/franchise.png",
  "carts/labels/hello.png",
  "carts/labels/ice-breakers.png",
  "carts/labels/ivory-tower.png",
  "carts/labels/mode7.png",
  "carts/labels/moto-crosser.png",
  "carts/labels/operation-ironstorm.png",
  "carts/labels/parallax.png",
  "carts/labels/planet-racers.png",
  "carts/labels/python-pass.png",
  "carts/labels/rags-to-riches.png",
  "carts/labels/showcase.png",
  "carts/labels/smashy-smash.png",
  "carts/labels/sprites.png",
  "carts/labels/star-cadet.png",
  "carts/labels/street.png",
  "carts/labels/summit-rush.png",
  "carts/labels/tricksy-towerz.png",
  "carts/labels/water.png",
  "carts/mode7.nova",
  "carts/moto-crosser.nova",
  "carts/operation-ironstorm.nova",
  "carts/parallax.nova",
  "carts/planet-racers.nova",
  "carts/python-pass.nova",
  "carts/rags-to-riches.nova",
  "carts/showcase.nova",
  "carts/smashy-smash.nova",
  "carts/sound-test.nova",
  "carts/sprites.nova",
  "carts/star-cadet.nova",
  "carts/street.nova",
  "carts/summit-rush.nova",
  "carts/tricksy-towerz.nova",
  "carts/vertical-fall.nova",
  "carts/water.nova",
  "icons/apple-touch-icon.png",
  "icons/icon-192.png",
  "icons/icon-32.png",
  "icons/icon-512.png",
  "icons/maskable-512.png",
  "index.html",
  "manifest.webmanifest",
  "src/audio/apu.js",
  "src/audio/synth.js",
  "src/audio/worklet.js",
  "src/console/api.js",
  "src/console/font.js",
  "src/console/overlay.js",
  "src/console/ppu.js",
  "src/console/prng.js",
  "src/console/sandbox.js",
  "src/console/worker.js",
  "src/editors/audio-base.js",
  "src/editors/cart.js",
  "src/editors/code.js",
  "src/editors/highlight.js",
  "src/editors/instrument.js",
  "src/editors/map.js",
  "src/editors/music.js",
  "src/editors/palette.js",
  "src/editors/sfx.js",
  "src/editors/shell.js",
  "src/editors/sprite.js",
  "src/files.js",
  "src/formats/audio.js",
  "src/formats/cart.js",
  "src/formats/nova-json.js",
  "src/formats/nova-png.js",
  "src/genres.js",
  "src/input.js",
  "src/library.js",
  "src/machine.js",
  "src/main.js",
  "src/make-prompt.js",
  "src/pause-menu.js",
  "src/record/clip.js",
  "src/record/gif.js",
  "src/record/replay.js",
  "src/record/webm-duration.js",
  "src/share.js",
  "src/storage.js",
  "src/touch.js",
  "src/ui/dom.js",
  "src/ui/history.js",
  "src/ui/pixels.js",
  "src/ui/sheet-view.js",
  "src/ui/tracker.js",
  "style.css"
];

const SCOPE = self.registration.scope;
const PREFIX = `nova16 ${SCOPE} `; // this site's copies (a cache name is unique per origin, and previews share it)
const NAME = PREFIX + VERSION;
const WAIT_MS = 4000; // on a network this slow, answer from the copy

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const cache = await caches.open(NAME);
    await cache.addAll(FILES.map((f) => new Request(f, { cache: 'reload' }))); // past the browser's HTTP cache: this version's files
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    for (const key of await caches.keys()) if (key.startsWith(PREFIX) && key !== NAME) await caches.delete(key);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || !req.url.startsWith(SCOPE) || req.url.slice(SCOPE.length).startsWith('pr/')) return;
  e.respondWith(networkFirst(req));
});

async function networkFirst(req) {
  const cache = await caches.open(NAME);
  const copy = cache.match(req, { ignoreSearch: true })
    .then((hit) => hit || (req.mode === 'navigate' ? cache.match('./') : undefined)); // ?cart=<name> is the page too
  const net = fetch(req);
  net.catch(() => {}); // a failure after the copy has answered is not an error
  let timer;
  const slow = new Promise((resolve) => { timer = setTimeout(() => copy.then((hit) => hit && resolve(hit)), WAIT_MS); });
  try {
    return await Promise.race([net, slow]);
  } catch (err) {
    const hit = await copy;
    if (hit) return hit;
    throw err;
  } finally {
    clearTimeout(timer);
  }
}
