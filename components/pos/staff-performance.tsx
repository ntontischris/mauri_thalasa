"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trophy, TrendingUp, Receipt, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { ROLE_LABELS } from "@/lib/auth/roles";
import type { StaffPerformanceRow } from "@/lib/queries/staff-performance";

type Period = "today" | "week" | "month";

interface StaffPerformanceProps {
  rows: StaffPerformanceRow[];
}

function formatPrice(n: number): string {
  return new Intl.NumberFormat("el-GR", {
    style: "currency",
    currency: "EUR",
  }).format(n);
}

export function StaffPerformance({ rows }: StaffPerformanceProps) {
  const [period, setPeriod] = useState<Period>("month");

  const pick = (r: StaffPerformanceRow) => {
    if (period === "today")
      return { orders: r.orders_today, revenue: r.revenue_today };
    if (period === "week")
      return { orders: r.orders_week, revenue: r.revenue_week };
    return { orders: r.orders_month, revenue: r.revenue_month };
  };

  // Rank by period revenue
  const ranked = [...rows]
    .map((r) => ({ ...r, _pick: pick(r) }))
    .sort((a, b) => b._pick.revenue - a._pick.revenue);

  const topRevenue = ranked[0]?._pick.revenue ?? 0;

  const totals = ranked.reduce(
    (acc, r) => {
      acc.orders += r._pick.orders;
      acc.revenue += r._pick.revenue;
      return acc;
    },
    { orders: 0, revenue: 0 },
  );

  const periodLabels: Record<Period, string> = {
    today: "Σήμερα",
    week: "Εβδομάδα",
    month: "Μήνας",
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Απόδοση Προσωπικού</h2>
          <p className="text-xs text-muted-foreground">
            Κατάταξη ανά τζίρο — ενεργοί υπάλληλοι
          </p>
        </div>
        <div className="flex gap-1 rounded-md border p-0.5">
          {(["today", "week", "month"] as Period[]).map((p) => (
            <Button
              key={p}
              size="sm"
              variant={period === p ? "default" : "ghost"}
              className="h-7 px-3 text-xs"
              onClick={() => setPeriod(p)}
            >
              {periodLabels[p]}
            </Button>
          ))}
        </div>
      </div>

      {/* Summary */}
      <div className="grid gap-3 sm:grid-cols-2">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Receipt className="size-5" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Σύνολο παραγγελιών
              </p>
              <p className="text-xl font-bold">{totals.orders}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <TrendingUp className="size-5" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Σύνολο τζίρου
              </p>
              <p className="text-xl font-bold">{formatPrice(totals.revenue)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Ranking */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Κατάταξη</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {ranked.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Κανένας υπάλληλος δεν έχει ενεργή παραγγελία για αυτή την περίοδο.
            </p>
          ) : (
            ranked.map((r, idx) => {
              const pct =
                topRevenue > 0 ? (r._pick.revenue / topRevenue) * 100 : 0;
              const isTop = idx === 0 && r._pick.revenue > 0;
              return (
                <div
                  key={r.staff_id}
                  className="flex items-center gap-3 rounded-lg border p-3"
                >
                  <div
                    className={cn(
                      "flex size-8 shrink-0 items-center justify-center rounded-full font-bold text-sm",
                      isTop
                        ? "bg-amber-500/20 text-amber-600 dark:text-amber-400"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {isTop ? <Trophy className="size-4" /> : `#${idx + 1}`}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold truncate">{r.name}</p>
                      <Badge variant="outline" className="text-[10px]">
                        {ROLE_LABELS[r.role]}
                      </Badge>
                    </div>
                    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full bg-primary"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="mt-1 flex gap-4 text-xs text-muted-foreground">
                      <span>{r._pick.orders} παραγγελίες</span>
                      <span>
                        Μέσος λογ.:{" "}
                        {formatPrice(
                          r._pick.orders > 0
                            ? r._pick.revenue / r._pick.orders
                            : 0,
                        )}
                      </span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="text-lg font-bold">
                      {formatPrice(r._pick.revenue)}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* Detailed breakdown */}
      <details className="rounded-lg border">
        <summary className="flex cursor-pointer items-center justify-between p-4 text-sm font-medium hover:bg-muted/50">
          <span>Αναλυτικά ανά υπάλληλο (Σήμερα / Εβδομάδα / Μήνας)</span>
          <ChevronDown className="size-4" />
        </summary>
        <div className="overflow-x-auto border-t">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-3 py-2 text-left">Όνομα</th>
                <th className="px-3 py-2 text-right">Σήμερα</th>
                <th className="px-3 py-2 text-right">Εβδομάδα</th>
                <th className="px-3 py-2 text-right">Μήνας</th>
                <th className="px-3 py-2 text-right">Μέσος λογ.</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.staff_id} className="border-t">
                  <td className="px-3 py-2 font-medium">
                    {r.name}
                    <span className="ml-2 text-xs text-muted-foreground">
                      {ROLE_LABELS[r.role]}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    {r.orders_today > 0 ? (
                      <>
                        <div className="font-semibold">
                          {formatPrice(r.revenue_today)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {r.orders_today} παραγγ.
                        </div>
                      </>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {r.orders_week > 0 ? (
                      <>
                        <div className="font-semibold">
                          {formatPrice(r.revenue_week)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {r.orders_week} παραγγ.
                        </div>
                      </>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {r.orders_month > 0 ? (
                      <>
                        <div className="font-semibold">
                          {formatPrice(r.revenue_month)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {r.orders_month} παραγγ.
                        </div>
                      </>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right text-muted-foreground">
                    {formatPrice(r.avg_ticket_month)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
