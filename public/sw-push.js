/* global self: readonly, URL: readonly */
/* Minimal portable Web Push service worker.
 *
 * Works as-is in an Expo web export (`public/sw-push.js` -> served at
 * `/sw-push.js`) and in Next.js (`public/` is served at the root there too).
 *
 * Scope: push reception + notification click only. No precaching, no fetch
 * interception, no aggressive caching — install/activate just take control
 * so deploys apply immediately.
 */

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {};
  }
  const title = data.title || 'turnos-app';
  const options = {
    body: data.body,
    icon: data.icon || '/icon-192.png',
    badge: data.badge,
    tag: data.tag,
    data: data.url ? { url: data.url } : undefined,
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const rawUrl = event.notification.data && event.notification.data.url;
  const targetPath = rawUrl || '/';
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });
      for (const client of windows) {
        try {
          if (new URL(client.url).pathname === new URL(targetPath, self.location.origin).pathname) {
            await client.focus();
            return;
          }
        } catch {
          // Ignore malformed client URLs and keep looking.
        }
      }
      await self.clients.openWindow(targetPath);
    })(),
  );
});
