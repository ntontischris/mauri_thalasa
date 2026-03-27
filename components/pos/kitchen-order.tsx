"use client";

import { Check, ChefHat, Bell, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatTime } from "@/lib/mock-data";
import type { Order, OrderItem } from "@/lib/types";

interface KitchenOrderCardProps {
  order: Order;
  timerColor: "green" | "amber" | "red";
  timerText: string;
  isCourseComplete: boolean;
  hasNextCourse: boolean;
  onItemStatusChange: (
    orderId: string,
    itemId: string,
    status: OrderItem["status"],
  ) => void;
  onMarkAllReady: (orderId: string) => void;
  onAdvanceCourse: (orderId: string) => void;
}

const borderColorMap = {
  green: "border-green-500",
  amber: "border-amber-500",
  red: "border-red-500",
} as const;

const headerBgMap = {
  green: "bg-green-500",
  amber: "bg-amber-500",
  red: "bg-red-500",
} as const;

export function KitchenOrderCard({
  order,
  timerColor,
  timerText,
  isCourseComplete,
  hasNextCourse,
  onItemStatusChange,
  onMarkAllReady,
  onAdvanceCourse,
}: KitchenOrderCardProps) {
  const isRush = order.isRush;
  const effectiveBorderColor = isRush
    ? "border-red-500"
    : borderColorMap[timerColor];
  const effectiveHeaderBg = isRush ? "bg-red-500" : headerBgMap[timerColor];

  const visibleItems = order.items.filter(
    (item) => item.course <= order.activeCourse && item.status !== "served",
  );

  const preparingItems = visibleItems.filter(
    (item) => item.status === "pending" || item.status === "preparing",
  );
  const readyItems = visibleItems.filter((item) => item.status === "ready");

  if (visibleItems.length === 0) return null;

  return (
    <Card
      className={cn(
        "transition-all duration-300 border-2 overflow-hidden",
        effectiveBorderColor,
        isRush && "animate-pulse shadow-lg shadow-red-500/30",
      )}
    >
      <CardHeader className={cn("px-4 py-3", effectiveHeaderBg)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-white">
              Τραπέζι {order.tableNumber}
            </span>
            {isRush && (
              <Badge className="bg-white/20 text-white border-white/30 text-xs font-bold">
                🚨 RUSH
              </Badge>
            )}
          </div>
          <Badge className="bg-white/20 text-white border-white/30 font-mono text-sm">
            {timerText}
          </Badge>
        </div>
        <p className="text-xs text-white/80 mt-1">
          Ώρα: {formatTime(order.createdAt)}
        </p>
      </CardHeader>

      <CardContent className="space-y-3 p-4">
        {/* Preparing Items */}
        {preparingItems.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase flex items-center gap-1">
              <ChefHat className="size-3" />
              Σε Προετοιμασία ({preparingItems.length})
            </p>
            {preparingItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-lg bg-muted/50 p-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">
                      ×{item.quantity} {item.productName}
                    </span>
                    {order.activeCourse > 1 && (
                      <span className="text-xs text-muted-foreground ml-2 shrink-0">
                        Course {item.course}
                      </span>
                    )}
                  </div>
                  {item.modifiers.length > 0 && (
                    <p className="text-sm font-bold text-amber-600">
                      {item.modifiers.map((m) => m.name).join(", ")}
                    </p>
                  )}
                  {item.notes && (
                    <p className="text-xs text-muted-foreground">
                      {item.notes}
                    </p>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="ml-2 shrink-0"
                  onClick={() => onItemStatusChange(order.id, item.id, "ready")}
                >
                  <Check className="size-4 mr-1" />
                  Έτοιμο
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Ready Items */}
        {readyItems.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-primary uppercase flex items-center gap-1">
              <Bell className="size-3" />
              Έτοιμα για Σερβίρισμα ({readyItems.length})
            </p>
            {readyItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-lg bg-primary/10 border border-primary/20 p-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">
                      ×{item.quantity} {item.productName}
                    </span>
                    {order.activeCourse > 1 && (
                      <span className="text-xs text-muted-foreground ml-2 shrink-0">
                        Course {item.course}
                      </span>
                    )}
                  </div>
                  {item.modifiers.length > 0 && (
                    <p className="text-sm font-bold text-amber-600">
                      {item.modifiers.map((m) => m.name).join(", ")}
                    </p>
                  )}
                  {item.notes && (
                    <p className="text-xs text-muted-foreground">
                      {item.notes}
                    </p>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="default"
                  className="ml-2 shrink-0"
                  onClick={() =>
                    onItemStatusChange(order.id, item.id, "served")
                  }
                >
                  Σερβιρίστηκε
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Actions Footer */}
      <div className="flex flex-wrap items-center gap-2 px-4 pb-4">
        {preparingItems.length > 0 && (
          <Button
            size="sm"
            onClick={() => onMarkAllReady(order.id)}
            className="bg-primary hover:bg-primary/90"
          >
            <Check className="size-4 mr-1" />
            Όλα Έτοιμα
          </Button>
        )}
        {isCourseComplete && hasNextCourse && (
          <Button
            size="sm"
            variant="default"
            className="bg-blue-600 hover:bg-blue-700"
            onClick={() => onAdvanceCourse(order.id)}
          >
            <ArrowRight className="size-4 mr-1" />
            Στείλε Course {order.activeCourse + 1}
          </Button>
        )}
      </div>
    </Card>
  );
}
