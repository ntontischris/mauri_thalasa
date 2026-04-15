import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { DbTable } from "@/lib/types/database";

export async function getTables(): Promise<DbTable[]> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("tables")
    .select(
      "id, number, capacity, status, current_order_id, zone_id, x, y, shape, rotation, legacy_id, metadata, created_at, updated_at",
    )
    .order("number", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch tables: ${error.message}`);
  }

  return data;
}

export async function getTableById(id: string): Promise<DbTable | null> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("tables")
    .select(
      "id, number, capacity, status, current_order_id, zone_id, x, y, shape, rotation, legacy_id, metadata, created_at, updated_at",
    )
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(`Failed to fetch table: ${error.message}`);
  }

  return data;
}
