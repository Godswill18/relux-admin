// ============================================================================
// SERVICES TAB - Service Management
// ============================================================================

import { useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { MoreHorizontal, Edit, Trash, Plus } from 'lucide-react';
import { AddServiceModal } from './AddServiceModal';
import { EditServiceModal } from './EditServiceModal';
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
// SERVICES TAB COMPONENT
// ============================================================================

export function ServicesTab() {
  const { services, isLoading, updateService, deleteService } = useServiceStore();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);

  const handleToggleActive = async (service: any) => {
    try {
      await updateService(service.id, { isActive: !service.isActive });
      toast.success(`Service ${service.isActive ? 'deactivated' : 'activated'}`);
    } catch {
      toast.error('Failed to update service');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      await deleteService(deleteTarget.id);
      toast.success('Service deleted successfully');
    } catch {
      toast.error('Failed to delete service');
    }
  };

  const columns: ColumnDef<any>[] = [
    {
      accessorKey: 'name',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Service Name" />,
      cell: ({ row }) => <div className="font-medium">{row.original.name}</div>,
    },
    {
      accessorKey: 'description',
      header: 'Description',
      cell: ({ row }) => (
        <div className="text-sm text-muted-foreground max-w-md truncate">
          {row.original.description || '—'}
        </div>
      ),
    },
    {
      accessorKey: 'isActive',
      header: 'Status',
      cell: ({ row }) => {
        const service = row.original;
        return (
          <div className="flex items-center gap-2">
            <Switch
              checked={service.isActive}
              onCheckedChange={() => handleToggleActive(service)}
            />
            <Badge variant={service.isActive ? 'default' : 'secondary'}>
              {service.isActive ? 'Active' : 'Inactive'}
            </Badge>
          </div>
        );
      },
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const service = row.original;
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
              <DropdownMenuItem onClick={() => setEditTarget(service)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit Service
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setDeleteTarget(service)}
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
          Add Service
        </Button>
      </div>

      <AddServiceModal open={isAddModalOpen} onOpenChange={setIsAddModalOpen} />

      <EditServiceModal
        open={!!editTarget}
        onOpenChange={(open) => !open && setEditTarget(null)}
        service={editTarget}
      />

      <DeleteConfirmModal
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Service"
        itemName={deleteTarget?.name}
        onConfirm={handleDeleteConfirm}
      />

      <DataTable
        columns={columns}
        data={Array.isArray(services) ? services : []}
        searchKey="name"
        searchPlaceholder="Search services..."
        isLoading={isLoading}
      />
    </div>
  );
}
