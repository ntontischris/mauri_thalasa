import { describe, it, expect } from "vitest";
import {
  percentile,
  summarizePrepTimes,
} from "@/lib/analytics/prep-time-stats";

describe("percentile", () => {
  it("returns null for an empty array", () => {
    expect(percentile([], 0.5)).toBeNull();
  });

  it("returns the single value when given one sample", () => {
    expect(percentile([42], 0.5)).toBe(42);
    expect(percentile([42], 0.95)).toBe(42);
  });

  it("computes the median for sorted inputs", () => {
    expect(percentile([1, 2, 3, 4, 5], 0.5)).toBe(3);
  });

  it("computes the median for unsorted inputs (does not mutate)", () => {
    const input = [5, 1, 3, 2, 4];
    const clone = [...input];
    expect(percentile(input, 0.5)).toBe(3);
    expect(input).toEqual(clone);
  });

  it("interpolates between samples for non-integer rank", () => {
    // 4 samples, p50 falls between index 1 and 2 (values 2 and 3)
    expect(percentile([1, 2, 3, 4], 0.5)).toBe(2.5);
  });

  it("returns the max for p100", () => {
    expect(percentile([1, 2, 3, 4, 5], 1)).toBe(5);
  });

  it("returns the min for p0", () => {
    expect(percentile([1, 2, 3, 4, 5], 0)).toBe(1);
  });
});

describe("summarizePrepTimes", () => {
  it("returns a zeroed summary for an empty list", () => {
    const result = summarizePrepTimes([]);
    expect(result).toEqual({
      count: 0,
      p50: null,
      p95: null,
      avg: null,
      min: null,
      max: null,
    });
  });

  it("summarizes a single sample", () => {
    const result = summarizePrepTimes([120]);
    expect(result).toEqual({
      count: 1,
      p50: 120,
      p95: 120,
      avg: 120,
      min: 120,
      max: 120,
    });
  });

  it("computes p50 + p95 + mean + bounds on a realistic sample", () => {
    // 10 prep times in seconds: spread from 2 to 15 minutes
    const samples = [120, 180, 240, 300, 360, 420, 480, 600, 720, 900];
    const result = summarizePrepTimes(samples);
    expect(result.count).toBe(10);
    expect(result.min).toBe(120);
    expect(result.max).toBe(900);
    expect(result.avg).toBe(432);
    expect(result.p50).toBe(390);
    expect(result.p95).toBeGreaterThanOrEqual(720);
    expect(result.p95).toBeLessThanOrEqual(900);
  });

  it("ignores non-finite values", () => {
    const result = summarizePrepTimes([120, NaN, 180, Infinity, -Infinity]);
    expect(result.count).toBe(2);
    expect(result.avg).toBe(150);
  });

  it("ignores negative prep times (clock skew / backfilled data)", () => {
    const result = summarizePrepTimes([-60, 120, 180]);
    expect(result.count).toBe(2);
    expect(result.min).toBe(120);
  });
});
