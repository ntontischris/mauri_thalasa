"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const PRESETS = [
  "#22c55e", // green
  "#3b82f6", // blue
  "#ec4899", // pink
  "#f59e0b", // amber
  "#ef4444", // red
  "#8b5cf6", // violet
  "#14b8a6", // teal
  "#f97316", // orange
  "#06b6d4", // cyan
  "#64748b", // slate
];

interface CourseColorPickerProps {
  value: string | null;
  onChange: (color: string | null) => void;
  disabled?: boolean;
}

export function CourseColorPicker({
  value,
  onChange,
  disabled,
}: CourseColorPickerProps) {
  const [custom, setCustom] = useState(value ?? "");

  const handleCustom = (hex: string) => {
    setCustom(hex);
    if (/^#[0-9a-fA-F]{6}$/.test(hex)) {
      onChange(hex);
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild disabled={disabled}>
        <button
          type="button"
          className={cn(
            "size-6 shrink-0 rounded-full border-2 border-border transition-transform hover:scale-110",
            disabled && "opacity-50 cursor-not-allowed hover:scale-100",
          )}
          style={{ backgroundColor: value ?? "#94a3b8" }}
          aria-label="Επιλογή χρώματος"
        />
      </PopoverTrigger>
      <PopoverContent className="w-56 p-3" align="start">
        <div className="space-y-3">
          <div className="grid grid-cols-5 gap-2">
            {PRESETS.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => {
                  onChange(color);
                  setCustom(color);
                }}
                className="flex size-8 items-center justify-center rounded-full border-2 transition-transform hover:scale-110"
                style={{
                  backgroundColor: color,
                  borderColor:
                    value?.toLowerCase() === color.toLowerCase()
                      ? "white"
                      : "transparent",
                }}
                aria-label={color}
              >
                {value?.toLowerCase() === color.toLowerCase() && (
                  <Check className="size-4 text-white drop-shadow-sm" />
                )}
              </button>
            ))}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="custom-color" className="text-xs">
              Custom (hex)
            </Label>
            <Input
              id="custom-color"
              type="text"
              value={custom}
              onChange={(e) => handleCustom(e.target.value)}
              placeholder="#22c55e"
              maxLength={7}
              className="h-8 font-mono text-xs"
            />
          </div>
          <button
            type="button"
            onClick={() => {
              onChange(null);
              setCustom("");
            }}
            className="w-full rounded-md border px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
          >
            Χωρίς χρώμα
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
