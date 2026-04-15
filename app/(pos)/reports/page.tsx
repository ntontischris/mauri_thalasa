import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ReportsPanel } from "@/components/pos/reports-panel";

export default async function ReportsPage() {
  const supabase = await createServerSupabaseClient();

  // Today's completed orders
  const today = new Date().toISOString().split("T")[0];
  const { data: todayOrders } = await supabase
    .from("orders")
    .select("id, total, vat_amount, payment_method, completed_at, created_at")
    .eq("status", "completed")
    .gte("completed_at", `${today}T00:00:00`)
    .order("completed_at", { ascending: false });

  // Top products (from order_items of completed orders)
  const { data: topProducts } = await supabase
    .from("order_items")
    .select("product_name, quantity, price, orders!inner(status)")
    .eq("orders.status", "completed")
    .order("quantity", { ascending: false })
    .limit(200);

  // Aggregate top products
  const productMap = new Map<
    string,
    { name: string; quantity: number; revenue: number }
  >();
  for (const item of topProducts ?? []) {
    const existing = productMap.get(item.product_name) ?? {
      name: item.product_name,
      quantity: 0,
      revenue: 0,
    };
    existing.quantity += item.quantity;
    existing.revenue += item.price * item.quantity;
    productMap.set(item.product_name, existing);
  }
  const topProductsList = Array.from(productMap.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 20);

  const orders = todayOrders ?? [];
  const totalRevenue = orders.reduce((s, o) => s + (o.total ?? 0), 0);
  const totalVat = orders.reduce((s, o) => s + (o.vat_amount ?? 0), 0);
  const cashOrders = orders.filter((o) => o.payment_method === "cash");
  const cardOrders = orders.filter((o) => o.payment_method === "card");

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Αναφορές</h1>
        <p className="text-muted-foreground">
          Σήμερα: {orders.length} παραγγελίες
        </p>
      </div>
      <ReportsPanel
        summary={{
          totalOrders: orders.length,
          totalRevenue,
          totalVat,
          avgCheck: orders.length > 0 ? totalRevenue / orders.length : 0,
          cashRevenue: cashOrders.reduce((s, o) => s + (o.total ?? 0), 0),
          cardRevenue: cardOrders.reduce((s, o) => s + (o.total ?? 0), 0),
          cashCount: cashOrders.length,
          cardCount: cardOrders.length,
        }}
        topProducts={topProductsList}
      />
    </div>
  );
}
