import { getTables } from "@/lib/queries/tables";
import { getZones } from "@/lib/queries/zones";
import { TablesView } from "@/components/pos/tables-view";

export default async function TablesPage() {
  const [tables, zones] = await Promise.all([getTables(), getZones()]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Τραπέζια</h1>
        <p className="text-muted-foreground">
          {tables.filter((t) => t.status === "available").length} διαθέσιμα από{" "}
          {tables.length}
        </p>
      </div>
      <TablesView initialTables={tables} zones={zones} />
    </div>
  );
}
