import { usePOS } from "@/lib/pos-context";
import type { WasteReason, WasteEntry } from "@/lib/types";
import { generateId } from "@/lib/mock-data";

export function useWaste() {
  const { state, dispatch } = usePOS();

  const wasteLog = state.wasteLog;

  const addWasteEntry = (
    ingredientId: string,
    quantity: number,
    reason: WasteReason,
    notes?: string,
  ): void => {
    const entry: WasteEntry = {
      id: generateId(),
      ingredientId,
      quantity,
      reason,
      date: new Date().toISOString(),
      notes,
    };
    dispatch({ type: "ADD_WASTE_ENTRY", payload: entry });
    dispatch({
      type: "ADJUST_STOCK",
      payload: { ingredientId, quantity: -quantity },
    });
  };

  const getMonthlyWasteCost = (): number => {
    const now = new Date();
    const monthStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      1,
    ).toISOString();

    return wasteLog
      .filter((entry) => entry.date >= monthStart)
      .reduce((sum, entry) => {
        const ingredient = state.ingredients.find(
          (ing) => ing.id === entry.ingredientId,
        );
        if (!ingredient) return sum;
        return sum + ingredient.costPerUnit * entry.quantity;
      }, 0);
  };

  const getWasteByReason = (): Record<WasteReason, number> => {
    const reasons: WasteReason[] = [
      "expired",
      "damaged",
      "overproduction",
      "returned",
    ];
    const initial = reasons.reduce<Record<WasteReason, number>>(
      (acc, reason) => ({ ...acc, [reason]: 0 }),
      {} as Record<WasteReason, number>,
    );

    return wasteLog.reduce((acc, entry) => {
      const ingredient = state.ingredients.find(
        (ing) => ing.id === entry.ingredientId,
      );
      if (!ingredient) return acc;
      const cost = ingredient.costPerUnit * entry.quantity;
      return { ...acc, [entry.reason]: acc[entry.reason] + cost };
    }, initial);
  };

  const getTopWastedIngredients = (
    limit = 5,
  ): { ingredientId: string; totalCost: number }[] => {
    const costByIngredient = wasteLog.reduce<Record<string, number>>(
      (acc, entry) => {
        const ingredient = state.ingredients.find(
          (ing) => ing.id === entry.ingredientId,
        );
        if (!ingredient) return acc;
        const cost = ingredient.costPerUnit * entry.quantity;
        return {
          ...acc,
          [entry.ingredientId]: (acc[entry.ingredientId] ?? 0) + cost,
        };
      },
      {},
    );

    return Object.entries(costByIngredient)
      .map(([ingredientId, totalCost]) => ({ ingredientId, totalCost }))
      .sort((a, b) => b.totalCost - a.totalCost)
      .slice(0, limit);
  };

  return {
    wasteLog,
    addWasteEntry,
    getMonthlyWasteCost,
    getWasteByReason,
    getTopWastedIngredients,
  };
}
