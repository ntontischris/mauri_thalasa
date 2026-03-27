"use client";

import { useRef } from "react";
import { DndContext, useDraggable } from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { useTableLayout } from "@/hooks/use-table-layout";
import { ZoneManager } from "@/components/pos/zone-manager";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import type { Table } from "@/lib/types";

const clamp = (min: number, max: number, value: number): number =>
  Math.min(max, Math.max(min, value));

interface DraggableTableProps {
  table: Table;
  zoneColor?: string;
  onDelete: (id: string) => void;
}

function DraggableTable({ table, zoneColor, onDelete }: DraggableTableProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: table.id });

  const style = {
    left: `${table.x}%`,
    top: `${table.y}%`,
    transform: CSS.Translate.toString(transform),
    zIndex: isDragging ? 50 : 1,
  };

  return (
    <div
      className="absolute group"
      style={{
        ...style,
        transform: `${style.transform ?? ""} translate(-50%, -50%)`,
      }}
    >
      {/* Delete button */}
      <button
        type="button"
        onClick={() => onDelete(table.id)}
        className="absolute -top-2 -right-2 z-10 flex size-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
      >
        <Trash2 className="size-3" />
      </button>

      {/* Table circle */}
      <div
        ref={setNodeRef}
        {...listeners}
        {...attributes}
        className="flex size-14 cursor-grab flex-col items-center justify-center rounded-full border-2 border-white/30 shadow-md select-none active:cursor-grabbing"
        style={{ backgroundColor: zoneColor ?? "#6b7280" }}
      >
        <span className="text-xs font-bold text-white leading-none">
          T{table.number}
        </span>
        <span className="text-[10px] text-white/80 leading-none mt-0.5">
          {table.capacity}θ
        </span>
      </div>
    </div>
  );
}

export function FloorPlanEditor() {
  const { zones, tables, addTable, moveTable, deleteTable } = useTableLayout();
  const canvasRef = useRef<HTMLDivElement>(null);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, delta } = event;
    if (!canvasRef.current) return;

    const tableId = active.id as string;
    const table = tables.find((t) => t.id === tableId);
    if (!table) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const deltaXPercent = (delta.x / rect.width) * 100;
    const deltaYPercent = (delta.y / rect.height) * 100;

    const newX = clamp(5, 95, table.x + deltaXPercent);
    const newY = clamp(5, 95, table.y + deltaYPercent);

    moveTable(tableId, newX, newY);
  };

  return (
    <div className="space-y-5">
      <ZoneManager />

      {/* Add table buttons */}
      {zones.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-sm font-medium text-foreground">
            Πρόσθεσε τραπέζι:
          </p>
          <div className="flex flex-wrap gap-2">
            {zones
              .sort((a, b) => a.order - b.order)
              .map((zone) => (
                <Button
                  key={zone.id}
                  size="sm"
                  variant="outline"
                  onClick={() => addTable(zone.id, "round")}
                  className="gap-1.5"
                >
                  <span
                    className="size-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: zone.color }}
                  />
                  {zone.name}
                </Button>
              ))}
          </div>
        </div>
      )}

      {/* DnD Canvas */}
      <DndContext onDragEnd={handleDragEnd}>
        <div
          ref={canvasRef}
          className="relative w-full rounded-xl border-2 border-dashed border-border bg-muted/30"
          style={{ paddingBottom: "60%" }}
        >
          <div className="absolute inset-0">
            {tables.map((table) => {
              const zone = zones.find((z) => z.id === table.zoneId);
              return (
                <DraggableTable
                  key={table.id}
                  table={table}
                  zoneColor={zone?.color}
                  onDelete={deleteTable}
                />
              );
            })}

            {tables.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center">
                <p className="text-sm text-muted-foreground">
                  Δεν υπάρχουν τραπέζια. Προσθέστε χρησιμοποιώντας τα κουμπιά
                  παραπάνω.
                </p>
              </div>
            )}
          </div>
        </div>
      </DndContext>

      <p className="text-xs text-muted-foreground">
        Σύρετε τα τραπέζια για να τα τοποθετήσετε. Κάντε hover για να εμφανιστεί
        το κουμπί διαγραφής.
      </p>
    </div>
  );
}
