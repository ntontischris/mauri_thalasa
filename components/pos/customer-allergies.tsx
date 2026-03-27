"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const PREDEFINED_ALLERGIES = [
  "Γλουτένη",
  "Λακτόζη",
  "Ξηροί Καρποί",
  "Θαλασσινά",
  "Αυγά",
  "Σόγια",
];

interface CustomerAllergiesProps {
  selected: string[];
  onChange: (allergies: string[]) => void;
}

export function CustomerAllergies({
  selected,
  onChange,
}: CustomerAllergiesProps) {
  const [customInput, setCustomInput] = useState("");

  const toggleAllergy = (allergy: string) => {
    if (selected.includes(allergy)) {
      onChange(selected.filter((a) => a !== allergy));
    } else {
      onChange([...selected, allergy]);
    }
  };

  const handleAddCustom = () => {
    const trimmed = customInput.trim();
    if (!trimmed) return;
    if (selected.includes(trimmed)) return;

    onChange([...selected, trimmed]);
    setCustomInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddCustom();
    }
  };

  const customAllergies = selected.filter(
    (a) => !PREDEFINED_ALLERGIES.includes(a),
  );

  return (
    <div className="space-y-3">
      {/* Predefined allergy buttons */}
      <div className="flex flex-wrap gap-2">
        {PREDEFINED_ALLERGIES.map((allergy) => {
          const isSelected = selected.includes(allergy);
          return (
            <button
              key={allergy}
              type="button"
              onClick={() => toggleAllergy(allergy)}
              className={cn(
                "px-3 py-1.5 rounded-full text-sm font-medium transition-colors border",
                isSelected
                  ? "bg-red-100 text-red-800 border-red-300 dark:bg-red-900 dark:text-red-200 dark:border-red-700"
                  : "bg-background border-border text-muted-foreground hover:text-foreground hover:bg-muted",
              )}
            >
              {allergy}
            </button>
          );
        })}
      </div>

      {/* Custom allergies display */}
      {customAllergies.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {customAllergies.map((allergy) => (
            <span
              key={allergy}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium bg-red-100 text-red-800 border border-red-300 dark:bg-red-900 dark:text-red-200 dark:border-red-700"
            >
              {allergy}
              <button
                type="button"
                onClick={() => toggleAllergy(allergy)}
                className="hover:text-red-600 dark:hover:text-red-300"
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Custom allergy input */}
      <div className="flex items-center gap-2">
        <Input
          value={customInput}
          onChange={(e) => setCustomInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Άλλη αλλεργία..."
          className="h-8 text-sm"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 px-2"
          onClick={handleAddCustom}
          disabled={!customInput.trim()}
        >
          <Plus className="size-4" />
        </Button>
      </div>
    </div>
  );
}
