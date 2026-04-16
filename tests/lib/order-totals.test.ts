import { describe, it, expect } from "vitest";
import {
  calculateLineTotal,
  calculateOrderSubtotal,
  calculateVatBreakdown,
} from "@/lib/pricing/order-totals";

describe("calculateLineTotal", () => {
  it("computes (price + modifiers) * quantity", () => {
    const total = calculateLineTotal({
      price: 10,
      quantity: 2,
      modifiers: [{ price: 1.5 }, { price: 0.5 }],
    });
    expect(total).toBe(24);
  });

  it("handles zero modifiers", () => {
    const total = calculateLineTotal({
      price: 5,
      quantity: 3,
      modifiers: [],
    });
    expect(total).toBe(15);
  });

  it("rounds to 2 decimals", () => {
    const total = calculateLineTotal({
      price: 3.33,
      quantity: 3,
      modifiers: [],
    });
    expect(total).toBe(9.99);
  });
});

describe("calculateOrderSubtotal", () => {
  it("sums line totals across items", () => {
    const subtotal = calculateOrderSubtotal([
      { price: 10, quantity: 2, modifiers: [] },
      { price: 5, quantity: 1, modifiers: [{ price: 1 }] },
    ]);
    expect(subtotal).toBe(26);
  });

  it("returns 0 for empty items", () => {
    expect(calculateOrderSubtotal([])).toBe(0);
  });
});

describe("calculateVatBreakdown", () => {
  it("groups by vat rate and computes net/vat amounts", () => {
    const breakdown = calculateVatBreakdown([
      { price: 10, quantity: 1, modifiers: [], vatRate: 24 },
      { price: 20, quantity: 1, modifiers: [], vatRate: 24 },
      { price: 5, quantity: 2, modifiers: [], vatRate: 13 },
    ]);
    expect(breakdown).toHaveLength(2);
    const vat24 = breakdown.find((b) => b.rate === 24)!;
    expect(vat24.gross).toBe(30);
    expect(vat24.vat).toBeCloseTo(5.806, 2);
    expect(vat24.net).toBeCloseTo(24.194, 2);
    const vat13 = breakdown.find((b) => b.rate === 13)!;
    expect(vat13.gross).toBe(10);
  });
});
