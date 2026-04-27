"use client";

import type { TableShape } from "@/lib/types/database";

export type PresetTable = {
  id: string;
  label: string;
  shape: TableShape;
  width: number;
  height: number;
  capacity: number;
};

const PRESETS: PresetTable[] = [
  {
    id: "p-2sq",
    label: "2 θέσεις τετράγωνο",
    shape: "square",
    width: 60,
    height: 60,
    capacity: 2,
  },
  {
    id: "p-4sq",
    label: "4 θέσεις τετράγωνο",
    shape: "square",
    width: 80,
    height: 80,
    capacity: 4,
  },
  {
    id: "p-4rd",
    label: "4 θέσεις στρογγυλό",
    shape: "round",
    width: 80,
    height: 80,
    capacity: 4,
  },
  {
    id: "p-6rt",
    label: "6 θέσεις ορθογώνιο",
    shape: "rectangle",
    width: 140,
    height: 70,
    capacity: 6,
  },
  {
    id: "p-bar",
    label: "Σκαμπό μπαρ",
    shape: "square",
    width: 40,
    height: 40,
    capacity: 1,
  },
];

export function PaletteRail() {
  function handleDragStart(e: React.DragEvent, preset: PresetTable) {
    e.dataTransfer.setData(
      "application/x-mauri-table-preset",
      JSON.stringify(preset),
    );
    e.dataTransfer.effectAllowed = "copy";
  }

  return (
    <aside className="w-32 shrink-0 border-r bg-muted/30 p-2 flex flex-col gap-2">
      <h3 className="text-xs font-semibold uppercase text-muted-foreground">
        Σύρε →
      </h3>
      {PRESETS.map((p) => (
        <div
          key={p.id}
          draggable
          onDragStart={(e) => handleDragStart(e, p)}
          className="cursor-grab rounded border bg-background p-2 hover:bg-accent text-center"
        >
          <div
            className="mx-auto mb-1 bg-primary/80"
            style={{
              width: Math.min(p.width / 3, 32),
              height: Math.min(p.height / 3, 32),
              borderRadius: p.shape === "round" ? "50%" : 4,
            }}
          />
          <div className="text-[10px]">{p.label}</div>
        </div>
      ))}
    </aside>
  );
}
