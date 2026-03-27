"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { StaffMember, StaffRole } from "@/lib/types";

interface StaffFormProps {
  staffMember?: StaffMember;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: Omit<StaffMember, "id">) => void;
}

const ROLE_OPTIONS: { value: StaffRole; label: string }[] = [
  { value: "waiter", label: "Σερβιτόρος" },
  { value: "chef", label: "Μάγειρας" },
  { value: "barman", label: "Μπάρμαν" },
  { value: "manager", label: "Manager" },
];

const DEFAULT_FORM = {
  name: "",
  role: "waiter" as StaffRole,
  pin: "",
  phone: "",
  email: "",
  isActive: true,
};

export function StaffForm({
  staffMember,
  open,
  onOpenChange,
  onSave,
}: StaffFormProps) {
  const [form, setForm] = useState(DEFAULT_FORM);

  useEffect(() => {
    if (staffMember) {
      setForm({
        name: staffMember.name,
        role: staffMember.role,
        pin: staffMember.pin,
        phone: staffMember.phone ?? "",
        email: staffMember.email ?? "",
        isActive: staffMember.isActive,
      });
    } else {
      setForm(DEFAULT_FORM);
    }
  }, [staffMember, open]);

  const isValid = form.name.trim() !== "" && form.pin.length === 4;

  const handleSave = () => {
    if (!isValid) return;
    onSave({
      name: form.name.trim(),
      role: form.role,
      pin: form.pin,
      phone: form.phone.trim() || undefined,
      email: form.email.trim() || undefined,
      isActive: form.isActive,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {staffMember ? "Επεξεργασία Μέλους" : "Νέο Μέλος Προσωπικού"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="staff-name">Όνομα *</Label>
            <Input
              id="staff-name"
              value={form.name}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, name: e.target.value }))
              }
              placeholder="Ονοματεπώνυμο"
            />
          </div>

          {/* Role */}
          <div className="space-y-2">
            <Label>Ρόλος</Label>
            <Select
              value={form.role}
              onValueChange={(value: StaffRole) =>
                setForm((prev) => ({ ...prev, role: value }))
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* PIN */}
          <div className="space-y-2">
            <Label htmlFor="staff-pin">PIN (4 ψηφία) *</Label>
            <Input
              id="staff-pin"
              value={form.pin}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, "").slice(0, 4);
                setForm((prev) => ({ ...prev, pin: value }));
              }}
              maxLength={4}
              placeholder="1234"
              inputMode="numeric"
            />
          </div>

          {/* Phone & Email */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="staff-phone">Τηλέφωνο</Label>
              <Input
                id="staff-phone"
                value={form.phone}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, phone: e.target.value }))
                }
                placeholder="69xxxxxxxx"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="staff-email">Email</Label>
              <Input
                id="staff-email"
                type="email"
                value={form.email}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, email: e.target.value }))
                }
                placeholder="email@example.gr"
              />
            </div>
          </div>

          {/* Active Switch */}
          <div className="flex items-center justify-between">
            <Label htmlFor="staff-active">Ενεργός</Label>
            <Switch
              id="staff-active"
              checked={form.isActive}
              onCheckedChange={(checked) =>
                setForm((prev) => ({ ...prev, isActive: checked }))
              }
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Ακύρωση
          </Button>
          <Button onClick={handleSave} disabled={!isValid}>
            {staffMember ? "Αποθήκευση" : "Προσθήκη"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
