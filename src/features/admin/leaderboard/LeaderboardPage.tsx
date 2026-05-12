import { useEffect, useState } from 'react';
import { Trophy, Loader2, Medal } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { DataTable, DataTableColumnHeader } from '@/components/shared/DataTable';
import type { ColumnDef } from '@tanstack/react-table';
import apiClient from '@/lib/api/client';

interface LeaderboardEntry {
  rank: number;
  name: string;
  totalPoints: number;
  customerId: string;
}

function RankCell({ rank }: { rank: number }) {
  if (rank === 1)
    return (
      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full border bg-yellow-100 text-yellow-700 border-yellow-300 font-bold text-sm">
        <Medal className="w-4 h-4" />
      </span>
    );
  if (rank === 2)
    return (
      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full border bg-gray-100 text-gray-600 border-gray-300 font-semibold text-sm">
        <Medal className="w-4 h-4" />
      </span>
    );
  if (rank === 3)
    return (
      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full border bg-orange-100 text-orange-600 border-orange-300 font-semibold text-sm">
        <Medal className="w-4 h-4" />
      </span>
    );
  return (
    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full border bg-muted text-muted-foreground text-sm font-medium">
      {rank}
    </span>
  );
}

const columns: ColumnDef<LeaderboardEntry>[] = [
  {
    accessorKey: 'rank',
    header: ({ column }) => <DataTableColumnHeader column={column} title="#" />,
    cell: ({ row }) => <RankCell rank={row.original.rank} />,
    enableSorting: false,
  },
  {
    accessorKey: 'name',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Customer" />,
    cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
  },
  {
    accessorKey: 'totalPoints',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Points Earned" />,
    cell: ({ row }) => (
      <span className="font-semibold text-primary">
        {row.original.totalPoints.toLocaleString()} pts
      </span>
    ),
  },
];

export default function LeaderboardPage() {
  const [weekly, setWeekly] = useState<LeaderboardEntry[]>([]);
  const [monthly, setMonthly] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    apiClient
      .get('/orders/leaderboard')
      .then((res) => {
        setWeekly(res.data?.data?.weekly ?? []);
        setMonthly(res.data?.data?.monthly ?? []);
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div className="flex items-center gap-2">
        <Trophy className="h-5 w-5 text-yellow-500" />
        <div>
          <h1 className="text-xl font-bold">Leaderboard</h1>
          <p className="text-sm text-muted-foreground">Top 50 customers ranked by total spending.</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <Tabs defaultValue="weekly">
          <TabsList>
            <TabsTrigger value="weekly">This Week</TabsTrigger>
            <TabsTrigger value="monthly">This Month</TabsTrigger>
          </TabsList>

          <TabsContent value="weekly" className="mt-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Weekly Rankings</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {weekly.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground text-sm">
                    No data for this week yet.
                  </div>
                ) : (
                  <DataTable
                    columns={columns}
                    data={weekly}
                    searchKey="name"
                    searchPlaceholder="Search customer..."
                    showPagination
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="monthly" className="mt-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Monthly Rankings</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {monthly.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground text-sm">
                    No data for this month yet.
                  </div>
                ) : (
                  <DataTable
                    columns={columns}
                    data={monthly}
                    searchKey="name"
                    searchPlaceholder="Search customer..."
                    showPagination
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
