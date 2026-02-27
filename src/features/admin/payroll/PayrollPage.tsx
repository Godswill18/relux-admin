// ============================================================================
// PAYROLL PAGE - Staff Payroll Scheduler
// ============================================================================

import { useEffect, useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import {
  Plus,
  DollarSign,
  Users,
  TrendingUp,
  Calendar,
  MoreHorizontal,
  Edit,
  CheckCircle,
  CreditCard,
  Download,
  Trash2,
  Clock,
  Loader2,
  ArrowLeft,
  ShieldCheck,
  Lock,
  CalendarCheck,
} from 'lucide-react';
import { CreateScheduleModal } from './CreateScheduleModal';
import { EditEntryModal } from './EditEntryModal';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { DataTable, DataTableColumnHeader } from '@/components/shared/DataTable';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  usePayrollStore,
  PayrollPeriod,
  PayrollEntry,
  PeriodStatus,
} from '@/stores/usePayrollStore';
import { toast } from 'sonner';
import { format } from 'date-fns';

// ============================================================================
// HELPERS
// ============================================================================

function StatusBadge({ status }: { status: PeriodStatus }) {
  const config: Record<PeriodStatus, { variant: any; label: string; className: string }> = {
    draft: { variant: 'secondary', label: 'Draft', className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' },
    approved: { variant: 'default', label: 'Approved', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' },
    finalized: { variant: 'default', label: 'Finalized', className: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' },
    paid: { variant: 'outline', label: 'Paid', className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
  };

  const c = config[status] || config.draft;
  return <Badge variant={c.variant} className={c.className}>{c.label}</Badge>;
}

function FrequencyBadge({ frequency }: { frequency: string }) {
  const labels: Record<string, string> = {
    weekly: 'Weekly',
    biweekly: 'Bi-weekly',
    monthly: 'Monthly',
    custom: 'Custom',
  };
  return (
    <Badge variant="outline" className="text-xs capitalize">
      {labels[frequency] || frequency}
    </Badge>
  );
}

function getStaffName(userId: PayrollEntry['userId']): string {
  if (typeof userId === 'object' && userId !== null) {
    return userId.name || 'Unknown';
  }
  return String(userId);
}

function getStaffRole(userId: PayrollEntry['userId']): string {
  if (typeof userId === 'object' && userId !== null) {
    return userId.staffRole || userId.role || '';
  }
  return '';
}

function formatCurrency(amount: number): string {
  return `₦${amount.toLocaleString()}`;
}

// ============================================================================
// PAYROLL PAGE COMPONENT
// ============================================================================

export default function PayrollPage() {
  const {
    periods,
    entries,
    entrySummary,
    selectedPeriod,
    isLoading,
    isGenerating,
    fetchPeriods,
    setSelectedPeriod,
    generateEntries,
    approvePeriod,
    finalizePeriod,
    markPeriodPaid,
    deletePeriod,
    generatePayslip,
  } = usePayrollStore();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editEntry, setEditEntry] = useState<PayrollEntry | null>(null);
  const [activeTab, setActiveTab] = useState('all');

  type ConfirmState = {
    title: string;
    description: React.ReactNode;
    confirmLabel: string;
    destructive?: boolean;
    onConfirm: () => Promise<void>;
  } | null;
  const [confirmState, setConfirmState] = useState<ConfirmState>(null);
  const [isConfirming, setIsConfirming] = useState(false);

  const runConfirm = async () => {
    if (!confirmState) return;
    setIsConfirming(true);
    try {
      await confirmState.onConfirm();
      setConfirmState(null);
    } catch {
      // each onConfirm shows its own error toast; keep dialog open on failure
    } finally {
      setIsConfirming(false);
    }
  };

  useEffect(() => {
    fetchPeriods();
  }, [fetchPeriods]);

  // ---- Workflow handlers ----

  const handleGenerate = async () => {
    if (!selectedPeriod) return;
    try {
      await generateEntries(selectedPeriod._id || selectedPeriod.id);
      toast.success('Payroll entries generated from attendance data');
    } catch {
      toast.error('Failed to generate entries');
    }
  };

  const handleApprove = () => {
    if (!selectedPeriod) return;
    setConfirmState({
      title: 'Approve Payroll',
      description: 'Approve this payroll? Entries will be locked for review before finalizing.',
      confirmLabel: 'Approve',
      onConfirm: async () => {
        try {
          await approvePeriod(selectedPeriod._id || selectedPeriod.id);
          toast.success('Payroll approved');
        } catch {
          toast.error('Failed to approve payroll');
          throw new Error('approve failed');
        }
      },
    });
  };

  const handleFinalize = () => {
    if (!selectedPeriod) return;
    setConfirmState({
      title: 'Finalize Payroll',
      description:
        'Finalize this payroll? It will be locked and sent for payment processing. No further edits will be possible.',
      confirmLabel: 'Finalize',
      onConfirm: async () => {
        try {
          await finalizePeriod(selectedPeriod._id || selectedPeriod.id);
          toast.success('Payroll finalized');
        } catch {
          toast.error('Failed to finalize payroll');
          throw new Error('finalize failed');
        }
      },
    });
  };

  const handleMarkPaid = () => {
    if (!selectedPeriod) return;
    setConfirmState({
      title: 'Mark Payroll as Paid',
      description:
        'Mark this payroll as paid? All staff entries will be updated to "Paid" status. This action cannot be undone.',
      confirmLabel: 'Mark Paid',
      onConfirm: async () => {
        try {
          await markPeriodPaid(selectedPeriod._id || selectedPeriod.id);
          toast.success('Payroll marked as paid');
        } catch {
          toast.error('Failed to mark as paid');
          throw new Error('mark paid failed');
        }
      },
    });
  };

  const handleDelete = (period: PayrollPeriod) => {
    setConfirmState({
      title: 'Delete Payroll Schedule',
      description: (
        <>
          Are you sure you want to delete <strong>"{period.name}"</strong>? This will also remove
          all generated entries for this period. This action cannot be undone.
        </>
      ),
      confirmLabel: 'Delete',
      destructive: true,
      onConfirm: async () => {
        try {
          await deletePeriod(period._id || period.id);
          toast.success('Payroll schedule deleted');
        } catch {
          toast.error('Failed to delete schedule');
          throw new Error('delete failed');
        }
      },
    });
  };

  const handleGeneratePayslip = async (entry: PayrollEntry) => {
    try {
      await generatePayslip(entry._id || entry.id);
      toast.success('Payslip generated');
    } catch {
      toast.error('Failed to generate payslip');
    }
  };

  // ---- Filter periods by tab ----

  const filteredPeriods = (Array.isArray(periods) ? periods : []).filter((p) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'active') return p.status === 'draft' || p.status === 'approved';
    if (activeTab === 'completed') return p.status === 'finalized' || p.status === 'paid';
    return p.status === activeTab;
  });

  // ---- Stats ----

  const allPeriods = Array.isArray(periods) ? periods : [];
  const draftCount = allPeriods.filter((p) => p.status === 'draft').length;
  const activeCount = allPeriods.filter((p) => p.status === 'approved' || p.status === 'finalized').length;
  const paidTotal = allPeriods
    .filter((p) => p.status === 'paid')
    .reduce((sum, p) => sum + (p.totalAmount || 0), 0);
  const currentTotal = selectedPeriod
    ? (entrySummary?.totalAmount || entries.reduce((sum, e) => sum + (e.totalPay || 0), 0))
    : 0;

  // ---- Period columns ----

  const periodColumns: ColumnDef<PayrollPeriod>[] = [
    {
      accessorKey: 'name',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Schedule" />,
      cell: ({ row }) => (
        <div>
          <div className="font-medium text-sm">{row.original.name || 'Unnamed'}</div>
          <div className="text-xs text-muted-foreground">
            {format(new Date(row.original.startDate), 'MMM dd')} -{' '}
            {format(new Date(row.original.endDate), 'MMM dd, yyyy')}
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'frequency',
      header: 'Frequency',
      cell: ({ row }) => <FrequencyBadge frequency={row.original.frequency} />,
    },
    {
      accessorKey: 'totalAmount',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Total" />,
      cell: ({ row }) => (
        <div className="font-medium">
          {row.original.totalAmount > 0 ? formatCurrency(row.original.totalAmount) : '—'}
        </div>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const period = row.original;
        return (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedPeriod(period)}
            >
              View
            </Button>
            {period.status === 'draft' && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-8 w-8 p-0">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                  <DropdownMenuItem
                    onClick={() => handleDelete(period)}
                    className="text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        );
      },
    },
  ];

  // ---- Entry columns ----

  const entryColumns: ColumnDef<PayrollEntry>[] = [
    {
      accessorKey: 'userId',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Staff" />,
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{getStaffName(row.original.userId)}</div>
          {getStaffRole(row.original.userId) && (
            <div className="text-xs text-muted-foreground capitalize">
              {getStaffRole(row.original.userId)}
            </div>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'payType',
      header: 'Type',
      cell: ({ row }) => (
        <Badge variant="outline" className="text-xs capitalize">
          {row.original.payType}
        </Badge>
      ),
    },
    {
      accessorKey: 'baseHours',
      header: 'Hours',
      cell: ({ row }) => (
        <div className="text-sm">
          <span>{row.original.baseHours}h</span>
          {row.original.overtimeHours > 0 && (
            <span className="text-amber-600 ml-1">+{row.original.overtimeHours}h OT</span>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'basePay',
      header: 'Base Pay',
      cell: ({ row }) => (
        <div className="text-sm">{formatCurrency(row.original.basePay || 0)}</div>
      ),
    },
    {
      accessorKey: 'bonuses',
      header: 'Bonuses',
      cell: ({ row }) => (
        <div className="text-sm text-green-600">
          {row.original.bonuses > 0 ? `+${formatCurrency(row.original.bonuses)}` : '—'}
        </div>
      ),
    },
    {
      accessorKey: 'deductions',
      header: 'Deductions',
      cell: ({ row }) => (
        <div className="text-sm text-red-600">
          {row.original.deductions > 0 ? `-${formatCurrency(row.original.deductions)}` : '—'}
        </div>
      ),
    },
    {
      accessorKey: 'totalPay',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Total Pay" />,
      cell: ({ row }) => (
        <div className="font-bold">{formatCurrency(row.original.totalPay)}</div>
      ),
    },
    {
      accessorKey: 'paymentStatus',
      header: 'Payment',
      cell: ({ row }) => {
        const ps = row.original.paymentStatus || 'pending';
        return (
          <Badge
            variant={ps === 'paid' ? 'outline' : 'secondary'}
            className={ps === 'paid' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : ''}
          >
            {ps === 'paid' ? 'Paid' : 'Pending'}
          </Badge>
        );
      },
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const entry = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() => setEditEntry(entry)}
                disabled={selectedPeriod?.status !== 'draft'}
              >
                <Edit className="mr-2 h-4 w-4" />
                Edit Entry
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleGeneratePayslip(entry)}>
                <Download className="mr-2 h-4 w-4" />
                Generate Payslip
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  // ============================================================================
  // RENDER: PAYROLL DETAIL VIEW (when a period is selected)
  // ============================================================================

  if (selectedPeriod) {
    const pid = selectedPeriod._id || selectedPeriod.id;
    const staffCount = entries.length;
    const avgPay = staffCount > 0 ? currentTotal / staffCount : 0;

    return (
      <div className="space-y-6">
        {/* Back + Title */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => setSelectedPeriod(null)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">{selectedPeriod.name || 'Payroll Schedule'}</h1>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" />
                {format(new Date(selectedPeriod.startDate), 'MMM dd')} -{' '}
                {format(new Date(selectedPeriod.endDate), 'MMM dd, yyyy')}
                <span className="mx-1">·</span>
                <FrequencyBadge frequency={selectedPeriod.frequency} />
              </div>
            </div>
          </div>
          <StatusBadge status={selectedPeriod.status} />
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Payroll</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(currentTotal)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Staff</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{staffCount}</div>
              <p className="text-xs text-muted-foreground">members in this run</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Pay</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(Math.round(avgPay))}</div>
              <p className="text-xs text-muted-foreground">per staff member</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Bonuses / Deductions</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <span className="text-green-600 font-medium text-sm">
                  +{formatCurrency(entrySummary?.totalBonuses || 0)}
                </span>
                <span className="text-muted-foreground">/</span>
                <span className="text-red-600 font-medium text-sm">
                  -{formatCurrency(entrySummary?.totalDeductions || 0)}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Workflow Status + Actions */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              {/* Workflow Steps */}
              <div className="flex items-center gap-2 text-sm">
                <WorkflowStep
                  label="Create"
                  icon={<Calendar className="h-3.5 w-3.5" />}
                  done
                />
                <WorkflowArrow />
                <WorkflowStep
                  label="Generate"
                  icon={<Clock className="h-3.5 w-3.5" />}
                  done={entries.length > 0}
                  active={selectedPeriod.status === 'draft' && entries.length === 0}
                />
                <WorkflowArrow />
                <WorkflowStep
                  label="Approve"
                  icon={<ShieldCheck className="h-3.5 w-3.5" />}
                  done={selectedPeriod.status === 'approved' || selectedPeriod.status === 'finalized' || selectedPeriod.status === 'paid'}
                  active={selectedPeriod.status === 'draft' && entries.length > 0}
                />
                <WorkflowArrow />
                <WorkflowStep
                  label="Finalize"
                  icon={<Lock className="h-3.5 w-3.5" />}
                  done={selectedPeriod.status === 'finalized' || selectedPeriod.status === 'paid'}
                  active={selectedPeriod.status === 'approved'}
                />
                <WorkflowArrow />
                <WorkflowStep
                  label="Mark Paid"
                  icon={<CreditCard className="h-3.5 w-3.5" />}
                  done={selectedPeriod.status === 'paid'}
                  active={selectedPeriod.status === 'finalized'}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                {selectedPeriod.status === 'draft' && (
                  <>
                    <Button variant="outline" size="sm" onClick={handleGenerate} disabled={isGenerating}>
                      {isGenerating ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <CalendarCheck className="mr-2 h-4 w-4" />
                      )}
                      {entries.length > 0 ? 'Recalculate' : 'Generate Entries'}
                    </Button>
                    {entries.length > 0 && (
                      <Button size="sm" onClick={handleApprove}>
                        <ShieldCheck className="mr-2 h-4 w-4" />
                        Approve
                      </Button>
                    )}
                  </>
                )}
                {selectedPeriod.status === 'approved' && (
                  <Button size="sm" onClick={handleFinalize}>
                    <Lock className="mr-2 h-4 w-4" />
                    Finalize
                  </Button>
                )}
                {selectedPeriod.status === 'finalized' && (
                  <Button size="sm" onClick={handleMarkPaid}>
                    <CreditCard className="mr-2 h-4 w-4" />
                    Mark Paid
                  </Button>
                )}
                {selectedPeriod.status === 'paid' && (
                  <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 px-3 py-1.5">
                    <CheckCircle className="mr-1.5 h-3.5 w-3.5" />
                    Completed
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Entries Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Payroll Entries</CardTitle>
                <CardDescription>
                  {entries.length > 0
                    ? `${entries.length} staff member${entries.length !== 1 ? 's' : ''} in this payroll run`
                    : 'No entries yet. Click "Generate Entries" to auto-calculate from attendance data.'}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={entryColumns}
              data={Array.isArray(entries) ? entries : []}
              searchKey="userId"
              searchPlaceholder="Search staff..."
              isLoading={isLoading}
            />
          </CardContent>
        </Card>

        <EditEntryModal
          open={!!editEntry}
          onOpenChange={(open) => !open && setEditEntry(null)}
          entry={editEntry}
        />

        <ConfirmDialog
          open={!!confirmState}
          onOpenChange={(open) => !open && setConfirmState(null)}
          title={confirmState?.title ?? ''}
          description={confirmState?.description ?? ''}
          confirmLabel={confirmState?.confirmLabel ?? 'Confirm'}
          destructive={confirmState?.destructive}
          isLoading={isConfirming}
          onConfirm={runConfirm}
        />
      </div>
    );
  }

  // ============================================================================
  // RENDER: PAYROLL LIST VIEW (no period selected)
  // ============================================================================

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Payroll Scheduler</h1>
          <p className="text-muted-foreground">
            Create schedules, calculate earnings, and manage staff payroll
          </p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Schedule
        </Button>
      </div>

      <CreateScheduleModal open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen} />

      <ConfirmDialog
        open={!!confirmState}
        onOpenChange={(open) => !open && setConfirmState(null)}
        title={confirmState?.title ?? ''}
        description={confirmState?.description ?? ''}
        confirmLabel={confirmState?.confirmLabel ?? 'Confirm'}
        destructive={confirmState?.destructive}
        isLoading={isConfirming}
        onConfirm={runConfirm}
      />

      {/* Overview Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Draft Schedules</CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{draftCount}</div>
            <p className="text-xs text-muted-foreground">Awaiting generation/approval</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Runs</CardTitle>
            <CalendarCheck className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeCount}</div>
            <p className="text-xs text-muted-foreground">Approved or finalized</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Paid</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(paidTotal)}</div>
            <p className="text-xs text-muted-foreground">All-time payroll disbursed</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Schedules</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{allPeriods.length}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>
      </div>

      {/* Periods Table with Tabs */}
      <Card>
        <CardHeader>
          <CardTitle>Payroll Schedules</CardTitle>
          <CardDescription>Select a schedule to preview entries and manage the payroll workflow</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="active">
                Active
                {(draftCount + activeCount) > 0 && (
                  <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 text-xs">
                    {draftCount + activeCount}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="completed">Completed</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-0">
              <DataTable
                columns={periodColumns}
                data={filteredPeriods}
                searchKey="name"
                searchPlaceholder="Search schedules..."
                isLoading={isLoading}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// WORKFLOW STEP COMPONENT
// ============================================================================

function WorkflowStep({
  label,
  icon,
  done,
  active,
}: {
  label: string;
  icon: React.ReactNode;
  done: boolean;
  active?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
        done
          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
          : active
            ? 'bg-primary/10 text-primary ring-1 ring-primary/20'
            : 'bg-muted text-muted-foreground'
      }`}
    >
      {done ? <CheckCircle className="h-3.5 w-3.5" /> : icon}
      {label}
    </div>
  );
}

function WorkflowArrow() {
  return <Separator className="w-4" />;
}
