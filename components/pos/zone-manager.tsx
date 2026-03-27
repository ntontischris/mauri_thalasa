"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTableLayout } from "@/hooks/use-table-layout";
import type { Zone } from "@/lib/types";

const PRESET_COLORS = [
  { label: "Blue", value: "#3b82f6" },
  { label: "Green", value: "#22c55e" },
  { label: "Amber", value: "#f59e0b" },
  { label: "Red", value: "#ef4444" },
  { label: "Purple", value: "#a855f7" },
  { label: "Pink", value: "#ec4899" },
];

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
}

function ColorPicker({ value, onChange }: ColorPickerProps) {
  return (
    <div className="flex gap-1.5">
      {PRESET_COLORS.map((color) => (
        <button
          key={color.value}
          type="button"
          title={color.label}
          onClick={() => onChange(color.value)}
          className="size-6 rounded-full border-2 transition-all"
          style={{
            backgroundColor: color.value,
            borderColor: value === color.value ? "#000" : "transparent",
            outline: value === color.value ? "2px solid #fff" : "none",
            outlineOffset: "-3px",
          }}
        />
      ))}
    </div>
  );
}

interface AddZoneFormProps {
  onSave: (name: string, color: string) => void;
  onCancel: () => void;
}

function AddZoneForm({ onSave, onCancel }: AddZoneFormProps) {
  const [name, setName] = useState("");
  const [color, setColor] = useState(PRESET_COLORS[0].value);

  const handleSave = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onSave(trimmed, color);
  };

  return (
    <div className="rounded-lg border border-border bg-muted/40 p-3 space-y-3">
      <Input
        autoFocus
        placeholder="Όνομα ζώνης..."
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSave();
          if (e.key === "Escape") onCancel();
        }}
      />
      <ColorPicker value={color} onChange={setColor} />
      <div className="flex gap-2">
        <Button size="sm" onClick={handleSave} disabled={!name.trim()}>
          Αποθήκευση
        </Button>
        <Button size="sm" variant="outline" onClick={onCancel}>
          Ακύρωση
        </Button>
      </div>
    </div>
  );
}

interface EditZoneFormProps {
  zone: Zone;
  onSave: (zone: Zone) => void;
  onCancel: () => void;
}

function EditZoneForm({ zone, onSave, onCancel }: EditZoneFormProps) {
  const [name, setName] = useState(zone.name);
  const [color, setColor] = useState(zone.color);

  const handleSave = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onSave({ ...zone, name: trimmed, color });
  };

  return (
    <div className="rounded-lg border border-border bg-muted/40 p-3 space-y-3">
      <Input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSave();
          if (e.key === "Escape") onCancel();
        }}
      />
      <ColorPicker value={color} onChange={setColor} />
      <div className="flex gap-2">
        <Button size="sm" onClick={handleSave} disabled={!name.trim()}>
          Αποθήκευση
        </Button>
        <Button size="sm" variant="outline" onClick={onCancel}>
          Ακύρωση
        </Button>
      </div>
    </div>
  );
}

export function ZoneManager() {
  const { zones, addZone, updateZone, deleteZone } = useTableLayout();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleAdd = (name: string, color: string) => {
    addZone(name, color);
    setIsAdding(false);
  };

  const handleUpdate = (zone: Zone) => {
    updateZone(zone);
    setEditingId(null);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Ζώνες</h3>
        {!isAdding && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setIsAdding(true);
              setEditingId(null);
            }}
          >
            <Plus className="size-3.5 mr-1" />
            Νέα Ζώνη
          </Button>
        )}
      </div>

      <div className="space-y-1.5">
        {zones
          .sort((a, b) => a.order - b.order)
          .map((zone) =>
            editingId === zone.id ? (
              <EditZoneForm
                key={zone.id}
                zone={zone}
                onSave={handleUpdate}
                onCancel={() => setEditingId(null)}
              />
            ) : (
              <div
                key={zone.id}
                className="flex items-center justify-between rounded-lg border border-border px-3 py-2"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="size-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: zone.color }}
                  />
                  <span className="text-sm">{zone.name}</span>
                </div>
                <div className="flex gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-7"
                    onClick={() => {
                      setEditingId(zone.id);
                      setIsAdding(false);
                    }}
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-7 text-destructive hover:text-destructive"
                    onClick={() => deleteZone(zone.id)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
            ),
          )}

        {zones.length === 0 && !isAdding && (
          <p className="text-sm text-muted-foreground text-center py-3">
            Δεν υπάρχουν ζώνες. Προσθέστε μια νέα.
          </p>
        )}

        {isAdding && (
          <AddZoneForm onSave={handleAdd} onCancel={() => setIsAdding(false)} />
        )}
      </div>
    </div>
  );
}
