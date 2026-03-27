"use client";

import { useState } from "react";
import { Package, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useInventory } from "@/hooks/use-inventory";
import { IngredientTable } from "@/components/pos/ingredient-table";
import { IngredientForm } from "@/components/pos/ingredient-form";
import type { Ingredient } from "@/lib/types";

type Tab = "ingredients" | "waste" | "suppliers";

const TAB_LABELS: Record<Tab, string> = {
  ingredients: "Πρώτες Ύλες",
  waste: "Σπατάλη",
  suppliers: "Προμηθευτές",
};

export default function InventoryPage() {
  const { addIngredient, updateIngredient } = useInventory();
  const [selectedTab, setSelectedTab] = useState<Tab>("ingredients");
  const [formOpen, setFormOpen] = useState(false);
  const [editingIngredient, setEditingIngredient] = useState<
    Ingredient | undefined
  >(undefined);

  const handleOpenAdd = () => {
    setEditingIngredient(undefined);
    setFormOpen(true);
  };

  const handleOpenEdit = (ingredient: Ingredient) => {
    setEditingIngredient(ingredient);
    setFormOpen(true);
  };

  const handleSave = (data: Omit<Ingredient, "id">) => {
    if (editingIngredient) {
      updateIngredient({ ...editingIngredient, ...data });
    } else {
      addIngredient(data);
    }
    setFormOpen(false);
    setEditingIngredient(undefined);
  };

  const handleFormOpenChange = (open: boolean) => {
    setFormOpen(open);
    if (!open) setEditingIngredient(undefined);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Package className="size-6 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Αποθήκη</h1>
        </div>
        {selectedTab === "ingredients" && (
          <Button onClick={handleOpenAdd}>
            <Plus className="size-4 mr-2" />
            Πρώτη Ύλη
          </Button>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 border-b border-border">
        {(["ingredients", "waste", "suppliers"] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setSelectedTab(tab)}
            className={cn(
              "px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px",
              selectedTab === tab
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {TAB_LABELS[tab]}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {selectedTab === "ingredients" && (
        <IngredientTable onEdit={handleOpenEdit} />
      )}

      {selectedTab === "waste" && (
        <p className="text-muted-foreground">Σπατάλη (σύντομα)</p>
      )}

      {selectedTab === "suppliers" && (
        <p className="text-muted-foreground">Προμηθευτές (σύντομα)</p>
      )}

      {/* Ingredient Form Dialog */}
      <IngredientForm
        ingredient={editingIngredient}
        open={formOpen}
        onOpenChange={handleFormOpenChange}
        onSave={handleSave}
      />
    </div>
  );
}
