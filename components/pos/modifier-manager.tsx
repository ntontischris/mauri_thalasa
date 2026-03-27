"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useModifiers } from "@/hooks/use-modifiers";
import { usePOS } from "@/lib/pos-context";
import { formatPrice } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import type { Modifier } from "@/lib/types";

interface ModifierFormState {
  name: string;
  price: string;
  selectedCats: string[];
}

const defaultForm: ModifierFormState = {
  name: "",
  price: "0",
  selectedCats: [],
};

function CategoryChips({
  categories,
  selected,
  onToggle,
}: {
  categories: { id: string; name: string }[];
  selected: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {categories.map((cat) => {
        const active = selected.includes(cat.id);
        return (
          <button
            key={cat.id}
            type="button"
            onClick={() => onToggle(cat.id)}
            className={cn(
              "rounded-full px-2.5 py-1 text-xs font-medium border transition-colors",
              active
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-muted text-muted-foreground border-border hover:border-primary/50",
            )}
          >
            {cat.name}
          </button>
        );
      })}
    </div>
  );
}

function ModifierForm({
  form,
  categories,
  onNameChange,
  onPriceChange,
  onCatToggle,
  onSave,
  onCancel,
  saveLabel,
}: {
  form: ModifierFormState;
  categories: { id: string; name: string }[];
  onNameChange: (v: string) => void;
  onPriceChange: (v: string) => void;
  onCatToggle: (id: string) => void;
  onSave: () => void;
  onCancel: () => void;
  saveLabel: string;
}) {
  const canSave = form.name.trim().length > 0;

  return (
    <div className="border border-border rounded-lg p-4 space-y-3 bg-muted/30">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Όνομα</label>
          <Input
            value={form.name}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="π.χ. Extra τυρί"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Τιμή (EUR)</label>
          <Input
            type="number"
            step="0.10"
            min="0"
            value={form.price}
            onChange={(e) => onPriceChange(e.target.value)}
            placeholder="0.00"
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <p className="text-xs text-muted-foreground">Κατηγορίες</p>
        <CategoryChips
          categories={categories}
          selected={form.selectedCats}
          onToggle={onCatToggle}
        />
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onCancel}>
          <X className="size-3.5 mr-1" />
          Ακύρωση
        </Button>
        <Button size="sm" onClick={onSave} disabled={!canSave}>
          <Check className="size-3.5 mr-1" />
          {saveLabel}
        </Button>
      </div>
    </div>
  );
}

function ModifierRow({
  modifier,
  categories,
  isEditing,
  editForm,
  onEdit,
  onDelete,
  onEditNameChange,
  onEditPriceChange,
  onEditCatToggle,
  onEditSave,
  onEditCancel,
}: {
  modifier: Modifier;
  categories: { id: string; name: string }[];
  isEditing: boolean;
  editForm: ModifierFormState;
  onEdit: () => void;
  onDelete: () => void;
  onEditNameChange: (v: string) => void;
  onEditPriceChange: (v: string) => void;
  onEditCatToggle: (id: string) => void;
  onEditSave: () => void;
  onEditCancel: () => void;
}) {
  if (isEditing) {
    return (
      <ModifierForm
        form={editForm}
        categories={categories}
        onNameChange={onEditNameChange}
        onPriceChange={onEditPriceChange}
        onCatToggle={onEditCatToggle}
        onSave={onEditSave}
        onCancel={onEditCancel}
        saveLabel="Αποθήκευση"
      />
    );
  }

  const assignedCats = categories.filter((c) =>
    modifier.categoryIds.includes(c.id),
  );

  return (
    <div className="flex items-center gap-3 rounded-lg border border-border px-4 py-3 bg-card">
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">{modifier.name}</span>
          {modifier.price > 0 && (
            <Badge variant="secondary" className="text-xs">
              +{formatPrice(modifier.price)}
            </Badge>
          )}
        </div>
        {assignedCats.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {assignedCats.map((cat) => (
              <span
                key={cat.id}
                className="text-xs text-muted-foreground bg-muted rounded px-1.5 py-0.5"
              >
                {cat.name}
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <Button variant="ghost" size="icon" className="size-8" onClick={onEdit}>
          <Pencil className="size-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="size-8 text-destructive"
          onClick={onDelete}
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}

export function ModifierManager() {
  const { modifiers, addModifier, updateModifier, deleteModifier } =
    useModifiers();
  const { state } = usePOS();

  const [isAdding, setIsAdding] = useState(false);
  const [addForm, setAddForm] = useState<ModifierFormState>(defaultForm);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<ModifierFormState>(defaultForm);

  const toggleAddCat = (id: string) =>
    setAddForm((f) => ({
      ...f,
      selectedCats: f.selectedCats.includes(id)
        ? f.selectedCats.filter((c) => c !== id)
        : [...f.selectedCats, id],
    }));

  const toggleEditCat = (id: string) =>
    setEditForm((f) => ({
      ...f,
      selectedCats: f.selectedCats.includes(id)
        ? f.selectedCats.filter((c) => c !== id)
        : [...f.selectedCats, id],
    }));

  const handleAdd = () => {
    addModifier(
      addForm.name.trim(),
      parseFloat(addForm.price) || 0,
      addForm.selectedCats,
    );
    setAddForm(defaultForm);
    setIsAdding(false);
  };

  const handleStartEdit = (modifier: Modifier) => {
    setEditingId(modifier.id);
    setEditForm({
      name: modifier.name,
      price: modifier.price.toString(),
      selectedCats: [...modifier.categoryIds],
    });
  };

  const handleSaveEdit = () => {
    if (!editingId) return;
    updateModifier({
      id: editingId,
      name: editForm.name.trim(),
      price: parseFloat(editForm.price) || 0,
      categoryIds: editForm.selectedCats,
    });
    setEditingId(null);
    setEditForm(defaultForm);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditForm(defaultForm);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Modifiers</h2>
        <Button
          size="sm"
          onClick={() => {
            setIsAdding(true);
            setEditingId(null);
          }}
          disabled={isAdding}
        >
          <Plus className="size-4 mr-1" />
          Νέο Modifier
        </Button>
      </div>

      {isAdding && (
        <ModifierForm
          form={addForm}
          categories={state.categories}
          onNameChange={(v) => setAddForm((f) => ({ ...f, name: v }))}
          onPriceChange={(v) => setAddForm((f) => ({ ...f, price: v }))}
          onCatToggle={toggleAddCat}
          onSave={handleAdd}
          onCancel={() => {
            setIsAdding(false);
            setAddForm(defaultForm);
          }}
          saveLabel="Προσθήκη"
        />
      )}

      {modifiers.length === 0 && !isAdding && (
        <div className="text-center py-10 text-muted-foreground text-sm">
          Δεν υπάρχουν modifiers ακόμα
        </div>
      )}

      <div className="space-y-2">
        {modifiers.map((modifier) => (
          <ModifierRow
            key={modifier.id}
            modifier={modifier}
            categories={state.categories}
            isEditing={editingId === modifier.id}
            editForm={editForm}
            onEdit={() => handleStartEdit(modifier)}
            onDelete={() => deleteModifier(modifier.id)}
            onEditNameChange={(v) => setEditForm((f) => ({ ...f, name: v }))}
            onEditPriceChange={(v) => setEditForm((f) => ({ ...f, price: v }))}
            onEditCatToggle={toggleEditCat}
            onEditSave={handleSaveEdit}
            onEditCancel={handleCancelEdit}
          />
        ))}
      </div>
    </div>
  );
}
