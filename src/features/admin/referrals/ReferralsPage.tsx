// ============================================================================
// REFERRALS PAGE - Referral Program Management
// ============================================================================

import { useEffect, useState, useMemo } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable, DataTableColumnHeader } from '@/components/shared/DataTable';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Users, Gift, TrendingUp, MoreHorizontal, CheckCircle, XCircle, Clock, Search } from 'lucide-react';
import { useReferralStore, Referral } from '@/stores/useReferralStore';
import { ReferralSettingsTab } from './ReferralSettingsTab';
import { toast } from 'sonner';
import { format } from 'date-fns';

function ReferralStatusBadge({ status }: { status: string }) {
  const variants: Record<string, { variant: any; label: string }> = {
    pending:   { variant: 'secondary',    label: 'Pending' },
    qualified: { variant: 'default',      label: 'Qualified' },
    rewarded:  { variant: 'default',      label: 'Rewarded' },
    reversed:  { variant: 'outline',      label: 'Reversed' },
    rejected:  { variant: 'destructive',  label: 'Rejected' },
  };
  const key = status?.toLowerCase?.() || '';
  const config = variants[key] || { variant: 'outline', label: status || 'Unknown' };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

export default function ReferralsPage() {
  const { referrals, isLoading, fetchReferrals, fetchSettings, updateReferralStatus } = useReferralStore();
  const [activeTab, setActiveTab]     = useState('referrals');
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch]           = useState('');

  useEffect(() => { fetchReferrals(); fetchSettings(); }, [fetchReferrals, fetchSettings]);
  useEffect(() => { fetchReferrals({ status: statusFilter }); }, [statusFilter, fetchReferrals]);

  const handleStatusChange = async (referral: Referral, newStatus: string) => {
    try {
      await updateReferralStatus(referral._id, newStatus);
      toast.success(`Referral status updated to ${newStatus}`);
    } catch { toast.error('Failed to update referral status'); }
  };

  const referralList = Array.isArray(referrals) ? referrals : [];
  const totalReferrals  = referralList.length;
  const rewardedCount   = referralList.filter((r) => r.status === 'rewarded').length;
  const totalRewardsPaid = referralList.filter((r) => r.rewardCredited).reduce((s, r) => s + (r.rewardAmount || 0), 0);
  const pendingCount    = referralList.filter((r) => r.status === 'pending' || r.status === 'qualified').length;
  const conversionRate  = totalReferrals > 0 ? Math.round((rewardedCount / totalReferrals) * 100) : 0;

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return referralList;
    return referralList.filter((r) =>
      (r.referrerUserId?.name || '').toLowerCase().includes(q) ||
      (r.refereeUserId?.name  || '').toLowerCase().includes(q)
    );
  }, [referralList, search]);

  const ActionsMenu = ({ referral }: { referral: any }) => {
    const status = referral.status;
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          {status === 'pending' && (
            <DropdownMenuItem onClick={() => handleStatusChange(referral, 'qualified')}>
              <CheckCircle className="mr-2 h-4 w-4" />Mark Qualified
            </DropdownMenuItem>
          )}
          {(status === 'pending' || status === 'qualified') && (
            <DropdownMenuItem onClick={() => handleStatusChange(referral, 'rewarded')}>
              <Gift className="mr-2 h-4 w-4" />Mark Rewarded
            </DropdownMenuItem>
          )}
          {status === 'rewarded' && (
            <DropdownMenuItem onClick={() => handleStatusChange(referral, 'reversed')}>
              <Clock className="mr-2 h-4 w-4" />Reverse Reward
            </DropdownMenuItem>
          )}
          {status !== 'rejected' && status !== 'rewarded' && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleStatusChange(referral, 'rejected')} className="text-destructive">
                <XCircle className="mr-2 h-4 w-4" />Reject
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  const columns: ColumnDef<any>[] = [
    {
      id: 'referrer',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Referrer" />,
      cell: ({ row }) => {
        const r = row.original.referrerUserId;
        return <div><div className="font-medium">{r?.name || '—'}</div><div className="text-xs text-muted-foreground">{r?.email || ''}</div></div>;
      },
    },
    {
      id: 'referee',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Referred Customer" />,
      cell: ({ row }) => {
        const r = row.original.refereeUserId;
        return <div><div className="font-medium">{r?.name || '—'}</div><div className="text-xs text-muted-foreground">{r?.email || ''}</div></div>;
      },
    },
    { accessorKey: 'status', header: 'Status', cell: ({ row }) => <ReferralStatusBadge status={row.original.status} /> },
    {
      id: 'reward', header: 'Reward',
      cell: ({ row }) => row.original.rewardCredited
        ? <div className="font-medium text-green-600">₦{(row.original.rewardAmount || 0).toLocaleString()}</div>
        : <span className="text-sm text-muted-foreground">Not yet</span>,
    },
    {
      accessorKey: 'createdAt', header: 'Date',
      cell: ({ row }) => <div className="text-sm text-muted-foreground">{row.original.createdAt ? format(new Date(row.original.createdAt), 'MMM dd, yyyy') : '—'}</div>,
    },
    { id: 'actions', cell: ({ row }) => <ActionsMenu referral={row.original} /> },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Referral Program</h1>
        <p className="text-muted-foreground">Manage customer referrals and rewards</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Referrals</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground shrink-0" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{totalReferrals}</div><p className="text-xs text-muted-foreground">All time</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rewards Paid</CardTitle>
            <Gift className="h-4 w-4 text-muted-foreground shrink-0" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">₦{totalRewardsPaid.toLocaleString()}</div><p className="text-xs text-muted-foreground">{rewardedCount} rewarded</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{pendingCount}</div><p className="text-xs text-muted-foreground">Awaiting qualification</p></CardContent>
        </Card>
        <Card className="col-span-2 md:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground shrink-0" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{conversionRate}%</div><p className="text-xs text-muted-foreground">Referral to reward</p></CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="referrals" className="flex-1 sm:flex-none">Referrals</TabsTrigger>
          <TabsTrigger value="settings" className="flex-1 sm:flex-none">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="referrals">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <CardTitle>All Referrals</CardTitle>
                  <CardDescription>Track customer referrals and manage their status</CardDescription>
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-40">
                    <SelectValue placeholder="Filter status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="qualified">Qualified</SelectItem>
                    <SelectItem value="rewarded">Rewarded</SelectItem>
                    <SelectItem value="reversed">Reversed</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="relative mt-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search by name…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
              </div>
            </CardHeader>
            <CardContent className="px-3 sm:px-6">
              {/* Mobile cards */}
              <div className="md:hidden space-y-3">
                {isLoading ? (
                  Array.from({ length: 3 }).map((_, i) => <Card key={i} className="animate-pulse"><CardContent className="p-4 h-20" /></Card>)
                ) : filtered.length === 0 ? (
                  <Card><CardContent className="flex flex-col items-center gap-2 py-10">
                    <Users className="h-8 w-8 opacity-30 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">No referrals found</p>
                  </CardContent></Card>
                ) : filtered.map((r) => (
                  <Card key={r._id || r.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1 space-y-1.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <ReferralStatusBadge status={r.status} />
                            {r.rewardCredited && <span className="text-xs font-medium text-green-600">₦{(r.rewardAmount || 0).toLocaleString()}</span>}
                          </div>
                          <div className="text-sm">
                            <span className="text-muted-foreground">By: </span>
                            <span className="font-medium">{r.referrerUserId?.name || '—'}</span>
                          </div>
                          <div className="text-sm">
                            <span className="text-muted-foreground">Referred: </span>
                            <span className="font-medium">{r.refereeUserId?.name || '—'}</span>
                          </div>
                          {r.createdAt && <p className="text-xs text-muted-foreground">{format(new Date(r.createdAt), 'MMM dd, yyyy')}</p>}
                        </div>
                        <ActionsMenu referral={r} />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              {/* Desktop table */}
              <div className="hidden md:block">
                <DataTable columns={columns} data={filtered} searchKey={undefined} isLoading={isLoading} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <ReferralSettingsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
