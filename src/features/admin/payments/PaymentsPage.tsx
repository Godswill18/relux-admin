// ============================================================================
// PAYMENTS PAGE - Payment Management Interface
// ============================================================================

import { useEffect, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { usePaymentStore } from '@/stores/usePaymentStore';
import { TransactionsTab } from './TransactionsTab';
import { PaymentSettingsTab } from './PaymentSettingsTab';
import { DollarSign, CreditCard, Wallet } from 'lucide-react';
import { useOrderStore } from '@/stores/useOrderStore';
// ============================================================================
// PAYMENTS PAGE COMPONENT
// ============================================================================

export default function PaymentsPage() {
  const { fetchPayments, fetchSettings } = usePaymentStore();
  const { orders } = useOrderStore();
  const [activeTab, setActiveTab] = useState('transactions');

  // Fetch data on mount
  useEffect(() => {
    fetchPayments();
    fetchSettings();
  }, [fetchPayments, fetchSettings]);

  // Calculate stats from orders (backend returns lowercase status strings)
  const orderList: any[] = Array.isArray(orders) ? orders : [];

  const totalRevenue = orderList
    .filter((o) => (o.payment?.status || o.paymentStatus || '').toLowerCase() === 'paid')
    .reduce((sum, o) => sum + (o.pricing?.total || o.total || 0), 0);

  const pendingPayments = orderList
    .filter((o) => {
      const ps = (o.payment?.status || o.paymentStatus || '').toLowerCase();
      return ps === 'pending' || ps === 'unpaid';
    })
    .reduce((sum, o) => sum + (o.pricing?.total || o.total || 0), 0);

  const confirmedPayments = orderList
    .filter((o) => (o.payment?.status || o.paymentStatus || '').toLowerCase() === 'confirmed')
    .reduce((sum, o) => sum + (o.pricing?.total || o.total || 0), 0);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold">Payment Management</h1>
        <p className="text-muted-foreground">Manage payments, transactions, and payment methods</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₦{totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">From paid orders</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Payments</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₦{pendingPayments.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Awaiting payment</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Confirmed Payments</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₦{confirmedPayments.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Processing confirmation</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="transactions">
          <Card>
            <CardHeader>
              <CardTitle>Payment Transactions</CardTitle>
              <CardDescription>View and manage all payment transactions</CardDescription>
            </CardHeader>
            <CardContent>
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
