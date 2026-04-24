import { describe, it, expect } from "vitest";
import {
  calculatePointsEarned,
  evaluateTier,
  progressToNextTier,
  findEligibleRewards,
  expirationDate,
  type LoyaltyTier,
  type LoyaltyReward,
} from "../../lib/loyalty/engine";

const tiers: LoyaltyTier[] = [
  {
    id: "bronze",
    name: "Bronze",
    sort_order: 1,
    min_spend_12m: 0,
    min_visits_12m: 0,
    point_multiplier: 1.0,
    color: "#b45309",
    perks: ["1× points"],
  },
  {
    id: "silver",
    name: "Silver",
    sort_order: 2,
    min_spend_12m: 300,
    min_visits_12m: 3,
    point_multiplier: 1.25,
    color: "#64748b",
    perks: [],
  },
  {
    id: "gold",
    name: "Gold",
    sort_order: 3,
    min_spend_12m: 800,
    min_visits_12m: 8,
    point_multiplier: 1.5,
    color: "#ca8a04",
    perks: [],
  },
  {
    id: "platinum",
    name: "Platinum",
    sort_order: 4,
    min_spend_12m: 2000,
    min_visits_12m: 20,
    point_multiplier: 2.0,
    color: "#7c3aed",
    perks: [],
  },
];

describe("calculatePointsEarned", () => {
  it("rounds down to nearest whole point", () => {
    expect(
      calculatePointsEarned({
        subtotal: 42.7,
        pointsPerEuro: 1,
        tier: null,
        isBirthday: false,
        birthdayMultiplier: 2,
      }),
    ).toBe(42);
  });
  it("applies tier multiplier", () => {
    expect(
      calculatePointsEarned({
        subtotal: 100,
        pointsPerEuro: 1,
        tier: tiers[2],
        isBirthday: false,
        birthdayMultiplier: 2,
      }),
    ).toBe(150);
  });
  it("stacks tier + birthday multipliers", () => {
    // 100 * 1 * 1.5 (gold) * 2 (bday) = 300
    expect(
      calculatePointsEarned({
        subtotal: 100,
        pointsPerEuro: 1,
        tier: tiers[2],
        isBirthday: true,
        birthdayMultiplier: 2,
      }),
    ).toBe(300);
  });
  it("zero subtotal yields zero", () => {
    expect(
      calculatePointsEarned({
        subtotal: 0,
        pointsPerEuro: 2,
        tier: tiers[3],
        isBirthday: true,
        birthdayMultiplier: 3,
      }),
    ).toBe(0);
  });
  it("fractional points_per_euro works", () => {
    // 50 * 0.5 = 25
    expect(
      calculatePointsEarned({
        subtotal: 50,
        pointsPerEuro: 0.5,
        tier: null,
        isBirthday: false,
        birthdayMultiplier: 2,
      }),
    ).toBe(25);
  });
});

describe("evaluateTier", () => {
  it("returns the highest tier the customer qualifies for", () => {
    const t = evaluateTier({ tiers, spend12m: 900, visits12m: 10 });
    expect(t?.id).toBe("gold");
  });
  it("falls back to lowest tier if no spend", () => {
    const t = evaluateTier({ tiers, spend12m: 0, visits12m: 0 });
    expect(t?.id).toBe("bronze");
  });
  it("needs BOTH spend and visits for a tier", () => {
    // high spend but only 2 visits → still Bronze (Silver needs 3 visits)
    const t = evaluateTier({ tiers, spend12m: 5000, visits12m: 2 });
    expect(t?.id).toBe("bronze");
  });
  it("caps at Platinum", () => {
    const t = evaluateTier({ tiers, spend12m: 100000, visits12m: 100 });
    expect(t?.id).toBe("platinum");
  });
  it("returns null if no tiers defined", () => {
    expect(
      evaluateTier({ tiers: [], spend12m: 1000, visits12m: 10 }),
    ).toBeNull();
  });
});

describe("progressToNextTier", () => {
  it("returns distance to next tier", () => {
    const p = progressToNextTier({
      tiers,
      currentTierId: "bronze",
      spend12m: 150,
      visits12m: 2,
    });
    expect(p.next?.id).toBe("silver");
    expect(p.spendNeeded).toBe(150); // 300 - 150
    expect(p.visitsNeeded).toBe(1); // 3 - 2
    expect(p.progressPct).toBeGreaterThan(0);
    expect(p.progressPct).toBeLessThan(100);
  });
  it("returns null next for top-tier customer", () => {
    const p = progressToNextTier({
      tiers,
      currentTierId: "platinum",
      spend12m: 5000,
      visits12m: 50,
    });
    expect(p.next).toBeNull();
  });
  it("at-threshold returns 100% progress", () => {
    const p = progressToNextTier({
      tiers,
      currentTierId: "bronze",
      spend12m: 300,
      visits12m: 3,
    });
    expect(p.progressPct).toBe(100);
  });
});

describe("findEligibleRewards", () => {
  const rewards: LoyaltyReward[] = [
    {
      id: "r1",
      name: "€5",
      kind: "discount",
      points_cost: 100,
      value: 5,
      active: true,
      sort_order: 1,
    },
    {
      id: "r2",
      name: "€10",
      kind: "discount",
      points_cost: 200,
      value: 10,
      active: true,
      sort_order: 2,
    },
    {
      id: "r3",
      name: "€50 VIP only",
      kind: "discount",
      points_cost: 400,
      value: 50,
      active: true,
      sort_order: 3,
      min_tier_id: "platinum",
    },
    {
      id: "r4",
      name: "inactive",
      kind: "discount",
      points_cost: 50,
      value: 2,
      active: false,
      sort_order: 4,
    },
    {
      id: "r5",
      name: "out of stock",
      kind: "discount",
      points_cost: 50,
      value: 2,
      active: true,
      sort_order: 5,
      stock: 0,
    },
  ];
  it("returns only affordable + active + in-stock rewards the tier can access", () => {
    const result = findEligibleRewards({
      rewards,
      balance: 250,
      tier: tiers[0],
      tiers,
    });
    expect(result.map((r) => r.id)).toEqual(["r1", "r2"]);
  });
  it("Platinum sees VIP-only rewards", () => {
    const result = findEligibleRewards({
      rewards,
      balance: 500,
      tier: tiers[3],
      tiers,
    });
    expect(result.map((r) => r.id)).toContain("r3");
  });
  it("empty balance → empty array", () => {
    expect(
      findEligibleRewards({ rewards, balance: 10, tier: tiers[0], tiers }),
    ).toEqual([]);
  });
});

describe("expirationDate", () => {
  it("adds N months to the given date", () => {
    const d = expirationDate(new Date("2026-01-15T12:00:00Z"), 18);
    expect(d).not.toBeNull();
    expect(d!.getUTCFullYear()).toBe(2027);
    expect(d!.getUTCMonth()).toBe(6); // July (0-indexed)
  });
  it("returns null for zero or negative months", () => {
    expect(expirationDate(new Date(), 0)).toBeNull();
    expect(expirationDate(new Date(), -1)).toBeNull();
  });
});
