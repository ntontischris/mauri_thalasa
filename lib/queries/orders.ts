import { createServerSupabaseClient } from "@/lib/supabase/server";
import type {
  DbOrder,
  OrderItemWithModifiers,
  KitchenItem,
} from "@/lib/types/database";

export async function getActiveOrderByTable(
  tableId: string,
): Promise<DbOrder | null> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("orders")
    .select(
      "id, table_id, table_number, status, payment_method, total, vat_amount, discount_amount, active_course, is_rush, notes, customer_id, created_by, completed_by, elorus_invoice_id, fiscal_mark, created_at, updated_at, completed_at",
    )
    .eq("table_id", tableId)
    .eq("status", "active")
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch active order: ${error.message}`);
  }

  return data;
}

export async function getOrderById(orderId: string): Promise<DbOrder | null> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("orders")
    .select(
      "id, table_id, table_number, status, payment_method, total, vat_amount, discount_amount, active_course, is_rush, notes, customer_id, created_by, completed_by, elorus_invoice_id, fiscal_mark, created_at, updated_at, completed_at",
    )
    .eq("id", orderId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(`Failed to fetch order: ${error.message}`);
  }

  return data;
}

export async function getOrderItems(
  orderId: string,
): Promise<OrderItemWithModifiers[]> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("order_items")
    .select(
      `id, order_id, product_id, product_name, price, quantity,
       notes, status, course, station, created_at, updated_at,
       order_item_modifiers(id, order_item_id, modifier_id, name, price)`,
    )
    .eq("order_id", orderId)
    .order("course", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch order items: ${error.message}`);
  }

  return data as OrderItemWithModifiers[];
}

export async function getKitchenItems(): Promise<KitchenItem[]> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("order_items")
    .select(
      `id, order_id, product_id, product_name, price, quantity,
       notes, status, course, station, created_at, updated_at,
       order_item_modifiers(id, order_item_id, modifier_id, name, price),
       orders!inner(table_number, status)`,
    )
    .in("status", ["pending", "preparing"])
    .eq("orders.status", "active")
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch kitchen items: ${error.message}`);
  }

  return data.map((item: Record<string, unknown>) => {
    const orders = item.orders as { table_number: number };
    const { orders: _, ...rest } = item;
    return { ...rest, table_number: orders.table_number } as KitchenItem;
  });
}
