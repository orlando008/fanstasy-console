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

const VERSION = 'dev';
const FILES = [];

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
