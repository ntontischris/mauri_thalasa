"use client";

import { useState } from "react";
import type { DbFloorLayout } from "@/lib/types/floor-layouts";
import {
  createLayout,
  activateLayout,
  deleteLayout,
} from "@/lib/actions/floor-layouts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Props = {
  layouts: DbFloorLayout[];
  floorId: string;
};

export function LayoutsPanel({ layouts, floorId }: Props) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("");
  const [fromCurrent, setFromCurrent] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function handleActivate(layoutId: string, force = false) {
    setError(null);
    const result = await activateLayout({ layoutId, force });
    if (!result.success) {
      const errMsg = result.error ?? "";
      if (errMsg.startsWith("BLOCKED:")) {
        const numbers = errMsg.replace("BLOCKED:", "");
        if (
          confirm(`Τα τραπέζια ${numbers} είναι κατειλημμένα. Force switch;`)
        ) {
          await handleActivate(layoutId, true);
        }
      } else {
        setError(errMsg);
      }
    }
  }

  return (
    <div className="p-3 flex flex-col gap-2">
      <h3 className="text-sm font-semibold">Διατάξεις</h3>

      {layouts.map((l) => (
        <div
          key={l.id}
          className={`flex items-center gap-2 rounded border p-2 ${l.is_active ? "border-primary bg-primary/10" : ""}`}
        >
          <span>{l.icon ?? "📋"}</span>
          <span className="flex-1 text-sm">{l.name}</span>
          {!l.is_active && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleActivate(l.id)}
            >
              Εφαρμογή
            </Button>
          )}
          {!l.is_active && (
            <Button
              size="sm"
              variant="ghost"
              onClick={async () => {
                if (confirm(`Διαγραφή της διάταξης "${l.name}";`)) {
                  await deleteLayout(l.id);
                }
              }}
            >
              ×
            </Button>
          )}
        </div>
      ))}

      {error && <p className="text-xs text-destructive">{error}</p>}

      {adding ? (
        <div className="rounded border p-2 flex flex-col gap-2">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Όνομα (Καλοκαίρι, Χειμώνας...)"
          />
          <Input
            value={icon}
            onChange={(e) => setIcon(e.target.value)}
            placeholder="Emoji (☀ ❄ 🎉)"
            maxLength={2}
          />
          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={fromCurrent}
              onChange={(e) => setFromCurrent(e.target.checked)}
            />
            Ξεκίνα από την τωρινή διάταξη
          </label>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>
              Ακύρωση
            </Button>
            <Button
              size="sm"
              onClick={async () => {
                if (!name.trim()) return;
                await createLayout({
                  floorId,
                  name,
                  icon: icon || undefined,
                  fromCurrent,
                });
                setName("");
                setIcon("");
                setAdding(false);
              }}
            >
              Δημιουργία
            </Button>
          </div>
        </div>
      ) : (
        <Button variant="outline" size="sm" onClick={() => setAdding(true)}>
          + Νέα διάταξη
        </Button>
      )}
    </div>
  );
}
