import { describe, it, expect } from "vitest";
import {
  calculateFoodCost,
  calculateMargin,
  suggestPrice,
  categorize,
  scaleIngredients,
} from "../../lib/recipes/engine";

const ingredients = [
  { quantity: 0.2, cost_per_unit: 15 }, // €3
  { quantity: 0.1, cost_per_unit: 8 }, // €0.80
  { quantity: 2, cost_per_unit: 0.5 }, // €1
];

describe("calculateFoodCost", () => {
  it("sums qty × unit cost", () => {
    expect(calculateFoodCost(ingredients, 100)).toBeCloseTo(4.8);
  });
  it("adjusts for yield loss", () => {
    // 80% yield means actual usable output is 80% of raw → effective cost is 4.8 / 0.8 = 6
    expect(calculateFoodCost(ingredients, 80)).toBeCloseTo(6);
  });
  it("zero ingredients → 0", () => {
    expect(calculateFoodCost([], 100)).toBe(0);
  });
  it("yield <=0 treated as 100", () => {
    expect(calculateFoodCost(ingredients, 0)).toBeCloseTo(4.8);
  });
});

describe("calculateMargin", () => {
  it("computes cost % and margin %", () => {
    const r = calculateMargin(3, 10);
    expect(r.costPct).toBe(30);
    expect(r.marginPct).toBe(70);
    expect(r.profit).toBe(7);
  });
  it("price=0 returns 0 for safe display", () => {
    const r = calculateMargin(3, 0);
    expect(r.costPct).toBe(0);
    expect(r.marginPct).toBe(0);
  });
  it("cost>price (negative margin) clamps truthfully", () => {
    const r = calculateMargin(12, 10);
    expect(r.costPct).toBe(120);
    expect(r.marginPct).toBe(-20);
  });
});

describe("suggestPrice", () => {
  it("food cost €3, target cost 30% → €10 price", () => {
    expect(suggestPrice(3, 30)).toBe(10);
  });
  it("food cost €4.50, target cost 25% → €18", () => {
    expect(suggestPrice(4.5, 25)).toBe(18);
  });
  it("target 0 or 100 guard", () => {
    expect(suggestPrice(3, 0)).toBe(0);
    expect(suggestPrice(3, 100)).toBe(3);
  });
});

describe("categorize", () => {
  it("excellent when <=25%", () => {
    expect(categorize(20)).toBe("excellent");
    expect(categorize(25)).toBe("excellent");
  });
  it("good at 25-30%", () => {
    expect(categorize(28)).toBe("good");
    expect(categorize(30)).toBe("good");
  });
  it("warning at 30-35%", () => {
    expect(categorize(32)).toBe("warning");
    expect(categorize(35)).toBe("warning");
  });
  it("danger >35%", () => {
    expect(categorize(40)).toBe("danger");
  });
});

describe("scaleIngredients", () => {
  it("multiplies each quantity by factor", () => {
    const scaled = scaleIngredients(ingredients, 3);
    expect(scaled[0].quantity).toBeCloseTo(0.6);
    expect(scaled[1].quantity).toBeCloseTo(0.3);
    expect(scaled[2].quantity).toBeCloseTo(6);
  });
  it("factor 1 is identity", () => {
    const scaled = scaleIngredients(ingredients, 1);
    expect(scaled).toEqual(ingredients);
  });
});
