"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";

interface ActionResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

const bulkUpdateSchema = z.object({
  tableIds: z.array(z.string().uuid()).min(1).max(200),
  zoneId: z.string().uuid(),
});

export async function bulkUpdateZone(
  input: z.infer<typeof bulkUpdateSchema>,
): Promise<ActionResult<number>> {
  const parsed = bulkUpdateSchema.safeParse(input);
  if (!parsed.success)
    return { success: false, error: parsed.error.errors[0].message };

  const supabase = await createServerSupabaseClient();

  const { error: tErr, count } = await supabase
    .from("tables")
    .update({ zone_id: parsed.data.zoneId }, { count: "exact" })
    .in("id", parsed.data.tableIds);
  if (tErr) return { success: false, error: tErr.message };

  // Mirror change in active layout positions
  const { data: zone } = await supabase
    .from("zones")
    .select("floor_id")
    .eq("id", parsed.data.zoneId)
    .single();

  if (zone?.floor_id) {
    const { data: activeLayout } = await supabase
      .from("floor_layouts")
      .select("id")
      .eq("floor_id", zone.floor_id)
      .eq("is_active", true)
      .maybeSingle();

    if (activeLayout) {
      await supabase
        .from("floor_layout_positions")
        .update({ zone_id: parsed.data.zoneId })
        .eq("layout_id", activeLayout.id)
        .in("table_id", parsed.data.tableIds);
    }
  }

  revalidatePath("/settings/floor-plan");
  revalidatePath("/tables");
  return { success: true, data: count ?? 0 };
}

const cascadeDeleteSchema = z.object({
  zoneId: z.string().uuid(),
  moveToZoneId: z.string().uuid(),
});

export async function cascadeDeleteZone(
  input: z.infer<typeof cascadeDeleteSchema>,
): Promise<ActionResult> {
  const parsed = cascadeDeleteSchema.safeParse(input);
  if (!parsed.success)
    return { success: false, error: parsed.error.errors[0].message };
  if (parsed.data.zoneId === parsed.data.moveToZoneId)
    return { success: false, error: "target zone must differ from source" };

  const supabase = await createServerSupabaseClient();

  const { error: mvErr } = await supabase
    .from("tables")
    .update({ zone_id: parsed.data.moveToZoneId })
    .eq("zone_id", parsed.data.zoneId);
  if (mvErr) return { success: false, error: mvErr.message };

  // Mirror to all layout positions (not just the active one — cascade delete is a full reassignment)
  const { error: posMvErr } = await supabase
    .from("floor_layout_positions")
    .update({ zone_id: parsed.data.moveToZoneId })
    .eq("zone_id", parsed.data.zoneId);
  if (posMvErr) return { success: false, error: posMvErr.message };

  const { error: delErr } = await supabase
    .from("zones")
    .delete()
    .eq("id", parsed.data.zoneId);
  if (delErr) return { success: false, error: delErr.message };

  revalidatePath("/settings/floor-plan");
  revalidatePath("/tables");
  return { success: true };
}
