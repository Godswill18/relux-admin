// ============================================================================
// DELIVERY ZONES TAB - Delivery Area Management
// ============================================================================

import { useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { MoreHorizontal, Edit, Trash, Plus, MapPin } from 'lucide-react';
import { AddDeliveryZoneModal } from './AddDeliveryZoneModal';
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

// ============================================================================
// DELIVERY ZONES TAB COMPONENT
// ============================================================================

export function DeliveryZonesTab() {
  const { deliveryZones, isLoading, updateDeliveryZone, deleteDeliveryZone } = useServiceStore();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);

  const handleToggleActive = async (zone: any) => {
    try {
      await updateDeliveryZone(zone.id, { isActive: !zone.isActive });
      toast.success(`${zone.name} ${zone.isActive ? 'deactivated' : 'activated'}`);
    } catch {
      toast.error('Failed to update delivery zone');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      await deleteDeliveryZone(deleteTarget.id);
      toast.success('Delivery zone deleted successfully');
    } catch {
      toast.error('Failed to delete delivery zone');
    }
  };

  const columns: ColumnDef<any>[] = [
    {
      accessorKey: 'name',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Zone Name" />,
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{row.original.name}</span>
        </div>
      ),
    },
    {
      accessorKey: 'deliveryFee',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Delivery Fee" />,
      cell: ({ row }) => (
        <div className="font-medium">₦{(row.original.deliveryFee || 0).toLocaleString()}</div>
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
      accessorKey: 'radiusKm',
      header: 'Radius',
      cell: ({ row }) => (
        <Badge variant="outline">{row.original.radiusKm || 0} km</Badge>
      ),
    },
    {
      accessorKey: 'isActive',
      header: 'Status',
      cell: ({ row }) => {
        const zone = row.original;
        return (
          <div className="flex items-center gap-2">
            <Switch
              checked={zone.isActive}
              onCheckedChange={() => handleToggleActive(zone)}
            />
            <Badge variant={zone.isActive ? 'default' : 'secondary'}>
              {zone.isActive ? 'Active' : 'Inactive'}
            </Badge>
          </div>
        );
      },
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const zone = row.original;
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
                Edit Zone
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setDeleteTarget(zone)}
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
          Add Delivery Zone
        </Button>
      </div>

      <AddDeliveryZoneModal open={isAddModalOpen} onOpenChange={setIsAddModalOpen} />

      <DeleteConfirmModal
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Delivery Zone"
        itemName={deleteTarget?.name}
        onConfirm={handleDeleteConfirm}
      />

      <DataTable
        columns={columns}
        data={Array.isArray(deliveryZones) ? deliveryZones : []}
        searchKey="name"
        searchPlaceholder="Search delivery zones..."
        isLoading={isLoading}
      />
    </div>
  );
}
