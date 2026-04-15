"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  createIngredientSchema,
  updateIngredientSchema,
  updateStockSchema,
  recordWasteSchema,
  type CreateIngredientInput,
  type UpdateIngredientInput,
  type UpdateStockInput,
  type RecordWasteInput,
} from "@/lib/validators/inventory";

interface ActionResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

export async function createIngredient(
  input: CreateIngredientInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = createIngredientSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("ingredients")
    .insert(parsed.data)
    .select("id")
    .single();

  if (error) {
    return { success: false, error: `Αποτυχία δημιουργίας: ${error.message}` };
  }

  revalidatePath("/inventory");
  return { success: true, data: { id: data.id } };
}

export async function updateIngredient(
  id: string,
  input: UpdateIngredientInput,
): Promise<ActionResult> {
  const parsed = updateIngredientSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  const supabase = await createServerSupabaseClient();

  const { error } = await supabase
    .from("ingredients")
    .update(parsed.data)
    .eq("id", id);

  if (error) {
    return { success: false, error: `Αποτυχία ενημέρωσης: ${error.message}` };
  }

  revalidatePath("/inventory");
  return { success: true };
}

export async function updateStock(
  input: UpdateStockInput,
): Promise<ActionResult> {
  const parsed = updateStockSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  const supabase = await createServerSupabaseClient();

  const { data: ingredient, error: fetchError } = await supabase
    .from("ingredients")
    .select("current_stock")
    .eq("id", parsed.data.ingredientId)
    .single();

  if (fetchError) {
    return { success: false, error: fetchError.message };
  }

  const newStock = ingredient.current_stock + parsed.data.quantity;

  if (newStock < 0) {
    return { success: false, error: "Ανεπαρκές απόθεμα" };
  }

  const { error } = await supabase
    .from("ingredients")
    .update({ current_stock: newStock })
    .eq("id", parsed.data.ingredientId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/inventory");
  return { success: true };
}

export async function deleteIngredient(id: string): Promise<ActionResult> {
  const supabase = await createServerSupabaseClient();

  const { error } = await supabase.from("ingredients").delete().eq("id", id);

  if (error) {
    if (error.message.includes("foreign key")) {
      return { success: false, error: "Το υλικό χρησιμοποιείται σε συνταγές" };
    }
    return { success: false, error: error.message };
  }

  revalidatePath("/inventory");
  return { success: true };
}

export async function recordWaste(
  input: RecordWasteInput,
): Promise<ActionResult> {
  const parsed = recordWasteSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  const supabase = await createServerSupabaseClient();

  const { error: wasteError } = await supabase.from("waste_log").insert({
    ...parsed.data,
    date: new Date().toISOString().split("T")[0],
  });

  if (wasteError) {
    return {
      success: false,
      error: `Αποτυχία καταγραφής: ${wasteError.message}`,
    };
  }

  await updateStock({
    ingredientId: parsed.data.ingredient_id,
    quantity: -parsed.data.quantity,
  });

  revalidatePath("/inventory");
  return { success: true };
}
