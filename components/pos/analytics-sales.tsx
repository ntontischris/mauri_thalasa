"use client";

import { useState } from "react";
import { format, subDays, startOfDay, parseISO } from "date-fns";
import { el } from "date-fns/locale";
import { TrendingUp, TrendingDown } from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useAnalytics } from "@/hooks/use-analytics";
import { formatPrice } from "@/lib/mock-data";

// ─── Types ───────────────────────────────────────────────────────────────────

type Period = "today" | "week" | "month" | "custom";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function computeDateRange(
  period: Period,
  customFrom: string,
  customTo: string,
): { from: string; to: string } {
  const today = format(startOfDay(new Date()), "yyyy-MM-dd");
  if (period === "today") return { from: today, to: today };
  if (period === "week")
    return { from: format(subDays(new Date(), 7), "yyyy-MM-dd"), to: today };
  if (period === "month")
    return { from: format(subDays(new Date(), 30), "yyyy-MM-dd"), to: today };
  return { from: customFrom || today, to: customTo || today };
}

function formatDateLabel(dateStr: string): string {
  return format(parseISO(dateStr), "dd/MM", { locale: el });
}

// ─── Period Selector ─────────────────────────────────────────────────────────

interface PeriodSelectorProps {
  period: Period;
  customFrom: string;
  customTo: string;
  onPeriodChange: (p: Period) => void;
  onCustomFromChange: (v: string) => void;
  onCustomToChange: (v: string) => void;
}

function PeriodSelector({
  period,
  customFrom,
  customTo,
  onPeriodChange,
  onCustomFromChange,
  onCustomToChange,
}: PeriodSelectorProps) {
  const options: { label: string; value: Period }[] = [
    { label: "Σήμερα", value: "today" },
    { label: "Εβδομάδα", value: "week" },
    { label: "Μήνας", value: "month" },
    { label: "Προσαρμοσμένο", value: "custom" },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2">
      {options.map((opt) => (
        <Button
          key={opt.value}
          variant={period === opt.value ? "default" : "outline"}
          size="sm"
          onClick={() => onPeriodChange(opt.value)}
        >
          {opt.label}
        </Button>
      ))}
      {period === "custom" && (
        <div className="flex items-center gap-2 ml-2">
          <Input
            type="date"
            value={customFrom}
            onChange={(e) => onCustomFromChange(e.target.value)}
            className="w-36 h-8 text-sm"
          />
          <span className="text-muted-foreground text-sm">έως</span>
          <Input
            type="date"
            value={customTo}
            onChange={(e) => onCustomToChange(e.target.value)}
            className="w-36 h-8 text-sm"
          />
        </div>
      )}
    </div>
  );
}

// ─── Period Comparison Banner ─────────────────────────────────────────────────

function PeriodComparisonBanner({
  current,
  previous,
  changePercent,
}: {
  current: number;
  previous: number;
  changePercent: number;
}) {
  const isPositive = changePercent >= 0;
  const changeColor = isPositive ? "text-green-500" : "text-red-500";
  const changeSign = isPositive ? "+" : "";

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Σύγκριση Περιόδων
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Τρέχουσα</p>
            <p className="text-xl font-bold">{formatPrice(current)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Προηγούμενη</p>
            <p className="text-xl font-bold">{formatPrice(previous)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Μεταβολή</p>
            <div
              className={`flex items-center justify-center gap-1 ${changeColor}`}
            >
              {isPositive ? (
                <TrendingUp className="h-4 w-4" />
              ) : (
                <TrendingDown className="h-4 w-4" />
              )}
              <span className="text-xl font-bold">
                {changeSign}
                {changePercent.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Revenue Table ────────────────────────────────────────────────────────────

function RevenueTable({
  data,
}: {
  data: {
    date: string;
    orderCount: number;
    revenue: number;
    avgCheck: number;
  }[];
}) {
  const sorted = [...data].sort((a, b) => b.date.localeCompare(a.date));
  const totalOrders = data.reduce((sum, r) => sum + r.orderCount, 0);
  const totalRevenue = data.reduce((sum, r) => sum + r.revenue, 0);
  const totalAvg = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Έσοδα ανά Ημέρα</CardTitle>
        <CardDescription>Αναλυτικά ανά ημερομηνία</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {sorted.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
            Δεν υπάρχουν δεδομένα
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ημερομηνία</TableHead>
                <TableHead className="text-right">Παραγγελίες</TableHead>
                <TableHead className="text-right">Έσοδα</TableHead>
                <TableHead className="text-right">Μέσος Λογ/σμός</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((row) => (
                <TableRow key={row.date}>
                  <TableCell>{formatDateLabel(row.date)}</TableCell>
                  <TableCell className="text-right">{row.orderCount}</TableCell>
                  <TableCell className="text-right font-medium">
                    {formatPrice(row.revenue)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatPrice(row.avgCheck)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell className="font-semibold">Σύνολο</TableCell>
                <TableCell className="text-right font-semibold">
                  {totalOrders}
                </TableCell>
                <TableCell className="text-right font-semibold">
                  {formatPrice(totalRevenue)}
                </TableCell>
                <TableCell className="text-right font-semibold">
                  {formatPrice(totalAvg)}
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Top Sellers Table ────────────────────────────────────────────────────────

function TopSellersTable({
  data,
  totalRevenue,
}: {
  data: { productName: string; quantity: number; revenue: number }[];
  totalRevenue: number;
}) {
  const rankBadgeVariant = (rank: number) => {
    if (rank === 1) return "default" as const;
    if (rank === 2) return "secondary" as const;
    if (rank === 3) return "outline" as const;
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Top Πωλητές</CardTitle>
        <CardDescription>Κορυφαία 10 πιάτα βάσει εσόδων</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {data.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
            Δεν υπάρχουν δεδομένα
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8">#</TableHead>
                <TableHead>Πιάτο</TableHead>
                <TableHead className="text-right">Τεμάχια</TableHead>
                <TableHead className="text-right">Έσοδα</TableHead>
                <TableHead className="text-right">% Συνόλου</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((product, idx) => {
                const rank = idx + 1;
                const pct =
                  totalRevenue > 0
                    ? ((product.revenue / totalRevenue) * 100).toFixed(1)
                    : "0.0";
                const badgeVariant = rankBadgeVariant(rank);

                return (
                  <TableRow key={product.productName}>
                    <TableCell>
                      {badgeVariant ? (
                        <Badge
                          variant={badgeVariant}
                          className="w-6 h-6 p-0 flex items-center justify-center text-xs"
                        >
                          {rank}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">
                          {rank}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">
                      {product.productName}
                    </TableCell>
                    <TableCell className="text-right">
                      {product.quantity}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatPrice(product.revenue)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full bg-primary"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground w-8 text-right">
                          {pct}%
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Worst Sellers Table ──────────────────────────────────────────────────────

function WorstSellersTable({
  data,
}: {
  data: { productName: string; quantity: number; revenue: number }[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Χαμηλές Πωλήσεις</CardTitle>
        <CardDescription>
          Εξετάστε αν αξίζει να παραμείνουν στο μενού
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {data.length === 0 ? (
          <div className="flex items-center justify-center h-24 text-muted-foreground text-sm">
            Δεν υπάρχουν δεδομένα
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Πιάτο</TableHead>
                <TableHead className="text-right">Τεμάχια</TableHead>
                <TableHead className="text-right">Έσοδα</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((product) => (
                <TableRow
                  key={product.productName}
                  className="text-amber-700 dark:text-amber-400"
                >
                  <TableCell className="font-medium">
                    {product.productName}
                  </TableCell>
                  <TableCell className="text-right">
                    {product.quantity}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatPrice(product.revenue)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Peak Hours Heatmap ───────────────────────────────────────────────────────

const DAY_LABELS = ["Κυρ", "Δευ", "Τρι", "Τετ", "Πεμ", "Παρ", "Σαβ"];
const HOURS = Array.from({ length: 12 }, (_, i) => i + 12);

function PeakHoursHeatmap({
  data,
}: {
  data: { day: number; hour: number; revenue: number }[];
}) {
  const maxRevenue = Math.max(...data.map((d) => d.revenue), 1);

  const getRevenue = (day: number, hour: number): number => {
    const entry = data.find((d) => d.day === day && d.hour === hour);
    return entry?.revenue ?? 0;
  };

  const getOpacity = (revenue: number): number =>
    Math.max(0.08, revenue / maxRevenue);

  const getTooltip = (day: number, hour: number, revenue: number): string =>
    `${DAY_LABELS[day]} ${hour}:00 — ${formatPrice(revenue)}`;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Ώρες Αιχμής</CardTitle>
        <CardDescription>
          Έσοδα ανά ημέρα και ώρα (συγκεντρωτικά)
        </CardDescription>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
            Δεν υπάρχουν δεδομένα
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[600px]">
              {/* Header: hours */}
              <div
                className="grid gap-0.5"
                style={{ gridTemplateColumns: "48px repeat(12, 1fr)" }}
              >
                <div />
                {HOURS.map((h) => (
                  <div
                    key={h}
                    className="text-center text-xs text-muted-foreground pb-1"
                  >
                    {h}
                  </div>
                ))}
              </div>
              {/* Rows: days */}
              {DAY_LABELS.map((dayLabel, dayIdx) => (
                <div
                  key={dayIdx}
                  className="grid gap-0.5 mb-0.5"
                  style={{ gridTemplateColumns: "48px repeat(12, 1fr)" }}
                >
                  <div className="text-xs text-muted-foreground flex items-center pr-1 text-right">
                    {dayLabel}
                  </div>
                  {HOURS.map((hour) => {
                    const rev = getRevenue(dayIdx, hour);
                    const opacity = getOpacity(rev);
                    return (
                      <div
                        key={hour}
                        title={getTooltip(dayIdx, hour, rev)}
                        className="h-7 rounded-sm cursor-default transition-opacity hover:ring-1 hover:ring-primary"
                        style={{
                          backgroundColor: `hsl(var(--primary) / ${opacity})`,
                        }}
                      />
                    );
                  })}
                </div>
              ))}
              {/* Legend */}
              <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
                <span>Χαμηλό</span>
                {[0.1, 0.3, 0.5, 0.7, 0.9].map((op) => (
                  <div
                    key={op}
                    className="h-4 w-6 rounded-sm"
                    style={{
                      backgroundColor: `hsl(var(--primary) / ${op})`,
                    }}
                  />
                ))}
                <span>Υψηλό</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AnalyticsSales() {
  const [period, setPeriod] = useState<Period>("week");
  const [customFrom, setCustomFrom] = useState<string>(
    format(subDays(new Date(), 7), "yyyy-MM-dd"),
  );
  const [customTo, setCustomTo] = useState<string>(
    format(new Date(), "yyyy-MM-dd"),
  );

  const {
    getSalesForPeriod,
    getPeriodComparison,
    getTopProducts,
    getWorstProducts,
    getPeakHoursHeatmap,
  } = useAnalytics();

  const { from, to } = computeDateRange(period, customFrom, customTo);
  const salesData = getSalesForPeriod(from, to);
  const comparison = getPeriodComparison(from, to);
  const topProducts = getTopProducts(10);
  const worstProducts = getWorstProducts(5);
  const heatmapData = getPeakHoursHeatmap();

  const totalRevenue = salesData.reduce((sum, r) => sum + r.revenue, 0);

  return (
    <div className="space-y-6">
      <PeriodSelector
        period={period}
        customFrom={customFrom}
        customTo={customTo}
        onPeriodChange={setPeriod}
        onCustomFromChange={setCustomFrom}
        onCustomToChange={setCustomTo}
      />

      <PeriodComparisonBanner
        current={comparison.current}
        previous={comparison.previous}
        changePercent={comparison.changePercent}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <RevenueTable data={salesData} />
        <TopSellersTable data={topProducts} totalRevenue={totalRevenue} />
      </div>

      <WorstSellersTable data={worstProducts} />

      <PeakHoursHeatmap data={heatmapData} />
    </div>
  );
}
