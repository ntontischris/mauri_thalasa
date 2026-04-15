import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { DbModifier } from "@/lib/types/database";

export async function getModifiers(): Promise<DbModifier[]> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("modifiers")
    .select("id, name, price, created_at, updated_at")
    .order("name");

  if (error) {
    throw new Error(`Failed to fetch modifiers: ${error.message}`);
  }

  return data;
}

export async function getModifiersByProduct(
  productId: string,
): Promise<DbModifier[]> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("product_modifiers")
    .select("modifiers(id, name, price, created_at, updated_at)")
    .eq("product_id", productId);

  if (error) {
    throw new Error(`Failed to fetch product modifiers: ${error.message}`);
  }

  return data.map((d: { modifiers: DbModifier }) => d.modifiers);
}
