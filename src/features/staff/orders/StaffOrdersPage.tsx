// ============================================================================
// STAFF ORDERS PAGE — 11-Status Workflow
// Pending tab = unassigned pool (any staff can pick)
// All other tabs = staff's own assigned orders at that status
// Badge counts are staff-specific, fetched on load + every 30s + via socket
// ============================================================================

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { useNavigate } from 'react-router-dom';
import {
  MoreHorizontal, Plus, Edit, Eye, CheckCircle, Search, Package,
  User, ScanLine, CheckCircle2, UserCheck, Users,
  Clock, Check, Truck, Settings2, Waves, Zap,
  PackageCheck, Navigation, Home, XCircle, ArrowRight, Loader2,
} from 'lucide-react';
import { DataTable, DataTableColumnHeader } from '@/components/shared/DataTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { SwipeableCard } from '@/components/shared/SwipeableCard';
import { OrderStatusBadge, PaymentStatusBadge, PriorityBadge } from '@/components/shared/StatusBadges';
import { CountdownBadge } from '@/components/shared/CountdownBadge';
import { UpdateStatusModal } from './UpdateStatusModal';
import { StaffOrderDetailModal } from './StaffOrderDetailModal';
import { CreateOrderModal } from '@/features/admin/orders/CreateOrderModal';
import { BarcodeScannerModal } from '@/features/admin/orders/BarcodeScannerModal';
import { OrderReceiptModal } from '@/features/admin/orders/OrderReceiptModal';
import { useAuthStore } from '@/stores/useAuthStore';
import { toast } from 'sonner';
import { format } from 'date-fns';
import apiClient from '@/lib/api/client';
import socketClient from '@/lib/socket/client';

// ============================================================================
// CONSTANTS
// ============================================================================

const SERVICE_LABELS: Record<string, string> = {
  'wash-fold': 'Wash & Fold',
  'wash-iron': 'Wash & Iron',
  'iron-only': 'Iron Only',
  'dry-clean': 'Dry Clean',
};

type StatusKey =
  | 'pending' | 'confirmed' | 'picked-up' | 'in_progress'
  | 'washing' | 'ironing' | 'ready' | 'out-for-delivery'
  | 'delivered' | 'completed' | 'cancelled';

// ── Created By Badge ────────────────────────────────────────────────────────
function CreatedByBadge({ role, source }: { role?: string; source?: string }) {
  if (source === 'online' && (!role || role === 'customer')) {
    return (
      <span className="inline-flex items-center rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 px-1.5 py-0 text-[10px] font-medium border border-blue-200 dark:border-blue-800">
        Online
      </span>
    );
  }
  if (role === 'admin' || role === 'manager' || role === 'receptionist') {
    return (
      <span className="inline-flex items-center rounded-full bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400 px-1.5 py-0 text-[10px] font-medium border border-violet-200 dark:border-violet-800">
        Admin
      </span>
    );
  }
  if (role === 'staff') {
    return (
      <span className="inline-flex items-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-1.5 py-0 text-[10px] font-medium border border-amber-200 dark:border-amber-800">
        Staff
      </span>
    );
  }
  return null;
}

// Forward-progression map for "Next Step" button
const NEXT_STATUS: Partial<Record<StatusKey, StatusKey>> = {
  'confirmed':        'picked-up',
  'picked-up':        'in_progress',
  'in_progress':      'washing',
  'washing':          'ironing',
  'ironing':          'ready',
  'ready':            'out-for-delivery',
  'out-for-delivery': 'delivered',
  'delivered':        'completed',
};

// Staff prev-status: confirmed is the floor (cannot go back to pending / unassign)
const PREV_STATUS: Partial<Record<StatusKey, StatusKey>> = {
  'picked-up':        'confirmed',
  'in_progress':      'picked-up',
  'washing':          'in_progress',
  'ironing':          'washing',
  'ready':            'ironing',
  'out-for-delivery': 'ready',
  'delivered':        'out-for-delivery',
  'completed':        'delivered',
};

const NEXT_STATUS_LABEL: Partial<Record<StatusKey, string>> = {
  'confirmed':        'Mark Picked Up',
  'picked-up':        'Start Processing',
  'in_progress':      'Start Washing',
  'washing':          'Start Ironing',
  'ironing':          'Mark Ready',
  'ready':            'Send for Delivery',
  'out-for-delivery': 'Mark Delivered',
  'delivered':        'Mark Completed',
};

const STATUS_TABS: { key: StatusKey; label: string; icon: React.ReactNode }[] = [
  { key: 'pending',          label: 'Pending',          icon: <Clock className="h-3.5 w-3.5" /> },
  { key: 'confirmed',        label: 'Confirmed',        icon: <Check className="h-3.5 w-3.5" /> },
  { key: 'picked-up',        label: 'Picked Up',        icon: <Truck className="h-3.5 w-3.5" /> },
  { key: 'in_progress',      label: 'In Progress',      icon: <Settings2 className="h-3.5 w-3.5" /> },
  { key: 'washing',          label: 'Washing',          icon: <Waves className="h-3.5 w-3.5" /> },
  { key: 'ironing',          label: 'Ironing',          icon: <Zap className="h-3.5 w-3.5" /> },
  { key: 'ready',            label: 'Ready',            icon: <PackageCheck className="h-3.5 w-3.5" /> },
  { key: 'out-for-delivery', label: 'Out for Delivery', icon: <Navigation className="h-3.5 w-3.5" /> },
  { key: 'delivered',        label: 'Delivered',        icon: <Home className="h-3.5 w-3.5" /> },
  { key: 'completed',        label: 'Completed',        icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
  { key: 'cancelled',        label: 'Cancelled',        icon: <XCircle className="h-3.5 w-3.5" /> },
];

// ============================================================================
// HELPERS
// ============================================================================

function customerName(order: any): string {
  return order.walkInCustomer?.name || order.customer?.name || '—';
}
function customerPhone(order: any): string {
  return order.walkInCustomer?.phone || order.customer?.phone || '—';
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function StaffOrdersPage() {
  const { user } = useAuthStore();
  const navigate  = useNavigate();

  const [activeTab,    setActiveTab]    = useState<StatusKey>('pending');
  const [viewScope,    setViewScope]    = useState<'all' | 'mine'>('all');
  const [orders,       setOrders]       = useState<any[]>([]);
  const [counts,       setCounts]       = useState<Record<string, number>>({});
  const [isLoading,    setIsLoading]    = useState(false);
  const [refreshKey,   setRefreshKey]   = useState(0);
  const [listKey,      setListKey]      = useState(0);
  const [search,       setSearch]       = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching,   setIsSearching]   = useState(false);
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Modals
  const [detailOrder,  setDetailOrder]  = useState<any>(null);
  const [acceptTarget, setAcceptTarget] = useState<any>(null);
  const [isAccepting,  setIsAccepting]  = useState(false);
  const [statusTarget, setStatusTarget] = useState<any>(null);
  const [offlineOpen,  setOfflineOpen]  = useState(false);
  const [scannerOpen,  setScannerOpen]  = useState(false);
  const [receiptOrder, setReceiptOrder] = useState<any>(null);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  // ── Fetch tab counts — scope=all shows system-wide counts, scope=mine shows personal ──
  const fetchCounts = useCallback(() => {
    apiClient.get('/orders/staff-counts', { params: { scope: viewScope } })
      .then((res) => { if (res.data?.data) setCounts(res.data.data); })
      .catch(() => {});
  }, [viewScope]);

  useEffect(() => {
    fetchCounts();
    const interval = setInterval(fetchCounts, 30_000);
    return () => clearInterval(interval);
  }, [fetchCounts, refreshKey]);

  // Socket: refresh counts on order changes
  useEffect(() => {
    const socket = socketClient.getSocket();
    if (!socket) return;
    const handler = () => fetchCounts();
    socket.on('order:created',        handler);
    socket.on('order:assigned',       handler);
    socket.on('order:status-updated', handler);
    socket.on('order:updated',        handler);
    return () => {
      socket.off('order:created',        handler);
      socket.off('order:assigned',       handler);
      socket.off('order:status-updated', handler);
      socket.off('order:updated',        handler);
    };
  }, [fetchCounts]);

  // Socket: inline-update lastUpdatedById + status on any order:status-updated
  useEffect(() => {
    const socket = socketClient.getSocket();
    if (!socket) return;
    const statusHandler = (data: { orderId: string; status: string; updatedById?: string; updatedByName?: string }) => {
      setOrders((prev) =>
        prev.map((o) =>
          (o._id === data.orderId || o.id === data.orderId)
            ? {
                ...o,
                status: data.status,
                lastUpdatedById: data.updatedById
                  ? { _id: data.updatedById, name: data.updatedByName ?? '' }
                  : o.lastUpdatedById,
              }
            : o
        )
      );
      setListKey((k) => k + 1);
    };
    const refreshHandler = () => setListKey((k) => k + 1);
    socket.on('order:status-updated', statusHandler);
    socket.on('order:created',        refreshHandler);
    socket.on('order:assigned',       refreshHandler);
    return () => {
      socket.off('order:status-updated', statusHandler);
      socket.off('order:created',        refreshHandler);
      socket.off('order:assigned',       refreshHandler);
    };
  }, []);

  // Socket: update deadline fields in-place without refetch
  useEffect(() => {
    const socket = socketClient.getSocket();
    if (!socket) return;
    const handler = (data: { orderId: string; stageDeadlineAt: string | null; stageDurationMinutes: number | null }) => {
      setOrders((prev) =>
        prev.map((o) =>
          (o._id === data.orderId || o.id === data.orderId)
            ? { ...o, stageDeadlineAt: data.stageDeadlineAt, stageDurationMinutes: data.stageDurationMinutes }
            : o
        )
      );
    };
    socket.on('order:timer-updated', handler);
    return () => { socket.off('order:timer-updated', handler); };
  }, []);

  // ── Fetch orders for active tab ──────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    const fetchOrders = async () => {
      setIsLoading(true);
      setSearch('');
      try {
        const params: Record<string, string> = { statusTab: activeTab, limit: '100' };
        // In "My Orders" scope, filter server-side to orders involving this staff
        if (viewScope === 'mine' && activeTab !== 'pending') params.myOrders = 'true';
        const res = await apiClient.get('/orders', { params });
        if (!cancelled) {
          const raw = res.data.data;
          setOrders(Array.isArray(raw) ? raw : raw?.orders ?? []);
        }
      } catch {
        if (!cancelled) setOrders([]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    fetchOrders();
    return () => { cancelled = true; };
  }, [activeTab, viewScope, refreshKey, listKey]);

  // Cross-tab search
  useEffect(() => {
    const q = search.trim();
    if (!q) { setSearchResults([]); setIsSearching(false); return; }
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await apiClient.get('/orders', { params: { search: q, limit: '20' } });
        const raw = res.data.data;
        setSearchResults(Array.isArray(raw) ? raw : raw?.orders ?? []);
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);
  }, [search]);

  const filteredOrders = useMemo(() => orders, [orders]);

  // ── Stats ────────────────────────────────────────────────────────────────
  const myTotal   = Object.entries(counts)
    .filter(([k]) => k !== 'pending' && k !== 'cancelled')
    .reduce((s, [, v]) => s + v, 0);
  const inProgress = (counts['washing'] ?? 0) + (counts['ironing'] ?? 0) + (counts['in_progress'] ?? 0);
  const readyCount = counts['ready'] ?? 0;

  // ── Pick Order ───────────────────────────────────────────────────────────
  const handleConfirmAccept = async () => {
    if (!acceptTarget) return;
    try {
      setIsAccepting(true);
      await apiClient.patch(`/orders/${acceptTarget._id}/accept`);
      toast.success(`Order ${acceptTarget.orderNumber} picked — now in Confirmed`);
      setAcceptTarget(null);
      refresh();
      setActiveTab('confirmed');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to pick order');
    } finally {
      setIsAccepting(false);
    }
  };

  // ── Next Step (advance by one status) ───────────────────────────────────
  const handleNextStep = async (order: any) => {
    const current = order.status as StatusKey;
    const next    = NEXT_STATUS[current];
    if (!next) return;
    try {
      await apiClient.patch(`/orders/${order._id}/status`, { status: next });
      toast.success(`Order moved to ${next.replace(/-/g, ' ')}`);
      refresh();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to update status');
    }
  };

  // ── Swipe status (optimistic, revert on failure) ─────────────────────────
  const handleSwipeStatus = async (order: any, newStatus: StatusKey) => {
    const originalStatus = order.status as StatusKey;
    const label = newStatus.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    // Optimistic: update badge + counts immediately
    setOrders((prev) => prev.map((o) => o._id === order._id ? { ...o, status: newStatus } : o));
    setCounts((prev) => ({
      ...prev,
      [originalStatus]: Math.max(0, (prev[originalStatus] ?? 0) - 1),
      [newStatus]:       (prev[newStatus] ?? 0) + 1,
    }));
    try {
      await apiClient.patch(`/orders/${order._id}/status`, { status: newStatus });
      toast.success(`Order ${order.orderNumber} → ${label}`);
      // Remove from current tab — it now belongs to a different status tab
      setOrders((prev) => prev.filter((o) => o._id !== order._id));
    } catch (err: any) {
      // Revert badge + counts
      setOrders((prev) => prev.map((o) => o._id === order._id ? { ...o, status: originalStatus } : o));
      setCounts((prev) => ({
        ...prev,
        [originalStatus]: (prev[originalStatus] ?? 0) + 1,
        [newStatus]:       Math.max(0, (prev[newStatus] ?? 0) - 1),
      }));
      toast.error(err?.response?.data?.message || 'Failed to update status');
    }
  };

  // ── Columns ──────────────────────────────────────────────────────────────

  // Shared base columns
  const baseColumns = (): ColumnDef<any>[] => [
    {
      accessorKey: 'orderNumber',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Order #" />,
      cell: ({ row }) => (
        <div className="flex flex-col gap-1">
          <span className="font-mono font-semibold text-sm">{row.original.orderNumber ?? '—'}</span>
          <PriorityBadge serviceLevel={row.original.serviceLevel} rush={row.original.rush} priorityLevel={row.original.serviceLevelId?.priorityLevel} />
        </div>
      ),
    },
    {
      id: 'customer',
      header: 'Customer',
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{customerName(row.original)}</div>
          <div className="flex items-center gap-1 mt-0.5 flex-wrap">
            <span className="text-xs text-muted-foreground">{customerPhone(row.original)}</span>
            <CreatedByBadge role={row.original.createdByRole} source={row.original.orderSource} />
          </div>
        </div>
      ),
    },
    {
      id: 'service',
      header: 'Service(s)',
      cell: ({ row }) => {
        const items: any[] = row.original.items ?? [];
        const services = items.length > 0
          ? [...new Set(items.map((i: any) => i.serviceType).filter(Boolean))]
          : row.original.serviceType ? [row.original.serviceType] : [];
        if (!services.length) return <span className="text-muted-foreground text-xs">—</span>;
        return (
          <div className="flex flex-wrap gap-1">
            {services.map((s: string) => (
              <Badge key={s} variant="outline" className="capitalize text-xs">
                {SERVICE_LABELS[s] ?? s.replace(/-/g, ' ')}
              </Badge>
            ))}
          </div>
        );
      },
    },
    {
      id: 'handledBy',
      header: 'Handled By',
      cell: ({ row }) => {
        const assigned = row.original.assignedStaff;
        const lastBy   = row.original.lastUpdatedById;
        if (!assigned?.name) {
          return <span className="text-xs text-muted-foreground italic">Unassigned</span>;
        }
        return (
          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-medium flex items-center gap-1">
              <UserCheck className="h-3 w-3 text-muted-foreground shrink-0" />
              {assigned.name}
            </span>
            {lastBy?.name && lastBy.name !== assigned.name && (
              <span className="text-[10px] text-muted-foreground">
                Updated by: {lastBy.name}
              </span>
            )}
          </div>
        );
      },
    },
    {
      id: 'timer',
      header: 'Timer',
      cell: ({ row }) => (
        <CountdownBadge
          stageDeadlineAt={row.original.stageDeadlineAt}
          stageDurationMinutes={row.original.stageDurationMinutes}
          variant="compact"
        />
      ),
    },
    {
      accessorKey: 'createdAt',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Date" />,
      cell: ({ row }) =>
        row.original.createdAt ? format(new Date(row.original.createdAt), 'MMM dd, yyyy') : '—',
    },
  ];

  // Pending tab columns — show "Pick Order" button
  const pendingColumns: ColumnDef<any>[] = [
    ...baseColumns(),
    {
      id: 'actions',
      cell: ({ row }) => {
        const order = row.original;
        return (
          <Button size="sm" onClick={() => setAcceptTarget(order)}>
            <CheckCircle className="mr-2 h-4 w-4" />
            Pick Order
          </Button>
        );
      },
    },
  ];

  // Active-tab columns — show next-step + manual update
  const activeColumns: ColumnDef<any>[] = [
    ...baseColumns(),
    {
      id: 'total',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Total" />,
      cell: ({ row }) => {
        const total = row.original.pricing?.total ?? row.original.total ?? 0;
        return <span className="font-medium">₦{Number(total).toLocaleString()}</span>;
      },
    },
    {
      id: 'payment',
      header: 'Payment',
      cell: ({ row }) => {
        const s = row.original.paymentStatus || row.original.payment?.status || 'unpaid';
        return <PaymentStatusBadge status={s} />;
      },
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const order  = row.original;
        const next   = NEXT_STATUS[order.status as StatusKey];
        const label  = NEXT_STATUS_LABEL[order.status as StatusKey];
        return (
          <div className="flex items-center gap-1">
            {next && label && (
              <Button size="sm" variant="outline" className="text-xs h-7 px-2" onClick={() => handleNextStep(order)}>
                <ArrowRight className="mr-1 h-3 w-3" />
                {label}
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-7 w-7 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => setDetailOrder(order)}>
                  <Eye className="mr-2 h-4 w-4" /> View Details
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusTarget(order)}>
                  <Edit className="mr-2 h-4 w-4" /> Update Status
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ];

  // Read-only columns (delivered / completed / cancelled)
  const readOnlyColumns: ColumnDef<any>[] = [
    ...baseColumns(),
    {
      id: 'total',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Total" />,
      cell: ({ row }) => {
        const total = row.original.pricing?.total ?? row.original.total ?? 0;
        return <span className="font-medium">₦{Number(total).toLocaleString()}</span>;
      },
    },
    {
      id: 'payment',
      header: 'Payment',
      cell: ({ row }) => {
        const s = row.original.paymentStatus || row.original.payment?.status || 'unpaid';
        return <PaymentStatusBadge status={s} />;
      },
    },
    {
      id: 'actions',
      cell: ({ row }) => (
        <Button variant="ghost" size="sm" onClick={() => setDetailOrder(row.original)}>
          <Eye className="mr-2 h-4 w-4" /> View
        </Button>
      ),
    },
  ];

  function columnsForTab(key: StatusKey): ColumnDef<any>[] {
    if (key === 'pending')                                          return pendingColumns;
    if (key === 'delivered' || key === 'completed' || key === 'cancelled') return readOnlyColumns;
    return activeColumns;
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Orders</h1>
          <p className="text-muted-foreground text-sm">
            {viewScope === 'all' ? 'All orders in the system' : 'Orders you are handling'}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={() => navigate('/staff/orders/delivered')} className="flex-1 sm:flex-none">
            <CheckCircle2 className="mr-2 h-4 w-4 text-green-500" />
            Delivered
          </Button>
          <Button variant="outline" onClick={() => setScannerOpen(true)} className="flex-1 sm:flex-none">
            <ScanLine className="mr-2 h-4 w-4" />
            Scan QR
          </Button>
          <Button onClick={() => setOfflineOpen(true)} className="flex-1 sm:flex-none">
            <Plus className="mr-2 h-4 w-4" />
            Create Walk-in
          </Button>
        </div>
      </div>

      {/* ── View Scope Toggle ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-1 p-1 bg-muted rounded-lg w-fit">
        <button
          onClick={() => setViewScope('all')}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
            viewScope === 'all'
              ? 'bg-background shadow-sm text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Users className="h-3.5 w-3.5" />
          All Orders
        </button>
        <button
          onClick={() => setViewScope('mine')}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
            viewScope === 'mine'
              ? 'bg-background shadow-sm text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <UserCheck className="h-3.5 w-3.5" />
          My Orders
        </button>
      </div>

      {/* ── Stats Cards ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-4 px-4">
            <CardTitle className="text-xs sm:text-sm font-medium">
              {viewScope === 'all' ? 'Total Active' : 'My Orders'}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold">{myTotal}</div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {viewScope === 'all' ? 'Across all staff' : 'Assigned to me'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-4 px-4">
            <CardTitle className="text-xs sm:text-sm font-medium">In Progress</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold">{inProgress}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-4 px-4">
            <CardTitle className="text-xs sm:text-sm font-medium">Ready</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold">{readyCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* ── Global Cross-Tab Search ──────────────────────────────────────── */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search orders by number or customer name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 pr-9"
        />
        {isSearching && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {/* ── Cross-Tab Search Results ─────────────────────────────────────── */}
      {search.trim() && (
        <div className="rounded-lg border bg-card shadow-sm">
          <div className="px-4 py-2 border-b flex items-center justify-between">
            <span className="text-sm font-medium">
              {isSearching ? 'Searching…' : `${searchResults.length} result${searchResults.length !== 1 ? 's' : ''} across all tabs`}
            </span>
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setSearch('')}>
              Clear
            </Button>
          </div>
          {!isSearching && searchResults.length === 0 && (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">No orders found</div>
          )}
          {searchResults.map((order) => {
            const total = order.pricing?.total ?? order.total ?? 0;
            const payStatus = order.paymentStatus || order.payment?.status || 'unpaid';
            const tabKey = order.status as StatusKey;
            const next = NEXT_STATUS[tabKey];
            const nextLabel = NEXT_STATUS_LABEL[tabKey];
            const isPending = tabKey === 'pending';
            const isReadOnly = tabKey === 'delivered' || tabKey === 'completed' || tabKey === 'cancelled';
            return (
              <div
                key={order._id}
                className="flex items-center gap-3 px-4 py-3 border-b last:border-0 hover:bg-muted/40 transition-colors cursor-pointer"
                onClick={() => setDetailOrder(order)}
              >
                {/* Order info */}
                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-semibold text-sm">{order.orderNumber}</span>
                    <OrderStatusBadge status={order.status} />
                  </div>
                  <div className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
                    <span>{customerName(order)}</span>
                    <PaymentStatusBadge status={payStatus} />
                    {total > 0 && <span className="font-medium text-foreground">₦{Number(total).toLocaleString()}</span>}
                  </div>
                </div>

                {/* Next-step button */}
                {isPending && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs h-7 shrink-0"
                    onClick={(e) => { e.stopPropagation(); setAcceptTarget(order); }}
                  >
                    <CheckCircle className="mr-1 h-3 w-3" />
                    Pick Order
                  </Button>
                )}
                {!isPending && !isReadOnly && next && nextLabel && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs h-7 shrink-0"
                    onClick={(e) => { e.stopPropagation(); handleNextStep(order); }}
                  >
                    <ArrowRight className="mr-1 h-3 w-3" />
                    {nextLabel}
                  </Button>
                )}

                {/* Actions dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className="h-7 w-7 p-0 shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setDetailOrder(order); }}>
                      <Eye className="mr-2 h-4 w-4" /> View Details
                    </DropdownMenuItem>
                    {isPending && (
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setAcceptTarget(order); }}>
                        <CheckCircle className="mr-2 h-4 w-4" /> Pick Order
                      </DropdownMenuItem>
                    )}
                    {!isPending && !isReadOnly && (
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setStatusTarget(order); }}>
                        <Edit className="mr-2 h-4 w-4" /> Update Status
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setSearch(''); setActiveTab(tabKey); }}>
                      <ArrowRight className="mr-2 h-4 w-4" /> Go to {STATUS_TABS.find((t) => t.key === tabKey)?.label ?? tabKey} tab
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            );
          })}
        </div>
      )}

      {/* ── 11-Status Tab Strip ──────────────────────────────────────────── */}
      <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v as StatusKey); setSearch(''); }}>
        <div className="w-full overflow-x-auto pb-1">
          <TabsList className="flex w-max gap-0.5">
            {STATUS_TABS.map((tab) => {
              const count = counts[tab.key] ?? 0;
              return (
                <TabsTrigger
                  key={tab.key}
                  value={tab.key}
                  className="flex items-center gap-1.5 text-xs whitespace-nowrap px-3 py-1.5"
                >
                  {tab.icon}
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
                  {count > 0 && (
                    <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold leading-none">
                      {count > 99 ? '99+' : count}
                    </span>
                  )}
                </TabsTrigger>
              );
            })}
          </TabsList>
        </div>

        {STATUS_TABS.map((tab) => (
          <TabsContent key={tab.key} value={tab.key} className="space-y-4 mt-4">
            {/* ── Context banner for Pending tab ─────────────────────── */}
            {tab.key === 'pending' && (
              <div className="rounded-md border border-amber-200 bg-amber-50 dark:bg-amber-900/10 dark:border-amber-800 px-4 py-2.5 text-sm text-amber-800 dark:text-amber-400">
                These are unassigned orders. Click <strong>Pick Order</strong> to claim one.
              </div>
            )}

            {/* ── Mobile cards ───────────────────────────────────────── */}
            <div className="md:hidden space-y-3">
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-4 space-y-2">
                      <div className="h-4 bg-muted rounded w-1/3" />
                      <div className="h-3 bg-muted rounded w-1/2" />
                    </CardContent>
                  </Card>
                ))
              ) : filteredOrders.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center gap-3 py-12">
                    <Package className="h-10 w-10 text-muted-foreground opacity-40" />
                    <p className="text-sm text-muted-foreground">No {tab.label.toLowerCase()} orders</p>
                  </CardContent>
                </Card>
              ) : (
                filteredOrders.map((order) => {
                  const nextStatus = NEXT_STATUS[order.status as StatusKey];
                  const prevStatus = PREV_STATUS[order.status as StatusKey];
                  const isCancelled = order.status === 'cancelled';
                  return (
                  <StaffMobileCard
                    key={order._id}
                    order={order}
                    tabKey={tab.key}
                    onView={() => setDetailOrder(order)}
                    onAccept={() => setAcceptTarget(order)}
                    onUpdateStatus={() => setStatusTarget(order)}
                    onNextStep={() => handleNextStep(order)}
                    nextLabel={NEXT_STATUS_LABEL[order.status as StatusKey]}
                    onSwipeNext={!isCancelled && nextStatus ? () => handleSwipeStatus(order, nextStatus) : undefined}
                    onSwipePrev={!isCancelled && prevStatus ? () => handleSwipeStatus(order, prevStatus) : undefined}
                    nextStatusLabel={nextStatus}
                    prevStatusLabel={prevStatus}
                  />
                  );
                })
              )}
            </div>

            {/* ── Desktop table ──────────────────────────────────────── */}
            <Card className="hidden md:block">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {tab.icon} {tab.label}
                </CardTitle>
                <CardDescription>
                  {tab.key === 'pending'
                    ? 'Unassigned orders available to claim'
                    : viewScope === 'all'
                    ? `All orders at ${tab.label.toLowerCase()} stage`
                    : `Your orders at ${tab.label.toLowerCase()} stage`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DataTable
                  columns={columnsForTab(tab.key)}
                  data={filteredOrders}
                  searchKey={undefined}
                  isLoading={isLoading}
                  onRowClick={(row) => setDetailOrder(row)}
                  showColumnVisibility
                />
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      {/* ── Modals ───────────────────────────────────────────────────────── */}
      <StaffOrderDetailModal
        order={detailOrder}
        open={!!detailOrder}
        onOpenChange={(open) => !open && setDetailOrder(null)}
        onViewReceipt={(order) => { setDetailOrder(null); setReceiptOrder(order); }}
      />
      <BarcodeScannerModal
        open={scannerOpen}
        onOpenChange={setScannerOpen}
        confirmPath="/staff/orders/delivery-confirm"
      />
      <OrderReceiptModal
        open={!!receiptOrder}
        onOpenChange={(open) => !open && setReceiptOrder(null)}
        order={receiptOrder}
      />
      <ConfirmDialog
        open={!!acceptTarget}
        onOpenChange={(open) => !open && setAcceptTarget(null)}
        title="Pick Up Order"
        description={
          <>
            Claim order{' '}
            <span className="font-mono font-semibold">{acceptTarget?.orderNumber}</span> for{' '}
            <strong>{acceptTarget ? customerName(acceptTarget) : ''}</strong>?
            It will move to <strong>Confirmed</strong> and be assigned to you.
          </>
        }
        confirmLabel="Pick Order"
        isLoading={isAccepting}
        onConfirm={handleConfirmAccept}
      />
      <UpdateStatusModal
        open={!!statusTarget}
        onOpenChange={(open) => !open && setStatusTarget(null)}
        order={statusTarget}
        onSuccess={refresh}
      />
      <CreateOrderModal
        open={offlineOpen}
        onOpenChange={setOfflineOpen}
        onSuccess={() => {
          refresh();
          setActiveTab('confirmed');
        }}
      />
    </div>
  );
}

// ============================================================================
// STAFF MOBILE ORDER CARD
// ============================================================================

interface StaffMobileCardProps {
  order: any;
  tabKey: StatusKey;
  onView: () => void;
  onAccept: () => void;
  onUpdateStatus: () => void;
  onNextStep: () => void;
  nextLabel?: string;
  onSwipeNext?: () => void;
  onSwipePrev?: () => void;
  nextStatusLabel?: string;
  prevStatusLabel?: string;
}

function StaffMobileCard({ order, tabKey, onView, onAccept, onUpdateStatus, onNextStep, nextLabel, onSwipeNext, onSwipePrev, nextStatusLabel, prevStatusLabel }: StaffMobileCardProps) {
  const isWalkIn     = order.orderSource === 'offline';
  const name         = customerName(order);
  const items: any[] = order.items ?? [];
  const total        = order.pricing?.total ?? order.total ?? 0;
  const payStatus    = order.paymentStatus || order.payment?.status || 'unpaid';
  const createdAt    = order.createdAt ? format(new Date(order.createdAt), 'MMM dd, yyyy') : '—';
  const isReadOnly   = tabKey === 'delivered' || tabKey === 'completed' || tabKey === 'cancelled';

  return (
    <SwipeableCard
      onSwipeRight={onSwipeNext}
      onSwipeLeft={onSwipePrev}
      rightLabel={nextStatusLabel}
      leftLabel={prevStatusLabel}
      disabled={order.status === 'cancelled'}
    >
    <Card className="cursor-pointer hover:bg-muted/30 transition-colors" onClick={onView}>
      <CardContent className="p-4 space-y-3">
        {/* Top: order number + actions */}
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm font-mono">{order.orderNumber ?? '—'}</span>
              <PriorityBadge serviceLevel={order.serviceLevel} rush={order.rush} priorityLevel={order.serviceLevelId?.priorityLevel} />
              {isWalkIn && <Badge variant="outline" className="text-[10px] px-1.5 py-0">Walk-in</Badge>}
              <CreatedByBadge role={order.createdByRole} source={order.orderSource} />
            </div>
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <User className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{name}</span>
            </div>
            {/* Handled-by row */}
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
              <UserCheck className="h-3 w-3 shrink-0" />
              {order.assignedStaff?.name
                ? <span className="truncate">Handled by: <strong>{order.assignedStaff.name}</strong></span>
                : <span className="italic">Unassigned</span>
              }
              {order.lastUpdatedById?.name && order.lastUpdatedById.name !== order.assignedStaff?.name && (
                <span className="ml-1 text-[10px]">· Updated by: {order.lastUpdatedById.name}</span>
              )}
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0 shrink-0" onClick={(e) => e.stopPropagation()}>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onView(); }}>
                <Eye className="mr-2 h-4 w-4" /> View Details
              </DropdownMenuItem>
              {tabKey === 'pending' && (
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onAccept(); }}>
                  <CheckCircle className="mr-2 h-4 w-4" /> Pick Order
                </DropdownMenuItem>
              )}
              {!isReadOnly && tabKey !== 'pending' && (
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onUpdateStatus(); }}>
                  <Edit className="mr-2 h-4 w-4" /> Update Status
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Items */}
        {items.length > 0 && (
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Package className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">
              {items[0].itemType || items[0].serviceName || SERVICE_LABELS[items[0].serviceType] || '—'}
              {items.length > 1 && ` +${items.length - 1} more`}
            </span>
          </div>
        )}

        {/* Countdown timer */}
        {order.stageDeadlineAt && (
          <CountdownBadge
            stageDeadlineAt={order.stageDeadlineAt}
            stageDurationMinutes={order.stageDurationMinutes}
            variant="compact"
          />
        )}

        {/* Status + payment + amount */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap">
            <OrderStatusBadge status={order.status} />
            {tabKey !== 'pending' && <PaymentStatusBadge status={payStatus} />}
          </div>
          <div className="text-right">
            {total > 0 && <div className="font-semibold text-sm">₦{Number(total).toLocaleString()}</div>}
            <div className="text-[11px] text-muted-foreground">{createdAt}</div>
          </div>
        </div>

        {/* Pending: Pick Order button */}
        {tabKey === 'pending' && (
          <Button size="sm" className="w-full" onClick={(e) => { e.stopPropagation(); onAccept(); }}>
            <CheckCircle className="mr-2 h-4 w-4" /> Pick Order
          </Button>
        )}

        {/* Active: Next Step button */}
        {!isReadOnly && tabKey !== 'pending' && nextLabel && (
          <Button size="sm" variant="outline" className="w-full" onClick={(e) => { e.stopPropagation(); onNextStep(); }}>
            <ArrowRight className="mr-2 h-4 w-4" /> {nextLabel}
          </Button>
        )}
      </CardContent>
    </Card>
    </SwipeableCard>
  );
}
