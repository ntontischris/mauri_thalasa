"use client";

import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useStaff } from "@/hooks/use-staff";
import type { ChecklistType } from "@/lib/types";

interface ChecklistSectionProps {
  title: string;
  type: ChecklistType;
}

function ChecklistSection({ title, type }: ChecklistSectionProps) {
  const {
    checklist,
    toggleChecklistItem,
    resetChecklist,
    getChecklistProgress,
  } = useStaff();

  const items = checklist.filter((item) => item.type === type);
  const progress = getChecklistProgress(type);

  return (
    <Card className="flex-1">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{title}</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={() => resetChecklist(type)}
          >
            <RotateCcw className="size-3 mr-1" />
            Επαναφορά
          </Button>
        </div>
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Πρόοδος</span>
            <span>
              {progress.checked}/{progress.total}
            </span>
          </div>
          <Progress value={progress.percent} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {items.map((item) => (
            <label
              key={item.id}
              className="flex items-center gap-3 rounded-md p-2 cursor-pointer hover:bg-muted/50 transition-colors"
            >
              <input
                type="checkbox"
                checked={item.checked}
                onChange={() => toggleChecklistItem(item.id)}
                className="size-4 rounded border-border accent-primary"
              />
              <span
                className={
                  item.checked
                    ? "text-sm line-through text-muted-foreground"
                    : "text-sm"
                }
              >
                {item.label}
              </span>
            </label>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function StaffChecklist() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <ChecklistSection title="Άνοιγμα Βάρδιας" type="opening" />
      <ChecklistSection title="Κλείσιμο Βάρδιας" type="closing" />
    </div>
  );
}
