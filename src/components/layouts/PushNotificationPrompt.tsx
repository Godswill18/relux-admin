import { useState, useEffect } from 'react';
import { Bell, X, Share } from 'lucide-react';
import { useAuthStore } from '@/stores/useAuthStore';

function isIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

function isStandalone(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true;
}

export function PushNotificationPrompt() {
  const [show, setShow] = useState(false);
  const [iosGuide, setIosGuide] = useState(false);

  useEffect(() => {
    if (localStorage.getItem('push-prompt-dismissed')) return;
    if (!('Notification' in window)) return;
    if (Notification.permission !== 'default') return;
    const ios = isIOS();
    if (ios && !isStandalone()) {
      setIosGuide(true);
    }
    setShow(true);
  }, []);

  const dismiss = () => {
    localStorage.setItem('push-prompt-dismissed', '1');
    setShow(false);
  };

  const enable = async () => {
    const token = useAuthStore.getState().token;
    if (token) {
      const { initPushNotifications } = await import('@/lib/pushNotifications');
      await initPushNotifications(token);
    }
    dismiss();
  };

  if (!show) return null;

  if (iosGuide) {
    return (
      <div className="mx-4 mt-3 rounded-xl border border-border bg-card px-4 py-3 shadow-sm">
        <div className="flex items-start gap-3">
          <Bell className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">Enable push notifications on iPhone</p>
            <p className="text-xs text-muted-foreground mt-1">
              Tap <Share className="inline h-3 w-3 mx-0.5" /> <strong>Share</strong> in Safari, then <strong>"Add to Home Screen"</strong>, and open the app from your home screen.
            </p>
          </div>
          <button onClick={dismiss} className="shrink-0 text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-4 mt-3 rounded-xl border border-border bg-card px-4 py-3 shadow-sm">
      <div className="flex items-center gap-3">
        <Bell className="h-4 w-4 shrink-0 text-primary" />
        <p className="flex-1 text-sm">Get real-time alerts for orders and updates</p>
        <button
          onClick={enable}
          className="shrink-0 rounded-lg bg-primary px-3 py-1 text-xs font-medium text-primary-foreground"
        >
          Enable
        </button>
        <button onClick={dismiss} className="shrink-0 text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
