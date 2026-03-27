"use client";

import { Clock, Layers } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

  const product = state.products.find((p) => p.id === recipe.productId);
  const foodCost = calculateFoodCost(recipe);
  const margin = calculateMargin(recipe);

  if (!product) return null;

  return (
    <Card
      className="cursor-pointer transition-shadow hover:shadow-md"
      onClick={() => onEdit(recipe)}
    >
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

        <div className="mt-3 space-y-1 border-t pt-3 text-xs">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Food Cost</span>
            <span className="font-medium">{formatPrice(foodCost)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Τιμή</span>
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
      </CardContent>
    </Card>
  );
}
