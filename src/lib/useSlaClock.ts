import { useEffect, useState } from 'react';
import { onClockChange, serverNow } from './sla';

/**
 * Re-renders every `intervalMs` with the server-corrected time. Pauses while the
 * tab is hidden and snaps back to the right value on return — the deadline
 * itself comes from the server, so nothing drifts or resets.
 */
export function useSlaNow(intervalMs = 1000): number {
  const [now, setNow] = useState(serverNow);
  useEffect(() => {
    const tick = () => { if (!document.hidden) setNow(serverNow()); };
    const id = setInterval(tick, intervalMs);
    const off = onClockChange(tick);
    document.addEventListener('visibilitychange', tick);
    tick();
    return () => { clearInterval(id); off(); document.removeEventListener('visibilitychange', tick); };
  }, [intervalMs]);
  return now;
}
