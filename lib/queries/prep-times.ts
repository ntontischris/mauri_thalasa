import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { StationType } from "@/lib/types/database";
import {
  summarizePrepTimes,
  type PrepTimeSummary,
} from "@/lib/analytics/prep-time-stats";

export interface PrepTimeRow {
  readonly order_item_id: string;
  readonly order_id: string;
  readonly product_id: string;
  readonly product_name: string;
  readonly station: StationType;
  readonly prep_started_at: string;
  readonly prep_finished_at: string;
  readonly prep_seconds: number;
}

export async function getPrepTimesSince(
  sinceIso: string,
): Promise<PrepTimeRow[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("order_item_prep_times")
    .select(
      "order_item_id, order_id, product_id, product_name, station, prep_started_at, prep_finished_at, prep_seconds",
    )
    .gte("prep_finished_at", sinceIso);

  if (error) {
    console.error("[prep-times] query failed", error);
    return [];
  }
  return (data ?? []) as PrepTimeRow[];
}

export async function getPrepTimeSummaryByStation(
  sinceIso: string,
): Promise<Record<StationType, PrepTimeSummary>> {
  const rows = await getPrepTimesSince(sinceIso);
  const buckets: Record<StationType, number[]> = {
    hot: [],
    cold: [],
    bar: [],
    dessert: [],
  };
  for (const r of rows) {
    buckets[r.station]?.push(r.prep_seconds);
  }
  return {
    hot: summarizePrepTimes(buckets.hot),
    cold: summarizePrepTimes(buckets.cold),
    bar: summarizePrepTimes(buckets.bar),
    dessert: summarizePrepTimes(buckets.dessert),
  };
}
