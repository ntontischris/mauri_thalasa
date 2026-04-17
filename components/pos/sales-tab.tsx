"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Calendar } from "lucide-react";
import type {
  PeriodCompareResult,
  TopProduct,
  HeatmapCell,
} from "@/lib/queries/analytics";

type Preset = "today" | "week" | "month" | "custom";

interface SalesTabProps {
  initialTop: TopProduct[];
  initialBottom: TopProduct[];
  initialHeatmap: HeatmapCell[];
}

function formatPrice(n: number): string {
  return new Intl.NumberFormat("el-GR", {
    style: "currency",
    currency: "EUR",
  }).format(n);
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function rangeForPreset(p: Preset, customFrom: string, customTo: string) {
  const now = new Date();
  const end = new Date(now);
  const start = new Date(now);
  if (p === "today") {
    start.setHours(0, 0, 0, 0);
  } else if (p === "week") {
    start.setDate(start.getDate() - 6);
    start.setHours(0, 0, 0, 0);
  } else if (p === "month") {
    start.setDate(start.getDate() - 29);
    start.setHours(0, 0, 0, 0);
  } else {
    return {
      from: `${customFrom}T00:00:00`,
      to: `${customTo}T23:59:59`,
    };
  }
  return { from: start.toISOString(), to: end.toISOString() };
}

const DAY_LABELS = ["Κυρ", "Δευ", "Τρι", "Τετ", "Πεμ", "Παρ", "Σαβ"];
const HOURS = Array.from({ length: 12 }, (_, i) => 12 + i); // 12..23

export function SalesTab({
  initialTop,
  initialBottom,
  initialHeatmap,
}: SalesTabProps) {
  const [preset, setPreset] = useState<Preset>("week");
  const [customFrom, setCustomFrom] = useState(() =>
    isoDate(new Date(Date.now() - 7 * 86400000)),
  );
  const [customTo, setCustomTo] = useState(() => isoDate(new Date()));
  const [compare, setCompare] = useState<PeriodCompareResult | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const { from, to } = rangeForPreset(preset, customFrom, customTo);
    setLoading(true);
    fetch(
      `/api/reports/compare?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
    )
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then((data: PeriodCompareResult) => {
        if (!cancelled) setCompare(data);
      })
      .catch(() => {
        if (!cancelled) toast.error("Αποτυχία φόρτωσης");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [preset, customFrom, customTo]);

  const maxHeat = Math.max(1, ...initialHeatmap.map((c) => c.revenue));
  const heatFor = (day: number, hour: number) =>
    initialHeatmap.find((c) => c.day === day && c.hour === hour)?.revenue ?? 0;

  const total = compare
    ? compare.daily_breakdown.reduce(
        (acc, d) => {
          acc.orders += d.orders;
          acc.revenue += d.revenue;
          return acc;
        },
        { orders: 0, revenue: 0 },
      )
    : { orders: 0, revenue: 0 };
  const totalAvg = total.orders > 0 ? total.revenue / total.orders : 0;

  const topWithPct = initialTop.slice(0, 10).map((p) => {
    const topRev = initialTop[0]?.revenue ?? 1;
    return { ...p, pct: (p.revenue / topRev) * 100 };
  });

  return (
    <div className="space-y-4">
      {/* Preset buttons */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1 rounded-md border p-0.5">
          {(["today", "week", "month", "custom"] as Preset[]).map((p) => (
            <Button
              key={p}
              size="sm"
              variant={preset === p ? "default" : "ghost"}
              className="h-7 px-3 text-xs"
              onClick={() => setPreset(p)}
              disabled={loading}
            >
              {p === "today"
                ? "Σήμερα"
                : p === "week"
                  ? "Εβδομάδα"
                  : p === "month"
                    ? "Μήνας"
                    : "Προσαρμοσμένο"}
            </Button>
          ))}
        </div>
        {preset === "custom" && (
          <div className="flex items-center gap-2 text-xs">
            <Input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="h-8 w-40"
            />
            <span className="text-muted-foreground">έως</span>
            <Input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className="h-8 w-40"
            />
          </div>
        )}
      </div>

      {/* Period comparison */}
      {compare && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Σύγκριση Περιόδων</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Τρέχουσα
                </p>
                <p className="mt-1 text-2xl font-bold">
                  {formatPrice(compare.current)}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Προηγούμενη
                </p>
                <p className="mt-1 text-2xl font-bold text-muted-foreground">
                  {formatPrice(compare.previous)}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Μεταβολή
                </p>
                <p
                  className={cn(
                    "mt-1 flex items-center gap-1 text-2xl font-bold",
                    compare.change_pct > 0
                      ? "text-emerald-600 dark:text-emerald-400"
                      : compare.change_pct < 0
                        ? "text-red-600 dark:text-red-400"
                        : "text-muted-foreground",
                  )}
                >
                  {compare.change_pct > 0 ? (
                    <TrendingUp className="size-5" />
                  ) : compare.change_pct < 0 ? (
                    <TrendingDown className="size-5" />
                  ) : null}
                  {compare.change_pct > 0 ? "+" : ""}
                  {compare.change_pct.toFixed(1)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Daily breakdown */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Έσοδα ανά Ημέρα</CardTitle>
          <p className="text-xs text-muted-foreground">
            Αναλυτικά ανά ημερομηνία
          </p>
        </CardHeader>
        <CardContent>
          {!compare || compare.daily_breakdown.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              {loading ? "Φόρτωση..." : "Δεν υπάρχουν δεδομένα στην περίοδο."}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-3 py-2 text-left">Ημερομηνία</th>
                    <th className="px-3 py-2 text-right">Παραγγελίες</th>
                    <th className="px-3 py-2 text-right">Έσοδα</th>
                    <th className="px-3 py-2 text-right">Μέσος Λογ/σμός</th>
                  </tr>
                </thead>
                <tbody>
                  {compare.daily_breakdown.map((d) => (
                    <tr key={d.date} className="border-t">
                      <td className="px-3 py-2 font-medium">
                        {d.date.slice(8, 10)}/{d.date.slice(5, 7)}
                      </td>
                      <td className="px-3 py-2 text-right">{d.orders}</td>
                      <td className="px-3 py-2 text-right font-semibold">
                        {formatPrice(d.revenue)}
                      </td>
                      <td className="px-3 py-2 text-right text-muted-foreground">
                        {formatPrice(d.avg_ticket)}
                      </td>
                    </tr>
                  ))}
                  <tr className="border-t bg-muted/30 font-semibold">
                    <td className="px-3 py-2">Σύνολο</td>
                    <td className="px-3 py-2 text-right">{total.orders}</td>
                    <td className="px-3 py-2 text-right">
                      {formatPrice(total.revenue)}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {formatPrice(totalAvg)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Top sellers */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Top Πωλητές</CardTitle>
          <p className="text-xs text-muted-foreground">
            Κορυφαία 10 πιάτα βάσει εσόδων (τρέχων μήνας)
          </p>
        </CardHeader>
        <CardContent>
          {topWithPct.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Δεν υπάρχουν δεδομένα.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-3 py-2 text-left">#</th>
                    <th className="px-3 py-2 text-left">Πιάτο</th>
                    <th className="px-3 py-2 text-right">Τεμάχια</th>
                    <th className="px-3 py-2 text-right">Έσοδα</th>
                    <th className="px-3 py-2 text-right">% Συνόλου</th>
                  </tr>
                </thead>
                <tbody>
                  {topWithPct.map((p, i) => (
                    <tr key={p.name} className="border-t">
                      <td className="px-3 py-2">
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] font-bold",
                            i === 0 &&
                              "border-amber-500 bg-amber-500/10 text-amber-600",
                          )}
                        >
                          {i + 1}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 font-medium">{p.name}</td>
                      <td className="px-3 py-2 text-right">{p.quantity}</td>
                      <td className="px-3 py-2 text-right font-semibold">
                        {formatPrice(p.revenue)}
                      </td>
                      <td className="px-3 py-2 text-right text-muted-foreground">
                        {p.pct.toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bottom sellers */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Χαμηλές Πωλήσεις</CardTitle>
          <p className="text-xs text-muted-foreground">
            Εξετάστε αν αξίζει να παραμείνουν στο μενού
          </p>
        </CardHeader>
        <CardContent>
          {initialBottom.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Δεν υπάρχουν χαμηλόδραστα προϊόντα.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-3 py-2 text-left">Πιάτο</th>
                    <th className="px-3 py-2 text-right">Τεμάχια</th>
                    <th className="px-3 py-2 text-right">Έσοδα</th>
                  </tr>
                </thead>
                <tbody>
                  {initialBottom.map((p) => (
                    <tr key={p.name} className="border-t">
                      <td className="px-3 py-2 font-medium text-muted-foreground">
                        {p.name}
                      </td>
                      <td className="px-3 py-2 text-right">{p.quantity}</td>
                      <td className="px-3 py-2 text-right">
                        {formatPrice(p.revenue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Heatmap */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Calendar className="size-4" />
            Ώρες Αιχμής
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Έσοδα ανά ημέρα και ώρα (30 ημέρες συγκεντρωτικά)
          </p>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <div className="inline-block min-w-full">
              <div className="flex gap-1 pl-12">
                {HOURS.map((h) => (
                  <div
                    key={h}
                    className="w-9 text-center text-[10px] text-muted-foreground"
                  >
                    {h}
                  </div>
                ))}
              </div>
              {[0, 1, 2, 3, 4, 5, 6].map((day) => (
                <div key={day} className="flex items-center gap-1 mt-1">
                  <div className="w-10 text-right text-xs text-muted-foreground">
                    {DAY_LABELS[day]}
                  </div>
                  <div className="w-2" />
                  {HOURS.map((hour) => {
                    const rev = heatFor(day, hour);
                    const intensity = rev > 0 ? rev / maxHeat : 0;
                    return (
                      <div
                        key={hour}
                        className="w-9 h-7 rounded flex items-center justify-center text-[10px] font-medium"
                        style={{
                          backgroundColor:
                            intensity > 0
                              ? `rgba(59, 130, 246, ${0.15 + intensity * 0.6})`
                              : "rgb(100 116 139 / 0.08)",
                          color: intensity > 0.5 ? "white" : undefined,
                        }}
                        title={`${DAY_LABELS[day]} ${hour}:00 — ${formatPrice(rev)}`}
                      >
                        {rev > 0 && rev >= maxHeat * 0.1 ? Math.round(rev) : ""}
                      </div>
                    );
                  })}
                </div>
              ))}
              <div className="mt-3 flex items-center gap-2 text-[10px] text-muted-foreground">
                <span>Χαμηλό</span>
                <div className="flex h-3 w-32">
                  {[0.15, 0.3, 0.45, 0.6, 0.75].map((i) => (
                    <div
                      key={i}
                      className="flex-1"
                      style={{ backgroundColor: `rgba(59, 130, 246, ${i})` }}
                    />
                  ))}
                </div>
                <span>Υψηλό</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
