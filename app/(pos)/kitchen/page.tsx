"use client";

import { useEffect, useState } from "react";
import { usePOS } from "@/lib/pos-context";
import { useKitchen } from "@/hooks/use-kitchen";
import { KitchenOrderCard } from "@/components/pos/kitchen-order";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ChefHat, Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Station, OrderItem } from "@/lib/types";

type StationTab = Station | "all";

const stationTabs: { id: StationTab; label: string; icon: string }[] = [
  { id: "all", label: "Όλα", icon: "📋" },
  { id: "hot", label: "Ζεστή Κουζίνα", icon: "🔥" },
  { id: "cold", label: "Κρύα Κουζίνα", icon: "❄️" },
  { id: "bar", label: "Μπαρ", icon: "🍸" },
  { id: "dessert", label: "Γλυκά", icon: "🍰" },
];

export default function KitchenPage() {
  const { state } = usePOS();
  const {
    getKitchenOrders,
    getOrdersByStation,
    getTimerColor,
    formatTimer,
    updateItemStatus,
    markAllReady,
    advanceCourse,
    getStationCounts,
    isCourseComplete,
    hasNextCourse,
  } = useKitchen();

  const [activeStation, setActiveStation] = useState<StationTab>("all");
  const [, setTick] = useState(0);

  // Force re-render every 1 second for live MM:SS timers
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  if (!state.isLoaded) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const stationCounts = getStationCounts();

  const kitchenOrders =
    activeStation === "all"
      ? getKitchenOrders()
      : getOrdersByStation(activeStation);

  const sortedOrders = [...kitchenOrders].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );

  const handleItemStatusChange = (
    orderId: string,
    itemId: string,
    status: OrderItem["status"],
  ) => {
    updateItemStatus(orderId, itemId, status);
  };

  const handleMarkAllReady = (orderId: string) => {
    markAllReady(orderId);
  };

  const handleAdvanceCourse = (orderId: string) => {
    advanceCourse(orderId);
  };

  const getOldestNonServedCreatedAt = (
    order: (typeof sortedOrders)[number],
  ): string => {
    const nonServedItems = order.items.filter(
      (item) => item.status !== "served" && item.course <= order.activeCourse,
    );
    if (nonServedItems.length === 0) return order.createdAt;

    return nonServedItems.reduce(
      (oldest, item) =>
        new Date(item.createdAt) < new Date(oldest) ? item.createdAt : oldest,
      nonServedItems[0].createdAt,
    );
  };

  // Calculate stats
  const allKitchenOrders = getKitchenOrders();
  const allKitchenItems = allKitchenOrders.flatMap((o) =>
    o.items.filter(
      (i) =>
        (i.status === "preparing" || i.status === "ready") &&
        i.course <= o.activeCourse,
    ),
  );
  const preparingCount = allKitchenItems.filter(
    (i) => i.status === "preparing",
  ).length;
  const readyCount = allKitchenItems.filter((i) => i.status === "ready").length;

  return (
    <div className="space-y-6">
      {/* Header with stats */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Κουζίνα</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Οθόνη Προετοιμασίας Παραγγελιών
          </p>
        </div>

        <div className="flex gap-3">
          <Badge
            variant="outline"
            className="flex items-center gap-2 px-4 py-2 text-base"
          >
            <ChefHat className="size-5 text-warning" />
            <span>{preparingCount} σε προετοιμασία</span>
          </Badge>
          <Badge
            variant="outline"
            className="flex items-center gap-2 px-4 py-2 text-base border-primary/50"
          >
            <Bell className="size-5 text-primary" />
            <span>{readyCount} έτοιμα</span>
          </Badge>
        </div>
      </div>

      {/* Station Tabs */}
      <div className="flex flex-wrap gap-2">
        {stationTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveStation(tab.id)}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
              activeStation === tab.id
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80",
            )}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
            <Badge
              variant="secondary"
              className={cn(
                "ml-1 text-xs",
                activeStation === tab.id &&
                  "bg-primary-foreground/20 text-primary-foreground",
              )}
            >
              {stationCounts[tab.id]}
            </Badge>
          </button>
        ))}
      </div>

      {/* Order Cards Grid */}
      {sortedOrders.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <ChefHat className="size-16 text-muted-foreground/50" />
            <p className="mt-4 text-lg font-medium text-muted-foreground">
              Δεν υπάρχουν παραγγελίες
            </p>
            <p className="text-sm text-muted-foreground">
              Οι νέες παραγγελίες θα εμφανιστούν εδώ
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sortedOrders.map((order) => {
            const oldestCreatedAt = getOldestNonServedCreatedAt(order);
            const timerColor = order.isRush
              ? "red"
              : getTimerColor(oldestCreatedAt);
            const timerText = formatTimer(oldestCreatedAt);

            return (
              <KitchenOrderCard
                key={order.id}
                order={order}
                timerColor={timerColor}
                timerText={timerText}
                isCourseComplete={isCourseComplete(order)}
                hasNextCourse={hasNextCourse(order)}
                onItemStatusChange={handleItemStatusChange}
                onMarkAllReady={handleMarkAllReady}
                onAdvanceCourse={handleAdvanceCourse}
              />
            );
          })}
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-6 pt-4 text-sm border-t border-border">
        <div className="flex items-center gap-2">
          <div className="size-4 rounded-full bg-green-500" />
          <span className="text-muted-foreground">&lt; 5 λεπτά</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="size-4 rounded-full bg-amber-500" />
          <span className="text-muted-foreground">5-10 λεπτά</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="size-4 rounded-full bg-red-500" />
          <span className="text-muted-foreground">10+ λεπτά</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="size-4 rounded-full bg-red-500 animate-pulse" />
          <span className="text-muted-foreground">RUSH</span>
        </div>
      </div>
    </div>
  );
}
