"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { DbTable, DbFloor, DbZone } from "@/lib/types/database";
import { snapToGrid } from "@/lib/canvas/snap";
import {
  clampToBounds,
  findOverlaps,
  type IdRect,
} from "@/lib/canvas/collision";
import { computeGuides, type Guide } from "@/lib/canvas/alignment";
import { upsertTable } from "@/lib/actions/floor-plan";
import type { PresetTable } from "./palette-rail";

const GRID = 20;

type Props = {
  floor: DbFloor;
  zones: DbZone[];
  tables: DbTable[];
  selected: Set<string>;
  onSelect: (ids: string[], additive: boolean) => void;
  onMove: (id: string, x: number, y: number, rotation?: number) => void;
  onPushUndo: () => void;
};

export function Canvas({
  floor,
  zones,
  tables,
  selected,
  onSelect,
  onMove,
  onPushUndo,
}: Props) {
  const router = useRouter();
  const svgRef = useRef<SVGSVGElement>(null);
  const [dragging, setDragging] = useState<{
    id: string;
    offsetX: number;
    offsetY: number;
  } | null>(null);
  const [guides, setGuides] = useState<Guide[]>([]);
  const [overlaps, setOverlaps] = useState<Set<string>>(new Set());
  const [dropError, setDropError] = useState<string | null>(null);

  function svgPoint(e: React.MouseEvent | React.DragEvent): {
    x: number;
    y: number;
  } {
    const svg = svgRef.current!;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const result = pt.matrixTransform(ctm.inverse());
    return { x: result.x, y: result.y };
  }

  function handleTableMouseDown(e: React.MouseEvent, t: DbTable) {
    e.stopPropagation();
    const p = svgPoint(e);
    setDragging({ id: t.id, offsetX: p.x - t.x, offsetY: p.y - t.y });
    onSelect([t.id], e.shiftKey);
    onPushUndo();
  }

  function handleMouseMove(e: React.MouseEvent) {
    if (!dragging) return;
    const p = svgPoint(e);
    const tbl = tables.find((t) => t.id === dragging.id);
    if (!tbl) return;

    const rawX = p.x - dragging.offsetX;
    const rawY = p.y - dragging.offsetY;
    const target: IdRect = {
      id: tbl.id,
      x: rawX,
      y: rawY,
      width: tbl.width,
      height: tbl.height,
    };
    const others: IdRect[] = tables
      .filter((o) => o.id !== tbl.id)
      .map((o) => ({
        id: o.id,
        x: o.x,
        y: o.y,
        width: o.width,
        height: o.height,
      }));

    const aligned = computeGuides(target, others, 4);
    let nx = aligned.snappedX;
    let ny = aligned.snappedY;

    nx = snapToGrid(nx, GRID);
    ny = snapToGrid(ny, GRID);

    const clamped = clampToBounds(
      { x: nx, y: ny, width: tbl.width, height: tbl.height },
      floor.width,
      floor.height,
    );

    setGuides(aligned.guides);
    setOverlaps(new Set(findOverlaps({ id: tbl.id, ...clamped }, others)));
    onMove(tbl.id, clamped.x, clamped.y);
  }

  function handleMouseUp() {
    if (dragging) {
      setGuides([]);
      setOverlaps(new Set());
      setDragging(null);
    }
  }

  function handleCanvasClick(e: React.MouseEvent) {
    if (e.target === e.currentTarget) onSelect([], false);
  }

  async function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const data = e.dataTransfer.getData("application/x-mauri-table-preset");
    if (!data) return;
    const preset: PresetTable = JSON.parse(data);
    const p = svgPoint(e);
    const x = snapToGrid(p.x - preset.width / 2, GRID);
    const y = snapToGrid(p.y - preset.height / 2, GRID);
    const firstZone = zones[0];
    if (!firstZone) {
      setDropError(
        "Δεν υπάρχει ζώνη σε αυτόν τον όροφο. Πρόσθεσε ζώνη πρώτα από το panel «Ζώνες».",
      );
      return;
    }
    setDropError(null);
    const result = await upsertTable({
      number: nextTableNumber(tables),
      capacity: preset.capacity,
      shape: preset.shape,
      width: preset.width,
      height: preset.height,
      x,
      y,
      rotation: 0,
      zone_id: firstZone.id,
    });
    if (!result.success) {
      setDropError(result.error ?? "Αποτυχία προσθήκης τραπεζιού");
      return;
    }
    router.refresh();
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }

  return (
    <div className="relative flex-1 flex">
      {dropError && (
        <div className="absolute left-2 top-2 z-10 max-w-md rounded-md border border-destructive bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {dropError}
          <button
            type="button"
            onClick={() => setDropError(null)}
            className="ml-2 underline"
          >
            OK
          </button>
        </div>
      )}
      <svg
        ref={svgRef}
        viewBox={`0 0 ${floor.width} ${floor.height}`}
        className="flex-1 bg-background border"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={handleCanvasClick}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        <defs>
          <pattern
            id="grid"
            width={GRID}
            height={GRID}
            patternUnits="userSpaceOnUse"
          >
            <path
              d={`M ${GRID} 0 L 0 0 0 ${GRID}`}
              fill="none"
              stroke="currentColor"
              strokeOpacity="0.1"
              strokeWidth="0.5"
            />
          </pattern>
        </defs>
        <rect width={floor.width} height={floor.height} fill="url(#grid)" />

        {tables.map((t) => {
          const zone = zones.find((z) => z.id === t.zone_id);
          const isSelected = selected.has(t.id);
          const isOverlapping = overlaps.has(t.id);
          const fill = zone?.color ?? "#6366f1";
          return (
            <g
              key={t.id}
              transform={`translate(${t.x}, ${t.y}) rotate(${t.rotation}, ${t.width / 2}, ${t.height / 2})`}
              onMouseDown={(e) => handleTableMouseDown(e, t)}
              className="cursor-move"
            >
              {t.shape === "round" ? (
                <ellipse
                  cx={t.width / 2}
                  cy={t.height / 2}
                  rx={t.width / 2}
                  ry={t.height / 2}
                  fill={fill}
                  stroke={
                    isOverlapping ? "#ef4444" : isSelected ? "#fff" : "#000"
                  }
                  strokeWidth={isSelected || isOverlapping ? 2 : 1}
                />
              ) : (
                <rect
                  width={t.width}
                  height={t.height}
                  fill={fill}
                  stroke={
                    isOverlapping ? "#ef4444" : isSelected ? "#fff" : "#000"
                  }
                  strokeWidth={isSelected || isOverlapping ? 2 : 1}
                  rx={4}
                />
              )}
              <text
                x={t.width / 2}
                y={t.height / 2}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="#000"
                fontSize="12"
                fontWeight="bold"
              >
                {t.label ?? t.number}
              </text>
            </g>
          );
        })}

        {guides.map((g, i) =>
          g.orientation === "vertical" ? (
            <line
              key={i}
              x1={g.coord}
              y1={0}
              x2={g.coord}
              y2={floor.height}
              stroke="#ec4899"
              strokeDasharray="4 2"
              strokeWidth={1}
            />
          ) : (
            <line
              key={i}
              x1={0}
              y1={g.coord}
              x2={floor.width}
              y2={g.coord}
              stroke="#ec4899"
              strokeDasharray="4 2"
              strokeWidth={1}
            />
          ),
        )}
      </svg>
    </div>
  );
}

function nextTableNumber(tables: DbTable[]): number {
  const max = tables.reduce((m, t) => Math.max(m, t.number), 0);
  return max + 1;
}
