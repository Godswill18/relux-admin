// ============================================================================
// TIERS TAB - Loyalty Tier Management
// ============================================================================

import { useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { MoreHorizontal, Edit, Trash, Plus, Award } from 'lucide-react';
import { AddTierModal } from './AddTierModal';
import { EditTierModal } from './EditTierModal';
import { DeleteTierModal } from './DeleteTierModal';
import { DataTable, DataTableColumnHeader } from '@/components/shared/DataTable';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useLoyaltyStore } from '@/stores/useLoyaltyStore';

// ============================================================================
// TIERS TAB COMPONENT
// ============================================================================

// Helper to collect benefit labels from a tier object
// Backend returns flat booleans (freePickup, freeDelivery, priorityTurnaround)
// while the TS type nests them under `benefits`
function getBenefitLabels(tier: any): string[] {
  const labels: string[] = [];
  const b = tier.benefits || tier;
  const disc = tier.discountPercent ?? 0;
  if (disc > 0) labels.push(`${disc}% Auto Discount`);
  if (b.freePickup || tier.freePickup) labels.push('Free Pickup');
  if (b.freeDelivery || tier.freeDelivery) labels.push('Free Delivery');
  if (b.priorityTurnaround || tier.priorityTurnaround) labels.push('Priority Processing');
  return labels;
}

export function TiersTab() {
  const { tiers, isLoading } = useLoyaltyStore();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editTier, setEditTier] = useState<any>(null);
  const [deleteTierTarget, setDeleteTierTarget] = useState<any>(null);

  // Define columns
  const columns: ColumnDef<any>[] = [
    {
      accessorKey: 'name',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Tier Name" />,
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Award className="h-4 w-4 text-primary" />
          <span className="font-medium">{row.original.name}</span>
        </div>
      ),
    },
    {
      accessorKey: 'pointsRequired',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Min Points" />,
      cell: ({ row }) => (
        <div className="font-medium">{(row.original.pointsRequired ?? 0).toLocaleString()}</div>
      ),
    },
    {
      id: 'multiplier',
      header: 'Multiplier',
      cell: ({ row }) => {
        const t = row.original as any;
        return <Badge variant="secondary">{t.multiplierPercent ?? t.multiplier ?? 100}%</Badge>;
      },
    },
    {
      id: 'benefits',
      header: 'Benefits',
      cell: ({ row }) => {
        const labels = getBenefitLabels(row.original);
        return (
          <div className="text-sm text-muted-foreground">
            {labels.length > 0 ? labels.join(', ') : 'None'}
          </div>
        );
      },
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const tier = row.original;

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
              <DropdownMenuItem onClick={() => setEditTier(tier)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit Tier
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setDeleteTierTarget(tier)}
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
          Add Tier
        </Button>
      </div>

      <AddTierModal open={isAddModalOpen} onOpenChange={setIsAddModalOpen} />
      <EditTierModal
        open={!!editTier}
        onOpenChange={(open) => { if (!open) setEditTier(null); }}
        tier={editTier}
      />
      <DeleteTierModal
        open={!!deleteTierTarget}
        onOpenChange={(open) => { if (!open) setDeleteTierTarget(null); }}
        tier={deleteTierTarget}
      />

      {/* Tier Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {tiers.map((tier: any) => {
          const benefits = getBenefitLabels(tier);
          return (
            <Card key={tier.id || tier._id} className="border-2 border-primary/30">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <Award className="h-6 w-6 text-primary" />
                  <Badge variant="outline">{tier.multiplierPercent ?? tier.multiplier ?? 100}%</Badge>
                </div>
                <CardTitle className="text-lg">{tier.name}</CardTitle>
                <CardDescription>
                  From {(tier.pointsRequired ?? 0).toLocaleString()} points
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="text-sm font-medium">Benefits:</div>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    {benefits.length > 0 ? (
                      benefits.map((label, index) => (
                        <li key={index}>&#8226; {label}</li>
                      ))
                    ) : (
                      <li className="text-muted-foreground/60">No special benefits</li>
                    )}
                  </ul>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <DataTable
        columns={columns}
        data={tiers}
        searchKey="name"
        searchPlaceholder="Search tiers..."
        isLoading={isLoading}
        showPagination={false}
      />
    </div>
  );
}
