"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ModifierChips } from "./modifier-chips";
import { fetchProductModifiers } from "@/lib/actions/orders";
import type { DbProduct, DbModifier } from "@/lib/types/database";

export interface ModifierSelection {
  modifierId: string;
  name: string;
  price: number;
}

interface ModifierDialogProps {
  product: DbProduct | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (
    product: DbProduct,
    modifiers: ModifierSelection[],
    notes: string,
    course: number,
  ) => void;
  defaultCourse: number;
}

export function ModifierDialog({
  product,
  open,
  onOpenChange,
  onConfirm,
  defaultCourse,
}: ModifierDialogProps) {
  const [modifiers, setModifiers] = useState<DbModifier[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [course, setCourse] = useState(defaultCourse);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!product) return;
    setSelectedIds([]);
    setNotes("");
    setCourse(defaultCourse);
    setLoading(true);
    fetchProductModifiers(product.id).then((result) => {
      setLoading(false);
      if (result.success) setModifiers(result.data ?? []);
      else setModifiers([]);
    });
  }, [product, defaultCourse]);

  const handleToggle = (modifierId: string) => {
    setSelectedIds((prev) =>
      prev.includes(modifierId)
        ? prev.filter((id) => id !== modifierId)
        : [...prev, modifierId],
    );
  };

  const handleConfirm = () => {
    if (!product) return;
    const selected: ModifierSelection[] = selectedIds
      .map((id) => modifiers.find((m) => m.id === id))
      .filter((m): m is DbModifier => Boolean(m))
      .map((m) => ({ modifierId: m.id, name: m.name, price: m.price }));
    onConfirm(product, selected, notes.trim(), course);
    onOpenChange(false);
  };

  if (!product) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{product.name}</DialogTitle>
          {product.description && (
            <DialogDescription>{product.description}</DialogDescription>
          )}
        </DialogHeader>

        <div className="space-y-4">
          {loading ? (
            <p className="text-sm text-muted-foreground">Φόρτωση...</p>
          ) : (
            <ModifierChips
              modifiers={modifiers}
              selectedIds={selectedIds}
              onToggle={handleToggle}
            />
          )}

          <div className="space-y-2">
            <Label htmlFor="item-notes">Σημειώσεις</Label>
            <Input
              id="item-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="π.χ. χωρίς αλάτι"
              maxLength={200}
            />
          </div>

          <div className="space-y-2">
            <Label>Πιάτο</Label>
            <div className="flex gap-2">
              {[1, 2, 3, 4].map((n) => (
                <Button
                  key={n}
                  type="button"
                  variant={course === n ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCourse(n)}
                  className="flex-1"
                >
                  {n}
                </Button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Ακύρωση
          </Button>
          <Button onClick={handleConfirm}>Προσθήκη</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
