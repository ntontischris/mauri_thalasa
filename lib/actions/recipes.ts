"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";

interface ActionResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

interface RecipeIngredientInput {
  ingredient_id: string;
  quantity: number;
  unit: string;
}

interface RecipeInput {
  product_id: string;
  prep_time?: number;
  portion_size?: number;
  ingredients: RecipeIngredientInput[];
}

export async function saveRecipe(
  input: RecipeInput,
): Promise<ActionResult<{ id: string }>> {
  const supabase = await createServerSupabaseClient();

  const { data: recipe, error: recipeError } = await supabase
    .from("recipes")
    .upsert(
      {
        product_id: input.product_id,
        prep_time: input.prep_time ?? null,
        portion_size: input.portion_size ?? null,
      },
      { onConflict: "product_id" },
    )
    .select("id")
    .single();

  if (recipeError) {
    return {
      success: false,
      error: `Αποτυχία αποθήκευσης: ${recipeError.message}`,
    };
  }

  await supabase.from("recipe_ingredients").delete().eq("recipe_id", recipe.id);

  if (input.ingredients.length > 0) {
    const rows = input.ingredients.map((ing) => ({
      recipe_id: recipe.id,
      ingredient_id: ing.ingredient_id,
      quantity: ing.quantity,
      unit: ing.unit,
    }));

    const { error: ingError } = await supabase
      .from("recipe_ingredients")
      .insert(rows);

    if (ingError) {
      return { success: false, error: `Αποτυχία υλικών: ${ingError.message}` };
    }
  }

  revalidatePath("/recipes");
  return { success: true, data: { id: recipe.id } };
}

export async function deleteRecipe(recipeId: string): Promise<ActionResult> {
  const supabase = await createServerSupabaseClient();

  await supabase.from("recipe_ingredients").delete().eq("recipe_id", recipeId);

  const { error } = await supabase.from("recipes").delete().eq("id", recipeId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/recipes");
  return { success: true };
}
