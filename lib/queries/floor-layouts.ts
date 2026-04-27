import { createServerSupabaseClient } from "@/lib/supabase/server";
import type {
  DbFloorLayout,
  DbFloorLayoutPosition,
} from "@/lib/types/floor-layouts";

const LAYOUT_COLS =
  "id, floor_id, name, is_active, icon, sort_order, created_at, updated_at";

const POSITION_COLS =
  "layout_id, table_id, x, y, rotation, zone_id, is_visible";

export async function getLayoutsByFloor(
  floorId: string,
): Promise<DbFloorLayout[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("floor_layouts")
    .select(LAYOUT_COLS)
    .eq("floor_id", floorId)
    .order("sort_order", { ascending: true });
  if (error) throw new Error(`Failed to fetch floor layouts: ${error.message}`);
  return (data ?? []) as DbFloorLayout[];
}

export async function getActiveLayout(
  floorId: string,
): Promise<DbFloorLayout | null> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("floor_layouts")
    .select(LAYOUT_COLS)
    .eq("floor_id", floorId)
    .eq("is_active", true)
    .maybeSingle();
  if (error) throw new Error(`Failed to fetch active layout: ${error.message}`);
  return (data as DbFloorLayout | null) ?? null;
}

export async function getLayoutPositions(
  layoutId: string,
): Promise<DbFloorLayoutPosition[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("floor_layout_positions")
    .select(POSITION_COLS)
    .eq("layout_id", layoutId);
  if (error)
    throw new Error(`Failed to fetch layout positions: ${error.message}`);
  return (data ?? []) as DbFloorLayoutPosition[];
}
