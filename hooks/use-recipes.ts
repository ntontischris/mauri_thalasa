import { usePOS } from "@/lib/pos-context";
import type { Recipe } from "@/lib/types";
import { generateId } from "@/lib/mock-data";

function normalizeToBaseUnit(quantity: number, unit: string): number {
  if (unit === "gr") return quantity / 1000;
  if (unit === "ml") return quantity / 1000;
  return quantity;
}

export function useRecipes() {
  const { state, dispatch } = usePOS();

  const recipes = state.recipes;

  const getRecipeForProduct = (productId: string): Recipe | undefined =>
    recipes.find((r) => r.productId === productId);

  const calculateFoodCost = (recipe: Recipe): number =>
    recipe.ingredients.reduce((sum, recipeIng) => {
      const ingredient = state.ingredients.find(
        (ing) => ing.id === recipeIng.ingredientId,
      );
      if (!ingredient) return sum;
      const normalizedQty = normalizeToBaseUnit(
        recipeIng.quantity,
        recipeIng.unit,
      );
      return sum + ingredient.costPerUnit * normalizedQty;
    }, 0);

  const calculateMargin = (recipe: Recipe): number => {
    const product = state.products.find((p) => p.id === recipe.productId);
    if (!product) return 0;
    const cost = calculateFoodCost(recipe);
    if (product.price === 0) return 0;
    return ((product.price - cost) / product.price) * 100;
  };

  const getAverageFoodCostPercent = (): number => {
    if (recipes.length === 0) return 0;
    const total = recipes.reduce((sum, recipe) => {
      const product = state.products.find((p) => p.id === recipe.productId);
      if (!product || product.price === 0) return sum;
      const cost = calculateFoodCost(recipe);
      return sum + (cost / product.price) * 100;
    }, 0);
    return total / recipes.length;
  };

  const getMostExpensiveRecipe = (): Recipe | undefined =>
    recipes.reduce<Recipe | undefined>((max, recipe) => {
      if (!max) return recipe;
      return calculateFoodCost(recipe) > calculateFoodCost(max) ? recipe : max;
    }, undefined);

  const getLowestMarginRecipe = (): Recipe | undefined =>
    recipes.reduce<Recipe | undefined>((min, recipe) => {
      if (!min) return recipe;
      return calculateMargin(recipe) < calculateMargin(min) ? recipe : min;
    }, undefined);

  const addRecipe = (data: Omit<Recipe, "id">): void => {
    const recipe: Recipe = { id: generateId(), ...data };
    dispatch({ type: "ADD_RECIPE", payload: recipe });
  };

  const updateRecipe = (recipe: Recipe): void => {
    dispatch({ type: "UPDATE_RECIPE", payload: recipe });
  };

  const deleteRecipe = (recipeId: string): void => {
    dispatch({ type: "DELETE_RECIPE", payload: recipeId });
  };

  return {
    recipes,
    getRecipeForProduct,
    calculateFoodCost,
    calculateMargin,
    getAverageFoodCostPercent,
    getMostExpensiveRecipe,
    getLowestMarginRecipe,
    addRecipe,
    updateRecipe,
    deleteRecipe,
  };
}
