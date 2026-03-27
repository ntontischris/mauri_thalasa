import { usePOS } from "@/lib/pos-context";
import type { Modifier, Product, SelectedModifier } from "@/lib/types";
import { generateId } from "@/lib/mock-data";

export function useModifiers() {
  const { state, dispatch } = usePOS();

  const getModifiersForProduct = (product: Product): Modifier[] => {
    const byCategory = state.modifiers.filter((m) =>
      m.categoryIds.includes(product.categoryId),
    );
    const byProduct = state.modifiers.filter((m) =>
      product.modifierIds.includes(m.id),
    );

    const seen = new Set<string>();
    const result: Modifier[] = [];

    for (const m of [...byCategory, ...byProduct]) {
      if (!seen.has(m.id)) {
        seen.add(m.id);
        result.push(m);
      }
    }

    return result;
  };

  const calculateItemPrice = (
    basePrice: number,
    selectedModifiers: SelectedModifier[],
    quantity: number,
  ): number => {
    const modifiersTotal = selectedModifiers.reduce(
      (sum, m) => sum + m.price,
      0,
    );
    return (basePrice + modifiersTotal) * quantity;
  };

  const addModifier = (
    name: string,
    price: number,
    categoryIds: string[],
  ): void => {
    const modifier: Modifier = { id: generateId(), name, price, categoryIds };
    dispatch({ type: "ADD_MODIFIER", payload: modifier });
  };

  const updateModifier = (modifier: Modifier): void => {
    dispatch({ type: "UPDATE_MODIFIER", payload: modifier });
  };

  const deleteModifier = (modifierId: string): void => {
    dispatch({ type: "DELETE_MODIFIER", payload: modifierId });
  };

  return {
    modifiers: state.modifiers,
    getModifiersForProduct,
    calculateItemPrice,
    addModifier,
    updateModifier,
    deleteModifier,
  };
}
