import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { DbCourse } from "@/lib/types/database";

export async function getCourses(): Promise<DbCourse[]> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("courses")
    .select("id, name, sort_order, color, created_at, updated_at")
    .order("sort_order", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch courses: ${error.message}`);
  }

  return data;
}
