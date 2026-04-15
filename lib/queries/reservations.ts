import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { DbReservation, DbWaitlistEntry } from "@/lib/types/database";

export async function getReservations(date?: string): Promise<DbReservation[]> {
  const supabase = await createServerSupabaseClient();
  let query = supabase
    .from("reservations")
    .select(
      "id, customer_id, guest_name, guest_phone, guest_email, party_size, reservation_date, reservation_time, estimated_duration_minutes, table_id, zone_id, status, source, notes, special_requests, occasion, allergies, confirmation_sent_at, confirmed_at, seated_at, completed_at, cancelled_at, cancellation_reason, created_by, created_at, updated_at",
    )
    .in("status", ["pending", "confirmed", "seated"])
    .order("reservation_date")
    .order("reservation_time");
  if (date) {
    query = query.eq("reservation_date", date);
  }
  const { data, error } = await query;
  if (error) throw new Error(`Failed to fetch reservations: ${error.message}`);
  return data;
}

export async function getWaitlist(): Promise<DbWaitlistEntry[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("waitlist")
    .select(
      "id, customer_id, guest_name, guest_phone, party_size, status, priority, estimated_wait_minutes, preferred_zone_id, table_id, joined_at, notified_at, seated_at, left_at, notes, created_at",
    )
    .eq("status", "waiting")
    .order("priority", { ascending: false })
    .order("joined_at");
  if (error) throw new Error(`Failed to fetch waitlist: ${error.message}`);
  return data;
}
