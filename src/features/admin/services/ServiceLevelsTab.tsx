// ============================================================================
// SERVICE LEVELS TAB - Pricing Tier Management
// ============================================================================

import { ColumnDef } from '@tanstack/react-table';
import { DataTable, DataTableColumnHeader } from '@/components/shared/DataTable';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { useServiceStore } from '@/stores/useServiceStore';
import { toast } from 'sonner';

export function ServiceLevelsTab() {
  const { serviceLevels, isLoading, updateServiceLevel } = useServiceStore();

  const handleToggleActive = async (level: any) => {
    try {
      await updateServiceLevel(level.id, { isActive: !level.isActive });
      toast.success(`${level.name} ${level.isActive ? 'deactivated' : 'activated'}`);
    } catch {
      toast.error('Failed to update service level');
    }
  };

  const formatMultiplier = (val: number) => {
    if (!val) return 1;
    return val > 10 ? val / 100 : val;
  };

  const levels: any[] = Array.isArray(serviceLevels) ? serviceLevels : [];

  const columns: ColumnDef<any>[] = [
    {
      accessorKey: 'name',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Level Name" />,
      cell: ({ row }) => <div className="font-medium">{row.original.name}</div>,
    },
    {
      accessorKey: 'priceMultiplier',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Price Multiplier" />,
      cell: ({ row }) => {
        const display = formatMultiplier(row.original.priceMultiplier);
        return (
          <div>
            <span className="font-medium">{display}x</span>
            <span className="text-sm text-muted-foreground ml-2">
              (+{((display - 1) * 100).toFixed(0)}%)
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: 'durationHours',
      header: 'Duration',
      cell: ({ row }) => (
        <Badge variant="outline">{row.original.durationHours || 0} hours</Badge>
      ),
    },
    {
      accessorKey: 'isActive',
      header: 'Status',
      cell: ({ row }) => {
        const level = row.original;
        return (
          <div className="flex items-center gap-2">
            <Switch checked={level.isActive} onCheckedChange={() => handleToggleActive(level)} />
            <Badge variant={level.isActive ? 'default' : 'secondary'}>
              {level.isActive ? 'Active' : 'Inactive'}
            </Badge>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      {/* ── Mobile cards (shown on all screens as the primary view, grid on sm+) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:hidden">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="animate-pulse"><CardContent className="p-4 h-24" /></Card>
          ))
        ) : levels.map((level) => {
          const display = formatMultiplier(level.priceMultiplier);
          return (
            <Card key={level.id}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold truncate">{level.name}</p>
                  <Badge variant={level.isActive ? 'default' : 'secondary'} className="text-xs shrink-0">
                    {level.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Multiplier</span>
                    <span className="font-medium">{display}x (+{((display - 1) * 100).toFixed(0)}%)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Duration</span>
                    <span className="font-medium">{level.durationHours || 0}h</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-0.5">
                  <Switch checked={level.isActive} onCheckedChange={() => handleToggleActive(level)} />
                  <span className="text-xs text-muted-foreground">Toggle active</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* ── Desktop table ────────────────────────────────────────────────────── */}
      <div className="hidden md:block">
        <DataTable
          columns={columns}
          data={levels}
          searchKey="name"
          searchPlaceholder="Search service levels..."
          isLoading={isLoading}
          showPagination={false}
        />
      </div>
    </div>
  );
}
