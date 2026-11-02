import { ComponentType, lazy, ReactNode, Suspense } from 'react';

const RELOAD_FLAG = 'relux-chunk-reload';

/**
 * lazy() that survives a deploy. A tab left open across a release asks for page
 * files that no longer exist; reloading once picks up the new version. If the
 * reload doesn't help, the error is real and is surfaced rather than looped on.
 */
export function lazyPage<T extends ComponentType<any>>(load: () => Promise<{ default: T }>) {
  return lazy(async () => {
    try {
      const mod = await load();
      try { sessionStorage.removeItem(RELOAD_FLAG); } catch { /* storage blocked */ }
      return mod;
    } catch (err) {
      let alreadyTried = true;
      try {
        alreadyTried = !!sessionStorage.getItem(RELOAD_FLAG);
        if (!alreadyTried) sessionStorage.setItem(RELOAD_FLAG, '1');
      } catch { /* storage blocked: don't risk a reload loop */ }
      if (alreadyTried) throw err;
      window.location.reload();
      return new Promise<{ default: T }>(() => {}); // the reload takes over
    }
  });
}

/** Sits inside the layout, so the sidebar stays put while a page's code loads. */
export function RouteSuspense({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="space-y-4" aria-busy="true" aria-label="Loading page">
          <div className="h-8 w-48 animate-pulse rounded bg-muted" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => <div key={i} className="h-24 animate-pulse rounded-lg bg-muted" />)}
          </div>
          <div className="h-64 animate-pulse rounded-lg bg-muted" />
        </div>
      }
    >
      {children}
    </Suspense>
  );
}
