import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { DbCustomer, DbCustomerVisit } from "@/lib/types/database";

export async function getCustomers(search?: string): Promise<DbCustomer[]> {
  const supabase = await createServerSupabaseClient();
  let query = supabase
    .from("customers")
    .select(
      "id, name, phone, email, birthday, notes, is_vip, allergies, tags, loyalty_points, stamp_count, afm, address, contact, billing, is_active, discount, legacy_id, source, metadata, last_visit_at, total_visits, total_spent, marketing_opt_in, created_at, updated_at",
    )
    .eq("is_active", true)
    .order("name", { ascending: true });
  if (search) {
    query = query.or(
      `name.ilike.%${search}%,phone.ilike.%${search}%,afm.ilike.%${search}%`,
    );
  }
  const { data, error } = await query;
  if (error) throw new Error(`Failed to fetch customers: ${error.message}`);
  return data;
}

export async function getCustomerById(id: string): Promise<DbCustomer | null> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("customers")
    .select(
      "id, name, phone, email, birthday, notes, is_vip, allergies, tags, loyalty_points, stamp_count, afm, address, contact, billing, is_active, discount, legacy_id, source, metadata, last_visit_at, total_visits, total_spent, marketing_opt_in, created_at, updated_at",
    )
    .eq("id", id)
    .single();
  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(`Failed to fetch customer: ${error.message}`);
  }
  return data;
}

export async function getCustomerVisits(
  customerId: string,
): Promise<DbCustomerVisit[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("customer_visits")
    .select(
      "id, customer_id, order_id, date, table_number, total, items, created_at",
    )
    .eq("customer_id", customerId)
    .order("date", { ascending: false })
    .limit(50);
  if (error) throw new Error(`Failed to fetch visits: ${error.message}`);
  return data;
}
