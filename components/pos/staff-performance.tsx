"use client";

import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useStaff } from "@/hooks/use-staff";
import { formatPrice } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import type { StaffRole } from "@/lib/types";

const ROLE_COLORS: Record<StaffRole, string> = {
  waiter: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  chef: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  barman:
    "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  manager: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
};

const ROLE_LABELS: Record<StaffRole, string> = {
  waiter: "Σερβιτόρος",
  chef: "Μάγειρας",
  barman: "Μπάρμαν",
  manager: "Manager",
};

const ROLE_CHART_COLORS: Record<StaffRole, string> = {
  waiter: "#3b82f6",
  chef: "#f97316",
  barman: "#a855f7",
  manager: "#22c55e",
};

const MEDALS = ["🥇", "🥈", "🥉"];

export function StaffPerformance() {
  const { staff, getPerformance } = useStaff();
  const performance = getPerformance();

  const enrichedPerformance = useMemo(() => {
    const withStaff = performance
      .map((perf) => {
        const member = staff.find((s) => s.id === perf.staffId);
        if (!member) return null;
        return { ...perf, member };
      })
      .filter(Boolean) as ((typeof performance)[number] & {
      member: (typeof staff)[number];
    })[];

    // Sort by revenue descending
    return [...withStaff].sort((a, b) => b.revenue - a.revenue);
  }, [performance, staff]);

  const chartData = useMemo(() => {
    return enrichedPerformance.map((item) => ({
      name: item.member.name,
      revenue: item.revenue,
      role: item.member.role,
    }));
  }, [enrichedPerformance]);

  return (
    <div className="space-y-6">
      {/* Performance Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {enrichedPerformance.map((item, index) => {
          const isWaiter = item.member.role === "waiter";
          const medal = index < 3 ? MEDALS[index] : null;

          return (
            <Card key={item.staffId} className="relative">
              {medal && (
                <span className="absolute top-2 right-3 text-xl">{medal}</span>
              )}
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  {item.member.name}
                  <Badge
                    className={cn(
                      "border-transparent text-xs",
                      ROLE_COLORS[item.member.role],
                    )}
                  >
                    {ROLE_LABELS[item.member.role]}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-y-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Τραπέζια:</span>
                  </div>
                  <div className="text-right font-medium">
                    {isWaiter ? item.tablesServed : "—"}
                  </div>

                  <div>
                    <span className="text-muted-foreground">Τζίρος:</span>
                  </div>
                  <div className="text-right font-medium">
                    {formatPrice(item.revenue)}
                  </div>

                  <div>
                    <span className="text-muted-foreground">Μέσος Χρόνος:</span>
                  </div>
                  <div className="text-right font-medium">
                    {item.avgServiceTime > 0
                      ? `${item.avgServiceTime} λεπτά`
                      : "—"}
                  </div>

                  <div>
                    <span className="text-muted-foreground">Tips:</span>
                  </div>
                  <div className="text-right font-medium">
                    {formatPrice(item.tips)}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Revenue Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Τζίρος ανά Μέλος</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 12 }}
                  interval={0}
                  angle={-20}
                  textAnchor="end"
                  height={60}
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  tickFormatter={(val: number) => `€${val}`}
                />
                <Tooltip
                  formatter={(value: number) => [formatPrice(value), "Τζίρος"]}
                />
                <Bar dataKey="revenue" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={index} fill={ROLE_CHART_COLORS[entry.role]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
