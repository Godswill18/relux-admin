const BACKEND_API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

async function subscribeAndSend(registration: ServiceWorkerRegistration, token: string): Promise<void> {
  const keyRes = await fetch(`${BACKEND_API}/notifications/vapid-public-key`);
  const { data } = await keyRes.json();
  if (!data?.publicKey) return;
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(data.publicKey),
  });
  await fetch(`${BACKEND_API}/notifications/push-subscribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(subscription.toJSON()),
  });
}

// Called from user tap — requests permission then subscribes
export async function initPushNotifications(token: string): Promise<void> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
  try {
    const registration = await navigator.serviceWorker.register('/sw.js');
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return;
    await subscribeAndSend(registration, token);
  } catch {
    // Silently fail
  }
}

// Called on mount — silent re-subscribe only if permission already granted (no OS prompt)
export async function resumePushIfGranted(token: string): Promise<void> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  try {
    const registration = await navigator.serviceWorker.register('/sw.js');
    await subscribeAndSend(registration, token);
  } catch {
    // Silently fail
  }
}

export async function removePushSubscription(token: string): Promise<void> {
  if (!('serviceWorker' in navigator)) return;
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    for (const reg of regs) {
      const sub = await reg.pushManager.getSubscription();
      if (!sub) continue;
      await fetch(`${BACKEND_API}/notifications/push-subscribe`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ endpoint: sub.endpoint }),
      });
      await sub.unsubscribe();
    }
  } catch {
    // Silently fail
  }
}
