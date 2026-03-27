// EatFlow POS - Analytics Hook
// Aggregates mock history + live POS data for comprehensive analytics

import { usePOS } from "@/lib/pos-context";
import { useRecipes } from "@/hooks/use-recipes";
import {
  mockHistory,
  mockPrepTimes,
  mockCancellations,
} from "@/lib/mock-history";
import type {
  DailyStats,
  MockPrepTime,
  MockCancellation,
} from "@/lib/mock-history";
import type { Station } from "@/lib/types";
import {
  format,
  subDays,
  parseISO,
  isWithinInterval,
  startOfDay,
  endOfDay,
  getDay,
  differenceInDays,
} from "date-fns";

// ─── Return Types ───────────────────────────────────────────────────────────

interface RevenueByDay {
  date: string;
  revenue: number;
}

interface TopProduct {
  productId: string;
  productName: string;
  quantity: number;
  revenue: number;
}

interface PaymentBreakdown {
  cash: number;
  card: number;
}

interface SalesPeriodEntry {
  date: string;
  orderCount: number;
  revenue: number;
  avgCheck: number;
}

interface PeriodComparison {
  current: number;
  previous: number;
  changePercent: number;
}

interface HeatmapEntry {
  day: number;
  hour: number;
  revenue: number;
}

interface PrepTimeEntry {
  productName: string;
  avgTime: number;
  station: Station;
}

interface StationStats {
  orders: number;
  avgTime: number;
  load: number;
}

interface HourlyThroughputEntry {
  hour: number;
  count: number;
}

interface FoodCostSummary {
  avgFoodCostPercent: number;
  bestMarginProduct: string;
  worstMarginProduct: string;
}

interface MarginTableEntry {
  productId: string;
  productName: string;
  category: string;
  price: number;
  foodCost: number;
  marginPercent: number;
}

interface FoodCostByCategory {
  category: string;
  avgFoodCostPercent: number;
}

interface ProductHistoryEntry {
  date: string;
  quantity: number;
  revenue: number;
}

interface HourlyPattern {
  hour: number;
  quantity: number;
}

interface ProductCombination {
  productId: string;
  productName: string;
  count: number;
}

interface MenuEngineering {
  stars: string[];
  cashCows: string[];
  puzzles: string[];
  dogs: string[];
}

interface AllProductStat {
  productId: string;
  productName: string;
  category: string;
  quantity: number;
  revenue: number;
  foodCost: number;
  marginPercent: number;
  trend: "up" | "stable" | "down";
}

interface VatReportEntry {
  vatRate: number;
  net: number;
  vat: number;
  gross: number;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function getTodayStr(): string {
  return format(new Date(), "yyyy-MM-dd");
}

function getYesterdayStr(): string {
  return format(subDays(new Date(), 1), "yyyy-MM-dd");
}

function computeMedian(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

function findHistoryDay(dateStr: string): DailyStats | undefined {
  return mockHistory.find((d) => d.date === dateStr);
}

function getLatestHistoryDay(): DailyStats {
  return mockHistory[mockHistory.length - 1];
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useAnalytics() {
  const { state } = usePOS();
  const {
    calculateFoodCost,
    calculateMargin,
    getAverageFoodCostPercent,
    getRecipeForProduct,
  } = useRecipes();

  // ─── Dashboard ──────────────────────────────────────────────────────────

  const getTodayRevenue = (): number => {
    const todayStr = getTodayStr();
    const liveRevenue = state.orders
      .filter(
        (o) =>
          o.status === "completed" &&
          o.completedAt &&
          format(new Date(o.completedAt), "yyyy-MM-dd") === todayStr,
      )
      .reduce((sum, o) => sum + o.total, 0);

    if (liveRevenue > 0) return Math.round(liveRevenue * 100) / 100;
    return getLatestHistoryDay().revenue;
  };

  const getYesterdayRevenue = (): number => {
    const yesterdayStr = getYesterdayStr();
    const day = findHistoryDay(yesterdayStr);
    if (day) return day.revenue;
    // Fallback to second-to-last day
    return mockHistory.length >= 2
      ? mockHistory[mockHistory.length - 2].revenue
      : 0;
  };

  const getTodayOrderCount = (): number => {
    const todayStr = getTodayStr();
    const liveCount = state.orders.filter(
      (o) =>
        o.status === "completed" &&
        o.completedAt &&
        format(new Date(o.completedAt), "yyyy-MM-dd") === todayStr,
    ).length;

    if (liveCount > 0) return liveCount;
    return getLatestHistoryDay().orderCount;
  };

  const getAverageCheck = (): number => {
    const revenue = getTodayRevenue();
    const count = getTodayOrderCount();
    if (count === 0) return 0;
    return Math.round((revenue / count) * 100) / 100;
  };

  const getRevenueByDay = (days: number): RevenueByDay[] => {
    const result: RevenueByDay[] = [];
    const todayStr = getTodayStr();

    // Add mock history days (already sorted ascending)
    const historySlice = mockHistory.slice(-days);
    for (const day of historySlice) {
      result.push({ date: day.date, revenue: day.revenue });
    }

    // Check if today has live data
    const todayRevenue = state.orders
      .filter(
        (o) =>
          o.status === "completed" &&
          o.completedAt &&
          format(new Date(o.completedAt), "yyyy-MM-dd") === todayStr,
      )
      .reduce((sum, o) => sum + o.total, 0);

    if (todayRevenue > 0) {
      result.push({ date: todayStr, revenue: todayRevenue });
    }

    return result.slice(-days);
  };

  const getHourlyRevenue = (
    date?: string,
  ): { hour: number; revenue: number }[] => {
    const targetDate = date ?? getTodayStr();
    const todayStr = getTodayStr();

    // If requesting today, try live data first
    if (targetDate === todayStr) {
      const todayOrders = state.orders.filter(
        (o) =>
          o.status === "completed" &&
          o.completedAt &&
          format(new Date(o.completedAt), "yyyy-MM-dd") === todayStr,
      );

      if (todayOrders.length > 0) {
        const hourMap: Record<number, number> = {};
        for (let h = 12; h <= 23; h++) {
          hourMap[h] = 0;
        }
        for (const order of todayOrders) {
          const hour = new Date(order.completedAt!).getHours();
          if (hour >= 12 && hour <= 23) {
            hourMap[hour] += order.total;
          }
        }
        return Object.entries(hourMap).map(([h, revenue]) => ({
          hour: parseInt(h, 10),
          revenue: Math.round(revenue * 100) / 100,
        }));
      }
    }

    // Fall back to mock history
    const day = findHistoryDay(targetDate);
    if (day) return day.hourlyRevenue;

    // Default empty
    return Array.from({ length: 12 }, (_, i) => ({
      hour: i + 12,
      revenue: 0,
    }));
  };

  const getTopProducts = (limit: number): TopProduct[] => {
    const aggregated = new Map<
      string,
      {
        productId: string;
        productName: string;
        quantity: number;
        revenue: number;
      }
    >();

    // Aggregate from all mock history
    for (const day of mockHistory) {
      for (const ps of day.productSales) {
        const existing = aggregated.get(ps.productId);
        if (existing) {
          existing.quantity += ps.quantity;
          existing.revenue += ps.revenue;
        } else {
          aggregated.set(ps.productId, {
            productId: ps.productId,
            productName: ps.productName,
            quantity: ps.quantity,
            revenue: ps.revenue,
          });
        }
      }
    }

    // Aggregate from live orders
    const completedOrders = state.orders.filter(
      (o) => o.status === "completed",
    );
    for (const order of completedOrders) {
      for (const item of order.items) {
        const existing = aggregated.get(item.productId);
        if (existing) {
          existing.quantity += item.quantity;
          existing.revenue += item.price * item.quantity;
        } else {
          aggregated.set(item.productId, {
            productId: item.productId,
            productName: item.productName,
            quantity: item.quantity,
            revenue: item.price * item.quantity,
          });
        }
      }
    }

    return [...aggregated.values()]
      .map((p) => ({
        ...p,
        revenue: Math.round(p.revenue * 100) / 100,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, limit);
  };

  const getWorstProducts = (limit: number): TopProduct[] => {
    const aggregated = new Map<
      string,
      {
        productId: string;
        productName: string;
        quantity: number;
        revenue: number;
      }
    >();

    for (const day of mockHistory) {
      for (const ps of day.productSales) {
        const existing = aggregated.get(ps.productId);
        if (existing) {
          existing.quantity += ps.quantity;
          existing.revenue += ps.revenue;
        } else {
          aggregated.set(ps.productId, {
            productId: ps.productId,
            productName: ps.productName,
            quantity: ps.quantity,
            revenue: ps.revenue,
          });
        }
      }
    }

    return [...aggregated.values()]
      .map((p) => ({
        ...p,
        revenue: Math.round(p.revenue * 100) / 100,
      }))
      .sort((a, b) => a.quantity - b.quantity)
      .slice(0, limit);
  };

  const getPaymentBreakdown = (): PaymentBreakdown => {
    const todayStr = getTodayStr();
    const todayOrders = state.orders.filter(
      (o) =>
        o.status === "completed" &&
        o.completedAt &&
        format(new Date(o.completedAt), "yyyy-MM-dd") === todayStr,
    );

    if (todayOrders.length > 0) {
      const cash = todayOrders
        .filter((o) => o.paymentMethod === "cash")
        .reduce((sum, o) => sum + o.total, 0);
      const card = todayOrders
        .filter((o) => o.paymentMethod === "card")
        .reduce((sum, o) => sum + o.total, 0);
      return {
        cash: Math.round(cash * 100) / 100,
        card: Math.round(card * 100) / 100,
      };
    }

    const latest = getLatestHistoryDay();
    return {
      cash: latest.cashPayments,
      card: latest.cardPayments,
    };
  };

  // ─── Sales ──────────────────────────────────────────────────────────────

  const getSalesForPeriod = (from: string, to: string): SalesPeriodEntry[] => {
    const fromDate = startOfDay(parseISO(from));
    const toDate = endOfDay(parseISO(to));

    return mockHistory
      .filter((day) => {
        const d = parseISO(day.date);
        return isWithinInterval(d, { start: fromDate, end: toDate });
      })
      .map((day) => ({
        date: day.date,
        orderCount: day.orderCount,
        revenue: day.revenue,
        avgCheck: day.avgCheck,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  };

  const getPeriodComparison = (from: string, to: string): PeriodComparison => {
    const currentSales = getSalesForPeriod(from, to);
    const currentRevenue = currentSales.reduce((sum, s) => sum + s.revenue, 0);

    // Calculate previous period of same length
    const periodDays = differenceInDays(parseISO(to), parseISO(from)) + 1;
    const prevTo = format(subDays(parseISO(from), 1), "yyyy-MM-dd");
    const prevFrom = format(subDays(parseISO(from), periodDays), "yyyy-MM-dd");

    const prevSales = getSalesForPeriod(prevFrom, prevTo);
    const previousRevenue = prevSales.reduce((sum, s) => sum + s.revenue, 0);

    const changePercent =
      previousRevenue === 0
        ? 0
        : Math.round(
            ((currentRevenue - previousRevenue) / previousRevenue) * 10000,
          ) / 100;

    return {
      current: Math.round(currentRevenue * 100) / 100,
      previous: Math.round(previousRevenue * 100) / 100,
      changePercent,
    };
  };

  const getPeakHoursHeatmap = (): HeatmapEntry[] => {
    // Aggregate: dayOfWeek (0-6) x hour (12-23) => revenue
    const grid = new Map<string, number>();

    for (let day = 0; day <= 6; day++) {
      for (let hour = 12; hour <= 23; hour++) {
        grid.set(`${day}-${hour}`, 0);
      }
    }

    for (const dayStats of mockHistory) {
      const dayOfWeek = getDay(parseISO(dayStats.date));
      for (const hr of dayStats.hourlyRevenue) {
        const key = `${dayOfWeek}-${hr.hour}`;
        grid.set(key, (grid.get(key) ?? 0) + hr.revenue);
      }
    }

    const result: HeatmapEntry[] = [];
    for (const [key, revenue] of grid.entries()) {
      const [d, h] = key.split("-").map(Number);
      result.push({
        day: d,
        hour: h,
        revenue: Math.round(revenue * 100) / 100,
      });
    }

    return result;
  };

  // ─── Kitchen ────────────────────────────────────────────────────────────

  const getAveragePrepTime = (): number => {
    if (mockPrepTimes.length === 0) return 0;
    const total = mockPrepTimes.reduce((sum, pt) => sum + pt.avgMinutes, 0);
    return Math.round((total / mockPrepTimes.length) * 10) / 10;
  };

  const getPrepTimeByProduct = (): PrepTimeEntry[] =>
    mockPrepTimes
      .map((pt) => ({
        productName: pt.productName,
        avgTime: pt.avgMinutes,
        station: pt.station,
      }))
      .sort((a, b) => b.avgTime - a.avgTime);

  const getStationPerformance = (): Record<Station, StationStats> => {
    const stationData: Record<
      Station,
      { totalOrders: number; totalTime: number; productCount: number }
    > = {
      hot: { totalOrders: 0, totalTime: 0, productCount: 0 },
      cold: { totalOrders: 0, totalTime: 0, productCount: 0 },
      bar: { totalOrders: 0, totalTime: 0, productCount: 0 },
      dessert: { totalOrders: 0, totalTime: 0, productCount: 0 },
    };

    // Build prep time lookup
    const prepTimeLookup = new Map<string, MockPrepTime>();
    for (const pt of mockPrepTimes) {
      prepTimeLookup.set(pt.productId, pt);
    }

    // Aggregate from mock history
    for (const day of mockHistory) {
      for (const ps of day.productSales) {
        const station = ps.station;
        const prepTime = prepTimeLookup.get(ps.productId);
        stationData[station].totalOrders += ps.quantity;
        stationData[station].totalTime +=
          (prepTime?.avgMinutes ?? 10) * ps.quantity;
        stationData[station].productCount += 1;
      }
    }

    // Compute total orders across all stations for load %
    const grandTotal = Object.values(stationData).reduce(
      (sum, s) => sum + s.totalOrders,
      0,
    );

    const result: Record<Station, StationStats> = {
      hot: { orders: 0, avgTime: 0, load: 0 },
      cold: { orders: 0, avgTime: 0, load: 0 },
      bar: { orders: 0, avgTime: 0, load: 0 },
      dessert: { orders: 0, avgTime: 0, load: 0 },
    };

    for (const station of ["hot", "cold", "bar", "dessert"] as Station[]) {
      const data = stationData[station];
      result[station] = {
        orders: data.totalOrders,
        avgTime:
          data.totalOrders > 0
            ? Math.round((data.totalTime / data.totalOrders) * 10) / 10
            : 0,
        load:
          grandTotal > 0
            ? Math.round((data.totalOrders / grandTotal) * 100)
            : 0,
      };
    }

    return result;
  };

  const getHourlyThroughput = (): HourlyThroughputEntry[] => {
    const todayStr = getTodayStr();
    const todayOrders = state.orders.filter(
      (o) =>
        o.status === "completed" &&
        o.completedAt &&
        format(new Date(o.completedAt), "yyyy-MM-dd") === todayStr,
    );

    const hourMap: Record<number, number> = {};
    for (let h = 12; h <= 23; h++) {
      hourMap[h] = 0;
    }

    if (todayOrders.length > 0) {
      for (const order of todayOrders) {
        const hour = new Date(order.completedAt!).getHours();
        if (hour >= 12 && hour <= 23) {
          hourMap[hour] += 1;
        }
      }
    } else {
      // Derive from latest mock history day
      const latest = getLatestHistoryDay();
      const totalRev = latest.revenue;
      for (const hr of latest.hourlyRevenue) {
        // Estimate orders proportionally
        const proportion = totalRev > 0 ? hr.revenue / totalRev : 0;
        hourMap[hr.hour] = Math.round(latest.orderCount * proportion);
      }
    }

    return Object.entries(hourMap).map(([h, count]) => ({
      hour: parseInt(h, 10),
      count,
    }));
  };

  const getCancellations = (): MockCancellation[] => mockCancellations;

  // ─── Food Cost ──────────────────────────────────────────────────────────

  const getFoodCostSummary = (): FoodCostSummary => {
    const avgFoodCostPercent = getAverageFoodCostPercent();

    let bestMarginProduct = "—";
    let worstMarginProduct = "—";
    let bestMargin = -Infinity;
    let worstMargin = Infinity;

    for (const recipe of state.recipes) {
      const product = state.products.find((p) => p.id === recipe.productId);
      if (!product) continue;

      const margin = calculateMargin(recipe);
      if (margin > bestMargin) {
        bestMargin = margin;
        bestMarginProduct = product.name;
      }
      if (margin < worstMargin) {
        worstMargin = margin;
        worstMarginProduct = product.name;
      }
    }

    return {
      avgFoodCostPercent: Math.round(avgFoodCostPercent * 10) / 10,
      bestMarginProduct,
      worstMarginProduct,
    };
  };

  const getMarginTable = (): MarginTableEntry[] => {
    const entries: MarginTableEntry[] = [];

    for (const recipe of state.recipes) {
      const product = state.products.find((p) => p.id === recipe.productId);
      if (!product) continue;

      const category = state.categories.find(
        (c) => c.id === product.categoryId,
      );
      const foodCost = calculateFoodCost(recipe);
      const marginPercent = calculateMargin(recipe);

      entries.push({
        productId: product.id,
        productName: product.name,
        category: category?.name ?? "—",
        price: product.price,
        foodCost: Math.round(foodCost * 100) / 100,
        marginPercent: Math.round(marginPercent * 10) / 10,
      });
    }

    return entries.sort((a, b) => b.marginPercent - a.marginPercent);
  };

  const getFoodCostByCategory = (): FoodCostByCategory[] => {
    const marginTable = getMarginTable();
    const grouped = new Map<
      string,
      { totalFoodCostPct: number; count: number }
    >();

    for (const entry of marginTable) {
      const existing = grouped.get(entry.category);
      const foodCostPct =
        entry.price > 0 ? (entry.foodCost / entry.price) * 100 : 0;

      if (existing) {
        existing.totalFoodCostPct += foodCostPct;
        existing.count += 1;
      } else {
        grouped.set(entry.category, {
          totalFoodCostPct: foodCostPct,
          count: 1,
        });
      }
    }

    return [...grouped.entries()].map(([category, data]) => ({
      category,
      avgFoodCostPercent:
        Math.round((data.totalFoodCostPct / data.count) * 10) / 10,
    }));
  };

  // ─── Product History ────────────────────────────────────────────────────

  const getProductHistory = (productId: string): ProductHistoryEntry[] => {
    const result: ProductHistoryEntry[] = [];

    for (const day of mockHistory) {
      const sale = day.productSales.find((ps) => ps.productId === productId);
      if (sale) {
        result.push({
          date: day.date,
          quantity: sale.quantity,
          revenue: sale.revenue,
        });
      }
    }

    return result.sort((a, b) => a.date.localeCompare(b.date));
  };

  const getProductHourlyPattern = (productId: string): HourlyPattern[] => {
    const hourTotals: Record<number, number> = {};
    for (let h = 12; h <= 23; h++) {
      hourTotals[h] = 0;
    }

    for (const day of mockHistory) {
      const sale = day.productSales.find((ps) => ps.productId === productId);
      if (!sale) continue;

      // Distribute quantity proportionally to hourly revenue pattern
      const totalDayRevenue = day.hourlyRevenue.reduce(
        (sum, hr) => sum + hr.revenue,
        0,
      );
      if (totalDayRevenue === 0) continue;

      for (const hr of day.hourlyRevenue) {
        const proportion = hr.revenue / totalDayRevenue;
        hourTotals[hr.hour] += sale.quantity * proportion;
      }
    }

    return Object.entries(hourTotals).map(([h, qty]) => ({
      hour: parseInt(h, 10),
      quantity: Math.round(qty * 10) / 10,
    }));
  };

  const getProductCombinations = (
    productId: string,
    limit: number,
  ): ProductCombination[] => {
    const coOccurrences = new Map<
      string,
      { productId: string; productName: string; count: number }
    >();

    for (const day of mockHistory) {
      const hasProduct = day.productSales.some(
        (ps) => ps.productId === productId,
      );
      if (!hasProduct) continue;

      for (const ps of day.productSales) {
        if (ps.productId === productId) continue;
        const existing = coOccurrences.get(ps.productId);
        if (existing) {
          existing.count += 1;
        } else {
          coOccurrences.set(ps.productId, {
            productId: ps.productId,
            productName: ps.productName,
            count: 1,
          });
        }
      }
    }

    return [...coOccurrences.values()]
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  };

  const getProductTrend = (productId: string): "up" | "stable" | "down" => {
    const history = getProductHistory(productId);
    if (history.length < 14) return "stable";

    // Last 7 days vs previous 7 days
    const sorted = [...history].sort((a, b) => b.date.localeCompare(a.date));
    const recent = sorted.slice(0, 7);
    const previous = sorted.slice(7, 14);

    const recentAvg =
      recent.reduce((sum, h) => sum + h.quantity, 0) / (recent.length || 1);
    const prevAvg =
      previous.reduce((sum, h) => sum + h.quantity, 0) / (previous.length || 1);

    if (prevAvg === 0) return "stable";

    const changePercent = ((recentAvg - prevAvg) / prevAvg) * 100;
    if (changePercent > 10) return "up";
    if (changePercent < -10) return "down";
    return "stable";
  };

  const getMenuEngineering = (): MenuEngineering => {
    const allStats = getAllProductStats();

    const quantities = allStats.map((p) => p.quantity);
    const margins = allStats.map((p) => p.marginPercent);

    const medianQuantity = computeMedian(quantities);
    const medianMargin = computeMedian(margins);

    const stars: string[] = [];
    const cashCows: string[] = [];
    const puzzles: string[] = [];
    const dogs: string[] = [];

    for (const p of allStats) {
      const isHighSales = p.quantity >= medianQuantity;
      const isHighMargin = p.marginPercent >= medianMargin;

      if (isHighSales && isHighMargin) {
        stars.push(p.productName);
      } else if (isHighSales && !isHighMargin) {
        cashCows.push(p.productName);
      } else if (!isHighSales && isHighMargin) {
        puzzles.push(p.productName);
      } else {
        dogs.push(p.productName);
      }
    }

    return { stars, cashCows, puzzles, dogs };
  };

  const getAllProductStats = (): AllProductStat[] => {
    // Aggregate quantities and revenue from mock history
    const aggregated = new Map<
      string,
      {
        productId: string;
        productName: string;
        quantity: number;
        revenue: number;
        station: Station;
      }
    >();

    for (const day of mockHistory) {
      for (const ps of day.productSales) {
        const existing = aggregated.get(ps.productId);
        if (existing) {
          existing.quantity += ps.quantity;
          existing.revenue += ps.revenue;
        } else {
          aggregated.set(ps.productId, {
            productId: ps.productId,
            productName: ps.productName,
            quantity: ps.quantity,
            revenue: ps.revenue,
            station: ps.station,
          });
        }
      }
    }

    const result: AllProductStat[] = [];

    for (const [, data] of aggregated) {
      const product = state.products.find((p) => p.id === data.productId);
      const category = product
        ? state.categories.find((c) => c.id === product.categoryId)
        : undefined;

      // Get food cost from recipe if available
      const recipe = getRecipeForProduct(data.productId);
      const foodCost = recipe ? calculateFoodCost(recipe) : 0;
      const marginPercent = recipe ? calculateMargin(recipe) : 0;

      result.push({
        productId: data.productId,
        productName: data.productName,
        category: category?.name ?? "—",
        quantity: data.quantity,
        revenue: Math.round(data.revenue * 100) / 100,
        foodCost: Math.round(foodCost * 100) / 100,
        marginPercent: Math.round(marginPercent * 10) / 10,
        trend: getProductTrend(data.productId),
      });
    }

    return result.sort((a, b) => b.revenue - a.revenue);
  };

  // ─── Export Helpers ─────────────────────────────────────────────────────

  const getVatReport = (from: string, to: string): VatReportEntry[] => {
    const sales = getSalesForPeriod(from, to);
    const totalRevenue = sales.reduce((sum, s) => sum + s.revenue, 0);

    // Estimate VAT split from product sales in the period
    const vatBuckets = new Map<number, number>();

    for (const day of mockHistory) {
      if (day.date < from || day.date > to) continue;
      for (const ps of day.productSales) {
        // All current products are 13% VAT (seafood restaurant)
        // but support both rates for completeness
        const product = state.products.find((p) => p.id === ps.productId);
        const rate = product?.vatRate ?? 13;
        vatBuckets.set(rate, (vatBuckets.get(rate) ?? 0) + ps.revenue);
      }
    }

    // If no product-level data, assume all at 13%
    if (vatBuckets.size === 0 && totalRevenue > 0) {
      vatBuckets.set(13, totalRevenue);
    }

    return [...vatBuckets.entries()].map(([rate, gross]) => {
      const net = Math.round((gross / (1 + rate / 100)) * 100) / 100;
      const vat = Math.round((gross - net) * 100) / 100;
      return { vatRate: rate, net, vat, gross: Math.round(gross * 100) / 100 };
    });
  };

  const generateCsvData = (type: "sales" | "inventory"): string => {
    if (type === "sales") {
      const thirtyDaysAgo = format(subDays(new Date(), 30), "yyyy-MM-dd");
      const today = getTodayStr();
      const sales = getSalesForPeriod(thirtyDaysAgo, today);

      const headers = ["Ημερομηνία", "Παραγγελίες", "Έσοδα", "Μέσος Λογ/σμός"];
      const rows = sales.map((s) => [
        s.date,
        String(s.orderCount),
        s.revenue.toFixed(2),
        s.avgCheck.toFixed(2),
      ]);

      return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    }

    // Inventory CSV
    const headers = [
      "Υλικό",
      "Μονάδα",
      "Απόθεμα",
      "Ελάχιστο",
      "Κόστος/Μονάδα",
      "Κατηγορία",
    ];
    const rows = state.ingredients.map((ing) => [
      ing.name,
      ing.unit,
      String(ing.currentStock),
      String(ing.minStock),
      ing.costPerUnit.toFixed(2),
      ing.category,
    ]);

    return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  };

  // ─── Return ─────────────────────────────────────────────────────────────

  return {
    // Dashboard
    getTodayRevenue,
    getYesterdayRevenue,
    getTodayOrderCount,
    getAverageCheck,
    getRevenueByDay,
    getHourlyRevenue,
    getTopProducts,
    getWorstProducts,
    getPaymentBreakdown,

    // Sales
    getSalesForPeriod,
    getPeriodComparison,
    getPeakHoursHeatmap,

    // Kitchen
    getAveragePrepTime,
    getPrepTimeByProduct,
    getStationPerformance,
    getHourlyThroughput,
    getCancellations,

    // Food Cost
    getFoodCostSummary,
    getMarginTable,
    getFoodCostByCategory,

    // Product History
    getProductHistory,
    getProductHourlyPattern,
    getProductCombinations,
    getProductTrend,
    getMenuEngineering,
    getAllProductStats,

    // Export
    getVatReport,
    generateCsvData,
  };
}
