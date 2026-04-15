import { createServerSupabaseClient } from "@/lib/supabase/server";
import type {
  IngredientWithSupplier,
  WasteEntryWithIngredient,
} from "@/lib/types/database";

export async function getIngredients(): Promise<IngredientWithSupplier[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("ingredients")
    .select(
      `id, name, unit, current_stock, min_stock, cost_per_unit, supplier_id, category, created_at, updated_at, suppliers(name)`,
    )
    .order("category")
    .order("name");
  if (error) throw new Error(`Failed to fetch ingredients: ${error.message}`);
  return data as unknown as IngredientWithSupplier[];
}

export async function getLowStockIngredients(): Promise<
  IngredientWithSupplier[]
> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("ingredients")
    .select(
      `id, name, unit, current_stock, min_stock, cost_per_unit, supplier_id, category, created_at, updated_at, suppliers(name)`,
    )
    .filter("current_stock", "lte", "min_stock" as unknown as string);
  if (error) throw new Error(`Failed to fetch low stock: ${error.message}`);
  return data as unknown as IngredientWithSupplier[];
}

export async function getWasteLog(): Promise<WasteEntryWithIngredient[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("waste_log")
    .select(
      `id, ingredient_id, quantity, reason, date, notes, created_at, ingredients(name, unit)`,
    )
    .order("date", { ascending: false })
    .limit(100);
  if (error) throw new Error(`Failed to fetch waste log: ${error.message}`);
  return data as unknown as WasteEntryWithIngredient[];
}
