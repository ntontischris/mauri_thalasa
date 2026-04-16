"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSupabase } from "@/components/providers/supabase-provider";

interface StaffInfo {
  name: string;
  role: string;
}

export function StaffHeader() {
  const supabase = useSupabase();
  const router = useRouter();
  const [staff, setStaff] = useState<StaffInfo | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.user_metadata) {
        setStaff({
          name: user.user_metadata.staff_name ?? "Staff",
          role: user.user_metadata.role ?? "waiter",
        });
      }
    });
  }, [supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const roleLabels: Record<string, string> = {
    manager: "Διευθυντής",
    waiter: "Σερβιτόρος",
    chef: "Σεφ",
    barman: "Μπαρμαν",
  };

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1.5 rounded-md border border-border bg-muted/40 px-2.5 py-1 text-sm">
        <User className="size-3.5 text-muted-foreground" />
        {staff ? (
          <>
            <span className="font-medium">{staff.name}</span>
            <span className="text-muted-foreground">
              ({roleLabels[staff.role] ?? staff.role})
            </span>
          </>
        ) : (
          <span className="inline-block h-4 w-24 animate-pulse rounded bg-muted" />
        )}
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
