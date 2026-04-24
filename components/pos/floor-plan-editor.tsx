"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Plus,
  Trash2,
  RotateCcw,
  RotateCw,
  Pencil,
  Square as SquareIcon,
  Circle as CircleIcon,
  RectangleHorizontal,
  Save,
  Layers,
  Palette,
  X,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  upsertFloor,
  deleteFloor,
  upsertZone,
  deleteZone,
  upsertTable,
  moveTable,
  deleteTable,
} from "@/lib/actions/floor-plan";
import type {
  DbFloor,
  DbZone,
  DbTable,
  TableShape,
} from "@/lib/types/database";

interface Props {
  initialFloors: DbFloor[];
  initialZones: DbZone[];
  initialTables: DbTable[];
}

const GRID = 20; // snap grid in px

const snap = (n: number) => Math.round(n / GRID) * GRID;

export function FloorPlanEditor({
  initialFloors,
  initialZones,
  initialTables,
}: Props) {
  const [floors, setFloors] = useState<DbFloor[]>(initialFloors);
  const [zones, setZones] = useState<DbZone[]>(initialZones);
  const [tables, setTables] = useState<DbTable[]>(initialTables);

  const [activeFloorId, setActiveFloorId] = useState<string | null>(
    initialFloors[0]?.id ?? null,
  );
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [editingFloor, setEditingFloor] = useState<DbFloor | null | "new">(null);
  const [editingZone, setEditingZone] = useState<DbZone | null | "new">(null);

  const svgRef = useRef<SVGSVGElement>(null);
  const [drag, setDrag] = useState<{
    tableId: string;
    offsetX: number;
    offsetY: number;
  } | null>(null);

  const activeFloor = floors.find((f) => f.id === activeFloorId) ?? null;
  const floorZones = useMemo(
    () => zones.filter((z) => z.floor_id === activeFloorId),
    [zones, activeFloorId],
  );
  const floorZoneIds = new Set(floorZones.map((z) => z.id));
  const floorTables = useMemo(
    () => tables.filter((t) => floorZoneIds.has(t.zone_id)),
    [tables, floorZoneIds],
  );

  const selectedTable = tables.find((t) => t.id === selectedTableId) ?? null;

  // ───────────── Drag handlers ─────────────
  const onTableMouseDown = (
    e: React.MouseEvent,
    table: DbTable,
  ) => {
    e.stopPropagation();
    setSelectedTableId(table.id);
    const pt = screenToSvg(e.clientX, e.clientY);
    if (!pt) return;
    setDrag({ tableId: table.id, offsetX: pt.x - table.x, offsetY: pt.y - table.y });
  };

  const onSvgMouseMove = (e: React.MouseEvent) => {
    if (!drag) return;
    const pt = screenToSvg(e.clientX, e.clientY);
    if (!pt) return;
    const t = tables.find((x) => x.id === drag.tableId);
    const maxX = activeFloor ? activeFloor.width - (t?.width ?? 80) : 5000;
    const maxY = activeFloor ? activeFloor.height - (t?.height ?? 80) : 5000;
    const newX = Math.max(0, Math.min(maxX, snap(pt.x - drag.offsetX)));
    const newY = Math.max(0, Math.min(maxY, snap(pt.y - drag.offsetY)));
    setTables((xs) =>
      xs.map((t) => (t.id === drag.tableId ? { ...t, x: newX, y: newY } : t)),
    );
  };

  const onSvgMouseUp = () => {
    if (!drag) return;
    const moved = tables.find((t) => t.id === drag.tableId);
    setDrag(null);
    if (moved) {
      moveTable({ id: moved.id, x: moved.x, y: moved.y, rotation: moved.rotation });
    }
  };

  const screenToSvg = (clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return null;
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return null;
    return pt.matrixTransform(ctm.inverse());
  };

  // ───────────── Mutations ─────────────
  const addTable = (zoneId: string) => {
    const nextNumber =
      Math.max(0, ...tables.map((t) => t.number)) + 1;
    upsertTable({
      number: nextNumber,
      capacity: 4,
      zone_id: zoneId,
      x: 100,
      y: 100,
      shape: "square",
      rotation: 0,
    }).then((r) => {
      if (!r.success) toast.error(r.error ?? "Αποτυχία");
      else {
        toast.success(`Τραπέζι #${nextNumber}`);
        refresh();
      }
    });
  };

  const refresh = () => {
    // Force a fetch of the current state — simplest is to reload
    window.location.reload();
  };

  const rotateSelected = (deg: number) => {
    if (!selectedTable) return;
    const newRot = (selectedTable.rotation + deg + 360) % 360;
    setTables((xs) =>
      xs.map((t) => (t.id === selectedTable.id ? { ...t, rotation: newRot } : t)),
    );
    moveTable({ id: selectedTable.id, x: selectedTable.x, y: selectedTable.y, rotation: newRot });
  };

  const deleteSelected = () => {
    if (!selectedTable) return;
    if (!confirm(`Διαγραφή τραπεζιού #${selectedTable.number};`)) return;
    deleteTable(selectedTable.id).then((r) => {
      if (r.success) {
        toast.success("Διαγράφηκε");
        setSelectedTableId(null);
        setTables((xs) => xs.filter((t) => t.id !== selectedTable.id));
      } else toast.error(r.error ?? "Αποτυχία");
    });
  };

  // ───────────── Render ─────────────
  return (
    <div className="space-y-3">
      {/* Floor tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b pb-2">
        {floors.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => { setActiveFloorId(f.id); setSelectedTableId(null); }}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition",
              activeFloorId === f.id
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted",
            )}
          >
            <Layers className="size-3.5" />
            {f.name}
            <span className="ml-1 rounded-full bg-background/20 px-1.5 text-[10px]">
              {zones.filter((z) => z.floor_id === f.id).reduce(
                (s, z) => s + tables.filter((t) => t.zone_id === z.id).length,
                0,
              )}
            </span>
          </button>
        ))}
        <Button size="sm" variant="outline" onClick={() => setEditingFloor("new")}>
          <Plus className="size-3.5 mr-1" /> Όροφος
        </Button>
        {activeFloor && (
          <Button size="sm" variant="ghost" onClick={() => setEditingFloor(activeFloor)}>
            <Pencil className="size-3.5" />
          </Button>
        )}
      </div>

      {/* Add-to-floor toolbar (outside canvas) */}
      {activeFloor && (
        <div className="flex flex-wrap items-center gap-1.5 rounded-md border bg-muted/30 p-2">
          <span className="mr-1 text-xs font-medium text-muted-foreground">
            Προσθήκη:
          </span>
          {floorZones.map((z) => (
            <Button
              key={z.id}
              size="sm"
              variant="outline"
              className="h-7 text-xs gap-1"
              onClick={() => addTable(z.id)}
            >
              <Plus className="size-3" />
              <span
                className="size-2 rounded-full"
                style={{ backgroundColor: z.color }}
              />
              {z.name}
            </Button>
          ))}
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs gap-1"
            onClick={() => setEditingZone("new")}
          >
            <Plus className="size-3" /> Νέα Ζώνη
          </Button>
          <div className="ml-auto text-xs text-muted-foreground">
            {activeFloor.name} · {activeFloor.width}×{activeFloor.height} ·{" "}
            {floorTables.length} τραπέζια
          </div>
        </div>
      )}

      <div className="grid gap-3 lg:grid-cols-[1fr_280px]">
        {/* Canvas */}
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            {activeFloor ? (
              <div className="relative bg-slate-50 dark:bg-slate-900/40">
                <svg
                  ref={svgRef}
                  viewBox={`-40 -40 ${activeFloor.width + 80} ${activeFloor.height + 80}`}
                  className="w-full"
                  style={{ aspectRatio: `${activeFloor.width + 80} / ${activeFloor.height + 80}`, maxHeight: "78vh" }}
                  onMouseMove={onSvgMouseMove}
                  onMouseUp={onSvgMouseUp}
                  onMouseLeave={onSvgMouseUp}
                  onClick={() => setSelectedTableId(null)}
                >
                  {/* Grid (clipped to floor) */}
                  <defs>
                    <pattern id="grid" width={GRID} height={GRID} patternUnits="userSpaceOnUse">
                      <path d={`M ${GRID} 0 L 0 0 0 ${GRID}`} fill="none" stroke="hsl(var(--muted-foreground))" strokeOpacity="0.18" strokeWidth="0.5" />
                    </pattern>
                    <clipPath id="floor-clip">
                      <rect x="0" y="0" width={activeFloor.width} height={activeFloor.height} rx="6" />
                    </clipPath>
                  </defs>

                  {/* Floor boundary — clearly shows the usable space */}
                  <rect
                    x="0" y="0"
                    width={activeFloor.width}
                    height={activeFloor.height}
                    rx="6"
                    fill="white"
                    stroke="hsl(var(--primary))"
                    strokeOpacity="0.4"
                    strokeWidth="2"
                    strokeDasharray="6 4"
                  />
                  <rect
                    x="0" y="0"
                    width={activeFloor.width}
                    height={activeFloor.height}
                    fill="url(#grid)"
                    clipPath="url(#floor-clip)"
                  />

                  {/* Floor name watermark (top-left corner, inside bounds) */}
                  <text
                    x="12" y="26"
                    fontSize="14"
                    fontWeight="600"
                    fill="hsl(var(--muted-foreground))"
                    opacity="0.5"
                    clipPath="url(#floor-clip)"
                  >
                    {activeFloor.name}
                  </text>

                  {/* Tables */}
                  {floorTables.map((t) => (
                    <TableShape
                      key={t.id}
                      table={t}
                      zone={zones.find((z) => z.id === t.zone_id) ?? null}
                      selected={selectedTableId === t.id}
                      onMouseDown={(e) => onTableMouseDown(e, t)}
                    />
                  ))}
                </svg>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <Layers className="size-12 text-muted-foreground opacity-40 mb-3" />
                <p className="font-medium">Κανένας όροφος ακόμα</p>
                <Button size="sm" className="mt-3" onClick={() => setEditingFloor("new")}>
                  <Plus className="size-3.5 mr-1" /> Δημιουργία ορόφου
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right panel */}
        <div className="space-y-3">
          {selectedTable ? (
            <TablePropertiesPanel
              table={selectedTable}
              zones={floorZones}
              onChange={(updates) => {
                setTables((xs) => xs.map((t) => (t.id === selectedTable.id ? { ...t, ...updates } : t)));
              }}
              onSave={(updates) => {
                upsertTable({
                  id: selectedTable.id,
                  number: updates.number ?? selectedTable.number,
                  capacity: updates.capacity ?? selectedTable.capacity,
                  zone_id: updates.zone_id ?? selectedTable.zone_id,
                  x: selectedTable.x,
                  y: selectedTable.y,
                  width: updates.width ?? selectedTable.width,
                  height: updates.height ?? selectedTable.height,
                  shape: updates.shape ?? selectedTable.shape,
                  rotation: updates.rotation ?? selectedTable.rotation,
                  label: updates.label ?? selectedTable.label,
                }).then((r) => {
                  if (r.success) toast.success("Αποθηκεύτηκε");
                  else toast.error(r.error ?? "Αποτυχία");
                });
              }}
              onRotateLeft={() => rotateSelected(-15)}
              onRotateRight={() => rotateSelected(15)}
              onDelete={deleteSelected}
              onDeselect={() => setSelectedTableId(null)}
            />
          ) : (
            <ZonesPanel
              zones={floorZones}
              tables={floorTables}
              onEditZone={setEditingZone}
            />
          )}
        </div>
      </div>

      {/* Floor editor dialog */}
      {editingFloor && (
        <FloorDialog
          floor={editingFloor === "new" ? null : editingFloor}
          nextOrder={Math.max(0, ...floors.map((f) => f.sort_order)) + 1}
          onClose={() => setEditingFloor(null)}
          onSaved={(f) => {
            setFloors((xs) => {
              const existing = xs.find((x) => x.id === f.id);
              return existing ? xs.map((x) => (x.id === f.id ? f : x)) : [...xs, f];
            });
            setActiveFloorId(f.id);
            setEditingFloor(null);
          }}
          onDeleted={(id) => {
            setFloors((xs) => xs.filter((x) => x.id !== id));
            if (activeFloorId === id) setActiveFloorId(floors.find((f) => f.id !== id)?.id ?? null);
            setEditingFloor(null);
          }}
        />
      )}

      {/* Zone editor dialog */}
      {editingZone && activeFloorId && (
        <ZoneDialog
          zone={editingZone === "new" ? null : editingZone}
          floorId={activeFloorId}
          nextOrder={Math.max(0, ...zones.map((z) => z.sort_order)) + 1}
          onClose={() => setEditingZone(null)}
          onSaved={(z) => {
            setZones((xs) => {
              const existing = xs.find((x) => x.id === z.id);
              return existing ? xs.map((x) => (x.id === z.id ? z : x)) : [...xs, z];
            });
            setEditingZone(null);
          }}
          onDeleted={(id) => {
            setZones((xs) => xs.filter((x) => x.id !== id));
            setEditingZone(null);
          }}
        />
      )}
    </div>
  );
}

// ───────────────── Table SVG shape ─────────────────
function TableShape({
  table,
  zone,
  selected,
  onMouseDown,
}: {
  table: DbTable;
  zone: DbZone | null;
  selected: boolean;
  onMouseDown: (e: React.MouseEvent) => void;
}) {
  const color = zone?.color ?? "#64748b";
  const w = table.width ?? 80;
  const h = table.height ?? 80;
  const strokeColor = selected ? "hsl(var(--primary))" : color;
  const strokeWidth = selected ? 3 : 2;

  const body =
    table.shape === "round" ? (
      <ellipse cx={w / 2} cy={h / 2} rx={w / 2} ry={h / 2}
        fill="white" stroke={strokeColor} strokeWidth={strokeWidth} />
    ) : (
      <rect width={w} height={h} rx={8} ry={8}
        fill="white" stroke={strokeColor} strokeWidth={strokeWidth} />
    );

  return (
    <g
      transform={`translate(${table.x}, ${table.y}) rotate(${table.rotation}, ${w / 2}, ${h / 2})`}
      onMouseDown={onMouseDown}
      style={{ cursor: "grab" }}
      onClick={(e) => e.stopPropagation()}
    >
      {body}
      <text x={w / 2} y={h / 2} textAnchor="middle" dominantBaseline="central"
        fontSize={Math.min(w, h) * 0.3} fontWeight="700" fill="currentColor">
        {table.label ?? table.number}
      </text>
      <text x={w / 2} y={h - 8} textAnchor="middle" fontSize="10" fill={color} fontWeight="600">
        {table.capacity}
      </text>
    </g>
  );
}

// ───────────────── Table properties ─────────────────
function TablePropertiesPanel({
  table,
  zones,
  onChange,
  onSave,
  onRotateLeft,
  onRotateRight,
  onDelete,
  onDeselect,
}: {
  table: DbTable;
  zones: DbZone[];
  onChange: (updates: Partial<DbTable>) => void;
  onSave: (updates: Partial<DbTable>) => void;
  onRotateLeft: () => void;
  onRotateRight: () => void;
  onDelete: () => void;
  onDeselect: () => void;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base">Τραπέζι #{table.number}</CardTitle>
        <Button size="icon" variant="ghost" onClick={onDeselect}>
          <X className="size-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <Field label="Αριθμός">
            <Input type="number" min="1" value={table.number}
              onChange={(e) => onChange({ number: Number(e.target.value) })}
              onBlur={(e) => onSave({ number: Number(e.target.value) })} />
          </Field>
          <Field label="Χωρητικότητα">
            <Input type="number" min="1" max="30" value={table.capacity}
              onChange={(e) => onChange({ capacity: Number(e.target.value) })}
              onBlur={(e) => onSave({ capacity: Number(e.target.value) })} />
          </Field>
        </div>

        <Field label="Label (προαιρετικό)">
          <Input value={table.label ?? ""}
            onChange={(e) => onChange({ label: e.target.value })}
            onBlur={(e) => onSave({ label: e.target.value || null })}
            placeholder={`#${table.number}`} />
        </Field>

        <Field label="Ζώνη">
          <select value={table.zone_id}
            onChange={(e) => { onChange({ zone_id: e.target.value }); onSave({ zone_id: e.target.value }); }}
            className="w-full h-9 rounded-md border bg-background px-2 text-sm">
            {zones.map((z) => (<option key={z.id} value={z.id}>{z.name}</option>))}
          </select>
        </Field>

        <Field label="Σχήμα">
          <div className="grid grid-cols-3 gap-1">
            {(["square", "round", "rectangle"] as TableShape[]).map((s) => {
              const Icon = s === "round" ? CircleIcon : s === "rectangle" ? RectangleHorizontal : SquareIcon;
              const active = table.shape === s;
              return (
                <Button key={s} size="sm"
                  variant={active ? "default" : "outline"}
                  onClick={() => {
                    const newW = s === "rectangle" ? 140 : 80;
                    onChange({ shape: s, width: newW, height: 80 });
                    onSave({ shape: s, width: newW, height: 80 });
                  }}
                  className="h-9">
                  <Icon className="size-4" />
                </Button>
              );
            })}
          </div>
        </Field>

        <div className="grid grid-cols-2 gap-2">
          <Field label="Πλάτος">
            <Input type="number" min="30" max="400" value={table.width ?? 80}
              onChange={(e) => onChange({ width: Number(e.target.value) })}
              onBlur={(e) => onSave({ width: Number(e.target.value) })} />
          </Field>
          <Field label="Ύψος">
            <Input type="number" min="30" max="400" value={table.height ?? 80}
              onChange={(e) => onChange({ height: Number(e.target.value) })}
              onBlur={(e) => onSave({ height: Number(e.target.value) })} />
          </Field>
        </div>

        <Field label={`Περιστροφή: ${table.rotation}°`}>
          <div className="flex gap-1">
            <Button size="sm" variant="outline" onClick={onRotateLeft} className="flex-1">
              <RotateCcw className="size-3.5" />
            </Button>
            <Button size="sm" variant="outline" onClick={onRotateRight} className="flex-1">
              <RotateCw className="size-3.5" />
            </Button>
          </div>
        </Field>

        <Separator />

        <Button variant="outline" onClick={onDelete} className="w-full gap-2">
          <Trash2 className="size-4 text-rose-500" />
          Διαγραφή τραπεζιού
        </Button>
      </CardContent>
    </Card>
  );
}

// ───────────────── Zones panel ─────────────────
function ZonesPanel({
  zones,
  tables,
  onEditZone,
}: {
  zones: DbZone[];
  tables: DbTable[];
  onEditZone: (z: DbZone) => void;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Palette className="size-4" /> Ζώνες
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {zones.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Δημιούργησε μια ζώνη για να αρχίσεις.
          </p>
        ) : (
          zones.map((z) => {
            const count = tables.filter((t) => t.zone_id === z.id).length;
            return (
              <button
                key={z.id}
                type="button"
                onClick={() => onEditZone(z)}
                className="w-full flex items-center gap-2 rounded-md border p-2 text-sm hover:bg-muted transition"
              >
                <span className="size-4 rounded" style={{ backgroundColor: z.color }} />
                <span className="flex-1 text-left font-medium">{z.name}</span>
                <Badge variant="outline">{count}</Badge>
              </button>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}

// ───────────────── Floor dialog ─────────────────
function FloorDialog({
  floor,
  nextOrder,
  onClose,
  onSaved,
  onDeleted,
}: {
  floor: DbFloor | null;
  nextOrder: number;
  onClose: () => void;
  onSaved: (f: DbFloor) => void;
  onDeleted: (id: string) => void;
}) {
  const [name, setName] = useState(floor?.name ?? "");
  const [width, setWidth] = useState(floor?.width ?? 1200);
  const [height, setHeight] = useState(floor?.height ?? 800);
  const [sortOrder, setSortOrder] = useState(floor?.sort_order ?? nextOrder);
  const [isPending, startTransition] = useTransition();

  const save = () => {
    startTransition(async () => {
      const r = await upsertFloor({
        id: floor?.id,
        name, sort_order: sortOrder, width, height,
      });
      if (!r.success || !r.data) { toast.error(r.error ?? "Αποτυχία"); return; }
      const now = new Date().toISOString();
      onSaved({
        id: r.data.id, name, sort_order: sortOrder,
        width, height, background_url: floor?.background_url ?? null,
        is_active: true, created_at: floor?.created_at ?? now, updated_at: now,
      });
      toast.success("Αποθηκεύτηκε");
    });
  };

  const del = () => {
    if (!floor) return;
    if (!confirm(`Διαγραφή ορόφου "${floor.name}";`)) return;
    startTransition(async () => {
      const r = await deleteFloor(floor.id);
      if (r.success) { toast.success("Διαγράφηκε"); onDeleted(floor.id); }
      else toast.error(r.error ?? "Αποτυχία");
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">
            {floor ? `Επεξεργασία: ${floor.name}` : "Νέος Όροφος"}
          </CardTitle>
          <Button size="icon" variant="ghost" onClick={onClose}><X className="size-4" /></Button>
        </CardHeader>
        <CardContent className="space-y-3">
          <Field label="Όνομα">
            <Input value={name} onChange={(e) => setName(e.target.value)}
              placeholder="π.χ. Ισόγειο, Βεράντα, Roof Garden" />
          </Field>
          <div className="grid grid-cols-3 gap-2">
            <Field label="Πλάτος">
              <Input type="number" min="200" max="5000" value={width}
                onChange={(e) => setWidth(Number(e.target.value))} />
            </Field>
            <Field label="Ύψος">
              <Input type="number" min="200" max="5000" value={height}
                onChange={(e) => setHeight(Number(e.target.value))} />
            </Field>
            <Field label="Σειρά">
              <Input type="number" min="0" value={sortOrder}
                onChange={(e) => setSortOrder(Number(e.target.value))} />
            </Field>
          </div>
          <div className="flex gap-2 pt-2">
            {floor && (
              <Button variant="outline" onClick={del} disabled={isPending} className="gap-2">
                <Trash2 className="size-4 text-rose-500" />
              </Button>
            )}
            <Button variant="outline" onClick={onClose} className="ml-auto">Ακύρωση</Button>
            <Button onClick={save} disabled={isPending}>
              <Save className="mr-2 size-4" /> Αποθήκευση
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ───────────────── Zone dialog ─────────────────
function ZoneDialog({
  zone,
  floorId,
  nextOrder,
  onClose,
  onSaved,
  onDeleted,
}: {
  zone: DbZone | null;
  floorId: string;
  nextOrder: number;
  onClose: () => void;
  onSaved: (z: DbZone) => void;
  onDeleted: (id: string) => void;
}) {
  const [name, setName] = useState(zone?.name ?? "");
  const [color, setColor] = useState(zone?.color ?? "#3b82f6");
  const [sortOrder, setSortOrder] = useState(zone?.sort_order ?? nextOrder);
  const [isPending, startTransition] = useTransition();

  const save = () => {
    startTransition(async () => {
      const r = await upsertZone({
        id: zone?.id, name, color, sort_order: sortOrder, floor_id: floorId,
      });
      if (!r.success || !r.data) { toast.error(r.error ?? "Αποτυχία"); return; }
      const now = new Date().toISOString();
      onSaved({
        id: r.data.id, name, color, sort_order: sortOrder, floor_id: floorId,
        legacy_id: zone?.legacy_id ?? null, metadata: zone?.metadata ?? {},
        created_at: zone?.created_at ?? now, updated_at: now,
      });
      toast.success("Αποθηκεύτηκε");
    });
  };

  const del = () => {
    if (!zone) return;
    if (!confirm(`Διαγραφή ζώνης "${zone.name}";`)) return;
    startTransition(async () => {
      const r = await deleteZone(zone.id);
      if (r.success) { toast.success("Διαγράφηκε"); onDeleted(zone.id); }
      else toast.error(r.error ?? "Αποτυχία");
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">
            {zone ? `Επεξεργασία: ${zone.name}` : "Νέα Ζώνη"}
          </CardTitle>
          <Button size="icon" variant="ghost" onClick={onClose}><X className="size-4" /></Button>
        </CardHeader>
        <CardContent className="space-y-3">
          <Field label="Όνομα">
            <Input value={name} onChange={(e) => setName(e.target.value)}
              placeholder="π.χ. Παράθυρο, VIP, Καπνίζοντες" />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Χρώμα">
              <div className="flex gap-2">
                <Input value={color} onChange={(e) => setColor(e.target.value)} />
                <input type="color" value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="size-9 rounded cursor-pointer" />
              </div>
            </Field>
            <Field label="Σειρά">
              <Input type="number" min="0" value={sortOrder}
                onChange={(e) => setSortOrder(Number(e.target.value))} />
            </Field>
          </div>
          <div className="flex gap-2 pt-2">
            {zone && (
              <Button variant="outline" onClick={del} disabled={isPending} className="gap-2">
                <Trash2 className="size-4 text-rose-500" />
              </Button>
            )}
            <Button variant="outline" onClick={onClose} className="ml-auto">Ακύρωση</Button>
            <Button onClick={save} disabled={isPending}>
              <Save className="mr-2 size-4" /> Αποθήκευση
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}
