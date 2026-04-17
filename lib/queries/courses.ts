import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { DbCourse } from "@/lib/types/database";

export async function getCourses(): Promise<DbCourse[]> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("courses")
    .select("id, name, sort_order, color, created_at, updated_at")
    .order("sort_order", { ascending: true });

  if (error) {
    // If the migration hasn't been applied yet, the table won't exist.
    // Return an empty list so the app keeps working; the /settings/courses
    // page will just appear empty until migration 023 runs.
    if (
      error.code === "PGRST205" ||
      /schema cache|does not exist/i.test(error.message)
    ) {
      console.warn(
        "[courses] Table not found — run migration 023_courses_table.sql",
      );
      return [];
    }
    throw new Error(`Failed to fetch courses: ${error.message}`);
  }

  return data;
}
