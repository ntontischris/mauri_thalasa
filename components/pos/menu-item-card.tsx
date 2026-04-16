"use client";

import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DbProduct } from "@/lib/types/database";

interface MenuItemCardProps {
  product: DbProduct;
  onClick: (product: DbProduct) => void;
  disabled?: boolean;
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat("el-GR", {
    style: "currency",
    currency: "EUR",
  }).format(price);
}

const stationLabel: Record<DbProduct["station"], string> = {
  hot: "Κουζίνα",
  cold: "Κρύα",
  bar: "Μπαρ",
  dessert: "Γλυκά",
};

export function MenuItemCard({
  product,
  onClick,
  disabled = false,
}: MenuItemCardProps) {
  const unavailable = !product.available;
  const isDisabled = disabled || unavailable;

  return (
    <button
      onClick={() => onClick(product)}
      disabled={isDisabled}
      className={cn(
        "flex flex-col rounded-xl border border-border bg-card p-4 text-left transition-all duration-200",
        "hover:border-primary/50 hover:bg-card/80",
        "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background",
        "active:scale-95",
        isDisabled &&
          "opacity-50 cursor-not-allowed hover:border-border hover:bg-card",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-foreground leading-tight">
            {product.name}
          </p>
          {product.description && (
            <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
              {product.description}
            </p>
          )}
        </div>
        <div
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-full",
            !isDisabled
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground",
          )}
        >
          <Plus className="size-4" />
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between gap-2 text-xs">
        <span className="text-lg font-semibold text-foreground">
          {formatPrice(product.price)}
        </span>
        <div className="flex items-center gap-1 text-muted-foreground">
          <span>{stationLabel[product.station]}</span>
          <span>·</span>
          <span>ΦΠΑ {product.vat_rate}%</span>
        </div>
      </div>
      {unavailable && (
        <span className="mt-2 text-xs font-medium text-destructive">
          Εξαντλήθηκε
        </span>
      )}
    </button>
  );
}
