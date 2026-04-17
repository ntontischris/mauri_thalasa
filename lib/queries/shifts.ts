import { createServerSupabaseClient } from "@/lib/supabase/server";

export interface ShiftStatus {
  staff_id: string;
  clock_in: string | null;
  clock_out: string | null;
}

export async function getTodayShifts(): Promise<ShiftStatus[]> {
  const supabase = await createServerSupabaseClient();
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from("shifts")
    .select("staff_id, clock_in, clock_out")
    .eq("date", today);
  if (error) throw new Error(error.message);
  return data ?? [];
}
