// ============================================================================
// SONNER TOASTER - Globally configured toast notification container
//
// Position : top-center (below the 64px app header)
// Colors   : Success=green-600 | Error=red-600 | Warning=orange-500 |
//            Info=blue-600     | Default=gray-700
// Features : close button, 4 s auto-dismiss, deduplicated via toast.ts,
//            pause-on-hover (sonner default), stacked / expandable
// ============================================================================

import { Toaster as Sonner } from 'sonner';
import { useIsDarkMode } from '@/stores/useThemeStore';

const Toaster = () => {
  const isDark = useIsDarkMode();

  return (
    <Sonner
      // ── Positioning ────────────────────────────────────────────────────────
      // top-center keeps toasts away from the left-side navigation bar.
      // offset pushes them just below the 64 px app header (+ 12 px gap).
      position="top-center"
      offset={76}
      // ── Stack behaviour ───────────────────────────────────────────────────
      // expand shows every toast individually (no collapsed stack).
      // gap controls vertical spacing between stacked toasts.
      // visibleToasts caps the queue so the screen never floods.
      expand
      gap={8}
      visibleToasts={5}
      // ── Timing & controls ─────────────────────────────────────────────────
      duration={4000}
      closeButton
      // ── Theme ─────────────────────────────────────────────────────────────
      theme={isDark ? 'dark' : 'light'}
      // ── Styling ───────────────────────────────────────────────────────────
      // The `!` prefix maps to CSS `!important`, ensuring our Tailwind classes
      // win over sonner's own injected stylesheet.
      toastOptions={{
        classNames: {
          // Base — applied to every toast
          toast: [
            '!border-0 !shadow-xl rounded-lg',
            '!text-sm !font-medium',
            // Default (un-typed) toasts use a dark-gray background
            '!bg-gray-700 !text-white',
            // Cap width so toasts never reach the sidebar on wide screens
            '!max-w-[420px] !w-full',
          ].join(' '),

          // Text elements inherit the parent text colour
          title: '!font-semibold !text-inherit',
          description: '!text-xs !opacity-80 !mt-0.5 !text-inherit',

          // Close button — translucent white works on all coloured backgrounds
          closeButton: [
            '!bg-white/20 !border !border-white/30 !text-white',
            'hover:!bg-white/30',
          ].join(' '),

          // ── Per-type overrides ───────────────────────────────────────────
          success: '!bg-green-600 !text-white',
          error: '!bg-red-600 !text-white',
          // Warning uses dark text for sufficient contrast on orange
          warning: '!bg-orange-500 !text-black',
          info: '!bg-blue-600 !text-white',
        },
      }}
    />
  );
};

export { Toaster };
