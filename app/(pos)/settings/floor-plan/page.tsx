import { LayoutGrid } from "lucide-react";
import { getAllFloors } from "@/lib/queries/floors";
import { getZones } from "@/lib/queries/zones";
import { getAllTables } from "@/lib/queries/tables";
import { FloorPlanEditor } from "@/components/pos/floor-plan-editor";

export const dynamic = "force-dynamic";

export default async function FloorPlanSettingsPage() {
  const [floors, zones, tables] = await Promise.all([
    getAllFloors(),
    getZones(),
    getAllTables(),
  ]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <LayoutGrid className="size-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Κάτοψη Εστιατορίου</h1>
          <p className="text-sm text-muted-foreground">
            Διαχειρίσου ορόφους, ζώνες και τραπέζια. Σύρε για επανατοποθέτηση.
          </p>
        </div>
      </div>
      <FloorPlanEditor
        initialFloors={floors.filter((f) => f.is_active)}
        initialZones={zones}
        initialTables={tables.filter((t) => t.is_active)}
      />
    </div>
  );
}
