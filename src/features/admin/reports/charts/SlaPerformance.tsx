import { useEffect, useState } from 'react';
import apiClient from '@/lib/api/client';

interface Row {
  serviceLevel: string; completed: number; onTime: number; late: number;
  compliancePct: number | null; avgProcessingHours: number; avgTargetHours: number; avgLateHours: number;
}
interface Data {
  overdueNow: number;
  totals: { completed: number; onTime: number; late: number; compliancePct: number | null };
  levels: Row[];
}

/** On-time vs late processing per service level, against the time each order was promised at confirmation (last 30 days). */
export function SlaPerformance() {
  const [data, setData] = useState<Data | null>(null);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    apiClient.get('/services/levels/sla/performance')
      .then((r) => setData(r.data.data))
      .catch((e) => { if (e?.response?.status === 403) setDenied(true); });
  }, []);

  if (denied || !data) return null;
  const { totals } = data;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ['On-time rate', totals.compliancePct == null ? '—' : `${totals.compliancePct}%`],
          ['Finished on time', String(totals.onTime)],
          ['Finished late', String(totals.late)],
          ['Overdue right now', String(data.overdueNow)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-xl font-bold">{value}</p>
          </div>
        ))}
      </div>
      {data.levels.length === 0 ? (
        <p className="text-sm text-muted-foreground">No finished, timed orders in this period yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="py-2 pr-3 font-medium">Service level</th>
                <th className="py-2 pr-3 font-medium">Finished</th>
                <th className="py-2 pr-3 font-medium">On time</th>
                <th className="py-2 pr-3 font-medium">Avg. processing</th>
                <th className="py-2 pr-3 font-medium">Target</th>
                <th className="py-2 font-medium">Avg. lateness</th>
              </tr>
            </thead>
            <tbody>
              {data.levels.map((r) => (
                <tr key={r.serviceLevel} className="border-b last:border-0">
                  <td className="py-2 pr-3 font-medium">{r.serviceLevel}</td>
                  <td className="py-2 pr-3">{r.completed}</td>
                  <td className="py-2 pr-3">{r.compliancePct}%</td>
                  <td className="py-2 pr-3">{r.avgProcessingHours}h</td>
                  <td className="py-2 pr-3">{r.avgTargetHours}h</td>
                  <td className="py-2">{r.late ? `${r.avgLateHours}h` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
