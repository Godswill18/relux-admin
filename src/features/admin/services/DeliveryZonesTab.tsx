// ============================================================================
// DELIVERY ZONES TAB - Delivery Area Management
// ============================================================================

import { useState, useMemo } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { MoreHorizontal, Edit, Trash, Plus, Search, MapPin } from 'lucide-react';
import { AddDeliveryZoneModal } from './AddDeliveryZoneModal';
import { EditDeliveryZoneModal } from './EditDeliveryZoneModal';
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

export function DeliveryZonesTab() {
  const { deliveryZones, isLoading, updateDeliveryZone, deleteDeliveryZone, deliveryZonesPagination, loadMoreDeliveryZones } = useServiceStore();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [search, setSearch] = useState('');

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

  const zoneList: any[] = Array.isArray(deliveryZones) ? deliveryZones : [];

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return zoneList;
    return zoneList.filter((z) => (z.name ?? '').toLowerCase().includes(q));
  }, [zoneList, search]);

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
        <div className="text-sm text-muted-foreground">₦{(row.original.rushFee || 0).toLocaleString()}</div>
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
            <Switch checked={zone.isActive} onCheckedChange={() => handleToggleActive(zone)} />
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
              <DropdownMenuItem onClick={() => setEditTarget(zone)}>
                <Edit className="mr-2 h-4 w-4" />Edit Zone
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setDeleteTarget(zone)} className="text-destructive">
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
          <Input placeholder="Search zones…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Button size="sm" onClick={() => setIsAddModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />Add
        </Button>
      </div>

      <AddDeliveryZoneModal open={isAddModalOpen} onOpenChange={setIsAddModalOpen} />
      <EditDeliveryZoneModal open={!!editTarget} onOpenChange={(open) => !open && setEditTarget(null)} zone={editTarget} />
      <DeleteConfirmModal
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Delivery Zone"
        itemName={deleteTarget?.name}
        onConfirm={handleDeleteConfirm}
      />

      {/* ── Mobile cards ─────────────────────────────────────────────────────── */}
      <div className="md:hidden space-y-3">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="animate-pulse"><CardContent className="p-4 h-20" /></Card>
          ))
        ) : filtered.length === 0 ? (
          <Card><CardContent className="flex flex-col items-center gap-2 py-10">
            <MapPin className="h-8 w-8 opacity-30 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No delivery zones found</p>
          </CardContent></Card>
        ) : filtered.map((zone) => (
          <Card key={zone.id}>
            <CardContent className="p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1.5 min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                    <p className="font-semibold truncate">{zone.name}</p>
                  </div>
                  <div className="flex flex-wrap gap-3 text-sm">
                    <span className="text-muted-foreground">Delivery: <span className="font-medium text-foreground">₦{(zone.deliveryFee || 0).toLocaleString()}</span></span>
                    <span className="text-muted-foreground">Rush: <span className="font-medium text-foreground">₦{(zone.rushFee || 0).toLocaleString()}</span></span>
                    <Badge variant="outline" className="text-xs">{zone.radiusKm || 0} km</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={zone.isActive} onCheckedChange={() => handleToggleActive(zone)} />
                    <Badge variant={zone.isActive ? 'default' : 'secondary'} className="text-xs">
                      {zone.isActive ? 'Active' : 'Inactive'}
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
                    <DropdownMenuItem onClick={() => setEditTarget(zone)}>
                      <Edit className="mr-2 h-4 w-4" />Edit Zone
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setDeleteTarget(zone)} className="text-destructive">
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
        onIntersect={loadMoreDeliveryZones}
        isFetchingMore={deliveryZonesPagination.isFetchingMore}
        hasMore={deliveryZonesPagination.hasMore}
      />
    </div>
  );
}
