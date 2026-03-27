"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { useInventory } from "@/hooks/use-inventory";
import { formatPrice } from "@/lib/mock-data";
import type { SupplierOrderItem } from "@/lib/types";

interface SupplierOrderFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DEFAULT_ITEM = {
  ingredientId: "",
  quantity: "",
};

export function SupplierOrderForm({
  open,
  onOpenChange,
}: SupplierOrderFormProps) {
  const { suppliers, createOrder } = useSuppliers();
  const { ingredients } = useInventory();

  const [supplierId, setSupplierId] = useState("");
  const [items, setItems] = useState<
    { ingredientId: string; quantity: string }[]
  >([]);
  const [currentItem, setCurrentItem] = useState(DEFAULT_ITEM);
  const [notes, setNotes] = useState("");

  const selectedIngredient = ingredients.find(
    (i) => i.id === currentItem.ingredientId,
  );

  const estimatedCost =
    selectedIngredient && currentItem.quantity !== ""
      ? selectedIngredient.costPerUnit * parseFloat(currentItem.quantity)
      : 0;

  const totalCost = items.reduce((sum, item) => {
    const ing = ingredients.find((i) => i.id === item.ingredientId);
    if (!ing || item.quantity === "") return sum;
    return sum + ing.costPerUnit * parseFloat(item.quantity);
  }, 0);

  const canAddItem =
    currentItem.ingredientId !== "" &&
    currentItem.quantity !== "" &&
    parseFloat(currentItem.quantity) > 0;

  const isValid = supplierId !== "" && items.length > 0;

  const handleAddItem = () => {
    if (!canAddItem) return;
    setItems((prev) => [...prev, { ...currentItem }]);
    setCurrentItem(DEFAULT_ITEM);
  };

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    if (!isValid) return;
    const orderItems: SupplierOrderItem[] = items.map((item) => {
      const ing = ingredients.find((i) => i.id === item.ingredientId);
      return {
        ingredientId: item.ingredientId,
        quantity: parseFloat(item.quantity),
        estimatedCost: ing ? ing.costPerUnit * parseFloat(item.quantity) : 0,
      };
    });
    createOrder(supplierId, orderItems, notes.trim() || undefined);
    setSupplierId("");
    setItems([]);
    setCurrentItem(DEFAULT_ITEM);
    setNotes("");
    onOpenChange(false);
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      setSupplierId("");
      setItems([]);
      setCurrentItem(DEFAULT_ITEM);
      setNotes("");
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Νέα Παραγγελία Προμηθευτή</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Supplier selection */}
          <div className="space-y-2">
            <Label>Προμηθευτής</Label>
            <Select value={supplierId} onValueChange={setSupplierId}>
              <SelectTrigger>
                <SelectValue placeholder="Επιλέξτε προμηθευτή" />
              </SelectTrigger>
              <SelectContent>
                {suppliers.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Add item row */}
          <div className="space-y-2">
            <Label>Προσθήκη Υλικού</Label>
            <div className="flex gap-2">
              <Select
                value={currentItem.ingredientId}
                onValueChange={(v) =>
                  setCurrentItem((prev) => ({ ...prev, ingredientId: v }))
                }
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Υλικό" />
                </SelectTrigger>
                <SelectContent>
                  {ingredients.map((ing) => (
                    <SelectItem key={ing.id} value={ing.id}>
                      {ing.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Input
                type="number"
                min="0"
                step="0.01"
                value={currentItem.quantity}
                onChange={(e) =>
                  setCurrentItem((prev) => ({
                    ...prev,
                    quantity: e.target.value,
                  }))
                }
                placeholder={selectedIngredient?.unit ?? "Ποσ."}
                className="w-24"
              />

              <Button
                variant="outline"
                size="icon"
                onClick={handleAddItem}
                disabled={!canAddItem}
              >
                <Plus className="size-4" />
              </Button>
            </div>
            {selectedIngredient && currentItem.quantity !== "" && (
              <p className="text-xs text-muted-foreground">
                Εκτ. κόστος: {formatPrice(estimatedCost)}
              </p>
            )}
          </div>

          {/* Items list */}
          {items.length > 0 && (
            <div className="space-y-1 rounded-md border border-border p-2">
              {items.map((item, index) => {
                const ing = ingredients.find((i) => i.id === item.ingredientId);
                const cost = ing
                  ? ing.costPerUnit * parseFloat(item.quantity)
                  : 0;
                return (
                  <div
                    key={index}
                    className="flex items-center justify-between gap-2 text-sm"
                  >
                    <span className="flex-1 truncate">{ing?.name ?? "—"}</span>
                    <span className="text-muted-foreground">
                      {item.quantity} {ing?.unit}
                    </span>
                    <span className="w-20 text-right font-medium">
                      {formatPrice(cost)}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-6 shrink-0"
                      onClick={() => handleRemoveItem(index)}
                    >
                      <Trash2 className="size-3" />
                    </Button>
                  </div>
                );
              })}
              <div className="mt-2 border-t border-border pt-2 text-right text-sm font-bold">
                Σύνολο: {formatPrice(totalCost)}
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label>Σημειώσεις (προαιρετικά)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Προαιρετικές σημειώσεις…"
              rows={2}
              className="resize-none"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)}>
            Ακύρωση
          </Button>
          <Button onClick={handleSubmit} disabled={!isValid}>
            Δημιουργία
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
