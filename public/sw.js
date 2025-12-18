// Service Worker for Push Notifications
self.addEventListener('push', function(event) {
  console.log('[SW] Push received:', event);
  
  let data = {
    title: 'TakeMe',
    body: 'Máte novú notifikáciu',
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png'
  };

  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/pwa-192x192.png',
    badge: data.badge || '/pwa-192x192.png',
    vibrate: [200, 100, 200],
    data: data.data || {},
    actions: data.actions || [],
    tag: data.tag || 'default',
    renotify: true
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', function(event) {
  console.log('[SW] Notification clicked:', event);
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(function(clientList) {
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

self.addEventListener('install', function(event) {
  console.log('[SW] Installing service worker');
  // Take over immediately, don't wait for old SW to die
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  console.log('[SW] Activating service worker');
  event.waitUntil(
    // Clean up old caches and claim clients immediately
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          // Delete any old caches that might have stale JS
          if (cacheName.includes('workbox') || cacheName.includes('app-assets')) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(function() {
      // Take control of all pages immediately
      return clients.claim();
    })
  );
});
