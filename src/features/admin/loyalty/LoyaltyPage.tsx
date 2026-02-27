// ============================================================================
// LOYALTY PAGE - Loyalty Program Management
// ============================================================================

import { useEffect, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useLoyaltyStore } from '@/stores/useLoyaltyStore';
import { useCustomerStore } from '@/stores/useCustomerStore';
import { TiersTab } from './TiersTab';
import { LoyaltySettingsTab } from './LoyaltySettingsTab';
import { LoyaltyLedgerTab } from './LoyaltyLedgerTab';
import { Award, Users, TrendingUp } from 'lucide-react';

// ============================================================================
// LOYALTY PAGE COMPONENT
// ============================================================================

export default function LoyaltyPage() {
  const { fetchTiers, fetchSettings, fetchTransactions } = useLoyaltyStore();
  const { customers, fetchCustomers } = useCustomerStore();
  const [activeTab, setActiveTab] = useState('tiers');

  // Fetch data on mount
  useEffect(() => {
    fetchTiers();
    fetchSettings();
    fetchTransactions();
    fetchCustomers();
  }, [fetchTiers, fetchSettings, fetchTransactions, fetchCustomers]);

  // Calculate stats
  const getPoints = (c: any) => c.loyaltyPointsBalance ?? c.loyaltyPoints ?? 0;
  const totalPoints = Array.isArray(customers) ? customers.reduce((sum, c) => sum + getPoints(c), 0) : 0;
  const activeMembers = Array.isArray(customers) ? customers.filter((c) => getPoints(c) > 0).length : 0;
  const avgPointsPerCustomer = Array.isArray(customers) && customers.length > 0 ? Math.round(totalPoints / customers.length) : 0;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold">Loyalty Program</h1>
        <p className="text-muted-foreground">Manage customer loyalty tiers, points, and rewards</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Points Issued</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPoints.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Across all customers</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeMembers}</div>
            <p className="text-xs text-muted-foreground">With loyalty points</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Points/Customer</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgPointsPerCustomer}</div>
            <p className="text-xs text-muted-foreground">Average balance</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="tiers">Tiers</TabsTrigger>
          <TabsTrigger value="ledger">Points Ledger</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="tiers">
          <Card>
            <CardHeader>
              <CardTitle>Loyalty Tiers</CardTitle>
              <CardDescription>Manage loyalty tier levels and benefits</CardDescription>
            </CardHeader>
            <CardContent>
              <TiersTab />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ledger">
          <Card>
            <CardHeader>
              <CardTitle>Points Ledger</CardTitle>
              <CardDescription>View all loyalty points transactions</CardDescription>
            </CardHeader>
            <CardContent>
              <LoyaltyLedgerTab />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Loyalty Settings</CardTitle>
              <CardDescription>Configure loyalty program rules and bonuses</CardDescription>
            </CardHeader>
            <CardContent>
              <LoyaltySettingsTab />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
