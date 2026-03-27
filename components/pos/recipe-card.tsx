"use client";

import { useState } from "react";
import { Clock, Layers, ChevronDown, ChevronUp, Pencil } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useRecipes } from "@/hooks/use-recipes";
import { usePOS } from "@/lib/pos-context";
import { formatPrice } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import type { Recipe } from "@/lib/types";

interface RecipeCardProps {
  recipe: Recipe;
  onEdit: (recipe: Recipe) => void;
}

function getMarginBadgeClass(margin: number): string {
  if (margin > 70)
    return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
  if (margin >= 50)
    return "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200";
  return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
}

export function RecipeCard({ recipe, onEdit }: RecipeCardProps) {
  const { state } = usePOS();
  const { calculateFoodCost, calculateMargin } = useRecipes();
  const [expanded, setExpanded] = useState(false);

  const product = state.products.find((p) => p.id === recipe.productId);
  const foodCost = calculateFoodCost(recipe);
  const margin = calculateMargin(recipe);

  if (!product) return null;

  // Calculate cost per ingredient for breakdown
  const ingredientBreakdown = recipe.ingredients.map((ri) => {
    const ingredient = state.ingredients.find((i) => i.id === ri.ingredientId);
    if (!ingredient)
      return { name: "—", quantity: ri.quantity, unit: ri.unit, cost: 0 };
    let cost = ingredient.costPerUnit * ri.quantity;
    if (
      (ri.unit === "gr" && ingredient.unit === "kg") ||
      (ri.unit === "ml" && ingredient.unit === "lt")
    ) {
      cost = ingredient.costPerUnit * (ri.quantity / 1000);
    }
    return {
      name: ingredient.name,
      quantity: ri.quantity,
      unit: ri.unit,
      cost,
    };
  });

  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-sm leading-tight">
            {product.name}
          </h3>
          <Badge
            className={cn("shrink-0 text-xs", getMarginBadgeClass(margin))}
          >
            {margin.toFixed(0)}%
          </Badge>
        </div>

        <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Layers className="h-3 w-3" />
            {recipe.ingredients.length} συστατικά
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {recipe.prepTime} λεπτά
          </span>
        </div>

        {/* Totals */}
        <div className="mt-3 space-y-1 border-t pt-3 text-xs">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Food Cost</span>
            <span className="font-medium">{formatPrice(foodCost)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Τιμή Πώλησης</span>
            <span className="font-medium">{formatPrice(product.price)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Margin</span>
            <span
              className={cn(
                "font-semibold",
                margin > 70
                  ? "text-green-600 dark:text-green-400"
                  : margin >= 50
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-red-600 dark:text-red-400",
              )}
            >
              {margin.toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Expand/collapse ingredient breakdown */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(!expanded);
          }}
          className="mt-2 flex w-full items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
        >
          {expanded ? (
            <ChevronUp className="h-3 w-3" />
          ) : (
            <ChevronDown className="h-3 w-3" />
          )}
          {expanded ? "Κλείσιμο ανάλυσης" : "Ανάλυση κόστους"}
        </button>

        {expanded && (
          <div className="mt-1 space-y-1 rounded-lg bg-muted/50 p-2 text-xs">
            {ingredientBreakdown.map((item, idx) => (
              <div key={idx} className="flex justify-between">
                <span className="text-muted-foreground">
                  {item.quantity}
                  {item.unit} {item.name}
                </span>
                <span className="font-mono">{formatPrice(item.cost)}</span>
              </div>
            ))}
            <div className="flex justify-between border-t border-border pt-1 font-semibold">
              <span>Σύνολο</span>
              <span>{formatPrice(foodCost)}</span>
            </div>
          </div>
        )}

        {/* Edit button */}
        <Button
          variant="ghost"
          size="sm"
          className="mt-2 w-full text-xs"
          onClick={(e) => {
            e.stopPropagation();
            onEdit(recipe);
          }}
        >
          <Pencil className="h-3 w-3 mr-1" />
          Επεξεργασία Συνταγής
        </Button>
      </CardContent>
    </Card>
  );
}
