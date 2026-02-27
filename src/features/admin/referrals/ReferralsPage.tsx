// ============================================================================
// REFERRALS PAGE - Referral Program Management
// ============================================================================

import { useEffect, useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable, DataTableColumnHeader } from '@/components/shared/DataTable';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Users, Gift, TrendingUp, MoreHorizontal, CheckCircle, XCircle, Clock } from 'lucide-react';
import { useReferralStore, Referral } from '@/stores/useReferralStore';
import { ReferralSettingsTab } from './ReferralSettingsTab';
import { toast } from 'sonner';
import { format } from 'date-fns';

// ============================================================================
// STATUS BADGE
// ============================================================================

function ReferralStatusBadge({ status }: { status: string }) {
  const variants: Record<string, { variant: any; label: string }> = {
    pending: { variant: 'secondary', label: 'Pending' },
    qualified: { variant: 'default', label: 'Qualified' },
    rewarded: { variant: 'default', label: 'Rewarded' },
    reversed: { variant: 'outline', label: 'Reversed' },
    rejected: { variant: 'destructive', label: 'Rejected' },
  };

  const key = status?.toLowerCase?.() || '';
  const config = variants[key] || { variant: 'outline', label: status || 'Unknown' };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

// ============================================================================
// REFERRALS PAGE COMPONENT
// ============================================================================

export default function ReferralsPage() {
  const {
    referrals,
    isLoading,
    fetchReferrals,
    fetchSettings,
    updateReferralStatus,
  } = useReferralStore();
  const [activeTab, setActiveTab] = useState('referrals');
  const [statusFilter, setStatusFilter] = useState('all');

  // Fetch data on mount
  useEffect(() => {
    fetchReferrals();
    fetchSettings();
  }, [fetchReferrals, fetchSettings]);

  // Re-fetch when filter changes
  useEffect(() => {
    fetchReferrals({ status: statusFilter });
  }, [statusFilter, fetchReferrals]);

  // Handle status update
  const handleStatusChange = async (referral: Referral, newStatus: string) => {
    try {
      await updateReferralStatus(referral._id, newStatus);
      toast.success(`Referral status updated to ${newStatus}`);
    } catch {
      toast.error('Failed to update referral status');
    }
  };

  // Calculate stats
  const referralList = Array.isArray(referrals) ? referrals : [];
  const totalReferrals = referralList.length;
  const rewardedCount = referralList.filter((r) => r.status === 'rewarded').length;
  const totalRewardsPaid = referralList
    .filter((r) => r.rewardCredited)
    .reduce((sum, r) => sum + (r.rewardAmount || 0), 0);
  const pendingCount = referralList.filter((r) => r.status === 'pending' || r.status === 'qualified').length;
  const conversionRate = totalReferrals > 0
    ? Math.round((rewardedCount / totalReferrals) * 100)
    : 0;

  // Define columns
  const columns: ColumnDef<any>[] = [
    {
      id: 'referrer',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Referrer" />,
      cell: ({ row }) => {
        const referrer = row.original.referrerUserId;
        return (
          <div>
            <div className="font-medium">{referrer?.name || '—'}</div>
            <div className="text-xs text-muted-foreground">{referrer?.email || ''}</div>
          </div>
        );
      },
    },
    {
      id: 'referee',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Referred Customer" />,
      cell: ({ row }) => {
        const referee = row.original.refereeUserId;
        return (
          <div>
            <div className="font-medium">{referee?.name || '—'}</div>
            <div className="text-xs text-muted-foreground">{referee?.email || ''}</div>
          </div>
        );
      },
    },
    {
      accessorKey: 'status',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
      cell: ({ row }) => <ReferralStatusBadge status={row.original.status} />,
    },
    {
      id: 'reward',
      header: 'Reward',
      cell: ({ row }) => {
        const r = row.original;
        if (r.rewardCredited) {
          return <div className="font-medium text-green-600">₦{(r.rewardAmount || 0).toLocaleString()}</div>;
        }
        return <span className="text-sm text-muted-foreground">Not yet</span>;
      },
    },
    {
      accessorKey: 'createdAt',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Date" />,
      cell: ({ row }) => {
        const date = row.original.createdAt;
        return (
          <div className="text-sm text-muted-foreground">
            {date ? format(new Date(date), 'MMM dd, yyyy') : '—'}
          </div>
        );
      },
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const referral = row.original;
        const status = referral.status;

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
              {status === 'pending' && (
                <DropdownMenuItem onClick={() => handleStatusChange(referral, 'qualified')}>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Mark Qualified
                </DropdownMenuItem>
              )}
              {(status === 'pending' || status === 'qualified') && (
                <DropdownMenuItem onClick={() => handleStatusChange(referral, 'rewarded')}>
                  <Gift className="mr-2 h-4 w-4" />
                  Mark Rewarded
                </DropdownMenuItem>
              )}
              {status === 'rewarded' && (
                <DropdownMenuItem onClick={() => handleStatusChange(referral, 'reversed')}>
                  <Clock className="mr-2 h-4 w-4" />
                  Reverse Reward
                </DropdownMenuItem>
              )}
              {status !== 'rejected' && status !== 'rewarded' && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => handleStatusChange(referral, 'rejected')}
                    className="text-destructive"
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    Reject
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
        <h1 className="text-3xl font-bold">Referral Program</h1>
        <p className="text-muted-foreground">Manage customer referrals and rewards</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Referrals</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalReferrals}</div>
            <p className="text-xs text-muted-foreground">All time referrals</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rewards Paid</CardTitle>
            <Gift className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₦{totalRewardsPaid.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">{rewardedCount} rewarded</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingCount}</div>
            <p className="text-xs text-muted-foreground">Awaiting qualification</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{conversionRate}%</div>
            <p className="text-xs text-muted-foreground">Referral to reward rate</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="referrals">Referrals</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="referrals">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>All Referrals</CardTitle>
                  <CardDescription>Track customer referrals and manage their status</CardDescription>
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40">
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
            </CardHeader>
            <CardContent>
              <DataTable
                columns={columns}
                data={referralList}
                searchKey="status"
                searchPlaceholder="Search referrals..."
                isLoading={isLoading}
              />
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
