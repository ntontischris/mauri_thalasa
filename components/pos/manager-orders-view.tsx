"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Plus,
  TrendingUp,
  Euro,
  Users,
  ChefHat,
  BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { OrderBucketSection, classifyOrder } from "./orders-dashboard-card";
import type { ActiveOrderSummary, DailyOrderStats } from "@/lib/queries/orders";

interface ManagerOrdersViewProps {
  orders: ActiveOrderSummary[];
  stats: DailyOrderStats;
  waiterNames: Record<string, string>;
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat("el-GR", {
    style: "currency",
    currency: "EUR",
  }).format(price);
}

export function ManagerOrdersView({
  orders,
  stats,
  waiterNames,
}: ManagerOrdersViewProps) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(interval);
  }, []);

  const nameMap = new Map(Object.entries(waiterNames));

  const buckets = {
    attention: [] as ActiveOrderSummary[],
    kitchen: [] as ActiveOrderSummary[],
    new: [] as ActiveOrderSummary[],
  };
  for (const o of orders) buckets[classifyOrder(o)].push(o);

  const activeWaiters = new Set(
    orders.map((o) => o.created_by).filter((v): v is string => Boolean(v)),
  ).size;

  const kitchenItems = orders.reduce(
    (s, o) => s + o.pending_count + o.preparing_count,
    0,
  );

  const activeRevenue = orders.reduce((s, o) => s + o.total, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Παραγγελίες — Διευθυντής</h1>
          <p className="text-sm text-muted-foreground">
            Συνολική εικόνα εστιατορίου
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/reports">
              <BarChart3 className="mr-2 size-4" />
              Αναφορές
            </Link>
          </Button>
          <Button asChild>
            <Link href="/tables">
              <Plus className="mr-2 size-4" />
              Νέα
            </Link>
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={<Euro className="size-5" />}
          label="Τζίρος σήμερα"
          value={formatPrice(stats.revenue)}
          hint={`${stats.count} ολοκληρωμένες`}
        />
        <KpiCard
          icon={<TrendingUp className="size-5" />}
          label="Μέσος λογαριασμός"
          value={formatPrice(stats.avgTicket)}
          hint="ανά παραγγελία"
        />
        <KpiCard
          icon={<Users className="size-5" />}
          label="Ενεργές παραγγελίες"
          value={String(orders.length)}
          hint={`${activeWaiters} σερβιτόροι · ${formatPrice(activeRevenue)}`}
        />
        <KpiCard
          icon={<ChefHat className="size-5" />}
          label="Στην κουζίνα"
          value={String(kitchenItems)}
          hint={`${buckets.attention.length} χρειάζονται προσοχή`}
          tone={buckets.attention.length > 0 ? "red" : "default"}
        />
      </div>

      {/* Alerts for attention */}
      {buckets.attention.length > 0 && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/5 p-4">
          <p className="text-sm font-medium text-red-700 dark:text-red-400">
            ⚠ {buckets.attention.length}{" "}
            {buckets.attention.length === 1 ? "τραπέζι" : "τραπέζια"}{" "}
            χρειάζονται προσοχή
          </p>
        </div>
      )}

      {/* Active orders by bucket */}
      {orders.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
            <Users className="mb-4 size-12 opacity-40" />
            <p>Κανένα ενεργό τραπέζι αυτή τη στιγμή</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-5">
          <OrderBucketSection
            title="Χρειάζονται Προσοχή"
            orders={buckets.attention}
            waiterNames={nameMap}
            tone="red"
          />
          <OrderBucketSection
            title="Στην Κουζίνα"
            orders={buckets.kitchen}
            waiterNames={nameMap}
            tone="amber"
          />
          <OrderBucketSection
            title="Νέες"
            orders={buckets.new}
            waiterNames={nameMap}
            tone="emerald"
          />
        </div>
      )}
    </div>
  );
}

function KpiCard({
  icon,
  label,
  value,
  hint,
  tone = "default",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "red";
}) {
  return (
    <Card
      className={tone === "red" ? "border-red-500/40 bg-red-500/5" : undefined}
    >
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div
            className={`flex size-10 items-center justify-center rounded-full ${
              tone === "red"
                ? "bg-red-500/20 text-red-600 dark:text-red-400"
                : "bg-primary/10 text-primary"
            }`}
          >
            {icon}
          </div>
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              {label}
            </p>
            <p className="text-xl font-bold leading-tight">{value}</p>
            {hint && (
              <p className="text-xs text-muted-foreground truncate">{hint}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
