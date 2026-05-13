const CACHE = 'relux-admin-v1';

const PRECACHE = ['/', '/favicon.webp', '/favicon.ico', '/manifest.json'];

// ── Install: precache shell ───────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(PRECACHE))
  );
  self.skipWaiting();
});

// ── Activate: purge old caches ────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── Fetch: stale-while-revalidate for assets, network-first for navigation ──
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET') return;

  if (
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/socket.io') ||
    url.hostname.includes('googleapis') ||
    url.hostname.includes('gstatic')
  ) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE).then((c) => c.put(request, clone));
          return res;
        })
        .catch(() => caches.match('/') || caches.match(request))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request).then((res) => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then((c) => c.put(request, clone));
        }
        return res;
      });
      return cached || network;
    })
  );
});

// ── Push notifications ────────────────────────────────────
self.addEventListener('push', (event) => {
  if (!event.data) return;
  const payload = event.data.json();
  const {
    title = 'Relux',
    body = '',
    icon = '/favicon.webp',
    badge = '/favicon.webp',
    data = {},
  } = payload;

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon,
      badge,
      data,
      tag: data.type || 'relux',
      renotify: true,
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const { type, metadata } = event.notification.data || {};
  const orderId = metadata?.orderId;

  let url = '/admin';
  switch (type) {
    case 'order_created':
    case 'order_cancelled':
    case 'order_status_updated':
      url = orderId ? `/admin/orders/${orderId}` : '/admin/orders';
      break;
    case 'order_needs_pickup':
    case 'order_ready_for_delivery':
      url = '/delivery/orders';
      break;
    case 'shift_ending_soon':
      url = '/staff';
      break;
    case 'chat_message':
      url = '/admin/chat';
      break;
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ('focus' in client) return client.navigate(url).then(() => client.focus());
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
