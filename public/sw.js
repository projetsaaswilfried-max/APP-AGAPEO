const STATIC_CACHE = "agapeo-static-v1";
const OFFLINE_URL = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(STATIC_CACHE).then((cache) => cache.add(OFFLINE_URL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== STATIC_CACHE).map((key) => caches.delete(key))))
  );
  self.clients.claim();
});

/**
 * Cache-first UNIQUEMENT pour les fichiers statiques immuables (chunks
 * Next.js content-hashés, images, polices) — jamais les pages HTML ni les
 * appels Supabase/API, qui doivent toujours rester à jour (fil, messages,
 * Découvrir). Une app dynamique comme celle-ci ne doit jamais servir de
 * données périmées depuis le cache.
 *
 * Les NAVIGATIONS (changement de page/URL) restent, elles aussi, toujours
 * réseau — jamais de HTML en cache — mais si le réseau échoue au moment
 * précis où l'app reprend en premier plan (ex : un testeur qui revient de
 * son appli mail après avoir confirmé son adresse), on sert une page
 * hors-ligne dédiée plutôt que de laisser Chrome afficher son écran
 * générique "This page couldn't load" : cette page-là se recharge toute
 * seule dès que la connexion revient (voir offline.html), sans que la
 * personne ait à appuyer sur "Actualiser".
 */
self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match(OFFLINE_URL))
    );
    return;
  }

  const url = new URL(request.url);
  const isStaticAsset =
    url.origin === self.location.origin &&
    (url.pathname.startsWith("/_next/static/") || /\.(png|jpg|jpeg|webp|gif|svg|woff2?|ico)$/.test(url.pathname));

  if (!isStaticAsset) return;

  event.respondWith(
    caches.open(STATIC_CACHE).then(async (cache) => {
      const cached = await cache.match(request);
      if (cached) return cached;
      const response = await fetch(request);
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
  );
});

self.addEventListener("push", (event) => {
  if (!event.data) return;
  const data = event.data.json();
  const title = data.title || "AGAPEO";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || "",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      data: { url: data.url || "/" }
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});
