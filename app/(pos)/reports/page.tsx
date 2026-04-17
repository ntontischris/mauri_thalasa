import { BarChart3 } from "lucide-react";
import {
  getAnalyticsSummary,
  getDailyRevenue,
  getHourlyToday,
  getTopProducts,
  getBottomProducts,
  getStationStats,
  getReservationsStats,
  getHeatmap,
} from "@/lib/queries/analytics";
import { ReportsTabs } from "@/components/pos/reports-tabs";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const [
    summary,
    daily,
    hourly,
    topProducts,
    bottomProducts,
    stations,
    reservations,
    heatmap,
  ] = await Promise.all([
    getAnalyticsSummary(),
    getDailyRevenue(30),
    getHourlyToday(),
    getTopProducts(20),
    getBottomProducts(5),
    getStationStats(),
    getReservationsStats(),
    getHeatmap(30),
  ]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <BarChart3 className="size-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Αναφορές & Analytics</h1>
          <p className="text-sm text-muted-foreground">
            Αναλυτικά στατιστικά εστιατορίου
          </p>
        </div>
      </div>

      <ReportsTabs
        summary={summary}
        daily={daily}
        hourly={hourly}
        topProducts={topProducts}
        bottomProducts={bottomProducts}
        stations={stations}
        reservations={reservations}
        heatmap={heatmap}
      />
    </div>
  );
}
