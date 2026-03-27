"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CustomerAllergies } from "@/components/pos/customer-allergies";
import { X } from "lucide-react";
import type { Customer } from "@/lib/types";

interface CustomerFormProps {
  customer?: Customer;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: Omit<Customer, "id" | "createdAt">) => void;
}

const DEFAULT_FORM = {
  name: "",
  phone: "",
  email: "",
  birthday: "",
  notes: "",
  isVip: false,
  allergies: [] as string[],
  tags: [] as string[],
  loyaltyPoints: 0,
  stampCount: 0,
};

export function CustomerForm({
  customer,
  open,
  onOpenChange,
  onSave,
}: CustomerFormProps) {
  const [form, setForm] = useState(DEFAULT_FORM);
  const [tagInput, setTagInput] = useState("");

  useEffect(() => {
    if (customer) {
      setForm({
        name: customer.name,
        phone: customer.phone ?? "",
        email: customer.email ?? "",
        birthday: customer.birthday ?? "",
        notes: customer.notes ?? "",
        isVip: customer.isVip,
        allergies: [...customer.allergies],
        tags: [...customer.tags],
        loyaltyPoints: customer.loyaltyPoints,
        stampCount: customer.stampCount,
      });
    } else {
      setForm(DEFAULT_FORM);
    }
    setTagInput("");
  }, [customer, open]);

  const isValid = form.name.trim() !== "";

  const handleSave = () => {
    if (!isValid) return;
    onSave({
      name: form.name.trim(),
      phone: form.phone.trim() || undefined,
      email: form.email.trim() || undefined,
      birthday: form.birthday || undefined,
      notes: form.notes.trim() || undefined,
      isVip: form.isVip,
      allergies: form.allergies,
      tags: form.tags,
      loyaltyPoints: form.loyaltyPoints,
      stampCount: form.stampCount,
    });
  };

  const handleAddTag = () => {
    const trimmed = tagInput.trim();
    if (!trimmed || form.tags.includes(trimmed)) return;
    setForm((prev) => ({ ...prev, tags: [...prev.tags, trimmed] }));
    setTagInput("");
  };

  const handleRemoveTag = (tag: string) => {
    setForm((prev) => ({
      ...prev,
      tags: prev.tags.filter((t) => t !== tag),
    }));
  };

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddTag();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {customer ? "Επεξεργασία Πελάτη" : "Νέος Πελάτης"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="cust-name">Όνομα *</Label>
            <Input
              id="cust-name"
              value={form.name}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, name: e.target.value }))
              }
              placeholder="Ονοματεπώνυμο"
            />
          </div>

          {/* Phone & Email */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cust-phone">Τηλέφωνο</Label>
              <Input
                id="cust-phone"
                value={form.phone}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, phone: e.target.value }))
                }
                placeholder="69xxxxxxxx"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cust-email">Email</Label>
              <Input
                id="cust-email"
                type="email"
                value={form.email}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, email: e.target.value }))
                }
                placeholder="email@example.gr"
              />
            </div>
          </div>

          {/* Birthday */}
          <div className="space-y-2">
            <Label htmlFor="cust-birthday">Γενέθλια</Label>
            <Input
              id="cust-birthday"
              type="date"
              value={form.birthday}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, birthday: e.target.value }))
              }
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="cust-notes">Σημειώσεις</Label>
            <Textarea
              id="cust-notes"
              value={form.notes}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, notes: e.target.value }))
              }
              placeholder="Σημειώσεις για τον πελάτη..."
              rows={3}
            />
          </div>

          {/* VIP Switch */}
          <div className="flex items-center justify-between">
            <Label htmlFor="cust-vip">VIP Πελάτης</Label>
            <Switch
              id="cust-vip"
              checked={form.isVip}
              onCheckedChange={(checked) =>
                setForm((prev) => ({ ...prev, isVip: checked }))
              }
            />
          </div>

          {/* Allergies */}
          <div className="space-y-2">
            <Label>Αλλεργίες</Label>
            <CustomerAllergies
              selected={form.allergies}
              onChange={(allergies) =>
                setForm((prev) => ({ ...prev, allergies }))
              }
            />
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label>Ετικέτες</Label>
            <div className="flex flex-wrap gap-2 mb-2">
              {form.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                >
                  {tag}
                  <button type="button" onClick={() => handleRemoveTag(tag)}>
                    <X className="size-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                placeholder="Νέα ετικέτα..."
                className="h-8 text-sm"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8"
                onClick={handleAddTag}
                disabled={!tagInput.trim()}
              >
                Προσθήκη
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Ακύρωση
          </Button>
          <Button onClick={handleSave} disabled={!isValid}>
            {customer ? "Αποθήκευση" : "Προσθήκη"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
