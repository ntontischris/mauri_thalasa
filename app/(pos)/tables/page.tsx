"use client";

import { useRouter } from "next/navigation";
import { usePOS } from "@/lib/pos-context";
import { FloorPlanView } from "@/components/pos/floor-plan-view";
import { Skeleton } from "@/components/ui/skeleton";

export default function TablesPage() {
  const router = useRouter();
  const { state, createNewOrder } = usePOS();

  const handleTableClick = (tableId: string, tableNumber: number) => {
    const table = state.tables.find((t) => t.id === tableId);
    if (!table) return;

    if (table.status === "available") {
      // Create new order and navigate to order page
      createNewOrder(tableId, tableNumber);
      router.push(`/orders/${tableId}`);
    } else if (table.status === "occupied") {
      // Navigate to existing order
      router.push(`/orders/${tableId}`);
    } else if (table.status === "bill-requested") {
      // Navigate to checkout
      router.push(`/checkout/${tableId}`);
    }
  };

  if (!state.isLoaded) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="mt-2 h-4 w-64" />
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="h-[140px] rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const availableCount = state.tables.filter(
    (t) => t.status === "available",
  ).length;
  const occupiedCount = state.tables.filter(
    (t) => t.status === "occupied",
  ).length;
  const billRequestedCount = state.tables.filter(
    (t) => t.status === "bill-requested",
  ).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Τραπέζια</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {availableCount} διαθέσιμα • {occupiedCount} κατειλημμένα •{" "}
          {billRequestedCount} λογαριασμός
        </p>
      </div>

      <FloorPlanView onTableClick={handleTableClick} />
    </div>
  );
}
