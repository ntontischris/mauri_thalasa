"use client";

import { useState } from "react";
import type { DbZone, DbTable } from "@/lib/types/database";
import { upsertZone } from "@/lib/actions/floor-plan";
import { cascadeDeleteZone } from "@/lib/actions/zones-bulk";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Props = {
  zones: DbZone[];
  tables: DbTable[];
  floorId: string;
  onTableDroppedOnZone: (tableId: string, zoneId: string) => void;
};

export function ZonesPanel({
  zones,
  tables,
  floorId,
  onTableDroppedOnZone,
}: Props) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState("#3b82f6");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [moveTo, setMoveTo] = useState<string>("");

  function handleZoneDrop(e: React.DragEvent, zoneId: string) {
    e.preventDefault();
    const tid = e.dataTransfer.getData("application/x-mauri-table-id");
    if (tid) onTableDroppedOnZone(tid, zoneId);
  }

  return (
    <div className="p-3 flex flex-col gap-2">
      <h3 className="text-sm font-semibold">Ζώνες</h3>

      {zones.map((z) => {
        const count = tables.filter((t) => t.zone_id === z.id).length;
        return (
          <div
            key={z.id}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => handleZoneDrop(e, z.id)}
            className="flex items-center gap-2 rounded border p-2 hover:bg-accent"
          >
            <div
              className="h-4 w-4 rounded"
              style={{ backgroundColor: z.color }}
            />
            <span className="flex-1 text-sm">{z.name}</span>
            <span className="text-xs text-muted-foreground">{count}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setConfirmDelete(z.id)}
            >
              ×
            </Button>
          </div>
        );
      })}

      {confirmDelete && (
        <div className="rounded border bg-muted/50 p-2 flex flex-col gap-2">
          <p className="text-xs">Που να μετακινήσω τα τραπέζια;</p>
          <select
            className="rounded border bg-background p-1 text-xs"
            value={moveTo}
            onChange={(e) => setMoveTo(e.target.value)}
          >
            <option value="">— Επίλεξε —</option>
            {zones
              .filter((z) => z.id !== confirmDelete)
              .map((z) => (
                <option key={z.id} value={z.id}>
                  {z.name}
                </option>
              ))}
          </select>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setConfirmDelete(null)}
            >
              Ακύρωση
            </Button>
            <Button
              size="sm"
              variant="destructive"
              disabled={!moveTo}
              onClick={async () => {
                await cascadeDeleteZone({
                  zoneId: confirmDelete,
                  moveToZoneId: moveTo,
                });
                setConfirmDelete(null);
                setMoveTo("");
              }}
            >
              Διαγραφή
            </Button>
          </div>
        </div>
      )}

      {adding ? (
        <div className="rounded border p-2 flex flex-col gap-2">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Όνομα ζώνης"
          />
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
          />
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>
              Ακύρωση
            </Button>
            <Button
              size="sm"
              onClick={async () => {
                if (!name.trim()) return;
                await upsertZone({
                  name,
                  color,
                  floor_id: floorId,
                  sort_order: zones.length,
                });
                setName("");
                setAdding(false);
              }}
            >
              Προσθήκη
            </Button>
          </div>
        </div>
      ) : (
        <Button variant="outline" size="sm" onClick={() => setAdding(true)}>
          + Νέα ζώνη
        </Button>
      )}
    </div>
  );
}
