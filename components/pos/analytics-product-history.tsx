"use client";

import { useState, useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  ScatterChart,
  Scatter,
  ReferenceLine,
  ZAxis,
} from "recharts";
import { format, parseISO } from "date-fns";
import { el } from "date-fns/locale";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Search,
  X,
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAnalytics } from "@/hooks/use-analytics";
import { formatPrice } from "@/lib/mock-data";

// ─── Types ───────────────────────────────────────────────────────────────────

type ProductSortColumn =
  | "productName"
  | "category"
  | "quantity"
  | "revenue"
  | "foodCost"
  | "marginPercent";
type SortDir = "asc" | "desc";
type MatrixView = "grid" | "scatter";

// ─── Tooltip style ───────────────────────────────────────────────────────────

const tooltipStyle = {
  contentStyle: {
    backgroundColor: "hsl(var(--card))",
    border: "1px solid hsl(var(--border))",
    borderRadius: "8px",
    color: "hsl(var(--foreground))",
  },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getMarginBadge(marginPercent: number) {
  if (marginPercent > 60) {
    return (
      <span className="inline-flex items-center rounded-md bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-400">
        {marginPercent.toFixed(1)}%
      </span>
    );
  }
  if (marginPercent >= 40) {
    return (
      <span className="inline-flex items-center rounded-md bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
        {marginPercent.toFixed(1)}%
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-md bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800 dark:bg-red-900/30 dark:text-red-400">
      {marginPercent.toFixed(1)}%
    </span>
  );
}

function TrendIcon({ trend }: { trend: "up" | "stable" | "down" }) {
  if (trend === "up") return <TrendingUp className="h-4 w-4 text-green-500" />;
  if (trend === "down")
    return <TrendingDown className="h-4 w-4 text-red-500" />;
  return <Minus className="h-4 w-4 text-muted-foreground" />;
}

function SortIcon({
  column,
  sortBy,
  sortDir,
}: {
  column: ProductSortColumn;
  sortBy: ProductSortColumn;
  sortDir: SortDir;
}) {
  if (sortBy !== column)
    return <ArrowUpDown className="inline h-3 w-3 ml-1 opacity-40" />;
  return sortDir === "asc" ? (
    <ChevronUp className="inline h-3 w-3 ml-1" />
  ) : (
    <ChevronDown className="inline h-3 w-3 ml-1" />
  );
}

function computeMedian(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

// ─── Product Detail Panel ────────────────────────────────────────────────────

interface ProductDetailProps {
  productId: string;
  productName: string;
  trend: "up" | "stable" | "down";
  onClose: () => void;
}

function ProductDetail({
  productId,
  productName,
  trend,
  onClose,
}: ProductDetailProps) {
  const { getProductHistory, getProductHourlyPattern, getProductCombinations } =
    useAnalytics();

  const history = getProductHistory(productId);
  const hourlyPattern = getProductHourlyPattern(productId);
  const combinations = getProductCombinations(productId, 3);

  const avgQuantity =
    history.length > 0
      ? Math.round(
          (history.reduce((sum, h) => sum + h.quantity, 0) / history.length) *
            10,
        ) / 10
      : 0;

  const formattedHistory = history.map((h) => ({
    ...h,
    label: format(parseISO(h.date), "d MMM", { locale: el }),
  }));

  const formattedHourly = hourlyPattern.map((h) => ({
    ...h,
    label: `${String(h.hour).padStart(2, "0")}:00`,
  }));

  const trendLabel =
    trend === "up" ? "Ανοδική" : trend === "down" ? "Πτωτική" : "Σταθερή";

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base">{productName}</CardTitle>
          <CardDescription>Αναλυτικό ιστορικό πωλήσεων</CardDescription>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Charts */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Sales per day */}
          <div>
            <h4 className="text-sm font-medium mb-3">Πωλήσεις ανά Ημέρα</h4>
            {formattedHistory.length === 0 ? (
              <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">
                Δεν υπάρχουν δεδομένα
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart
                  data={formattedHistory}
                  margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="hsl(var(--border))"
                  />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 10 }}
                    stroke="hsl(var(--muted-foreground))"
                  />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    stroke="hsl(var(--muted-foreground))"
                  />
                  <Tooltip
                    {...tooltipStyle}
                    formatter={(value: number) => [value, "Τεμάχια"]}
                  />
                  <Line
                    type="monotone"
                    dataKey="quantity"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ r: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Sales per hour */}
          <div>
            <h4 className="text-sm font-medium mb-3">Πωλήσεις ανά Ώρα</h4>
            {formattedHourly.length === 0 ? (
              <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">
                Δεν υπάρχουν δεδομένα
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart
                  data={formattedHourly}
                  margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="hsl(var(--border))"
                  />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 10 }}
                    stroke="hsl(var(--muted-foreground))"
                  />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    stroke="hsl(var(--muted-foreground))"
                  />
                  <Tooltip
                    {...tooltipStyle}
                    formatter={(value: number) => [value, "Τεμάχια"]}
                  />
                  <Bar
                    dataKey="quantity"
                    fill="hsl(var(--chart-2))"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Stats row */}
        <div className="flex flex-wrap gap-6">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              Μέση Ποσότητα/Ημέρα:
            </span>
            <span className="font-semibold">{avgQuantity} τμχ</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Τάση:</span>
            <span className="flex items-center gap-1 font-semibold">
              <TrendIcon trend={trend} />
              {trendLabel}
            </span>
          </div>
        </div>

        {/* Combinations */}
        {combinations.length > 0 && (
          <div>
            <p className="text-sm text-muted-foreground mb-2">
              Συχνά παραγγέλνεται μαζί με:
            </p>
            <div className="flex flex-wrap gap-2">
              {combinations.map((combo) => (
                <Badge
                  key={combo.productId}
                  variant="secondary"
                  className="text-xs"
                >
                  {combo.productName} ({combo.count}x)
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Menu Engineering Matrix ─────────────────────────────────────────────────

interface MenuEngineeringProps {
  stars: string[];
  cashCows: string[];
  puzzles: string[];
  dogs: string[];
  allStats: {
    productName: string;
    quantity: number;
    marginPercent: number;
  }[];
}

function MenuEngineeringMatrix({
  stars,
  cashCows,
  puzzles,
  dogs,
  allStats,
}: MenuEngineeringProps) {
  const [view, setView] = useState<MatrixView>("grid");

  const isEmpty =
    stars.length === 0 &&
    cashCows.length === 0 &&
    puzzles.length === 0 &&
    dogs.length === 0;

  if (isEmpty) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Menu Engineering</CardTitle>
          <CardDescription>
            Κατηγοριοποίηση πιάτων βάσει πωλήσεων και margin
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
            Δεν υπάρχουν δεδομένα
          </div>
        </CardContent>
      </Card>
    );
  }

  const medianQuantity = computeMedian(allStats.map((p) => p.quantity));
  const medianMargin = computeMedian(allStats.map((p) => p.marginPercent));

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base">Menu Engineering</CardTitle>
          <CardDescription>
            Κατηγοριοποίηση πιάτων βάσει πωλήσεων και margin
          </CardDescription>
        </div>
        <div className="flex gap-1">
          <Button
            variant={view === "grid" ? "default" : "outline"}
            size="sm"
            onClick={() => setView("grid")}
          >
            Πίνακας
          </Button>
          <Button
            variant={view === "scatter" ? "default" : "outline"}
            size="sm"
            onClick={() => setView("scatter")}
          >
            Scatter
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {view === "grid" ? (
          <div className="grid grid-cols-2 gap-4">
            {/* Stars — Top-right: High margin, High sales */}
            <QuadrantCard
              title="Stars"
              emoji="⭐"
              description="Κράτα τα, προώθησέ τα"
              subtitle="Υψηλό margin + Υψηλές πωλήσεις"
              items={stars}
              bgClass="bg-green-50 dark:bg-green-950/30"
              borderClass="border-green-200 dark:border-green-800"
            />
            {/* Puzzles — Top-left: High margin, Low sales */}
            <QuadrantCard
              title="Puzzles"
              emoji="🧩"
              description="Προώθησέ τα"
              subtitle="Υψηλό margin + Χαμηλές πωλήσεις"
              items={puzzles}
              bgClass="bg-blue-50 dark:bg-blue-950/30"
              borderClass="border-blue-200 dark:border-blue-800"
            />
            {/* Cash Cows — Bottom-right: Low margin, High sales */}
            <QuadrantCard
              title="Cash Cows"
              emoji="💰"
              description="Αύξησε τιμή"
              subtitle="Χαμηλό margin + Υψηλές πωλήσεις"
              items={cashCows}
              bgClass="bg-amber-50 dark:bg-amber-950/30"
              borderClass="border-amber-200 dark:border-amber-800"
            />
            {/* Dogs — Bottom-left: Low margin, Low sales */}
            <QuadrantCard
              title="Dogs"
              emoji="🐕"
              description="Εξέτασε αφαίρεση"
              subtitle="Χαμηλό margin + Χαμηλές πωλήσεις"
              items={dogs}
              bgClass="bg-red-50 dark:bg-red-950/30"
              borderClass="border-red-200 dark:border-red-800"
            />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={360}>
            <ScatterChart margin={{ top: 16, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(var(--border))"
              />
              <XAxis
                type="number"
                dataKey="quantity"
                name="Πωλήσεις"
                tick={{ fontSize: 11 }}
                stroke="hsl(var(--muted-foreground))"
                label={{
                  value: "Πωλήσεις (τμχ)",
                  position: "insideBottom",
                  offset: -5,
                  fontSize: 12,
                }}
              />
              <YAxis
                type="number"
                dataKey="marginPercent"
                name="Margin %"
                tick={{ fontSize: 11 }}
                stroke="hsl(var(--muted-foreground))"
                tickFormatter={(v) => `${v}%`}
                label={{
                  value: "Margin %",
                  angle: -90,
                  position: "insideLeft",
                  fontSize: 12,
                }}
              />
              <ZAxis range={[60, 60]} />
              <ReferenceLine
                x={medianQuantity}
                stroke="hsl(var(--muted-foreground))"
                strokeDasharray="4 4"
                strokeOpacity={0.5}
              />
              <ReferenceLine
                y={medianMargin}
                stroke="hsl(var(--muted-foreground))"
                strokeDasharray="4 4"
                strokeOpacity={0.5}
              />
              <Tooltip
                {...tooltipStyle}
                formatter={(value: number, name: string) => [
                  name === "Margin %" ? `${value.toFixed(1)}%` : value,
                  name,
                ]}
                labelFormatter={(
                  _: unknown,
                  payload: Array<{ payload?: { productName?: string } }>,
                ) => {
                  if (payload.length > 0 && payload[0].payload) {
                    return payload[0].payload.productName ?? "";
                  }
                  return "";
                }}
              />
              <Scatter
                data={allStats}
                fill="hsl(var(--primary))"
                shape="circle"
              />
            </ScatterChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Quadrant Card ───────────────────────────────────────────────────────────

interface QuadrantCardProps {
  title: string;
  emoji: string;
  description: string;
  subtitle: string;
  items: string[];
  bgClass: string;
  borderClass: string;
}

function QuadrantCard({
  title,
  emoji,
  description,
  subtitle,
  items,
  bgClass,
  borderClass,
}: QuadrantCardProps) {
  return (
    <div className={`rounded-lg border p-4 ${bgClass} ${borderClass}`}>
      <h4 className="font-semibold text-sm mb-1">
        {emoji} {title} — {description}
      </h4>
      <p className="text-xs text-muted-foreground mb-3">{subtitle}</p>
      <div className="flex flex-wrap gap-1.5">
        {items.length === 0 ? (
          <span className="text-xs text-muted-foreground">Κανένα πιάτο</span>
        ) : (
          items.map((name) => (
            <Badge key={name} variant="secondary" className="text-xs">
              {name}
            </Badge>
          ))
        )}
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function AnalyticsProductHistory() {
  const { getAllProductStats, getMenuEngineering } = useAnalytics();

  const [selectedProductId, setSelectedProductId] = useState<string | null>(
    null,
  );
  const [sortBy, setSortBy] = useState<ProductSortColumn>("revenue");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const allStats = getAllProductStats();
  const menuEngineering = getMenuEngineering();

  // Unique categories
  const categories = useMemo(() => {
    const cats = new Set<string>();
    for (const stat of allStats) {
      if (stat.category !== "—") cats.add(stat.category);
    }
    return [...cats].sort();
  }, [allStats]);

  // Filter + sort
  const filteredStats = useMemo(() => {
    let result = [...allStats];

    if (filterCategory) {
      result = result.filter((s) => s.category === filterCategory);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((s) => s.productName.toLowerCase().includes(q));
    }

    result.sort((a, b) => {
      const aVal = a[sortBy];
      const bVal = b[sortBy];
      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortDir === "asc"
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }
      const aNum = aVal as number;
      const bNum = bVal as number;
      return sortDir === "asc" ? aNum - bNum : bNum - aNum;
    });

    return result;
  }, [allStats, filterCategory, searchQuery, sortBy, sortDir]);

  const handleSort = (column: ProductSortColumn) => {
    if (sortBy === column) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(column);
      setSortDir("desc");
    }
  };

  const handleRowClick = (productId: string) => {
    setSelectedProductId((prev) => (prev === productId ? null : productId));
  };

  const selectedProduct = selectedProductId
    ? allStats.find((s) => s.productId === selectedProductId)
    : null;

  return (
    <div className="space-y-6">
      {/* Section A: Table controls */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ιστορικό Πιάτων</CardTitle>
          <CardDescription>
            Συνολικά στατιστικά 30 ημερών — κλικ σε γραμμή για λεπτομέρειες
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Controls row */}
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Αναζήτηση πιάτου..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              <Button
                variant={filterCategory === null ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterCategory(null)}
              >
                Όλα
              </Button>
              {categories.map((cat) => (
                <Button
                  key={cat}
                  variant={filterCategory === cat ? "default" : "outline"}
                  size="sm"
                  onClick={() =>
                    setFilterCategory((prev) => (prev === cat ? null : cat))
                  }
                >
                  {cat}
                </Button>
              ))}
            </div>
          </div>

          {/* Product table */}
          {filteredStats.length === 0 ? (
            <div className="flex items-center justify-center h-24 text-muted-foreground text-sm">
              Δεν βρέθηκαν αποτελέσματα
            </div>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead
                      className="cursor-pointer select-none"
                      onClick={() => handleSort("productName")}
                    >
                      Όνομα
                      <SortIcon
                        column="productName"
                        sortBy={sortBy}
                        sortDir={sortDir}
                      />
                    </TableHead>
                    <TableHead
                      className="cursor-pointer select-none"
                      onClick={() => handleSort("category")}
                    >
                      Κατηγορία
                      <SortIcon
                        column="category"
                        sortBy={sortBy}
                        sortDir={sortDir}
                      />
                    </TableHead>
                    <TableHead
                      className="cursor-pointer select-none text-right"
                      onClick={() => handleSort("quantity")}
                    >
                      Πωλήσεις τμχ
                      <SortIcon
                        column="quantity"
                        sortBy={sortBy}
                        sortDir={sortDir}
                      />
                    </TableHead>
                    <TableHead
                      className="cursor-pointer select-none text-right"
                      onClick={() => handleSort("revenue")}
                    >
                      Έσοδα
                      <SortIcon
                        column="revenue"
                        sortBy={sortBy}
                        sortDir={sortDir}
                      />
                    </TableHead>
                    <TableHead
                      className="cursor-pointer select-none text-right"
                      onClick={() => handleSort("foodCost")}
                    >
                      Food Cost
                      <SortIcon
                        column="foodCost"
                        sortBy={sortBy}
                        sortDir={sortDir}
                      />
                    </TableHead>
                    <TableHead
                      className="cursor-pointer select-none text-right"
                      onClick={() => handleSort("marginPercent")}
                    >
                      Margin %
                      <SortIcon
                        column="marginPercent"
                        sortBy={sortBy}
                        sortDir={sortDir}
                      />
                    </TableHead>
                    <TableHead className="text-center">Trend</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStats.map((stat) => (
                    <TableRow
                      key={stat.productId}
                      className={`cursor-pointer ${
                        selectedProductId === stat.productId ? "bg-muted" : ""
                      }`}
                      onClick={() => handleRowClick(stat.productId)}
                    >
                      <TableCell className="font-medium">
                        {stat.productName}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">
                          {stat.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {stat.quantity}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatPrice(stat.revenue)}
                      </TableCell>
                      <TableCell className="text-right">
                        {stat.foodCost > 0 ? formatPrice(stat.foodCost) : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        {stat.marginPercent > 0
                          ? getMarginBadge(stat.marginPercent)
                          : "—"}
                      </TableCell>
                      <TableCell className="text-center">
                        <TrendIcon trend={stat.trend} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section B: Product detail */}
      {selectedProduct && (
        <ProductDetail
          productId={selectedProduct.productId}
          productName={selectedProduct.productName}
          trend={selectedProduct.trend}
          onClose={() => setSelectedProductId(null)}
        />
      )}

      {/* Section C: Menu Engineering */}
      <MenuEngineeringMatrix
        stars={menuEngineering.stars}
        cashCows={menuEngineering.cashCows}
        puzzles={menuEngineering.puzzles}
        dogs={menuEngineering.dogs}
        allStats={allStats.map((s) => ({
          productName: s.productName,
          quantity: s.quantity,
          marginPercent: s.marginPercent,
        }))}
      />
    </div>
  );
}
