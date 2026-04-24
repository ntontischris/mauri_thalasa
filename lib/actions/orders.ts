"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentStaffId } from "@/lib/auth/current-staff";
import { getModifiersByProduct } from "@/lib/queries/modifiers";
import type { DbModifier } from "@/lib/types/database";
import {
  addOrderItemSchema,
  updateItemQuantitySchema,
  updateItemStatusSchema,
  completeOrderSchema,
  sendCourseSchema,
  advanceCourseSchema,
  toggleRushSchema,
  type AddOrderItemInput,
  type UpdateItemQuantityInput,
  type UpdateItemStatusInput,
  type CompleteOrderInput,
  type SendCourseInput,
  type AdvanceCourseInput,
  type ToggleRushInput,
} from "@/lib/validators/orders";
import { earnPointsForOrder, redeemReward } from "@/lib/actions/loyalty";

interface ActionResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

export async function createOrder(
  tableId: string,
  tableNumber: number,
): Promise<ActionResult<{ id: string }>> {
  const supabase = await createServerSupabaseClient();

  const staffId = await getCurrentStaffId(supabase);
  if (!staffId) {
    // Not fatal yet (legacy + background calls may lack an auth session),
    // but make the gap visible so the NOT-NULL follow-up migration can land
    // once every code path is verified to set it.
    console.warn(
      `[orders] createOrder called without an authenticated staff context (table ${tableNumber})`,
    );
  }

  const { data, error } = await supabase
    .from("orders")
    .insert({
      table_id: tableId,
      table_number: tableNumber,
      status: "active",
      total: 0,
      vat_amount: 0,
      discount_amount: 0,
      active_course: 1,
      is_rush: false,
      created_by: staffId,
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      // Unique constraint violation - order already exists
      const { data: existing } = await supabase
        .from("orders")
        .select("id")
        .eq("table_id", tableId)
        .eq("status", "active")
        .single();

      if (existing) {
        return { success: true, data: { id: existing.id } };
      }
    }
    return { success: false, error: `Αποτυχία δημιουργίας: ${error.message}` };
  }

  // Update table status to occupied
  await supabase
    .from("tables")
    .update({ status: "occupied", current_order_id: data.id })
    .eq("id", tableId);

  revalidatePath("/tables");
  revalidatePath(`/orders/${tableId}`);
  return { success: true, data: { id: data.id } };
}

export async function addOrderItem(
  input: AddOrderItemInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = addOrderItemSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  const supabase = await createServerSupabaseClient();
  const { orderId, modifiers, ...itemData } = parsed.data;

  // Insert order item
  const { data: item, error: itemError } = await supabase
    .from("order_items")
    .insert({
      order_id: orderId,
      product_id: itemData.productId,
      product_name: itemData.productName,
      price: itemData.price,
      quantity: itemData.quantity,
      station: itemData.station,
      notes: itemData.notes ?? null,
      course: itemData.course ?? 1,
      status: "pending",
    })
    .select("id")
    .single();

  if (itemError) {
    return {
      success: false,
      error: `Αποτυχία προσθήκης: ${itemError.message}`,
    };
  }

  // Insert modifiers if any
  if (modifiers && modifiers.length > 0) {
    const modifierRows = modifiers.map((m) => ({
      order_item_id: item.id,
      modifier_id: m.modifierId,
      name: m.name,
      price: m.price,
    }));

    const { error: modError } = await supabase
      .from("order_item_modifiers")
      .insert(modifierRows);

    if (modError) {
      // Rollback: delete the item
      await supabase.from("order_items").delete().eq("id", item.id);
      return {
        success: false,
        error: `Αποτυχία modifiers: ${modError.message}`,
      };
    }
  }

  revalidatePath("/orders");
  revalidatePath("/kitchen");
  return { success: true, data: { id: item.id } };
}

export async function updateItemQuantity(
  input: UpdateItemQuantityInput,
): Promise<ActionResult> {
  const parsed = updateItemQuantitySchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  const supabase = await createServerSupabaseClient();

  const { error } = await supabase
    .from("order_items")
    .update({ quantity: parsed.data.quantity })
    .eq("id", parsed.data.itemId)
    .eq("status", "pending"); // Can only change quantity of pending items

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/orders");
  return { success: true };
}

export async function removeOrderItem(itemId: string): Promise<ActionResult> {
  const supabase = await createServerSupabaseClient();

  // Delete modifiers first (FK constraint)
  await supabase
    .from("order_item_modifiers")
    .delete()
    .eq("order_item_id", itemId);

  const { error } = await supabase
    .from("order_items")
    .delete()
    .eq("id", itemId)
    .eq("status", "pending"); // Can only remove pending items

  if (error) {
    return { success: false, error: `Αποτυχία αφαίρεσης: ${error.message}` };
  }

  revalidatePath("/orders");
  revalidatePath("/kitchen");
  return { success: true };
}

export async function updateItemStatus(
  input: UpdateItemStatusInput,
): Promise<ActionResult> {
  const parsed = updateItemStatusSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  const supabase = await createServerSupabaseClient();

  const { error } = await supabase
    .from("order_items")
    .update({ status: parsed.data.status })
    .eq("id", parsed.data.itemId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/kitchen");
  revalidatePath("/orders");
  return { success: true };
}

export async function completeOrder(
  input: CompleteOrderInput,
): Promise<ActionResult> {
  const parsed = completeOrderSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  const supabase = await createServerSupabaseClient();

  // Fetch items with product VAT rates for total calculation
  const { data: items, error: itemsError } = await supabase
    .from("order_items")
    .select(
      `id, price, quantity,
       order_item_modifiers(price),
       products!inner(vat_rate)`,
    )
    .eq("order_id", parsed.data.orderId);

  if (itemsError) {
    return {
      success: false,
      error: `Αποτυχία υπολογισμού: ${itemsError.message}`,
    };
  }

  // Calculate totals
  let total = 0;
  let vatTotal = 0;

  for (const item of items) {
    const modifierSum = (
      item.order_item_modifiers as { price: number }[]
    ).reduce((sum, m) => sum + m.price, 0);
    const itemTotal = (item.price + modifierSum) * item.quantity;
    const vatRate =
      (item.products as unknown as { vat_rate: number })?.vat_rate ?? 24;
    const vatAmount = itemTotal - itemTotal / (1 + vatRate / 100);

    total += itemTotal;
    vatTotal += vatAmount;
  }

  total = Math.round(total * 100) / 100;
  vatTotal = Math.round(vatTotal * 100) / 100;

  // Mark all items as served
  await supabase
    .from("order_items")
    .update({ status: "served" })
    .eq("order_id", parsed.data.orderId)
    .neq("status", "served");

  const tipAmount = Math.round((parsed.data.tipAmount ?? 0) * 100) / 100;

  const { data: preOrderRow } = await supabase
    .from("orders")
    .select("customer_id")
    .eq("id", parsed.data.orderId)
    .single();
  const customerId = preOrderRow?.customer_id ?? null;

  let loyaltyDiscount = 0;
  if (parsed.data.rewardId && customerId) {
    const redeemRes = await redeemReward({
      customerId,
      rewardId: parsed.data.rewardId,
      orderId: parsed.data.orderId,
      orderSubtotal: total,
    });
    if (!redeemRes.success) {
      return {
        success: false,
        error: redeemRes.error ?? "Αποτυχία εξαργύρωσης",
      };
    }
    loyaltyDiscount = Math.round((redeemRes.data?.discount ?? 0) * 100) / 100;
  }

  const finalTotal = Math.max(0, total - loyaltyDiscount);

  const completedBy = await getCurrentStaffId(supabase);
  if (!completedBy) {
    console.warn(
      `[orders] completeOrder without authenticated staff context (order ${parsed.data.orderId.slice(-6)})`,
    );
  }

  const { error: orderError } = await supabase
    .from("orders")
    .update({
      status: "completed",
      payment_method: parsed.data.paymentMethod,
      discount_amount: loyaltyDiscount,
      total: finalTotal,
      tip_amount: tipAmount,
      vat_amount: vatTotal,
      completed_at: new Date().toISOString(),
      completed_by: completedBy,
    })
    .eq("id", parsed.data.orderId);

  if (orderError) {
    return {
      success: false,
      error: `Αποτυχία ολοκλήρωσης: ${orderError.message}`,
    };
  }

  // Free the table
  await supabase
    .from("tables")
    .update({ status: "available", current_order_id: null })
    .eq("id", parsed.data.tableId);

  if (customerId) {
    const { data: itemRows } = await supabase
      .from("order_items")
      .select("product_name")
      .eq("order_id", parsed.data.orderId);

    const productNames = Array.from(
      new Set((itemRows ?? []).map((i) => i.product_name as string)),
    );

    const { data: orderRow2 } = await supabase
      .from("orders")
      .select("table_number, total")
      .eq("id", parsed.data.orderId)
      .single();

    await supabase.from("customer_visits").insert({
      customer_id: customerId,
      order_id: parsed.data.orderId,
      table_number: orderRow2?.table_number ?? 0,
      total: orderRow2?.total ?? finalTotal,
      items: productNames,
    });

    const { data: customerRow } = await supabase
      .from("customers")
      .select("birthday, stamp_count")
      .eq("id", customerId)
      .single();

    const today = new Date();
    const isBirthday =
      !!customerRow?.birthday &&
      new Date(customerRow.birthday).getMonth() === today.getMonth() &&
      new Date(customerRow.birthday).getDate() === today.getDate();

    await earnPointsForOrder({
      customerId,
      orderId: parsed.data.orderId,
      subtotal: finalTotal,
      isBirthday,
    });

    await supabase
      .from("customers")
      .update({
        stamp_count: Math.min(10, (customerRow?.stamp_count ?? 0) + 1),
      })
      .eq("id", customerId);
  }

  revalidatePath("/tables");
  revalidatePath("/orders");
  revalidatePath("/kitchen");
  revalidatePath("/customers");
  return { success: true };
}

export async function linkOrderToCustomer(
  orderId: string,
  customerId: string | null,
): Promise<ActionResult> {
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from("orders")
    .update({ customer_id: customerId })
    .eq("id", orderId);
  if (error) return { success: false, error: error.message };
  revalidatePath("/orders");
  return { success: true };
}

export async function cancelOrder(
  orderId: string,
  tableId: string,
  reason?: string,
): Promise<ActionResult> {
  const supabase = await createServerSupabaseClient();

  const trimmed = reason?.trim();
  const patch: Record<string, unknown> = {
    status: "cancelled",
    cancelled_at: new Date().toISOString(),
  };
  if (trimmed) patch.cancellation_reason = trimmed;

  const { error } = await supabase
    .from("orders")
    .update(patch)
    .eq("id", orderId);

  if (error) {
    return { success: false, error: `Αποτυχία ακύρωσης: ${error.message}` };
  }

  // Free the table
  await supabase
    .from("tables")
    .update({ status: "available", current_order_id: null })
    .eq("id", tableId);

  revalidatePath("/tables");
  revalidatePath("/orders");
  revalidatePath("/kitchen");
  return { success: true };
}

export async function fetchProductModifiers(
  productId: string,
): Promise<ActionResult<DbModifier[]>> {
  try {
    const modifiers = await getModifiersByProduct(productId);
    return { success: true, data: modifiers };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return { success: false, error: msg };
  }
}

export async function sendCourseToKitchen(
  input: SendCourseInput,
): Promise<ActionResult<{ count: number }>> {
  const parsed = sendCourseSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("order_items")
    .update({ status: "preparing" })
    .eq("order_id", parsed.data.orderId)
    .eq("course", parsed.data.courseNumber)
    .eq("status", "pending")
    .select("id");

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/kitchen");
  revalidatePath("/orders");
  return { success: true, data: { count: data?.length ?? 0 } };
}

export async function advanceCourse(
  input: AdvanceCourseInput,
): Promise<ActionResult> {
  const parsed = advanceCourseSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  const supabase = await createServerSupabaseClient();

  const { error } = await supabase
    .from("orders")
    .update({ active_course: parsed.data.newActiveCourse })
    .eq("id", parsed.data.orderId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/orders");
  return { success: true };
}

export async function sendAllPendingToKitchen(
  orderId: string,
): Promise<ActionResult<{ count: number }>> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("order_items")
    .update({ status: "preparing" })
    .eq("order_id", orderId)
    .eq("status", "pending")
    .select("id");

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/kitchen");
  revalidatePath("/orders");
  return { success: true, data: { count: data?.length ?? 0 } };
}

export async function markReadyItemsServed(
  orderId: string,
): Promise<ActionResult<{ count: number }>> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("order_items")
    .update({ status: "served" })
    .eq("order_id", orderId)
    .eq("status", "ready")
    .select("id");

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/orders");
  revalidatePath("/kitchen");
  return { success: true, data: { count: data?.length ?? 0 } };
}

export async function toggleOrderRush(
  input: ToggleRushInput,
): Promise<ActionResult> {
  const parsed = toggleRushSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  const supabase = await createServerSupabaseClient();

  const { error } = await supabase
    .from("orders")
    .update({ is_rush: parsed.data.isRush })
    .eq("id", parsed.data.orderId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/orders");
  revalidatePath("/kitchen");
  return { success: true };
}
