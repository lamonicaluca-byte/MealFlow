/**
 * Service worker di MealFlow — caching prudente (§22).
 *
 * Principi:
 * - Si mettono in cache SOLO asset statici (shell dell'app, icone, font di
 *   sistema) e la pagina offline di fallback: mai risposte di /api/*, che
 *   potrebbero contenere dati familiari sensibili (allergie, note, spesa).
 * - Le navigazioni usano "network-first con fallback alla cache": l'utente
 *   vede sempre i dati più recenti quando è online, e una versione già
 *   visitata (o la pagina offline) quando non lo è.
 * - Bump di CACHE_VERSION a ogni release per invalidare la cache precedente.
 */
const CACHE_VERSION = "mealflow-v1";
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const OFFLINE_URL = "/offline.html";

const PRECACHE_URLS = [OFFLINE_URL, "/manifest.webmanifest", "/icons/icon.svg", "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== STATIC_CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

function isApiRequest(url) {
  return url.pathname.startsWith("/api/");
}

function isStaticAsset(url) {
  return url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/");
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (isApiRequest(url)) return; // mai intercettato: sempre rete, mai cache.

  if (isStaticAsset(url)) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        const response = await fetch(request);
        if (response.ok) cache.put(request, response.clone());
        return response;
      }),
    );
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(async () => {
        const cache = await caches.open(STATIC_CACHE);
        return (await cache.match(request)) ?? (await cache.match(OFFLINE_URL));
      }),
    );
  }
});
