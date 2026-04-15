"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  createSupplierSchema,
  updateSupplierSchema,
  createSupplierOrderSchema,
  type CreateSupplierInput,
  type UpdateSupplierInput,
  type CreateSupplierOrderInput,
} from "@/lib/validators/suppliers";
import type { SupplierOrderStatus } from "@/lib/types/database";

interface ActionResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

export async function createSupplier(
  input: CreateSupplierInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = createSupplierSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("suppliers")
    .insert(parsed.data)
    .select("id")
    .single();

  if (error) {
    return { success: false, error: `Αποτυχία δημιουργίας: ${error.message}` };
  }

  revalidatePath("/inventory");
  return { success: true, data: { id: data.id } };
}

export async function updateSupplier(
  id: string,
  input: UpdateSupplierInput,
): Promise<ActionResult> {
  const parsed = updateSupplierSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  const supabase = await createServerSupabaseClient();

  const { error } = await supabase
    .from("suppliers")
    .update(parsed.data)
    .eq("id", id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/inventory");
  return { success: true };
}

export async function createSupplierOrder(
  input: CreateSupplierOrderInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = createSupplierOrderSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  const supabase = await createServerSupabaseClient();

  const { data: order, error: orderError } = await supabase
    .from("supplier_orders")
    .insert({
      supplier_id: parsed.data.supplier_id,
      status: "draft",
      notes: parsed.data.notes ?? null,
    })
    .select("id")
    .single();

  if (orderError) {
    return { success: false, error: orderError.message };
  }

  const items = parsed.data.items.map((item) => ({
    supplier_order_id: order.id,
    ...item,
  }));

  const { error: itemsError } = await supabase
    .from("supplier_order_items")
    .insert(items);

  if (itemsError) {
    await supabase.from("supplier_orders").delete().eq("id", order.id);
    return { success: false, error: itemsError.message };
  }

  revalidatePath("/inventory");
  return { success: true, data: { id: order.id } };
}

export async function updateSupplierOrderStatus(
  orderId: string,
  status: SupplierOrderStatus,
): Promise<ActionResult> {
  const supabase = await createServerSupabaseClient();

  const { error } = await supabase
    .from("supplier_orders")
    .update({ status })
    .eq("id", orderId);

  if (error) {
    return { success: false, error: error.message };
  }

  if (status === "received") {
    const { data: items } = await supabase
      .from("supplier_order_items")
      .select("ingredient_id, quantity")
      .eq("supplier_order_id", orderId);

    if (items) {
      for (const item of items) {
        const { data: ing } = await supabase
          .from("ingredients")
          .select("current_stock")
          .eq("id", item.ingredient_id)
          .single();

        if (ing) {
          await supabase
            .from("ingredients")
            .update({ current_stock: ing.current_stock + item.quantity })
            .eq("id", item.ingredient_id);
        }
      }
    }
  }

  revalidatePath("/inventory");
  return { success: true };
}
