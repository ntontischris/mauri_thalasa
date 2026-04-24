import { createServerSupabaseClient } from "@/lib/supabase/server";

export interface TableLiveData {
  order_id: string;
  table_id: string;
  opened_at: string;
  guest_count: number;
  subtotal: number;
  item_count: number;
  customer_name: string | null;
  server_name: string | null;
}

export async function getLiveTableData(): Promise<TableLiveData[]> {
  const supabase = await createServerSupabaseClient();

  const { data: orders, error } = await supabase
    .from("orders")
    .select(
      "id, table_id, created_at, guest_count, customers(name), staff_members:created_by(name), order_items(price, quantity, order_item_modifiers(price))",
    )
    .eq("status", "active");
  if (error) throw new Error(`Live tables: ${error.message}`);

  return (orders ?? []).map((o) => {
    const items =
      (
        o as unknown as {
          order_items: {
            price: number;
            quantity: number;
            order_item_modifiers: { price: number }[];
          }[];
        }
      ).order_items ?? [];
    const subtotal = items.reduce((s, it) => {
      const mods = (it.order_item_modifiers ?? []).reduce(
        (m, mm) => m + (mm.price ?? 0),
        0,
      );
      return s + (it.price + mods) * it.quantity;
    }, 0);
    const customer = (o as unknown as { customers: { name: string } | null })
      .customers;
    const staff = (o as unknown as { staff_members: { name: string } | null })
      .staff_members;
    return {
      order_id: (o as unknown as { id: string }).id,
      table_id: (o as unknown as { table_id: string }).table_id,
      opened_at: (o as unknown as { created_at: string }).created_at,
      guest_count: (o as unknown as { guest_count: number }).guest_count ?? 0,
      subtotal: Math.round(subtotal * 100) / 100,
      item_count: items.reduce((s, it) => s + it.quantity, 0),
      customer_name: customer?.name ?? null,
      server_name: staff?.name ?? null,
    };
  });
}
