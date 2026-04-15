"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRealtimeTables } from "@/lib/hooks/use-realtime-tables";
import type { DbTable, DbZone, TableStatus } from "@/lib/types/database";

interface TablesViewProps {
  initialTables: DbTable[];
  zones: DbZone[];
}

const statusConfig: Record<
  TableStatus,
  { label: string; bg: string; border: string; text: string }
> = {
  available: {
    label: "Διαθέσιμο",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/50",
    text: "text-emerald-600",
  },
  occupied: {
    label: "Κατειλημμένο",
    bg: "bg-amber-500/10",
    border: "border-amber-500/50",
    text: "text-amber-600",
  },
  "bill-requested": {
    label: "Λογαριασμός",
    bg: "bg-blue-500/10",
    border: "border-blue-500/50",
    text: "text-blue-600",
  },
  dirty: {
    label: "Καθαρισμός",
    bg: "bg-gray-500/10",
    border: "border-gray-500/50",
    text: "text-gray-500",
  },
};

export function TablesView({ initialTables, zones }: TablesViewProps) {
  const tables = useRealtimeTables(initialTables);
  const router = useRouter();
  const [activeZone, setActiveZone] = useState("all");

  const filteredTables =
    activeZone === "all"
      ? tables
      : tables.filter((t) => t.zone_id === activeZone);

  const handleTableClick = (table: DbTable) => {
    if (table.status === "bill-requested") {
      router.push(`/checkout/${table.id}`);
    } else if (table.status === "dirty") {
      router.push(`/orders/${table.id}`);
    } else {
      router.push(`/orders/${table.id}`);
    }
  };

  return (
    <div>
      <Tabs value={activeZone} onValueChange={setActiveZone}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="all">Όλα ({tables.length})</TabsTrigger>
          {zones.map((zone) => {
            const count = tables.filter((t) => t.zone_id === zone.id).length;
            return (
              <TabsTrigger key={zone.id} value={zone.id}>
                <span
                  className="mr-1.5 inline-block size-2.5 rounded-full"
                  style={{ backgroundColor: zone.color }}
                />
                {zone.name} ({count})
              </TabsTrigger>
            );
          })}
        </TabsList>
      </Tabs>

      <div className="mt-4">
        {/* Status summary */}
        <div className="mb-4 flex flex-wrap gap-3">
          {(
            Object.entries(statusConfig) as [
              TableStatus,
              (typeof statusConfig)[TableStatus],
            ][]
          ).map(([status, config]) => {
            const count = filteredTables.filter(
              (t) => t.status === status,
            ).length;
            if (count === 0) return null;
            return (
              <Badge
                key={status}
                variant="outline"
                className={`${config.text} gap-1`}
              >
                <span
                  className={`inline-block size-2 rounded-full ${config.bg}`}
                />
                {count} {config.label}
              </Badge>
            );
          })}
        </div>

        {/* Table grid */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {filteredTables.map((table) => {
            const config = statusConfig[table.status];
            return (
              <Card
                key={table.id}
                className={`cursor-pointer border-2 transition-all hover:scale-[1.02] active:scale-95 ${config.bg} ${config.border}`}
                onClick={() => handleTableClick(table)}
              >
                <CardContent className="flex flex-col items-center justify-center p-4">
                  <span className="text-2xl font-bold">{table.number}</span>
                  <span className="text-xs text-muted-foreground">
                    {table.capacity} άτομα
                  </span>
                  <Badge
                    variant="secondary"
                    className={`mt-2 text-xs ${config.text}`}
                  >
                    {config.label}
                  </Badge>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
