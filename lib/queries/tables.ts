import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { DbTable } from "@/lib/types/database";

const TABLE_COLS =
  "id, number, capacity, status, current_order_id, zone_id, x, y, width, height, shape, rotation, is_active, label, legacy_id, metadata, created_at, updated_at";

export async function getTables(): Promise<DbTable[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("tables")
    .select(TABLE_COLS)
    .eq("is_active", true)
    .order("number", { ascending: true });
  if (error) throw new Error(`Failed to fetch tables: ${error.message}`);
  return data as DbTable[];
}

export async function getAllTables(): Promise<DbTable[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("tables")
    .select(TABLE_COLS)
    .order("number", { ascending: true });
  if (error) throw new Error(`Failed to fetch tables: ${error.message}`);
  return data as DbTable[];
}

export async function getTableById(id: string): Promise<DbTable | null> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("tables")
    .select(TABLE_COLS)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`Failed to fetch table: ${error.message}`);
  return data as DbTable | null;
}
