"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  createCategorySchema,
  type CreateCategoryInput,
} from "@/lib/validators/products";

interface ActionResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

export async function createCategory(
  input: CreateCategoryInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = createCategorySchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("categories")
    .insert(parsed.data)
    .select("id")
    .single();

  if (error) {
    return { success: false, error: `Αποτυχία δημιουργίας: ${error.message}` };
  }

  revalidatePath("/menu");
  return { success: true, data: { id: data.id } };
}

export async function updateCategory(
  id: string,
  input: { name?: string; sort_order?: number },
): Promise<ActionResult> {
  const patch: Record<string, unknown> = {};
  if (input.name !== undefined) {
    const trimmed = input.name.trim();
    if (trimmed.length === 0 || trimmed.length > 100) {
      return { success: false, error: "Μη έγκυρο όνομα" };
    }
    patch.name = trimmed;
  }
  if (input.sort_order !== undefined) patch.sort_order = input.sort_order;

  if (Object.keys(patch).length === 0) return { success: true };

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from("categories")
    .update(patch)
    .eq("id", id);

  if (error) {
    return { success: false, error: `Αποτυχία ενημέρωσης: ${error.message}` };
  }

  revalidatePath("/menu");
  revalidatePath("/settings/courses");
  return { success: true };
}

export async function deleteCategory(id: string): Promise<ActionResult> {
  const supabase = await createServerSupabaseClient();

  const { error } = await supabase.from("categories").delete().eq("id", id);

  if (error) {
    if (error.message.includes("violates foreign key")) {
      return {
        success: false,
        error: "Η κατηγορία έχει προϊόντα. Μεταφέρετε τα προϊόντα πρώτα.",
      };
    }
    return { success: false, error: error.message };
  }

  revalidatePath("/menu");
  return { success: true };
}
