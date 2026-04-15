"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  createReservationSchema,
  updateReservationStatusSchema,
  addToWaitlistSchema,
  type CreateReservationInput,
  type UpdateReservationStatusInput,
  type AddToWaitlistInput,
} from "@/lib/validators/reservations";

interface ActionResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

export async function createReservation(
  input: CreateReservationInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = createReservationSchema.safeParse(input);
  if (!parsed.success)
    return { success: false, error: parsed.error.errors[0].message };
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("reservations")
    .insert({ ...parsed.data, status: "pending", source: "manual" })
    .select("id")
    .single();
  if (error)
    return { success: false, error: `Αποτυχία δημιουργίας: ${error.message}` };
  revalidatePath("/reservations");
  return { success: true, data: { id: data.id } };
}

export async function updateReservationStatus(
  input: UpdateReservationStatusInput,
): Promise<ActionResult> {
  const parsed = updateReservationStatusSchema.safeParse(input);
  if (!parsed.success)
    return { success: false, error: parsed.error.errors[0].message };
  const supabase = await createServerSupabaseClient();
  const update: Record<string, unknown> = { status: parsed.data.status };
  if (parsed.data.status === "confirmed")
    update.confirmed_at = new Date().toISOString();
  if (parsed.data.status === "seated")
    update.seated_at = new Date().toISOString();
  if (parsed.data.status === "completed")
    update.completed_at = new Date().toISOString();
  if (parsed.data.status === "cancelled") {
    update.cancelled_at = new Date().toISOString();
    update.cancellation_reason = parsed.data.cancellation_reason ?? null;
  }
  const { error } = await supabase
    .from("reservations")
    .update(update)
    .eq("id", parsed.data.id);
  if (error) return { success: false, error: error.message };
  revalidatePath("/reservations");
  return { success: true };
}

export async function addToWaitlist(
  input: AddToWaitlistInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = addToWaitlistSchema.safeParse(input);
  if (!parsed.success)
    return { success: false, error: parsed.error.errors[0].message };
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("waitlist")
    .insert({
      ...parsed.data,
      status: "waiting",
      priority: 0,
      joined_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (error) return { success: false, error: error.message };
  revalidatePath("/reservations");
  return { success: true, data: { id: data.id } };
}

export async function removeFromWaitlist(id: string): Promise<ActionResult> {
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from("waitlist")
    .update({ status: "left", left_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { success: false, error: error.message };
  revalidatePath("/reservations");
  return { success: true };
}
