"use client";

import { useEffect, useState } from "react";
import type { DbFloor, DbZone, DbTable } from "@/lib/types/database";
import type { DbFloorLayout } from "@/lib/types/floor-layouts";
import { useCanvasState } from "@/lib/hooks/use-canvas-state";
import { Canvas } from "./canvas";
import { PaletteRail } from "./palette-rail";
import { SelectionPanel } from "./selection-panel";
import { ZonesPanel } from "./zones-panel";
import { LayoutsPanel } from "./layouts-panel";
import { FloorPresetsDialog } from "./floor-presets-dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Props = {
  floors: DbFloor[];
  zones: DbZone[];
  tables: DbTable[];
  layoutsByFloor: Record<string, DbFloorLayout[]>;
  initialFloorId: string;
};

export function EditorShell({
  floors,
  zones,
  tables: initialTables,
  layoutsByFloor,
  initialFloorId,
}: Props) {
  const [activeFloorId, setActiveFloorId] = useState(initialFloorId);
  const { tables, selected, setSelected, moveLocal, pushUndo, undo, redo } =
    useCanvasState(initialTables);

  const floor = floors.find((f) => f.id === activeFloorId);
  const floorZones = zones.filter((z) => z.floor_id === activeFloorId);
  const zoneIds = new Set(floorZones.map((z) => z.id));
  const floorTables = tables.filter((t) => t.zone_id && zoneIds.has(t.zone_id));
  const layouts = layoutsByFloor[activeFloorId] ?? [];
  const firstSelectedId =
    selected.size === 1 ? (Array.from(selected)[0] ?? null) : null;
  const selectedTable = firstSelectedId
    ? (floorTables.find((t) => t.id === firstSelectedId) ?? null)
    : null;

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if (
        (e.ctrlKey || e.metaKey) &&
        (e.key === "y" || (e.shiftKey && e.key === "z"))
      ) {
        e.preventDefault();
        redo();
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [undo, redo]);

  function handleSelect(ids: string[], additive: boolean) {
    if (ids.length === 0 && !additive) {
      setSelected(new Set());
      return;
    }
    if (additive) {
      setSelected((prev) => {
        const next = new Set(prev);
        ids.forEach((id) => (next.has(id) ? next.delete(id) : next.add(id)));
        return next;
      });
    } else {
      setSelected(new Set(ids));
    }
  }

  if (!floor) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-3">
        <p className="text-muted-foreground">
          Δεν υπάρχει όροφος. Δημιούργησε έναν.
        </p>
        <FloorPresetsDialog onCreated={(id) => setActiveFloorId(id)} />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-10rem)] flex-col">
      <div className="flex items-center gap-2 border-b p-2">
        <select
          className="rounded border bg-background p-1 text-sm"
          value={activeFloorId}
          onChange={(e) => setActiveFloorId(e.target.value)}
        >
          {floors.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </select>
        <FloorPresetsDialog onCreated={(id) => setActiveFloorId(id)} />
        <div className="flex-1" />
        <Button size="sm" variant="ghost" onClick={undo}>
          Undo
        </Button>
        <Button size="sm" variant="ghost" onClick={redo}>
          Redo
        </Button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <PaletteRail />
        <Canvas
          floor={floor}
          zones={floorZones}
          tables={floorTables}
          selected={selected}
          onSelect={handleSelect}
          onMove={moveLocal}
          onPushUndo={pushUndo}
        />
        <aside className="w-72 shrink-0 border-l bg-muted/30 overflow-y-auto">
          <Tabs defaultValue="selection">
            <TabsList className="w-full">
              <TabsTrigger value="selection">Επιλογή</TabsTrigger>
              <TabsTrigger value="zones">Ζώνες</TabsTrigger>
              <TabsTrigger value="layouts">Διατάξεις</TabsTrigger>
            </TabsList>
            <TabsContent value="selection">
              <SelectionPanel
                table={selectedTable}
                zones={floorZones}
                onChange={() => {}}
              />
            </TabsContent>
            <TabsContent value="zones">
              <ZonesPanel
                zones={floorZones}
                tables={floorTables}
                floorId={activeFloorId}
              />
            </TabsContent>
            <TabsContent value="layouts">
              <LayoutsPanel layouts={layouts} floorId={activeFloorId} />
            </TabsContent>
          </Tabs>
        </aside>
      </div>
    </div>
  );
}
