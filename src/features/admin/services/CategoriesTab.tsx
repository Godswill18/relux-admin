// ============================================================================
// CATEGORIES TAB - Service Category Management
// ============================================================================

import { useState, useMemo } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { MoreHorizontal, Edit, Trash, Plus, Search, Tag } from 'lucide-react';
import { AddCategoryModal } from './AddCategoryModal';
import { EditCategoryModal } from './EditCategoryModal';
import { DeleteConfirmModal } from './DeleteConfirmModal';
import { DataTable, DataTableColumnHeader } from '@/components/shared/DataTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useServiceStore } from '@/stores/useServiceStore';
import { LoadMoreTrigger } from '@/components/shared/LoadMoreTrigger';
import { toast } from 'sonner';

export function CategoriesTab() {
  const { categories, services, isLoading, deleteCategory, categoriesPagination, loadMoreCategories } = useServiceStore();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [search, setSearch] = useState('');

  const getServiceName = (serviceId: any) => {
    if (!Array.isArray(services)) return 'Unknown';
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

  const categoryList: any[] = Array.isArray(categories) ? categories : [];

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return categoryList;
    return categoryList.filter((c) => (c.name ?? '').toLowerCase().includes(q));
  }, [categoryList, search]);

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
              <DropdownMenuItem onClick={() => setEditTarget(category)}>
                <Edit className="mr-2 h-4 w-4" />Edit Category
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setDeleteTarget(category)} className="text-destructive">
                <Trash className="mr-2 h-4 w-4" />Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search categories…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Button size="sm" onClick={() => setIsAddModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />Add
        </Button>
      </div>

      <AddCategoryModal open={isAddModalOpen} onOpenChange={setIsAddModalOpen} />
      <EditCategoryModal open={!!editTarget} onOpenChange={(open) => !open && setEditTarget(null)} category={editTarget} />
      <DeleteConfirmModal
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Category"
        itemName={deleteTarget?.name}
        onConfirm={handleDeleteConfirm}
      />

      {/* ── Mobile cards ─────────────────────────────────────────────────────── */}
      <div className="md:hidden space-y-3">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="animate-pulse"><CardContent className="p-4 h-16" /></Card>
          ))
        ) : filtered.length === 0 ? (
          <Card><CardContent className="flex flex-col items-center gap-2 py-10">
            <Tag className="h-8 w-8 opacity-30 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No categories found</p>
          </CardContent></Card>
        ) : filtered.map((category) => (
          <Card key={category.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1 space-y-1.5">
                  <p className="font-semibold truncate">{category.name}</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="text-xs">{getServiceName(category.serviceId)}</Badge>
                    <Badge variant="secondary" className="text-xs">{category.unit || 'item'}</Badge>
                  </div>
                  <p className="text-sm font-medium">₦{(category.basePrice || 0).toLocaleString()} base price</p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0 shrink-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setEditTarget(category)}>
                      <Edit className="mr-2 h-4 w-4" />Edit Category
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setDeleteTarget(category)} className="text-destructive">
                      <Trash className="mr-2 h-4 w-4" />Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Desktop table ────────────────────────────────────────────────────── */}
      <div className="hidden md:block">
        <DataTable columns={columns} data={filtered} searchKey={undefined} isLoading={isLoading} />
      </div>

      <LoadMoreTrigger
        onIntersect={loadMoreCategories}
        isFetchingMore={categoriesPagination.isFetchingMore}
        hasMore={categoriesPagination.hasMore}
      />
    </div>
  );
}
