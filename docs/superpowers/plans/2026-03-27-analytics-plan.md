# Advanced Analytics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace basic reports with comprehensive 6-tab analytics suite including menu engineering.

**Architecture:** Single useAnalytics() hook aggregates all data. Mock history data provides 30 days of demo data. Recharts for all visualizations.

**Tech Stack:** Next.js 16, React 19, Tailwind 4, Shadcn/UI, Recharts, date-fns

---

## Task 1: Mock History Data

**File to create:** `lib/mock-history.ts`

Generate a `MOCK_HISTORY` array of 30 `DailyStats` objects (one per day, ending yesterday).

### Types to define locally

```typescript
interface HourlyRevenue { hour: number; revenue: number }
interface ProductSale { productId: string; productName: string; quantity: number; revenue: number; station: Station }
interface DailyStats {
  date: string             // ISO date "YYYY-MM-DD"
  revenue: number
  orderCount: number
  avgCheck: number
  cashPayments: number
  cardPayments: number
  hourlyRevenue: HourlyRevenue[]
  productSales: ProductSale[]
}
```

### Generation rules

- Use `date-fns/subDays` + `date-fns/format` to generate dates (day 0 = yesterday, day 29 = 30 days ago)
- Base revenue: weekdays €800–1200, weekends (Fri/Sat) €1400–2000
- Order count: revenue / (avgCheck of €18–28, randomized per day)
- Cash/card split: ~55% cash, 45% card (with 5% noise)
- Hourly revenue: distribute daily revenue across hours 12–23 using a bell-curve-like pattern:
  - Lunch peak at 13:00–14:00 (~25% of daily)
  - Quiet 15:00–19:00 (~15% of daily)
  - Dinner peak at 20:00–22:00 (~50% of daily)
  - Remaining ~10% spread across other hours
- Product sales per day: generate 8–12 product entries using a fixed list of product IDs and names that match the realistic restaurant menu (e.g., "Σαλάτα Χωριάτικη", "Μπριζόλα", "Γλυκό Ημέρας", "Μπύρα", "Κρασί Ερυθρό", "Σπαγγέτι Μπολονέζ", "Ψάρι Σχάρας", "Τυρόπιτα"). Quantities should be realistic (salads/drinks 10–25, mains 5–15, desserts 3–10).

### Kitchen timing mock (also in `lib/mock-history.ts`)

Export a `MOCK_PREP_TIMES` constant:
```typescript
export const MOCK_PREP_TIMES: Record<string, number> = {
  // productName → avgMinutes
  'Σαλάτα Χωριάτικη': 5,
  'Τυρόπιτα': 4,
  'Σπαγγέτι Μπολονέζ': 12,
  'Μπριζόλα': 18,
  'Ψάρι Σχάρας': 15,
  'Μπύρα': 2,
  'Κρασί Ερυθρό': 1,
  'Γλυκό Ημέρας': 6,
}
```

Export a `MOCK_CANCELLATIONS` array with 5–8 entries: `{ date: string; productName: string; reason: string }`.

### Commit

```bash
git add lib/mock-history.ts
git commit -m "feat(analytics): add 30-day mock history data"
```

---

## Task 2: Analytics Hook

**File to create:** `hooks/use-analytics.ts`

Pattern: same structure as `hooks/use-kitchen.ts` — import `usePOS`, destructure `state`, define and return pure functions.

Also import `MOCK_HISTORY`, `MOCK_PREP_TIMES`, `MOCK_CANCELLATIONS` from `@/lib/mock-history`.
Import `date-fns` functions: `format`, `subDays`, `parseISO`, `isWithinInterval`, `startOfDay`, `endOfDay`.

### Return shape

```typescript
export function useAnalytics() {
  const { state } = usePOS()
  // ...
  return {
    // Dashboard
    getTodayRevenue,
    getTodayOrderCount,
    getAverageCheck,
    getYesterdayRevenue,
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

    // Food Cost (delegates to recipe calculations)
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
  }
}
```

### Key function logic

**`getTodayRevenue()`** — filter `state.orders` where `status === 'completed'` and `completedAt` date matches today. Sum `order.total`. If 0 (no live data yet), return last day's revenue from `MOCK_HISTORY[0].revenue`.

**`getRevenueByDay(days: number)`** — return last `days` entries from `MOCK_HISTORY` merged with live data for today. Shape: `{ date: string; revenue: number }[]`.

**`getHourlyRevenue(date?: string)`** — if `date` is today or undefined: derive from `state.orders` completed today, grouped by hour 12–23. If date is historical: find in `MOCK_HISTORY`. Return `{ hour: number; revenue: number }[]`.

**`getTopProducts(limit: number)`** — aggregate `state.orders` completed items + `MOCK_HISTORY` product sales. Group by `productName`, sum quantity and revenue. Sort descending by quantity. Return top `limit`. Shape: `{ productName: string; quantity: number; revenue: number }[]`.

**`getWorstProducts(limit: number)`** — same as above but sort ascending by quantity, return last `limit`.

**`getPaymentBreakdown()`** — today only from `state.orders`. If no live data, use `MOCK_HISTORY[0]`. Return `{ cash: number; card: number }`.

**`getSalesForPeriod(from: string, to: string)`** — filter `MOCK_HISTORY` for dates in range. Return `{ date: string; orderCount: number; revenue: number; avgCheck: number }[]` sorted ascending.

**`getPeriodComparison(from: string, to: string)`** — get current period revenue (sum of `getSalesForPeriod`), then get same-length period immediately before. Return `{ current: number; previous: number; changePercent: number }`.

**`getPeakHoursHeatmap()`** — aggregate across all `MOCK_HISTORY` entries, for each `(dayOfWeek 0–6, hour 12–23)` sum revenue. Return `{ day: number; hour: number; revenue: number }[]` (84 entries).

**`getAveragePrepTime()`** — compute average of `MOCK_PREP_TIMES` values.

**`getPrepTimeByProduct()`** — return `MOCK_PREP_TIMES` as `{ productName: string; avgTime: number }[]` sorted descending by time.

**`getStationPerformance()`** — return a `Record<Station, { orders: number; avgTime: number; load: number }>` using station distributions from product sales in `MOCK_HISTORY` (hot/cold/bar/dessert split based on product types).

**`getHourlyThroughput()`** — from `state.orders` completed today, count orders per hour. Return `{ hour: number; count: number }[]` for hours 12–23.

**`getCancellations()`** — return `MOCK_CANCELLATIONS`.

**`getFoodCostSummary()`** — call `useRecipes()` internal logic: iterate `state.recipes`, compute food cost and margin per product. Return `{ avgFoodCostPercent: number; bestMarginProduct: string; worstMarginProduct: string }`.

**`getMarginTable()`** — for each recipe in `state.recipes`, find matching product from `state.products`, compute food cost (sum ingredient costs normalized to base unit), compute margin %. Return `{ productId: string; productName: string; category: string; price: number; foodCost: number; marginPercent: number }[]` sorted by margin descending.

**`getFoodCostByCategory()`** — group margin table by category, average food cost percent per category. Return `{ category: string; avgFoodCostPercent: number }[]`.

**`getProductHistory(productId: string)`** — filter `MOCK_HISTORY` for entries containing this productId in `productSales`. Return `{ date: string; quantity: number; revenue: number }[]`.

**`getProductHourlyPattern(productId: string)`** — from `MOCK_HISTORY`, for each day that has this product in `productSales`, proportionally distribute that day's quantity across the day's hourly revenue pattern. Aggregate across days. Return `{ hour: number; quantity: number }[]`.

**`getProductCombinations(productId: string, limit: number)`** — from `MOCK_HISTORY` product sales, for each day this product appears, find other products that also appear that day. Count co-occurrences. Return `{ productName: string; count: number }[]` sorted descending, limited to `limit`.

**`getProductTrend(productId: string)`** — compare average weekly quantity in last 2 weeks vs prior 2 weeks. If diff > 10% up → `'up'`, < 10% down → `'down'`, else `'stable'`.

**`getAllProductStats()`** — returns combined `{ productName: string; category: string; quantity: number; revenue: number; foodCost: number; marginPercent: number; trend: 'up'|'stable'|'down' }[]` for the full product table in Tab 5.

**`getMenuEngineering()`** — compute medians of quantity and margin across all products. Classify:
- Stars: quantity >= median AND marginPercent >= median
- Cash Cows: quantity >= median AND marginPercent < median
- Puzzles: quantity < median AND marginPercent >= median
- Dogs: quantity < median AND marginPercent < median
Return `{ stars: string[]; cashCows: string[]; puzzles: string[]; dogs: string[] }` (product names).

### Commit

```bash
git add hooks/use-analytics.ts
git commit -m "feat(analytics): add useAnalytics hook with all aggregation functions"
```

---

## Task 3: Dashboard Tab

**File to create:** `components/pos/analytics-dashboard.tsx`

`'use client'` component. Accepts no props — calls `useAnalytics()` internally.

### Layout

```
<div className="space-y-6">
  {/* KPI row */}
  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
    <KpiCard> x4
  </div>
  {/* Charts row 1 */}
  <div className="grid gap-6 lg:grid-cols-2">
    <RevenueBarChart />
    <HourlyAreaChart />
  </div>
  {/* Charts row 2 */}
  <div className="grid gap-6 lg:grid-cols-2">
    <TopProductsHorizontalBar />
    <PaymentPieChart />
  </div>
</div>
```

### KPI Cards

Use Shadcn `<Card>` with `<CardHeader>` / `<CardContent>`. Each card shows:
1. **Σημερινός Τζίρος** — `getTodayRevenue()` formatted as `€X.XX`. Sub-text: `+X% vs χθες` computed from `getYesterdayRevenue()`. Color: green if positive, red if negative. Icon: `TrendingUp`.
2. **Παραγγελίες** — `getTodayOrderCount()`. Sub-text: `Μ.Ο. €X.XX / παραγγελία` from `getAverageCheck()`. Icon: `Receipt`.
3. **Μέσος Λογαριασμός** — `getAverageCheck()`. Sub-text shows vs yesterday's avg. Icon: `ShoppingBag`.
4. **Food Cost %** — `getFoodCostSummary().avgFoodCostPercent` formatted as `X.X%`. Color badge: green < 30%, amber 30–40%, red > 40%. Icon: `Utensils`.

### Charts

**Revenue 7 ημερών** — Recharts `<BarChart>` with `data={getRevenueByDay(7)}`. X-axis: format date as `EEE` (day name). Y-axis: `€` formatter. Bar fill: `hsl(var(--primary))`. Tooltip shows date + revenue.

**Πωλήσεις ανά ώρα** — Recharts `<AreaChart>` with `data={getHourlyRevenue()}`. X-axis: `${hour}:00`. `<Area>` with `fill="hsl(var(--primary)/0.15)"` and `stroke="hsl(var(--primary))"`. Gradient optional.

**Top 5 Πιάτα** — Recharts `<BarChart layout="vertical">` with `data={getTopProducts(5)}`. `<XAxis type="number">`, `<YAxis type="category" dataKey="productName" width={140}>`. Bar fill: `hsl(var(--chart-2))`.

**Μετρητά vs Κάρτα** — Recharts `<PieChart>` with `<Pie innerRadius={50} outerRadius={80}>`. Two cells: `hsl(var(--chart-1))` for cash, `hsl(var(--chart-2))` for card. Show `<Legend>` and `<Tooltip>`.

All charts use `<ResponsiveContainer width="100%" height={260}>`. Wrap in `<Card>` with `<CardHeader>` title + description.

### Commit

```bash
git add components/pos/analytics-dashboard.tsx
git commit -m "feat(analytics): add Dashboard tab with KPI cards and 4 Recharts"
```

---

## Task 4: Sales Tab

**File to create:** `components/pos/analytics-sales.tsx`

`'use client'` component. Internal state: `period: 'today' | 'week' | 'month' | 'custom'`, `customFrom: string`, `customTo: string`.

### Compute date range from period

- today: from = today, to = today
- week: from = 7 days ago, to = today
- month: from = 30 days ago, to = today
- custom: use the date picker values

### Layout

```
<div className="space-y-6">
  <PeriodSelector />         {/* Button group + optional date pickers */}
  <PeriodComparisonBanner /> {/* current vs previous, % change */}
  <div className="grid gap-6 lg:grid-cols-2">
    <RevenueTable />
    <TopSellersTable />
  </div>
  <WorstSellersTable />
  <PeakHoursHeatmap />
</div>
```

### Period selector

Four `<Button variant={period === X ? 'default' : 'outline'}>` buttons: Σήμερα | Εβδομάδα | Μήνας | Προσαρμοσμένο. When custom is selected, show two `<Input type="date">` fields.

### Period comparison banner

Call `getPeriodComparison(from, to)`. Show as a Shadcn `<Card>` with three columns: current period revenue, previous period revenue, % change. Use `text-green-500` or `text-red-500` for change. Show `TrendingUp` or `TrendingDown` icon from Lucide.

### Revenue table

Call `getSalesForPeriod(from, to)`. Render as an HTML `<table>` styled with Tailwind. Columns: Ημερομηνία, Παραγγελίες, Έσοδα, Μέσος Λογ/σμός. Row hover highlight. If empty: centered "Δεν υπάρχουν δεδομένα".

### Top sellers table

Call `getTopProducts(10)` and show a table: #, Πιάτο, Τεμάχια, Έσοδα, % Συνολικού. Calculate % from total period revenue. Use `badge` for rank 1–3.

### Worst sellers table

Call `getWorstProducts(5)`. Same columns but labeled "Χαμηλές Πωλήσεις". Add a `text-muted-foreground` note: "Εξετάστε αν αξίζει να παραμείνουν στο μενού".

### Peak hours heatmap

Call `getPeakHoursHeatmap()`. Render a 7×12 CSS grid (days of week × hours 12–23). Each cell is a `<div>` with background opacity proportional to revenue (`opacity-10` to `opacity-100`). Days as column headers (Κυρ–Σαβ), hours as row labels. Use `bg-primary` for color.

### Commit

```bash
git add components/pos/analytics-sales.tsx
git commit -m "feat(analytics): add Sales tab with date range, tables, and heatmap"
```

---

## Task 5: Kitchen Tab

**File to create:** `components/pos/analytics-kitchen.tsx`

`'use client'` component. Calls `useAnalytics()`.

### Layout

```
<div className="space-y-6">
  <div className="grid grid-cols-3 gap-4">
    <MetricCard /> x3
  </div>
  <div className="grid gap-6 lg:grid-cols-2">
    <PrepTimeChart />
    <HourlyThroughputChart />
  </div>
  <StationPerformanceCards />
  <CancellationsTable />
</div>
```

### Metric cards

1. **Μέσος Χρόνος Παρασκευής** — `getAveragePrepTime()` as `X λεπτά`. Icon: `Clock`.
2. **Ακυρώσεις Σήμερα** — `getCancellations().length`. Icon: `XCircle`.
3. **Throughput/Ώρα** — `getTodayOrderCount()` divided by hours of operation (estimate 10h). Format as `X παραγ./ώρα`. Icon: `Zap`.

### Prep time chart

Call `getPrepTimeByProduct()`. Recharts `<BarChart layout="vertical">`. Y-axis: product names (`width={160}`). X-axis: minutes. Bars colored with a gradient from green (short) to red (long) using `<Cell>` with conditional fill: < 8min → `hsl(var(--chart-2))`, 8–14min → `hsl(var(--chart-4))`, > 14min → `hsl(var(--destructive))`.

### Hourly throughput chart

Call `getHourlyThroughput()`. Recharts `<LineChart>`. X-axis: hour (formatted as `HH:00`). Y-axis: count. `<Line type="monotone" strokeWidth={2} dot={false}>`.

### Station performance cards

Call `getStationPerformance()`. Render 4 `<Card>` components in a 2×2 or 4-column grid. Station labels: hot → "Ζεστό", cold → "Κρύο", bar → "Bar", dessert → "Γλυκά". Each card shows: orders processed, avg time, load % as a progress bar (`<div className="h-2 rounded-full bg-muted"><div style={{ width: `${load}%` }} className="h-full rounded-full bg-primary">` ).

### Cancellations table

Call `getCancellations()`. Render as a simple Shadcn `<Table>` (import from `@/components/ui/table`). Columns: Ημερομηνία, Πιάτο, Λόγος. If empty: "Δεν υπάρχουν ακυρώσεις".

### Commit

```bash
git add components/pos/analytics-kitchen.tsx
git commit -m "feat(analytics): add Kitchen tab with prep times, station cards, throughput"
```

---

## Task 6: Food Cost Tab

**File to create:** `components/pos/analytics-food-cost.tsx`

`'use client'` component. Calls `useAnalytics()`.

### Layout

```
<div className="space-y-6">
  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
    <SummaryCard /> x4
  </div>
  <div className="grid gap-6 lg:grid-cols-2">
    <MarginTable />
    <FoodCostByCategoryChart />
  </div>
</div>
```

### Summary cards

Call `getFoodCostSummary()` and `getMarginTable()`.

1. **Μέσο Food Cost %** — `avgFoodCostPercent`. Color: green < 30%, amber 30–40%, red > 40%.
2. **Πιάτα με Συνταγή** — count of entries in `getMarginTable()`.
3. **Καλύτερο Margin** — `bestMarginProduct` name + margin %.
4. **Χειρότερο Margin** — `worstMarginProduct` name + margin %.

### Margin analysis table

Call `getMarginTable()` sorted by `marginPercent` descending. Columns: Πιάτο, Κατηγορία, Τιμή, Κόστος, Margin %. Add a colored badge for margin: green (`bg-green-100 text-green-800`) if > 60%, amber if 40–60%, red if < 40%. If `state.recipes` is empty, show: "Δεν υπάρχουν συνταγές. Προσθέστε συνταγές από την ενότητα Συνταγολόγιο."

### Food cost by category chart

Call `getFoodCostByCategory()`. Recharts `<BarChart>`. X-axis: category names. Y-axis: %. Bar fill: `hsl(var(--chart-3))`. Add a `<ReferenceLine y={30} stroke="hsl(var(--destructive))" strokeDasharray="4 4">` as a target food cost line.

### Commit

```bash
git add components/pos/analytics-food-cost.tsx
git commit -m "feat(analytics): add Food Cost tab with margin table and category chart"
```

---

## Task 7: Product History Tab (Menu Engineering)

**File to create:** `components/pos/analytics-product-history.tsx`

This is the most complex tab. `'use client'` component. Internal state: `selectedProductName: string | null`, `sortColumn`, `sortDir`, `filterCategory`, `searchQuery`.

### Layout

```
<div className="space-y-6">
  <TableControls />    {/* search, category filter, sort */}
  <ProductTable />     {/* main table — click row to select */}
  {selectedProductName && <ProductDetail />}
  <MenuEngineeringMatrix />
</div>
```

### Table controls

- `<Input placeholder="Αναζήτηση πιάτου...">` — filters `productName` (case-insensitive)
- `<Select>` for category — options built from unique categories in `getAllProductStats()`
- Sort handled by clicking column headers (toggle asc/desc)

### Product table

Call `getAllProductStats()`, apply search/filter/sort. Render as Shadcn `<Table>`. Columns:
- Όνομα (sortable)
- Κατηγορία
- Πωλήσεις τμχ (sortable)
- Έσοδα € (sortable)
- Food Cost € (sortable)
- Margin % (sortable) — colored badge
- Trend — `TrendingUp` (green) / `Minus` (gray) / `TrendingDown` (red) icon

Click a row: set `selectedProductName` to that product (or null if already selected = toggle).

### Product detail panel

When `selectedProductName` is set, show a `<Card>` below the table with:
- Title: product name + close button (`X` icon, resets `selectedProductName`)
- Two charts side by side:
  - **Πωλήσεις ανά Ημέρα** — `getProductHistory(productId)` → Recharts `<LineChart>`. X-axis: date (format `d MMM`). Y-axis: quantity.
  - **Πωλήσεις ανά Ώρα** — `getProductHourlyPattern(productId)` → Recharts `<BarChart>`. X-axis: `HH:00`. Y-axis: quantity.
- Stat row: Μέση Ποσότητα/Παραγγελία + Τάση badge
- **Συνδυασμοί**: "Συχνά παραγγέλνεται μαζί με:" then `getProductCombinations(productId, 3)` as pill badges

Note: since `getAllProductStats()` uses product names not IDs, store both in the stats object. Adjust `getProductHistory` signature to accept productName as fallback if needed, or ensure mock data uses consistent IDs.

### Menu engineering matrix

Call `getMenuEngineering()`. Display as two layouts toggled by a `<Button>`:

**Layout A — Quadrant grid** (default): 2×2 CSS grid with colored quadrants:
- Top-left (high margin, low sales): Puzzles — `bg-blue-50` header "🧩 Puzzles — Προώθησέ τα"
- Top-right (high margin, high sales): Stars — `bg-green-50` header "⭐ Stars — Κράτα & προώθησέ τα"
- Bottom-left (low margin, low sales): Dogs — `bg-red-50` header "🐕 Dogs — Εξέτασε αφαίρεση"
- Bottom-right (low margin, high sales): Cash Cows — `bg-yellow-50` header "💰 Cash Cows — Αύξησε τιμή"
- Each quadrant lists product names as small pills

**Layout B — Scatter chart**: Recharts `<ScatterChart>`. X-axis: quantity (Πωλήσεις), Y-axis: margin %. Each product is a `<Scatter>` dot. Add `<ReferenceLine>` at median X and median Y to draw quadrant lines. Tooltip shows product name, quantity, margin %.

Toggle button above: "Πίνακας" | "Scatter" using two `<Button variant>` options.

### Commit

```bash
git add components/pos/analytics-product-history.tsx
git commit -m "feat(analytics): add Product History tab with menu engineering matrix"
```

---

## Task 8: Export Tab + Page Rewrite

### 8a: Export Tab

**File to create:** `components/pos/analytics-export.tsx`

`'use client'` component. Internal state: `autoSendEnabled: boolean`, `email: string`, `frequency: 'daily'|'weekly'|'monthly'`, `vatPeriod: 'today'|'week'|'month'`.

### Layout

```
<div className="space-y-6">
  <ExportButtons />
  <VatReport />
  <AutoSendSection />
</div>
```

### Export buttons

Three `<Button>` components in a row. Each simulates an action:
- **PDF Σύνοψη** — `Download` icon. On click: `alert('Δημιουργία PDF... (mock demo)')`.
- **CSV Πωλήσεων** — `FileText` icon. On click: generate a simple CSV string from `getSalesForPeriod(30days)`, create a Blob, trigger `<a>` download.
- **CSV Αποθήκης** — `Package` icon. On click: generate CSV from `state.ingredients`, trigger download.

CSV generation: use a helper `generateCsv(headers: string[], rows: string[][])` that joins with commas and newlines, wraps in `Blob` with `text/csv`, and calls `URL.createObjectURL` + synthetic click.

### VAT report

Period selector (Σήμερα / Εβδομάδα / Μήνας buttons). Derive revenue for period. Compute two VAT bands from `state.orders` (or mock): group order items by product `vatRate` (13% / 24%). For each rate: net = gross / (1 + rate/100), vat = gross - net. Show as Shadcn `<Table>`: ΦΠΑ%, Καθαρό, ΦΠΑ, Σύνολο. Add a total row.

### Auto-send section

`<Card>` with title "Αυτόματη Αποστολή". A `<Switch>` from Shadcn to toggle `autoSendEnabled`. When enabled, show:
- `<Input type="email" placeholder="email@restaurant.gr">` bound to `email`
- `<Select>` for frequency: Ημερήσια / Εβδομαδιαία / Μηνιαία
- `<p className="text-sm text-muted-foreground">` — "Mock — δεν αποστέλλεται πραγματικά"

### 8b: Page Rewrite

**File to modify:** `app/(pos)/reports/page.tsx`

Replace entire file content. Keep `'use client'`. Import Shadcn `<Tabs>`, `<TabsList>`, `<TabsTrigger>`, `<TabsContent>`.

```tsx
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import AnalyticsDashboard from '@/components/pos/analytics-dashboard'
import AnalyticsSales from '@/components/pos/analytics-sales'
import AnalyticsKitchen from '@/components/pos/analytics-kitchen'
import AnalyticsFoodCost from '@/components/pos/analytics-food-cost'
import AnalyticsProductHistory from '@/components/pos/analytics-product-history'
import AnalyticsExport from '@/components/pos/analytics-export'
import { usePOS } from '@/lib/pos-context'
import { Skeleton } from '@/components/ui/skeleton'

export default function ReportsPage() {
  const { state } = usePOS()

  if (!state.isLoaded) {
    return <LoadingSkeleton />
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="text-sm text-muted-foreground mt-1">Αναλυτικά στατιστικά εστιατορίου</p>
      </div>
      <Tabs defaultValue="dashboard">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="sales">Πωλήσεις</TabsTrigger>
          <TabsTrigger value="kitchen">Κουζίνα</TabsTrigger>
          <TabsTrigger value="food-cost">Food Cost</TabsTrigger>
          <TabsTrigger value="products">Ιστορικό Πιάτων</TabsTrigger>
          <TabsTrigger value="export">Export</TabsTrigger>
        </TabsList>
        <TabsContent value="dashboard"><AnalyticsDashboard /></TabsContent>
        <TabsContent value="sales"><AnalyticsSales /></TabsContent>
        <TabsContent value="kitchen"><AnalyticsKitchen /></TabsContent>
        <TabsContent value="food-cost"><AnalyticsFoodCost /></TabsContent>
        <TabsContent value="products"><AnalyticsProductHistory /></TabsContent>
        <TabsContent value="export"><AnalyticsExport /></TabsContent>
      </Tabs>
    </div>
  )
}
```

`LoadingSkeleton` is a local function returning a grid of 4 `<Skeleton className="h-32 rounded-xl">` cards.

### Commit

```bash
git add components/pos/analytics-export.tsx app/(pos)/reports/page.tsx
git commit -m "feat(analytics): add Export tab and rewrite reports page with 6-tab layout"
```

---

## Implementation Order

1. Task 1 — mock data (no dependencies)
2. Task 2 — hook (depends on Task 1)
3. Tasks 3–7 — tabs in any order (all depend on Task 2)
4. Task 8 — export tab + page rewrite (depends on Tasks 3–7)

## Key Design Decisions

- All chart wrappers use `<ResponsiveContainer width="100%" height={260}>` for consistency
- Tooltip `contentStyle` uses CSS variables: `backgroundColor: 'hsl(var(--card))'`, `border: '1px solid hsl(var(--border))'`, `borderRadius: '8px'`
- Greek locale labels throughout (Recharts `tick` labels, card titles, table headers)
- `formatPrice` from `@/lib/mock-data` for all currency formatting
- `date-fns/format` with `'dd/MM'` for chart date labels, `'EEEE'` for day names (import `el` locale from `date-fns/locale/el`)
- Empty states for every chart/table: centered `<div className="flex items-center justify-center h-full text-muted-foreground">` with a descriptive message
