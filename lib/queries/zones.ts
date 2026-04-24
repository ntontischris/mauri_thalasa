import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { DbZone } from "@/lib/types/database";

const ZONE_COLS =
  "id, name, color, sort_order, floor_id, legacy_id, metadata, created_at, updated_at";

export async function getZones(): Promise<DbZone[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("zones")
    .select(ZONE_COLS)
    .order("sort_order", { ascending: true });
  if (error) throw new Error(`Failed to fetch zones: ${error.message}`);
  return data as DbZone[];
}

export async function getZonesByFloor(floorId: string): Promise<DbZone[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("zones")
    .select(ZONE_COLS)
    .eq("floor_id", floorId)
    .order("sort_order", { ascending: true });
  if (error) throw new Error(`Failed to fetch zones: ${error.message}`);
  return data as DbZone[];
}
