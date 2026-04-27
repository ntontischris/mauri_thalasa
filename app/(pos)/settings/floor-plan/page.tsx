import { LayoutGrid } from "lucide-react";
import { getAllFloors } from "@/lib/queries/floors";
import { getZones } from "@/lib/queries/zones";
import { getAllTables } from "@/lib/queries/tables";
import { getLayoutsByFloor } from "@/lib/queries/floor-layouts";
import { EditorShell } from "@/components/pos/floor-plan-editor/editor-shell";
import type { DbFloorLayout } from "@/lib/types/floor-layouts";

export const dynamic = "force-dynamic";

export default async function FloorPlanSettingsPage() {
  const [floors, zones, tables] = await Promise.all([
    getAllFloors(),
    getZones(),
    getAllTables(),
  ]);

  const activeFloors = floors.filter((f) => f.is_active);
  const activeTables = tables.filter((t) => t.is_active);

  const layoutsByFloor: Record<string, DbFloorLayout[]> = {};
  await Promise.all(
    activeFloors.map(async (f) => {
      layoutsByFloor[f.id] = await getLayoutsByFloor(f.id);
    }),
  );

  const initialFloorId = activeFloors[0]?.id ?? "";

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
      <EditorShell
        floors={activeFloors}
        zones={zones}
        tables={activeTables}
        layoutsByFloor={layoutsByFloor}
        initialFloorId={initialFloorId}
      />
    </div>
  );
}
