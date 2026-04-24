import { createServerSupabaseClient } from "@/lib/supabase/server";

export type ReplenishmentUrgency = "critical" | "high" | "normal";

export interface ReplenishmentRow {
  readonly ingredient_id: string;
  readonly ingredient_name: string;
  readonly unit: string;
  readonly current_stock: number;
  readonly min_stock: number;
  readonly cost_per_unit: number;
  readonly category: string;
  readonly supplier_id: string | null;
  readonly supplier_name: string | null;
  readonly shortfall: number;
  readonly suggested_order_qty: number;
  readonly urgency: ReplenishmentUrgency;
}

export async function getReplenishmentNeeded(): Promise<ReplenishmentRow[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("replenishment_needed")
    .select("*")
    .order("urgency", { ascending: true })
    .order("shortfall", { ascending: false });

  if (error) {
    console.error("[replenishment] query failed", error);
    return [];
  }
  return (data ?? []) as ReplenishmentRow[];
}
