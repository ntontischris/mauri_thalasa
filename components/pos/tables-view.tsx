"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  LayoutGrid,
  Map as MapIcon,
  Search,
  Users,
  Clock,
  Euro,
  Sparkles,
  Filter,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useRealtimeTables } from "@/lib/hooks/use-realtime-tables";
import type {
  DbTable,
  DbZone,
  DbFloor,
  TableStatus,
} from "@/lib/types/database";
import type { TableLiveData } from "@/lib/queries/tables-enriched";

interface TablesViewProps {
  initialTables: DbTable[];
  zones: DbZone[];
  floors: DbFloor[];
  liveData: TableLiveData[];
}

const statusConfig: Record<
  TableStatus,
  { label: string; bg: string; border: string; text: string; dot: string }
> = {
  available: {
    label: "Διαθέσιμο",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/50",
    text: "text-emerald-600",
    dot: "bg-emerald-500",
  },
  occupied: {
    label: "Κατειλημμένο",
    bg: "bg-amber-500/10",
    border: "border-amber-500/50",
    text: "text-amber-600",
    dot: "bg-amber-500",
  },
  "bill-requested": {
    label: "Λογαριασμός",
    bg: "bg-blue-500/10",
    border: "border-blue-500/50",
    text: "text-blue-600",
    dot: "bg-blue-500",
  },
  dirty: {
    label: "Καθαρισμός",
    bg: "bg-gray-500/10",
    border: "border-gray-500/50",
    text: "text-gray-500",
    dot: "bg-gray-500",
  },
};

function formatPrice(n: number): string {
  return new Intl.NumberFormat("el-GR", {
    style: "currency",
    currency: "EUR",
  }).format(n);
}

function formatDuration(ms: number): string {
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins}′`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m}′`;
}

function durationColor(ms: number): string {
  const mins = ms / 60000;
  if (mins < 45) return "text-emerald-600";
  if (mins < 90) return "text-amber-600";
  return "text-rose-600";
}

type ViewMode = "grid" | "floor";

export function TablesView({
  initialTables,
  zones,
  floors,
  liveData,
}: TablesViewProps) {
  const tables = useRealtimeTables(initialTables);
  const router = useRouter();
  const [activeFloorId, setActiveFloorId] = useState<string>(() => {
    // Prefer first floor that actually contains tables (via its zones), so adding
    // an empty new floor doesn't leave the page looking blank by default.
    const tableZoneIds = new Set(initialTables.map((t) => t.zone_id));
    const populated = floors.find((f) =>
      zones.some((z) => z.floor_id === f.id && tableZoneIds.has(z.id)),
    );
    return populated?.id ?? floors[0]?.id ?? "";
  });
  const [activeZone, setActiveZone] = useState("all");
  const [statusFilter, setStatusFilter] = useState<TableStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("floor");
  const [nowTs, setNowTs] = useState<number>(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNowTs(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);

  const liveByTable = useMemo<Map<string, TableLiveData>>(() => {
    const m: Map<string, TableLiveData> = new Map();
    for (const l of liveData) m.set(l.table_id, l);
    return m;
  }, [liveData]);

  const activeFloor = floors.find((f) => f.id === activeFloorId) ?? floors[0] ?? null;
  const floorZones = useMemo(
    () => zones.filter((z) => z.floor_id === activeFloor?.id),
    [zones, activeFloor],
  );
  const floorZoneIds = new Set(floorZones.map((z) => z.id));

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return tables
      .filter((t) => floorZoneIds.has(t.zone_id))
      .filter((t) => activeZone === "all" || t.zone_id === activeZone)
      .filter((t) => statusFilter === "all" || t.status === statusFilter)
      .filter((t) => {
        if (!term) return true;
        const live = liveByTable.get(t.id);
        return (
          String(t.number).includes(term) ||
          (t.label ?? "").toLowerCase().includes(term) ||
          (live?.customer_name ?? "").toLowerCase().includes(term) ||
          (live?.server_name ?? "").toLowerCase().includes(term)
        );
      });
  }, [tables, floorZoneIds, activeZone, statusFilter, search, liveByTable]);

  // KPIs (across whole restaurant, not filtered)
  const kpis = useMemo(() => {
    const now = nowTs;
    const activeOrders = liveData.length;
    const totalGuests = liveData.reduce((s, l) => s + l.guest_count, 0);
    const revenueInService = liveData.reduce((s, l) => s + l.subtotal, 0);
    const totalDuration = liveData.reduce(
      (s, l) => s + (now - new Date(l.opened_at).getTime()),
      0,
    );
    const avgDuration = activeOrders > 0 ? totalDuration / activeOrders : 0;
    const available = tables.filter((t) => t.status === "available").length;
    const occupancy =
      tables.length > 0
        ? Math.round(
            (tables.filter((t) => t.status !== "available").length /
              tables.length) *
              100,
          )
        : 0;
    return {
      available,
      activeOrders,
      totalGuests,
      revenueInService,
      avgDuration,
      occupancy,
    };
  }, [liveData, tables, nowTs]);

  const handleTableClick = (table: DbTable) => {
    if (table.status === "bill-requested") router.push(`/checkout/${table.id}`);
    else router.push(`/orders/${table.id}`);
  };

  return (
    <div className="space-y-4">
      {/* KPI bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        <Kpi label="Διαθέσιμα" value={String(kpis.available)} icon={<LayoutGrid className="size-4" />} />
        <Kpi label="Ενεργές" value={String(kpis.activeOrders)} icon={<Sparkles className="size-4" />} />
        <Kpi label="Καλεσμένοι" value={String(kpis.totalGuests)} icon={<Users className="size-4" />} />
        <Kpi label="Σε Service" value={formatPrice(kpis.revenueInService)} icon={<Euro className="size-4" />} />
        <Kpi label="Μέσος χρόνος" value={kpis.avgDuration > 0 ? formatDuration(kpis.avgDuration) : "—"} icon={<Clock className="size-4" />} />
        <Kpi label="Πληρότητα" value={`${kpis.occupancy}%`} icon={<Filter className="size-4" />} />
      </div>

      {/* Floor tabs */}
      {floors.length > 1 && (
        <div className="flex flex-wrap gap-1 border-b pb-1">
          {floors.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => { setActiveFloorId(f.id); setActiveZone("all"); }}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition",
                activeFloorId === f.id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted",
              )}
            >
              {f.name}
            </button>
          ))}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input placeholder="Αριθμός / πελάτης / σερβιτόρος..."
            value={search} onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-9" />
        </div>

        <div className="flex gap-1 rounded-md border p-0.5">
          <Button size="sm" variant={activeZone === "all" ? "default" : "ghost"}
            className="h-7 px-2 text-xs" onClick={() => setActiveZone("all")}>
            Όλες
          </Button>
          {floorZones.map((z) => (
            <Button key={z.id} size="sm"
              variant={activeZone === z.id ? "default" : "ghost"}
              className="h-7 px-2 text-xs gap-1"
              onClick={() => setActiveZone(z.id)}>
              <span className="size-2 rounded-full" style={{ backgroundColor: z.color }} />
              {z.name}
            </Button>
          ))}
        </div>

        <div className="flex gap-1 rounded-md border p-0.5">
          {(["all", "available", "occupied", "bill-requested", "dirty"] as const).map((s) => (
            <Button key={s} size="sm"
              variant={statusFilter === s ? "default" : "ghost"}
              className="h-7 px-2 text-xs"
              onClick={() => setStatusFilter(s)}>
              {s === "all" ? "Όλα" : statusConfig[s].label}
            </Button>
          ))}
        </div>

        <div className="flex gap-1 rounded-md border p-0.5 ml-auto">
          <Button size="sm" variant={viewMode === "grid" ? "default" : "ghost"}
            className="h-7 px-2 gap-1" onClick={() => setViewMode("grid")}>
            <LayoutGrid className="size-3.5" /> Grid
          </Button>
          <Button size="sm" variant={viewMode === "floor" ? "default" : "ghost"}
            className="h-7 px-2 gap-1" onClick={() => setViewMode("floor")}>
            <MapIcon className="size-3.5" /> Κάτοψη
          </Button>
        </div>
      </div>

      {/* Content */}
      {viewMode === "grid" ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {filtered.map((t) => (
            <TableCard
              key={t.id}
              table={t}
              zone={zones.find((z) => z.id === t.zone_id) ?? null}
              live={liveByTable.get(t.id) ?? null}
              nowTs={nowTs}
              onClick={() => handleTableClick(t)}
            />
          ))}
          {filtered.length === 0 && (
            <Card className="col-span-full">
              <CardContent className="py-12 text-center text-sm text-muted-foreground">
                Κανένα τραπέζι δεν ταιριάζει.
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        <FloorPlanView
          floor={activeFloor}
          tables={filtered}
          zones={zones}
          liveByTable={liveByTable}
          nowTs={nowTs}
          onTableClick={handleTableClick}
        />
      )}
    </div>
  );
}

// ───────────────── Rich table card (Grid mode) ─────────────────
function TableCard({
  table,
  zone,
  live,
  nowTs,
  onClick,
}: {
  table: DbTable;
  zone: DbZone | null;
  live: TableLiveData | null;
  nowTs: number;
  onClick: () => void;
}) {
  const config = statusConfig[table.status];
  const duration = live ? nowTs - new Date(live.opened_at).getTime() : 0;
  const isOverdue = duration > 90 * 60000;

  return (
    <Card
      onClick={onClick}
      className={cn(
        "cursor-pointer border-2 transition-all hover:scale-[1.02] active:scale-95",
        config.bg,
        config.border,
        isOverdue && "ring-2 ring-rose-500/50",
      )}
    >
      <CardContent className="p-3 space-y-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className={cn("size-2 rounded-full shrink-0", config.dot)} />
            <span className="text-xs text-muted-foreground truncate">
              {zone?.name ?? "—"}
            </span>
          </div>
          {live && (
            <Badge variant="outline" className="h-5 px-1.5 text-[10px] font-mono gap-0.5">
              <Users className="size-2.5" /> {live.guest_count}
            </Badge>
          )}
        </div>

        <div className="flex items-baseline justify-center gap-1">
          <span className="text-3xl font-bold leading-none">{table.label ?? table.number}</span>
        </div>

        {live ? (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className={cn("font-mono flex items-center gap-0.5", durationColor(duration))}>
                <Clock className="size-3" /> {formatDuration(duration)}
              </span>
              <span className="font-mono font-bold">{formatPrice(live.subtotal)}</span>
            </div>
            {live.customer_name && (
              <p className="text-[10px] text-muted-foreground truncate">
                {live.customer_name}
              </p>
            )}
            {live.server_name && (
              <p className="text-[10px] text-muted-foreground truncate">
                {live.server_name}
              </p>
            )}
          </div>
        ) : (
          <p className={cn("text-xs text-center", config.text)}>{config.label}</p>
        )}

        <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t">
          <span className="flex items-center gap-0.5">
            <Users className="size-2.5" /> {table.capacity}
          </span>
          {live && (
            <span>{live.item_count} προϊόντα</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ───────────────── Floor plan view ─────────────────
function FloorPlanView({
  floor,
  tables,
  zones,
  liveByTable,
  nowTs,
  onTableClick,
}: {
  floor: DbFloor | null;
  tables: DbTable[];
  zones: DbZone[];
  liveByTable: Map<string, TableLiveData>;
  nowTs: number;
  onTableClick: (t: DbTable) => void;
}) {
  if (!floor) {
    return (
      <Card>
        <CardContent className="py-16 text-center text-sm text-muted-foreground">
          Δημιούργησε κάτοψη στις <span className="text-primary">Ρυθμίσεις → Κάτοψη</span>.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0 overflow-auto">
        <svg
          viewBox={`0 0 ${floor.width} ${floor.height}`}
          className="w-full bg-muted/20"
          style={{ aspectRatio: `${floor.width} / ${floor.height}`, maxHeight: "70vh" }}
        >
          <defs>
            <pattern id="grid-live" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="hsl(var(--muted-foreground))" strokeOpacity="0.15" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid-live)" />

          {tables.map((t) => {
            const zone = zones.find((z) => z.id === t.zone_id) ?? null;
            const live = liveByTable.get(t.id) ?? null;
            const cfg = statusConfig[t.status];
            const w = t.width ?? 80;
            const h = t.height ?? 80;
            const duration = live ? nowTs - new Date(live.opened_at).getTime() : 0;
            const isOverdue = duration > 90 * 60000;

            const fillColor = zone?.color ?? "#6366f1";

            const body = t.shape === "round" ? (
              <ellipse cx={w / 2} cy={h / 2} rx={w / 2} ry={h / 2}
                fill={fillColor}
                stroke="#000" strokeWidth={1} />
            ) : (
              <rect width={w} height={h} rx={4} ry={4}
                fill={fillColor}
                stroke="#000" strokeWidth={1} />
            );

            return (
              <g key={t.id}
                transform={`translate(${t.x}, ${t.y}) rotate(${t.rotation}, ${w / 2}, ${h / 2})`}
                onClick={() => onTableClick(t)}
                style={{ cursor: "pointer" }}
                className="transition hover:opacity-80">
                {body}
                {isOverdue && (
                  <rect width={w} height={h} rx={8} ry={8} fill="none"
                    stroke="rgb(244 63 94)" strokeWidth={3} strokeDasharray="4 2" />
                )}
                <text x={w / 2} y={h / 2 - 4} textAnchor="middle"
                  fontSize={Math.min(w, h) * 0.28} fontWeight="700" fill="#000">
                  {t.label ?? t.number}
                </text>
                {live && (
                  <text x={w / 2} y={h / 2 + 12} textAnchor="middle"
                    fontSize="9" fontWeight="600"
                    fill={cfg.dot.replace("bg-", "").startsWith("amber") ? "#ca8a04" : "#334155"}>
                    {formatDuration(duration)} · {formatPrice(live.subtotal)}
                  </text>
                )}
                <circle cx={w - 6} cy={6} r={4}
                  className={cn(cfg.dot)} fill="currentColor" />
              </g>
            );
          })}
        </svg>
      </CardContent>
    </Card>
  );
}

function Kpi({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="p-2.5">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-full bg-primary/10 text-primary shrink-0">
            {icon}
          </div>
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
              {label}
            </p>
            <p className="text-sm font-bold truncate">{value}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
