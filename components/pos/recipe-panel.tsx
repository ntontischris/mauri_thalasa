"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChefHat, TrendingUp, AlertCircle } from "lucide-react";
import type {
  RecipeWithIngredients,
  IngredientWithSupplier,
  DbProduct,
} from "@/lib/types/database";

interface RecipePanelProps {
  recipes: RecipeWithIngredients[];
  ingredients: IngredientWithSupplier[];
  products: DbProduct[];
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat("el-GR", {
    style: "currency",
    currency: "EUR",
  }).format(price);
}

export function RecipePanel({
  recipes,
  ingredients,
  products,
}: RecipePanelProps) {
  const productsWithRecipe = new Set(recipes.map((r) => r.product_id));
  const productsWithoutRecipe = products.filter(
    (p) => !productsWithRecipe.has(p.id),
  );

  return (
    <div className="space-y-4">
      {productsWithoutRecipe.length > 0 && (
        <Card className="border-amber-500/50">
          <CardContent className="flex items-center gap-2 p-3 text-sm text-amber-600">
            <AlertCircle className="size-4" />
            {productsWithoutRecipe.length} προϊόντα χωρίς συνταγή
          </CardContent>
        </Card>
      )}

      {recipes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <ChefHat className="mb-4 size-12 opacity-30" />
            <p>Δεν υπάρχουν συνταγές ακόμα</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {recipes.map((recipe) => {
            const foodCost = recipe.recipe_ingredients.reduce((sum, ri) => {
              const ing = ri.ingredients;
              return sum + (ing?.cost_per_unit ?? 0) * ri.quantity;
            }, 0);
            const price = recipe.products?.price ?? 0;
            const costPercent = price > 0 ? (foodCost / price) * 100 : 0;
            const isHighCost = costPercent > 35;

            return (
              <Card key={recipe.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">
                    {recipe.products?.name ?? "—"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Τιμή πώλησης</span>
                    <span className="font-medium">{formatPrice(price)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Food cost</span>
                    <span
                      className={`font-medium ${isHighCost ? "text-red-500" : "text-emerald-500"}`}
                    >
                      {formatPrice(foodCost)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Ποσοστό</span>
                    <Badge variant={isHighCost ? "destructive" : "secondary"}>
                      <TrendingUp className="mr-1 size-3" />
                      {costPercent.toFixed(1)}%
                    </Badge>
                  </div>

                  {recipe.recipe_ingredients.length > 0 && (
                    <div className="border-t pt-2">
                      <p className="text-xs text-muted-foreground mb-1">
                        Υλικά:
                      </p>
                      {recipe.recipe_ingredients.map((ri) => (
                        <div
                          key={ri.id}
                          className="flex justify-between text-xs"
                        >
                          <span>{ri.ingredients?.name ?? "—"}</span>
                          <span className="text-muted-foreground">
                            {ri.quantity} {ri.unit}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {recipe.prep_time && (
                    <p className="text-xs text-muted-foreground">
                      Χρόνος: {recipe.prep_time} λεπτά
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
