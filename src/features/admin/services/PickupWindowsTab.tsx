// ============================================================================
// PICKUP WINDOWS TAB - Pickup Time Management
// ============================================================================

import { useState, useMemo } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { MoreHorizontal, Edit, Trash, Plus, Search, Clock } from 'lucide-react';
import { AddPickupWindowModal } from './AddPickupWindowModal';
import { EditPickupWindowModal } from './EditPickupWindowModal';
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

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function PickupWindowsTab() {
  const { pickupWindows, isLoading, updatePickupWindow, deletePickupWindow, pickupWindowsPagination, loadMorePickupWindows } = useServiceStore();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [search, setSearch] = useState('');

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

  const windowList: any[] = Array.isArray(pickupWindows) ? pickupWindows : [];

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return windowList;
    return windowList.filter((pw) => {
      const day = (DAYS[pw.dayOfWeek] ?? '').toLowerCase();
      const time = `${pw.startTime ?? ''} ${pw.endTime ?? ''}`.toLowerCase();
      return day.includes(q) || time.includes(q);
    });
  }, [windowList, search]);

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
          <span>{row.original.startTime} – {row.original.endTime}</span>
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
        <div className="text-sm text-muted-foreground">₦{(row.original.rushFee || 0).toLocaleString()}</div>
      ),
    },
    {
      accessorKey: 'isActive',
      header: 'Status',
      cell: ({ row }) => {
        const pw = row.original;
        return (
          <div className="flex items-center gap-2">
            <Switch checked={pw.isActive} onCheckedChange={() => handleToggleActive(pw)} />
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
              <DropdownMenuItem onClick={() => setEditTarget(pw)}>
                <Edit className="mr-2 h-4 w-4" />Edit Window
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setDeleteTarget(pw)} className="text-destructive">
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
          <Input placeholder="Search by day or time…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Button size="sm" onClick={() => setIsAddModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />Add
        </Button>
      </div>

      <AddPickupWindowModal open={isAddModalOpen} onOpenChange={setIsAddModalOpen} />
      <EditPickupWindowModal open={!!editTarget} onOpenChange={(open) => !open && setEditTarget(null)} pickupWindow={editTarget} />
      <DeleteConfirmModal
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Pickup Window"
        description="Are you sure you want to delete this pickup window? This action cannot be undone."
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
            <Clock className="h-8 w-8 opacity-30 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No pickup windows found</p>
          </CardContent></Card>
        ) : filtered.map((pw) => (
          <Card key={pw.id}>
            <CardContent className="p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1.5 min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{DAYS[pw.dayOfWeek] ?? pw.dayOfWeek}</Badge>
                    <span className="text-sm font-medium flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                      {pw.startTime} – {pw.endTime}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-3 text-sm">
                    <span className="text-muted-foreground">Base: <span className="font-medium text-foreground">₦{(pw.baseFee || 0).toLocaleString()}</span></span>
                    <span className="text-muted-foreground">Rush: <span className="font-medium text-foreground">₦{(pw.rushFee || 0).toLocaleString()}</span></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={pw.isActive} onCheckedChange={() => handleToggleActive(pw)} />
                    <Badge variant={pw.isActive ? 'default' : 'secondary'} className="text-xs">
                      {pw.isActive ? 'Active' : 'Inactive'}
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
                    <DropdownMenuItem onClick={() => setEditTarget(pw)}>
                      <Edit className="mr-2 h-4 w-4" />Edit Window
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setDeleteTarget(pw)} className="text-destructive">
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
        onIntersect={loadMorePickupWindows}
        isFetchingMore={pickupWindowsPagination.isFetchingMore}
        hasMore={pickupWindowsPagination.hasMore}
      />
    </div>
  );
}
