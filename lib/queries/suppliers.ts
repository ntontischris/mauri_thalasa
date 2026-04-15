import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { DbSupplier, SupplierOrderWithItems } from "@/lib/types/database";

export async function getSuppliers(): Promise<DbSupplier[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("suppliers")
    .select(
      "id, name, phone, email, categories, afm, address, legacy_id, source, metadata, created_at, updated_at",
    )
    .order("name");
  if (error) throw new Error(`Failed to fetch suppliers: ${error.message}`);
  return data;
}

export async function getSupplierOrders(): Promise<SupplierOrderWithItems[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("supplier_orders")
    .select(
      `id, supplier_id, status, created_at, notes,
       suppliers(name),
       supplier_order_items(id, supplier_order_id, ingredient_id, quantity, estimated_cost,
         ingredients(name, unit)
       )`,
    )
    .order("created_at", { ascending: false })
    .limit(50);
  if (error)
    throw new Error(`Failed to fetch supplier orders: ${error.message}`);
  return data as unknown as SupplierOrderWithItems[];
}
