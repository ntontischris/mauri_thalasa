"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { DbFloorLayout } from "@/lib/types/floor-layouts";

interface ActionResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

const NameSchema = z.string().min(1).max(60);

const createSchema = z.object({
  floorId: z.string().uuid(),
  name: NameSchema,
  icon: z.string().max(8).optional(),
  fromCurrent: z.boolean(),
});

export async function createLayout(
  input: z.infer<typeof createSchema>,
): Promise<ActionResult<DbFloorLayout>> {
  const parsed = createSchema.safeParse(input);
  if (!parsed.success)
    return { success: false, error: parsed.error.errors[0].message };

  const supabase = await createServerSupabaseClient();

  const { data: layout, error } = await supabase
    .from("floor_layouts")
    .insert({
      floor_id: parsed.data.floorId,
      name: parsed.data.name,
      icon: parsed.data.icon ?? null,
      is_active: false,
    })
    .select(
      "id, floor_id, name, is_active, icon, sort_order, created_at, updated_at",
    )
    .single();

  if (error || !layout)
    return { success: false, error: error?.message ?? "insert failed" };

  if (parsed.data.fromCurrent) {
    const { data: zonesOnFloor } = await supabase
      .from("zones")
      .select("id")
      .eq("floor_id", parsed.data.floorId);
    const zoneIds = (zonesOnFloor ?? []).map((z) => z.id);

    if (zoneIds.length > 0) {
      const { data: tables } = await supabase
        .from("tables")
        .select("id, x, y, rotation, zone_id, is_active")
        .in("zone_id", zoneIds);

      if (tables && tables.length > 0) {
        const positions = tables.map((t) => ({
          layout_id: layout.id,
          table_id: t.id,
          x: t.x ?? 0,
          y: t.y ?? 0,
          rotation: t.rotation ?? 0,
          zone_id: t.zone_id,
          is_visible: t.is_active,
        }));
        const { error: posErr } = await supabase
          .from("floor_layout_positions")
          .insert(positions);
        if (posErr) return { success: false, error: posErr.message };
      }
    }
  }

  revalidatePath("/settings/floor-plan");
  return { success: true, data: layout as DbFloorLayout };
}

const activateSchema = z.object({
  layoutId: z.string().uuid(),
  force: z.boolean().optional(),
});

export async function activateLayout(
  input: z.infer<typeof activateSchema>,
): Promise<ActionResult<true>> {
  const parsed = activateSchema.safeParse(input);
  if (!parsed.success)
    return { success: false, error: parsed.error.errors[0].message };

  const supabase = await createServerSupabaseClient();

  const { data: layout, error: lookupErr } = await supabase
    .from("floor_layouts")
    .select("id, floor_id")
    .eq("id", parsed.data.layoutId)
    .single();
  if (lookupErr || !layout)
    return { success: false, error: "layout not found" };

  if (!parsed.data.force) {
    const { data: zonesOnFloor } = await supabase
      .from("zones")
      .select("id")
      .eq("floor_id", layout.floor_id);
    const zoneIds = (zonesOnFloor ?? []).map((z) => z.id);
    if (zoneIds.length > 0) {
      const { data: blocked } = await supabase
        .from("tables")
        .select("number, status")
        .in("zone_id", zoneIds)
        .in("status", ["occupied", "bill-requested"]);
      if (blocked && blocked.length > 0) {
        return {
          success: false,
          error: `BLOCKED:${blocked.map((t) => t.number).join(",")}`,
        };
      }
    }
  }

  // Deactivate current active layout on this floor (the partial unique index requires sequential update)
  const { error: deactErr } = await supabase
    .from("floor_layouts")
    .update({ is_active: false })
    .eq("floor_id", layout.floor_id)
    .eq("is_active", true);
  if (deactErr) return { success: false, error: deactErr.message };

  const { error: actErr } = await supabase
    .from("floor_layouts")
    .update({ is_active: true })
    .eq("id", parsed.data.layoutId);
  if (actErr) return { success: false, error: actErr.message };

  revalidatePath("/settings/floor-plan");
  revalidatePath("/tables");
  return { success: true, data: true };
}

export async function deleteLayout(layoutId: string): Promise<ActionResult> {
  const parsed = z.string().uuid().safeParse(layoutId);
  if (!parsed.success)
    return { success: false, error: parsed.error.errors[0].message };

  const supabase = await createServerSupabaseClient();
  const { data: layout } = await supabase
    .from("floor_layouts")
    .select("is_active")
    .eq("id", layoutId)
    .single();
  if (layout?.is_active)
    return { success: false, error: "cannot delete active layout" };

  const { error } = await supabase
    .from("floor_layouts")
    .delete()
    .eq("id", layoutId);
  if (error) return { success: false, error: error.message };

  revalidatePath("/settings/floor-plan");
  return { success: true };
}

const renameSchema = z.object({
  layoutId: z.string().uuid(),
  name: NameSchema,
  icon: z.string().max(8).optional(),
});

export async function renameLayout(
  input: z.infer<typeof renameSchema>,
): Promise<ActionResult> {
  const parsed = renameSchema.safeParse(input);
  if (!parsed.success)
    return { success: false, error: parsed.error.errors[0].message };

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from("floor_layouts")
    .update({
      name: parsed.data.name,
      icon: parsed.data.icon ?? null,
    })
    .eq("id", parsed.data.layoutId);

  if (error) return { success: false, error: error.message };

  revalidatePath("/settings/floor-plan");
  return { success: true };
}
