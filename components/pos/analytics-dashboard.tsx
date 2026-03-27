"use client";

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
} from "recharts";
import { TrendingUp, ShoppingBag, Receipt, Utensils } from "lucide-react";
import { format, parseISO } from "date-fns";
import { el } from "date-fns/locale";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { useAnalytics } from "@/hooks/use-analytics";
import { formatPrice } from "@/lib/mock-data";

// ─── Types ───────────────────────────────────────────────────────────────────

interface KpiCardProps {
  title: string;
  value: string;
  subtext: string;
  subtextColor?: string;
  icon: React.ReactNode;
}

// ─── Tooltip style ───────────────────────────────────────────────────────────

const tooltipStyle = {
  contentStyle: {
    backgroundColor: "hsl(var(--card))",
    border: "1px solid hsl(var(--border))",
    borderRadius: "8px",
    color: "hsl(var(--foreground))",
  },
};

// ─── Sub-components ──────────────────────────────────────────────────────────

function KpiCard({
  title,
  value,
  subtext,
  subtextColor = "text-muted-foreground",
  icon,
}: KpiCardProps) {
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
        <p className={`text-xs mt-1 ${subtextColor}`}>{subtext}</p>
      </CardContent>
    </Card>
  );
}

function RevenueBarChart({
  data,
}: {
  data: { date: string; revenue: number }[];
}) {
  const formatted = data.map((d) => ({
    ...d,
    label: format(parseISO(d.date), "EEE", { locale: el }),
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Τζίρος 7 Ημερών</CardTitle>
        <CardDescription>Έσοδα ανά ημέρα</CardDescription>
      </CardHeader>
      <CardContent>
        {formatted.length === 0 ? (
          <div className="flex items-center justify-center h-[260px] text-muted-foreground text-sm">
            Δεν υπάρχουν δεδομένα
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart
              data={formatted}
              margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(var(--border))"
              />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 12 }}
                stroke="hsl(var(--muted-foreground))"
              />
              <YAxis
                tickFormatter={(v) => `€${v}`}
                tick={{ fontSize: 11 }}
                stroke="hsl(var(--muted-foreground))"
              />
              <Tooltip
                {...tooltipStyle}
                formatter={(value: number) => [formatPrice(value), "Έσοδα"]}
                labelFormatter={(label) => `Ημέρα: ${label}`}
              />
              <Bar
                dataKey="revenue"
                fill="hsl(var(--primary))"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

function HourlyAreaChart({
  data,
}: {
  data: { hour: number; revenue: number }[];
}) {
  const formatted = data.map((d) => ({ ...d, label: `${d.hour}:00` }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Πωλήσεις ανά Ώρα</CardTitle>
        <CardDescription>Έσοδα ανά ώρα λειτουργίας</CardDescription>
      </CardHeader>
      <CardContent>
        {formatted.length === 0 ? (
          <div className="flex items-center justify-center h-[260px] text-muted-foreground text-sm">
            Δεν υπάρχουν δεδομένα
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart
              data={formatted}
              margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient
                  id="revenueGradient"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="5%"
                    stopColor="hsl(var(--primary))"
                    stopOpacity={0.3}
                  />
                  <stop
                    offset="95%"
                    stopColor="hsl(var(--primary))"
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(var(--border))"
              />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 12 }}
                stroke="hsl(var(--muted-foreground))"
              />
              <YAxis
                tickFormatter={(v) => `€${v}`}
                tick={{ fontSize: 11 }}
                stroke="hsl(var(--muted-foreground))"
              />
              <Tooltip
                {...tooltipStyle}
                formatter={(value: number) => [formatPrice(value), "Έσοδα"]}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="hsl(var(--primary))"
                fill="url(#revenueGradient)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

function TopProductsChart({
  data,
}: {
  data: { productName: string; quantity: number; revenue: number }[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Top 5 Πιάτα</CardTitle>
        <CardDescription>Βάσει εσόδων</CardDescription>
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
                tickFormatter={(v) => `€${v}`}
                tick={{ fontSize: 11 }}
                stroke="hsl(var(--muted-foreground))"
              />
              <YAxis
                type="category"
                dataKey="productName"
                width={140}
                tick={{ fontSize: 11 }}
                stroke="hsl(var(--muted-foreground))"
              />
              <Tooltip
                {...tooltipStyle}
                formatter={(value: number) => [formatPrice(value), "Έσοδα"]}
              />
              <Bar
                dataKey="revenue"
                fill="hsl(var(--chart-2))"
                radius={[0, 4, 4, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

function PaymentPieChart({ cash, card }: { cash: number; card: number }) {
  const total = cash + card;
  const data = [
    { name: "Μετρητά", value: cash },
    { name: "Κάρτα", value: card },
  ];
  const COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))"];

  const renderLabel = ({ name, value }: { name: string; value: number }) => {
    if (total === 0) return "";
    const pct = Math.round((value / total) * 100);
    return `${pct}%`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Μετρητά vs Κάρτα</CardTitle>
        <CardDescription>Κατανομή πληρωμών σήμερα</CardDescription>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <div className="flex items-center justify-center h-[260px] text-muted-foreground text-sm">
            Δεν υπάρχουν δεδομένα
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                dataKey="value"
                label={renderLabel}
                labelLine={false}
              >
                {data.map((_, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Legend />
              <Tooltip
                {...tooltipStyle}
                formatter={(value: number) => [formatPrice(value), ""]}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function AnalyticsDashboard() {
  const {
    getTodayRevenue,
    getYesterdayRevenue,
    getTodayOrderCount,
    getAverageCheck,
    getRevenueByDay,
    getHourlyRevenue,
    getTopProducts,
    getPaymentBreakdown,
    getFoodCostSummary,
  } = useAnalytics();

  const todayRevenue = getTodayRevenue();
  const yesterdayRevenue = getYesterdayRevenue();
  const orderCount = getTodayOrderCount();
  const avgCheck = getAverageCheck();
  const revenueByDay = getRevenueByDay(7);
  const hourlyRevenue = getHourlyRevenue();
  const topProducts = getTopProducts(5);
  const { cash, card } = getPaymentBreakdown();
  const foodCostSummary = getFoodCostSummary();

  const revenueChangePercent =
    yesterdayRevenue === 0
      ? 0
      : Math.round(
          ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 1000,
        ) / 10;

  const revenueSubtext =
    revenueChangePercent >= 0
      ? `+${revenueChangePercent}% vs χθες`
      : `${revenueChangePercent}% vs χθες`;

  const revenueSubtextColor =
    revenueChangePercent >= 0 ? "text-green-500" : "text-red-500";

  const foodCostPct = foodCostSummary.avgFoodCostPercent;
  const foodCostColor =
    foodCostPct < 30
      ? "text-green-500"
      : foodCostPct <= 40
        ? "text-amber-500"
        : "text-red-500";

  return (
    <div className="space-y-6">
      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Σημερινός Τζίρος"
          value={formatPrice(todayRevenue)}
          subtext={revenueSubtext}
          subtextColor={revenueSubtextColor}
          icon={<TrendingUp className="h-4 w-4" />}
        />
        <KpiCard
          title="Παραγγελίες"
          value={String(orderCount)}
          subtext={`Μ.Ο. ${formatPrice(avgCheck)} / παραγγελία`}
          icon={<ShoppingBag className="h-4 w-4" />}
        />
        <KpiCard
          title="Μέσος Λογαριασμός"
          value={formatPrice(avgCheck)}
          subtext="Μέσος λογαριασμός σήμερα"
          icon={<Receipt className="h-4 w-4" />}
        />
        <KpiCard
          title="Food Cost %"
          value={`${foodCostPct.toFixed(1)}%`}
          subtext={
            foodCostPct < 30
              ? "Εξαιρετικό"
              : foodCostPct <= 40
                ? "Αποδεκτό"
                : "Υψηλό — έλεγχος απαιτείται"
          }
          subtextColor={foodCostColor}
          icon={<Utensils className="h-4 w-4" />}
        />
      </div>

      {/* Charts row 1 */}
      <div className="grid gap-6 lg:grid-cols-2">
        <RevenueBarChart data={revenueByDay} />
        <HourlyAreaChart data={hourlyRevenue} />
      </div>

      {/* Charts row 2 */}
      <div className="grid gap-6 lg:grid-cols-2">
        <TopProductsChart data={topProducts} />
        <PaymentPieChart cash={cash} card={card} />
      </div>
    </div>
  );
}
