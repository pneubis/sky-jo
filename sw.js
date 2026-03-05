const CACHE = '6nations-2026-v2';
const ASSETS = ['/', '/index.html', '/manifest.json', '/sw.js', '/icon-192.png', '/icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS).catch(() => c.add('/')))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
  scheduleAllNotifications();
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (res && res.status === 200 && res.type !== 'opaque') {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      }).catch(() => caches.match('/index.html'));
    })
  );
});

self.addEventListener('message', e => {
  if (e.data && e.data.type === 'SCHEDULE_NOTIFICATIONS') scheduleAllNotifications();
  if (e.data && e.data.type === 'TEST_NOTIFICATION') {
    self.registration.showNotification('🏉 6 Nations 2026', {
      body: 'Les notifications fonctionnent ! Vous serez alerté 15min avant chaque match.',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: 'test',
      vibrate: [200, 100, 200],
      data: { url: '/' }
    });
  }
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      if (list.length > 0) return list[0].focus();
      return clients.openWindow(e.notification.data && e.notification.data.url || '/');
    })
  );
});

const MATCHES_SW = [
  { date: '2026-03-07T14:15:00', home: 'Irlande',        away: 'Pays de Galles', venue: 'Dublin' },
  { date: '2026-03-07T16:45:00', home: 'Angleterre',     away: 'France',         venue: 'Twickenham' },
  { date: '2026-03-08T15:00:00', home: 'Italie',         away: 'Écosse',         venue: 'Rome' },
  { date: '2026-03-14T14:15:00', home: 'Écosse',         away: 'Angleterre',     venue: 'Édimbourg' },
  { date: '2026-03-14T16:45:00', home: 'Pays de Galles', away: 'Italie',         venue: 'Cardiff' },
  { date: '2026-03-15T15:30:00', home: 'France',         away: 'Irlande',        venue: 'Paris' },
  { date: '2026-03-21T14:00:00', home: 'Pays de Galles', away: 'Écosse',         venue: 'Cardiff' },
  { date: '2026-03-21T15:45:00', home: 'Italie',         away: 'Irlande',        venue: 'Rome' },
  { date: '2026-03-21T17:45:00', home: 'France',         away: 'Angleterre',     venue: 'Paris' },
];

const NOTIF_MS = 15 * 60 * 1000;

function scheduleAllNotifications() {
  const now = Date.now();
  MATCHES_SW.forEach((m, i) => {
    const matchTime = new Date(m.date).getTime();
    const delay = matchTime - NOTIF_MS - now;
    if (delay > 0) {
      setTimeout(() => {
        self.registration.showNotification('🏉 Match dans 15 minutes !', {
          body: m.home + ' vs ' + m.away + '\n📍 ' + m.venue,
          icon: '/icon-192.png',
          badge: '/icon-192.png',
          tag: 'match-' + i,
          vibrate: [300, 150, 300, 150, 600],
          requireInteraction: true,
          actions: [
            { action: 'open',    title: "📱 Ouvrir l'app" },
            { action: 'dismiss', title: 'Ignorer' }
          ],
          data: { url: '/?page=matchs' }
        });
      }, delay);
    }
  });
}
