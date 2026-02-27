// ============================================================================
// PICKUP WINDOWS TAB - Pickup Time Management
// ============================================================================

import { useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { MoreHorizontal, Edit, Trash, Plus, Clock } from 'lucide-react';
import { AddPickupWindowModal } from './AddPickupWindowModal';
import { DeleteConfirmModal } from './DeleteConfirmModal';
import { DataTable, DataTableColumnHeader } from '@/components/shared/DataTable';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useServiceStore } from '@/stores/useServiceStore';
import { toast } from 'sonner';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// ============================================================================
// PICKUP WINDOWS TAB COMPONENT
// ============================================================================

export function PickupWindowsTab() {
  const { pickupWindows, isLoading, updatePickupWindow, deletePickupWindow } = useServiceStore();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);

  const handleToggleActive = async (pw: any) => {
    try {
      await updatePickupWindow(pw.id, { isActive: !pw.isActive });
      toast.success(`Pickup window ${pw.isActive ? 'deactivated' : 'activated'}`);
    } catch {
      toast.error('Failed to update pickup window');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      await deletePickupWindow(deleteTarget.id);
      toast.success('Pickup window deleted successfully');
    } catch {
      toast.error('Failed to delete pickup window');
    }
  };

  const columns: ColumnDef<any>[] = [
    {
      accessorKey: 'dayOfWeek',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Day" />,
      cell: ({ row }) => (
        <Badge variant="outline">{DAYS[row.original.dayOfWeek] ?? row.original.dayOfWeek}</Badge>
      ),
    },
    {
      accessorKey: 'startTime',
      header: 'Time Range',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span>{row.original.startTime} - {row.original.endTime}</span>
        </div>
      ),
    },
    {
      accessorKey: 'baseFee',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Base Fee" />,
      cell: ({ row }) => (
        <div className="font-medium">₦{(row.original.baseFee || 0).toLocaleString()}</div>
      ),
    },
    {
      accessorKey: 'rushFee',
      header: 'Rush Fee',
      cell: ({ row }) => (
        <div className="text-sm text-muted-foreground">
          ₦{(row.original.rushFee || 0).toLocaleString()}
        </div>
      ),
    },
    {
      accessorKey: 'isActive',
      header: 'Status',
      cell: ({ row }) => {
        const pw = row.original;
        return (
          <div className="flex items-center gap-2">
            <Switch
              checked={pw.isActive}
              onCheckedChange={() => handleToggleActive(pw)}
            />
            <Badge variant={pw.isActive ? 'default' : 'secondary'}>
              {pw.isActive ? 'Active' : 'Inactive'}
            </Badge>
          </div>
        );
      },
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const pw = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem>
                <Edit className="mr-2 h-4 w-4" />
                Edit Window
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setDeleteTarget(pw)}
                className="text-destructive"
              >
                <Trash className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setIsAddModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Pickup Window
        </Button>
      </div>

      <AddPickupWindowModal open={isAddModalOpen} onOpenChange={setIsAddModalOpen} />

      <DeleteConfirmModal
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Pickup Window"
        description="Are you sure you want to delete this pickup window? This action cannot be undone."
        onConfirm={handleDeleteConfirm}
      />

      <DataTable
        columns={columns}
        data={Array.isArray(pickupWindows) ? pickupWindows : []}
        searchKey="startTime"
        searchPlaceholder="Search pickup windows..."
        isLoading={isLoading}
      />
    </div>
  );
}
