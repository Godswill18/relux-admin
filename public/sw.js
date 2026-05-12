self.addEventListener('push', (event) => {
  if (!event.data) return;
  const payload = event.data.json();
  const { title = 'Relux', body = '', icon = '/favicon.webp', badge = '/favicon.webp', data = {} } = payload;

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
  const url = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ('focus' in client) return client.navigate(url).then(() => client.focus());
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
