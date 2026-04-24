"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";

interface ActionResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

const ingredientInput = z.object({
  ingredient_id: z.string().uuid(),
  quantity: z.number().min(0.0001),
  unit: z.string().min(1).max(20),
});

const recipeInput = z.object({
  product_id: z.string().uuid(),
  prep_time: z.number().int().min(0).max(600).nullable().optional(),
  portion_size: z.union([z.number(), z.string()]).nullable().optional(),
  method: z.string().max(5000).nullable().optional(),
  allergens: z.array(z.string().max(40)).max(20).optional(),
  difficulty: z.number().int().min(1).max(5).optional(),
  servings: z.number().int().min(1).max(200).optional(),
  yield_pct: z.number().min(1).max(100).optional(),
  photo_url: z.string().max(500).nullable().optional(),
  target_food_cost_pct: z.number().min(1).max(99).nullable().optional(),
  ingredients: z.array(ingredientInput),
});

export type RecipeInput = z.infer<typeof recipeInput>;

export async function saveRecipe(
  input: RecipeInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = recipeInput.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }
  const supabase = await createServerSupabaseClient();

  const payload = {
    product_id: parsed.data.product_id,
    prep_time: parsed.data.prep_time ?? 0,
    portion_size:
      parsed.data.portion_size == null
        ? "1 μερίδα"
        : String(parsed.data.portion_size),
    method: parsed.data.method ?? null,
    allergens: parsed.data.allergens ?? [],
    difficulty: parsed.data.difficulty ?? 1,
    servings: parsed.data.servings ?? 1,
    yield_pct: parsed.data.yield_pct ?? 100,
    photo_url: parsed.data.photo_url ?? null,
    target_food_cost_pct: parsed.data.target_food_cost_pct ?? null,
  };

  const { data: recipe, error: recipeError } = await supabase
    .from("recipes")
    .upsert(payload, { onConflict: "product_id" })
    .select("id")
    .single();

  if (recipeError) {
    return {
      success: false,
      error: `Αποτυχία αποθήκευσης: ${recipeError.message}`,
    };
  }

  await supabase.from("recipe_ingredients").delete().eq("recipe_id", recipe.id);

  if (parsed.data.ingredients.length > 0) {
    const rows = parsed.data.ingredients.map((ing) => ({
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
  if (error) return { success: false, error: error.message };
  revalidatePath("/recipes");
  return { success: true };
}
