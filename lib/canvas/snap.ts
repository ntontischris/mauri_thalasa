export type Point = { x: number; y: number };
export type Direction = "up" | "down" | "left" | "right";

export function snapToGrid(value: number, gridSize: number): number {
  return Math.round(value / gridSize) * gridSize;
}

export function nudge(p: Point, dir: Direction, shift: boolean): Point {
  const step = shift ? 10 : 1;
  switch (dir) {
    case "up":
      return { x: p.x, y: p.y - step };
    case "down":
      return { x: p.x, y: p.y + step };
    case "left":
      return { x: p.x - step, y: p.y };
    case "right":
      return { x: p.x + step, y: p.y };
  }
}
