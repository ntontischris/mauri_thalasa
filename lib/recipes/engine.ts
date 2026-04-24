export interface IngredientCostInput {
  quantity: number;
  cost_per_unit: number;
}

export function calculateFoodCost(
  ingredients: IngredientCostInput[],
  yieldPct: number,
): number {
  const raw = ingredients.reduce(
    (s, i) => s + (i.quantity ?? 0) * (i.cost_per_unit ?? 0),
    0,
  );
  const y = yieldPct > 0 && yieldPct <= 100 ? yieldPct : 100;
  return Math.round((raw / (y / 100)) * 10000) / 10000;
}

export interface MarginResult {
  costPct: number;
  marginPct: number;
  profit: number;
}

export function calculateMargin(foodCost: number, price: number): MarginResult {
  if (price <= 0) return { costPct: 0, marginPct: 0, profit: 0 };
  const costPct = Math.round((foodCost / price) * 10000) / 100;
  const marginPct = Math.round((100 - costPct) * 100) / 100;
  const profit = Math.round((price - foodCost) * 100) / 100;
  return { costPct, marginPct, profit };
}

export function suggestPrice(foodCost: number, targetCostPct: number): number {
  if (targetCostPct <= 0) return 0;
  if (targetCostPct >= 100) return Math.round(foodCost * 100) / 100;
  return Math.round((foodCost / (targetCostPct / 100)) * 100) / 100;
}

export type CostCategory = "excellent" | "good" | "warning" | "danger";

export function categorize(costPct: number): CostCategory {
  if (costPct <= 25) return "excellent";
  if (costPct <= 30) return "good";
  if (costPct <= 35) return "warning";
  return "danger";
}

export function scaleIngredients<T extends { quantity: number }>(
  ingredients: T[],
  factor: number,
): T[] {
  return ingredients.map((i) => ({ ...i, quantity: i.quantity * factor }));
}
