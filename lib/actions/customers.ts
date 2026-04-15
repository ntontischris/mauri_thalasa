"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  createCustomerSchema,
  updateCustomerSchema,
  type CreateCustomerInput,
  type UpdateCustomerInput,
} from "@/lib/validators/customers";

interface ActionResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

export async function createCustomer(
  input: CreateCustomerInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = createCustomerSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("customers")
    .insert(parsed.data)
    .select("id")
    .single();

  if (error) {
    return { success: false, error: `Αποτυχία δημιουργίας: ${error.message}` };
  }

  revalidatePath("/customers");
  return { success: true, data: { id: data.id } };
}

export async function updateCustomer(
  id: string,
  input: UpdateCustomerInput,
): Promise<ActionResult> {
  const parsed = updateCustomerSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  const supabase = await createServerSupabaseClient();

  const { error } = await supabase
    .from("customers")
    .update(parsed.data)
    .eq("id", id);

  if (error) {
    return { success: false, error: `Αποτυχία ενημέρωσης: ${error.message}` };
  }

  revalidatePath("/customers");
  return { success: true };
}

export async function deleteCustomer(id: string): Promise<ActionResult> {
  const supabase = await createServerSupabaseClient();

  const { error } = await supabase
    .from("customers")
    .update({ is_active: false })
    .eq("id", id);

  if (error) {
    return { success: false, error: `Αποτυχία διαγραφής: ${error.message}` };
  }

  revalidatePath("/customers");
  return { success: true };
}
