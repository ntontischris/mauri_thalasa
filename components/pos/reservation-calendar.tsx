"use client";

import { useMemo } from "react";
import { usePOS } from "@/lib/pos-context";
import { useReservations } from "@/hooks/use-reservations";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Reservation } from "@/lib/types";

interface ReservationCalendarProps {
  startDate: string; // YYYY-MM-DD (Monday of the week)
  onSelectDate?: (date: string) => void;
  selectedDate?: string;
}

const DAY_NAMES = ["Δευ", "Τρι", "Τετ", "Πεμ", "Παρ", "Σαβ", "Κυρ"];

const STATUS_DOTS: Record<string, string> = {
  pending: "bg-amber-400",
  confirmed: "bg-green-500",
  seated: "bg-blue-500",
  completed: "bg-gray-400",
  cancelled: "bg-red-400",
  no_show: "bg-red-600",
};

export function ReservationCalendar({ startDate, onSelectDate, selectedDate }: ReservationCalendarProps) {
  const { state } = usePOS();
  const { reservations } = useReservations();

  const today = new Date().toISOString().split("T")[0];

  // Generate 7 days from startDate
  const days = useMemo(() => {
    const result: Array<{ date: string; dayName: string; dayNum: number; monthName: string }> = [];
    const start = new Date(startDate + "T12:00:00");
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      result.push({
        date: d.toISOString().split("T")[0],
        dayName: DAY_NAMES[i],
        dayNum: d.getDate(),
        monthName: d.toLocaleDateString("el-GR", { month: "short" }),
      });
    }
    return result;
  }, [startDate]);

  // Group reservations per day
  const reservationsByDay = useMemo(() => {
    const map = new Map<string, Reservation[]>();
    for (const day of days) {
      map.set(
        day.date,
        reservations
          .filter((r) => r.reservationDate === day.date)
          .sort((a, b) => a.reservationTime.localeCompare(b.reservationTime)),
      );
    }
    return map;
  }, [days, reservations]);

  // Time slots (12:00 - 23:00)
  const hours = useMemo(() => {
    const result: string[] = [];
    for (let h = 12; h <= 23; h++) {
      result.push(`${String(h).padStart(2, "0")}:00`);
    }
    return result;
  }, []);

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[700px]">
        {/* Header row - days */}
        <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b">
          <div className="p-2" /> {/* Empty corner */}
          {days.map((day) => {
            const dayReservations = reservationsByDay.get(day.date) ?? [];
            const activeCount = dayReservations.filter(
              (r) => r.status !== "cancelled" && r.status !== "no_show",
            ).length;
            const covers = dayReservations
              .filter((r) => r.status !== "cancelled" && r.status !== "no_show")
              .reduce((sum, r) => sum + r.partySize, 0);
            const isToday = day.date === today;
            const isSelected = day.date === selectedDate;

            return (
              <button
                key={day.date}
                onClick={() => onSelectDate?.(day.date)}
                className={cn(
                  "flex flex-col items-center border-l p-2 transition-colors hover:bg-muted/50",
                  isToday && "bg-primary/5",
                  isSelected && "bg-primary/10 ring-2 ring-primary ring-inset",
                )}
              >
                <span className="text-xs text-muted-foreground">{day.dayName}</span>
                <span className={cn(
                  "text-lg font-bold",
                  isToday && "text-primary",
                )}>
                  {day.dayNum}
                </span>
                <span className="text-xs text-muted-foreground">{day.monthName}</span>
                {activeCount > 0 && (
                  <div className="mt-1 flex items-center gap-1">
                    <Badge variant="secondary" className="h-5 text-[10px]">
                      {activeCount} / {covers}ατ
                    </Badge>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Time grid */}
        <div className="grid grid-cols-[60px_repeat(7,1fr)]">
          {hours.map((hour) => (
            <div key={hour} className="contents">
              {/* Time label */}
              <div className="flex items-start justify-end border-b border-r p-1 pr-2 text-xs text-muted-foreground">
                {hour}
              </div>
              {/* Day cells */}
              {days.map((day) => {
                const dayReservations = reservationsByDay.get(day.date) ?? [];
                const hourReservations = dayReservations.filter((r) => {
                  const rHour = r.reservationTime.split(":")[0];
                  return rHour === hour.split(":")[0];
                });

                return (
                  <div
                    key={`${day.date}-${hour}`}
                    className={cn(
                      "min-h-[48px] border-b border-l p-0.5",
                      day.date === today && "bg-primary/[0.02]",
                    )}
                  >
                    {hourReservations.map((r) => (
                      <div
                        key={r.id}
                        className={cn(
                          "mb-0.5 truncate rounded px-1.5 py-0.5 text-[10px] leading-tight",
                          r.status === "cancelled" || r.status === "no_show"
                            ? "bg-muted text-muted-foreground line-through"
                            : "bg-primary/10 text-primary",
                          r.status === "confirmed" && "bg-green-500/10 text-green-700",
                          r.status === "seated" && "bg-blue-500/10 text-blue-700",
                        )}
                        title={`${r.reservationTime} ${r.guestName} (${r.partySize}ατ)`}
                      >
                        <span className="font-semibold">{r.reservationTime}</span>{" "}
                        {r.guestName}
                        <span className="ml-1 opacity-70">{r.partySize}ατ</span>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
