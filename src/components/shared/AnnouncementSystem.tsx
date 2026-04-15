// ============================================================================
// ANNOUNCEMENT SYSTEM — Shared hook + Banner + Popup components
// Used by Admin, Staff, and Delivery dashboards.
//
// Rules:
//  - Popups shown at most ONCE per session per announcement (sessionStorage key)
//  - Banners can be dismissed; state held in component
//  - Fetch is non-blocking (fires after mount)
// ============================================================================

import { useEffect, useState, useCallback } from 'react';
import { X, Megaphone, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import apiClient from '@/lib/api/client';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AnnouncementItem {
  _id: string;
  title: string;
  message: string;
  type: 'announcement' | 'promotion';
  targetAudience: 'staff' | 'customer' | 'both';
  displayMode: 'popup' | 'banner';
  imageUrl: string;
  ctaLabel: string;
  ctaUrl: string;
  priority: number;
}

// ── Session dedup helper ──────────────────────────────────────────────────────

const SESSION_KEY = 'rlx_seen_announcements';

function getSeenIds(): Set<string> {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

function markSeen(id: string) {
  try {
    const seen = getSeenIds();
    seen.add(id);
    sessionStorage.setItem(SESSION_KEY, JSON.stringify([...seen]));
  } catch {}
}

// ── useFetchAnnouncements hook ────────────────────────────────────────────────

export function useFetchAnnouncements() {
  const [banners, setBanners]   = useState<AnnouncementItem[]>([]);
  const [popups,  setPopups]    = useState<AnnouncementItem[]>([]);
  const [loaded,  setLoaded]    = useState(false);

  const fetch = useCallback(async () => {
    try {
      const res = await apiClient.get('/announcements/active');
      const all: AnnouncementItem[] = res.data?.data?.announcements || [];
      const seen = getSeenIds();

      const newBanners = all.filter((a) => a.displayMode === 'banner');
      // Popups: only ones not yet seen this session
      const newPopups  = all.filter((a) => a.displayMode === 'popup' && !seen.has(a._id));

      setBanners(newBanners);
      setPopups(newPopups);
      setLoaded(true);
    } catch {
      setLoaded(true); // fail silently — announcements are non-critical
    }
  }, []);

  useEffect(() => {
    // Non-blocking: wait for first render to complete
    const t = setTimeout(fetch, 800);
    return () => clearTimeout(t);
  }, [fetch]);

  return { banners, popups, loaded };
}

// ── AnnouncementBanner ────────────────────────────────────────────────────────

interface BannerProps {
  items: AnnouncementItem[];
}

export function AnnouncementBanners({ items }: BannerProps) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  if (items.length === 0) return null;

  const visible = items.filter((i) => !dismissed.has(i._id));
  if (visible.length === 0) return null;

  return (
    <div className="space-y-2 mb-4">
      {visible.map((item) => {
        const isPromo = item.type === 'promotion';
        return (
          <div
            key={item._id}
            className={`relative flex items-start gap-3 rounded-lg border px-4 py-3 pr-10 ${
              isPromo
                ? 'border-purple-200 bg-purple-50 dark:border-purple-800 dark:bg-purple-950/30'
                : 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30'
            }`}
          >
            {item.imageUrl && (
              <img
                src={item.imageUrl}
                alt=""
                className="h-10 w-10 rounded object-cover shrink-0"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            )}
            {!item.imageUrl && (
              <Megaphone className={`h-5 w-5 mt-0.5 shrink-0 ${isPromo ? 'text-purple-600' : 'text-blue-600'}`} />
            )}
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-semibold ${isPromo ? 'text-purple-800 dark:text-purple-300' : 'text-blue-800 dark:text-blue-300'}`}>
                {item.title}
              </p>
              <p className={`text-xs mt-0.5 ${isPromo ? 'text-purple-700 dark:text-purple-400' : 'text-blue-700 dark:text-blue-400'}`}>
                {item.message}
              </p>
              {item.ctaLabel && item.ctaUrl && (
                <a
                  href={item.ctaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex items-center gap-1 text-xs font-medium mt-1 underline ${
                    isPromo ? 'text-purple-700 dark:text-purple-400' : 'text-blue-700 dark:text-blue-400'
                  }`}
                >
                  {item.ctaLabel} <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
            <button
              onClick={() => setDismissed((prev) => new Set([...prev, item._id]))}
              className="absolute top-2 right-2 p-1 rounded hover:bg-black/10 transition-colors"
              aria-label="Dismiss"
            >
              <X className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

// ── AnnouncementPopups ────────────────────────────────────────────────────────

interface PopupsProps {
  items: AnnouncementItem[];
}

export function AnnouncementPopups({ items }: PopupsProps) {
  const [queue, setQueue]       = useState<AnnouncementItem[]>([]);
  const [current, setCurrent]   = useState<AnnouncementItem | null>(null);

  // Load queue once items arrive
  useEffect(() => {
    if (items.length > 0) {
      setQueue([...items]);
    }
  }, [items]);

  // Show next popup when queue changes
  useEffect(() => {
    if (!current && queue.length > 0) {
      const [next, ...rest] = queue;
      setCurrent(next);
      setQueue(rest);
      markSeen(next._id);
    }
  }, [queue, current]);

  const handleClose = () => {
    setCurrent(null);
    // Small delay before showing next, to avoid jarring back-to-back popups
    if (queue.length > 0) {
      setTimeout(() => {
        const [next, ...rest] = queue;
        setCurrent(next);
        setQueue(rest);
        markSeen(next._id);
      }, 400);
    }
  };

  if (!current) return null;

  const isPromo = current.type === 'promotion';

  return (
    <Dialog open={!!current} onOpenChange={(open) => { if (!open) handleClose(); }}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden">
        {/* Image banner */}
        {current.imageUrl && (
          <div className="w-full aspect-video bg-muted">
            <img
              src={current.imageUrl}
              alt={current.title}
              className="w-full h-full object-cover"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          </div>
        )}

        <div className="p-6 space-y-3">
          <DialogHeader>
            <div className="flex items-center gap-2">
              {isPromo ? (
                <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">
                  Promotion
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                  <Megaphone className="h-3 w-3" />
                  Announcement
                </span>
              )}
            </div>
            <DialogTitle className="text-xl leading-snug">{current.title}</DialogTitle>
          </DialogHeader>

          <p className="text-sm text-muted-foreground leading-relaxed">{current.message}</p>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={handleClose}>
              Close
            </Button>
            {current.ctaLabel && current.ctaUrl && (
              <Button
                size="sm"
                asChild
                className={isPromo ? 'bg-purple-600 hover:bg-purple-700' : ''}
              >
                <a href={current.ctaUrl} target="_blank" rel="noopener noreferrer">
                  {current.ctaLabel}
                  <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
                </a>
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
