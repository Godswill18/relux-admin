// ============================================================================
// ORDERS CHART - Bar chart by status + Pie chart by service type
// ============================================================================

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { useAnalyticsStore } from '@/stores/useAnalyticsStore';

const COLORS = ['hsl(var(--primary))', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316'];

export function OrdersByStatusChart() {
  const { orderStats } = useAnalyticsStore();

  const data = (orderStats?.ordersByStatus || []).map((d) => ({
    status: d._id || 'Unknown',
    count: d.count,
  }));

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        No order data available
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis dataKey="status" className="text-xs" />
        <YAxis className="text-xs" />
        <Tooltip />
        <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function OrdersByServiceChart() {
  const { orderStats } = useAnalyticsStore();

  const data = (orderStats?.ordersByService || []).map((d) => ({
    name: d._id || 'Unknown',
    value: d.count,
  }));

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        No service data available
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius={100}
          label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
        >
          {data.map((_, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}

// Garment totals — every figure is a count of garments (sum of quantities),
// not of orders or order lines.
export function GarmentSummary() {
  const { orderStats } = useAnalyticsStore();
  const g = orderStats?.garments;
  if (!g) {
    return <div className="flex items-center justify-center h-24 text-muted-foreground">No garment data available</div>;
  }
  const tiles = [
    { label: 'Total garments', value: g.total },
    { label: 'Processing', value: g.processing },
    { label: 'Ready, awaiting collection', value: g.readyAwaitingCollection },
    { label: 'Collected', value: g.collected },
    { label: 'Outstanding', value: g.outstanding },
    { label: 'Partially collected orders', value: g.partiallyCollectedOrders },
  ];
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-lg border p-3">
            <p className="text-2xl font-bold">{t.value.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">{t.label}</p>
          </div>
        ))}
      </div>
      {(orderStats?.garmentsByService || []).length > 0 && (
        <div className="rounded-lg border divide-y text-sm">
          {(orderStats?.garmentsByService || []).map((s) => (
            <div key={s._id} className="flex items-center justify-between px-3 py-2">
              <span>{s._id}</span>
              <span className="text-muted-foreground">
                {s.garments.toLocaleString()} garments · ₦{Math.round(s.amount).toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
