"use client";

import { useState, useCallback } from "react";
import { LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PinLogin } from "@/components/pos/pin-login";
import { useStaff } from "@/hooks/use-staff";
import type { StaffMember } from "@/lib/types";

export function StaffHeader() {
  const { activeStaffId, getActiveStaff, logout } = useStaff();
  const [isPinOpen, setIsPinOpen] = useState(false);

  const activeStaff = getActiveStaff();

  const handleLogin = useCallback((_staff: StaffMember) => {
    setIsPinOpen(false);
  }, []);

  const handleLogout = useCallback(() => {
    logout();
  }, [logout]);

  if (activeStaffId && activeStaff) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 rounded-md border border-border bg-muted/40 px-2.5 py-1 text-sm">
          <User className="size-3.5 text-muted-foreground" />
          <span className="font-medium">{activeStaff.name}</span>
          <span className="text-muted-foreground">({activeStaff.role})</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
          onClick={handleLogout}
        >
          <LogOut className="mr-1 size-3" />
          Αποσύνδεση
        </Button>
      </div>
    );
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="h-7 px-2.5 text-xs"
        onClick={() => setIsPinOpen(true)}
      >
        <User className="mr-1.5 size-3.5" />
        PIN Login
      </Button>

      <Dialog open={isPinOpen} onOpenChange={setIsPinOpen}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle>Σύνδεση Προσωπικού</DialogTitle>
          </DialogHeader>
          <PinLogin onLogin={handleLogin} />
        </DialogContent>
      </Dialog>
    </>
  );
}
