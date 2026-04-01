// ============================================================================
// ASSIGN STAFF MODAL - Assign a staff member to an order
// ============================================================================

import { useEffect, useState } from 'react';
import { ModalForm } from '@/components/shared/ModalForm';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useOrderStore } from '@/stores/useOrderStore';
import { useStaffStore } from '@/stores/useStaffStore';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

// ============================================================================
// COMPONENT
// ============================================================================

interface AssignStaffModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: any | null;
}

export function AssignStaffModal({ open, onOpenChange, order }: AssignStaffModalProps) {
  const { assignStaff } = useOrderStore();
  const { staff: staffList, fetchStaff, isLoading: isLoadingStaff } = useStaffStore();
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Load staff list when modal opens
  useEffect(() => {
    if (open) {
      fetchStaff();
      // Pre-select currently assigned staff if any
      const current = order?.assignedStaff;
      if (current) {
        setSelectedStaffId(current._id || current.id || current);
      } else {
        setSelectedStaffId('');
      }
    }
  }, [open, order, fetchStaff]);

  const handleSave = async () => {
    if (!order || !selectedStaffId) return;
    try {
      setIsSaving(true);
      await assignStaff(order._id || order.id, selectedStaffId);
      toast.success('Staff assigned successfully');
      onOpenChange(false);
    } catch {
      toast.error('Failed to assign staff');
    } finally {
      setIsSaving(false);
    }
  };

  const customerName = order?.customer?.name || order?.walkInCustomer?.name || '—';
  const activeStaff = staffList.filter((s) => s.isActive !== false);

  return (
    <ModalForm
      open={open}
      onOpenChange={onOpenChange}
      title="Assign Staff"
      description={`Assign a staff member to order ${order?.orderNumber || ''} for ${customerName}`}
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Staff Member</Label>
          {isLoadingStaff ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading staff…
            </div>
          ) : (
            <Select value={selectedStaffId} onValueChange={setSelectedStaffId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a staff member" />
              </SelectTrigger>
              <SelectContent>
                {activeStaff.length === 0 ? (
                  <SelectItem value="__none" disabled>No active staff found</SelectItem>
                ) : (
                  activeStaff.map((s) => {
                    const id = (s as any)._id || s.id;
                    return (
                      <SelectItem key={id} value={id}>
                        {s.name}
                        {(s.staffRole || s.role) && (
                          <span className="text-muted-foreground capitalize ml-1.5 text-xs">
                            ({s.staffRole || s.role})
                          </span>
                        )}
                      </SelectItem>
                    );
                  })
                )}
              </SelectContent>
            </Select>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving || !selectedStaffId}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Assign
          </Button>
        </div>
      </div>
    </ModalForm>
  );
}
