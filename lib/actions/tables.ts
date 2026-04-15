"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { TableStatus } from "@/lib/types/database";

interface ActionResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

export async function updateTableStatus(
  tableId: string,
  status: TableStatus,
  currentOrderId?: string | null,
): Promise<ActionResult> {
  const supabase = await createServerSupabaseClient();

  const update: Record<string, unknown> = { status };
  if (currentOrderId !== undefined) {
    update.current_order_id = currentOrderId;
  }

  const { error } = await supabase
    .from("tables")
    .update(update)
    .eq("id", tableId);

  if (error) {
    return {
      success: false,
      error: `Αποτυχία ενημέρωσης τραπεζιού: ${error.message}`,
    };
  }

  revalidatePath("/tables");
  return { success: true };
}

export async function clearTable(tableId: string): Promise<ActionResult> {
  return updateTableStatus(tableId, "available", null);
}
