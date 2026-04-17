"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";
import { Euro, Receipt, TrendingUp, HandCoins } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type {
  AnalyticsSummary,
  DailyRevenuePoint,
  HourlyBucket,
  TopProduct,
} from "@/lib/queries/analytics";

function formatPrice(n: number): string {
  return new Intl.NumberFormat("el-GR", {
    style: "currency",
    currency: "EUR",
  }).format(n);
}

export function DashboardTab({
  summary,
  daily,
  hourly,
  topProducts,
}: {
  summary: AnalyticsSummary;
  daily: DailyRevenuePoint[];
  hourly: HourlyBucket[];
  topProducts: TopProduct[];
}) {
  const delta =
    summary.revenue_yesterday > 0
      ? ((summary.revenue_today - summary.revenue_yesterday) /
          summary.revenue_yesterday) *
        100
      : summary.revenue_today > 0
        ? 100
        : 0;
  const deltaLabel =
    summary.revenue_yesterday === 0 && summary.revenue_today === 0
      ? "—"
      : `${delta > 0 ? "+" : ""}${delta.toFixed(0)}% vs χθες`;
  const deltaTone =
    delta > 0
      ? "text-emerald-600 dark:text-emerald-400"
      : delta < 0
        ? "text-red-600 dark:text-red-400"
        : "text-muted-foreground";

  const last7 = daily.slice(-7);
  const paymentPie = [
    { name: "Μετρητά", value: summary.cash_revenue_today, color: "#22c55e" },
    { name: "Κάρτα", value: summary.card_revenue_today, color: "#3b82f6" },
  ].filter((p) => p.value > 0);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Σημερινός Τζίρος
              </p>
              <Euro className="size-4 text-primary" />
            </div>
            <p className="mt-2 text-2xl font-bold">
              {formatPrice(summary.revenue_today)}
            </p>
            <p className={cn("mt-1 text-xs font-medium", deltaTone)}>
              {deltaLabel}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Παραγγελίες
              </p>
              <Receipt className="size-4 text-primary" />
            </div>
            <p className="mt-2 text-2xl font-bold">{summary.orders_today}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Μ.Ο. {formatPrice(summary.avg_ticket_today)} / παραγγελία
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Μέσος Λογαριασμός
              </p>
              <TrendingUp className="size-4 text-primary" />
            </div>
            <p className="mt-2 text-2xl font-bold">
              {formatPrice(summary.avg_ticket_today)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Μέσος λογαριασμός σήμερα
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Φιλοδωρήματα μήνα
              </p>
              <HandCoins className="size-4 text-primary" />
            </div>
            <p className="mt-2 text-2xl font-bold">
              {formatPrice(summary.tips_month)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {summary.orders_month} παραγγελίες
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Τζίρος 7 Ημερών</CardTitle>
            <p className="text-xs text-muted-foreground">Έσοδα ανά ημέρα</p>
          </CardHeader>
          <CardContent>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={last7}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(d: string) =>
                      new Date(d).toLocaleDateString("el-GR", {
                        weekday: "short",
                      })
                    }
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(v: number) => formatPrice(v)}
                    labelFormatter={(l: string) =>
                      new Date(l).toLocaleDateString("el-GR")
                    }
                  />
                  <Bar
                    dataKey="revenue"
                    fill="hsl(var(--primary))"
                    radius={4}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Πωλήσεις ανά Ώρα</CardTitle>
            <p className="text-xs text-muted-foreground">
              Έσοδα ανά ώρα λειτουργίας
            </p>
          </CardHeader>
          <CardContent>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={hourly.filter((h) => h.hour >= 11 && h.hour <= 23)}
                >
                  <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                  <XAxis
                    dataKey="hour"
                    tickFormatter={(h: number) => `${h}:00`}
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(v: number) => formatPrice(v)}
                    labelFormatter={(l) => `Ώρα: ${l}:00`}
                  />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Top 5 Πιάτα</CardTitle>
            <p className="text-xs text-muted-foreground">Βάσει εσόδων</p>
          </CardHeader>
          <CardContent>
            {topProducts.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Δεν υπάρχουν δεδομένα.
              </p>
            ) : (
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={topProducts.slice(0, 5)}
                    layout="vertical"
                    margin={{ left: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis
                      dataKey="name"
                      type="category"
                      tick={{ fontSize: 11 }}
                      width={140}
                    />
                    <Tooltip formatter={(v: number) => formatPrice(v)} />
                    <Bar
                      dataKey="revenue"
                      fill="hsl(var(--primary))"
                      radius={4}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Μετρητά vs Κάρτα</CardTitle>
            <p className="text-xs text-muted-foreground">
              Κατανομή πληρωμών σήμερα
            </p>
          </CardHeader>
          <CardContent>
            {paymentPie.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Δεν έχουν ολοκληρωθεί πληρωμές σήμερα.
              </p>
            ) : (
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={paymentPie}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({
                        name,
                        value,
                      }: {
                        name: string;
                        value: number;
                      }) => `${name}: ${formatPrice(value)}`}
                    >
                      {paymentPie.map((p) => (
                        <Cell key={p.name} fill={p.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => formatPrice(v)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
