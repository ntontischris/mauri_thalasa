"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSuppliers } from "@/hooks/use-suppliers";
import type {
  Ingredient,
  IngredientCategory,
  IngredientUnit,
} from "@/lib/types";

interface IngredientFormProps {
  ingredient?: Ingredient;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: Omit<Ingredient, "id">) => void;
}

const CATEGORY_LABELS: Record<IngredientCategory, string> = {
  seafood: "Θαλασσινά",
  meat: "Κρέας",
  dairy: "Γαλακτοκομικά",
  vegetables: "Λαχανικά",
  dry: "Ξηρά",
  drinks: "Ποτά",
  other: "Άλλο",
};

const UNIT_OPTIONS: IngredientUnit[] = ["kg", "lt", "pcs", "gr", "ml"];

const DEFAULT_FORM = {
  name: "",
  category: "other" as IngredientCategory,
  unit: "kg" as IngredientUnit,
  currentStock: "",
  minStock: "",
  costPerUnit: "",
  supplierId: "",
};

export function IngredientForm({
  ingredient,
  open,
  onOpenChange,
  onSave,
}: IngredientFormProps) {
  const { suppliers } = useSuppliers();
  const [form, setForm] = useState(DEFAULT_FORM);

  useEffect(() => {
    if (ingredient) {
      setForm({
        name: ingredient.name,
        category: ingredient.category,
        unit: ingredient.unit,
        currentStock: ingredient.currentStock.toString(),
        minStock: ingredient.minStock.toString(),
        costPerUnit: ingredient.costPerUnit.toString(),
        supplierId: ingredient.supplierId ?? "",
      });
    } else {
      setForm(DEFAULT_FORM);
    }
  }, [ingredient, open]);

  const isValid =
    form.name.trim() !== "" &&
    form.currentStock !== "" &&
    form.minStock !== "" &&
    form.costPerUnit !== "";

  const handleSave = () => {
    if (!isValid) return;
    onSave({
      name: form.name.trim(),
      category: form.category,
      unit: form.unit,
      currentStock: parseFloat(form.currentStock) || 0,
      minStock: parseFloat(form.minStock) || 0,
      costPerUnit: parseFloat(form.costPerUnit) || 0,
      supplierId: form.supplierId || undefined,
    });
  };

  const update = (field: keyof typeof form) => (value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {ingredient ? "Επεξεργασία Πρώτης Ύλης" : "Νέα Πρώτη Ύλη"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ing-name">Όνομα</Label>
            <Input
              id="ing-name"
              value={form.name}
              onChange={(e) => update("name")(e.target.value)}
              placeholder="π.χ. Φιλέτο λαβρακιού"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Κατηγορία</Label>
              <Select value={form.category} onValueChange={update("category")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(CATEGORY_LABELS) as IngredientCategory[]).map(
                    (cat) => (
                      <SelectItem key={cat} value={cat}>
                        {CATEGORY_LABELS[cat]}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Μονάδα</Label>
              <Select value={form.unit} onValueChange={update("unit")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {UNIT_OPTIONS.map((unit) => (
                    <SelectItem key={unit} value={unit}>
                      {unit}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ing-stock">Τρέχον Απόθεμα</Label>
              <Input
                id="ing-stock"
                type="number"
                min="0"
                step="0.01"
                value={form.currentStock}
                onChange={(e) => update("currentStock")(e.target.value)}
                placeholder="0"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ing-min">Ελάχιστο Απόθεμα</Label>
              <Input
                id="ing-min"
                type="number"
                min="0"
                step="0.01"
                value={form.minStock}
                onChange={(e) => update("minStock")(e.target.value)}
                placeholder="0"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ing-cost">Κόστος ανά Μονάδα (€)</Label>
            <Input
              id="ing-cost"
              type="number"
              min="0"
              step="0.01"
              value={form.costPerUnit}
              onChange={(e) => update("costPerUnit")(e.target.value)}
              placeholder="0.00"
            />
          </div>

          <div className="space-y-2">
            <Label>Προμηθευτής (προαιρετικά)</Label>
            <Select
              value={form.supplierId || "none"}
              onValueChange={(v) => update("supplierId")(v === "none" ? "" : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Επιλέξτε προμηθευτή" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— Κανένας —</SelectItem>
                {suppliers.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Ακύρωση
          </Button>
          <Button onClick={handleSave} disabled={!isValid}>
            {ingredient ? "Αποθήκευση" : "Προσθήκη"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
