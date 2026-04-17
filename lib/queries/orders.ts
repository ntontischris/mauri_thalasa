import { createServerSupabaseClient } from "@/lib/supabase/server";
import type {
  DbOrder,
  OrderItemWithModifiers,
  KitchenItem,
  TableStatus,
} from "@/lib/types/database";

export interface ActiveOrderSummary {
  id: string;
  table_id: string;
  table_number: number;
  table_status: TableStatus;
  is_rush: boolean;
  created_by: string | null;
  created_at: string;
  total: number;
  item_count: number;
  pending_count: number;
  preparing_count: number;
  ready_count: number;
  served_count: number;
  oldest_pending_at: string | null;
  oldest_ready_at: string | null;
}

export async function getActiveOrderSummaries(options?: {
  createdBy?: string;
}): Promise<ActiveOrderSummary[]> {
  const supabase = await createServerSupabaseClient();

  let query = supabase
    .from("orders")
    .select(
      `id, table_id, table_number, is_rush, created_by, created_at, total,
       order_items(id, status, price, quantity, created_at,
         order_item_modifiers(price))`,
    )
    .eq("status", "active")
    .order("created_at", { ascending: true });

  if (options?.createdBy) {
    query = query.eq("created_by", options.createdBy);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch active orders: ${error.message}`);
  }

  const rows = data ?? [];
  // Fetch table statuses in a separate query to avoid PostgREST ambiguity
  // (tables.current_order_id → orders.id creates a second relationship).
  const tableIds = Array.from(new Set(rows.map((r) => r.table_id)));
  const tableStatusMap = new Map<string, TableStatus>();
  if (tableIds.length > 0) {
    const { data: tablesData } = await supabase
      .from("tables")
      .select("id, status")
      .in("id", tableIds);
    for (const t of tablesData ?? []) {
      tableStatusMap.set(t.id, t.status as TableStatus);
    }
  }

  return rows.map((row) => {
    const items = (row.order_items ?? []) as Array<{
      id: string;
      status: "pending" | "preparing" | "ready" | "served";
      price: number;
      quantity: number;
      created_at: string;
      order_item_modifiers: Array<{ price: number }>;
    }>;

    let total = 0;
    const counts = { pending: 0, preparing: 0, ready: 0, served: 0 };
    let oldestPending: string | null = null;
    let oldestReady: string | null = null;

    for (const item of items) {
      const modSum = item.order_item_modifiers.reduce((s, m) => s + m.price, 0);
      total += (item.price + modSum) * item.quantity;
      counts[item.status] += 1;
      if (
        item.status === "pending" &&
        (!oldestPending || item.created_at < oldestPending)
      ) {
        oldestPending = item.created_at;
      }
      if (
        item.status === "ready" &&
        (!oldestReady || item.created_at < oldestReady)
      ) {
        oldestReady = item.created_at;
      }
    }

    return {
      id: row.id,
      table_id: row.table_id,
      table_number: row.table_number,
      table_status: tableStatusMap.get(row.table_id) ?? "occupied",
      is_rush: row.is_rush,
      created_by: row.created_by,
      created_at: row.created_at,
      total: Math.round(total * 100) / 100,
      item_count: items.length,
      pending_count: counts.pending,
      preparing_count: counts.preparing,
      ready_count: counts.ready,
      served_count: counts.served,
      oldest_pending_at: oldestPending,
      oldest_ready_at: oldestReady,
    };
  });
}

export interface DailyOrderStats {
  count: number;
  revenue: number;
  avgTicket: number;
}

export async function getDailyOrderStats(options?: {
  createdBy?: string;
}): Promise<DailyOrderStats> {
  const supabase = await createServerSupabaseClient();
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  let query = supabase
    .from("orders")
    .select("total")
    .eq("status", "completed")
    .gte("completed_at", startOfDay.toISOString());

  if (options?.createdBy) {
    query = query.eq("created_by", options.createdBy);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch daily stats: ${error.message}`);
  }

  const count = data?.length ?? 0;
  const revenue = (data ?? []).reduce((s, o) => s + (o.total ?? 0), 0);

  return {
    count,
    revenue: Math.round(revenue * 100) / 100,
    avgTicket: count > 0 ? Math.round((revenue / count) * 100) / 100 : 0,
  };
}

export async function getActiveOrderByTable(
  tableId: string,
): Promise<DbOrder | null> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("orders")
    .select(
      "id, table_id, table_number, status, payment_method, total, tip_amount, vat_amount, discount_amount, active_course, is_rush, notes, customer_id, created_by, completed_by, elorus_invoice_id, fiscal_mark, created_at, updated_at, completed_at",
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
      "id, table_id, table_number, status, payment_method, total, tip_amount, vat_amount, discount_amount, active_course, is_rush, notes, customer_id, created_by, completed_by, elorus_invoice_id, fiscal_mark, created_at, updated_at, completed_at",
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
