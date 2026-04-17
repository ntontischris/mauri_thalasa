"use client";

import Link from "next/link";
import {
  ChevronRight,
  AlertTriangle,
  Clock,
  Receipt,
  ChefHat,
  CircleCheck,
  Sparkles,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ActiveOrderSummary } from "@/lib/queries/orders";

function formatPrice(price: number): string {
  return new Intl.NumberFormat("el-GR", {
    style: "currency",
    currency: "EUR",
  }).format(price);
}

function formatElapsed(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  const mins = Math.floor(seconds / 60);
  if (mins < 1) return "τώρα";
  if (mins < 60) return `${mins}'`;
  const hours = Math.floor(mins / 60);
  const rest = mins % 60;
  return `${hours}h ${rest}'`;
}

function elapsedMinutes(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
}

export type OrderBucket = "attention" | "kitchen" | "new";

export function classifyOrder(order: ActiveOrderSummary): OrderBucket {
  if (
    order.table_status === "bill-requested" ||
    (order.ready_count > 0 &&
      order.oldest_ready_at &&
      elapsedMinutes(order.oldest_ready_at) >= 2)
  ) {
    return "attention";
  }
  if (order.preparing_count > 0 || order.ready_count > 0) {
    return "kitchen";
  }
  return "new";
}

interface OrderCardProps {
  order: ActiveOrderSummary;
  showWaiter?: string;
}

interface OrderReason {
  text: string;
  hint: string;
  icon: React.ReactNode;
  tone: "red" | "amber" | "emerald" | "muted";
}

function buildReason(order: ActiveOrderSummary): OrderReason {
  const isBillRequested = order.table_status === "bill-requested";
  if (isBillRequested) {
    return {
      text: "Φέρε τον λογαριασμό",
      hint: "Ο πελάτης ζήτησε να πληρώσει",
      icon: <Receipt className="size-4" />,
      tone: "red",
    };
  }
  if (order.ready_count > 0 && order.oldest_ready_at) {
    const mins = elapsedMinutes(order.oldest_ready_at);
    if (mins >= 5) {
      return {
        text: `Σέρβιρε τώρα — κρυώνει (${mins}')`,
        hint: `${order.ready_count} έτοιμα πιάτα περιμένουν`,
        icon: <AlertTriangle className="size-4" />,
        tone: "red",
      };
    }
    return {
      text: `${order.ready_count} έτοιμα — σέρβιρε`,
      hint: `Αναμονή ${formatElapsed(order.oldest_ready_at)}`,
      icon: <CircleCheck className="size-4" />,
      tone: "red",
    };
  }
  if (order.preparing_count > 0) {
    return {
      text: `${order.preparing_count} στην κουζίνα`,
      hint: `Ετοιμάζονται ${order.preparing_count} πιάτα`,
      icon: <ChefHat className="size-4" />,
      tone: "amber",
    };
  }
  if (order.pending_count > 0) {
    return {
      text: `${order.pending_count} εκκρεμούν αποστολή`,
      hint: "Στείλε τα στην κουζίνα",
      icon: <ChefHat className="size-4" />,
      tone: "amber",
    };
  }
  return {
    text: "Μόλις άνοιξε",
    hint: "Προσθέτει είδη",
    icon: <Sparkles className="size-4" />,
    tone: "emerald",
  };
}

export function OrderCard({ order, showWaiter }: OrderCardProps) {
  const bucket = classifyOrder(order);
  const reason = buildReason(order);

  const badgeColor: Record<OrderBucket, string> = {
    attention: "border-red-500/50 bg-red-500/10 text-red-700 dark:text-red-400",
    kitchen:
      "border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-400",
    new: "border-emerald-500/50 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  };

  const reasonTone: Record<OrderReason["tone"], string> = {
    red: "text-red-700 dark:text-red-400",
    amber: "text-amber-700 dark:text-amber-400",
    emerald: "text-emerald-700 dark:text-emerald-400",
    muted: "text-muted-foreground",
  };

  return (
    <Link href={`/orders/${order.table_id}`} className="block">
      <Card
        className={cn(
          "transition hover:border-primary/60 hover:shadow-md",
          bucket === "attention" && "border-red-500/40",
          order.is_rush && "ring-1 ring-red-500",
        )}
      >
        <CardContent className="flex items-center gap-3 p-4">
          <div
            className={cn(
              "flex size-12 shrink-0 items-center justify-center rounded-full font-bold text-lg",
              badgeColor[bucket],
            )}
          >
            {order.table_number}
          </div>

          <div className="flex-1 min-w-0 space-y-0.5">
            <div className="flex items-center gap-2">
              <p className="font-semibold truncate">
                Τραπέζι {order.table_number}
              </p>
              {order.is_rush && (
                <AlertTriangle className="size-4 text-red-500 shrink-0" />
              )}
              {showWaiter && (
                <Badge variant="outline" className="text-[10px]">
                  {showWaiter}
                </Badge>
              )}
            </div>
            <div
              className={cn(
                "flex items-center gap-1.5 text-sm font-medium",
                reasonTone[reason.tone],
              )}
            >
              {reason.icon}
              <span className="truncate">{reason.text}</span>
            </div>
            <p className="text-xs text-muted-foreground truncate">
              {reason.hint}
            </p>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="size-3" />
                {formatElapsed(order.created_at)}
              </span>
              <span>{order.item_count} είδη</span>
            </div>
          </div>

          <div className="flex flex-col items-end gap-1 shrink-0">
            <span className="font-bold text-lg">
              {formatPrice(order.total)}
            </span>
            <ChevronRight className="size-4 text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export function OrderBucketSection({
  title,
  orders,
  waiterNames,
  tone,
  emptyMessage,
}: {
  title: string;
  orders: ActiveOrderSummary[];
  waiterNames?: Map<string, string>;
  tone: "red" | "amber" | "emerald" | "muted";
  emptyMessage?: string;
}) {
  if (orders.length === 0 && !emptyMessage) return null;

  const toneClass = {
    red: "text-red-600 dark:text-red-400",
    amber: "text-amber-600 dark:text-amber-400",
    emerald: "text-emerald-600 dark:text-emerald-400",
    muted: "text-muted-foreground",
  }[tone];

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <h2
          className={cn(
            "text-sm font-semibold uppercase tracking-wide",
            toneClass,
          )}
        >
          {title}
        </h2>
        <Badge variant="outline">{orders.length}</Badge>
      </div>
      {orders.length === 0 ? (
        <p className="py-4 text-center text-xs italic text-muted-foreground">
          {emptyMessage}
        </p>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {orders.map((o) => (
            <OrderCard
              key={o.id}
              order={o}
              showWaiter={
                waiterNames && o.created_by
                  ? waiterNames.get(o.created_by)
                  : undefined
              }
            />
          ))}
        </div>
      )}
    </section>
  );
}
