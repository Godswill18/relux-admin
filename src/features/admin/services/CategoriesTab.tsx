// ============================================================================
// CATEGORIES TAB - Service Category Management
// ============================================================================

import { useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { MoreHorizontal, Edit, Trash, Plus } from 'lucide-react';
import { AddCategoryModal } from './AddCategoryModal';
import { DeleteConfirmModal } from './DeleteConfirmModal';
import { DataTable, DataTableColumnHeader } from '@/components/shared/DataTable';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useServiceStore } from '@/stores/useServiceStore';
import { toast } from 'sonner';

// ============================================================================
// CATEGORIES TAB COMPONENT
// ============================================================================

export function CategoriesTab() {
  const { categories, services, isLoading, deleteCategory } = useServiceStore();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);

  const getServiceName = (serviceId: any) => {
    if (!Array.isArray(services)) return 'Unknown';
    // serviceId may be a populated object or a string
    if (typeof serviceId === 'object' && serviceId?.name) return serviceId.name;
    const sid = serviceId?._id || serviceId;
    return services.find((s: any) => s.id === sid || s.id === sid?.toString?.())?.name || 'Unknown';
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      await deleteCategory(deleteTarget.id);
      toast.success('Category deleted successfully');
    } catch {
      toast.error('Failed to delete category');
    }
  };

  const columns: ColumnDef<any>[] = [
    {
      accessorKey: 'name',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Category Name" />,
      cell: ({ row }) => <div className="font-medium">{row.original.name}</div>,
    },
    {
      accessorKey: 'serviceId',
      header: 'Service',
      cell: ({ row }) => (
        <Badge variant="outline">{getServiceName(row.original.serviceId)}</Badge>
      ),
    },
    {
      accessorKey: 'basePrice',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Base Price" />,
      cell: ({ row }) => (
        <div className="font-medium">₦{(row.original.basePrice || 0).toLocaleString()}</div>
      ),
    },
    {
      accessorKey: 'unit',
      header: 'Unit',
      cell: ({ row }) => <Badge variant="secondary">{row.original.unit || 'item'}</Badge>,
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const category = row.original;
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
                Edit Category
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setDeleteTarget(category)}
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
          Add Category
        </Button>
      </div>

      <AddCategoryModal open={isAddModalOpen} onOpenChange={setIsAddModalOpen} />

      <DeleteConfirmModal
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Category"
        itemName={deleteTarget?.name}
        onConfirm={handleDeleteConfirm}
      />

      <DataTable
        columns={columns}
        data={Array.isArray(categories) ? categories : []}
        searchKey="name"
        searchPlaceholder="Search categories..."
        isLoading={isLoading}
      />
    </div>
  );
}
