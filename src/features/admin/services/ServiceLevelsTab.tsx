// ============================================================================
// SERVICE LEVELS TAB - Pricing Tier Management
// ============================================================================

import { ColumnDef } from '@tanstack/react-table';
import { DataTable, DataTableColumnHeader } from '@/components/shared/DataTable';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useServiceStore } from '@/stores/useServiceStore';
import { toast } from 'sonner';

// ============================================================================
// SERVICE LEVELS TAB COMPONENT
// ============================================================================

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
            <Switch
              checked={level.isActive}
              onCheckedChange={() => handleToggleActive(level)}
            />
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
      <div className="grid gap-4 md:grid-cols-3">
        {Array.isArray(serviceLevels) ? serviceLevels.map((level: any) => (
          <div key={level.id} className="p-4 border rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">{level.name}</h3>
              <Badge variant={level.isActive ? 'default' : 'secondary'}>
                {level.isActive ? 'Active' : 'Inactive'}
              </Badge>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>Multiplier:</span>
              <span className="font-medium">{formatMultiplier(level.priceMultiplier)}x</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>Duration:</span>
              <span className="font-medium">{level.durationHours || 0} hours</span>
            </div>
          </div>
        )) : null}
      </div>

      <DataTable
        columns={columns}
        data={Array.isArray(serviceLevels) ? serviceLevels : []}
        searchKey="name"
        searchPlaceholder="Search service levels..."
        isLoading={isLoading}
        showPagination={false}
      />
    </div>
  );
}
