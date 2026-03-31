// ============================================================================
// PAYMENTS PAGE - Payment Management Interface
// ============================================================================

import { useEffect, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { usePaymentStore } from '@/stores/usePaymentStore';
import { TransactionsTab } from './TransactionsTab';
import { PaymentSettingsTab } from './PaymentSettingsTab';
import { DollarSign, CreditCard, XCircle } from 'lucide-react';
import { usePaymentSocket } from '@/lib/hooks/usePaymentSocket';

// ============================================================================
// PAYMENTS PAGE COMPONENT
// ============================================================================

export default function PaymentsPage() {
  const { payments, fetchPayments, fetchSettings } = usePaymentStore();
  const [activeTab, setActiveTab] = useState('transactions');

  usePaymentSocket();

  useEffect(() => {
    fetchPayments();
    fetchSettings();
  }, [fetchPayments, fetchSettings]);

  const paymentList: any[] = Array.isArray(payments) ? payments : [];

  const totalRevenue = paymentList
    .filter((p) => p.state === 'paid')
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  const pendingCount = paymentList.filter((p) => p.state === 'pending').length;
  const pendingAmount = paymentList
    .filter((p) => p.state === 'pending')
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  const failedCount = paymentList.filter((p) => p.state === 'failed').length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Payment Management</h1>
        <p className="text-muted-foreground">Manage payments, transactions, and payment methods</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">₦{totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">From confirmed payments</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">₦{pendingAmount.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">{pendingCount} awaiting</p>
          </CardContent>
        </Card>

        <Card className="col-span-2 sm:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed Payments</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">{failedCount}</div>
            <p className="text-xs text-muted-foreground">Transactions failed</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="transactions" className="flex-1 sm:flex-none">Transactions</TabsTrigger>
          <TabsTrigger value="settings" className="flex-1 sm:flex-none">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="transactions">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Payment Transactions</CardTitle>
              <CardDescription>View and manage all payment transactions</CardDescription>
            </CardHeader>
            <CardContent className="px-3 sm:px-6">
              <TransactionsTab />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Payment Settings</CardTitle>
              <CardDescription>Configure payment methods and gateway settings</CardDescription>
            </CardHeader>
            <CardContent>
              <PaymentSettingsTab />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
