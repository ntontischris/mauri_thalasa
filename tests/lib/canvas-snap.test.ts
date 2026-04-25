import { describe, it, expect } from "vitest";
import { snapToGrid, nudge } from "@/lib/canvas/snap";

describe("snapToGrid", () => {
  it("snaps to nearest 20px multiple", () => {
    expect(snapToGrid(23, 20)).toBe(20);
    expect(snapToGrid(31, 20)).toBe(40);
    expect(snapToGrid(0, 20)).toBe(0);
  });

  it("respects custom grid size", () => {
    expect(snapToGrid(7, 10)).toBe(10);
  });
});

describe("nudge", () => {
  it("returns 1px step by default", () => {
    expect(nudge({ x: 10, y: 20 }, "right", false)).toEqual({ x: 11, y: 20 });
  });

  it("returns 10px step with shift", () => {
    expect(nudge({ x: 10, y: 20 }, "down", true)).toEqual({ x: 10, y: 30 });
  });
});
