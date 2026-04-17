"use client";

import { useState, useTransition, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, LogIn, LogOut } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ROLE_LABELS } from "@/lib/auth/roles";
import { clockIn, clockOut } from "@/lib/actions/staff";
import type { DbStaffMember } from "@/lib/types/database";
import type { ShiftStatus } from "@/lib/queries/shifts";

interface ClockPanelProps {
  staff: DbStaffMember[];
  initialShifts: ShiftStatus[];
}

function formatHours(ms: number): string {
  const totalMinutes = Math.floor(ms / 60000);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h}h ${String(m).padStart(2, "0")}m`;
}

export function ClockPanel({ staff, initialShifts }: ClockPanelProps) {
  const [shifts, setShifts] = useState<Map<string, ShiftStatus>>(
    () => new Map(initialShifts.map((s) => [s.staff_id, s])),
  );
  const [isPending, startTransition] = useTransition();
  const [, setTick] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 60000);
    return () => clearInterval(t);
  }, []);

  const handleClockIn = (staffId: string) => {
    const prev = shifts.get(staffId);
    const nowIso = new Date().toISOString();
    setShifts((m) => {
      const next = new Map(m);
      next.set(staffId, {
        staff_id: staffId,
        clock_in: nowIso,
        clock_out: null,
      });
      return next;
    });
    startTransition(async () => {
      const r = await clockIn(staffId);
      if (!r.success) {
        toast.error(r.error ?? "Αποτυχία");
        setShifts((m) => {
          const next = new Map(m);
          if (prev) next.set(staffId, prev);
          else next.delete(staffId);
          return next;
        });
      } else {
        toast.success("Έναρξη βάρδιας");
      }
    });
  };

  const handleClockOut = (staffId: string) => {
    const prev = shifts.get(staffId);
    if (!prev) return;
    const nowIso = new Date().toISOString();
    setShifts((m) => {
      const next = new Map(m);
      next.set(staffId, { ...prev, clock_out: nowIso });
      return next;
    });
    startTransition(async () => {
      const r = await clockOut(staffId);
      if (!r.success) {
        toast.error(r.error ?? "Αποτυχία");
        setShifts((m) => {
          const next = new Map(m);
          next.set(staffId, prev);
          return next;
        });
      } else {
        toast.success("Λήξη βάρδιας");
      }
    });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Clock className="size-4" />
          Παρουσίες Σήμερα
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {staff.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            Κανένα ενεργό μέλος.
          </p>
        ) : (
          staff.map((s) => {
            const shift = shifts.get(s.id);
            const isIn = Boolean(shift?.clock_in && !shift.clock_out);
            const isOut = Boolean(shift?.clock_in && shift.clock_out);
            const elapsed =
              shift?.clock_in && !shift.clock_out
                ? Date.now() - new Date(shift.clock_in).getTime()
                : shift?.clock_in && shift.clock_out
                  ? new Date(shift.clock_out).getTime() -
                    new Date(shift.clock_in).getTime()
                  : 0;

            return (
              <div
                key={s.id}
                className={cn(
                  "flex items-center gap-3 rounded-lg border p-3",
                  isIn && "border-emerald-500/40 bg-emerald-500/5",
                  isOut && "opacity-70",
                )}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium truncate">{s.name}</p>
                    <Badge variant="outline" className="text-[10px]">
                      {ROLE_LABELS[s.role]}
                    </Badge>
                    {isIn && (
                      <Badge className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-500/40 text-[10px]">
                        Ενεργός
                      </Badge>
                    )}
                    {isOut && (
                      <Badge variant="outline" className="text-[10px]">
                        Ολοκληρώθηκε
                      </Badge>
                    )}
                  </div>
                  {shift?.clock_in && (
                    <p className="text-xs text-muted-foreground">
                      Είσοδος:{" "}
                      {new Date(shift.clock_in).toLocaleTimeString("el-GR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      {shift.clock_out && (
                        <>
                          {" "}
                          · Έξοδος:{" "}
                          {new Date(shift.clock_out).toLocaleTimeString(
                            "el-GR",
                            { hour: "2-digit", minute: "2-digit" },
                          )}
                        </>
                      )}
                      {" · "}
                      <span className="font-medium">
                        {formatHours(elapsed)}
                      </span>
                    </p>
                  )}
                </div>

                {!shift?.clock_in && (
                  <Button
                    size="sm"
                    onClick={() => handleClockIn(s.id)}
                    disabled={isPending}
                  >
                    <LogIn className="mr-1 size-3.5" />
                    Έναρξη
                  </Button>
                )}
                {isIn && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleClockOut(s.id)}
                    disabled={isPending}
                  >
                    <LogOut className="mr-1 size-3.5" />
                    Λήξη
                  </Button>
                )}
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
