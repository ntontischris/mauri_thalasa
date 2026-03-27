"use client";

import { useState, useMemo } from "react";
import { startOfWeek, addDays, addWeeks, subWeeks, format } from "date-fns";
import { el } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useStaff } from "@/hooks/use-staff";
import { cn } from "@/lib/utils";
import { formatTime } from "@/lib/mock-data";
import type { ShiftType, StaffRole } from "@/lib/types";

const DAY_LABELS = ["Δευ", "Τρι", "Τετ", "Πεμ", "Παρ", "Σαβ", "Κυρ"];

const SHIFT_CONFIG: Record<
  ShiftType,
  { label: string; hours: string; color: string }
> = {
  morning: {
    label: "Πρωί",
    hours: "08-16",
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  },
  afternoon: {
    label: "Απόγευμα",
    hours: "16-00",
    color: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  },
  off: {
    label: "Ρεπό",
    hours: "",
    color: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
  },
};

const SHIFT_CYCLE: ShiftType[] = ["morning", "afternoon", "off"];

const ROLE_COLORS: Record<StaffRole, string> = {
  waiter: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  chef: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  barman:
    "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  manager: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
};

const ROLE_LABELS: Record<StaffRole, string> = {
  waiter: "Σερβιτόρος",
  chef: "Μάγειρας",
  barman: "Μπάρμαν",
  manager: "Manager",
};

function getWeekMonday(date: Date): Date {
  return startOfWeek(date, { weekStartsOn: 1 });
}

export function ShiftScheduler() {
  const { staff, shifts, getShiftsForWeek, setShift, clockIn, clockOut } =
    useStaff();
  const [weekStart, setWeekStart] = useState<Date>(() =>
    getWeekMonday(new Date()),
  );

  const activeStaff = useMemo(() => staff.filter((s) => s.isActive), [staff]);

  const weekStartStr = format(weekStart, "yyyy-MM-dd");
  const weekShifts = getShiftsForWeek(weekStartStr);

  const weekDates = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  }, [weekStart]);

  const weekEndDate = addDays(weekStart, 6);
  const todayStr = format(new Date(), "yyyy-MM-dd");

  const getShiftForCell = (staffId: string, date: Date): ShiftType => {
    const dateStr = format(date, "yyyy-MM-dd");
    const shift = weekShifts.find(
      (sh) => sh.staffId === staffId && sh.date === dateStr,
    );
    return shift?.type ?? "off";
  };

  const handleCellClick = (staffId: string, date: Date) => {
    const currentType = getShiftForCell(staffId, date);
    const currentIdx = SHIFT_CYCLE.indexOf(currentType);
    const nextType = SHIFT_CYCLE[(currentIdx + 1) % SHIFT_CYCLE.length];
    setShift(staffId, format(date, "yyyy-MM-dd"), nextType);
  };

  const handlePrevWeek = () => setWeekStart((prev) => subWeeks(prev, 1));
  const handleNextWeek = () => setWeekStart((prev) => addWeeks(prev, 1));

  // Today's shifts for clock in/out
  const todayShifts = useMemo(() => {
    return shifts.filter((sh) => sh.date === todayStr);
  }, [shifts, todayStr]);

  const getTodayShift = (staffId: string) => {
    return todayShifts.find((sh) => sh.staffId === staffId);
  };

  const computeDuration = (clockInStr: string, clockOutStr: string): string => {
    const diffMs =
      new Date(clockOutStr).getTime() - new Date(clockInStr).getTime();
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}ω ${minutes}λ`;
  };

  // Weekly hours summary
  const weeklySummary = useMemo(() => {
    return activeStaff.map((member) => {
      const memberShifts = weekShifts.filter(
        (sh) => sh.staffId === member.id && sh.type !== "off",
      );
      return {
        id: member.id,
        name: member.name,
        shiftsCount: memberShifts.length,
        totalHours: memberShifts.length * 8,
      };
    });
  }, [activeStaff, weekShifts]);

  return (
    <div className="space-y-6">
      {/* Week Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={handlePrevWeek}>
          <ChevronLeft className="size-4 mr-1" />
          Προηγούμενη
        </Button>
        <span className="text-sm font-medium">
          Εβδομάδα {format(weekStart, "dd/MM", { locale: el })} -{" "}
          {format(weekEndDate, "dd/MM", { locale: el })}
        </span>
        <Button variant="outline" size="sm" onClick={handleNextWeek}>
          Επόμενη
          <ChevronRight className="size-4 ml-1" />
        </Button>
      </div>

      {/* Shift Grid */}
      <div className="rounded-md border border-border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-3 py-2 font-medium text-muted-foreground min-w-[140px]">
                Προσωπικό
              </th>
              {weekDates.map((date, i) => {
                const dateStr = format(date, "yyyy-MM-dd");
                const isToday = dateStr === todayStr;
                return (
                  <th
                    key={i}
                    className={cn(
                      "text-center px-2 py-2 font-medium min-w-[80px]",
                      isToday
                        ? "text-primary bg-primary/5"
                        : "text-muted-foreground",
                    )}
                  >
                    <div>{DAY_LABELS[i]}</div>
                    <div className="text-xs font-normal">
                      {format(date, "dd/MM")}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {activeStaff.map((member) => (
              <tr key={member.id} className="hover:bg-muted/30">
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{member.name}</span>
                    <Badge
                      className={cn(
                        "border-transparent text-[10px] px-1.5",
                        ROLE_COLORS[member.role],
                      )}
                    >
                      {ROLE_LABELS[member.role]}
                    </Badge>
                  </div>
                </td>
                {weekDates.map((date, i) => {
                  const shiftType = getShiftForCell(member.id, date);
                  const config = SHIFT_CONFIG[shiftType];
                  const dateStr = format(date, "yyyy-MM-dd");
                  const isToday = dateStr === todayStr;
                  return (
                    <td
                      key={i}
                      className={cn(
                        "text-center px-1 py-2",
                        isToday && "bg-primary/5",
                      )}
                    >
                      <button
                        onClick={() => handleCellClick(member.id, date)}
                        className={cn(
                          "inline-flex items-center justify-center rounded-md px-2 py-1 text-xs font-medium transition-colors cursor-pointer hover:opacity-80",
                          config.color,
                        )}
                      >
                        {config.label}
                        {config.hours && (
                          <span className="ml-1 opacity-70">
                            {config.hours}
                          </span>
                        )}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>

        {activeStaff.length === 0 && (
          <div className="py-12 text-center text-muted-foreground">
            Δεν υπάρχει ενεργό προσωπικό
          </div>
        )}
      </div>

      {/* Clock In/Out - Today Only */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="size-4" />
            Παρουσίες Σήμερα ({format(new Date(), "dd/MM/yyyy")})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {activeStaff.map((member) => {
              const todayShift = getTodayShift(member.id);
              const shiftType = todayShift?.type ?? "off";
              const isOff = shiftType === "off";

              return (
                <div
                  key={member.id}
                  className="rounded-lg border border-border p-3 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">{member.name}</span>
                    <Badge
                      className={cn(
                        "border-transparent text-xs",
                        SHIFT_CONFIG[shiftType].color,
                      )}
                    >
                      {SHIFT_CONFIG[shiftType].label}
                    </Badge>
                  </div>

                  {isOff ? (
                    <p className="text-sm text-muted-foreground">Ρεπό</p>
                  ) : (
                    <div className="space-y-1">
                      {todayShift?.clockIn && (
                        <p className="text-xs text-muted-foreground">
                          Είσοδος: {formatTime(todayShift.clockIn)}
                        </p>
                      )}
                      {todayShift?.clockOut && (
                        <p className="text-xs text-muted-foreground">
                          Έξοδος: {formatTime(todayShift.clockOut)}
                        </p>
                      )}
                      {todayShift?.clockIn && todayShift?.clockOut && (
                        <p className="text-xs font-medium">
                          Διάρκεια:{" "}
                          {computeDuration(
                            todayShift.clockIn,
                            todayShift.clockOut,
                          )}
                        </p>
                      )}

                      <div className="flex gap-2 pt-1">
                        {!todayShift?.clockIn && (
                          <Button
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => clockIn(member.id)}
                          >
                            Clock In
                          </Button>
                        )}
                        {todayShift?.clockIn && !todayShift?.clockOut && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            onClick={() => clockOut(member.id)}
                          >
                            Clock Out
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Weekly Hours Summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Εβδομαδιαία Σύνοψη</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-2 font-medium text-muted-foreground">
                    Όνομα
                  </th>
                  <th className="text-center px-4 py-2 font-medium text-muted-foreground">
                    Βάρδιες
                  </th>
                  <th className="text-center px-4 py-2 font-medium text-muted-foreground">
                    Ώρες
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {weeklySummary.map((row) => (
                  <tr key={row.id}>
                    <td className="px-4 py-2 font-medium">{row.name}</td>
                    <td className="px-4 py-2 text-center">{row.shiftsCount}</td>
                    <td className="px-4 py-2 text-center">{row.totalHours}ω</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
