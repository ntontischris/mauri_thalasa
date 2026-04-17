"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ensureStaffAccount } from "@/lib/actions/auth";
import {
  createStaffSchema,
  updateStaffSchema,
  createShiftSchema,
  type CreateStaffInput,
  type UpdateStaffInput,
  type CreateShiftInput,
} from "@/lib/validators/staff";

interface ActionResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

export async function createStaffMember(
  input: CreateStaffInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = createStaffSchema.safeParse(input);
  if (!parsed.success)
    return { success: false, error: parsed.error.errors[0].message };
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("staff_members")
    .insert({ ...parsed.data, is_active: true })
    .select("id")
    .single();
  if (error)
    return { success: false, error: `Αποτυχία δημιουργίας: ${error.message}` };

  // Auto-provision auth account so the new member can log in with their PIN
  const auth = await ensureStaffAccount(
    data.id,
    parsed.data.name,
    parsed.data.role,
    parsed.data.pin,
  );
  if (!auth.success) {
    // Roll back the staff row so we don't leave an orphan without login
    await supabase.from("staff_members").delete().eq("id", data.id);
    return {
      success: false,
      error: `Αποτυχία σύνδεσης λογαριασμού: ${auth.error}`,
    };
  }

  revalidatePath("/staff");
  return { success: true, data: { id: data.id } };
}

export async function updateStaffMember(
  id: string,
  input: UpdateStaffInput,
): Promise<ActionResult> {
  const parsed = updateStaffSchema.safeParse(input);
  if (!parsed.success)
    return { success: false, error: parsed.error.errors[0].message };
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from("staff_members")
    .update(parsed.data)
    .eq("id", id);
  if (error) return { success: false, error: error.message };
  revalidatePath("/staff");
  return { success: true };
}

export async function deleteStaffMember(id: string): Promise<ActionResult> {
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from("staff_members")
    .update({ is_active: false })
    .eq("id", id);
  if (error) return { success: false, error: error.message };
  revalidatePath("/staff");
  return { success: true };
}

export async function saveShift(
  input: CreateShiftInput,
): Promise<ActionResult> {
  const parsed = createShiftSchema.safeParse(input);
  if (!parsed.success)
    return { success: false, error: parsed.error.errors[0].message };
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from("shifts").upsert(
    {
      staff_id: parsed.data.staff_id,
      date: parsed.data.date,
      type: parsed.data.type,
    },
    { onConflict: "staff_id,date" },
  );
  if (error) return { success: false, error: error.message };
  revalidatePath("/staff");
  return { success: true };
}

export async function clockIn(staffId: string): Promise<ActionResult> {
  const supabase = await createServerSupabaseClient();
  const today = new Date().toISOString().slice(0, 10);
  const now = new Date().toISOString();
  const { error } = await supabase.from("shifts").upsert(
    {
      staff_id: staffId,
      date: today,
      clock_in: now,
      type: "morning",
    },
    { onConflict: "staff_id,date" },
  );
  if (error) return { success: false, error: error.message };
  revalidatePath("/staff");
  revalidatePath("/staff/performance");
  return { success: true };
}

export async function clockOut(staffId: string): Promise<ActionResult> {
  const supabase = await createServerSupabaseClient();
  const today = new Date().toISOString().slice(0, 10);
  const { error } = await supabase
    .from("shifts")
    .update({ clock_out: new Date().toISOString() })
    .eq("staff_id", staffId)
    .eq("date", today);
  if (error) return { success: false, error: error.message };
  revalidatePath("/staff");
  revalidatePath("/staff/performance");
  return { success: true };
}

export async function toggleChecklistItem(
  id: string,
  checked: boolean,
): Promise<ActionResult> {
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from("checklist_items")
    .update({ checked })
    .eq("id", id);
  if (error) return { success: false, error: error.message };
  revalidatePath("/staff");
  return { success: true };
}
