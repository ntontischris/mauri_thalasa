import { usePOS } from "@/lib/pos-context";
import type { Ingredient, IngredientCategory } from "@/lib/types";
import { generateId } from "@/lib/mock-data";

export type StockStatus = "ok" | "low" | "critical";

export function useInventory() {
  const { state, dispatch } = usePOS();

  const ingredients = state.ingredients;

  const getStockStatus = (ingredient: Ingredient): StockStatus => {
    if (ingredient.currentStock <= ingredient.minStock) return "critical";
    if (ingredient.currentStock < 2 * ingredient.minStock) return "low";
    return "ok";
  };

  const getIngredientsByCategory = (
    category: IngredientCategory,
  ): Ingredient[] => ingredients.filter((ing) => ing.category === category);

  const getLowStockCount = (): number =>
    ingredients.filter((ing) => getStockStatus(ing) === "low").length;

  const getCriticalStockCount = (): number =>
    ingredients.filter((ing) => getStockStatus(ing) === "critical").length;

  const getLowStockIngredients = (): Ingredient[] =>
    ingredients.filter((ing) => {
      const status = getStockStatus(ing);
      return status === "low" || status === "critical";
    });

  const addIngredient = (data: Omit<Ingredient, "id">): void => {
    const ingredient: Ingredient = { id: generateId(), ...data };
    dispatch({ type: "ADD_INGREDIENT", payload: ingredient });
  };

  const updateIngredient = (ingredient: Ingredient): void => {
    dispatch({ type: "UPDATE_INGREDIENT", payload: ingredient });
  };

  const deleteIngredient = (ingredientId: string): void => {
    dispatch({ type: "DELETE_INGREDIENT", payload: ingredientId });
  };

  const adjustStock = (ingredientId: string, quantity: number): void => {
    dispatch({ type: "ADJUST_STOCK", payload: { ingredientId, quantity } });
  };

  return {
    ingredients,
    getStockStatus,
    getIngredientsByCategory,
    getLowStockCount,
    getCriticalStockCount,
    getLowStockIngredients,
    addIngredient,
    updateIngredient,
    deleteIngredient,
    adjustStock,
  };
}
