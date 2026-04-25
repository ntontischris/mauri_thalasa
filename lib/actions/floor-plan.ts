"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { DbTable } from "@/lib/types/database";

interface ActionResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

// ───────────────── Floors ─────────────────
const floorSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(60),
  sort_order: z.number().int().min(0).max(20),
  width: z.number().min(200).max(5000),
  height: z.number().min(200).max(5000),
  background_url: z.string().url().nullable().optional(),
});

export async function upsertFloor(
  input: z.infer<typeof floorSchema>,
): Promise<ActionResult<{ id: string }>> {
  const parsed = floorSchema.safeParse(input);
  if (!parsed.success)
    return { success: false, error: parsed.error.errors[0].message };
  const supabase = await createServerSupabaseClient();
  const payload = {
    name: parsed.data.name,
    sort_order: parsed.data.sort_order,
    width: parsed.data.width,
    height: parsed.data.height,
    background_url: parsed.data.background_url ?? null,
  };
  const { data, error } = parsed.data.id
    ? await supabase
        .from("floors")
        .update(payload)
        .eq("id", parsed.data.id)
        .select("id")
        .single()
    : await supabase.from("floors").insert(payload).select("id").single();
  if (error) return { success: false, error: error.message };
  revalidatePath("/tables");
  revalidatePath("/settings/floor-plan");
  return { success: true, data: { id: data.id } };
}

export async function deleteFloor(id: string): Promise<ActionResult> {
  const supabase = await createServerSupabaseClient();
  // safety: check any zones on this floor
  const { count } = await supabase
    .from("zones")
    .select("id", { count: "exact", head: true })
    .eq("floor_id", id);
  if ((count ?? 0) > 0)
    return {
      success: false,
      error: "Ο όροφος έχει ζώνες — μετακίνησε ή διέγραψε πρώτα.",
    };
  const { error } = await supabase
    .from("floors")
    .update({ is_active: false })
    .eq("id", id);
  if (error) return { success: false, error: error.message };
  revalidatePath("/settings/floor-plan");
  revalidatePath("/tables");
  return { success: true };
}

// ───────────────── Zones ─────────────────
const zoneSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(60),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  sort_order: z.number().int().min(0).max(50),
  floor_id: z.string().uuid(),
});

export async function upsertZone(
  input: z.infer<typeof zoneSchema>,
): Promise<ActionResult<{ id: string }>> {
  const parsed = zoneSchema.safeParse(input);
  if (!parsed.success)
    return { success: false, error: parsed.error.errors[0].message };
  const supabase = await createServerSupabaseClient();
  const { data, error } = parsed.data.id
    ? await supabase
        .from("zones")
        .update(parsed.data)
        .eq("id", parsed.data.id)
        .select("id")
        .single()
    : await supabase.from("zones").insert(parsed.data).select("id").single();
  if (error) return { success: false, error: error.message };
  revalidatePath("/tables");
  revalidatePath("/settings/floor-plan");
  return { success: true, data: { id: data.id } };
}

export async function deleteZone(id: string): Promise<ActionResult> {
  const supabase = await createServerSupabaseClient();
  const { count } = await supabase
    .from("tables")
    .select("id", { count: "exact", head: true })
    .eq("zone_id", id)
    .eq("is_active", true);
  if ((count ?? 0) > 0)
    return {
      success: false,
      error: "Η ζώνη έχει ενεργά τραπέζια — μετακίνησε πρώτα.",
    };
  const { error } = await supabase.from("zones").delete().eq("id", id);
  if (error) return { success: false, error: error.message };
  revalidatePath("/settings/floor-plan");
  revalidatePath("/tables");
  return { success: true };
}

// ───────────────── Tables ─────────────────
const tableSchema = z.object({
  id: z.string().uuid().optional(),
  number: z.number().int().min(1).max(999),
  capacity: z.number().int().min(1).max(30),
  zone_id: z.string().uuid(),
  x: z.number().min(0).max(5000),
  y: z.number().min(0).max(5000),
  width: z.number().min(30).max(400).optional(),
  height: z.number().min(30).max(400).optional(),
  shape: z.enum(["square", "round", "rectangle"]),
  rotation: z.number().int().min(0).max(359),
  label: z.string().max(20).nullable().optional(),
});

export async function upsertTable(
  input: z.infer<typeof tableSchema>,
): Promise<ActionResult<DbTable>> {
  const parsed = tableSchema.safeParse(input);
  if (!parsed.success)
    return { success: false, error: parsed.error.errors[0].message };
  const supabase = await createServerSupabaseClient();

  // On INSERT, pick a truly free number — soft-deleted rows still reserve numbers via UNIQUE
  let number = parsed.data.number;
  if (!parsed.data.id) {
    const { data: existing } = await supabase
      .from("tables")
      .select("number")
      .eq("number", number)
      .maybeSingle();
    if (existing) {
      const { data: maxRow } = await supabase
        .from("tables")
        .select("number")
        .order("number", { ascending: false })
        .limit(1)
        .maybeSingle();
      number = (maxRow?.number ?? 0) + 1;
    }
  }

  const payload = {
    number,
    capacity: parsed.data.capacity,
    zone_id: parsed.data.zone_id,
    x: Math.max(0, parsed.data.x),
    y: Math.max(0, parsed.data.y),
    width: parsed.data.width ?? (parsed.data.shape === "rectangle" ? 140 : 80),
    height: parsed.data.height ?? 80,
    shape: parsed.data.shape,
    rotation: parsed.data.rotation,
    label: parsed.data.label ?? null,
  };
  const { data, error } = parsed.data.id
    ? await supabase
        .from("tables")
        .update(payload)
        .eq("id", parsed.data.id)
        .select("*")
        .single()
    : await supabase.from("tables").insert(payload).select("*").single();
  if (error) return { success: false, error: error.message };
  revalidatePath("/tables");
  revalidatePath("/settings/floor-plan");
  return { success: true, data: data as DbTable };
}

// Lightweight position update — writes to active layout positions; trigger mirrors to tables
export async function moveTable(input: {
  id: string;
  x: number;
  y: number;
  rotation?: number;
}): Promise<ActionResult> {
  const schema = z.object({
    id: z.string().uuid(),
    x: z.number().min(0).max(5000),
    y: z.number().min(0).max(5000),
    rotation: z.number().int().min(0).max(359).optional(),
  });
  const parsed = schema.safeParse(input);
  if (!parsed.success)
    return { success: false, error: parsed.error.errors[0].message };

  const supabase = await createServerSupabaseClient();

  // Look up the table's zone, then the floor's active layout
  const { data: tbl } = await supabase
    .from("tables")
    .select("zone_id")
    .eq("id", parsed.data.id)
    .single();
  if (!tbl?.zone_id) return { success: false, error: "table has no zone" };

  const { data: zone } = await supabase
    .from("zones")
    .select("floor_id")
    .eq("id", tbl.zone_id)
    .single();
  if (!zone?.floor_id) return { success: false, error: "zone has no floor" };

  const { data: layout } = await supabase
    .from("floor_layouts")
    .select("id")
    .eq("floor_id", zone.floor_id)
    .eq("is_active", true)
    .maybeSingle();

  if (layout) {
    // Active layout exists — write to positions; trigger updates tables
    const { error } = await supabase
      .from("floor_layout_positions")
      .upsert(
        {
          layout_id: layout.id,
          table_id: parsed.data.id,
          x: parsed.data.x,
          y: parsed.data.y,
          rotation: parsed.data.rotation ?? 0,
          zone_id: tbl.zone_id,
        },
        { onConflict: "layout_id,table_id" },
      );
    if (error) return { success: false, error: error.message };
  } else {
    // Defensive fallback — no active layout, write directly
    const update: Record<string, unknown> = {
      x: parsed.data.x,
      y: parsed.data.y,
    };
    if (parsed.data.rotation !== undefined)
      update.rotation = parsed.data.rotation;
    const { error } = await supabase
      .from("tables")
      .update(update)
      .eq("id", parsed.data.id);
    if (error) return { success: false, error: error.message };
  }

  revalidatePath("/settings/floor-plan");
  return { success: true };
}

export async function deleteTable(id: string): Promise<ActionResult> {
  const supabase = await createServerSupabaseClient();
  const { data: t } = await supabase
    .from("tables")
    .select("current_order_id, status")
    .eq("id", id)
    .single();
  if (t?.current_order_id)
    return {
      success: false,
      error: "Το τραπέζι έχει ενεργή παραγγελία — ολοκλήρωσε πρώτα.",
    };
  const { error } = await supabase
    .from("tables")
    .update({ is_active: false })
    .eq("id", id);
  if (error) return { success: false, error: error.message };
  revalidatePath("/settings/floor-plan");
  revalidatePath("/tables");
  return { success: true };
}
