// ============================================================================
// REPORTS PAGE - Reports & Analytics
// ============================================================================

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DollarSign, ShoppingCart, Users, TrendingUp } from 'lucide-react';
import { useAnalyticsStore } from '@/stores/useAnalyticsStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { RevenueChart } from './charts/RevenueChart';
import { OrdersByStatusChart, OrdersByServiceChart } from './charts/OrdersChart';
import { PayrollChart } from './charts/PayrollChart';
import { StaffProductivityChart } from './charts/StaffProductivityChart';

// ============================================================================
// REPORTS PAGE COMPONENT
// ============================================================================

export default function ReportsPage() {
  const isAdmin = useAuthStore((s) => s.user?.role === 'admin');
  const [activeTab, setActiveTab] = useState(isAdmin ? 'revenue' : 'orders');
  const {
    dashboardStats,
    fetchDashboardStats,
    fetchRevenueReport,
    fetchOrderStats,
    fetchPayrollStats,
    fetchStaffProductivity,
  } = useAnalyticsStore();

  // Fetch dashboard stats on mount
  useEffect(() => {
    fetchDashboardStats();
  }, [fetchDashboardStats]);

  // Fetch data when tab changes
  useEffect(() => {
    switch (activeTab) {
      case 'revenue':
        fetchRevenueReport({ groupBy: 'day' });
        break;
      case 'orders':
        fetchOrderStats();
        break;
      case 'payroll':
        fetchPayrollStats();
        break;
      case 'staff':
        fetchStaffProductivity();
        break;
    }
  }, [activeTab, fetchRevenueReport, fetchOrderStats, fetchPayrollStats, fetchStaffProductivity]);

  const stats = dashboardStats;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold">Reports & Analytics</h1>
        <p className="text-muted-foreground">View business insights and performance data</p>
      </div>

      {/* Quick Stats */}
      <div className={`grid gap-4 ${isAdmin ? 'md:grid-cols-4' : 'md:grid-cols-2'}`}>
        {isAdmin && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                N{(stats?.monthly?.revenue || 0).toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">This month</p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(stats?.monthly?.orders || 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(stats?.totalCustomers || 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Total registered</p>
          </CardContent>
        </Card>

        {isAdmin && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Today's Revenue</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                N{(stats?.today?.revenue || 0).toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                {stats?.today?.orders || 0} orders today
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Report Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          {isAdmin && <TabsTrigger value="revenue">Revenue</TabsTrigger>}
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="payroll">Payroll</TabsTrigger>
          <TabsTrigger value="staff">Staff Performance</TabsTrigger>
        </TabsList>

        {isAdmin && (
          <TabsContent value="revenue">
            <Card>
              <CardHeader>
                <CardTitle>Revenue Over Time</CardTitle>
                <CardDescription>Daily revenue trends with average order value</CardDescription>
              </CardHeader>
              <CardContent>
                <RevenueChart />
              </CardContent>
            </Card>
          </TabsContent>
        )}

        <TabsContent value="orders">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Orders by Status</CardTitle>
                <CardDescription>Distribution of order statuses</CardDescription>
              </CardHeader>
              <CardContent>
                <OrdersByStatusChart />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Orders by Service</CardTitle>
                <CardDescription>Breakdown by service type</CardDescription>
              </CardHeader>
              <CardContent>
                <OrdersByServiceChart />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="payroll">
          <Card>
            <CardHeader>
              <CardTitle>Payroll Trends</CardTitle>
              <CardDescription>Monthly payroll spending over the last 6 months</CardDescription>
            </CardHeader>
            <CardContent>
              <PayrollChart />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="staff">
          <Card>
            <CardHeader>
              <CardTitle>Staff Performance</CardTitle>
              <CardDescription>
                Orders assigned, completion rates, status updates, walk-ins, shifts & attendance per staff member
              </CardDescription>
            </CardHeader>
            <CardContent>
              <StaffProductivityChart />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
