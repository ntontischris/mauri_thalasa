"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { upsertFloor } from "@/lib/actions/floor-plan";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

const PRESETS = [
  { id: "small-bar", label: "Μικρό μπαρ", width: 800, height: 600 },
  { id: "standard", label: "Standard αίθουσα", width: 1200, height: 800 },
  { id: "terrace", label: "Μεγάλη βεράντα", width: 1600, height: 1000 },
];

type Props = {
  onCreated?: (floorId: string) => void;
};

export function FloorPresetsDialog({ onCreated }: Props = {}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [picked, setPicked] = useState(PRESETS[1]);
  const [custom, setCustom] = useState({ width: 1200, height: 800 });
  const [useCustom, setUseCustom] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  async function handleCreate() {
    if (!name.trim()) return;
    setSubmitting(true);
    setErrMsg(null);
    const dims = useCustom
      ? custom
      : { width: picked.width, height: picked.height };
    const result = await upsertFloor({
      name,
      width: dims.width,
      height: dims.height,
      sort_order: 0,
    });
    setSubmitting(false);
    if (!result.success) {
      setErrMsg(result.error ?? "Άγνωστο σφάλμα");
      return;
    }
    setOpen(false);
    setName("");
    router.refresh();
    if (result.data?.id) onCreated?.(result.data.id);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          + Νέος όροφος
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Νέος όροφος</DialogTitle>
        </DialogHeader>

        <Input
          placeholder="Όνομα ορόφου"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <div className="grid grid-cols-3 gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                setPicked(p);
                setUseCustom(false);
              }}
              className={`rounded border p-3 text-left ${!useCustom && picked.id === p.id ? "border-primary bg-primary/10" : ""}`}
            >
              <div className="text-sm font-medium">{p.label}</div>
              <div className="text-xs text-muted-foreground">
                {p.width}×{p.height}
              </div>
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setUseCustom(true)}
          className={`rounded border p-3 text-left ${useCustom ? "border-primary bg-primary/10" : ""}`}
        >
          <div className="text-sm font-medium">Custom</div>
          {useCustom && (
            <div className="mt-2 flex gap-2">
              <Input
                type="number"
                value={custom.width}
                onChange={(e) =>
                  setCustom({
                    ...custom,
                    width: parseInt(e.target.value, 10) || 0,
                  })
                }
              />
              <Input
                type="number"
                value={custom.height}
                onChange={(e) =>
                  setCustom({
                    ...custom,
                    height: parseInt(e.target.value, 10) || 0,
                  })
                }
              />
            </div>
          )}
        </button>

        {errMsg && <p className="text-xs text-destructive">Σφάλμα: {errMsg}</p>}

        <Button onClick={handleCreate} disabled={!name.trim() || submitting}>
          {submitting ? "Δημιουργία..." : "Δημιουργία"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
