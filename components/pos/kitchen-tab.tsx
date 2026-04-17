"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Clock,
  AlertTriangle,
  Zap,
  Flame,
  Snowflake,
  Wine,
  IceCream2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type {
  KitchenKpis,
  PrepTimePerProduct,
  StationPerformance,
  HourlyThroughput,
  CancelledOrder,
} from "@/lib/queries/analytics";

interface KitchenTabProps {
  kpis: KitchenKpis;
  prepTimes: PrepTimePerProduct[];
  stations: StationPerformance[];
  throughput: HourlyThroughput[];
  cancellations: CancelledOrder[];
}

const STATION_META: Record<
  StationPerformance["station"],
  {
    label: string;
    icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
    color: string;
  }
> = {
  hot: { label: "Ζεστό", icon: Flame, color: "#f97316" },
  cold: { label: "Κρύο", icon: Snowflake, color: "#38bdf8" },
  bar: { label: "Bar", icon: Wine, color: "#a855f7" },
  dessert: { label: "Γλυκά", icon: IceCream2, color: "#ec4899" },
};

function formatSeconds(sec: number): string {
  if (sec <= 0) return "—";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}΄${s > 0 ? ` ${s}΄΄` : ""}`;
}

function formatMinutes(m: number): string {
  if (m <= 0) return "0΄";
  return `${m.toFixed(1)}΄`;
}

export function KitchenTab({
  kpis,
  prepTimes,
  stations,
  throughput,
  cancellations,
}: KitchenTabProps) {
  const prepChartData = prepTimes.map((p) => ({
    name: p.name,
    minutes: Math.round((p.avg_seconds / 60) * 10) / 10,
  }));
  const throughputData = throughput.filter((h) => h.hour >= 11 && h.hour <= 23);

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Μέσος Χρόνος Παρασκευής
              </p>
              <Clock className="size-4 text-primary" />
            </div>
            <p className="mt-2 text-2xl font-bold">
              {kpis.avg_prep_minutes > 0
                ? `${kpis.avg_prep_minutes} λεπτά`
                : "—"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Τρέχων μήνας</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Ακυρώσεις Σήμερα
              </p>
              <AlertTriangle className="size-4 text-red-500" />
            </div>
            <p className="mt-2 text-2xl font-bold">
              {kpis.cancellations_today}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Ακυρωμένες παραγγελίες
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Throughput / Ώρα
              </p>
              <Zap className="size-4 text-primary" />
            </div>
            <p className="mt-2 text-2xl font-bold">
              {kpis.throughput_per_hour.toFixed(1)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              παραγγ./ώρα σήμερα
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Prep time per product */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            Χρόνος Παρασκευής ανά Πιάτο
          </CardTitle>
          <p className="text-xs text-muted-foreground">Ταξινομημένο φθίνουσα</p>
        </CardHeader>
        <CardContent>
          {prepChartData.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Δεν υπάρχουν επαρκή δεδομένα χρόνου ακόμη.
            </p>
          ) : (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={prepChartData}
                  layout="vertical"
                  margin={{ left: 40 }}
                >
                  <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v: number) => `${v}΄`}
                  />
                  <YAxis
                    dataKey="name"
                    type="category"
                    tick={{ fontSize: 11 }}
                    width={160}
                  />
                  <Tooltip
                    formatter={(v: number) => `${v} λεπτά`}
                    labelStyle={{ color: "hsl(var(--foreground))" }}
                  />
                  <Bar
                    dataKey="minutes"
                    fill="hsl(var(--primary))"
                    radius={4}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Throughput per hour */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Throughput ανά Ώρα</CardTitle>
          <p className="text-xs text-muted-foreground">
            Παραγγελίες ανά ώρα λειτουργίας (σήμερα)
          </p>
        </CardHeader>
        <CardContent>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={throughputData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                <XAxis
                  dataKey="hour"
                  tickFormatter={(h: number) => `${h}:00`}
                  tick={{ fontSize: 11 }}
                />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(v: number) => `${v} παραγγ.`}
                  labelFormatter={(l) => `Ώρα: ${l}:00`}
                />
                <Bar dataKey="orders" fill="hsl(var(--primary))" radius={4} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Station performance */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Απόδοση Σταθμών</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
            {stations.map((s) => {
              const meta = STATION_META[s.station];
              const Icon = meta.icon;
              return (
                <div
                  key={s.station}
                  className="rounded-lg border p-4"
                  style={{ borderTopColor: meta.color, borderTopWidth: 3 }}
                >
                  <div className="flex items-center gap-2">
                    <Icon className="size-5" style={{ color: meta.color }} />
                    <p className="font-semibold">{meta.label}</p>
                  </div>
                  <dl className="mt-3 space-y-1.5 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Παραγγελίες</dt>
                      <dd className="font-semibold">{s.orders}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Μέσος χρόνος</dt>
                      <dd className="font-semibold">
                        {formatMinutes(s.avg_prep_minutes)}
                      </dd>
                    </div>
                    <div className="flex justify-between items-center">
                      <dt className="text-muted-foreground">Φόρτος</dt>
                      <dd className="font-semibold">{s.load_pct}%</dd>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full"
                        style={{
                          width: `${s.load_pct}%`,
                          backgroundColor: meta.color,
                        }}
                      />
                    </div>
                  </dl>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Cancellations */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Ακυρώσεις</CardTitle>
          <p className="text-xs text-muted-foreground">
            Καταγεγραμμένες ακυρώσεις παραγγελιών
          </p>
        </CardHeader>
        <CardContent>
          {cancellations.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Δεν υπάρχουν ακυρώσεις.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-3 py-2 text-left">Ημερομηνία</th>
                    <th className="px-3 py-2 text-left">Πιάτα</th>
                    <th className="px-3 py-2 text-left">Λόγος</th>
                  </tr>
                </thead>
                <tbody>
                  {cancellations.map((c) => (
                    <tr key={c.id} className="border-t">
                      <td className="px-3 py-2 text-muted-foreground">
                        {c.cancelled_at
                          ? new Date(c.cancelled_at).toLocaleDateString("el-GR")
                          : "—"}
                      </td>
                      <td className="px-3 py-2 truncate max-w-[300px]">
                        {c.product_names || "—"}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {c.reason ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
