function isAppCacheForThisRegistration(name) {
  const isKnownAppCache = /(^|-)precache-v\d+-|(^|-)runtime-|(^|-)googleAnalytics-|workbox|app-assets|mapbox-cache/.test(name);
  return isKnownAppCache && (name.endsWith(self.registration.scope) || name.includes(self.registration.scope));
}

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) =>
  event.waitUntil(
    (async () => {
      try {
        const cacheNames = await caches.keys();
        const appCacheNames = cacheNames.filter(isAppCacheForThisRegistration);
        await Promise.allSettled(appCacheNames.map((name) => caches.delete(name)));
        await self.clients.claim();
        const windowClients = await self.clients.matchAll({ type: "window" });
        await Promise.allSettled(windowClients.map((client) => client.navigate(client.url)));
      } finally {
        await self.registration.unregister();
      }
    })(),
  ),
);
