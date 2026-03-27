"use client";

import { useInventory } from "@/hooks/use-inventory";

export function StockAlertBadge() {
  const { getLowStockCount } = useInventory();
  const count = getLowStockCount();
  if (count === 0) return null;
  return (
    <span className="ml-auto flex size-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
      {count}
    </span>
  );
}
