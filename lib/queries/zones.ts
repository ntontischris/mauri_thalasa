import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { DbZone } from "@/lib/types/database";

export async function getZones(): Promise<DbZone[]> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("zones")
    .select(
      "id, name, color, sort_order, legacy_id, metadata, created_at, updated_at",
    )
    .order("sort_order", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch zones: ${error.message}`);
  }

  return data;
}
