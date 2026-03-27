"use client";

import { cn } from "@/lib/utils";
import { formatPrice } from "@/lib/mock-data";
import type { Modifier, SelectedModifier } from "@/lib/types";

interface ModifierChipsProps {
  modifiers: Modifier[];
  selected: SelectedModifier[];
  onToggle: (modifier: Modifier) => void;
}

export function ModifierChips({
  modifiers,
  selected,
  onToggle,
}: ModifierChipsProps) {
  if (modifiers.length === 0) return null;

  const isSelected = (modifierId: string) =>
    selected.some((s) => s.modifierId === modifierId);

  return (
    <div className="space-y-2">
      <p className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
        Modifiers
      </p>
      <div className="flex flex-wrap gap-2">
        {modifiers.map((modifier) => {
          const active = isSelected(modifier.id);
          return (
            <button
              key={modifier.id}
              onClick={() => onToggle(modifier)}
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
