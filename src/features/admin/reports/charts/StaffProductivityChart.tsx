// ============================================================================
// STAFF PRODUCTIVITY CHART - Horizontal bar chart for orders per staff
// ============================================================================

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useAnalyticsStore } from '@/stores/useAnalyticsStore';

export function StaffProductivityChart() {
  const { staffProductivity } = useAnalyticsStore();

  const data = (Array.isArray(staffProductivity) ? staffProductivity : []).map((s) => ({
    name: s.name || 'Unknown',
    orders: s.orderCount || 0,
    completed: s.completedOrders || 0,
    rate: Math.round(s.completionRate || 0),
  }));

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        No staff productivity data available
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={Math.max(300, data.length * 40)}>
      <BarChart data={data} layout="vertical" margin={{ left: 80 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis type="number" className="text-xs" />
        <YAxis type="category" dataKey="name" className="text-xs" width={75} />
        <Tooltip
          formatter={(value: number, name: string) => {
            if (name === 'orders') return [value, 'Total Orders'];
            if (name === 'completed') return [value, 'Completed'];
            return [value, name];
          }}
        />
        <Legend />
        <Bar dataKey="orders" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
        <Bar dataKey="completed" fill="#10b981" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
