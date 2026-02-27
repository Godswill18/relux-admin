// ============================================================================
// DELETE TIER MODAL - Confirmation Dialog for Deleting a Loyalty Tier
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
import { useLoyaltyStore } from '@/stores/useLoyaltyStore';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface DeleteTierModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tier: any | null;
}

export function DeleteTierModal({ open, onOpenChange, tier }: DeleteTierModalProps) {
  const { deleteTier } = useLoyaltyStore();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!tier) return;
    try {
      setIsDeleting(true);
      const tierId = tier._id || tier.id;
      await deleteTier(tierId);
      toast.success('Tier deleted successfully');
      onOpenChange(false);
    } catch {
      toast.error('Failed to delete tier');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Loyalty Tier</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete the <strong>"{tier?.name}"</strong> tier?
            This action cannot be undone. Customers currently in this tier may be affected.
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
            Delete Tier
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
