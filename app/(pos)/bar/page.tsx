"use client";

import { Wine } from "lucide-react";
import { BarManager } from "@/components/pos/bar-manager";
import { usePOS } from "@/lib/pos-context";
import { Skeleton } from "@/components/ui/skeleton";

export default function BarPage() {
  const { state } = usePOS();

  if (!state.isLoaded) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Wine className="size-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold text-foreground">Μπαρ</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Μπουκάλια, cocktails, happy hour
          </p>
        </div>
      </div>

      <BarManager />
    </div>
  );
}
