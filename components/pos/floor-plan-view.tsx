"use client";

import { useState } from "react";
import { usePOS } from "@/lib/pos-context";
import { useTableLayout } from "@/hooks/use-table-layout";
import { TableShape } from "@/components/pos/table-shape";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FloorPlanViewProps {
  onTableClick: (tableId: string, tableNumber: number) => void;
}

const LEGEND_ITEMS = [
  { color: "bg-green-500", label: "Ελεύθερο" },
  { color: "bg-red-500", label: "Κατειλημμένο" },
  { color: "bg-amber-500", label: "Λογαριασμός" },
  { color: "bg-gray-400", label: "Βρώμικο" },
];

export function FloorPlanView({ onTableClick }: FloorPlanViewProps) {
  const { state, getActiveOrderForTable } = usePOS();
  const { zones } = useTableLayout();
  const [activeZone, setActiveZone] = useState<string | null>(null);

  const visibleTables = activeZone
    ? state.tables.filter((t) => t.zoneId === activeZone)
    : state.tables;

  return (
    <div className="flex flex-col gap-4">
      {/* Zone filter tabs */}
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant={activeZone === null ? "default" : "outline"}
          onClick={() => setActiveZone(null)}
        >
          Όλα ({state.tables.length})
        </Button>
        {zones
          .sort((a, b) => a.order - b.order)
          .map((zone) => {
            const count = state.tables.filter(
              (t) => t.zoneId === zone.id,
            ).length;
            const isActive = activeZone === zone.id;
            return (
              <Button
                key={zone.id}
                size="sm"
                variant="outline"
                onClick={() => setActiveZone(isActive ? null : zone.id)}
                style={
                  isActive
                    ? {
                        backgroundColor: zone.color,
                        borderColor: zone.color,
                        color: "#fff",
                      }
                    : {}
                }
                className={cn(!isActive && "hover:opacity-80")}
              >
                <span
                  className="mr-1.5 inline-block size-2 rounded-full"
                  style={{ backgroundColor: zone.color }}
                />
                {zone.name} ({count})
              </Button>
            );
          })}
      </div>

      {/* Canvas */}
      <div
        className="relative w-full rounded-xl border-2 border-dashed border-border bg-muted/30"
        style={{ paddingBottom: "60%" }}
      >
        <div className="absolute inset-0 p-4">
          {visibleTables.map((table) => {
            const order = getActiveOrderForTable(table.id);
            const zone = zones.find((z) => z.id === table.zoneId);
            return (
              <div
                key={table.id}
                className="absolute"
                style={{
                  left: `${table.x}%`,
                  top: `${table.y}%`,
                  transform: "translate(-50%, -50%)",
                }}
              >
                <TableShape
                  table={table}
                  order={order}
                  zoneColor={zone?.color}
                  onClick={() => onTableClick(table.id, table.number)}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-sm">
        {LEGEND_ITEMS.map(({ color, label }) => (
          <div key={label} className="flex items-center gap-2">
            <div className={cn("size-3 rounded-full", color)} />
            <span className="text-muted-foreground">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
