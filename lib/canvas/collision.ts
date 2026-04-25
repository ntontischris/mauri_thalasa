export type Rect = { x: number; y: number; width: number; height: number };
export type IdRect = Rect & { id: string };

export function intersects(a: Rect, b: Rect): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

export function clampToBounds(r: Rect, floorW: number, floorH: number): Rect {
  return {
    ...r,
    x: Math.max(0, Math.min(r.x, floorW - r.width)),
    y: Math.max(0, Math.min(r.y, floorH - r.height)),
  };
}

export function findOverlaps(target: IdRect, others: IdRect[]): string[] {
  return others
    .filter((o) => o.id !== target.id && intersects(target, o))
    .map((o) => o.id);
}
