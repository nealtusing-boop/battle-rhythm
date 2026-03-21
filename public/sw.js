self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};

  event.waitUntil(
    self.registration.showNotification(data.title || 'Battle Rhythm', {
      body: data.body || 'A new alert is available.',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      data: { url: data.url || '/home' },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data?.url || '/home'));
});
