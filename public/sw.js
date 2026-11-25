// Dungeon Forge's offline worker. It keeps a copy of the app so it opens without a network:
// pages are fetched fresh when online and served from the copy when not; the built scripts,
// styles and icons never change under the same name, so they come from the copy first.
// The version comes from the registration URL (sw.js?v=0.6.0); a new version starts a new copy
// and throws the old one away.

const VERSION = new URL(self.location.href).searchParams.get('v') || 'dev';
const CACHE = `dungeon-forge-${VERSION}`;
const FONTS = 'dungeon-forge-fonts';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== CACHE && k !== FONTS) await caches.delete(k);
    await self.clients.claim();
  })());
});

// The first visit loads the app before this worker is in charge, so the page sends the list of
// files it loaded, and they are copied now.
self.addEventListener('message', (e) => {
  if (!e.data || !Array.isArray(e.data.cache)) return;
  const own = e.data.cache.filter((u) => new URL(u).origin === self.location.origin);
  e.waitUntil(caches.open(CACHE).then(async (c) => {
    for (const u of own) if (!(await c.match(u))) { try { await c.add(u); } catch { /* skipped */ } }
  }));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // the interface fonts: use the copy, refresh it in the background
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(caches.open(FONTS).then(async (c) => {
      const hit = await c.match(req);
      const fresh = fetch(req).then((r) => { if (r.ok || r.type === 'opaque') c.put(req, r.clone()); return r; }).catch(() => hit);
      return hit || fresh;
    }));
    return;
  }
  if (url.origin !== self.location.origin) return;
  // the page itself: the network first, so a new version shows at once; the copy when offline
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then((r) => {
      const copy = r.clone();
      caches.open(CACHE).then((c) => c.put('./index.html', copy));
      return r;
    }).catch(async () => (await caches.match('./index.html', { ignoreVary: true })) || (await caches.match('./', { ignoreVary: true })) || Response.error()));
    return;
  }
  // everything else of ours: the copy first, else fetch it and keep it. Vary is ignored: a server
  // that answers with "Vary: Origin" would otherwise hide the copy from module scripts.
  e.respondWith(caches.match(req, { ignoreVary: true }).then((hit) => hit || fetch(req).then((r) => {
    if (r.ok) { const copy = r.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
    return r;
  })));
});
