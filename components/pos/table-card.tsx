"use client";

import { Users } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Table } from "@/lib/types";

interface TableCardProps {
  table: Table;
  onClick: () => void;
}

const statusConfig = {
  available: {
    label: "Διαθέσιμο",
    bgClass: "bg-secondary hover:bg-secondary/80",
    borderClass: "border-border",
    textClass: "text-muted-foreground",
  },
  occupied: {
    label: "Κατειλημμένο",
    bgClass: "bg-primary/10 hover:bg-primary/20",
    borderClass: "border-primary/50",
    textClass: "text-primary",
  },
  "bill-requested": {
    label: "Λογαριασμός",
    bgClass: "bg-accent/10 hover:bg-accent/20",
    borderClass: "border-accent/50",
    textClass: "text-accent",
  },
  dirty: {
    label: "Βρώμικο",
    bgClass: "bg-muted hover:bg-muted/80",
    borderClass: "border-muted-foreground/30",
    textClass: "text-muted-foreground",
  },
};

export function TableCard({ table, onClick }: TableCardProps) {
  const config = statusConfig[table.status];

  return (
    <button
      onClick={onClick}
      className={cn(
        "relative flex flex-col items-center justify-center rounded-xl border-2 p-6 transition-all duration-200 min-h-[140px] w-full",
        "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background",
        "active:scale-95",
        config.bgClass,
        config.borderClass,
      )}
    >
      <span className="text-3xl font-bold text-foreground">{table.number}</span>
      <div className="mt-2 flex items-center gap-1 text-sm text-muted-foreground">
        <Users className="size-4" />
        <span>{table.capacity}</span>
      </div>
      <span className={cn("mt-2 text-xs font-medium", config.textClass)}>
        {config.label}
      </span>
    </button>
  );
}
