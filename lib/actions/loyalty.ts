"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  calculatePointsEarned,
  evaluateTier,
  expirationDate,
  type LoyaltyTier,
} from "@/lib/loyalty/engine";
import type {
  DbLoyaltyReward,
  DbLoyaltyTier,
  LoyaltyTxnKind,
} from "@/lib/types/database";

interface ActionResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

// ───────────────── Settings ─────────────────
const settingsSchema = z.object({
  points_per_euro: z.number().min(0).max(10),
  points_for_reward: z.number().int().min(1),
  reward_value: z.number().min(0),
  stamps_for_free_item: z.number().int().min(1),
  expiration_months: z.number().int().min(0).max(60),
  welcome_bonus: z.number().int().min(0).max(10000),
  birthday_multiplier: z.number().min(1).max(10),
  winback_bonus: z.number().int().min(0).max(10000),
  winback_days: z.number().int().min(7).max(365),
  referral_bonus: z.number().int().min(0).max(10000),
});

export async function updateLoyaltySettings(
  input: z.infer<typeof settingsSchema>,
): Promise<ActionResult> {
  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success)
    return { success: false, error: parsed.error.errors[0].message };
  const supabase = await createServerSupabaseClient();
  const { data: existing } = await supabase
    .from("loyalty_settings")
    .select("id")
    .limit(1)
    .maybeSingle();
  const payload = parsed.data;
  const { error } = existing
    ? await supabase
        .from("loyalty_settings")
        .update(payload)
        .eq("id", existing.id)
    : await supabase.from("loyalty_settings").insert(payload);
  if (error) return { success: false, error: error.message };
  revalidatePath("/loyalty");
  return { success: true };
}

// ───────────────── Tier CRUD ─────────────────
const tierSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(40),
  sort_order: z.number().int().min(1).max(20),
  min_spend_12m: z.number().min(0),
  min_visits_12m: z.number().int().min(0),
  point_multiplier: z.number().min(0.1).max(10),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  icon: z.string().max(40).nullable().optional(),
  perks: z.array(z.string().max(120)).max(10),
});

export async function upsertTier(
  input: z.infer<typeof tierSchema>,
): Promise<ActionResult<{ id: string }>> {
  const parsed = tierSchema.safeParse(input);
  if (!parsed.success)
    return { success: false, error: parsed.error.errors[0].message };
  const supabase = await createServerSupabaseClient();
  const { data, error } = parsed.data.id
    ? await supabase
        .from("loyalty_tiers")
        .update(parsed.data)
        .eq("id", parsed.data.id)
        .select("id")
        .single()
    : await supabase
        .from("loyalty_tiers")
        .insert(parsed.data)
        .select("id")
        .single();
  if (error) return { success: false, error: error.message };
  revalidatePath("/loyalty");
  return { success: true, data: { id: data.id } };
}

export async function deleteTier(id: string): Promise<ActionResult> {
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from("loyalty_tiers").delete().eq("id", id);
  if (error) return { success: false, error: error.message };
  revalidatePath("/loyalty");
  return { success: true };
}

// ───────────────── Reward CRUD ─────────────────
const rewardSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(80),
  description: z.string().max(240).nullable().optional(),
  kind: z.enum(["discount", "free_item", "percent_off", "custom"]),
  points_cost: z.number().int().min(1),
  value: z.number().min(0),
  product_id: z.string().uuid().nullable().optional(),
  min_tier_id: z.string().uuid().nullable().optional(),
  active: z.boolean(),
  stock: z.number().int().min(0).nullable().optional(),
  sort_order: z.number().int().min(0),
});

export async function upsertReward(
  input: z.infer<typeof rewardSchema>,
): Promise<ActionResult<{ id: string }>> {
  const parsed = rewardSchema.safeParse(input);
  if (!parsed.success)
    return { success: false, error: parsed.error.errors[0].message };
  const supabase = await createServerSupabaseClient();
  const { data, error } = parsed.data.id
    ? await supabase
        .from("loyalty_rewards")
        .update(parsed.data)
        .eq("id", parsed.data.id)
        .select("id")
        .single()
    : await supabase
        .from("loyalty_rewards")
        .insert(parsed.data)
        .select("id")
        .single();
  if (error) return { success: false, error: error.message };
  revalidatePath("/loyalty");
  return { success: true, data: { id: data.id } };
}

export async function deleteReward(id: string): Promise<ActionResult> {
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from("loyalty_rewards")
    .delete()
    .eq("id", id);
  if (error) return { success: false, error: error.message };
  revalidatePath("/loyalty");
  return { success: true };
}

// ───────────────── Core ledger operations ─────────────────
async function getBalanceInternal(customerId: string): Promise<number> {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from("loyalty_transactions")
    .select("points")
    .eq("customer_id", customerId);
  return (data ?? []).reduce((s, r) => s + (r.points ?? 0), 0);
}

async function refreshCustomerCache(
  customerId: string,
  tierId: string | null,
  balance: number,
): Promise<void> {
  const supabase = await createServerSupabaseClient();
  const { data: nextExpiring } = await supabase
    .from("loyalty_transactions")
    .select("expires_at")
    .eq("customer_id", customerId)
    .eq("kind", "earn")
    .not("expires_at", "is", null)
    .gt("expires_at", new Date().toISOString())
    .order("expires_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  await supabase
    .from("customers")
    .update({
      loyalty_points: Math.max(0, balance),
      tier_id: tierId,
      tier_updated_at: new Date().toISOString(),
      points_expiring_at: nextExpiring?.expires_at ?? null,
    })
    .eq("id", customerId);
}

interface PostTxnInput {
  customerId: string;
  kind: LoyaltyTxnKind;
  points: number;
  orderId?: string | null;
  rewardId?: string | null;
  note?: string | null;
  expiresAt?: Date | null;
}

async function postTransaction(input: PostTxnInput): Promise<ActionResult> {
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from("loyalty_transactions").insert({
    customer_id: input.customerId,
    kind: input.kind,
    points: Math.round(input.points),
    order_id: input.orderId ?? null,
    reward_id: input.rewardId ?? null,
    note: input.note ?? null,
    expires_at: input.expiresAt ? input.expiresAt.toISOString() : null,
  });
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function adjustPoints(input: {
  customerId: string;
  delta: number;
  note: string;
}): Promise<ActionResult> {
  if (input.delta === 0)
    return { success: false, error: "Delta must be non-zero" };
  const res = await postTransaction({
    customerId: input.customerId,
    kind: "adjust",
    points: input.delta,
    note: input.note,
  });
  if (!res.success) return res;
  const balance = await getBalanceInternal(input.customerId);
  const supabase = await createServerSupabaseClient();
  const { data: customer } = await supabase
    .from("customers")
    .select("tier_id")
    .eq("id", input.customerId)
    .single();
  await refreshCustomerCache(
    input.customerId,
    customer?.tier_id ?? null,
    balance,
  );
  revalidatePath("/customers");
  revalidatePath("/loyalty");
  return { success: true };
}

export async function earnPointsForOrder(input: {
  customerId: string;
  orderId: string;
  subtotal: number;
  isBirthday: boolean;
}): Promise<ActionResult<{ earned: number; newBalance: number }>> {
  const supabase = await createServerSupabaseClient();
  const [{ data: settings }, { data: tiersData }, { data: customer }] =
    await Promise.all([
      supabase.from("loyalty_settings").select("*").limit(1).maybeSingle(),
      supabase.from("loyalty_tiers").select("*"),
      supabase
        .from("customers")
        .select("tier_id, total_spent, total_visits, lifetime_points")
        .eq("id", input.customerId)
        .single(),
    ]);
  if (!settings) return { success: false, error: "No loyalty settings" };
  if (!customer) return { success: false, error: "Customer not found" };

  const tiers = (tiersData ?? []) as DbLoyaltyTier[];
  const engineTiers: LoyaltyTier[] = tiers;
  const currentTier =
    engineTiers.find((t) => t.id === customer.tier_id) ?? null;

  const earned = calculatePointsEarned({
    subtotal: input.subtotal,
    pointsPerEuro: Number(settings.points_per_euro),
    tier: currentTier,
    isBirthday: input.isBirthday,
    birthdayMultiplier: Number(settings.birthday_multiplier ?? 2),
  });
  if (earned === 0)
    return { success: true, data: { earned: 0, newBalance: 0 } };

  const expires = expirationDate(new Date(), settings.expiration_months ?? 18);

  const postRes = await postTransaction({
    customerId: input.customerId,
    kind: "earn",
    points: earned,
    orderId: input.orderId,
    expiresAt: expires,
    note: input.isBirthday ? "Γενέθλια bonus" : null,
  });
  if (!postRes.success) return { success: false, error: postRes.error };

  const { data: updatedCust } = await supabase
    .from("customers")
    .select("total_spent, total_visits, lifetime_points")
    .eq("id", input.customerId)
    .single();

  const newTier = evaluateTier({
    tiers: engineTiers,
    spend12m: Number(updatedCust?.total_spent ?? 0),
    visits12m: updatedCust?.total_visits ?? 0,
  });
  const balance = await getBalanceInternal(input.customerId);

  await refreshCustomerCache(input.customerId, newTier?.id ?? null, balance);
  await supabase
    .from("customers")
    .update({
      lifetime_points: (updatedCust?.lifetime_points ?? 0) + earned,
    })
    .eq("id", input.customerId);

  return { success: true, data: { earned, newBalance: balance } };
}

function computeRewardDiscount(
  reward: DbLoyaltyReward,
  subtotal: number,
): number {
  switch (reward.kind) {
    case "discount":
    case "free_item":
    case "custom":
      return Math.min(reward.value, subtotal);
    case "percent_off": {
      const pct = Math.min(reward.value, 100) / 100;
      return Math.min(subtotal * pct, subtotal);
    }
    default:
      return 0;
  }
}

export async function redeemReward(input: {
  customerId: string;
  rewardId: string;
  orderId: string;
  orderSubtotal: number;
}): Promise<ActionResult<{ discount: number; reward: DbLoyaltyReward }>> {
  const supabase = await createServerSupabaseClient();
  const [balanceRes, { data: reward }, { data: customer }] = await Promise.all([
    supabase
      .from("loyalty_transactions")
      .select("points")
      .eq("customer_id", input.customerId),
    supabase
      .from("loyalty_rewards")
      .select("*")
      .eq("id", input.rewardId)
      .single(),
    supabase
      .from("customers")
      .select("tier_id")
      .eq("id", input.customerId)
      .single(),
  ]);

  if (!reward || !reward.active)
    return { success: false, error: "Το reward δεν είναι διαθέσιμο" };

  const balance = (balanceRes.data ?? []).reduce(
    (s, r) => s + (r.points ?? 0),
    0,
  );
  if (balance < reward.points_cost)
    return {
      success: false,
      error: `Δεν επαρκούν οι πόντοι (${balance}/${reward.points_cost})`,
    };
  if (reward.stock !== null && reward.stock <= 0)
    return { success: false, error: "Το reward εξαντλήθηκε" };

  if (reward.min_tier_id) {
    const { data: reqTier } = await supabase
      .from("loyalty_tiers")
      .select("sort_order")
      .eq("id", reward.min_tier_id)
      .single();
    const { data: custTier } = customer?.tier_id
      ? await supabase
          .from("loyalty_tiers")
          .select("sort_order")
          .eq("id", customer.tier_id)
          .single()
      : { data: null };
    const reqOrder = reqTier?.sort_order ?? 0;
    const custOrder = custTier?.sort_order ?? 0;
    if (custOrder < reqOrder)
      return { success: false, error: "Απαιτείται υψηλότερο tier" };
  }

  const discount = computeRewardDiscount(
    reward as DbLoyaltyReward,
    input.orderSubtotal,
  );

  const txnRes = await postTransaction({
    customerId: input.customerId,
    kind: "redeem",
    points: -reward.points_cost,
    orderId: input.orderId,
    rewardId: reward.id,
    note: `Εξαργύρωση: ${reward.name}`,
  });
  if (!txnRes.success) return { success: false, error: txnRes.error };

  if (reward.stock !== null) {
    await supabase
      .from("loyalty_rewards")
      .update({ stock: Math.max(0, (reward.stock ?? 0) - 1) })
      .eq("id", reward.id);
  }

  const newBalance = await getBalanceInternal(input.customerId);
  await refreshCustomerCache(
    input.customerId,
    customer?.tier_id ?? null,
    newBalance,
  );
  revalidatePath("/customers");
  revalidatePath("/loyalty");

  return {
    success: true,
    data: { discount, reward: reward as DbLoyaltyReward },
  };
}

export async function grantBonus(input: {
  customerId: string;
  points: number;
  kind?: "bonus" | "referral";
  note: string;
  expires?: boolean;
}): Promise<ActionResult> {
  if (input.points <= 0)
    return { success: false, error: "Points must be positive" };
  const supabase = await createServerSupabaseClient();
  const { data: settings } = await supabase
    .from("loyalty_settings")
    .select("expiration_months")
    .limit(1)
    .maybeSingle();
  const expires = input.expires
    ? expirationDate(new Date(), settings?.expiration_months ?? 18)
    : null;

  const res = await postTransaction({
    customerId: input.customerId,
    kind: input.kind ?? "bonus",
    points: input.points,
    expiresAt: expires,
    note: input.note,
  });
  if (!res.success) return res;

  const balance = await getBalanceInternal(input.customerId);
  const { data: customer } = await supabase
    .from("customers")
    .select("tier_id, lifetime_points")
    .eq("id", input.customerId)
    .single();

  await supabase
    .from("customers")
    .update({
      lifetime_points: (customer?.lifetime_points ?? 0) + input.points,
    })
    .eq("id", input.customerId);

  await refreshCustomerCache(
    input.customerId,
    customer?.tier_id ?? null,
    balance,
  );
  revalidatePath("/customers");
  revalidatePath("/loyalty");
  return { success: true };
}

export async function expirePoints(): Promise<
  ActionResult<{ customersAffected: number; totalExpired: number }>
> {
  const supabase = await createServerSupabaseClient();
  const now = new Date().toISOString();
  const { data: expiring, error } = await supabase
    .from("loyalty_transactions")
    .select("customer_id, points")
    .eq("kind", "earn")
    .not("expires_at", "is", null)
    .lte("expires_at", now);
  if (error) return { success: false, error: error.message };

  const byCustomer = new Map<string, number>();
  for (const row of expiring ?? []) {
    byCustomer.set(
      row.customer_id,
      (byCustomer.get(row.customer_id) ?? 0) + row.points,
    );
  }

  let totalExpired = 0;
  for (const [customerId, expiredPoints] of byCustomer) {
    const { data: existing } = await supabase
      .from("loyalty_transactions")
      .select("points")
      .eq("customer_id", customerId)
      .eq("kind", "expire");
    const alreadyExpired = (existing ?? []).reduce(
      (s, r) => s + Math.abs(r.points),
      0,
    );
    const shortfall = expiredPoints - alreadyExpired;
    if (shortfall <= 0) continue;

    await postTransaction({
      customerId,
      kind: "expire",
      points: -shortfall,
      note: `Auto-expire ${shortfall} pts`,
    });
    totalExpired += shortfall;

    const balance = await getBalanceInternal(customerId);
    const { data: cust } = await supabase
      .from("customers")
      .select("tier_id")
      .eq("id", customerId)
      .single();
    await refreshCustomerCache(customerId, cust?.tier_id ?? null, balance);
  }
  revalidatePath("/loyalty");
  return {
    success: true,
    data: { customersAffected: byCustomer.size, totalExpired },
  };
}

// Legacy API kept for older callers; forwards into adjustPoints.
export async function addLoyaltyPoints(
  customerId: string,
  points: number,
): Promise<ActionResult> {
  return adjustPoints({
    customerId,
    delta: points,
    note: "Manual add (legacy)",
  });
}
