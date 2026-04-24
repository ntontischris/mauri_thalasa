"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  createPublicReservationSchema,
  type CreatePublicReservationInput,
} from "@/lib/validators/reservations";
import { validatePublicBooking } from "@/lib/reservations/public-booking";

export interface PublicReservationResult {
  readonly success: boolean;
  readonly data?: { readonly id: string };
  readonly error?: string;
}

export async function createPublicReservation(
  input: CreatePublicReservationInput,
): Promise<PublicReservationResult> {
  const parsed = createPublicReservationSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  const businessCheck = validatePublicBooking(
    {
      reservation_date: parsed.data.reservation_date,
      reservation_time: parsed.data.reservation_time,
      party_size: parsed.data.party_size,
    },
    { now: new Date() },
  );
  if (!businessCheck.ok) {
    return { success: false, error: businessCheck.error };
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("reservations")
    .insert({
      guest_name: parsed.data.guest_name,
      guest_phone: parsed.data.guest_phone,
      guest_email: parsed.data.guest_email || null,
      party_size: parsed.data.party_size,
      reservation_date: parsed.data.reservation_date,
      reservation_time: parsed.data.reservation_time,
      notes: parsed.data.notes || null,
      status: "pending",
      source: "website",
    })
    .select("id")
    .single();

  if (error) {
    return {
      success: false,
      error: "Αποτυχία καταχώρησης. Παρακαλώ δοκιμάστε ξανά.",
    };
  }

  return { success: true, data: { id: data.id } };
}
