export interface LoyaltyTier {
  id: string;
  name: string;
  sort_order: number;
  min_spend_12m: number;
  min_visits_12m: number;
  point_multiplier: number;
  color: string;
  icon?: string | null;
  perks: string[];
}

export interface LoyaltyReward {
  id: string;
  name: string;
  description?: string | null;
  kind: "discount" | "free_item" | "percent_off" | "custom";
  points_cost: number;
  value: number;
  product_id?: string | null;
  min_tier_id?: string | null;
  active: boolean;
  stock?: number | null;
  sort_order: number;
}

export interface CalcPointsInput {
  subtotal: number;
  pointsPerEuro: number;
  tier: LoyaltyTier | null;
  isBirthday: boolean;
  birthdayMultiplier: number;
}

export function calculatePointsEarned(input: CalcPointsInput): number {
  const { subtotal, pointsPerEuro, tier, isBirthday, birthdayMultiplier } =
    input;
  if (subtotal <= 0 || pointsPerEuro <= 0) return 0;
  const tierMult = tier?.point_multiplier ?? 1;
  const bdayMult = isBirthday ? birthdayMultiplier : 1;
  const raw = subtotal * pointsPerEuro * tierMult * bdayMult;
  return Math.floor(raw);
}

export interface EvaluateTierInput {
  tiers: LoyaltyTier[];
  spend12m: number;
  visits12m: number;
}

export function evaluateTier(input: EvaluateTierInput): LoyaltyTier | null {
  if (input.tiers.length === 0) return null;
  const sorted = [...input.tiers].sort((a, b) => b.sort_order - a.sort_order);
  for (const t of sorted) {
    if (
      input.spend12m >= t.min_spend_12m &&
      input.visits12m >= t.min_visits_12m
    ) {
      return t;
    }
  }
  // fallback to the lowest tier
  return sorted[sorted.length - 1] ?? null;
}

export interface ProgressInput {
  tiers: LoyaltyTier[];
  currentTierId: string | null;
  spend12m: number;
  visits12m: number;
}

export interface ProgressResult {
  current: LoyaltyTier | null;
  next: LoyaltyTier | null;
  spendNeeded: number;
  visitsNeeded: number;
  progressPct: number;
}

export function progressToNextTier(input: ProgressInput): ProgressResult {
  const sorted = [...input.tiers].sort((a, b) => a.sort_order - b.sort_order);
  const current =
    sorted.find((t) => t.id === input.currentTierId) ?? sorted[0] ?? null;
  const currentIdx = current
    ? sorted.findIndex((t) => t.id === current.id)
    : -1;
  const next = currentIdx >= 0 ? (sorted[currentIdx + 1] ?? null) : null;

  if (!next) {
    return {
      current,
      next: null,
      spendNeeded: 0,
      visitsNeeded: 0,
      progressPct: 100,
    };
  }

  const spendGap = Math.max(0, next.min_spend_12m - input.spend12m);
  const visitsGap = Math.max(0, next.min_visits_12m - input.visits12m);

  const spendBase = next.min_spend_12m - (current?.min_spend_12m ?? 0);
  const visitsBase = next.min_visits_12m - (current?.min_visits_12m ?? 0);

  const spendPct =
    spendBase > 0
      ? Math.min(
          1,
          (input.spend12m - (current?.min_spend_12m ?? 0)) / spendBase,
        )
      : 1;
  const visitsPct =
    visitsBase > 0
      ? Math.min(
          1,
          (input.visits12m - (current?.min_visits_12m ?? 0)) / visitsBase,
        )
      : 1;
  const combined = Math.min(spendPct, visitsPct);
  const progressPct = Math.round(Math.max(0, Math.min(1, combined)) * 100);

  return {
    current,
    next,
    spendNeeded: Math.round(spendGap * 100) / 100,
    visitsNeeded: visitsGap,
    progressPct,
  };
}

export interface FindRewardsInput {
  rewards: LoyaltyReward[];
  balance: number;
  tier: LoyaltyTier | null;
  tiers: LoyaltyTier[];
}

export function findEligibleRewards(input: FindRewardsInput): LoyaltyReward[] {
  const tierOrder = new Map(input.tiers.map((t) => [t.id, t.sort_order]));
  const customerTierOrder = input.tier
    ? (tierOrder.get(input.tier.id) ?? 0)
    : 0;

  return input.rewards
    .filter((r) => r.active)
    .filter((r) => r.points_cost <= input.balance)
    .filter((r) => r.stock == null || r.stock > 0)
    .filter((r) => {
      if (!r.min_tier_id) return true;
      const requiredOrder = tierOrder.get(r.min_tier_id) ?? 0;
      return customerTierOrder >= requiredOrder;
    })
    .sort((a, b) => a.sort_order - b.sort_order);
}

export function expirationDate(from: Date, months: number): Date | null {
  if (months <= 0) return null;
  const d = new Date(from.getTime());
  d.setUTCMonth(d.getUTCMonth() + months);
  return d;
}
