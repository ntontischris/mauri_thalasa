"use client";

import { useState, useEffect } from "react";
import { Plus, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRecipes } from "@/hooks/use-recipes";
import { useInventory } from "@/hooks/use-inventory";
import { usePOS } from "@/lib/pos-context";
import { formatPrice } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import type { Recipe, RecipeIngredient, IngredientUnit } from "@/lib/types";

interface RecipeEditorProps {
  recipe?: Recipe;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type DraftIngredient = RecipeIngredient & { _key: number };

const UNITS: IngredientUnit[] = ["kg", "lt", "pcs", "gr", "ml"];

let keyCounter = 0;
const nextKey = () => ++keyCounter;

function buildDraftIngredients(recipe?: Recipe): DraftIngredient[] {
  if (!recipe || recipe.ingredients.length === 0) {
    return [{ _key: nextKey(), ingredientId: "", quantity: 0, unit: "gr" }];
  }
  return recipe.ingredients.map((ing) => ({ ...ing, _key: nextKey() }));
}

function normalizeToBaseUnit(quantity: number, unit: string): number {
  if (unit === "gr") return quantity / 1000;
  if (unit === "ml") return quantity / 1000;
  return quantity;
}

function getMarginColor(margin: number): string {
  if (margin > 70) return "text-green-600 dark:text-green-400";
  if (margin >= 50) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

export function RecipeEditor({
  recipe,
  open,
  onOpenChange,
}: RecipeEditorProps) {
  const { state } = usePOS();
  const { ingredients } = useInventory();
  const { recipes, addRecipe, updateRecipe } = useRecipes();

  const isEditMode = !!recipe;

  const [selectedProductId, setSelectedProductId] = useState<string>(
    recipe?.productId ?? "",
  );
  const [draftIngredients, setDraftIngredients] = useState<DraftIngredient[]>(
    () => buildDraftIngredients(recipe),
  );
  const [prepTime, setPrepTime] = useState<number>(recipe?.prepTime ?? 15);
  const [portionSize, setPortionSize] = useState<string>(
    recipe?.portionSize ?? "1 μερίδα",
  );

  // Reset form when dialog opens with new recipe prop
  useEffect(() => {
    if (open) {
      setSelectedProductId(recipe?.productId ?? "");
      setDraftIngredients(buildDraftIngredients(recipe));
      setPrepTime(recipe?.prepTime ?? 15);
      setPortionSize(recipe?.portionSize ?? "1 μερίδα");
    }
  }, [open, recipe]);

  const productsWithoutRecipe = state.products.filter(
    (p) => !recipes.some((r) => r.productId === p.id),
  );

  const selectedProduct = state.products.find(
    (p) => p.id === selectedProductId,
  );

  const liveFoodCost = draftIngredients.reduce((sum, di) => {
    if (!di.ingredientId || di.quantity <= 0) return sum;
    const ing = ingredients.find((i) => i.id === di.ingredientId);
    if (!ing) return sum;
    return sum + ing.costPerUnit * normalizeToBaseUnit(di.quantity, di.unit);
  }, 0);

  const liveMargin =
    selectedProduct && selectedProduct.price > 0
      ? ((selectedProduct.price - liveFoodCost) / selectedProduct.price) * 100
      : 0;

  const addIngredientRow = () => {
    setDraftIngredients((prev) => [
      ...prev,
      { _key: nextKey(), ingredientId: "", quantity: 0, unit: "gr" },
    ]);
  };

  const removeIngredientRow = (key: number) => {
    setDraftIngredients((prev) => prev.filter((di) => di._key !== key));
  };

  const updateIngredientRow = (
    key: number,
    patch: Partial<Omit<DraftIngredient, "_key">>,
  ) => {
    setDraftIngredients((prev) =>
      prev.map((di) => (di._key === key ? { ...di, ...patch } : di)),
    );
  };

  const getIngredientRowCost = (di: DraftIngredient): number => {
    if (!di.ingredientId || di.quantity <= 0) return 0;
    const ing = ingredients.find((i) => i.id === di.ingredientId);
    if (!ing) return 0;
    return ing.costPerUnit * normalizeToBaseUnit(di.quantity, di.unit);
  };

  const handleSave = () => {
    if (!selectedProductId) return;

    const cleanedIngredients: RecipeIngredient[] = draftIngredients
      .filter((di) => di.ingredientId && di.quantity > 0)
      .map(({ _key: _k, ...ing }) => ing);

    const data: Omit<Recipe, "id"> = {
      productId: selectedProductId,
      ingredients: cleanedIngredients,
      prepTime,
      portionSize,
    };

    if (isEditMode && recipe) {
      updateRecipe({ id: recipe.id, ...data });
    } else {
      addRecipe(data);
    }

    onOpenChange(false);
  };

  const canSave = !!selectedProductId;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? "Επεξεργασία Συνταγής" : "Νέα Συνταγή"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Product selection */}
          <div className="space-y-1">
            <Label>Προϊόν</Label>
            {isEditMode ? (
              <p className="rounded-md border px-3 py-2 text-sm bg-muted">
                {selectedProduct?.name ?? selectedProductId}
              </p>
            ) : (
              <Select
                value={selectedProductId}
                onValueChange={setSelectedProductId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Επιλέξτε προϊόν..." />
                </SelectTrigger>
                <SelectContent>
                  {productsWithoutRecipe.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} — {formatPrice(p.price)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Basic fields */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Χρόνος Προετοιμασίας (λεπτά)</Label>
              <Input
                type="number"
                min={1}
                value={prepTime}
                onChange={(e) => setPrepTime(Number(e.target.value))}
              />
            </div>
            <div className="space-y-1">
              <Label>Μερίδα</Label>
              <Input
                value={portionSize}
                onChange={(e) => setPortionSize(e.target.value)}
                placeholder="π.χ. 1 μερίδα"
              />
            </div>
          </div>

          {/* Ingredients */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Συστατικά</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addIngredientRow}
              >
                <Plus className="mr-1 h-3 w-3" />
                Συστατικό
              </Button>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {draftIngredients.map((di) => {
                const rowCost = getIngredientRowCost(di);
                return (
                  <div key={di._key} className="flex items-center gap-2">
                    <Select
                      value={di.ingredientId}
                      onValueChange={(v) =>
                        updateIngredientRow(di._key, { ingredientId: v })
                      }
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Συστατικό..." />
                      </SelectTrigger>
                      <SelectContent>
                        {ingredients.map((ing) => (
                          <SelectItem key={ing.id} value={ing.id}>
                            {ing.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Input
                      type="number"
                      min={0}
                      step="any"
                      className="w-20"
                      value={di.quantity || ""}
                      onChange={(e) =>
                        updateIngredientRow(di._key, {
                          quantity: Number(e.target.value),
                        })
                      }
                      placeholder="Ποσ."
                    />

                    <Select
                      value={di.unit}
                      onValueChange={(v) =>
                        updateIngredientRow(di._key, {
                          unit: v as IngredientUnit,
                        })
                      }
                    >
                      <SelectTrigger className="w-20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {UNITS.map((u) => (
                          <SelectItem key={u} value={u}>
                            {u}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <span className="w-16 text-right text-xs text-muted-foreground">
                      {rowCost > 0 ? formatPrice(rowCost) : "—"}
                    </span>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => removeIngredientRow(di._key)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Live totals */}
          <div className="rounded-lg border bg-muted/40 p-3 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Food Cost</span>
              <span className="font-medium">{formatPrice(liveFoodCost)}</span>
            </div>
            {selectedProduct && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Τιμή Πώλησης</span>
                <span className="font-medium">
                  {formatPrice(selectedProduct.price)}
                </span>
              </div>
            )}
            <div className="flex justify-between border-t pt-1 mt-1">
              <span className="text-muted-foreground font-medium">Margin</span>
              <span className={cn("font-bold", getMarginColor(liveMargin))}>
                {liveMargin.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Ακύρωση
          </Button>
          <Button onClick={handleSave} disabled={!canSave}>
            {isEditMode ? "Αποθήκευση" : "Δημιουργία"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
