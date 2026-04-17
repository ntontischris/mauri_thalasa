"use client";

import { Minus, Plus, X, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { OrderItemWithModifiers } from "@/lib/types/database";

interface OrderItemCardProps {
  item: OrderItemWithModifiers;
  onUpdateQuantity: (itemId: string, quantity: number) => void;
  onRemove: (itemId: string) => void;
  disabled?: boolean;
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat("el-GR", {
    style: "currency",
    currency: "EUR",
  }).format(price);
}

const statusColors: Record<OrderItemWithModifiers["status"], string> = {
  pending: "bg-muted",
  preparing: "bg-amber-500/15 border-amber-500/40",
  ready: "bg-primary/15 border-primary/40",
  served: "bg-muted opacity-50",
};

export function OrderItemCard({
  item,
  onUpdateQuantity,
  onRemove,
  disabled = false,
}: OrderItemCardProps) {
  const modifierTotal = item.order_item_modifiers.reduce(
    (sum, m) => sum + m.price,
    0,
  );
  const itemTotal = (item.price + modifierTotal) * item.quantity;

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg border p-3",
        statusColors[item.status],
      )}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="font-medium text-foreground truncate">
              {item.product_name}
            </p>
            {item.order_item_modifiers.length > 0 && (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                {item.order_item_modifiers.map((m) => m.name).join(", ")}
              </p>
            )}
            <p className="text-sm text-muted-foreground">
              {formatPrice(item.price + modifierTotal)} × {item.quantity}
            </p>
          </div>
          <p className="font-semibold text-foreground whitespace-nowrap">
            {formatPrice(itemTotal)}
          </p>
        </div>
        {item.notes && (
          <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            <MessageSquare className="size-3" />
            <span className="truncate">{item.notes}</span>
          </div>
        )}
      </div>

      {item.status === "pending" && !disabled && (
        <div className="flex items-center gap-1 shrink-0">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-8"
            onClick={() => {
              if (item.quantity === 1) {
                onRemove(item.id);
              } else {
                onUpdateQuantity(item.id, item.quantity - 1);
              }
            }}
          >
            {item.quantity === 1 ? (
              <X className="size-4" />
            ) : (
              <Minus className="size-4" />
            )}
          </Button>
          <span className="w-8 text-center font-medium">{item.quantity}</span>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-8"
            onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
          >
            <Plus className="size-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
