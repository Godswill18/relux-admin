// ============================================================================
// STAFF ORDERS PAGE - New Orders · My Orders · Offline Orders
// ============================================================================

import { useCallback, useEffect, useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { MoreHorizontal, Plus, CheckCircle, Edit, Eye, Archive } from 'lucide-react';
import { DataTable, DataTableColumnHeader } from '@/components/shared/DataTable';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { UpdateStatusModal } from './UpdateStatusModal';
import { OfflineOrderModal } from './OfflineOrderModal';
import { StaffOrderDetailModal } from './StaffOrderDetailModal';
import { useAuthStore } from '@/stores/useAuthStore';
import { toast } from 'sonner';
import { format } from 'date-fns';
import apiClient from '@/lib/api/client';

// ============================================================================
// STATUS HELPERS
// ============================================================================

const SERVICE_LABELS: Record<string, string> = {
  'wash-fold':  'Wash & Fold',
  'wash-iron':  'Wash & Iron',
  'iron-only':  'Iron Only',
  'dry-clean':  'Dry Clean',
};

const STATUS_LABELS: Record<string, string> = {
  draft:              'Draft',
  pending:            'Pending',
  confirmed:          'Confirmed',
  in_progress:        'In Progress',
  'picked-up':        'Picked Up',
  washing:            'Washing',
  ironing:            'Ironing',
  ready:              'Ready',
  'out-for-delivery': 'Out for Delivery',
  delivered:          'Delivered',
  completed:          'Completed',
  cancelled:          'Cancelled',
};

function StatusBadge({ status }: { status: string }) {
  const label = STATUS_LABELS[status] ?? status;
  const variant =
    status === 'cancelled' ? 'destructive'
    : status === 'completed' || status === 'delivered' ? 'default'
    : status === 'ready' ? 'default'
    : 'secondary';
  return <Badge variant={variant} className="capitalize">{label}</Badge>;
}

function customerName(order: any): string {
  return order.walkInCustomer?.name || order.customer?.name || '—';
}
function customerPhone(order: any): string {
  return order.walkInCustomer?.phone || order.customer?.phone || '—';
}

// ============================================================================
// COLUMN FACTORIES
// ============================================================================

function baseColumns(): ColumnDef<any>[] {
  return [
    {
      accessorKey: 'orderNumber',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Order #" />,
      cell: ({ row }) => (
        <span className="font-mono font-semibold text-sm">
          {row.original.orderNumber ?? '—'}
        </span>
      ),
    },
    {
      id: 'customer',
      header: 'Customer',
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{customerName(row.original)}</div>
          <div className="text-xs text-muted-foreground">{customerPhone(row.original)}</div>
        </div>
      ),
    },
    {
      id: 'service',
      header: 'Service(s)',
      cell: ({ row }) => {
        const items: any[] = row.original.items ?? [];
        // Collect unique service types from items; fall back to order-level serviceType
        const services = items.length > 0
          ? [...new Set(items.map((i: any) => i.serviceType).filter(Boolean))]
          : row.original.serviceType ? [row.original.serviceType] : [];

        if (services.length === 0) return <span className="text-muted-foreground text-xs">—</span>;

        return (
          <div className="flex flex-wrap gap-1">
            {services.map((s: string) => (
              <Badge key={s} variant="outline" className="capitalize text-xs whitespace-nowrap">
                {SERVICE_LABELS[s] ?? s.replace(/-/g, ' ')}
              </Badge>
            ))}
          </div>
        );
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      accessorKey: 'createdAt',
      header: 'Date',
      cell: ({ row }) =>
        row.original.createdAt
          ? format(new Date(row.original.createdAt), 'MMM dd, yyyy')
          : '—',
    },
  ];
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

type TabKey = 'new' | 'mine' | 'offline' | 'closed';

export default function StaffOrdersPage() {
  const { user } = useAuthStore();

  const [activeTab, setActiveTab] = useState<TabKey>('new');
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Modals
  const [detailOrder, setDetailOrder] = useState<any>(null);
  const [acceptTarget, setAcceptTarget] = useState<any>(null);
  const [isAccepting, setIsAccepting] = useState(false);
  const [statusTarget, setStatusTarget] = useState<any>(null);
  const [offlineOpen, setOfflineOpen] = useState(false);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  // Map UI tab key → backend tab param
  const TAB_PARAM: Record<TabKey, string> = {
    new:    'new',
    mine:   'mine',
    offline: 'offline',
    closed: 'completed',   // reuse the existing backend shorthand
  };

  // Fetch orders for active tab
  useEffect(() => {
    let cancelled = false;
    const fetch = async () => {
      setIsLoading(true);
      try {
        const response = await apiClient.get('/orders', {
          params: { tab: TAB_PARAM[activeTab], limit: 100 },
        });
        if (!cancelled) {
          const raw = response.data.data;
          setOrders(Array.isArray(raw) ? raw : raw?.orders ?? []);
        }
      } catch {
        if (!cancelled) setOrders([]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    fetch();
    return () => { cancelled = true; };
  }, [activeTab, refreshKey]);

  // Accept / claim an order
  const handleConfirmAccept = async () => {
    if (!acceptTarget) return;
    try {
      setIsAccepting(true);
      await apiClient.patch(`/orders/${acceptTarget._id}/accept`);
      toast.success(`Order ${acceptTarget.orderNumber} accepted`);
      setAcceptTarget(null);
      refresh();
      // Switch to "My Orders" so the accepted order is visible immediately
      setActiveTab('mine');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to accept order');
    } finally {
      setIsAccepting(false);
    }
  };

  // ── Column sets per tab ──────────────────────────────────────────────────

  const newOrderColumns: ColumnDef<any>[] = [
    ...baseColumns(),
    {
      id: 'actions',
      cell: ({ row }) => {
        const order = row.original;
        return (
          <Button
            size="sm"
            onClick={() => setAcceptTarget(order)}
          >
            <CheckCircle className="mr-2 h-4 w-4" />
            Accept
          </Button>
        );
      },
    },
  ];

  const myOrderColumns: ColumnDef<any>[] = [
    ...baseColumns(),
    {
      id: 'payment',
      header: 'Payment',
      cell: ({ row }) => {
        const status = row.original.payment?.status ?? row.original.paymentStatus;
        return (
          <Badge
            variant={status === 'paid' ? 'default' : 'secondary'}
            className="capitalize"
          >
            {status ?? '—'}
          </Badge>
        );
      },
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const order = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => setDetailOrder(order)}>
                <Eye className="mr-2 h-4 w-4" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusTarget(order)}>
                <Edit className="mr-2 h-4 w-4" />
                Update Status
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  const offlineColumns: ColumnDef<any>[] = [
    ...baseColumns(),
    {
      id: 'total',
      header: 'Total',
      cell: ({ row }) => {
        const total = row.original.pricing?.total ?? 0;
        return <span className="font-medium">₦{total.toLocaleString()}</span>;
      },
    },
    {
      id: 'payment',
      header: 'Payment',
      cell: ({ row }) => {
        const method = row.original.payment?.method ?? '—';
        const status = row.original.payment?.status ?? '—';
        return (
          <div>
            <div className="text-sm capitalize">{method}</div>
            <Badge
              variant={status === 'paid' ? 'default' : 'secondary'}
              className="capitalize text-xs"
            >
              {status}
            </Badge>
          </div>
        );
      },
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const order = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => setDetailOrder(order)}>
                <Eye className="mr-2 h-4 w-4" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusTarget(order)}>
                <Edit className="mr-2 h-4 w-4" />
                Update Status
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  const closedColumns: ColumnDef<any>[] = [
    ...baseColumns(),
    {
      id: 'total',
      header: 'Total',
      cell: ({ row }) => {
        const total = row.original.pricing?.total ?? row.original.total ?? 0;
        return <span className="font-medium">₦{Number(total).toLocaleString()}</span>;
      },
    },
    {
      id: 'payment',
      header: 'Payment',
      cell: ({ row }) => {
        const method = row.original.payment?.method ?? '—';
        const status = row.original.payment?.status ?? row.original.paymentStatus ?? '—';
        return (
          <div>
            <div className="text-xs capitalize text-muted-foreground">{method}</div>
            <Badge
              variant={status === 'paid' ? 'default' : 'secondary'}
              className="capitalize text-xs"
            >
              {status}
            </Badge>
          </div>
        );
      },
    },
    {
      id: 'closedAt',
      header: 'Closed',
      cell: ({ row }) =>
        row.original.updatedAt
          ? format(new Date(row.original.updatedAt), 'MMM dd, yyyy')
          : '—',
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const order = row.original;
        return (
          <Button variant="ghost" size="sm" onClick={() => setDetailOrder(order)}>
            <Eye className="mr-2 h-4 w-4" />
            View
          </Button>
        );
      },
    },
  ];

  // ── Tab config ───────────────────────────────────────────────────────────

  const tabs: {
    key: TabKey;
    label: string;
    description: string;
    columns: ColumnDef<any>[];
    searchKey: string;
    searchPlaceholder: string;
  }[] = [
    {
      key: 'new',
      label: 'New Orders',
      description: 'Unassigned online orders you can claim',
      columns: newOrderColumns,
      searchKey: 'orderNumber',
      searchPlaceholder: 'Search by order number...',
    },
    {
      key: 'mine',
      label: 'My Orders',
      description: 'Orders currently assigned to you',
      columns: myOrderColumns,
      searchKey: 'orderNumber',
      searchPlaceholder: 'Search by order number...',
    },
    {
      key: 'offline',
      label: 'Offline Orders',
      description: 'Walk-in orders you have created',
      columns: offlineColumns,
      searchKey: 'orderNumber',
      searchPlaceholder: 'Search by order number...',
    },
    {
      key: 'closed',
      label: 'Closed Orders',
      description: 'Completed and delivered orders assigned to or created by you',
      columns: closedColumns,
      searchKey: 'orderNumber',
      searchPlaceholder: 'Search by order number...',
    },
  ];

  const activeTabConfig = tabs.find((t) => t.key === activeTab)!;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Orders</h1>
          <p className="text-muted-foreground">Manage and track laundry orders</p>
        </div>
        <Button onClick={() => setOfflineOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Walk-in Order
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabKey)}>
        <TabsList>
          {tabs.map((tab) => (
            <TabsTrigger key={tab.key} value={tab.key} className="flex items-center gap-1.5">
              {tab.key === 'closed' && <Archive className="h-3.5 w-3.5" />}
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {tabs.map((tab) => (
          <TabsContent key={tab.key} value={tab.key}>
            <Card>
              <CardHeader>
                <CardTitle>{tab.label}</CardTitle>
                <CardDescription>{tab.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <DataTable
                  columns={tab.columns}
                  data={orders}
                  searchKey={tab.searchKey}
                  searchPlaceholder={tab.searchPlaceholder}
                  isLoading={isLoading}
                  onRowClick={(row) => setDetailOrder(row)}
                />
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      {/* Order Detail Modal */}
      <StaffOrderDetailModal
        order={detailOrder}
        open={!!detailOrder}
        onOpenChange={(open) => !open && setDetailOrder(null)}
      />

      {/* Accept Order Confirmation */}
      <ConfirmDialog
        open={!!acceptTarget}
        onOpenChange={(open) => !open && setAcceptTarget(null)}
        title="Accept Order"
        description={
          <>
            Accept order{' '}
            <span className="font-mono font-semibold">{acceptTarget?.orderNumber}</span> for{' '}
            <strong>{acceptTarget ? customerName(acceptTarget) : ''}</strong>? It will be assigned to you.
          </>
        }
        confirmLabel="Accept Order"
        isLoading={isAccepting}
        onConfirm={handleConfirmAccept}
      />

      {/* Update Status Modal */}
      <UpdateStatusModal
        open={!!statusTarget}
        onOpenChange={(open) => !open && setStatusTarget(null)}
        order={statusTarget}
        onSuccess={refresh}
      />

      {/* Offline / Walk-in Order Modal */}
      <OfflineOrderModal
        open={offlineOpen}
        onOpenChange={setOfflineOpen}
        onSuccess={() => {
          refresh();
          setActiveTab('offline');
        }}
      />
    </div>
  );
}
