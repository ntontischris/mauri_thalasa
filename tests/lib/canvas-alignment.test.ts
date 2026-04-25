import { describe, it, expect } from "vitest";
import { computeGuides, type IdRect } from "@/lib/canvas/alignment";

const target: IdRect = { id: "t1", x: 100, y: 100, width: 50, height: 50 };

describe("computeGuides", () => {
  it("emits vertical guide when target left edge aligns with another's left edge (within 4px)", () => {
    const others: IdRect[] = [
      { id: "t2", x: 102, y: 300, width: 40, height: 40 },
    ];
    const result = computeGuides(target, others, 4);
    expect(result.snappedX).toBe(102);
    expect(result.guides).toContainEqual({
      orientation: "vertical",
      coord: 102,
    });
  });

  it("does not snap when no edges within threshold", () => {
    const others: IdRect[] = [
      { id: "t2", x: 500, y: 500, width: 40, height: 40 },
    ];
    const result = computeGuides(target, others, 4);
    expect(result.snappedX).toBe(100);
    expect(result.snappedY).toBe(100);
    expect(result.guides).toEqual([]);
  });
});
