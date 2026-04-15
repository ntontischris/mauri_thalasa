"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Euro,
  Receipt,
  TrendingUp,
  Banknote,
  CreditCard,
  BarChart3,
} from "lucide-react";

interface ReportsSummary {
  totalOrders: number;
  totalRevenue: number;
  totalVat: number;
  avgCheck: number;
  cashRevenue: number;
  cardRevenue: number;
  cashCount: number;
  cardCount: number;
}

interface TopProduct {
  name: string;
  quantity: number;
  revenue: number;
}

interface ReportsPanelProps {
  summary: ReportsSummary;
  topProducts: TopProduct[];
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat("el-GR", {
    style: "currency",
    currency: "EUR",
  }).format(price);
}

export function ReportsPanel({ summary, topProducts }: ReportsPanelProps) {
  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Έσοδα</p>
                <p className="text-2xl font-bold">
                  {formatPrice(summary.totalRevenue)}
                </p>
              </div>
              <Euro className="size-8 text-emerald-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Παραγγελίες</p>
                <p className="text-2xl font-bold">{summary.totalOrders}</p>
              </div>
              <Receipt className="size-8 text-blue-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  Μέσος Λογαριασμός
                </p>
                <p className="text-2xl font-bold">
                  {formatPrice(summary.avgCheck)}
                </p>
              </div>
              <TrendingUp className="size-8 text-amber-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">ΦΠΑ</p>
                <p className="text-2xl font-bold">
                  {formatPrice(summary.totalVat)}
                </p>
              </div>
              <BarChart3 className="size-8 text-purple-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Payment breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Τρόποι Πληρωμής</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between rounded-md border p-3">
              <div className="flex items-center gap-2">
                <Banknote className="size-5 text-emerald-500" />
                <div>
                  <p className="font-medium">Μετρητά</p>
                  <p className="text-xs text-muted-foreground">
                    {summary.cashCount} παραγγελίες
                  </p>
                </div>
              </div>
              <span className="text-lg font-bold">
                {formatPrice(summary.cashRevenue)}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-md border p-3">
              <div className="flex items-center gap-2">
                <CreditCard className="size-5 text-blue-500" />
                <div>
                  <p className="font-medium">Κάρτα</p>
                  <p className="text-xs text-muted-foreground">
                    {summary.cardCount} παραγγελίες
                  </p>
                </div>
              </div>
              <span className="text-lg font-bold">
                {formatPrice(summary.cardRevenue)}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Top products */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top Προϊόντα</CardTitle>
          </CardHeader>
          <CardContent>
            {topProducts.length === 0 ? (
              <p className="py-4 text-center text-muted-foreground">
                Δεν υπάρχουν δεδομένα
              </p>
            ) : (
              <div className="space-y-1">
                {topProducts.map((product, i) => (
                  <div
                    key={product.name}
                    className="flex items-center gap-2 rounded-md p-2 hover:bg-muted/50"
                  >
                    <span className="w-6 text-center text-sm font-bold text-muted-foreground">
                      {i + 1}
                    </span>
                    <span className="flex-1 text-sm font-medium truncate">
                      {product.name}
                    </span>
                    <Badge variant="outline" className="text-xs font-mono">
                      ×{product.quantity}
                    </Badge>
                    <span className="text-sm font-semibold">
                      {formatPrice(product.revenue)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
