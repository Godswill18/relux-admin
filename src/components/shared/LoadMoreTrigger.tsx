// ============================================================================
// LOAD MORE TRIGGER
// Sentinel div — fires callback via IntersectionObserver when it enters view.
// Drop it at the bottom of any scrollable list to get infinite-scroll / load-more.
// ============================================================================

import { useEffect, useRef, useCallback } from 'react';
import { Loader2 } from 'lucide-react';

interface LoadMoreTriggerProps {
  /** Called when the sentinel enters the viewport */
  onIntersect: () => void;
  /** Whether the next page is currently being fetched */
  isFetchingMore: boolean;
  /** Whether there are more pages to fetch — hides the trigger when false */
  hasMore: boolean;
}

export function LoadMoreTrigger({ onIntersect, isFetchingMore, hasMore }: LoadMoreTriggerProps) {
  const ref = useRef<HTMLDivElement>(null);

  const stableOnIntersect = useCallback(onIntersect, [onIntersect]);

  useEffect(() => {
    const el = ref.current;
    if (!el || !hasMore) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isFetchingMore) {
          stableOnIntersect();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, isFetchingMore, stableOnIntersect]);

  if (!hasMore && !isFetchingMore) return null;

  return (
    <div ref={ref} className="flex items-center justify-center py-4">
      {isFetchingMore && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading more…
        </div>
      )}
    </div>
  );
}
