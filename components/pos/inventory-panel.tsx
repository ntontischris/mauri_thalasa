"use client";

import { useState, useTransition } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, AlertTriangle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  createIngredient,
  deleteIngredient,
  recordWaste,
} from "@/lib/actions/inventory";
import type {
  IngredientWithSupplier,
  WasteEntryWithIngredient,
  DbSupplier,
  IngredientCategory,
} from "@/lib/types/database";

interface InventoryPanelProps {
  initialIngredients: IngredientWithSupplier[];
  wasteLog: WasteEntryWithIngredient[];
  suppliers: DbSupplier[];
}

const categoryLabels: Record<IngredientCategory, string> = {
  seafood: "Θαλασσινά",
  meat: "Κρέατα",
  vegetables: "Λαχανικά",
  dairy: "Γαλακτοκομικά",
  dry: "Ξηρά",
  beverages: "Ποτά",
  other: "Άλλα",
};

const unitLabels: Record<string, string> = {
  kg: "κιλά",
  lt: "λίτρα",
  pcs: "τεμάχια",
  gr: "γραμμάρια",
  ml: "ml",
};

const wasteReasonLabels: Record<string, string> = {
  expired: "Ληγμένο",
  damaged: "Κατεστραμμένο",
  overproduction: "Υπερπαραγωγή",
  other: "Άλλο",
};

export function InventoryPanel({
  initialIngredients,
  wasteLog,
  suppliers,
}: InventoryPanelProps) {
  const [ingredients, setIngredients] = useState(initialIngredients);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isWasteOpen, setIsWasteOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const lowStock = ingredients.filter((i) => i.current_stock <= i.min_stock);

  const handleCreateIngredient = async (formData: FormData) => {
    const result = await createIngredient({
      name: formData.get("name") as string,
      unit: formData.get("unit") as "kg" | "lt" | "pcs" | "gr" | "ml",
      category: formData.get("category") as IngredientCategory,
      current_stock: Number(formData.get("current_stock")) || 0,
      min_stock: Number(formData.get("min_stock")) || 0,
      cost_per_unit: Number(formData.get("cost_per_unit")) || 0,
      supplier_id: (formData.get("supplier_id") as string) || null,
    });

    if (result.success) {
      toast.success("Το υλικό προστέθηκε");
      setIsAddOpen(false);
      window.location.reload();
    } else {
      toast.error(result.error);
    }
  };

  const handleRecordWaste = async (formData: FormData) => {
    const result = await recordWaste({
      ingredient_id: formData.get("ingredient_id") as string,
      quantity: Number(formData.get("quantity")),
      reason: formData.get("reason") as
        | "expired"
        | "damaged"
        | "overproduction"
        | "other",
      notes: (formData.get("notes") as string) || undefined,
    });

    if (result.success) {
      toast.success("Η φθορά καταγράφηκε");
      setIsWasteOpen(false);
      window.location.reload();
    } else {
      toast.error(result.error);
    }
  };

  const handleDelete = (id: string) => {
    startTransition(async () => {
      const result = await deleteIngredient(id);
      if (result.success) {
        setIngredients((prev) => prev.filter((i) => i.id !== id));
        toast.success("Το υλικό διαγράφηκε");
      } else {
        toast.error(result.error);
      }
    });
  };

  return (
    <Tabs defaultValue="ingredients">
      <div className="flex items-center justify-between">
        <TabsList>
          <TabsTrigger value="ingredients">
            Υλικά ({ingredients.length})
          </TabsTrigger>
          <TabsTrigger value="low-stock">
            Χαμηλό Απόθεμα ({lowStock.length})
          </TabsTrigger>
          <TabsTrigger value="waste">Φθορές ({wasteLog.length})</TabsTrigger>
        </TabsList>

        <div className="flex gap-2">
          <Dialog open={isWasteOpen} onOpenChange={setIsWasteOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <AlertTriangle className="mr-1 size-4" />
                Φθορά
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Καταγραφή Φθοράς</DialogTitle>
              </DialogHeader>
              <form action={handleRecordWaste} className="space-y-3">
                <div>
                  <Label>Υλικό</Label>
                  <Select name="ingredient_id" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Επιλέξτε..." />
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
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Ποσότητα</Label>
                    <Input
                      name="quantity"
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                    />
                  </div>
                  <div>
                    <Label>Αιτία</Label>
                    <Select name="reason" required>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="expired">Ληγμένο</SelectItem>
                        <SelectItem value="damaged">Κατεστραμμένο</SelectItem>
                        <SelectItem value="overproduction">
                          Υπερπαραγωγή
                        </SelectItem>
                        <SelectItem value="other">Άλλο</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Σημειώσεις</Label>
                  <Input name="notes" />
                </div>
                <Button type="submit" className="w-full">
                  Καταγραφή
                </Button>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-1 size-4" />
                Υλικό
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Νέο Υλικό</DialogTitle>
              </DialogHeader>
              <form action={handleCreateIngredient} className="space-y-3">
                <div>
                  <Label>Όνομα *</Label>
                  <Input name="name" required />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Μονάδα</Label>
                    <Select name="unit" required>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="kg">Κιλά</SelectItem>
                        <SelectItem value="lt">Λίτρα</SelectItem>
                        <SelectItem value="pcs">Τεμάχια</SelectItem>
                        <SelectItem value="gr">Γραμμάρια</SelectItem>
                        <SelectItem value="ml">ml</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Κατηγορία</Label>
                    <Select name="category" required>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(categoryLabels).map(([k, v]) => (
                          <SelectItem key={k} value={k}>
                            {v}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label>Απόθεμα</Label>
                    <Input
                      name="current_stock"
                      type="number"
                      step="0.01"
                      defaultValue="0"
                    />
                  </div>
                  <div>
                    <Label>Ελάχιστο</Label>
                    <Input
                      name="min_stock"
                      type="number"
                      step="0.01"
                      defaultValue="0"
                    />
                  </div>
                  <div>
                    <Label>Κόστος/μ</Label>
                    <Input
                      name="cost_per_unit"
                      type="number"
                      step="0.01"
                      defaultValue="0"
                    />
                  </div>
                </div>
                <div>
                  <Label>Προμηθευτής</Label>
                  <Select name="supplier_id">
                    <SelectTrigger>
                      <SelectValue placeholder="Κανένας" />
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
                <Button type="submit" className="w-full">
                  Δημιουργία
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <TabsContent value="ingredients" className="mt-4">
        <div className="rounded-lg border">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="p-3 text-left font-medium">Υλικό</th>
                <th className="p-3 text-left font-medium">Κατηγορία</th>
                <th className="p-3 text-right font-medium">Απόθεμα</th>
                <th className="p-3 text-right font-medium">Ελάχιστο</th>
                <th className="p-3 text-right font-medium">Κόστος/μ</th>
                <th className="p-3 text-left font-medium">Προμηθευτής</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody>
              {ingredients.map((ing) => {
                const isLow = ing.current_stock <= ing.min_stock;
                return (
                  <tr key={ing.id} className="border-b last:border-0">
                    <td className="p-3 font-medium">{ing.name}</td>
                    <td className="p-3">
                      <Badge variant="outline" className="text-xs">
                        {categoryLabels[ing.category as IngredientCategory] ??
                          ing.category}
                      </Badge>
                    </td>
                    <td
                      className={`p-3 text-right font-mono ${isLow ? "font-bold text-red-500" : ""}`}
                    >
                      {ing.current_stock} {unitLabels[ing.unit] ?? ing.unit}
                    </td>
                    <td className="p-3 text-right font-mono text-muted-foreground">
                      {ing.min_stock}
                    </td>
                    <td className="p-3 text-right font-mono">
                      €{ing.cost_per_unit.toFixed(2)}
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {ing.suppliers?.name ?? "—"}
                    </td>
                    <td className="p-3">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 text-destructive"
                        onClick={() => handleDelete(ing.id)}
                        disabled={isPending}
                      >
                        <Trash2 className="size-3" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </TabsContent>

      <TabsContent value="low-stock" className="mt-4">
        {lowStock.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              Όλα τα αποθέματα είναι επαρκή
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {lowStock.map((ing) => (
              <Card key={ing.id} className="border-red-500/50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{ing.name}</span>
                    <AlertTriangle className="size-4 text-red-500" />
                  </div>
                  <p className="text-sm text-red-500">
                    {ing.current_stock} / {ing.min_stock}{" "}
                    {unitLabels[ing.unit] ?? ing.unit}
                  </p>
                  {ing.suppliers?.name && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Προμηθευτής: {ing.suppliers.name}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </TabsContent>

      <TabsContent value="waste" className="mt-4">
        <div className="rounded-lg border">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="p-3 text-left font-medium">Ημ/νία</th>
                <th className="p-3 text-left font-medium">Υλικό</th>
                <th className="p-3 text-right font-medium">Ποσότητα</th>
                <th className="p-3 text-left font-medium">Αιτία</th>
                <th className="p-3 text-left font-medium">Σημειώσεις</th>
              </tr>
            </thead>
            <tbody>
              {wasteLog.map((w) => (
                <tr key={w.id} className="border-b last:border-0">
                  <td className="p-3">
                    {new Date(w.date).toLocaleDateString("el-GR")}
                  </td>
                  <td className="p-3 font-medium">
                    {w.ingredients?.name ?? "—"}
                  </td>
                  <td className="p-3 text-right font-mono">
                    {w.quantity} {w.ingredients?.unit ?? ""}
                  </td>
                  <td className="p-3">
                    <Badge variant="outline" className="text-xs">
                      {wasteReasonLabels[w.reason] ?? w.reason}
                    </Badge>
                  </td>
                  <td className="p-3 text-muted-foreground">
                    {w.notes ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </TabsContent>
    </Tabs>
  );
}
