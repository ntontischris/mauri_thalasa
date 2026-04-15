"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";

interface ActionResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

export async function updateLoyaltySettings(settings: {
  points_per_euro: number;
  points_for_reward: number;
  reward_value: number;
  stamps_for_free_item: number;
}): Promise<ActionResult> {
  const supabase = await createServerSupabaseClient();
  const { data: existing } = await supabase
    .from("loyalty_settings")
    .select("id")
    .limit(1)
    .single();
  if (existing) {
    const { error } = await supabase
      .from("loyalty_settings")
      .update(settings)
      .eq("id", existing.id);
    if (error) return { success: false, error: error.message };
  } else {
    const { error } = await supabase.from("loyalty_settings").insert(settings);
    if (error) return { success: false, error: error.message };
  }
  revalidatePath("/loyalty");
  return { success: true };
}

export async function addLoyaltyPoints(
  customerId: string,
  points: number,
): Promise<ActionResult> {
  const supabase = await createServerSupabaseClient();
  const { data: customer } = await supabase
    .from("customers")
    .select("loyalty_points")
    .eq("id", customerId)
    .single();
  if (!customer) return { success: false, error: "Πελάτης δεν βρέθηκε" };
  const { error } = await supabase
    .from("customers")
    .update({ loyalty_points: customer.loyalty_points + points })
    .eq("id", customerId);
  if (error) return { success: false, error: error.message };
  revalidatePath("/loyalty");
  return { success: true };
}
