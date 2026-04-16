"use client";

import { Minus, Plus, Trash2, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { OrderItemWithModifiers } from "@/lib/types/database";

interface OrderItemCardProps {
  item: OrderItemWithModifiers;
  onIncrement: (itemId: string) => void;
  onDecrement: (itemId: string) => void;
  onRemove: (itemId: string) => void;
  disabled?: boolean;
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat("el-GR", {
    style: "currency",
    currency: "EUR",
  }).format(price);
}

const statusStyles: Record<OrderItemWithModifiers["status"], string> = {
  pending: "border-border bg-card",
  preparing: "border-amber-500/40 bg-amber-500/10",
  ready: "border-emerald-500/40 bg-emerald-500/10",
  served: "border-border bg-muted/50 opacity-60",
};

const statusLabels: Record<OrderItemWithModifiers["status"], string> = {
  pending: "Εκκρεμεί",
  preparing: "Ετοιμάζεται",
  ready: "Έτοιμο",
  served: "Σερβιρίστηκε",
};

export function OrderItemCard({
  item,
  onIncrement,
  onDecrement,
  onRemove,
  disabled = false,
}: OrderItemCardProps) {
  const modifierTotal = item.order_item_modifiers.reduce(
    (s, m) => s + m.price,
    0,
  );
  const lineTotal = (item.price + modifierTotal) * item.quantity;
  const isEditable = item.status === "pending" && !disabled;

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-lg border p-3 transition-colors",
        statusStyles[item.status],
      )}
    >
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-start justify-between gap-2">
          <p className="font-medium text-sm leading-tight truncate">
            {item.product_name}
          </p>
          <p className="font-semibold text-sm whitespace-nowrap">
            {formatPrice(lineTotal)}
          </p>
        </div>

        {item.order_item_modifiers.length > 0 && (
          <p className="text-xs text-amber-700 dark:text-amber-400">
            + {item.order_item_modifiers.map((m) => m.name).join(", ")}
          </p>
        )}

        {item.notes && (
          <p className="flex items-start gap-1 text-xs text-muted-foreground italic">
            <MessageSquare className="size-3 mt-0.5 shrink-0" />
            <span>{item.notes}</span>
          </p>
        )}

        <div className="flex items-center justify-between pt-1">
          <span className="text-xs text-muted-foreground">
            {formatPrice(item.price + modifierTotal)} × {item.quantity}
          </span>

          {isEditable ? (
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="size-7"
                onClick={() => onDecrement(item.id)}
                disabled={item.quantity <= 1}
              >
                <Minus className="size-3" />
              </Button>
              <span className="w-6 text-center text-sm font-medium">
                {item.quantity}
              </span>
              <Button
                variant="outline"
                size="icon"
                className="size-7"
                onClick={() => onIncrement(item.id)}
              >
                <Plus className="size-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-7 text-destructive"
                onClick={() => onRemove(item.id)}
              >
                <Trash2 className="size-3" />
              </Button>
            </div>
          ) : (
            <Badge variant="outline" className="text-xs">
              {statusLabels[item.status]}
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}
