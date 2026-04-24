import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { DbFloor } from "@/lib/types/database";

const FLOOR_COLS =
  "id, name, sort_order, width, height, background_url, is_active, created_at, updated_at";

export async function getFloors(): Promise<DbFloor[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("floors")
    .select(FLOOR_COLS)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  if (error) throw new Error(`Failed to fetch floors: ${error.message}`);
  return data as DbFloor[];
}

export async function getAllFloors(): Promise<DbFloor[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("floors")
    .select(FLOOR_COLS)
    .order("sort_order", { ascending: true });
  if (error) throw new Error(`Failed to fetch floors: ${error.message}`);
  return data as DbFloor[];
}
