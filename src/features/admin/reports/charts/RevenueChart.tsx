// ============================================================================
// REVENUE CHART - Line chart for revenue over time
// ============================================================================

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useAnalyticsStore } from '@/stores/useAnalyticsStore';

export function RevenueChart() {
  const { revenueReport } = useAnalyticsStore();

  const data = (Array.isArray(revenueReport) ? revenueReport : []).map((d) => ({
    date: d._id,
    revenue: d.totalRevenue || 0,
    orders: d.orderCount || 0,
    avgOrder: Math.round(d.avgOrderValue || 0),
  }));

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        No revenue data available
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={350}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis dataKey="date" className="text-xs" />
        <YAxis className="text-xs" tickFormatter={(v) => `N${(v / 1000).toFixed(0)}k`} />
        <Tooltip
          formatter={(value: number, name: string) => {
            if (name === 'revenue') return [`N${value.toLocaleString()}`, 'Revenue'];
            if (name === 'avgOrder') return [`N${value.toLocaleString()}`, 'Avg Order'];
            return [value, name];
          }}
        />
        <Legend />
        <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="avgOrder" stroke="hsl(var(--muted-foreground))" strokeWidth={1} strokeDasharray="5 5" dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
