export type IdRect = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
};
export type Guide = { orientation: "vertical" | "horizontal"; coord: number };
export type AlignResult = {
  snappedX: number;
  snappedY: number;
  guides: Guide[];
};

export function computeGuides(
  target: IdRect,
  others: IdRect[],
  threshold = 4,
): AlignResult {
  let snappedX = target.x;
  let snappedY = target.y;
  const guides: Guide[] = [];

  let bestDeltaX = threshold + 1;
  let bestDeltaY = threshold + 1;

  const targetEdgesX = [
    target.x,
    target.x + target.width / 2,
    target.x + target.width,
  ];
  const targetEdgesY = [
    target.y,
    target.y + target.height / 2,
    target.y + target.height,
  ];

  for (const o of others) {
    if (o.id === target.id) continue;
    const otherEdgesX = [o.x, o.x + o.width / 2, o.x + o.width];
    const otherEdgesY = [o.y, o.y + o.height / 2, o.y + o.height];

    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        const dx = Math.abs(targetEdgesX[i] - otherEdgesX[j]);
        if (dx <= threshold && dx < bestDeltaX) {
          bestDeltaX = dx;
          snappedX = target.x + (otherEdgesX[j] - targetEdgesX[i]);
          guides.push({ orientation: "vertical", coord: otherEdgesX[j] });
        }
        const dy = Math.abs(targetEdgesY[i] - otherEdgesY[j]);
        if (dy <= threshold && dy < bestDeltaY) {
          bestDeltaY = dy;
          snappedY = target.y + (otherEdgesY[j] - targetEdgesY[i]);
          guides.push({ orientation: "horizontal", coord: otherEdgesY[j] });
        }
      }
    }
  }

  return { snappedX, snappedY, guides };
}
