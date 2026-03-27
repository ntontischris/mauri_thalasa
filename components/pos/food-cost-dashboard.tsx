"use client";

import { TrendingUp, DollarSign, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRecipes } from "@/hooks/use-recipes";
import { usePOS } from "@/lib/pos-context";
import { formatPrice } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

function getAvgCostColor(pct: number): string {
  if (pct < 30) return "text-green-600 dark:text-green-400";
  if (pct <= 40) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

export function FoodCostDashboard() {
  const { state } = usePOS();
  const {
    getAverageFoodCostPercent,
    getMostExpensiveRecipe,
    getLowestMarginRecipe,
    calculateFoodCost,
    calculateMargin,
  } = useRecipes();

  const avgCost = getAverageFoodCostPercent();
  const mostExpensive = getMostExpensiveRecipe();
  const lowestMargin = getLowestMarginRecipe();

  const mostExpensiveProduct = mostExpensive
    ? state.products.find((p) => p.id === mostExpensive.productId)
    : undefined;

  const lowestMarginProduct = lowestMargin
    ? state.products.find((p) => p.id === lowestMargin.productId)
    : undefined;

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Μέσο Food Cost %
          </CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className={cn("text-3xl font-bold", getAvgCostColor(avgCost))}>
            {avgCost.toFixed(1)}%
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {avgCost < 30
              ? "Εξαιρετικό"
              : avgCost <= 40
                ? "Αποδεκτό"
                : "Χρειάζεται βελτίωση"}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Πιο Ακριβό Πιάτο
          </CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {mostExpensive && mostExpensiveProduct ? (
            <>
              <div className="text-xl font-bold truncate">
                {mostExpensiveProduct.name}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Κόστος:{" "}
                <span className="font-medium text-foreground">
                  {formatPrice(calculateFoodCost(mostExpensive))}
                </span>
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Δεν υπάρχουν συνταγές
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Χαμηλότερο Margin
          </CardTitle>
          <AlertTriangle className="h-4 w-4 text-red-500" />
        </CardHeader>
        <CardContent>
          {lowestMargin && lowestMarginProduct ? (
            <>
              <div className="text-xl font-bold truncate">
                {lowestMarginProduct.name}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Margin:{" "}
                <span className="font-medium text-red-600 dark:text-red-400">
                  {calculateMargin(lowestMargin).toFixed(1)}%
                </span>
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Δεν υπάρχουν συνταγές
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
