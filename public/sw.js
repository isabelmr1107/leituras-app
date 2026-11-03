/* LIO PWA: sem cache de páginas pessoais, autenticação ou APIs. */
const CACHE_NAME = "lio-public-assets-v1";
self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});
self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key.startsWith("lio-public-assets-") && key !== CACHE_NAME).map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET" || event.request.mode === "navigate") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin || !/^\/pwa\/icon\/(192|512)$/.test(url.pathname)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(event.request);
    if (cached) return cached;
    const response = await fetch(event.request);
    if (response.ok && response.type === "basic") await cache.put(event.request, response.clone());
    return response;
  })());
});
