// ============================================================================
// EDIT ORDER MODAL — Item editor, price recalculation, wallet refund preview
// ============================================================================

import { useEffect, useState, useCallback } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useOrderStore } from '@/stores/useOrderStore';
import { useServiceStore } from '@/stores/useServiceStore';
import { toast } from 'sonner';
import { Loader2, Plus, Trash2, AlertTriangle, ArrowRight, Wallet } from 'lucide-react';

// ============================================================================
// CONSTANTS
// ============================================================================

const SERVICE_TYPES = [
  { value: 'wash-fold',  label: 'Wash & Fold',  multiplier: 1 },
  { value: 'wash-only',  label: 'Wash Only',    multiplier: 1 },
  { value: 'wash-iron',  label: 'Wash & Iron',  multiplier: 1.5 },
  { value: 'iron-only',  label: 'Iron Only',    multiplier: 0.6 },
  { value: 'dry-clean',  label: 'Dry Clean',    multiplier: 1 },
];

const SL_MULTIPLIERS: Record<string, number> = { standard: 1, express: 1.5, premium: 2 };

// ============================================================================
// TYPES
// ============================================================================

interface EditItem {
  _id?: string;
  itemType: string;
  serviceType: string;
  quantity: number;
  unitPrice: number;
  categoryId?: string;
  categoryName?: string;
  description?: string;
}

// ============================================================================
// HELPERS
// ============================================================================

function computeUnitPrice(basePrice: number, serviceType: string): number {
  const multiplier = SERVICE_TYPES.find((s) => s.value === serviceType)?.multiplier ?? 1;
  return Math.round(basePrice * multiplier);
}

function recalcTotal(items: EditItem[], serviceLevel: string): number {
  const baseSubtotal = items.reduce((acc, i) => acc + i.unitPrice * i.quantity, 0);
  const slMult = SL_MULTIPLIERS[serviceLevel] || 1;
  const serviceFee = Math.round(baseSubtotal * (slMult - 1) * 100) / 100;
  return Math.max(0, baseSubtotal + serviceFee);
}

// ============================================================================
// COMPONENT
// ============================================================================

interface EditOrderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: any | null;
  onSaved?: (updatedOrder: any) => void;
}

export function EditOrderModal({ open, onOpenChange, order, onSaved }: EditOrderModalProps) {
  const { updateOrder } = useOrderStore();
  const { categories, fetchCategories } = useServiceStore();

  const [items, setItems] = useState<EditItem[]>([]);
  const [serviceLevel, setServiceLevel] = useState('standard');
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [notes, setNotes] = useState('');
  const [editNote, setEditNote] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Price diff preview state
  const previousTotal: number = order?.total || order?.pricing?.total || 0;
  const newTotal = recalcTotal(items, serviceLevel);
  const difference = Math.round((previousTotal - newTotal) * 100) / 100; // positive = refund
  const paidViaWallet = order?.payment?.method === 'wallet' && order?.paymentStatus === 'paid';
  const isLocked = ['completed', 'delivered', 'cancelled'].includes(order?.status || '');

  // Fetch categories on open
  useEffect(() => {
    if (open && categories.length === 0) fetchCategories();
  }, [open, categories.length, fetchCategories]);

  // Populate form from order
  useEffect(() => {
    if (!order || !open) return;
    setItems(
      (order.items || []).map((i: any) => ({
        _id: i._id,
        itemType: i.itemType || '',
        serviceType: i.serviceType || 'wash-fold',
        quantity: i.quantity || 1,
        unitPrice: i.unitPrice || 0,
        categoryId: i.categoryId || '',
        categoryName: i.categoryName || '',
        description: i.description || '',
      }))
    );
    setServiceLevel(order.serviceLevel || 'standard');
    setSpecialInstructions(order.specialInstructions || '');
    setNotes(order.notes || '');
    setEditNote('');
  }, [order, open]);

  // ── Item actions ────────────────────────────────────────────────────────────

  const updateItem = useCallback((idx: number, patch: Partial<EditItem>) => {
    setItems((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], ...patch };

      // Re-price when category or service type changes
      if (patch.categoryId !== undefined || patch.serviceType !== undefined) {
        const cat = categories.find((c: any) => (c._id || c.id) === (patch.categoryId ?? next[idx].categoryId));
        if (cat) {
          const base = cat.basePrice ?? 0;
          const svcType = patch.serviceType ?? next[idx].serviceType;
          next[idx].unitPrice = computeUnitPrice(base, svcType);
          if (patch.categoryId !== undefined) {
            next[idx].categoryName = cat.name || '';
            next[idx].itemType = next[idx].itemType || cat.name || '';
          }
        }
      }
      return next;
    });
  }, [categories]);

  const addItem = () => {
    setItems((prev) => [...prev, {
      itemType: '',
      serviceType: 'wash-fold',
      quantity: 1,
      unitPrice: 0,
      categoryId: '',
      categoryName: '',
      description: '',
    }]);
  };

  const removeItem = (idx: number) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  // ── Submit ──────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!order) return;
    if (items.length === 0) { toast.error('Order must have at least one item'); return; }
    if (items.some((i) => !i.itemType.trim())) { toast.error('All items must have a name'); return; }

    const orderId = order._id || order.id;
    setIsSaving(true);
    try {
      const payload: Record<string, any> = {
        items: items.map((i) => ({
          _id: i._id,
          itemType: i.itemType,
          serviceType: i.serviceType,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          total: i.unitPrice * i.quantity,
          categoryId: i.categoryId || undefined,
          categoryName: i.categoryName || undefined,
          description: i.description || undefined,
        })),
        serviceLevel,
        specialInstructions,
        notes,
        editNote: editNote || undefined,
      };

      await updateOrder(orderId, payload);
      // Re-fetch the updated order to get populated editHistory + refund info
      const { default: apiClient } = await import('@/lib/api/client');
      const res = await apiClient.get(`/orders/${orderId}`);
      const updatedOrder = res.data?.data?.order || res.data?.data;

      toast.success(
        difference > 0 && paidViaWallet
          ? `Order saved. ₦${difference.toLocaleString()} refunded to customer wallet.`
          : difference < 0
            ? `Order saved. Additional payment of ₦${Math.abs(difference).toLocaleString()} required.`
            : 'Order updated successfully.'
      );
      onSaved?.(updatedOrder);
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to update order');
    } finally {
      setIsSaving(false);
    }
  };

  if (!order) return null;

  const customerName = order.customer?.name || order.walkInCustomer?.name || '—';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Order</DialogTitle>
          <DialogDescription>
            {order.orderNumber || order.code || `Order #${order._id?.slice(0, 8)}`} — {customerName}
          </DialogDescription>
        </DialogHeader>

        {isLocked && (
          <div className="flex items-center gap-2 rounded-md border border-destructive bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            This order is <strong className="ml-1">{order.status}</strong> and cannot be edited.
          </div>
        )}

        <div className={`space-y-5 ${isLocked ? 'pointer-events-none opacity-60' : ''}`}>

          {/* Service Level */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Service Level</label>
            <Select value={serviceLevel} onValueChange={setServiceLevel}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="standard">Standard</SelectItem>
                <SelectItem value="express">Express (+50%)</SelectItem>
                <SelectItem value="premium">Premium (+100%)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Items */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Items</label>
              <Button type="button" variant="outline" size="sm" onClick={addItem}>
                <Plus className="h-3 w-3 mr-1" /> Add Item
              </Button>
            </div>

            {items.length === 0 && (
              <p className="text-sm text-muted-foreground py-2">No items. Add at least one item.</p>
            )}

            <div className="space-y-3">
              {items.map((item, idx) => (
                <div key={idx} className="rounded-lg border p-3 space-y-3">
                  <div className="flex items-start gap-2">
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {/* Category picker */}
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">Category</label>
                        <Select
                          value={item.categoryId || ''}
                          onValueChange={(val) => updateItem(idx, { categoryId: val })}
                        >
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            {categories
                              .filter((c: any) => c.active !== false)
                              .map((c: any) => (
                                <SelectItem key={c._id || c.id} value={c._id || c.id}>
                                  {c.name} — ₦{(c.basePrice || 0).toLocaleString()}
                                </SelectItem>
                              ))}
                            <SelectItem value="__manual__">Manual entry</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Item name */}
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">Item Name</label>
                        <Input
                          className="h-8 text-sm"
                          placeholder="e.g. Shirt, Trouser"
                          value={item.itemType}
                          onChange={(e) => updateItem(idx, { itemType: e.target.value })}
                        />
                      </div>

                      {/* Service type */}
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">Service Type</label>
                        <Select
                          value={item.serviceType}
                          onValueChange={(val) => updateItem(idx, { serviceType: val })}
                        >
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {SERVICE_TYPES.map((s) => (
                              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Quantity */}
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">Qty</label>
                        <Input
                          className="h-8 text-sm"
                          type="number"
                          min={1}
                          value={item.quantity}
                          onChange={(e) => updateItem(idx, { quantity: Math.max(1, parseInt(e.target.value) || 1) })}
                        />
                      </div>
                    </div>

                    {/* Remove */}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="shrink-0 h-8 w-8 text-destructive hover:text-destructive mt-5"
                      onClick={() => removeItem(idx)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Per-item price display */}
                  <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
                    <span>₦{item.unitPrice.toLocaleString()} × {item.quantity}</span>
                    <span className="font-medium text-foreground">
                      ₦{(item.unitPrice * item.quantity).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Special Instructions */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Special Instructions</label>
            <Textarea
              rows={2}
              className="resize-none text-sm"
              placeholder="Any special handling instructions…"
              value={specialInstructions}
              onChange={(e) => setSpecialInstructions(e.target.value)}
            />
          </div>

          {/* Internal Notes */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Internal Notes</label>
            <Textarea
              rows={2}
              className="resize-none text-sm"
              placeholder="Internal notes (not visible to customer)…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {/* Edit reason */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Reason for Edit <span className="text-muted-foreground font-normal">(optional)</span></label>
            <Input
              className="text-sm"
              placeholder="e.g. Customer added extra items"
              value={editNote}
              onChange={(e) => setEditNote(e.target.value)}
            />
          </div>

          {/* ── Price Diff Summary ─────────────────────────────────────────── */}
          {items.length > 0 && (
            <div className="rounded-lg border bg-muted/40 p-4 space-y-3">
              <p className="text-sm font-medium">Price Summary</p>
              <div className="flex items-center gap-3 text-sm">
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Previous Total</p>
                  <p className="font-medium">₦{previousTotal.toLocaleString()}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">New Total</p>
                  <p className="font-medium">₦{newTotal.toLocaleString()}</p>
                </div>
                {difference !== 0 && (
                  <>
                    <Separator orientation="vertical" className="h-8" />
                    <div>
                      <p className="text-xs text-muted-foreground">Difference</p>
                      <p className={`font-semibold ${difference > 0 ? 'text-green-600' : 'text-destructive'}`}>
                        {difference > 0 ? '−' : '+'}₦{Math.abs(difference).toLocaleString()}
                      </p>
                    </div>
                  </>
                )}
              </div>

              {difference > 0 && paidViaWallet && (
                <div className="flex items-start gap-2 text-sm text-green-700 bg-green-50 dark:bg-green-950/30 rounded-md px-3 py-2">
                  <Wallet className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>
                    <strong>₦{difference.toLocaleString()}</strong> will be automatically refunded to the customer's wallet.
                  </span>
                </div>
              )}

              {difference > 0 && !paidViaWallet && order?.paymentStatus === 'paid' && (
                <div className="flex items-start gap-2 text-sm text-amber-700 bg-amber-50 dark:bg-amber-950/30 rounded-md px-3 py-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>
                    Order was paid by <strong>{order?.payment?.method}</strong>. Manual refund of{' '}
                    <strong>₦{difference.toLocaleString()}</strong> may be required.
                  </span>
                </div>
              )}

              {difference < 0 && (
                <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>
                    Additional payment of <strong>₦{Math.abs(difference).toLocaleString()}</strong> will be required.
                    Payment status will be set to <strong>Partial</strong>.
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving || isLocked}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
