"use client";

import { useMemo } from "react";
import { usePOS } from "@/lib/pos-context";
import { useReservations } from "@/hooks/use-reservations";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Check,
  X,
  UserCheck,
  Clock,
  Phone,
  Globe,
  Eye,
} from "lucide-react";
import type { Reservation, ReservationStatus } from "@/lib/types";

interface ReservationTimelineProps {
  date: string;
  onEdit?: (reservation: Reservation) => void;
}

const STATUS_CONFIG: Record<ReservationStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Εκκρεμεί", variant: "outline" },
  confirmed: { label: "Επιβεβαιωμένη", variant: "default" },
  seated: { label: "Seated", variant: "secondary" },
  completed: { label: "Ολοκληρώθηκε", variant: "secondary" },
  cancelled: { label: "Ακυρώθηκε", variant: "destructive" },
  no_show: { label: "No-show", variant: "destructive" },
};

const SOURCE_ICONS: Record<string, typeof Phone> = {
  phone: Phone,
  website: Globe,
  facebook: Globe,
  instagram: Globe,
  google: Globe,
  walk_in: UserCheck,
  manual: Clock,
};

export function ReservationTimeline({ date, onEdit }: ReservationTimelineProps) {
  const { state } = usePOS();
  const {
    getReservationsForDate,
    confirmReservation,
    seatReservation,
    cancelReservation,
    markNoShow,
  } = useReservations();

  const reservations = useMemo(() => getReservationsForDate(date), [date, getReservationsForDate]);

  // Group by hour
  const grouped = useMemo(() => {
    const map = new Map<string, Reservation[]>();
    for (const r of reservations) {
      const hour = r.reservationTime.split(":")[0] + ":00";
      const existing = map.get(hour) ?? [];
      existing.push(r);
      map.set(hour, existing);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [reservations]);

  const totalCovers = reservations
    .filter((r) => r.status !== "cancelled" && r.status !== "no_show")
    .reduce((sum, r) => sum + r.partySize, 0);

  if (reservations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <Clock className="mb-2 size-8" />
        <p>Δεν υπάρχουν κρατήσεις για αυτή την ημερομηνία</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="flex gap-4 text-sm text-muted-foreground">
        <span>{reservations.length} κρατήσεις</span>
        <span>{totalCovers} άτομα</span>
      </div>

      {/* Timeline */}
      <div className="space-y-6">
        {grouped.map(([hour, items]) => (
          <div key={hour}>
            <div className="mb-2 flex items-center gap-2">
              <div className="text-sm font-semibold text-muted-foreground">{hour}</div>
              <div className="h-px flex-1 bg-border" />
              <Badge variant="outline" className="text-xs">{items.length}</Badge>
            </div>

            <div className="ml-4 space-y-2 border-l-2 border-border pl-4">
              {items.map((r) => {
                const config = STATUS_CONFIG[r.status];
                const SourceIcon = SOURCE_ICONS[r.source] ?? Clock;
                const zone = state.zones.find((z) => z.id === r.zoneId);
                const table = r.tableId ? state.tables.find((t) => t.id === r.tableId) : null;

                return (
                  <div
                    key={r.id}
                    className={cn(
                      "rounded-lg border bg-card p-3 transition-colors hover:bg-muted/50",
                      r.status === "cancelled" && "opacity-50",
                      r.status === "no_show" && "opacity-50",
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{r.reservationTime}</span>
                          <span className="font-medium">{r.guestName}</span>
                          <Badge variant={config.variant} className="text-xs">{config.label}</Badge>
                          {r.occasion && (
                            <Badge variant="outline" className="text-xs">{r.occasion}</Badge>
                          )}
                        </div>
                        <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <UserCheck className="size-3" />
                            {r.partySize} άτομα
                          </span>
                          {table && (
                            <span>T{table.number}</span>
                          )}
                          {zone && (
                            <span>{zone.name}</span>
                          )}
                          <span className="flex items-center gap-1">
                            <SourceIcon className="size-3" />
                            {r.source}
                          </span>
                          {r.guestPhone && (
                            <span className="flex items-center gap-1">
                              <Phone className="size-3" />
                              {r.guestPhone}
                            </span>
                          )}
                        </div>
                        {r.notes && (
                          <p className="mt-1 text-xs text-muted-foreground italic">{r.notes}</p>
                        )}
                        {r.allergies.length > 0 && (
                          <div className="mt-1">
                            <Badge variant="destructive" className="text-xs">
                              Αλλεργίες: {r.allergies.join(", ")}
                            </Badge>
                          </div>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="flex gap-1">
                        {r.status === "pending" && (
                          <>
                            <Button size="icon" variant="ghost" className="size-7" onClick={() => confirmReservation(r.id)} title="Επιβεβαίωση">
                              <Check className="size-3.5 text-green-600" />
                            </Button>
                            <Button size="icon" variant="ghost" className="size-7" onClick={() => cancelReservation(r.id)} title="Ακύρωση">
                              <X className="size-3.5 text-red-500" />
                            </Button>
                          </>
                        )}
                        {r.status === "confirmed" && (
                          <>
                            <Button size="icon" variant="ghost" className="size-7" onClick={() => seatReservation(r.id, r.tableId)} title="Seat">
                              <UserCheck className="size-3.5 text-blue-600" />
                            </Button>
                            <Button size="icon" variant="ghost" className="size-7" onClick={() => markNoShow(r.id)} title="No-show">
                              <X className="size-3.5 text-red-500" />
                            </Button>
                          </>
                        )}
                        {onEdit && (r.status === "pending" || r.status === "confirmed") && (
                          <Button size="icon" variant="ghost" className="size-7" onClick={() => onEdit(r)} title="Επεξεργασία">
                            <Eye className="size-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
