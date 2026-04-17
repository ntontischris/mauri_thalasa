"use client";

import { DashboardTab } from "./dashboard-tab";

import { useState } from "react";
import {
  BarChart3,
  TrendingUp,
  ChefHat,
  PieChart as PieIcon,
  History,
  CalendarDays,
  FileDown,
  Euro,
  Receipt,
  Banknote,
  CreditCard,
  HandCoins,
  Users,
  Clock,
  Download,
  FileText,
  Package,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type {
  AnalyticsSummary,
  DailyRevenuePoint,
  TopProduct,
  StationStat,
  HourlyBucket,
  VatBreakdownRow,
  ReservationsStats,
} from "@/lib/queries/analytics";

type Tab =
  | "dashboard"
  | "sales"
  | "kitchen"
  | "foodcost"
  | "products"
  | "reservations"
  | "export";

const TABS: {
  id: Tab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: "dashboard", label: "Dashboard", icon: BarChart3 },
  { id: "sales", label: "Πωλήσεις", icon: TrendingUp },
  { id: "kitchen", label: "Κουζίνα", icon: ChefHat },
  { id: "foodcost", label: "Food Cost", icon: PieIcon },
  { id: "products", label: "Ιστορικό Πιάτων", icon: History },
  { id: "reservations", label: "Κρατήσεις", icon: CalendarDays },
  { id: "export", label: "Export", icon: FileDown },
];

const STATION_LABELS: Record<StationStat["station"], string> = {
  hot: "Κουζίνα",
  cold: "Κρύα",
  bar: "Μπαρ",
  dessert: "Γλυκά",
};

const STATION_COLORS: Record<StationStat["station"], string> = {
  hot: "#f97316",
  cold: "#38bdf8",
  bar: "#a855f7",
  dessert: "#ec4899",
};

function formatPrice(n: number): string {
  return new Intl.NumberFormat("el-GR", {
    style: "currency",
    currency: "EUR",
  }).format(n);
}

interface ReportsTabsProps {
  summary: AnalyticsSummary;
  daily: DailyRevenuePoint[];
  hourly: HourlyBucket[];
  topProducts: TopProduct[];
  stations: StationStat[];
  reservations: ReservationsStats;
}

export function ReportsTabs({
  summary,
  daily,
  hourly,
  topProducts,
  stations,
  reservations,
}: ReportsTabsProps) {
  const [tab, setTab] = useState<Tab>("dashboard");

  return (
    <div className="space-y-4">
      {/* Tab strip */}
      <div className="flex gap-1 overflow-x-auto border-b pb-1">
        {TABS.map((t) => {
          const Icon = t.icon;
          const isActive = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon className="size-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === "dashboard" && (
        <DashboardTab summary={summary} daily={daily} hourly={hourly} topProducts={topProducts} />
      )}
      {tab === "sales" && (
        <SalesTab daily={daily} hourly={hourly} summary={summary} />
      )}
      {tab === "kitchen" && <KitchenTab stations={stations} />}
      {tab === "foodcost" && <FoodCostPlaceholder />}
      {tab === "products" && <ProductsTab products={topProducts} />}
      {tab === "reservations" && <ReservationsTab stats={reservations} />}
      {tab === "export" && <ExportTab />}
    </div>
  );
}

// ─────────────── Dashboard ───────────────
// ─────────────── Sales ───────────────
function SalesTab({
  daily,
  hourly,
  summary,
}: {
  daily: DailyRevenuePoint[];
  hourly: HourlyBucket[];
  summary: AnalyticsSummary;
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-3">
        <Kpi
          icon={<Euro className="size-5" />}
          label="Τζίρος μήνα"
          value={formatPrice(summary.revenue_month)}
          hint={`${summary.orders_month} παραγγελίες`}
        />
        <Kpi
          icon={<Receipt className="size-5" />}
          label="Μέσος λογ. μήνα"
          value={formatPrice(summary.avg_ticket_month)}
        />
        <Kpi
          icon={<TrendingUp className="size-5" />}
          label="Τζίρος εβδομάδας"
          value={formatPrice(summary.revenue_week)}
        />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            Ημερήσιος τζίρος (30 ημέρες)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={daily}>
                <defs>
                  <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="0%"
                      stopColor="hsl(var(--primary))"
                      stopOpacity={0.5}
                    />
                    <stop
                      offset="100%"
                      stopColor="hsl(var(--primary))"
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                <XAxis
                  dataKey="date"
                  tickFormatter={(d: string) => d.slice(5)}
                  tick={{ fontSize: 11 }}
                />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(v: number) => formatPrice(v)}
                  labelFormatter={(l) => `Ημερομηνία: ${l}`}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="hsl(var(--primary))"
                  fill="url(#rev)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Τζίρος ανά ώρα (σήμερα)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourly}>
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
                <Bar dataKey="revenue" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─────────────── Kitchen ───────────────
function KitchenTab({ stations }: { stations: StationStat[] }) {
  const total = stations.reduce((s, x) => s + x.items, 0);
  return (
    <div className="space-y-4">
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        {stations.map((s) => (
          <Card key={s.station}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase text-muted-foreground">
                    {STATION_LABELS[s.station]}
                  </p>
                  <p className="text-2xl font-bold">{s.items}</p>
                  <p className="text-xs text-muted-foreground">
                    {total > 0
                      ? `${Math.round((s.items / total) * 100)}% του μήνα`
                      : "—"}
                  </p>
                </div>
                <div
                  className="flex size-10 items-center justify-center rounded-full"
                  style={{
                    backgroundColor: `${STATION_COLORS[s.station]}22`,
                  }}
                >
                  <Clock
                    className="size-5"
                    style={{ color: STATION_COLORS[s.station] }}
                  />
                </div>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Μέσος χρόνος ετοιμασίας:{" "}
                {s.avg_prep_seconds > 0
                  ? `${Math.round(s.avg_prep_seconds / 60)}' ${s.avg_prep_seconds % 60}''`
                  : "—"}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            Κατανομή αιτημάτων ανά σταθμό
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stations.filter((s) => s.items > 0)}
                  dataKey="items"
                  nameKey="station"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label={({
                    station,
                    items,
                  }: {
                    station: string;
                    items: number;
                  }) =>
                    `${STATION_LABELS[station as keyof typeof STATION_LABELS]}: ${items}`
                  }
                >
                  {stations.map((s) => (
                    <Cell key={s.station} fill={STATION_COLORS[s.station]} />
                  ))}
                </Pie>
                <Legend
                  formatter={(v: string) =>
                    STATION_LABELS[v as keyof typeof STATION_LABELS] ?? v
                  }
                />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─────────────── Food Cost placeholder ───────────────
function FoodCostPlaceholder() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-16 text-center">
        <PieIcon className="mb-4 size-12 text-muted-foreground opacity-40" />
        <p className="font-medium">Food Cost ανά συνταγή</p>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          Ενεργοποιείται αφού συμπληρωθούν οι συνταγές με κόστος υλικών. Πήγαινε
          στο Συνταγές για να ξεκινήσεις.
        </p>
      </CardContent>
    </Card>
  );
}

// ─────────────── Products ───────────────
function ProductsTab({ products }: { products: TopProduct[] }) {
  const data = products.slice(0, 15);
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">
          Top 15 προϊόντα (τρέχων μήνας)
        </CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Δεν υπάρχουν δεδομένα.
          </p>
        ) : (
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} layout="vertical" margin={{ left: 100 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis
                  dataKey="name"
                  type="category"
                  tick={{ fontSize: 11 }}
                  width={180}
                />
                <Tooltip
                  formatter={(v: number, k: string) =>
                    k === "revenue" ? formatPrice(v) : v
                  }
                />
                <Bar dataKey="quantity" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─────────────── Reservations ───────────────
function ReservationsTab({ stats }: { stats: ReservationsStats }) {
  return (
    <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
      <Kpi
        icon={<CalendarDays className="size-5" />}
        label="Κρατήσεις μήνα"
        value={String(stats.total_month)}
      />
      <Kpi
        icon={<Users className="size-5" />}
        label="Σύνολο θέσεων"
        value={String(stats.guests_month)}
      />
      <Kpi
        icon={<CalendarDays className="size-5" />}
        label="Επιβεβαιωμένες"
        value={String(stats.confirmed_month)}
      />
      <Kpi
        icon={<CalendarDays className="size-5" />}
        label="Ακυρωμένες"
        value={String(stats.cancelled_month)}
      />
    </div>
  );
}

// ─────────────── Export ───────────────
function ExportTab() {
  const [vatPeriod, setVatPeriod] = useState<"today" | "week" | "month">(
    "month",
  );
  const [vatData, setVatData] = useState<VatBreakdownRow[] | null>(null);
  const [loading, setLoading] = useState(false);

  const loadVat = async (p: "today" | "week" | "month") => {
    setVatPeriod(p);
    setLoading(true);
    try {
      const res = await fetch(`/api/reports/vat?period=${p}`);
      if (!res.ok) throw new Error("VAT fetch failed");
      const data = (await res.json()) as VatBreakdownRow[];
      setVatData(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Αποτυχία φόρτωσης ΦΠΑ");
    } finally {
      setLoading(false);
    }
  };

  const download = async (kind: "sales" | "inventory" | "pdf") => {
    try {
      const res = await fetch(`/api/reports/${kind}`);
      if (!res.ok) throw new Error(`${kind} export failed`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download =
        kind === "pdf"
          ? `report-${new Date().toISOString().slice(0, 10)}.pdf`
          : `${kind}-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Η λήψη ξεκίνησε");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Αποτυχία");
    }
  };

  const vatTotals = (vatData ?? []).reduce(
    (acc, r) => {
      acc.net += r.net;
      acc.vat += r.vat;
      acc.gross += r.gross;
      return acc;
    },
    { net: 0, vat: 0, gross: 0 },
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Εξαγωγή Δεδομένων</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          <button
            type="button"
            onClick={() => download("pdf")}
            className="flex items-center gap-3 rounded-lg border p-4 text-left transition hover:border-primary/60"
          >
            <FileText className="size-8 text-red-500" />
            <div>
              <p className="font-semibold">PDF Σύνοψη</p>
              <p className="text-xs text-muted-foreground">Πλήρης αναφορά</p>
            </div>
            <Download className="ml-auto size-4 text-muted-foreground" />
          </button>
          <button
            type="button"
            onClick={() => download("sales")}
            className="flex items-center gap-3 rounded-lg border p-4 text-left transition hover:border-primary/60"
          >
            <FileText className="size-8 text-emerald-500" />
            <div>
              <p className="font-semibold">CSV Πωλήσεων</p>
              <p className="text-xs text-muted-foreground">30 ημέρες</p>
            </div>
            <Download className="ml-auto size-4 text-muted-foreground" />
          </button>
          <button
            type="button"
            onClick={() => download("inventory")}
            className="flex items-center gap-3 rounded-lg border p-4 text-left transition hover:border-primary/60"
          >
            <Package className="size-8 text-blue-500" />
            <div>
              <p className="font-semibold">CSV Αποθήκης</p>
              <p className="text-xs text-muted-foreground">Τρέχον απόθεμα</p>
            </div>
            <Download className="ml-auto size-4 text-muted-foreground" />
          </button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Αναφορά ΦΠΑ</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-1 rounded-md border p-0.5 w-fit">
            {(["today", "week", "month"] as const).map((p) => (
              <Button
                key={p}
                size="sm"
                variant={vatPeriod === p ? "default" : "ghost"}
                className="h-7 px-3 text-xs"
                onClick={() => loadVat(p)}
                disabled={loading}
              >
                {p === "today" ? "Σήμερα" : p === "week" ? "Εβδομάδα" : "Μήνας"}
              </Button>
            ))}
          </div>
          {vatData === null ? (
            <p className="text-xs text-muted-foreground">
              Πάτα μία περίοδο για να υπολογιστεί.
            </p>
          ) : vatData.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Δεν υπάρχουν πωλήσεις σε αυτήν την περίοδο.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-3 py-2 text-left">ΦΠΑ %</th>
                    <th className="px-3 py-2 text-right">Καθαρή Αξία</th>
                    <th className="px-3 py-2 text-right">ΦΠΑ</th>
                    <th className="px-3 py-2 text-right">Σύνολο</th>
                  </tr>
                </thead>
                <tbody>
                  {vatData.map((r) => (
                    <tr key={r.rate} className="border-t">
                      <td className="px-3 py-2">
                        <Badge variant="outline">{r.rate}%</Badge>
                      </td>
                      <td className="px-3 py-2 text-right font-medium">
                        {formatPrice(r.net)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {formatPrice(r.vat)}
                      </td>
                      <td className="px-3 py-2 text-right font-semibold">
                        {formatPrice(r.gross)}
                      </td>
                    </tr>
                  ))}
                  <tr className="border-t bg-muted/30 font-semibold">
                    <td className="px-3 py-2">Σύνολο</td>
                    <td className="px-3 py-2 text-right">
                      {formatPrice(vatTotals.net)}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {formatPrice(vatTotals.vat)}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {formatPrice(vatTotals.gross)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Kpi({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          <p className="text-xl font-bold truncate">{value}</p>
          {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
        </div>
      </CardContent>
    </Card>
  );
}
