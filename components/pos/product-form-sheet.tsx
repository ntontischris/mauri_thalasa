"use client";

import { useEffect, useState, useTransition } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { createProduct, updateProduct } from "@/lib/actions/products";
import type { DbProduct, DbCategory } from "@/lib/types/database";

interface ProductFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: DbCategory[];
  defaultCategoryId: string | null;
  product?: DbProduct | null;
  onSaved?: () => void;
}

const STATIONS = [
  { value: "hot", label: "Κουζίνα" },
  { value: "cold", label: "Κρύα" },
  { value: "bar", label: "Μπαρ" },
  { value: "dessert", label: "Γλυκά" },
] as const;

export function ProductFormSheet({
  open,
  onOpenChange,
  categories,
  defaultCategoryId,
  product,
  onSaved,
}: ProductFormSheetProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [station, setStation] = useState<DbProduct["station"]>("hot");
  const [vatRate, setVatRate] = useState("24");
  const [available, setAvailable] = useState(true);
  const [isPending, startTransition] = useTransition();

  const isEdit = Boolean(product);

  useEffect(() => {
    if (!open) return;
    if (product) {
      setName(product.name);
      setDescription(product.description ?? "");
      setPrice(String(product.price));
      setCategoryId(product.category_id);
      setStation(product.station);
      setVatRate(String(product.vat_rate));
      setAvailable(product.available);
    } else {
      const initialCategoryId = defaultCategoryId ?? categories[0]?.id ?? "";
      const initialCategory = categories.find(
        (c) => c.id === initialCategoryId,
      );
      setName("");
      setDescription("");
      setPrice("");
      setCategoryId(initialCategoryId);
      setStation(initialCategory?.default_station ?? "hot");
      setVatRate("24");
      setAvailable(true);
    }
  }, [open, product, defaultCategoryId, categories]);

  // When the user picks a different category, follow its default station
  // (only on create, to avoid surprising edits of existing products).
  const handleCategoryChange = (id: string) => {
    setCategoryId(id);
    if (!product) {
      const cat = categories.find((c) => c.id === id);
      if (cat?.default_station) {
        setStation(cat.default_station);
      }
    }
  };

  const handleSave = () => {
    const priceNum = parseFloat(price);
    if (!name.trim()) {
      toast.error("Συμπλήρωσε το όνομα");
      return;
    }
    if (Number.isNaN(priceNum) || priceNum < 0) {
      toast.error("Μη έγκυρη τιμή");
      return;
    }
    if (!categoryId) {
      toast.error("Επίλεξε κατηγορία");
      return;
    }

    const vatNum = parseFloat(vatRate);

    startTransition(async () => {
      const payload = {
        name: name.trim(),
        description: description.trim() || undefined,
        price: priceNum,
        category_id: categoryId,
        station,
        vat_rate: Number.isNaN(vatNum) ? 24 : vatNum,
        available,
        sort_order: product?.sort_order ?? 0,
      };

      const result =
        isEdit && product
          ? await updateProduct(product.id, payload)
          : await createProduct(payload);

      if (!result.success) {
        toast.error(result.error ?? "Αποτυχία αποθήκευσης");
        return;
      }
      toast.success(isEdit ? "Αποθηκεύτηκε" : "Προστέθηκε");
      onSaved?.();
      onOpenChange(false);
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 sm:max-w-md">
        <SheetHeader>
          <SheetTitle>
            {isEdit ? "Επεξεργασία προϊόντος" : "Νέο προϊόν"}
          </SheetTitle>
        </SheetHeader>

        <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 pb-4">
          <div className="space-y-2">
            <Label htmlFor="product-name">Όνομα *</Label>
            <Input
              id="product-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="π.χ. ΧΩΡΙΑΤΙΚΗ"
              maxLength={200}
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="product-desc">Περιγραφή</Label>
            <Textarea
              id="product-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Προαιρετικό"
              rows={2}
              maxLength={1000}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="product-price">Τιμή (€) *</Label>
              <Input
                id="product-price"
                type="number"
                step="0.01"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="product-vat">ΦΠΑ (%)</Label>
              <Input
                id="product-vat"
                type="number"
                min="0"
                max="100"
                value={vatRate}
                onChange={(e) => setVatRate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Κατηγορία *</Label>
            <Select value={categoryId} onValueChange={handleCategoryChange}>
              <SelectTrigger>
                <SelectValue placeholder="Επίλεξε..." />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Σταθμός παρασκευής</Label>
            <Select
              value={station}
              onValueChange={(v) => setStation(v as DbProduct["station"])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATIONS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Καθορίζει που εμφανίζεται το προϊόν όταν σταλεί στην κουζίνα.
            </p>
          </div>

          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <Label>Διαθέσιμο</Label>
              <p className="text-xs text-muted-foreground">
                Αν είναι κλειστό, δεν εμφανίζεται στις παραγγελίες.
              </p>
            </div>
            <Switch checked={available} onCheckedChange={setAvailable} />
          </div>
        </div>

        <div className="flex gap-2 border-t p-4">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Ακύρωση
          </Button>
          <Button className="flex-1" onClick={handleSave} disabled={isPending}>
            {isPending ? "Αποθήκευση..." : isEdit ? "Αποθήκευση" : "Προσθήκη"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
