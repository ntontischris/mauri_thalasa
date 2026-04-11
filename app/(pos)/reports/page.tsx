"use client";

import { useState } from "react";
import { BarChart3 } from "lucide-react";
import AnalyticsDashboard from "@/components/pos/analytics-dashboard";
import AnalyticsSales from "@/components/pos/analytics-sales";
import AnalyticsKitchen from "@/components/pos/analytics-kitchen";
import AnalyticsFoodCost from "@/components/pos/analytics-food-cost";
import AnalyticsProductHistory from "@/components/pos/analytics-product-history";
import AnalyticsExport from "@/components/pos/analytics-export";
import AnalyticsReservations from "@/components/pos/analytics-reservations";

type Tab =
  | "dashboard"
  | "sales"
  | "kitchen"
  | "foodcost"
  | "products"
  | "reservations"
  | "export";

const TABS: { id: Tab; label: string }[] = [
  { id: "dashboard", label: "Dashboard" },
  { id: "sales", label: "Πωλήσεις" },
  { id: "kitchen", label: "Κουζίνα" },
  { id: "foodcost", label: "Food Cost" },
  { id: "products", label: "Ιστορικό Πιάτων" },
  { id: "reservations", label: "Κρατήσεις" },
  { id: "export", label: "Export" },
];

export default function ReportsPage() {
  const [selectedTab, setSelectedTab] = useState<Tab>("dashboard");

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <BarChart3 className="size-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Αναφορές & Analytics
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Αναλυτικά στατιστικά εστιατορίου
          </p>
        </div>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1 rounded-lg border bg-muted/40 p-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSelectedTab(tab.id)}
            className={[
              "flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              selectedTab === tab.id
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            ].join(" ")}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div>
        {selectedTab === "dashboard" && <AnalyticsDashboard />}
        {selectedTab === "sales" && <AnalyticsSales />}
        {selectedTab === "kitchen" && <AnalyticsKitchen />}
        {selectedTab === "foodcost" && <AnalyticsFoodCost />}
        {selectedTab === "products" && <AnalyticsProductHistory />}
        {selectedTab === "reservations" && <AnalyticsReservations />}
        {selectedTab === "export" && <AnalyticsExport />}
      </div>
    </div>
  );
}
