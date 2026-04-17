import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  getActiveOrderSummaries,
  getDailyOrderStats,
} from "@/lib/queries/orders";
import { WaiterOrdersView } from "@/components/pos/waiter-orders-view";
import { ManagerOrdersView } from "@/components/pos/manager-orders-view";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const role = (user?.user_metadata?.role ?? "waiter") as string;
  const staffId = user?.user_metadata?.staff_id as string | undefined;
  const staffName = (user?.user_metadata?.staff_name ?? "Σερβιτόρος") as string;

  const isManager = role === "manager";

  if (isManager) {
    const [orders, stats, staffRes] = await Promise.all([
      getActiveOrderSummaries(),
      getDailyOrderStats(),
      supabase.from("staff").select("id, name").eq("is_active", true),
    ]);

    const waiterNames: Record<string, string> = {};
    for (const s of staffRes.data ?? []) waiterNames[s.id] = s.name;

    return (
      <ManagerOrdersView
        orders={orders}
        stats={stats}
        waiterNames={waiterNames}
      />
    );
  }

  const filter = staffId ? { createdBy: staffId } : undefined;
  const [orders, stats] = await Promise.all([
    getActiveOrderSummaries(filter),
    getDailyOrderStats(filter),
  ]);

  return (
    <WaiterOrdersView orders={orders} stats={stats} waiterName={staffName} />
  );
}
