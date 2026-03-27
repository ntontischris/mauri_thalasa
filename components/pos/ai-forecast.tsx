"use client";

import { useState, useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { TrendingUp, ShoppingBag, Package } from "lucide-react";
import { addDays, format } from "date-fns";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAI } from "@/hooks/use-ai";
import { formatPrice } from "@/lib/mock-data";

// ─── Constants ────────────────────────────────────────────────────────────

const tooltipStyle = {
  contentStyle: {
    backgroundColor: "hsl(var(--card))",
    border: "1px solid hsl(var(--border))",
    borderRadius: "8px",
    color: "hsl(var(--foreground))",
  },
};

const CONFIDENCE_BADGE: Record<string, { label: string; color: string }> = {
  high: {
    label: "Υψηλή",
    color: "bg-green-500/10 text-green-600 border-green-200",
  },
  medium: {
    label: "Μέτρια",
    color: "bg-yellow-500/10 text-yellow-600 border-yellow-200",
  },
  low: { label: "Χαμηλή", color: "bg-red-500/10 text-red-600 border-red-200" },
};

// ─── Component ────────────────────────────────────────────────────────────

export function AIForecast() {
  const {
    getForecast,
    getForecastedRevenue,
    getIngredientOrderSuggestion,
    getRevenueChartData,
  } = useAI();

  const [daysAhead, setDaysAhead] = useState(1);

  const targetDate = useMemo(
    () => format(addDays(new Date(), daysAhead), "yyyy-MM-dd"),
    [daysAhead],
  );

  const forecasts = useMemo(() => getForecast(targetDate), [targetDate]);
  const forecastedRevenue = useMemo(
    () => getForecastedRevenue(targetDate),
    [targetDate],
  );
  const totalOrders = useMemo(
    () => forecasts.reduce((sum, f) => sum + f.predictedQuantity, 0),
    [forecasts],
  );
  const ingredientSuggestions = useMemo(
    () => getIngredientOrderSuggestion(targetDate),
    [targetDate],
  );
  const chartData = useMemo(
    () => getRevenueChartData(targetDate),
    [targetDate],
  );

  const itemsToOrder = ingredientSuggestions.filter((s) => s.toOrder > 0);

  return (
    <div className="space-y-6">
      {/* Date selector */}
      <div className="flex gap-2">
        <button
          onClick={() => setDaysAhead(1)}
          className={[
            "rounded-md px-4 py-2 text-sm font-medium transition-colors",
            daysAhead === 1
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:text-foreground",
          ].join(" ")}
        >
          Αύριο
        </button>
        <button
          onClick={() => setDaysAhead(2)}
          className={[
            "rounded-md px-4 py-2 text-sm font-medium transition-colors",
            daysAhead === 2
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:text-foreground",
          ].join(" ")}
        >
          Μεθαύριο
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Εκτιμώμενος Τζίρος
            </CardTitle>
            <TrendingUp className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {formatPrice(forecastedRevenue)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">{targetDate}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Εκτιμώμενες Παραγγελίες
            </CardTitle>
            <ShoppingBag className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totalOrders} τεμ.</p>
            <p className="text-xs text-muted-foreground mt-1">
              {forecasts.length} πιάτα
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            Τζίρος - Τελευταίες 7 ημέρες + Πρόβλεψη
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) => v.slice(5)}
                />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip {...tooltipStyle} />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={(props: Record<string, unknown>) => {
                    const { cx, cy, payload } = props as {
                      cx: number;
                      cy: number;
                      payload: { isForecast: boolean };
                    };
                    if (payload.isForecast) {
                      return (
                        <circle
                          key="forecast-dot"
                          cx={cx}
                          cy={cy}
                          r={6}
                          fill="hsl(var(--primary))"
                          stroke="hsl(var(--background))"
                          strokeWidth={2}
                          strokeDasharray="4 2"
                        />
                      );
                    }
                    return (
                      <circle
                        key={`dot-${cx}-${cy}`}
                        cx={cx}
                        cy={cy}
                        r={3}
                        fill="hsl(var(--primary))"
                      />
                    );
                  }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Forecast table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            Πρόβλεψη ανά Πιάτο
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 font-medium text-muted-foreground">
                    Πιάτο
                  </th>
                  <th className="text-center py-2 font-medium text-muted-foreground">
                    Εκτίμηση (τμχ)
                  </th>
                  <th className="text-center py-2 font-medium text-muted-foreground">
                    Confidence
                  </th>
                  <th className="text-right py-2 font-medium text-muted-foreground">
                    Βάση
                  </th>
                </tr>
              </thead>
              <tbody>
                {forecasts.map((f) => {
                  const badge = CONFIDENCE_BADGE[f.confidence];
                  return (
                    <tr key={f.productId} className="border-b border-border/50">
                      <td className="py-2.5 font-medium">{f.productName}</td>
                      <td className="py-2.5 text-center">
                        {f.predictedQuantity}
                      </td>
                      <td className="py-2.5 text-center">
                        <Badge
                          variant="outline"
                          className={`text-xs ${badge.color}`}
                        >
                          {f.confidence === "high" && "🟢"}
                          {f.confidence === "medium" && "🟡"}
                          {f.confidence === "low" && "🔴"} {badge.label}
                        </Badge>
                      </td>
                      <td className="py-2.5 text-right text-muted-foreground text-xs">
                        {f.basedOn}
                      </td>
                    </tr>
                  );
                })}
                {forecasts.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="py-8 text-center text-muted-foreground"
                    >
                      Δεν υπάρχουν δεδομένα για πρόβλεψη
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Ingredient order suggestions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Package className="size-4" />
            Προτεινόμενη Παραγγελία Υλικών
          </CardTitle>
        </CardHeader>
        <CardContent>
          {ingredientSuggestions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Δεν υπάρχουν δεδομένα συνταγών για υπολογισμό υλικών
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 font-medium text-muted-foreground">
                      Υλικό
                    </th>
                    <th className="text-center py-2 font-medium text-muted-foreground">
                      Χρειάζεται
                    </th>
                    <th className="text-center py-2 font-medium text-muted-foreground">
                      Απόθεμα
                    </th>
                    <th className="text-right py-2 font-medium text-muted-foreground">
                      Να Παραγγελθεί
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {ingredientSuggestions.map((s) => (
                    <tr
                      key={s.ingredient.id}
                      className={`border-b border-border/50 ${s.toOrder > 0 ? "bg-red-500/5" : ""}`}
                    >
                      <td className="py-2.5 font-medium">
                        {s.ingredient.name}
                      </td>
                      <td className="py-2.5 text-center">
                        {s.neededQty} {s.ingredient.unit}
                      </td>
                      <td className="py-2.5 text-center">
                        {s.currentStock} {s.ingredient.unit}
                      </td>
                      <td
                        className={`py-2.5 text-right font-medium ${s.toOrder > 0 ? "text-red-600" : "text-green-600"}`}
                      >
                        {s.toOrder > 0
                          ? `${s.toOrder} ${s.ingredient.unit}`
                          : "OK"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {itemsToOrder.length > 0 && (
            <p className="text-xs text-muted-foreground mt-3">
              {itemsToOrder.length} υλικά χρειάζονται παραγγελία
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
