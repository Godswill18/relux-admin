import { useState, useEffect } from 'react';
import { Loader2, AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { OrderStatusBadge } from '@/components/shared/StatusBadges';
import { toast } from 'sonner';
import apiClient from '@/lib/api/client';

interface CancelOrderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: { _id: string; orderNumber?: string; code?: string; status: string; customer?: any };
  onSuccess: () => void;
}

export function CancelOrderModal({ open, onOpenChange, order, onSuccess }: CancelOrderModalProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [reason, setReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!open) {
      setStep(1);
      setReason('');
    }
  }, [open]);

  const orderLabel = order.orderNumber || order.code || `#${order._id?.substring(0, 8)}`;
  const customerName =
    order.customer?.customerId?.name ||
    order.customer?.name ||
    order.customer?.customerId?.fullName ||
    'Unknown customer';

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      await apiClient.put(`/orders/${order._id}/cancel`, { reason });
      toast.success('Order cancelled');
      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to cancel order');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {/* ── Step 1: Confirm intent ── */}
        {step === 1 && (
          <>
            <DialogHeader>
              <DialogTitle>Cancel Order</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div className="rounded-lg border bg-muted/40 px-4 py-3 space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Order</span>
                  <span className="font-medium">{orderLabel}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <OrderStatusBadge status={order.status} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Customer</span>
                  <span className="font-medium">{customerName}</span>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                You are about to cancel this order. You will be asked to provide a reason before the cancellation is applied.
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Back
              </Button>
              <Button onClick={() => setStep(2)}>Next →</Button>
            </DialogFooter>
          </>
        )}

        {/* ── Step 2: Reason ── */}
        {step === 2 && (
          <>
            <DialogHeader>
              <DialogTitle>Why are you cancelling?</DialogTitle>
            </DialogHeader>
            <div className="py-2">
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Customer requested cancellation, duplicate order…"
                rows={4}
                className="resize-none"
              />
              {reason.length > 0 && reason.length < 10 && (
                <p className="mt-1.5 text-xs text-destructive">
                  Please provide at least 10 characters.
                </p>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setStep(1)}>
                ← Back
              </Button>
              <Button onClick={() => setStep(3)} disabled={reason.trim().length < 10}>
                Next →
              </Button>
            </DialogFooter>
          </>
        )}

        {/* ── Step 3: Final confirm ── */}
        {step === 3 && (
          <>
            <DialogHeader>
              <DialogTitle>Confirm Cancellation</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <blockquote className="rounded-md border-l-4 border-muted bg-muted/40 px-4 py-2 text-sm text-muted-foreground italic">
                "{reason}"
              </blockquote>
              <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                <p className="text-sm text-destructive">
                  This cannot be undone. The order status will be set to cancelled.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setStep(2)} disabled={isLoading}>
                ← Back
              </Button>
              <Button
                variant="destructive"
                onClick={handleConfirm}
                disabled={isLoading}
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Cancel Order
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
