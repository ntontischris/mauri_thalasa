import { describe, it, expect } from "vitest";
import { generateReceiptNumber } from "@/lib/pricing/receipt-number";

describe("generateReceiptNumber", () => {
  it("follows ΑΛΠ-YYYY-NNNNNN pattern", () => {
    const num = generateReceiptNumber(new Date("2026-04-17T12:00:00Z"));
    expect(num).toMatch(/^ΑΛΠ-2026-\d{6}$/);
  });

  it("is deterministic for same order id", () => {
    const date = new Date("2026-04-17T12:00:00Z");
    const a = generateReceiptNumber(date, "order-abc");
    const b = generateReceiptNumber(date, "order-abc");
    expect(a).toBe(b);
  });

  it("differs for different order ids", () => {
    const date = new Date("2026-04-17T12:00:00Z");
    const a = generateReceiptNumber(date, "order-abc");
    const b = generateReceiptNumber(date, "order-xyz");
    expect(a).not.toBe(b);
  });
});
