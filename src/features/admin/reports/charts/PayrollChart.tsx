// ============================================================================
// PAYROLL CHART - Area chart for monthly payroll trend
// ============================================================================

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useAnalyticsStore } from '@/stores/useAnalyticsStore';

export function PayrollChart() {
  const { payrollStats } = useAnalyticsStore();

  const data = (payrollStats?.monthlyPayroll || []).map((d) => ({
    month: d.month,
    total: d.totalPay || 0,
    staff: d.staffCount || 0,
  }));

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        No payroll data available
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={350}>
      <AreaChart data={data}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis dataKey="month" className="text-xs" />
        <YAxis className="text-xs" tickFormatter={(v) => `N${(v / 1000).toFixed(0)}k`} />
        <Tooltip
          formatter={(value: number, name: string) => {
            if (name === 'total') return [`N${value.toLocaleString()}`, 'Total Payroll'];
            if (name === 'staff') return [value, 'Staff Count'];
            return [value, name];
          }}
        />
        <Area
          type="monotone"
          dataKey="total"
          stroke="hsl(var(--primary))"
          fill="hsl(var(--primary))"
          fillOpacity={0.1}
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
