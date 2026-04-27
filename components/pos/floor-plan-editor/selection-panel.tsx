"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { DbTable, DbZone, TableShape } from "@/lib/types/database";
import { upsertTable, deleteTable } from "@/lib/actions/floor-plan";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Props = {
  table: DbTable | null;
  zones: DbZone[];
  onChange: (next: DbTable) => void;
};

export function SelectionPanel({ table, zones, onChange }: Props) {
  const router = useRouter();
  const [rotation, setRotation] = useState(table?.rotation ?? 0);
  useEffect(() => {
    if (table) setRotation(table.rotation);
  }, [table?.id, table?.rotation]);

  if (!table) {
    return (
      <p className="p-3 text-xs text-muted-foreground">
        Επίλεξε τραπέζι για επεξεργασία.
      </p>
    );
  }

  return (
    <div className="p-3 flex flex-col gap-3">
      <h3 className="text-sm font-semibold">Τραπέζι #{table.number}</h3>

      <div>
        <Label htmlFor="number">Νούμερο</Label>
        <Input
          id="number"
          type="number"
          defaultValue={table.number}
          onBlur={async (e) => {
            const n = parseInt(e.target.value, 10);
            if (!Number.isFinite(n) || n === table.number) return;
            await upsertTable({ ...table, number: n });
            onChange({ ...table, number: n });
          }}
        />
      </div>

      <div>
        <Label htmlFor="capacity">Χωρητικότητα</Label>
        <Input
          id="capacity"
          type="number"
          defaultValue={table.capacity}
          onBlur={async (e) => {
            const c = parseInt(e.target.value, 10);
            if (!Number.isFinite(c) || c === table.capacity) return;
            await upsertTable({ ...table, capacity: c });
            onChange({ ...table, capacity: c });
          }}
        />
      </div>

      <div>
        <Label htmlFor="shape">Σχήμα</Label>
        <Select
          value={table.shape}
          onValueChange={async (v) => {
            const shape = v as TableShape;
            await upsertTable({ ...table, shape });
            onChange({ ...table, shape });
          }}
        >
          <SelectTrigger id="shape">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="square">Τετράγωνο</SelectItem>
            <SelectItem value="round">Στρογγυλό</SelectItem>
            <SelectItem value="rectangle">Ορθογώνιο</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Διαστάσεις</Label>
        <div className="flex gap-2">
          <Input
            type="number"
            defaultValue={table.width}
            onBlur={async (e) => {
              const w = parseInt(e.target.value, 10);
              if (!Number.isFinite(w) || w === table.width) return;
              await upsertTable({ ...table, width: w });
              onChange({ ...table, width: w });
            }}
          />
          <Input
            type="number"
            defaultValue={table.height}
            onBlur={async (e) => {
              const h = parseInt(e.target.value, 10);
              if (!Number.isFinite(h) || h === table.height) return;
              await upsertTable({ ...table, height: h });
              onChange({ ...table, height: h });
            }}
          />
        </div>
      </div>

      <div>
        <Label>Ζώνη</Label>
        <Select
          value={table.zone_id ?? ""}
          onValueChange={async (v) => {
            await upsertTable({ ...table, zone_id: v });
            onChange({ ...table, zone_id: v });
          }}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {zones.map((z) => (
              <SelectItem key={z.id} value={z.id}>
                {z.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Περιστροφή</Label>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={async () => {
              const r = (rotation - 15 + 360) % 360;
              setRotation(r);
              await upsertTable({ ...table, rotation: r });
              onChange({ ...table, rotation: r });
            }}
          >
            -15°
          </Button>
          <span className="self-center text-sm">{rotation}°</span>
          <Button
            size="sm"
            variant="outline"
            onClick={async () => {
              const r = (rotation + 15) % 360;
              setRotation(r);
              await upsertTable({ ...table, rotation: r });
              onChange({ ...table, rotation: r });
            }}
          >
            +15°
          </Button>
        </div>
      </div>

      <Button
        variant="destructive"
        size="sm"
        onClick={async () => {
          if (confirm(`Διαγραφή τραπεζιού #${table.number};`)) {
            const result = await deleteTable(table.id);
            if (!result.success) {
              alert(`Σφάλμα διαγραφής: ${result.error ?? "unknown"}`);
              return;
            }
            router.refresh();
          }
        }}
      >
        Διαγραφή
      </Button>
    </div>
  );
}
