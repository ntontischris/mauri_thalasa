"use client";

import { useState, useEffect, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, ChefHat, Clock, Flame } from "lucide-react";
import { toast } from "sonner";
import { useRealtimeKitchen } from "@/lib/hooks/use-realtime-kitchen";
import { updateItemStatus } from "@/lib/actions/orders";
import type {
  KitchenItem,
  StationType,
  OrderItemStatus,
  DbCourse,
} from "@/lib/types/database";

interface KitchenDisplayProps {
  initialItems: KitchenItem[];
  courses?: DbCourse[];
}

type StationFilter = StationType | "all";

const stationLabels: Record<StationType, string> = {
  hot: "Κουζίνα",
  cold: "Κρύα",
  bar: "Μπαρ",
  dessert: "Γλυκά",
};

function getElapsedMinutes(createdAt: string): number {
  return Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000);
}

function getTimerColor(minutes: number): string {
  if (minutes < 5) return "text-emerald-500 border-emerald-500/50";
  if (minutes < 10) return "text-amber-500 border-amber-500/50";
  if (minutes < 15) return "text-orange-500 border-orange-500/50";
  return "text-red-500 border-red-500/50 animate-pulse";
}

function formatTimer(createdAt: string): string {
  const totalSeconds = Math.floor(
    (Date.now() - new Date(createdAt).getTime()) / 1000,
  );
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function KitchenDisplay({
  initialItems,
  courses = [],
}: KitchenDisplayProps) {
  const courseBySortOrder = new Map<number, DbCourse>();
  for (const c of courses) courseBySortOrder.set(c.sort_order, c);
  const items = useRealtimeKitchen(initialItems);
  const [station, setStation] = useState<StationFilter>("all");
  const [isPending, startTransition] = useTransition();
  const [, setTick] = useState(0);

  // Update timers every second
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const filteredItems =
    station === "all" ? items : items.filter((i) => i.station === station);

  // Group items by order
  const orderGroups = new Map<
    string,
    { tableNumber: number; items: KitchenItem[] }
  >();

  for (const item of filteredItems) {
    const group = orderGroups.get(item.order_id) ?? {
      tableNumber: item.table_number,
      items: [],
    };
    group.items.push(item);
    orderGroups.set(item.order_id, group);
  }

  const handleStatusChange = (itemId: string, newStatus: OrderItemStatus) => {
    startTransition(async () => {
      const result = await updateItemStatus({
        itemId,
        status: newStatus,
      });
      if (!result.success) {
        toast.error(result.error);
      }
    });
  };

  const stationCounts = {
    all: items.length,
    hot: items.filter((i) => i.station === "hot").length,
    cold: items.filter((i) => i.station === "cold").length,
    bar: items.filter((i) => i.station === "bar").length,
    dessert: items.filter((i) => i.station === "dessert").length,
  };

  return (
    <div>
      <Tabs
        value={station}
        onValueChange={(v) => setStation(v as StationFilter)}
      >
        <TabsList>
          <TabsTrigger value="all">Όλα ({stationCounts.all})</TabsTrigger>
          {(Object.keys(stationLabels) as StationType[]).map((s) => (
            <TabsTrigger key={s} value={s}>
              {stationLabels[s]} ({stationCounts[s]})
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {orderGroups.size === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <ChefHat className="mb-4 size-12 opacity-30" />
          <p>Δεν υπάρχουν παραγγελίες</p>
        </div>
      ) : (
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from(orderGroups.entries())
            .filter(([, group]) => group.items.length > 0)
            .map(([orderId, { tableNumber, items: orderItems }]) => {
              const oldestItem = orderItems.reduce(
                (oldest, item) =>
                  item.created_at < oldest.created_at ? item : oldest,
                orderItems[0],
              );
              const minutes = getElapsedMinutes(oldestItem.created_at);
              const timerColor = getTimerColor(minutes);

              return (
                <Card
                  key={orderId}
                  className={`border-2 ${timerColor.split(" ").slice(1).join(" ")}`}
                >
                  <CardHeader className="flex flex-row items-center justify-between pb-2 pt-3 px-4">
                    <CardTitle className="text-base">
                      Τραπέζι {tableNumber}
                    </CardTitle>
                    <div
                      className={`flex items-center gap-1 text-sm font-mono font-bold ${timerColor.split(" ")[0]}`}
                    >
                      <Clock className="size-3.5" />
                      {formatTimer(oldestItem.created_at)}
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-3 px-4 pb-3">
                    {(() => {
                      // Group items by course
                      const byCourse = new Map<number, KitchenItem[]>();
                      for (const item of orderItems) {
                        const list = byCourse.get(item.course) ?? [];
                        list.push(item);
                        byCourse.set(item.course, list);
                      }
                      const courseGroups = Array.from(byCourse.entries()).sort(
                        ([a], [b]) => a - b,
                      );
                      const showCourseLabels =
                        courseGroups.length > 1 ||
                        (courseGroups[0] && courseGroups[0][0] > 1);

                      return courseGroups.map(([courseNumber, courseItems]) => {
                        const course = courseBySortOrder.get(courseNumber);
                        const courseName =
                          course?.name ?? `Πιάτο ${courseNumber}`;
                        const courseColor = course?.color ?? null;

                        return (
                          <div key={courseNumber} className="space-y-1.5">
                            {showCourseLabels && (
                              <div className="flex items-center gap-2 pt-1">
                                <div
                                  className="h-px flex-1"
                                  style={{
                                    backgroundColor:
                                      courseColor ??
                                      "rgb(var(--primary) / 0.3)",
                                  }}
                                />
                                <span
                                  className="text-xs font-bold uppercase tracking-wider"
                                  style={{
                                    color: courseColor ?? undefined,
                                  }}
                                >
                                  {courseName}
                                </span>
                                <div
                                  className="h-px flex-1"
                                  style={{
                                    backgroundColor:
                                      courseColor ??
                                      "rgb(var(--primary) / 0.3)",
                                  }}
                                />
                              </div>
                            )}
                            {courseItems.map((item) => (
                              <div
                                key={item.id}
                                className="flex items-center gap-2 rounded-md bg-muted/50 p-2"
                              >
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <Badge
                                      variant="outline"
                                      className="text-[10px] px-1"
                                    >
                                      ×{item.quantity}
                                    </Badge>
                                    <span className="text-sm font-medium truncate">
                                      {item.product_name}
                                    </span>
                                  </div>
                                  {item.order_item_modifiers.length > 0 && (
                                    <p className="text-xs text-amber-600 ml-7">
                                      {item.order_item_modifiers
                                        .map((m) => m.name)
                                        .join(", ")}
                                    </p>
                                  )}
                                  {item.notes && (
                                    <p className="text-xs text-muted-foreground italic ml-7">
                                      {item.notes}
                                    </p>
                                  )}
                                </div>

                                {item.status === "pending" && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="shrink-0"
                                    onClick={() =>
                                      handleStatusChange(item.id, "preparing")
                                    }
                                    disabled={isPending}
                                  >
                                    <Flame className="mr-1 size-3" />
                                    Ξεκίνα
                                  </Button>
                                )}

                                {item.status === "preparing" && (
                                  <Button
                                    size="sm"
                                    className="shrink-0"
                                    onClick={() =>
                                      handleStatusChange(item.id, "ready")
                                    }
                                    disabled={isPending}
                                  >
                                    <Check className="mr-1 size-3" />
                                    Έτοιμο
                                  </Button>
                                )}
                              </div>
                            ))}
                          </div>
                        );
                      });
                    })()}
                  </CardContent>
                </Card>
              );
            })}
        </div>
      )}
    </div>
  );
}
