"use client";

import { useState, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const PRESET_REASONS = [
  "Εξαντλήθηκε το υλικό",
  "Λάθος παραγγελία",
  "Αλλαγή γνώμης πελάτη",
  "Αλλεργία πελάτη",
  "Καθυστέρηση παρασκευής",
  "Ελαττωματική παρτίδα",
];

interface CancelOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: string) => Promise<void> | void;
}

export function CancelOrderDialog({
  open,
  onOpenChange,
  onConfirm,
}: CancelOrderDialogProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [custom, setCustom] = useState("");
  const [isPending, startTransition] = useTransition();

  const reason = selected === "__other__" ? custom.trim() : (selected ?? "");
  const canSubmit = reason.length > 0;

  const handleConfirm = () => {
    if (!canSubmit) return;
    startTransition(async () => {
      await onConfirm(reason);
      setSelected(null);
      setCustom("");
      onOpenChange(false);
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) {
          setSelected(null);
          setCustom("");
        }
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Ακύρωση παραγγελίας</DialogTitle>
          <DialogDescription>
            Επιλέξτε λόγο. Καταγράφεται για αναλύσεις και αναφορές.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          {PRESET_REASONS.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setSelected(r)}
              className={cn(
                "w-full rounded-md border px-3 py-2 text-left text-sm transition",
                selected === r
                  ? "border-primary bg-primary/10 font-medium"
                  : "hover:border-primary/50",
              )}
            >
              {r}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setSelected("__other__")}
            className={cn(
              "w-full rounded-md border px-3 py-2 text-left text-sm transition",
              selected === "__other__"
                ? "border-primary bg-primary/10 font-medium"
                : "hover:border-primary/50",
            )}
          >
            Άλλο...
          </button>

          {selected === "__other__" && (
            <div className="space-y-1">
              <Label htmlFor="custom-reason" className="text-xs">
                Περιγραφή
              </Label>
              <Textarea
                id="custom-reason"
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
                placeholder="Γράψτε τον λόγο..."
                rows={2}
                maxLength={200}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Πίσω
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={!canSubmit || isPending}
          >
            {isPending ? "Ακύρωση..." : "Ακύρωση Παραγγελίας"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
