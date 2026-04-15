"use client";

import { useState, useTransition } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, UserCog, Trash2, Phone, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { createStaffMember, deleteStaffMember } from "@/lib/actions/staff";
import type { DbStaffMember } from "@/lib/types/database";

interface StaffPanelProps {
  initialStaff: DbStaffMember[];
}

const roleLabels: Record<string, string> = {
  waiter: "Σερβιτόρος",
  chef: "Σεφ",
  barman: "Μπαρμαν",
  manager: "Διευθυντής",
};

const roleColors: Record<string, string> = {
  waiter: "bg-blue-500/10 text-blue-600",
  chef: "bg-orange-500/10 text-orange-600",
  barman: "bg-purple-500/10 text-purple-600",
  manager: "bg-emerald-500/10 text-emerald-600",
};

export function StaffPanel({ initialStaff }: StaffPanelProps) {
  const [staff, setStaff] = useState(initialStaff);
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleCreate = async (formData: FormData) => {
    const result = await createStaffMember({
      name: formData.get("name") as string,
      role: formData.get("role") as "waiter" | "chef" | "barman" | "manager",
      pin: formData.get("pin") as string,
      phone: (formData.get("phone") as string) || undefined,
      email: (formData.get("email") as string) || undefined,
    });
    if (result.success) {
      toast.success("Το μέλος προστέθηκε");
      setIsOpen(false);
      window.location.reload();
    } else {
      toast.error(result.error);
    }
  };

  const handleDelete = (id: string) => {
    startTransition(async () => {
      const result = await deleteStaffMember(id);
      if (result.success) {
        setStaff((prev) => prev.filter((s) => s.id !== id));
        toast.success("Το μέλος αφαιρέθηκε");
      } else {
        toast.error(result.error);
      }
    });
  };

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-1 size-4" />
              Νέο Μέλος
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Νέο Μέλος Προσωπικού</DialogTitle>
            </DialogHeader>
            <form action={handleCreate} className="space-y-3">
              <div>
                <Label>Όνομα *</Label>
                <Input name="name" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Ρόλος</Label>
                  <Select name="role" required>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="waiter">Σερβιτόρος</SelectItem>
                      <SelectItem value="chef">Σεφ</SelectItem>
                      <SelectItem value="barman">Μπαρμαν</SelectItem>
                      <SelectItem value="manager">Διευθυντής</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>PIN (4 ψηφία)</Label>
                  <Input name="pin" maxLength={4} pattern="[0-9]{4}" required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Τηλέφωνο</Label>
                  <Input name="phone" />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input name="email" type="email" />
                </div>
              </div>
              <Button type="submit" className="w-full">
                Δημιουργία
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {staff.map((member) => (
          <Card key={member.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold">{member.name}</p>
                  <Badge className={`mt-1 ${roleColors[member.role] ?? ""}`}>
                    {roleLabels[member.role] ?? member.role}
                  </Badge>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 text-destructive"
                  onClick={() => handleDelete(member.id)}
                  disabled={isPending}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
              <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                {member.phone && (
                  <div className="flex items-center gap-1.5">
                    <Phone className="size-3" />
                    {member.phone}
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  <KeyRound className="size-3" />
                  PIN: ****
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
