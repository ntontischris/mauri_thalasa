import { LayoutGrid } from "lucide-react";
import Link from "next/link";
import { getTables } from "@/lib/queries/tables";
import { getZones } from "@/lib/queries/zones";
import { getFloors } from "@/lib/queries/floors";
import { getLiveTableData } from "@/lib/queries/tables-enriched";
import { TablesView } from "@/components/pos/tables-view";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function TablesPage() {
  const [tables, zones, floors, liveData] = await Promise.all([
    getTables(),
    getZones(),
    getFloors(),
    getLiveTableData(),
  ]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Τραπέζια</h1>
          <p className="text-sm text-muted-foreground">
            {tables.filter((t) => t.status === "available").length} διαθέσιμα
            από {tables.length} ·{" "}
            <span className="text-primary">{floors.length}</span> ορόφων
          </p>
        </div>
        <Link href="/settings/floor-plan">
          <Button variant="outline" size="sm">
            <LayoutGrid className="mr-2 size-4" /> Κάτοψη
          </Button>
        </Link>
      </div>
      <TablesView
        initialTables={tables}
        zones={zones}
        floors={floors}
        liveData={liveData}
      />
    </div>
  );
}
