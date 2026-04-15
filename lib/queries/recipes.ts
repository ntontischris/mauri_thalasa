import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { RecipeWithIngredients } from "@/lib/types/database";

export async function getRecipes(): Promise<RecipeWithIngredients[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("recipes")
    .select(
      `id, product_id, prep_time, portion_size, created_at, updated_at,
       products(name, price),
       recipe_ingredients(id, recipe_id, ingredient_id, quantity, unit,
         ingredients(id, name, unit, cost_per_unit)
       )`,
    )
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Failed to fetch recipes: ${error.message}`);
  return data as unknown as RecipeWithIngredients[];
}
