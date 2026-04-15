import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { DbCategory } from "@/lib/types/database";

export async function getCategories(): Promise<DbCategory[]> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch categories: ${error.message}`);
  }

  return data;
}
