"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Cell,
} from "recharts";
import { Clock, XCircle, Zap } from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAnalytics } from "@/hooks/use-analytics";

// ─── Tooltip style ────────────────────────────────────────────────────────────

const tooltipStyle = {
  contentStyle: {
    backgroundColor: "hsl(var(--card))",
    border: "1px solid hsl(var(--border))",
    borderRadius: "8px",
    color: "hsl(var(--foreground))",
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getPrepTimeColor(minutes: number): string {
  if (minutes < 8) return "hsl(var(--chart-2))";
  if (minutes <= 14) return "hsl(var(--chart-4))";
  return "hsl(var(--destructive))";
}

// ─── Metric Card ──────────────────────────────────────────────────────────────

interface MetricCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
}

function MetricCard({ title, value, icon }: MetricCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className="text-muted-foreground">{icon}</div>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}

// ─── Prep Time Chart ──────────────────────────────────────────────────────────

function PrepTimeChart({
  data,
}: {
  data: { productName: string; avgTime: number }[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Χρόνος Παρασκευής ανά Πιάτο</CardTitle>
        <CardDescription>Ταξινομημένο φθίνουσα</CardDescription>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="flex items-center justify-center h-[260px] text-muted-foreground text-sm">
            Δεν υπάρχουν δεδομένα
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart
              layout="vertical"
              data={data}
              margin={{ top: 4, right: 16, left: 0, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(var(--border))"
              />
              <XAxis
                type="number"
                tickFormatter={(v) => `${v}΄`}
                tick={{ fontSize: 11 }}
                stroke="hsl(var(--muted-foreground))"
              />
              <YAxis
                type="category"
                dataKey="productName"
                width={160}
                tick={{ fontSize: 11 }}
                stroke="hsl(var(--muted-foreground))"
              />
              <Tooltip
                {...tooltipStyle}
                formatter={(value: number) => [`${value} λεπτά`, "Χρόνος"]}
              />
              <Bar dataKey="avgTime" radius={[0, 4, 4, 0]}>
                {data.map((entry) => (
                  <Cell
                    key={entry.productName}
                    fill={getPrepTimeColor(entry.avgTime)}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Hourly Throughput Chart ──────────────────────────────────────────────────

function HourlyThroughputChart({
  data,
}: {
  data: { hour: number; count: number }[];
}) {
  const formatted = data.map((d) => ({
    ...d,
    label: `${String(d.hour).padStart(2, "0")}:00`,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Throughput ανά Ώρα</CardTitle>
        <CardDescription>Παραγγελίες ανά ώρα λειτουργίας</CardDescription>
      </CardHeader>
      <CardContent>
        {formatted.length === 0 ? (
          <div className="flex items-center justify-center h-[260px] text-muted-foreground text-sm">
            Δεν υπάρχουν δεδομένα
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart
              data={formatted}
              margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(var(--border))"
              />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11 }}
                stroke="hsl(var(--muted-foreground))"
              />
              <YAxis
                tick={{ fontSize: 11 }}
                stroke="hsl(var(--muted-foreground))"
              />
              <Tooltip
                {...tooltipStyle}
                formatter={(value: number) => [value, "Παραγγελίες"]}
              />
              <Line
                type="monotone"
                dataKey="count"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Station Performance Cards ────────────────────────────────────────────────

const STATION_LABELS: Record<string, string> = {
  hot: "Ζεστό",
  cold: "Κρύο",
  bar: "Bar",
  dessert: "Γλυκά",
};

const STATION_ICONS: Record<string, string> = {
  hot: "🔥",
  cold: "❄️",
  bar: "🍸",
  dessert: "🍰",
};

function StationPerformanceCards({
  data,
}: {
  data: Record<string, { orders: number; avgTime: number; load: number }>;
}) {
  const stations = Object.entries(data);

  return (
    <div>
      <h3 className="text-base font-semibold mb-3">Απόδοση Σταθμών</h3>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stations.map(([stationKey, stats]) => (
          <Card key={stationKey}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-1">
                <span>{STATION_ICONS[stationKey] ?? ""}</span>
                <span>{STATION_LABELS[stationKey] ?? stationKey}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Παραγγελίες</span>
                <span className="font-semibold">{stats.orders}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Μέσος χρόνος</span>
                <span className="font-semibold">{stats.avgTime}΄</span>
              </div>
              <div>
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>Φόρτος</span>
                  <span>{stats.load}%</span>
                </div>
                <div className="h-2 rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${stats.load}%` }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── Cancellations Table ──────────────────────────────────────────────────────

function CancellationsTable({
  data,
}: {
  data: { date: string; productName: string; reason: string }[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Ακυρώσεις</CardTitle>
        <CardDescription>Καταγεγραμμένες ακυρώσεις παραγγελιών</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {data.length === 0 ? (
          <div className="flex items-center justify-center h-24 text-muted-foreground text-sm">
            Δεν υπάρχουν ακυρώσεις
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ημερομηνία</TableHead>
                <TableHead>Πιάτο</TableHead>
                <TableHead>Λόγος</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((entry, idx) => (
                <TableRow key={idx}>
                  <TableCell className="text-muted-foreground text-sm">
                    {entry.date}
                  </TableCell>
                  <TableCell className="font-medium">
                    {entry.productName}
                  </TableCell>
                  <TableCell className="text-sm">{entry.reason}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AnalyticsKitchen() {
  const {
    getAveragePrepTime,
    getCancellations,
    getTodayOrderCount,
    getPrepTimeByProduct,
    getStationPerformance,
    getHourlyThroughput,
  } = useAnalytics();

  const avgPrepTime = getAveragePrepTime();
  const cancellations = getCancellations();
  const orderCount = getTodayOrderCount();
  const prepTimeData = getPrepTimeByProduct();
  const stationData = getStationPerformance();
  const throughputData = getHourlyThroughput();

  // Throughput: orders per hour over ~10h operating window
  const hoursOfOperation = 10;
  const throughput = (orderCount / hoursOfOperation).toFixed(1);

  return (
    <div className="space-y-6">
      {/* Metric cards */}
      <div className="grid grid-cols-3 gap-4">
        <MetricCard
          title="Μέσος Χρόνος Παρασκευής"
          value={`${avgPrepTime} λεπτά`}
          icon={<Clock className="h-4 w-4" />}
        />
        <MetricCard
          title="Ακυρώσεις Σήμερα"
          value={String(cancellations.length)}
          icon={<XCircle className="h-4 w-4" />}
        />
        <MetricCard
          title="Throughput / Ώρα"
          value={`${throughput} παραγ./ώρα`}
          icon={<Zap className="h-4 w-4" />}
        />
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <PrepTimeChart data={prepTimeData} />
        <HourlyThroughputChart data={throughputData} />
      </div>

      {/* Station performance */}
      <StationPerformanceCards data={stationData} />

      {/* Cancellations */}
      <CancellationsTable data={cancellations} />
    </div>
  );
}
