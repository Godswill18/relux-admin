// ============================================================================
// SwipeableCard — Horizontal swipe gesture wrapper for order status updates.
//
// Right swipe → fires onSwipeRight (next status)
// Left  swipe → fires onSwipeLeft  (prev status)
//
// Uses native pointer events — works on touch AND mouse.
// Prevents card onClick from firing when a swipe gesture occurred.
// ============================================================================

import { useRef, useState } from 'react';
import { ArrowRight, ArrowLeft } from 'lucide-react';

const THRESHOLD   = 80;   // px of raw finger movement to trigger
const MAX_TRAVEL  = 120;  // px max card displacement
const SNAP_MS     = 180;  // snap-back animation duration

interface SwipeableCardProps {
  children: React.ReactNode;
  /** Called when user swipes right past threshold */
  onSwipeRight?: () => void;
  /** Called when user swipes left past threshold */
  onSwipeLeft?: () => void;
  /** Label shown in the green right-swipe overlay (e.g. "Washing") */
  rightLabel?: string;
  /** Label shown in the gray left-swipe overlay (e.g. "In Progress") */
  leftLabel?: string;
  /** Suppress all swipe interaction (e.g. cancelled orders) */
  disabled?: boolean;
}

export function SwipeableCard({
  children,
  onSwipeRight,
  onSwipeLeft,
  rightLabel,
  leftLabel,
  disabled = false,
}: SwipeableCardProps) {
  const [dx, setDx]             = useState(0);
  const [snapping, setSnapping] = useState(false);

  const containerRef  = useRef<HTMLDivElement>(null);
  const startXRef     = useRef(0);
  const startYRef     = useRef(0);
  const isDragging    = useRef(false);
  const isSwipeAxis   = useRef<boolean | null>(null); // null = undecided
  const didSwipe      = useRef(false);

  // ── Helpers ────────────────────────────────────────────────────────────────

  const snapBack = () => {
    setSnapping(true);
    setDx(0);
    setTimeout(() => setSnapping(false), SNAP_MS);
  };

  const formatLabel = (label: string) =>
    label.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  // ── Pointer handlers ───────────────────────────────────────────────────────

  const onPointerDown = (e: React.PointerEvent) => {
    if (disabled) return;
    // Let buttons and dropdown triggers handle their own events
    if ((e.target as Element).closest('button, [role="menuitem"]')) return;

    startXRef.current  = e.clientX;
    startYRef.current  = e.clientY;
    isDragging.current = true;
    isSwipeAxis.current = null;
    didSwipe.current   = false;
    containerRef.current?.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current || snapping) return;

    const rawX = e.clientX - startXRef.current;
    const rawY = e.clientY - startYRef.current;

    // Decide axis on first significant movement
    if (isSwipeAxis.current === null) {
      if (Math.abs(rawX) < 5 && Math.abs(rawY) < 5) return;
      isSwipeAxis.current = Math.abs(rawX) > Math.abs(rawY);
    }
    if (!isSwipeAxis.current) return; // vertical scroll — don't interfere

    // Block direction if no handler
    if (rawX > 0 && !onSwipeRight) { setDx(0); return; }
    if (rawX < 0 && !onSwipeLeft)  { setDx(0); return; }

    const clamped = Math.max(-MAX_TRAVEL, Math.min(MAX_TRAVEL, rawX));
    setDx(clamped);
  };

  const onPointerUp = () => {
    if (!isDragging.current) return;
    isDragging.current = false;

    if (Math.abs(dx) >= THRESHOLD) {
      didSwipe.current = true;
      const direction = dx > 0 ? 'right' : 'left';
      snapBack();
      setTimeout(() => {
        if (direction === 'right') onSwipeRight?.();
        else onSwipeLeft?.();
      }, SNAP_MS);
    } else {
      snapBack();
    }
  };

  const onPointerCancel = () => {
    isDragging.current = false;
    snapBack();
  };

  // Capture phase: swallow click events that follow a completed swipe gesture
  const onClickCapture = (e: React.MouseEvent) => {
    if (didSwipe.current) {
      e.stopPropagation();
      didSwipe.current = false;
    }
  };

  // ── Derived visual values ──────────────────────────────────────────────────

  const progress  = Math.min(Math.abs(dx) / THRESHOLD, 1);
  const direction = dx > 0 ? 'right' : dx < 0 ? 'left' : null;

  return (
    <div
      ref={containerRef}
      className="relative overflow-hidden rounded-lg select-none"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onClickCapture={onClickCapture}
    >
      {/* ── Right-swipe overlay (next status) ─────────────────────────────── */}
      {onSwipeRight && rightLabel && (
        <div
          aria-hidden
          className="absolute inset-0 flex items-center pl-5 gap-2 bg-green-500/15 pointer-events-none"
          style={{ opacity: direction === 'right' ? progress : 0 }}
        >
          <ArrowRight className="h-4 w-4 text-green-600 dark:text-green-400 shrink-0" />
          <span className="text-sm font-medium text-green-700 dark:text-green-400 whitespace-nowrap">
            Move to {formatLabel(rightLabel)}
          </span>
        </div>
      )}

      {/* ── Left-swipe overlay (prev status) ──────────────────────────────── */}
      {onSwipeLeft && leftLabel && (
        <div
          aria-hidden
          className="absolute inset-0 flex items-center justify-end pr-5 gap-2 bg-muted/60 pointer-events-none"
          style={{ opacity: direction === 'left' ? progress : 0 }}
        >
          <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">
            Back to {formatLabel(leftLabel)}
          </span>
          <ArrowLeft className="h-4 w-4 text-muted-foreground shrink-0" />
        </div>
      )}

      {/* ── Card content (translates with finger) ─────────────────────────── */}
      <div
        style={{
          transform: `translateX(${dx}px)`,
          transition: snapping ? `transform ${SNAP_MS}ms ease-out` : 'none',
          touchAction: 'pan-y',
          willChange: 'transform',
        }}
      >
        {children}
      </div>
    </div>
  );
}
