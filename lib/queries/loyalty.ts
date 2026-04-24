import { createServerSupabaseClient } from "@/lib/supabase/server";
import type {
  DbLoyaltyTier,
  DbLoyaltyReward,
  DbLoyaltySettings,
  DbLoyaltyTransaction,
} from "@/lib/types/database";

export async function getLoyaltySettings(): Promise<DbLoyaltySettings | null> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("loyalty_settings")
    .select("*")
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`Loyalty settings: ${error.message}`);
  return data as DbLoyaltySettings | null;
}

export async function getLoyaltyTiers(): Promise<DbLoyaltyTier[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("loyalty_tiers")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error) throw new Error(`Tiers: ${error.message}`);
  return (data ?? []) as DbLoyaltyTier[];
}

export async function getLoyaltyRewards(
  onlyActive = false,
): Promise<DbLoyaltyReward[]> {
  const supabase = await createServerSupabaseClient();
  let q = supabase
    .from("loyalty_rewards")
    .select("*")
    .order("sort_order", { ascending: true });
  if (onlyActive) q = q.eq("active", true);
  const { data, error } = await q;
  if (error) throw new Error(`Rewards: ${error.message}`);
  return (data ?? []) as DbLoyaltyReward[];
}

export async function getCustomerBalance(customerId: string): Promise<number> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("loyalty_transactions")
    .select("points")
    .eq("customer_id", customerId);
  if (error) throw new Error(`Balance: ${error.message}`);
  return (data ?? []).reduce((s, r) => s + (r.points ?? 0), 0);
}

export async function getCustomerTransactions(
  customerId: string,
  limit = 50,
): Promise<DbLoyaltyTransaction[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("loyalty_transactions")
    .select("*")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`Txns: ${error.message}`);
  return (data ?? []) as DbLoyaltyTransaction[];
}

export async function getRecentLoyaltyTransactions(
  limit = 100,
): Promise<(DbLoyaltyTransaction & { customer_name?: string })[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("loyalty_transactions")
    .select("*, customers(name)")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`Recent txns: ${error.message}`);
  return (
    (data ?? []) as unknown as (DbLoyaltyTransaction & {
      customers: { name: string } | null;
    })[]
  ).map((r) => ({
    ...r,
    customer_name: r.customers?.name,
  }));
}
