import { createServerSupabaseClient } from "@/lib/supabase/server";
import type {
  DbStaffMember,
  DbShift,
  DbChecklistItem,
} from "@/lib/types/database";

export async function getStaffMembers(): Promise<DbStaffMember[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("staff_members")
    .select(
      "id, name, role, pin, phone, email, is_active, legacy_id, source, metadata, created_at, updated_at",
    )
    .eq("is_active", true)
    .order("name");
  if (error) throw new Error(`Failed to fetch staff: ${error.message}`);
  return data;
}

export async function getShifts(
  startDate: string,
  endDate: string,
): Promise<DbShift[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("shifts")
    .select("id, staff_id, date, type, clock_in, clock_out")
    .gte("date", startDate)
    .lte("date", endDate)
    .order("date");
  if (error) throw new Error(`Failed to fetch shifts: ${error.message}`);
  return data;
}

export async function getChecklist(
  type: "opening" | "closing",
): Promise<DbChecklistItem[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("checklist_items")
    .select("id, type, label, checked, created_at")
    .eq("type", type)
    .order("created_at");
  if (error) throw new Error(`Failed to fetch checklist: ${error.message}`);
  return data;
}
