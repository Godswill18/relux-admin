// ============================================================================
// SERVICES TAB - Service Management
// ============================================================================

import { useState, useMemo } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { MoreHorizontal, Edit, Trash, Plus, Search, Layers } from 'lucide-react';
import { AddServiceModal } from './AddServiceModal';
import { EditServiceModal } from './EditServiceModal';
import { DeleteConfirmModal } from './DeleteConfirmModal';
import { DataTable, DataTableColumnHeader } from '@/components/shared/DataTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useServiceStore } from '@/stores/useServiceStore';
import { LoadMoreTrigger } from '@/components/shared/LoadMoreTrigger';
import { toast } from 'sonner';

export function ServicesTab() {
  const { services, isLoading, updateService, deleteService, servicesPagination, loadMoreServices } = useServiceStore();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [search, setSearch] = useState('');

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

  const serviceList: any[] = Array.isArray(services) ? services : [];

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return serviceList;
    return serviceList.filter((s) => (s.name ?? '').toLowerCase().includes(q));
  }, [serviceList, search]);

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
            <Switch checked={service.isActive} onCheckedChange={() => handleToggleActive(service)} />
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
                <Edit className="mr-2 h-4 w-4" />Edit Service
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setDeleteTarget(service)} className="text-destructive">
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
          <Input placeholder="Search services…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Button size="sm" onClick={() => setIsAddModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />Add
        </Button>
      </div>

      <AddServiceModal open={isAddModalOpen} onOpenChange={setIsAddModalOpen} />
      <EditServiceModal open={!!editTarget} onOpenChange={(open) => !open && setEditTarget(null)} service={editTarget} />
      <DeleteConfirmModal
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Service"
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
            <Layers className="h-8 w-8 opacity-30 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No services found</p>
          </CardContent></Card>
        ) : filtered.map((service) => (
          <Card key={service.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1 space-y-1.5">
                  <p className="font-semibold truncate">{service.name}</p>
                  {service.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{service.description}</p>
                  )}
                  <div className="flex items-center gap-2 pt-0.5">
                    <Switch checked={service.isActive} onCheckedChange={() => handleToggleActive(service)} />
                    <Badge variant={service.isActive ? 'default' : 'secondary'} className="text-xs">
                      {service.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0 shrink-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setEditTarget(service)}>
                      <Edit className="mr-2 h-4 w-4" />Edit Service
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setDeleteTarget(service)} className="text-destructive">
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
        onIntersect={loadMoreServices}
        isFetchingMore={servicesPagination.isFetchingMore}
        hasMore={servicesPagination.hasMore}
      />
    </div>
  );
}
