import { useCallback, useMemo } from "react";
import { usePOS } from "@/lib/pos-context";
import type {
  Reservation,
  ReservationStatus,
  ReservationSource,
  WaitlistEntry,
  BookingSettings,
} from "@/lib/types";
import { generateId } from "@/lib/mock-data";

export function useReservations() {
  const { state, dispatch } = usePOS();

  const reservations = state.reservations;
  const waitlist = state.waitlist;
  const bookingSettings = state.bookingSettings;

  // === Reservation CRUD ===

  const addReservation = useCallback(
    (data: Omit<Reservation, "id" | "createdAt" | "status"> & { status?: ReservationStatus }): string => {
      const id = generateId();
      const reservation: Reservation = {
        ...data,
        id,
        status: data.status ?? (bookingSettings.autoConfirm ? "confirmed" : "pending"),
        allergies: data.allergies ?? [],
        createdAt: new Date().toISOString(),
      };
      dispatch({ type: "ADD_RESERVATION", payload: reservation });
      return id;
    },
    [dispatch, bookingSettings.autoConfirm],
  );

  const updateReservation = useCallback(
    (reservation: Reservation): void => {
      dispatch({ type: "UPDATE_RESERVATION", payload: reservation });
    },
    [dispatch],
  );

  const deleteReservation = useCallback(
    (id: string): void => {
      dispatch({ type: "DELETE_RESERVATION", payload: id });
    },
    [dispatch],
  );

  const confirmReservation = useCallback(
    (id: string): void => {
      dispatch({ type: "CONFIRM_RESERVATION", payload: id });
    },
    [dispatch],
  );

  const seatReservation = useCallback(
    (reservationId: string, tableId?: string): void => {
      dispatch({ type: "SEAT_RESERVATION", payload: { reservationId, tableId } });
    },
    [dispatch],
  );

  const cancelReservation = useCallback(
    (reservationId: string, reason?: string): void => {
      dispatch({ type: "CANCEL_RESERVATION", payload: { reservationId, reason } });
    },
    [dispatch],
  );

  const markNoShow = useCallback(
    (id: string): void => {
      dispatch({ type: "MARK_NO_SHOW", payload: id });
    },
    [dispatch],
  );

  const completeReservation = useCallback(
    (id: string): void => {
      dispatch({ type: "COMPLETE_RESERVATION", payload: id });
    },
    [dispatch],
  );

  // === Queries ===

  const getReservationsForDate = useCallback(
    (date: string): Reservation[] =>
      reservations
        .filter((r) => r.reservationDate === date)
        .sort((a, b) => a.reservationTime.localeCompare(b.reservationTime)),
    [reservations],
  );

  const getUpcomingReservations = useCallback(
    (limit = 10): Reservation[] => {
      const now = new Date();
      const today = now.toISOString().split("T")[0];
      const currentTime = now.toTimeString().slice(0, 5);

      return reservations
        .filter(
          (r) =>
            (r.status === "pending" || r.status === "confirmed") &&
            (r.reservationDate > today ||
              (r.reservationDate === today && r.reservationTime >= currentTime)),
        )
        .sort((a, b) => {
          const dateCompare = a.reservationDate.localeCompare(b.reservationDate);
          if (dateCompare !== 0) return dateCompare;
          return a.reservationTime.localeCompare(b.reservationTime);
        })
        .slice(0, limit);
    },
    [reservations],
  );

  const getTodayReservations = useCallback((): Reservation[] => {
    const today = new Date().toISOString().split("T")[0];
    return getReservationsForDate(today);
  }, [getReservationsForDate]);

  const getReservationStats = useCallback(
    (startDate: string, endDate: string) => {
      const filtered = reservations.filter(
        (r) => r.reservationDate >= startDate && r.reservationDate <= endDate,
      );
      return {
        total: filtered.length,
        confirmed: filtered.filter((r) => r.status === "confirmed" || r.status === "seated" || r.status === "completed").length,
        cancelled: filtered.filter((r) => r.status === "cancelled").length,
        noShows: filtered.filter((r) => r.status === "no_show").length,
        avgPartySize: filtered.length > 0 ? filtered.reduce((sum, r) => sum + r.partySize, 0) / filtered.length : 0,
        totalCovers: filtered.reduce((sum, r) => sum + r.partySize, 0),
      };
    },
    [reservations],
  );

  // === Smart Table Suggestion (i-host core feature) ===

  const suggestTable = useCallback(
    (date: string, time: string, partySize: number, preferredZoneId?: string): Array<{
      tableId: string;
      tableNumber: number;
      capacity: number;
      zoneId: string;
      zoneName: string;
      score: number;
    }> => {
      const durationMinutes = bookingSettings.defaultDurationMinutes;

      // Parse reservation time range
      const startMinutes = parseInt(time.split(":")[0]) * 60 + parseInt(time.split(":")[1]);
      const endMinutes = startMinutes + durationMinutes;

      // Get conflicting reservations for this date/time
      const conflicting = reservations.filter((r) => {
        if (r.reservationDate !== date) return false;
        if (r.status === "cancelled" || r.status === "no_show" || r.status === "completed") return false;
        if (!r.tableId) return false;

        const rStart = parseInt(r.reservationTime.split(":")[0]) * 60 + parseInt(r.reservationTime.split(":")[1]);
        const rEnd = rStart + r.estimatedDurationMinutes;

        return startMinutes < rEnd && endMinutes > rStart;
      });

      const conflictingTableIds = new Set(conflicting.map((r) => r.tableId));

      return state.tables
        .filter((t) => t.capacity >= partySize && !conflictingTableIds.has(t.id))
        .map((t) => {
          const zone = state.zones.find((z) => z.id === t.zoneId);
          let score = 0;

          // Prefer exact capacity match
          if (t.capacity === partySize) score += 50;
          // Penalize excess capacity
          score -= (t.capacity - partySize) * 10;
          // Prefer preferred zone
          if (preferredZoneId && t.zoneId === preferredZoneId) score += 100;

          return {
            tableId: t.id,
            tableNumber: t.number,
            capacity: t.capacity,
            zoneId: t.zoneId,
            zoneName: zone?.name ?? "",
            score,
          };
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);
    },
    [state.tables, state.zones, reservations, bookingSettings.defaultDurationMinutes],
  );

  // === Table availability check ===

  const isTableAvailable = useCallback(
    (tableId: string, date: string, time: string, excludeReservationId?: string): boolean => {
      const duration = bookingSettings.defaultDurationMinutes;
      const startMinutes = parseInt(time.split(":")[0]) * 60 + parseInt(time.split(":")[1]);
      const endMinutes = startMinutes + duration;

      return !reservations.some((r) => {
        if (r.tableId !== tableId) return false;
        if (r.reservationDate !== date) return false;
        if (r.status === "cancelled" || r.status === "no_show" || r.status === "completed") return false;
        if (excludeReservationId && r.id === excludeReservationId) return false;

        const rStart = parseInt(r.reservationTime.split(":")[0]) * 60 + parseInt(r.reservationTime.split(":")[1]);
        const rEnd = rStart + r.estimatedDurationMinutes;

        return startMinutes < rEnd && endMinutes > rStart;
      });
    },
    [reservations, bookingSettings.defaultDurationMinutes],
  );

  // === Caller ID Lookup ===

  const callerIdLookup = useCallback(
    (phone: string) => {
      const customer = state.customers.find((c) => c.phone === phone);
      if (!customer) return null;

      const visits = state.customerVisits.filter((v) => v.customerId === customer.id);
      const lastVisit = visits.length > 0
        ? visits.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]
        : null;

      return {
        customer,
        totalVisits: visits.length,
        lastVisitDate: lastVisit?.date,
        totalSpent: visits.reduce((sum, v) => sum + v.total, 0),
      };
    },
    [state.customers, state.customerVisits],
  );

  // === Waitlist ===

  const addToWaitlist = useCallback(
    (data: Omit<WaitlistEntry, "id" | "joinedAt" | "status">): string => {
      const id = generateId();
      const entry: WaitlistEntry = {
        ...data,
        id,
        status: "waiting",
        joinedAt: new Date().toISOString(),
      };
      dispatch({ type: "ADD_TO_WAITLIST", payload: entry });
      return id;
    },
    [dispatch],
  );

  const notifyWaitlistEntry = useCallback(
    (id: string): void => {
      dispatch({ type: "NOTIFY_WAITLIST", payload: id });
    },
    [dispatch],
  );

  const seatFromWaitlist = useCallback(
    (waitlistId: string, tableId: string): void => {
      dispatch({ type: "SEAT_FROM_WAITLIST", payload: { waitlistId, tableId } });
    },
    [dispatch],
  );

  const removeFromWaitlist = useCallback(
    (id: string): void => {
      dispatch({ type: "REMOVE_FROM_WAITLIST", payload: id });
    },
    [dispatch],
  );

  const activeWaitlist = useMemo(
    () => waitlist.filter((w) => w.status === "waiting" || w.status === "notified")
      .sort((a, b) => b.priority - a.priority || new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime()),
    [waitlist],
  );

  // === Booking Settings ===

  const updateBookingSettings = useCallback(
    (settings: BookingSettings): void => {
      dispatch({ type: "UPDATE_BOOKING_SETTINGS", payload: settings });
    },
    [dispatch],
  );

  // === Time slot generation ===

  const getAvailableSlots = useCallback(
    (date: string, partySize: number): Array<{ time: string; availableCount: number }> => {
      const dayName = new Date(date + "T12:00:00")
        .toLocaleDateString("en-US", { weekday: "long" })
        .toLowerCase();
      const hours = bookingSettings.operatingHours[dayName];
      if (!hours) return [];

      const slots: Array<{ time: string; availableCount: number }> = [];
      const [openH, openM] = hours.open.split(":").map(Number);
      const [closeH, closeM] = hours.close.split(":").map(Number);
      const openMinutes = openH * 60 + openM;
      const closeMinutes = closeH < openH ? (closeH + 24) * 60 + closeM : closeH * 60 + closeM;
      const interval = bookingSettings.timeSlotIntervalMinutes;

      for (let m = openMinutes; m < closeMinutes; m += interval) {
        const h = Math.floor(m / 60) % 24;
        const min = m % 60;
        const timeStr = `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;

        const availableCount = state.tables.filter(
          (t) => t.capacity >= partySize && isTableAvailable(t.id, date, timeStr),
        ).length;

        slots.push({ time: timeStr, availableCount });
      }

      return slots;
    },
    [bookingSettings, state.tables, isTableAvailable],
  );

  return {
    reservations,
    waitlist,
    activeWaitlist,
    bookingSettings,
    // CRUD
    addReservation,
    updateReservation,
    deleteReservation,
    confirmReservation,
    seatReservation,
    cancelReservation,
    markNoShow,
    completeReservation,
    // Queries
    getReservationsForDate,
    getUpcomingReservations,
    getTodayReservations,
    getReservationStats,
    // Smart features
    suggestTable,
    isTableAvailable,
    callerIdLookup,
    getAvailableSlots,
    // Waitlist
    addToWaitlist,
    notifyWaitlistEntry,
    seatFromWaitlist,
    removeFromWaitlist,
    // Settings
    updateBookingSettings,
  };
}
