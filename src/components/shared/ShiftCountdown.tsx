// ============================================================================
// SHIFT COUNTDOWN - Fixed-position countdown timer for shift ending
// ============================================================================

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/useAuthStore';
import { AlertTriangle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export function ShiftCountdown() {
  const { shiftEndTime, clearShiftEnd, logout } = useAuthStore();
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!shiftEndTime) {
      setTimeLeft(null);
      setDismissed(false);
      return;
    }

    const update = () => {
      const remaining = Math.max(0, shiftEndTime - Date.now());
      setTimeLeft(remaining);

      if (remaining <= 0) {
        // Shift ended — auto-logout
        clearShiftEnd();
        logout();
        navigate('/login?reason=shift-ended', { replace: true });
      }
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [shiftEndTime, clearShiftEnd, logout, navigate]);

  if (!shiftEndTime || timeLeft === null || timeLeft <= 0 || dismissed) {
    return null;
  }

  const minutes = Math.floor(timeLeft / 60000);
  const seconds = Math.floor((timeLeft % 60000) / 1000);

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-destructive text-destructive-foreground rounded-lg shadow-lg p-4 max-w-sm animate-in slide-in-from-bottom-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 mt-0.5 shrink-0" />
        <div className="flex-1">
          <div className="font-semibold text-sm">Shift Ending Soon</div>
          <div className="text-2xl font-bold tabular-nums">
            {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
          </div>
          <div className="text-xs opacity-80 mt-1">
            You will be logged out when your shift ends
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 text-destructive-foreground hover:bg-destructive-foreground/20"
          onClick={() => setDismissed(true)}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
