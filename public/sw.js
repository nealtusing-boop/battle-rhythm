const DB_NAME = 'battle-rhythm-push';
const STORE_NAME = 'meta';
const UNREAD_KEY = 'unread_alerts';
const REDIRECT_KEY = 'redirect_to_home';

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

async function getValue(key) {
  const db = await openDb();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(key);

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function setValue(key, value) {
  const db = await openDb();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.put(value, key);

    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

async function getUnreadCount() {
  return Number((await getValue(UNREAD_KEY)) || 0);
}

async function setUnreadCount(count) {
  await setValue(UNREAD_KEY, count);
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
      });

      await updateAppBadge(unreadCount);
    })(),
  );
});

// 🔥 STRONG iOS FIX
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  event.waitUntil(
    (async () => {
      // 👇 set redirect flag in IndexedDB
      await setValue(REDIRECT_KEY, true);

      const allClients = await clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });

      if (allClients.length > 0) {
        return allClients[0].focus();
      }

      return clients.openWindow('/');
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