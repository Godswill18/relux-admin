// ============================================================================
// NOTIFICATION BELL — Admin/Staff Header Notification Component
// ============================================================================

import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, Package, XCircle, Clock, Wallet, Star, Info } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { useNotificationStore, AppNotification } from '@/stores/useNotificationStore';
import { useCurrentUser } from '@/stores/useAuthStore';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

// ============================================================================
// HELPERS
// ============================================================================

function getNotifIcon(type: string) {
  switch (type) {
    case 'order_created':        return <Package className="h-4 w-4 text-blue-500" />;
    case 'order_cancelled':      return <XCircle className="h-4 w-4 text-red-500" />;
    case 'order_status_updated': return <Package className="h-4 w-4 text-green-500" />;
    case 'shift_ending_soon':    return <Clock className="h-4 w-4 text-orange-500" />;
    case 'wallet_credited':      return <Wallet className="h-4 w-4 text-emerald-500" />;
    case 'points_earned':
    case 'referral_rewarded':    return <Star className="h-4 w-4 text-yellow-500" />;
    default:                     return <Info className="h-4 w-4 text-muted-foreground" />;
  }
}

/**
 * Returns the route to navigate to when a notification is clicked.
 * Returns null if there's no meaningful destination.
 */
function getNotifRoute(notif: AppNotification, role?: string): string | null {
  const orderId = notif.metadata?.orderId;
  const isStaff = role === 'staff' || role === 'receptionist';
  const base = isStaff ? '/staff' : '/admin';

  switch (notif.type) {
    case 'order_created':
      return orderId ? `${base}/orders/${orderId}` : `${base}/orders`;
    case 'order_cancelled':
      return orderId ? `${base}/orders/${orderId}` : `${base}/orders`;
    case 'order_status_updated':
      return orderId ? `${base}/orders/${orderId}` : `${base}/orders`;
    case 'shift_ending_soon':
      return `/admin/shifts`;
    default:
      return null;
  }
}

// ============================================================================
// NOTIFICATION ITEM
// ============================================================================

function NotificationItem({
  notif,
  role,
  onAction,
}: {
  notif: AppNotification;
  role?: string;
  onAction: (id: string, route: string | null) => void;
}) {
  const isUnread = !notif.readAt;
  const route = getNotifRoute(notif, role);

  return (
    <button
      onClick={() => onAction(notif._id, route)}
      className={cn(
        'w-full text-left px-4 py-3 border-b last:border-b-0 transition-colors hover:bg-accent/50',
        isUnread && 'bg-primary/5',
        route && 'cursor-pointer',
        !route && 'cursor-default'
      )}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex-shrink-0">{getNotifIcon(notif.type)}</div>
        <div className="flex-1 min-w-0">
          <p className={cn('text-sm truncate', isUnread ? 'font-semibold' : 'font-medium')}>
            {notif.title}
          </p>
          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{notif.body}</p>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-xs text-muted-foreground/70">
              {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}
            </p>
            {route && (
              <span className="text-xs text-primary/70 font-medium">View →</span>
            )}
          </div>
        </div>
        {isUnread && <div className="mt-1.5 h-2 w-2 rounded-full bg-primary flex-shrink-0" />}
      </div>
    </button>
  );
}

// ============================================================================
// NOTIFICATION BELL
// ============================================================================

export function NotificationBell() {
  const navigate = useNavigate();
  const user = useCurrentUser();
  const {
    notifications,
    unreadCount,
    isLoading,
    panelOpen,
    setPanelOpen,
    markAsRead,
    markAllAsRead,
    fetchNotifications,
  } = useNotificationStore();

  // Fetch on first open only — if data already exists, skip the re-fetch
  const hasFetched = useRef(false);
  useEffect(() => {
    if (panelOpen && !hasFetched.current) {
      hasFetched.current = true;
      fetchNotifications();
    }
  }, [panelOpen, fetchNotifications]);

  // Handle click: mark as read + navigate + close panel
  const handleAction = (id: string, route: string | null) => {
    markAsRead(id);
    if (route) {
      setPanelOpen(false);
      navigate(route);
    }
  };

  return (
    <Popover open={panelOpen} onOpenChange={setPanelOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-80 p-0" sideOffset={8}>
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div>
            <h3 className="text-sm font-semibold">Notifications</h3>
            {unreadCount > 0 && (
              <p className="text-xs text-muted-foreground">{unreadCount} unread</p>
            )}
          </div>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={markAllAsRead}>
              <CheckCheck className="h-3.5 w-3.5" />
              Mark all read
            </Button>
          )}
        </div>

        {/* List */}
        <ScrollArea className="h-[360px]">
          {isLoading && notifications.length === 0 ? (
            // Loading skeleton — only shown on first load
            <div className="divide-y">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex items-start gap-3 px-4 py-3">
                  <Skeleton className="h-4 w-4 mt-0.5 flex-shrink-0 rounded-full" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3.5 w-3/4" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-12 text-muted-foreground">
              <Bell className="h-8 w-8 mb-2 opacity-30" />
              <p className="text-sm">No notifications yet</p>
            </div>
          ) : (
            notifications.map((n) => (
              <NotificationItem
                key={n._id}
                notif={n}
                role={user?.role}
                onAction={handleAction}
              />
            ))
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
