"use client";

import { useState } from "react";
import { Pencil, Trash2, ToggleLeft, ToggleRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useStaff } from "@/hooks/use-staff";
import { StaffForm } from "@/components/pos/staff-form";
import { cn } from "@/lib/utils";
import type { StaffMember, StaffRole } from "@/lib/types";

const ROLE_LABELS: Record<StaffRole, string> = {
  waiter: "Σερβιτόρος",
  chef: "Μάγειρας",
  barman: "Μπάρμαν",
  manager: "Manager",
};

const ROLE_COLORS: Record<StaffRole, string> = {
  waiter: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  chef: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  barman:
    "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  manager: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
};

export function StaffList() {
  const { staff, addStaff, updateStaff, deleteStaff, toggleActive } =
    useStaff();
  const [formOpen, setFormOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<StaffMember | undefined>(
    undefined,
  );

  const handleOpenAdd = () => {
    setEditingMember(undefined);
    setFormOpen(true);
  };

  const handleOpenEdit = (member: StaffMember) => {
    setEditingMember(member);
    setFormOpen(true);
  };

  const handleSave = (data: Omit<StaffMember, "id">) => {
    if (editingMember) {
      updateStaff({ ...editingMember, ...data });
    } else {
      addStaff(data);
    }
    setFormOpen(false);
    setEditingMember(undefined);
  };

  const handleFormOpenChange = (open: boolean) => {
    setFormOpen(open);
    if (!open) setEditingMember(undefined);
  };

  return (
    <div className="space-y-4">
      {/* Add Button */}
      <div className="flex justify-end">
        <Button onClick={handleOpenAdd}>
          <Plus className="size-4 mr-2" />
          Νέο Μέλος
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-md border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                Όνομα
              </th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                Ρόλος
              </th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                PIN
              </th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                Τηλ
              </th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                Status
              </th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">
                Ενέργειες
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {staff.map((member) => (
              <tr
                key={member.id}
                className={cn(
                  "transition-colors hover:bg-muted/30",
                  !member.isActive && "opacity-60",
                )}
              >
                <td className="px-4 py-3 font-medium">{member.name}</td>
                <td className="px-4 py-3">
                  <Badge
                    className={cn(
                      "border-transparent",
                      ROLE_COLORS[member.role],
                    )}
                  >
                    {ROLE_LABELS[member.role]}
                  </Badge>
                </td>
                <td className="px-4 py-3 font-mono text-muted-foreground">
                  ••••
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {member.phone ?? "—"}
                </td>
                <td className="px-4 py-3">
                  {member.isActive ? (
                    <Badge className="border-transparent bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                      Ενεργός
                    </Badge>
                  ) : (
                    <Badge className="border-transparent bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                      Ανενεργός
                    </Badge>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      onClick={() => handleOpenEdit(member)}
                      title="Επεξεργασία"
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      onClick={() => toggleActive(member.id)}
                      title={
                        member.isActive ? "Απενεργοποίηση" : "Ενεργοποίηση"
                      }
                    >
                      {member.isActive ? (
                        <ToggleRight className="size-4 text-green-600" />
                      ) : (
                        <ToggleLeft className="size-4 text-gray-400" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 text-destructive hover:text-destructive"
                      onClick={() => deleteStaff(member.id)}
                      title="Διαγραφή"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {staff.length === 0 && (
          <div className="py-12 text-center text-muted-foreground">
            Δεν υπάρχει προσωπικό
          </div>
        )}
      </div>

      {/* Form Dialog */}
      <StaffForm
        staffMember={editingMember}
        open={formOpen}
        onOpenChange={handleFormOpenChange}
        onSave={handleSave}
      />
    </div>
  );
}
