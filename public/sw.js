const DB_NAME = 'battle-rhythm-push';
const STORE_NAME = 'meta';
const UNREAD_KEY = 'unread_alerts';

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getUnreadCount() {
  const db = await openDb();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(UNREAD_KEY);

    request.onsuccess = () => resolve(Number(request.result || 0));
    request.onerror = () => reject(request.error);
  });
}

async function setUnreadCount(count) {
  const db = await openDb();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(count, UNREAD_KEY);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function incrementUnreadCount() {
  const current = await getUnreadCount();
  const next = current + 1;
  await setUnreadCount(next);
  return next;
}

async function clearUnreadCount() {
  await setUnreadCount(0);
}

async function updateAppBadge(count) {
  if ('setAppBadge' in self.navigator) {
    if (count > 0) {
      await self.navigator.setAppBadge(count);
    } else if ('clearAppBadge' in self.navigator) {
      await self.navigator.clearAppBadge();
    } else {
      await self.navigator.setAppBadge(0);
    }
  }
}

self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};

  event.waitUntil(
    (async () => {
      const unreadCount = await incrementUnreadCount();

      await self.registration.showNotification(data.title || 'Battle Rhythm', {
        body: data.body || 'A new alert is available.',
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        // 👇 IMPORTANT
        data: { forceHome: true },
      });

      await updateAppBadge(unreadCount);
    })(),
  );
});

// 🔥 THIS IS THE FIX THAT ACTUALLY WORKS ON iOS
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  event.waitUntil(
    (async () => {
      const allClients = await clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });

      if (allClients.length > 0) {
        const client = allClients[0];

        // 👇 SEND MESSAGE TO APP TO FORCE NAVIGATION
        client.postMessage({ type: 'OPEN_HOME_FROM_NOTIFICATION' });

        return client.focus();
      }

      // fallback if app is closed
      return clients.openWindow('/home');
    })(),
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'CLEAR_ALERT_BADGE') {
    event.waitUntil(
      (async () => {
        await clearUnreadCount();
        await updateAppBadge(0);
      })(),
    );
  }
});