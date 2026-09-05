// Minimal offline shell — caches the app's static assets (JS/CSS/fonts served
// same-origin) so the tool still opens on a flaky connection. Pages themselves
// are network-first since their live clocks should always show real time.
const CACHE = "tz-sync-v1";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== location.origin) return;

  // Static assets (hashed, safe to cache-first): fonts handled by the browser's own cache already.
  if (url.pathname.startsWith("/_astro/") || url.pathname.endsWith(".svg") || url.pathname.endsWith(".ico")) {
    event.respondWith(
      caches.open(CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        const res = await fetch(request);
        cache.put(request, res.clone());
        return res;
      })
    );
    return;
  }

  // HTML pages: network-first (fresh content), fall back to cache when offline.
  event.respondWith(
    fetch(request)
      .then((res) => {
        caches.open(CACHE).then((cache) => cache.put(request, res.clone()));
        return res;
      })
      .catch(() => caches.match(request))
  );
});
