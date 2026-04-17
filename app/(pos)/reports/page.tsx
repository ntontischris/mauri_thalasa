import { BarChart3 } from "lucide-react";
import {
  getAnalyticsSummary,
  getDailyRevenue,
  getHourlyToday,
  getTopProducts,
  getStationStats,
  getReservationsStats,
} from "@/lib/queries/analytics";
import { ReportsTabs } from "@/components/pos/reports-tabs";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const [summary, daily, hourly, topProducts, stations, reservations] =
    await Promise.all([
      getAnalyticsSummary(),
      getDailyRevenue(30),
      getHourlyToday(),
      getTopProducts(20),
      getStationStats(),
      getReservationsStats(),
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
        stations={stations}
        reservations={reservations}
      />
    </div>
  );
}
