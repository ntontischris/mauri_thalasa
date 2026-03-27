// EatFlow POS - AI Hook
// Ties together chat, forecasting, and menu optimization

import { usePOS } from "@/lib/pos-context";
import { useAnalytics } from "@/hooks/use-analytics";
import { useRecipes } from "@/hooks/use-recipes";
import { useInventory } from "@/hooks/use-inventory";
import { useStaff } from "@/hooks/use-staff";
import { processMockQuery, type AnalyticsData } from "@/lib/ai-mock-patterns";
import { callOpenAI, buildSystemPrompt } from "@/lib/ai-openai";
import { generateId, formatPrice } from "@/lib/mock-data";
import { mockHistory } from "@/lib/mock-history";
import { getDay, parseISO } from "date-fns";
import type { DemandForecast, MenuSuggestion, Ingredient } from "@/lib/types";

// ─── Types ──────────────────────────────────────────────────────────────────

interface IngredientOrderSuggestion {
  ingredient: Ingredient;
  neededQty: number;
  currentStock: number;
  toOrder: number;
}

interface RevenueProjection {
  current: number;
  projected: number;
  increase: number;
  increasePercent: number;
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useAI() {
  const { state, dispatch } = usePOS();
  const analytics = useAnalytics();
  const recipes = useRecipes();
  const inventory = useInventory();
  const staffHook = useStaff();

  // ─── Build analytics data for mock/OpenAI ──────────────────────────────

  const buildAnalyticsData = (): AnalyticsData => {
    const topProducts = analytics.getTopProducts(5);
    const worstProducts = analytics.getWorstProducts(5);
    const paymentBreakdown = analytics.getPaymentBreakdown();
    const foodCostSummary = analytics.getFoodCostSummary();
    const menuEngineering = analytics.getMenuEngineering();
    const lowStockIngs = inventory.getLowStockIngredients();
    const wasteTotal = state.wasteLog.reduce((sum, w) => {
      const ing = state.ingredients.find((i) => i.id === w.ingredientId);
      const costPerUnit = ing?.costPerUnit ?? 0;
      return sum + w.quantity * costPerUnit;
    }, 0);

    const staffPerf = staffHook.getPerformance();
    const staffData = staffPerf.map((p) => {
      const member = state.staff.find((s) => s.id === p.staffId);
      return {
        name: member?.name ?? "Unknown",
        revenue: p.revenue,
        tables: p.tablesServed,
      };
    });

    return {
      todayRevenue: analytics.getTodayRevenue(),
      yesterdayRevenue: analytics.getYesterdayRevenue(),
      todayOrders: analytics.getTodayOrderCount(),
      avgCheck: analytics.getAverageCheck(),
      topProducts: topProducts.map((p) => ({
        name: p.productName,
        quantity: p.quantity,
        revenue: p.revenue,
      })),
      worstProducts: worstProducts.map((p) => ({
        name: p.productName,
        quantity: p.quantity,
        revenue: p.revenue,
      })),
      foodCostPercent: foodCostSummary.avgFoodCostPercent,
      paymentBreakdown: {
        cash: paymentBreakdown.cash,
        card: paymentBreakdown.card,
      },
      lowStockIngredients: lowStockIngs.map((ing) => ({
        name: ing.name,
        stock: ing.currentStock,
        unit: ing.unit,
      })),
      monthlyWaste: Math.round(wasteTotal * 100) / 100,
      menuEngineering,
      staffPerformance: staffData,
    };
  };

  // ─── Chat ─────────────────────────────────────────────────────────────

  const sendMessage = async (text: string): Promise<string> => {
    const userMessage = {
      id: generateId(),
      role: "user" as const,
      content: text,
      timestamp: new Date().toISOString(),
    };
    dispatch({ type: "ADD_CHAT_MESSAGE", payload: userMessage });

    let response: string;

    if (state.aiSettings.enabled && state.aiSettings.openaiKey) {
      const data = buildAnalyticsData();
      const systemPrompt = buildSystemPrompt(data);
      response = await callOpenAI(
        state.aiSettings.openaiKey,
        systemPrompt,
        text,
      );
    } else {
      const data = buildAnalyticsData();
      response = processMockQuery(text, data);
    }

    const assistantMessage = {
      id: generateId(),
      role: "assistant" as const,
      content: response,
      timestamp: new Date().toISOString(),
    };
    dispatch({ type: "ADD_CHAT_MESSAGE", payload: assistantMessage });

    return response;
  };

  const clearChat = (): void => {
    dispatch({ type: "CLEAR_CHAT_HISTORY" });
  };

  // ─── Forecasting ──────────────────────────────────────────────────────

  const getForecast = (targetDate: string): DemandForecast[] => {
    const targetDayOfWeek = getDay(parseISO(targetDate));

    // Group history by product + same day-of-week
    const productDayData = new Map<
      string,
      { name: string; quantities: number[] }
    >();

    for (const day of mockHistory) {
      const dayOfWeek = getDay(parseISO(day.date));
      if (dayOfWeek !== targetDayOfWeek) continue;

      for (const ps of day.productSales) {
        const existing = productDayData.get(ps.productId);
        if (existing) {
          existing.quantities.push(ps.quantity);
        } else {
          productDayData.set(ps.productId, {
            name: ps.productName,
            quantities: [ps.quantity],
          });
        }
      }
    }

    // Calculate trend multiplier: last week vs previous week
    const sorted = [...mockHistory].sort((a, b) =>
      b.date.localeCompare(a.date),
    );
    const lastWeekRevenue = sorted
      .slice(0, 7)
      .reduce((sum, d) => sum + d.revenue, 0);
    const prevWeekRevenue = sorted
      .slice(7, 14)
      .reduce((sum, d) => sum + d.revenue, 0);
    const trendMultiplier =
      prevWeekRevenue > 0
        ? lastWeekRevenue > prevWeekRevenue
          ? 1.1
          : 0.9
        : 1.0;

    const forecasts: DemandForecast[] = [];

    for (const [productId, data] of productDayData) {
      const avgQty =
        data.quantities.reduce((sum, q) => sum + q, 0) / data.quantities.length;
      const predicted = Math.round(avgQty * trendMultiplier);

      const dataPoints = data.quantities.length;
      const confidence: DemandForecast["confidence"] =
        dataPoints >= 5 ? "high" : dataPoints >= 3 ? "medium" : "low";

      forecasts.push({
        productId,
        productName: data.name,
        predictedQuantity: predicted,
        confidence,
        basedOn: `${dataPoints} ${getDayName(targetDayOfWeek)}`,
      });
    }

    return forecasts.sort((a, b) => b.predictedQuantity - a.predictedQuantity);
  };

  const getForecastedRevenue = (targetDate: string): number => {
    const forecasts = getForecast(targetDate);
    return forecasts.reduce((sum, f) => {
      const product = state.products.find((p) => p.id === f.productId);
      const price = product?.price ?? 0;
      return sum + f.predictedQuantity * price;
    }, 0);
  };

  const getIngredientOrderSuggestion = (
    targetDate: string,
  ): IngredientOrderSuggestion[] => {
    const forecasts = getForecast(targetDate);
    const ingredientNeeds = new Map<string, number>();

    for (const forecast of forecasts) {
      const recipe = recipes.getRecipeForProduct(forecast.productId);
      if (!recipe) continue;

      for (const recipeIng of recipe.ingredients) {
        const current = ingredientNeeds.get(recipeIng.ingredientId) ?? 0;
        ingredientNeeds.set(
          recipeIng.ingredientId,
          current + recipeIng.quantity * forecast.predictedQuantity,
        );
      }
    }

    const suggestions: IngredientOrderSuggestion[] = [];

    for (const [ingredientId, neededQty] of ingredientNeeds) {
      const ingredient = state.ingredients.find(
        (ing) => ing.id === ingredientId,
      );
      if (!ingredient) continue;

      const toOrder = Math.max(
        0,
        Math.ceil(neededQty - ingredient.currentStock),
      );
      suggestions.push({
        ingredient,
        neededQty: Math.round(neededQty * 100) / 100,
        currentStock: ingredient.currentStock,
        toOrder,
      });
    }

    return suggestions.sort((a, b) => b.toOrder - a.toOrder);
  };

  // ─── Menu Optimization ────────────────────────────────────────────────

  const getOptimizationSuggestions = (): MenuSuggestion[] => {
    const engineering = analytics.getMenuEngineering();
    const allStats = analytics.getAllProductStats();
    const suggestions: MenuSuggestion[] = [];

    // Stars - keep
    for (const name of engineering.stars) {
      const stat = allStats.find((s) => s.productName === name);
      suggestions.push({
        type: "keep",
        productId: stat?.productId ?? "",
        productName: name,
        reason: "Υψηλές πωλήσεις & υψηλό margin",
        action: "Μην αλλάξεις τίποτα - είναι αστέρι!",
      });
    }

    // Puzzles - promote
    for (const name of engineering.puzzles) {
      const stat = allStats.find((s) => s.productName === name);
      const monthlyQty = stat?.quantity ?? 0;
      const price =
        state.products.find((p) => p.id === stat?.productId)?.price ?? 0;
      const estimatedImpact = Math.round(monthlyQty * price * 0.5);
      suggestions.push({
        type: "promote",
        productId: stat?.productId ?? "",
        productName: name,
        reason: "Υψηλό margin αλλά χαμηλές πωλήσεις",
        action: "Βάλε το πρώτο στο μενού, highlight στα social media",
        impact: `Αν διπλασιαστούν οι πωλήσεις: +${formatPrice(estimatedImpact)}/μήνα`,
      });
    }

    // Cash cows - reprice
    for (const name of engineering.cashCows) {
      const stat = allStats.find((s) => s.productName === name);
      const monthlyQty = stat?.quantity ?? 0;
      const estimatedImpact = monthlyQty * 2;
      suggestions.push({
        type: "reprice",
        productId: stat?.productId ?? "",
        productName: name,
        reason: "Υψηλές πωλήσεις αλλά χαμηλό margin",
        action: "Αύξηση τιμής κατά 2-3 ευρώ",
        impact: `Αύξηση 2 ευρώ: +${formatPrice(estimatedImpact)}/μήνα`,
      });
    }

    // Dogs - remove
    for (const name of engineering.dogs) {
      const stat = allStats.find((s) => s.productName === name);
      const price =
        state.products.find((p) => p.id === stat?.productId)?.price ?? 0;
      const estimatedImpact = Math.round(price * 10 * 0.6);
      suggestions.push({
        type: "remove",
        productId: stat?.productId ?? "",
        productName: name,
        reason: "Χαμηλές πωλήσεις & χαμηλό margin",
        action: "Σκέψου αντικατάσταση ή αφαίρεση",
        impact: `Αντικατάσταση με πιάτο 60% margin: +${formatPrice(estimatedImpact)}/μήνα`,
      });
    }

    return suggestions;
  };

  const getRevenueProjection = (): RevenueProjection => {
    // Current monthly revenue from last 30 days
    const revenueByDay = analytics.getRevenueByDay(30);
    const current = revenueByDay.reduce((sum, d) => sum + d.revenue, 0);

    // Estimate impacts from suggestions
    const suggestions = getOptimizationSuggestions();
    let totalIncrease = 0;

    for (const s of suggestions) {
      if (!s.impact) continue;
      // Parse estimated amounts from impact strings
      const match = s.impact.match(/\+.*?([\d.,]+)/);
      if (match) {
        const amount = parseFloat(match[1].replace(",", "."));
        if (!isNaN(amount)) {
          totalIncrease += amount;
        }
      }
    }

    // Fallback: estimate 8-12% increase
    if (totalIncrease === 0) {
      totalIncrease = current * 0.1;
    }

    const projected = current + totalIncrease;
    const increasePercent =
      current > 0 ? Math.round((totalIncrease / current) * 1000) / 10 : 0;

    return {
      current: Math.round(current * 100) / 100,
      projected: Math.round(projected * 100) / 100,
      increase: Math.round(totalIncrease * 100) / 100,
      increasePercent,
    };
  };

  // ─── Revenue chart data ───────────────────────────────────────────────

  const getRevenueChartData = (targetDate: string) => {
    const revenueByDay = analytics.getRevenueByDay(7);
    const forecastedRevenue = getForecastedRevenue(targetDate);

    return [
      ...revenueByDay.map((d) => ({
        date: d.date,
        revenue: d.revenue,
        isForecast: false,
      })),
      {
        date: targetDate,
        revenue: forecastedRevenue,
        isForecast: true,
      },
    ];
  };

  return {
    // Chat
    sendMessage,
    clearChat,
    chatHistory: state.chatHistory,
    aiSettings: state.aiSettings,

    // Forecasting
    getForecast,
    getForecastedRevenue,
    getIngredientOrderSuggestion,
    getRevenueChartData,

    // Menu Optimization
    getOptimizationSuggestions,
    getRevenueProjection,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function getDayName(dayOfWeek: number): string {
  const days = [
    "Κυριακές",
    "Δευτέρες",
    "Τρίτες",
    "Τετάρτες",
    "Πέμπτες",
    "Παρασκευές",
    "Σάββατα",
  ];
  return days[dayOfWeek] ?? "ημέρες";
}
