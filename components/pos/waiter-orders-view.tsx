"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, TrendingUp, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { OrderBucketSection, classifyOrder } from "./orders-dashboard-card";
import type { ActiveOrderSummary, DailyOrderStats } from "@/lib/queries/orders";

interface WaiterOrdersViewProps {
  orders: ActiveOrderSummary[];
  stats: DailyOrderStats;
  waiterName: string;
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat("el-GR", {
    style: "currency",
    currency: "EUR",
  }).format(price);
}

export function WaiterOrdersView({
  orders,
  stats,
  waiterName,
}: WaiterOrdersViewProps) {
  // Force re-render every 30s so elapsed timers stay fresh
  const [, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(interval);
  }, []);

  const buckets = {
    attention: [] as ActiveOrderSummary[],
    kitchen: [] as ActiveOrderSummary[],
    new: [] as ActiveOrderSummary[],
  };

  for (const o of orders) {
    buckets[classifyOrder(o)].push(o);
  }

  return (
    <div className="space-y-6">
      {/* Header with new-order CTA */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">Καλώς ήρθες,</p>
          <h1 className="text-2xl font-bold">{waiterName}</h1>
        </div>
        <Button size="lg" asChild>
          <Link href="/tables">
            <Plus className="mr-2 size-5" />
            Νέα Παραγγελία
          </Link>
        </Button>
      </div>

      {/* Priority-bucketed orders */}
      {orders.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Receipt className="mb-4 size-12 text-muted-foreground opacity-40" />
            <p className="text-muted-foreground">
              Δεν έχεις ενεργές παραγγελίες
            </p>
            <Button variant="outline" className="mt-4" asChild>
              <Link href="/tables">
                <Plus className="mr-2 size-4" />
                Άνοιξε παραγγελία
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-5">
          <OrderBucketSection
            title="Χρειάζονται Προσοχή"
            orders={buckets.attention}
            tone="red"
          />
          <OrderBucketSection
            title="Στην Κουζίνα"
            orders={buckets.kitchen}
            tone="amber"
          />
          <OrderBucketSection
            title="Νέες"
            orders={buckets.new}
            tone="emerald"
          />
        </div>
      )}

      {/* Daily stats footer */}
      <Card className="bg-muted/30">
        <CardContent className="flex items-center justify-between gap-4 p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <TrendingUp className="size-4" />
            <span>Σήμερα</span>
          </div>
          <div className="flex gap-6 text-sm">
            <div>
              <span className="text-muted-foreground">Παραγγελίες: </span>
              <span className="font-semibold text-foreground">
                {stats.count}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Τζίρος: </span>
              <span className="font-semibold text-foreground">
                {formatPrice(stats.revenue)}
              </span>
            </div>
            <div className="hidden sm:block">
              <span className="text-muted-foreground">Μέσος: </span>
              <span className="font-semibold text-foreground">
                {formatPrice(stats.avgTicket)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
