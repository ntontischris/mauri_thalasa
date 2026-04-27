import { describe, it, expect } from "vitest";
import {
  intersects,
  clampToBounds,
  findOverlaps,
  type Rect,
} from "@/lib/canvas/collision";

describe("intersects", () => {
  const a: Rect = { x: 0, y: 0, width: 50, height: 50 };
  it("returns true when rects overlap", () => {
    expect(intersects(a, { x: 20, y: 20, width: 50, height: 50 })).toBe(true);
  });
  it("returns false when separated", () => {
    expect(intersects(a, { x: 100, y: 0, width: 50, height: 50 })).toBe(false);
  });
  it("returns false when touching edges (no overlap)", () => {
    expect(intersects(a, { x: 50, y: 0, width: 50, height: 50 })).toBe(false);
  });
});

describe("clampToBounds", () => {
  it("keeps rect inside bounds", () => {
    const r: Rect = { x: 1190, y: 100, width: 80, height: 80 };
    expect(clampToBounds(r, 1200, 800)).toEqual({
      x: 1120,
      y: 100,
      width: 80,
      height: 80,
    });
  });
  it("clamps negative coordinates to 0", () => {
    const r: Rect = { x: -10, y: -5, width: 80, height: 80 };
    expect(clampToBounds(r, 1200, 800)).toEqual({
      x: 0,
      y: 0,
      width: 80,
      height: 80,
    });
  });
});

describe("findOverlaps", () => {
  it("returns IDs of rects overlapping the target", () => {
    const target = { id: "t1", x: 0, y: 0, width: 50, height: 50 };
    const others = [
      { id: "t2", x: 20, y: 20, width: 50, height: 50 },
      { id: "t3", x: 100, y: 0, width: 50, height: 50 },
    ];
    expect(findOverlaps(target, others)).toEqual(["t2"]);
  });
});
