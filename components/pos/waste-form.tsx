"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useInventory } from "@/hooks/use-inventory";
import { useWaste } from "@/hooks/use-waste";
import type { WasteReason } from "@/lib/types";

const REASON_LABELS: Record<WasteReason, string> = {
  expired: "Ληγμένο",
  damaged: "Κατεστραμμένο",
  overproduction: "Υπερπαραγωγή",
  returned: "Επιστροφή",
};

const DEFAULT_FORM = {
  ingredientId: "",
  quantity: "",
  reason: "" as WasteReason | "",
  notes: "",
};

export function WasteForm() {
  const { ingredients } = useInventory();
  const { addWasteEntry } = useWaste();
  const [form, setForm] = useState(DEFAULT_FORM);

  const selectedIngredient = ingredients.find(
    (i) => i.id === form.ingredientId,
  );

  const isValid =
    form.ingredientId !== "" &&
    form.quantity !== "" &&
    parseFloat(form.quantity) > 0 &&
    form.reason !== "";

  const update = (field: keyof typeof form) => (value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = () => {
    if (!isValid || form.reason === "") return;
    addWasteEntry(
      form.ingredientId,
      parseFloat(form.quantity),
      form.reason as WasteReason,
      form.notes.trim() || undefined,
    );
    setForm(DEFAULT_FORM);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Καταγραφή Σπατάλης</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <Label>Υλικό</Label>
            <Select
              value={form.ingredientId}
              onValueChange={update("ingredientId")}
            >
              <SelectTrigger>
                <SelectValue placeholder="Επιλέξτε υλικό" />
              </SelectTrigger>
              <SelectContent>
                {ingredients.map((ing) => (
                  <SelectItem key={ing.id} value={ing.id}>
                    {ing.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>
              Ποσότητα
              {selectedIngredient && (
                <span className="ml-1 text-muted-foreground">
                  ({selectedIngredient.unit})
                </span>
              )}
            </Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={form.quantity}
              onChange={(e) => update("quantity")(e.target.value)}
              placeholder="0"
            />
          </div>

          <div className="space-y-2">
            <Label>Λόγος</Label>
            <Select value={form.reason} onValueChange={update("reason")}>
              <SelectTrigger>
                <SelectValue placeholder="Επιλέξτε λόγο" />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(REASON_LABELS) as WasteReason[]).map((reason) => (
                  <SelectItem key={reason} value={reason}>
                    {REASON_LABELS[reason]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Σημειώσεις (προαιρετικά)</Label>
            <Textarea
              value={form.notes}
              onChange={(e) => update("notes")(e.target.value)}
              placeholder="Προαιρετικές σημειώσεις…"
              rows={1}
              className="resize-none"
            />
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <Button onClick={handleSubmit} disabled={!isValid}>
            Καταγραφή
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
