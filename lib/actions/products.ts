"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  createProductSchema,
  updateProductSchema,
  type CreateProductInput,
  type UpdateProductInput,
} from "@/lib/validators/products";

interface ActionResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

export async function createProduct(
  input: CreateProductInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = createProductSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("products")
    .insert(parsed.data)
    .select("id")
    .single();

  if (error) {
    return { success: false, error: `Αποτυχία δημιουργίας: ${error.message}` };
  }

  revalidatePath("/menu");
  return { success: true, data: { id: data.id } };
}

export async function updateProduct(
  id: string,
  input: UpdateProductInput,
): Promise<ActionResult> {
  const parsed = updateProductSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  const supabase = await createServerSupabaseClient();

  const { error } = await supabase
    .from("products")
    .update(parsed.data)
    .eq("id", id);

  if (error) {
    return { success: false, error: `Αποτυχία ενημέρωσης: ${error.message}` };
  }

  revalidatePath("/menu");
  return { success: true };
}

export async function deleteProduct(id: string): Promise<ActionResult> {
  const supabase = await createServerSupabaseClient();

  const { error } = await supabase.from("products").delete().eq("id", id);

  if (error) {
    return { success: false, error: `Αποτυχία διαγραφής: ${error.message}` };
  }

  revalidatePath("/menu");
  return { success: true };
}

export async function toggleProductAvailability(
  id: string,
  available: boolean,
): Promise<ActionResult> {
  const supabase = await createServerSupabaseClient();

  const { error } = await supabase
    .from("products")
    .update({ available })
    .eq("id", id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/menu");
  return { success: true };
}
