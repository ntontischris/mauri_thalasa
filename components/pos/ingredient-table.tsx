"use client";

import { useState } from "react";
import { Pencil, Trash2, Plus, Package, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useInventory } from "@/hooks/use-inventory";
import { formatPrice } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import type { Ingredient, IngredientCategory } from "@/lib/types";

interface IngredientTableProps {
  onEdit: (ingredient: Ingredient) => void;
}

const CATEGORIES: { value: IngredientCategory | "all"; label: string }[] = [
  { value: "all", label: "Όλα" },
  { value: "seafood", label: "Θαλασσινά" },
  { value: "meat", label: "Κρέας" },
  { value: "dairy", label: "Γαλακτοκομικά" },
  { value: "vegetables", label: "Λαχανικά" },
  { value: "dry", label: "Ξηρά" },
  { value: "drinks", label: "Ποτά" },
  { value: "other", label: "Άλλο" },
];

const CATEGORY_COLORS: Record<IngredientCategory, string> = {
  seafood: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  meat: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  dairy: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  vegetables:
    "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  dry: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  drinks:
    "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  other: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200",
};

const CATEGORY_LABELS: Record<IngredientCategory, string> = {
  seafood: "Θαλασσινά",
  meat: "Κρέας",
  dairy: "Γαλακτοκομικά",
  vegetables: "Λαχανικά",
  dry: "Ξηρά",
  drinks: "Ποτά",
  other: "Άλλο",
};

export function IngredientTable({ onEdit }: IngredientTableProps) {
  const {
    ingredients,
    getStockStatus,
    getLowStockCount,
    getCriticalStockCount,
    deleteIngredient,
    adjustStock,
  } = useInventory();
  const [activeCategory, setActiveCategory] = useState<
    IngredientCategory | "all"
  >("all");
  const [receivingId, setReceivingId] = useState<string | null>(null);
  const [receiveQty, setReceiveQty] = useState("");

  const filtered =
    activeCategory === "all"
      ? ingredients
      : ingredients.filter((ing) => ing.category === activeCategory);

  const handleConfirmReceive = (ingredientId: string) => {
    const qty = parseFloat(receiveQty);
    if (!isNaN(qty) && qty > 0) {
      adjustStock(ingredientId, qty);
    }
    setReceivingId(null);
    setReceiveQty("");
  };

  const handleCancelReceive = () => {
    setReceivingId(null);
    setReceiveQty("");
  };

  const lowCount = getLowStockCount();
  const criticalCount = getCriticalStockCount();

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Package className="size-5 text-muted-foreground" />
            <div>
              <p className="text-2xl font-bold">{ingredients.length}</p>
              <p className="text-xs text-muted-foreground">Σύνολο</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="size-5 text-amber-500" />
            <div>
              <p className="text-2xl font-bold text-amber-600">{lowCount}</p>
              <p className="text-xs text-muted-foreground">Χαμηλό</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="size-5 text-red-500" />
            <div>
              <p className="text-2xl font-bold text-red-600">{criticalCount}</p>
              <p className="text-xs text-muted-foreground">Κρίσιμο</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Category filter */}
      <div className="flex flex-wrap gap-1">
        {CATEGORIES.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setActiveCategory(value)}
            className={cn(
              "px-3 py-1 rounded-full text-sm font-medium transition-colors border",
              activeCategory === value
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background border-border text-muted-foreground hover:text-foreground hover:bg-muted",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-md border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                Όνομα
              </th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                Κατηγορία
              </th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                Απόθεμα
              </th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                Ελάχιστο
              </th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                Κόστος
              </th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                Κατάσταση
              </th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">
                Ενέργειες
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map((ing) => {
              const status = getStockStatus(ing);
              const isReceiving = receivingId === ing.id;

              return (
                <tr
                  key={ing.id}
                  className="hover:bg-muted/30 transition-colors"
                >
                  <td className="px-4 py-3 font-medium">{ing.name}</td>

                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "px-2 py-0.5 rounded text-xs font-medium",
                        CATEGORY_COLORS[ing.category],
                      )}
                    >
                      {CATEGORY_LABELS[ing.category]}
                    </span>
                  </td>

                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "font-medium",
                        status === "ok" && "text-green-600",
                        status === "low" && "text-amber-600",
                        status === "critical" && "text-red-600",
                      )}
                    >
                      {ing.currentStock} {ing.unit}
                    </span>
                  </td>

                  <td className="px-4 py-3 text-muted-foreground">
                    {ing.minStock} {ing.unit}
                  </td>

                  <td className="px-4 py-3 text-muted-foreground">
                    {formatPrice(ing.costPerUnit)}/{ing.unit}
                  </td>

                  <td className="px-4 py-3">
                    <StatusBadge status={status} />
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {isReceiving ? (
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={receiveQty}
                            onChange={(e) => setReceiveQty(e.target.value)}
                            className="h-7 w-20 text-xs"
                            placeholder="Ποσ."
                            autoFocus
                          />
                          <Button
                            size="sm"
                            className="h-7 px-2 text-xs"
                            onClick={() => handleConfirmReceive(ing.id)}
                          >
                            OK
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs"
                            onClick={handleCancelReceive}
                          >
                            ✕
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 px-2 text-xs gap-1"
                          onClick={() => {
                            setReceivingId(ing.id);
                            setReceiveQty("");
                          }}
                        >
                          <Plus className="size-3" />
                          Παραλαβή
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        onClick={() => onEdit(ing)}
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 text-destructive"
                        onClick={() => deleteIngredient(ing.id)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="py-12 text-center text-muted-foreground">
            Δεν βρέθηκαν πρώτες ύλες
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: "ok" | "low" | "critical" }) {
  if (status === "ok") {
    return (
      <Badge className="bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900 dark:text-green-200">
        OK
      </Badge>
    );
  }
  if (status === "low") {
    return (
      <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 dark:bg-amber-900 dark:text-amber-200">
        Χαμηλό
      </Badge>
    );
  }
  return (
    <Badge className="bg-red-100 text-red-800 hover:bg-red-100 dark:bg-red-900 dark:text-red-200">
      Κρίσιμο
    </Badge>
  );
}
