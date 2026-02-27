// ============================================================================
// DEACTIVATE STAFF MODAL - Confirm Staff Activation/Deactivation
// ============================================================================

import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useStaffStore } from '@/stores/useStaffStore';
import { Staff } from '@/types';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface DeactivateStaffModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staff: Staff | null;
}

export function DeactivateStaffModal({ open, onOpenChange, staff }: DeactivateStaffModalProps) {
  const { toggleStaffStatus } = useStaffStore();
  const [isProcessing, setIsProcessing] = useState(false);

  const staffId = staff ? (staff as any)._id || staff.id : null;
  const isCurrentlyActive = staff?.isActive;
  const actionLabel = isCurrentlyActive ? 'Deactivate' : 'Activate';

  const handleToggle = async () => {
    if (!staffId) return;
    try {
      setIsProcessing(true);
      await toggleStaffStatus(staffId);
      toast.success(
        `${staff?.name || 'Staff member'} has been ${isCurrentlyActive ? 'deactivated' : 'activated'}`
      );
      onOpenChange(false);
    } catch {
      toast.error(`Failed to ${actionLabel.toLowerCase()} staff member`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{actionLabel} Staff Member</AlertDialogTitle>
          <AlertDialogDescription>
            {isCurrentlyActive ? (
              <>
                Are you sure you want to deactivate <strong>{staff?.name}</strong>?
                They will no longer be able to log in or be assigned to orders and shifts.
              </>
            ) : (
              <>
                Are you sure you want to activate <strong>{staff?.name}</strong>?
                They will be able to log in and be assigned to orders and shifts again.
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleToggle}
            disabled={isProcessing}
            className={
              isCurrentlyActive
                ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                : ''
            }
          >
            {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {actionLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
