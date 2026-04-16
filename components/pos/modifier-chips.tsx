"use client";

import { cn } from "@/lib/utils";
import type { DbModifier } from "@/lib/types/database";

interface ModifierChipsProps {
  modifiers: DbModifier[];
  selectedIds: string[];
  onToggle: (modifierId: string) => void;
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat("el-GR", {
    style: "currency",
    currency: "EUR",
  }).format(price);
}

export function ModifierChips({
  modifiers,
  selectedIds,
  onToggle,
}: ModifierChipsProps) {
  if (modifiers.length === 0) {
    return (
      <p className="text-sm text-muted-foreground italic">
        Κανένα modifier διαθέσιμο
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Επιλογές
      </p>
      <div className="flex flex-wrap gap-2">
        {modifiers.map((modifier) => {
          const active = selectedIds.includes(modifier.id);
          return (
            <button
              key={modifier.id}
              type="button"
              onClick={() => onToggle(modifier.id)}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-medium border transition-colors",
                active
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-muted text-muted-foreground border-border hover:border-primary/50",
              )}
            >
              {modifier.name}
              {modifier.price > 0 && (
                <span className="ml-1">+{formatPrice(modifier.price)}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
