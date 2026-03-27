# EatFlow POS — Sub-project 3: Advanced Analytics

**Date:** 2026-03-27
**Status:** Approved
**Scope:** UI-only demo with mock data (localStorage). Comprehensive analytics dashboard with 6 tabs.

## Overview

Replace the basic reports page with a full analytics suite: KPI dashboard, sales analysis, kitchen metrics, food cost analysis, product history with menu engineering, and export functionality. Uses Recharts for all visualizations.

## 1. Page Structure

Single page `/reports` with 6 tabs:

1. **Dashboard** (default) — KPI overview with charts
2. **Πωλήσεις** — Sales analysis with date ranges
3. **Κουζίνα** — Kitchen performance metrics
4. **Food Cost** — Food cost and margin analysis
5. **Ιστορικό Πιάτων** — Product-level analytics + menu engineering
6. **Export** — PDF/CSV export + VAT report

## 2. Tab 1: Dashboard

### KPI Cards (4 in a row)
- **Σημερινός Τζίρος** — sum of completed orders today, with % change vs yesterday
- **Παραγγελίες Σήμερα** — count of completed orders today
- **Μέσος Λογαριασμός** — average order total today
- **Food Cost %** — average food cost % from useRecipes

### Charts
- **Revenue 7 ημερών** (BarChart) — daily revenue for last 7 days
- **Πωλήσεις ανά ώρα** (AreaChart) — hourly revenue today (12:00-23:00)
- **Top 5 Πιάτα** (horizontal BarChart) — by quantity sold
- **Μετρητά vs Κάρτα** (PieChart) — payment method breakdown
- **Revenue per Seat** — metric card showing average revenue per seat per hour

## 3. Tab 2: Πωλήσεις (Sales)

### Controls
- Date range selector: Σήμερα | Εβδομάδα | Μήνας | Custom (date pickers)

### Content
- Revenue table: date, orders count, revenue, avg check — per day for selected range
- Period comparison: current vs previous period, % change highlighted (green up, red down)
- **Top sellers table**: product name, quantity, revenue, % of total — sorted by revenue
- **Worst sellers table**: bottom 5 by quantity
- **Peak hours heatmap**: 7×12 grid (days of week × hours), color intensity = revenue

## 4. Tab 3: Κουζίνα (Kitchen)

### Metrics Cards
- Μέσος χρόνος παρασκευής (overall average)
- Ακυρώσεις σήμερα (count)
- Throughput/ώρα (orders completed per hour)

### Content
- **Prep time per dish** (BarChart) — horizontal bars sorted by time
- **Station performance** — 4 cards (hot/cold/bar/dessert): orders processed, avg time, load %
- **Ακυρώσεις** — table: date, product, reason (if tracked)
- **Hourly throughput** (LineChart) — orders completed per hour today

## 5. Tab 4: Food Cost

Reuses `useRecipes()` hook heavily.

### Summary Cards
- Μέσο Food Cost % (with color)
- Συνολικό Κόστος Υλικών (€) per period
- Καλύτερο Margin πιάτο
- Χειρότερο Margin πιάτο

### Content
- **Margin analysis table**: all products sorted by margin. Columns: product, category, selling price, food cost, margin %, margin badge (green/amber/red)
- **Food cost by category** (BarChart) — average food cost % per category
- **Food cost vs Revenue** (scatter-like comparison) — showing which categories have best cost/revenue ratio

## 6. Tab 5: Ιστορικό Πιάτων (Product History)

### Product Table
Full table of all products with columns:
- Όνομα, Κατηγορία, Πωλήσεις (τμχ), Έσοδα (€), Food Cost (€), Margin %, Trend (↑↓→)
- Sortable by any column
- Filterable by category
- Search by name

### Product Detail View
Click a product row → expands or opens panel showing:
- **Πωλήσεις ανά ημέρα** (LineChart) — sales over time
- **Πωλήσεις ανά ώρα** (BarChart) — which hours it sells most
- **Μέση ποσότητα ανά παραγγελία** — average quantity per order
- **Combination analysis**: "Συχνά παραγγέλνεται μαζί με: [product1], [product2], [product3]" — find products that appear in the same orders
- **Revenue trend** — arrow indicator (increasing/stable/decreasing)

### Menu Engineering Matrix
BCG-style 2×2 matrix categorization:
- **Stars** ⭐ — High margin + High sales → "Κράτα τα, προώθησέ τα"
- **Cash Cows** 💰 — Low margin + High sales → "Αύξησε τιμή ή μείωσε κόστος"
- **Puzzles** 🧩 — High margin + Low sales → "Προώθησέ τα, βάλε τα πρώτα στο μενού"
- **Dogs** 🐕 — Low margin + Low sales → "Σκέψου αφαίρεση από το μενού"

Display as:
- 4 colored sections with product names in each
- Or a scatter chart with margin % on Y axis, sales quantity on X axis, quadrant lines at medians

## 7. Tab 6: Export

### Export Buttons
- **PDF Σύνοψη** — generates/downloads a summary PDF (mock: shows preview)
- **CSV Πωλήσεων** — orders data as CSV (mock: triggers download of generated CSV)
- **CSV Αποθήκης** — inventory data as CSV

### VAT Report
- Table grouped by VAT rate (13%, 24%)
- For each rate: net amount, VAT amount, gross amount
- Period selector

### Auto-send (Mock)
- Toggle "Αυτόματη αποστολή email"
- Email input field
- Frequency selector (Ημερήσια/Εβδομαδιαία/Μηνιαία)
- Status: "Mock — δεν αποστέλλεται πραγματικά"

## 8. Mock Data

### Historical Order Data
Generate 30 days of mock completed orders to populate charts:
- `initialMockHistory` — array of DailyStats objects with daily aggregates
- Each day: date, revenue, orderCount, avgCheck, cashPayments, cardPayments, hourlyBreakdown, productSales
- Realistic patterns: weekends busier, lunch/dinner peaks, seasonal variation

### Kitchen Timing Mock
- Mock prep times per product (realistic: salads 5min, grilled fish 15min, pasta 12min etc.)
- Mock cancellation history (few entries)

## 9. Hook

### `useAnalytics()`

Single hook that aggregates all analytics data:

```typescript
function useAnalytics() {
  // Sources: state.orders (completed), state.products, state.recipes, state.ingredients, mockHistory

  // Dashboard
  getTodayRevenue(): number
  getTodayOrderCount(): number
  getAverageCheck(): number
  getRevenueByDay(days: number): { date: string; revenue: number }[]
  getHourlyRevenue(date?: string): { hour: number; revenue: number }[]
  getTopProducts(limit: number): { product: Product; quantity: number; revenue: number }[]
  getPaymentBreakdown(): { cash: number; card: number }

  // Sales
  getSalesForPeriod(from: string, to: string): DailySalesRow[]
  getPeriodComparison(from: string, to: string): { current: number; previous: number; change: number }
  getWorstProducts(limit: number): same as getTopProducts but sorted ascending
  getPeakHoursHeatmap(): { day: number; hour: number; revenue: number }[]

  // Kitchen
  getAveragePrepTime(): number
  getPrepTimeByProduct(): { product: Product; avgTime: number }[]
  getStationPerformance(): Record<Station, { orders: number; avgTime: number }>
  getHourlyThroughput(): { hour: number; count: number }[]

  // Product History
  getProductHistory(productId: string): { date: string; quantity: number; revenue: number }[]
  getProductHourlyPattern(productId: string): { hour: number; quantity: number }[]
  getProductCombinations(productId: string, limit: number): { product: Product; count: number }[]
  getProductTrend(productId: string): 'up' | 'stable' | 'down'
  getMenuEngineering(): { stars: Product[]; cashCows: Product[]; puzzles: Product[]; dogs: Product[] }
}
```

## 10. File Structure

```
hooks/
  use-analytics.ts              NEW — All analytics calculations

lib/
  mock-history.ts               NEW — 30 days of generated mock data

components/pos/
  analytics-dashboard.tsx        NEW — KPI cards + charts (Tab 1)
  analytics-sales.tsx            NEW — Sales analysis (Tab 2)
  analytics-kitchen.tsx          NEW — Kitchen metrics (Tab 3)
  analytics-food-cost.tsx        NEW — Food cost analysis (Tab 4)
  analytics-product-history.tsx  NEW — Product history + menu engineering (Tab 5)
  analytics-export.tsx           NEW — Export functionality (Tab 6)

app/(pos)/
  reports/page.tsx               REWRITE — 6-tab analytics page
```

## 11. Dependencies

- Recharts (already installed) — BarChart, PieChart, AreaChart, LineChart, ScatterChart
- date-fns (already installed) — date manipulation for period calculations
