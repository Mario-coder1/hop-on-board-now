self.addEventListener('push', function(event) {
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

  event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();

  const target = new URL(event.notification.data?.url || '/', self.location.origin);
  const urlToOpen = target.origin === self.location.origin ? target.href : self.location.origin + '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(async function(clientList) {
        for (const client of clientList) {
          if (new URL(client.url).origin === self.location.origin && 'focus' in client && 'navigate' in client) {
            try {
              const navigated = await client.navigate(urlToOpen);
              return (navigated || client).focus();
            } catch (error) {
              // Try another window, or open a fresh one if navigation failed.
            }
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});