"use client";

import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from "recharts";
import {
  Percent,
  Package,
  TrendingUp,
  TrendingDown,
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
import { useAnalytics } from "@/hooks/use-analytics";
import { formatPrice } from "@/lib/mock-data";

// ─── Types ───────────────────────────────────────────────────────────────────

type SortColumn =
  | "productName"
  | "category"
  | "price"
  | "foodCost"
  | "marginPercent";
type SortDir = "asc" | "desc";

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

function getFoodCostColor(pct: number): string {
  if (pct < 30) return "text-green-500";
  if (pct <= 40) return "text-amber-500";
  return "text-red-500";
}

function getFoodCostBarColor(pct: number): string {
  if (pct <= 30) return "hsl(var(--chart-2))";
  return "hsl(var(--destructive))";
}

// ─── Summary Card ────────────────────────────────────────────────────────────

interface SummaryCardProps {
  title: string;
  value: string;
  subtext?: string;
  subtextColor?: string;
  icon: React.ReactNode;
}

function SummaryCard({
  title,
  value,
  subtext,
  subtextColor = "text-muted-foreground",
  icon,
}: SummaryCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className="text-muted-foreground">{icon}</div>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">{value}</p>
        {subtext && <p className={`text-xs mt-1 ${subtextColor}`}>{subtext}</p>}
      </CardContent>
    </Card>
  );
}

// ─── Margin Table ────────────────────────────────────────────────────────────

interface MarginTableProps {
  data: {
    productId: string;
    productName: string;
    category: string;
    price: number;
    foodCost: number;
    marginPercent: number;
  }[];
  sortBy: SortColumn;
  sortDir: SortDir;
  onSort: (column: SortColumn) => void;
}

function SortIcon({
  column,
  sortBy,
  sortDir,
}: {
  column: SortColumn;
  sortBy: SortColumn;
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

function MarginTable({ data, sortBy, sortDir, onSort }: MarginTableProps) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ανάλυση Margin</CardTitle>
          <CardDescription>Κόστος και περιθώρια ανά πιάτο</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
            Δεν υπάρχουν συνταγές. Προσθέστε συνταγές από την ενότητα
            Συνταγολόγιο.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Ανάλυση Margin</CardTitle>
        <CardDescription>
          Κόστος και περιθώρια ανά πιάτο ({data.length} συνταγές)
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead
                className="cursor-pointer select-none"
                onClick={() => onSort("productName")}
              >
                Πιάτο
                <SortIcon
                  column="productName"
                  sortBy={sortBy}
                  sortDir={sortDir}
                />
              </TableHead>
              <TableHead
                className="cursor-pointer select-none"
                onClick={() => onSort("category")}
              >
                Κατηγορία
                <SortIcon column="category" sortBy={sortBy} sortDir={sortDir} />
              </TableHead>
              <TableHead
                className="cursor-pointer select-none text-right"
                onClick={() => onSort("price")}
              >
                Τιμή
                <SortIcon column="price" sortBy={sortBy} sortDir={sortDir} />
              </TableHead>
              <TableHead
                className="cursor-pointer select-none text-right"
                onClick={() => onSort("foodCost")}
              >
                Κόστος
                <SortIcon column="foodCost" sortBy={sortBy} sortDir={sortDir} />
              </TableHead>
              <TableHead
                className="cursor-pointer select-none text-right"
                onClick={() => onSort("marginPercent")}
              >
                Margin %
                <SortIcon
                  column="marginPercent"
                  sortBy={sortBy}
                  sortDir={sortDir}
                />
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((entry) => (
              <TableRow key={entry.productId}>
                <TableCell className="font-medium">
                  {entry.productName}
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className="text-xs">
                    {entry.category}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  {formatPrice(entry.price)}
                </TableCell>
                <TableCell className="text-right">
                  {formatPrice(entry.foodCost)}
                </TableCell>
                <TableCell className="text-right">
                  {getMarginBadge(entry.marginPercent)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// ─── Food Cost by Category Chart ─────────────────────────────────────────────

function FoodCostByCategoryChart({
  data,
}: {
  data: { category: string; avgFoodCostPercent: number }[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Food Cost ανά Κατηγορία</CardTitle>
        <CardDescription>
          Μέσο ποσοστό κόστους υλικών — κόκκινη γραμμή: στόχος 30%
        </CardDescription>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="flex items-center justify-center h-[260px] text-muted-foreground text-sm">
            Δεν υπάρχουν δεδομένα
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart
              data={data}
              margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(var(--border))"
              />
              <XAxis
                dataKey="category"
                tick={{ fontSize: 11 }}
                stroke="hsl(var(--muted-foreground))"
              />
              <YAxis
                tickFormatter={(v) => `${v}%`}
                tick={{ fontSize: 11 }}
                stroke="hsl(var(--muted-foreground))"
              />
              <Tooltip
                {...tooltipStyle}
                formatter={(value: number) => [
                  `${value.toFixed(1)}%`,
                  "Food Cost",
                ]}
              />
              <ReferenceLine
                y={30}
                stroke="hsl(var(--destructive))"
                strokeDasharray="4 4"
                label={{
                  value: "Στόχος 30%",
                  position: "right",
                  fill: "hsl(var(--destructive))",
                  fontSize: 11,
                }}
              />
              <Bar dataKey="avgFoodCostPercent" radius={[4, 4, 0, 0]}>
                {data.map((entry) => (
                  <Cell
                    key={entry.category}
                    fill={getFoodCostBarColor(entry.avgFoodCostPercent)}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function AnalyticsFoodCost() {
  const { getFoodCostSummary, getMarginTable, getFoodCostByCategory } =
    useAnalytics();

  const [sortBy, setSortBy] = useState<SortColumn>("marginPercent");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const foodCostSummary = getFoodCostSummary();
  const marginTable = getMarginTable();
  const foodCostByCategory = getFoodCostByCategory();

  // Sort the margin table
  const sortedMarginTable = [...marginTable].sort((a, b) => {
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

  const handleSort = (column: SortColumn) => {
    if (sortBy === column) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(column);
      setSortDir("desc");
    }
  };

  // Find best/worst margin values
  const bestMarginEntry =
    marginTable.length > 0
      ? marginTable.reduce((best, e) =>
          e.marginPercent > best.marginPercent ? e : best,
        )
      : null;
  const worstMarginEntry =
    marginTable.length > 0
      ? marginTable.reduce((worst, e) =>
          e.marginPercent < worst.marginPercent ? e : worst,
        )
      : null;

  const avgFoodCostPct = foodCostSummary.avgFoodCostPercent;
  const foodCostColorClass = getFoodCostColor(avgFoodCostPct);

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          title="Μέσο Food Cost %"
          value={`${avgFoodCostPct.toFixed(1)}%`}
          subtext={
            avgFoodCostPct < 30
              ? "Εξαιρετικό"
              : avgFoodCostPct <= 40
                ? "Αποδεκτό"
                : "Υψηλό — έλεγχος απαιτείται"
          }
          subtextColor={foodCostColorClass}
          icon={<Percent className="h-4 w-4" />}
        />
        <SummaryCard
          title="Πιάτα με Συνταγή"
          value={String(marginTable.length)}
          subtext="Καταχωρημένες συνταγές"
          icon={<Package className="h-4 w-4" />}
        />
        <SummaryCard
          title="Καλύτερο Margin"
          value={foodCostSummary.bestMarginProduct}
          subtext={
            bestMarginEntry
              ? `${bestMarginEntry.marginPercent.toFixed(1)}% margin`
              : "—"
          }
          subtextColor="text-green-500"
          icon={<TrendingUp className="h-4 w-4" />}
        />
        <SummaryCard
          title="Χειρότερο Margin"
          value={foodCostSummary.worstMarginProduct}
          subtext={
            worstMarginEntry
              ? `${worstMarginEntry.marginPercent.toFixed(1)}% margin`
              : "—"
          }
          subtextColor="text-red-500"
          icon={<TrendingDown className="h-4 w-4" />}
        />
      </div>

      {/* Margin table + Category chart */}
      <div className="grid gap-6 lg:grid-cols-2">
        <MarginTable
          data={sortedMarginTable}
          sortBy={sortBy}
          sortDir={sortDir}
          onSort={handleSort}
        />
        <FoodCostByCategoryChart data={foodCostByCategory} />
      </div>
    </div>
  );
}
