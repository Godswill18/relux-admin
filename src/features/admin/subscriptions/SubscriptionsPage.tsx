// ============================================================================
// SUBSCRIPTIONS PAGE - Subscription Plan & Active Subscription Management
// ============================================================================

import { useEffect, useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SubscriptionStatusBadge, PlanActiveBadge } from '@/components/shared/StatusBadges';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DataTable, DataTableColumnHeader } from '@/components/shared/DataTable';
import { AddPlanModal } from './AddPlanModal';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { useSubscriptionStore, SubscriptionPlan, SubscriptionRecord } from '@/stores/useSubscriptionStore';
import { toast } from 'sonner';
import {
  CreditCard,
  Users,
  DollarSign,
  Plus,
  MoreHorizontal,
  Edit,
  Trash,
  Pause,
  Play,
  XCircle,
  Check,
} from 'lucide-react';

// ============================================================================
// COMPONENT
// ============================================================================

export default function SubscriptionsPage() {
  const {
    plans,
    subscriptions,
    isLoading,
    fetchPlans,
    fetchSubscriptions,
    deletePlan,
    cancelSubscription,
    pauseSubscription,
    resumeSubscription,
  } = useSubscriptionStore();

  const [isAddPlanOpen, setIsAddPlanOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('plans');
  const [deletePlanTarget, setDeletePlanTarget] = useState<SubscriptionPlan | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchPlans();
    fetchSubscriptions();
  }, [fetchPlans, fetchSubscriptions]);

  // Computed stats
  const activeSubs = subscriptions.filter((s) => s.status === 'active').length;
  const totalSubs = subscriptions.length;
  const monthlyRevenue = subscriptions
    .filter((s) => s.status === 'active')
    .reduce((sum, s) => {
      const plan = typeof s.planId === 'object' ? s.planId : null;
      return sum + (plan?.price || 0);
    }, 0);

  const handleConfirmDeletePlan = async () => {
    if (!deletePlanTarget) return;
    try {
      setIsDeleting(true);
      await deletePlan(deletePlanTarget._id || deletePlanTarget.id);
      toast.success('Plan deleted');
      setDeletePlanTarget(null);
    } catch {
      toast.error('Failed to delete plan');
    } finally {
      setIsDeleting(false);
    }
  };

  // Plan columns
  const planColumns: ColumnDef<SubscriptionPlan>[] = [
    {
      accessorKey: 'name',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Plan Name" />,
      cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
    },
    {
      accessorKey: 'description',
      header: 'Description',
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground line-clamp-1">
          {row.original.description || '—'}
        </span>
      ),
    },
    {
      accessorKey: 'price',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Price" />,
      cell: ({ row }) => (
        <span className="font-medium">₦{(row.original.price ?? 0).toLocaleString()}</span>
      ),
    },
    {
      accessorKey: 'durationDays',
      header: 'Duration',
      cell: ({ row }) => <span>{row.original.durationDays} days</span>,
    },
    {
      accessorKey: 'itemLimit',
      header: 'Item Limit',
      cell: ({ row }) => <span>{row.original.itemLimit ?? '∞'}</span>,
    },
    {
      id: 'features',
      header: 'Features',
      cell: ({ row }) => {
        const feats = row.original.features || [];
        return (
          <span className="text-sm text-muted-foreground">
            {feats.length > 0 ? `${feats.length} feature${feats.length > 1 ? 's' : ''}` : 'None'}
          </span>
        );
      },
    },
    {
      accessorKey: 'active',
      header: 'Status',
      cell: ({ row }) => <PlanActiveBadge active={row.original.active} />,
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const plan = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem>
                <Edit className="mr-2 h-4 w-4" />
                Edit Plan
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setDeletePlanTarget(plan)} className="text-destructive">
                <Trash className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  // Subscription columns
  const subColumns: ColumnDef<SubscriptionRecord>[] = [
    {
      id: 'customer',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Customer" />,
      cell: ({ row }) => {
        const c = row.original.customerId;
        if (typeof c === 'object' && c !== null) {
          return (
            <div>
              <div className="font-medium">{c.name}</div>
              <div className="text-xs text-muted-foreground">{c.phone}</div>
            </div>
          );
        }
        return <span className="text-muted-foreground">—</span>;
      },
    },
    {
      accessorKey: 'planName',
      header: 'Plan',
      cell: ({ row }) => {
        const p = row.original.planId;
        return typeof p === 'object' && p !== null ? p.name : row.original.planName || '—';
      },
    },
    {
      id: 'price',
      header: 'Price',
      cell: ({ row }) => {
        const p = row.original.planId;
        const price = typeof p === 'object' && p !== null ? p.price : 0;
        return <span className="font-medium">₦{(price ?? 0).toLocaleString()}</span>;
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <SubscriptionStatusBadge status={row.original.status} />,
    },
    {
      accessorKey: 'periodStart',
      header: 'Start Date',
      cell: ({ row }) =>
        row.original.periodStart
          ? new Date(row.original.periodStart).toLocaleDateString()
          : '—',
    },
    {
      accessorKey: 'periodEnd',
      header: 'End Date',
      cell: ({ row }) =>
        row.original.periodEnd
          ? new Date(row.original.periodEnd).toLocaleDateString()
          : '—',
    },
    {
      accessorKey: 'autoRenew',
      header: 'Auto-Renew',
      cell: ({ row }) =>
        row.original.autoRenew ? (
          <Check className="h-4 w-4 text-green-600" />
        ) : (
          <XCircle className="h-4 w-4 text-muted-foreground" />
        ),
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const sub = row.original;
        const id = sub._id || sub.id;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              {sub.status === 'active' && (
                <DropdownMenuItem
                  onClick={async () => {
                    try {
                      await pauseSubscription(id);
                      toast.success('Subscription paused');
                    } catch {
                      toast.error('Failed to pause');
                    }
                  }}
                >
                  <Pause className="mr-2 h-4 w-4" />
                  Pause
                </DropdownMenuItem>
              )}
              {sub.status === 'paused' && (
                <DropdownMenuItem
                  onClick={async () => {
                    try {
                      await resumeSubscription(id);
                      toast.success('Subscription resumed');
                    } catch {
                      toast.error('Failed to resume');
                    }
                  }}
                >
                  <Play className="mr-2 h-4 w-4" />
                  Resume
                </DropdownMenuItem>
              )}
              {(sub.status === 'active' || sub.status === 'paused') && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={async () => {
                      try {
                        await cancelSubscription(id);
                        toast.success('Subscription cancelled');
                      } catch {
                        toast.error('Failed to cancel');
                      }
                    }}
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    Cancel
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold">Subscription Management</h1>
        <p className="text-muted-foreground">Manage subscription plans and active subscriptions</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeSubs}</div>
            <p className="text-xs text-muted-foreground">Currently active</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Subscribers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSubs}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₦{monthlyRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Recurring revenue</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="plans">Subscription Plans</TabsTrigger>
          <TabsTrigger value="subscriptions">Active Subscriptions</TabsTrigger>
        </TabsList>

        <TabsContent value="plans">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Subscription Plans</CardTitle>
                <CardDescription>Plans customers can subscribe to from the app</CardDescription>
              </div>
              <Button onClick={() => setIsAddPlanOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Plan
              </Button>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={planColumns}
                data={plans}
                searchKey="name"
                searchPlaceholder="Search plans..."
                isLoading={isLoading}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="subscriptions">
          <Card>
            <CardHeader>
              <CardTitle>Active Subscriptions</CardTitle>
              <CardDescription>All customer subscriptions and their status</CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={subColumns}
                data={subscriptions}
                searchKey="planName"
                searchPlaceholder="Search by plan name..."
                isLoading={isLoading}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <AddPlanModal open={isAddPlanOpen} onOpenChange={setIsAddPlanOpen} />

      <ConfirmDialog
        open={!!deletePlanTarget}
        onOpenChange={(open) => !open && setDeletePlanTarget(null)}
        title="Delete Plan"
        description={
          <>
            Are you sure you want to delete the <strong>"{deletePlanTarget?.name}"</strong> plan?
            Customers currently on this plan will not be affected, but no new subscriptions can be
            created.
          </>
        }
        confirmLabel="Delete"
        destructive
        isLoading={isDeleting}
        onConfirm={handleConfirmDeletePlan}
      />
    </div>
  );
}
