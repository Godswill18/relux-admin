// ============================================================================
// UPDATE STATUS MODAL - Staff can advance an order through its lifecycle
// ============================================================================

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import apiClient from '@/lib/api/client';

// ============================================================================
// CONFIG
// ============================================================================

// Statuses that staff can transition an order to
const STAFF_STATUSES = [
  { value: 'confirmed',         label: 'Confirmed' },
  { value: 'in_progress',       label: 'In Progress' },
  { value: 'picked-up',         label: 'Picked Up' },
  { value: 'washing',           label: 'Washing' },
  { value: 'ironing',           label: 'Ironing' },
  { value: 'ready',             label: 'Ready for Collection' },
  { value: 'out-for-delivery',  label: 'Out for Delivery' },
  { value: 'delivered',         label: 'Delivered' },
  { value: 'completed',         label: 'Completed' },
];

const PAYMENT_STATUSES = [
  { value: 'unpaid',    label: 'Unpaid' },
  { value: 'paid',      label: 'Paid' },
  { value: 'partial',   label: 'Partial' },
  { value: 'refunded',  label: 'Refunded' },
];

// ============================================================================
// COMPONENT
// ============================================================================

interface UpdateStatusModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: any | null;
  onSuccess: () => void;
}

export function UpdateStatusModal({
  open,
  onOpenChange,
  order,
  onSuccess,
}: UpdateStatusModalProps) {
  const [status, setStatus] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Pre-fill payment status from the order when it opens
  const currentPaymentStatus = order?.paymentStatus || order?.payment?.status || '';
  if (open && !paymentStatus && currentPaymentStatus) {
    setPaymentStatus(currentPaymentStatus);
  }

  const handleSubmit = async () => {
    if (!order || (!status && !paymentStatus)) return;
    const orderId = order._id || order.id;
    try {
      setIsLoading(true);

      // Update order status (PATCH /orders/:id/status)
      if (status) {
        await apiClient.patch(`/orders/${orderId}/status`, {
          status,
          notes: notes.trim() || undefined,
        });
      }

      // Update payment status (PUT /orders/:id with paymentStatus)
      if (paymentStatus && paymentStatus !== currentPaymentStatus) {
        await apiClient.put(`/orders/${orderId}`, { paymentStatus });
      }

      const statusLabel = STAFF_STATUSES.find((s) => s.value === status)?.label;
      const payLabel    = PAYMENT_STATUSES.find((p) => p.value === paymentStatus)?.label;
      if (statusLabel && payLabel) {
        toast.success(`Status → ${statusLabel} · Payment → ${payLabel}`);
      } else if (statusLabel) {
        toast.success(`Order status updated to "${statusLabel}"`);
      } else {
        toast.success(`Payment status updated to "${payLabel}"`);
      }

      setStatus('');
      setPaymentStatus('');
      setNotes('');
      onOpenChange(false);
      onSuccess();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to update order');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (isLoading) return;
    setStatus('');
    setPaymentStatus('');
    setNotes('');
    onOpenChange(false);
  };

  if (!order) return null;

  const customerName =
    order.walkInCustomer?.name ||
    order.customer?.name ||
    'Unknown';

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Update Order</DialogTitle>
          <DialogDescription>
            Order <span className="font-mono font-semibold">{order.orderNumber}</span> —{' '}
            {customerName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Order Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Keep current status..." />
              </SelectTrigger>
              <SelectContent>
                {STAFF_STATUSES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Payment Status</Label>
            <Select value={paymentStatus} onValueChange={setPaymentStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Keep current payment status..." />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_STATUSES.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Notes (optional)</Label>
            <Textarea
              placeholder="Any remarks about this update..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={(!status && !paymentStatus) || isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
