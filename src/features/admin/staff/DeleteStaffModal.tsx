// ============================================================================
// DELETE STAFF MODAL - Confirm Staff Deletion
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

interface DeleteStaffModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staff: Staff | null;
}

export function DeleteStaffModal({ open, onOpenChange, staff }: DeleteStaffModalProps) {
  const { deleteStaff } = useStaffStore();
  const [isDeleting, setIsDeleting] = useState(false);

  const staffId = staff ? (staff as any)._id || staff.id : null;

  const handleDelete = async () => {
    if (!staffId) return;
    try {
      setIsDeleting(true);
      await deleteStaff(staffId);
      toast.success(`${staff?.name || 'Staff member'} has been deleted`);
      onOpenChange(false);
    } catch {
      toast.error('Failed to delete staff member');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Staff Member</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to permanently delete <strong>{staff?.name}</strong>?
            This action cannot be undone and will remove all their data including
            shifts, attendance records, and compensation information.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
