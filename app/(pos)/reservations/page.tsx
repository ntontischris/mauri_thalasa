"use client";

import { useState } from "react";
import { usePOS } from "@/lib/pos-context";
import { useReservations } from "@/hooks/use-reservations";
import { ReservationForm } from "@/components/pos/reservation-form";
import { ReservationTimeline } from "@/components/pos/reservation-timeline";
import { ReservationCalendar } from "@/components/pos/reservation-calendar";
import { WaitlistPanel } from "@/components/pos/waitlist-panel";
import { CallerIdPopup } from "@/components/pos/caller-id-popup";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CalendarPlus,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Users,
  Clock,
  UserX,
  TrendingUp,
  Phone,
  LayoutGrid,
  List,
} from "lucide-react";
import type { Reservation } from "@/lib/types";

export default function ReservationsPage() {
  const { state } = usePOS();
  const { getReservationsForDate, getUpcomingReservations, getReservationStats, activeWaitlist } = useReservations();

  const today = new Date().toISOString().split("T")[0];
  const [selectedDate, setSelectedDate] = useState(today);
  const [formOpen, setFormOpen] = useState(false);
  const [callerIdOpen, setCallerIdOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"timeline" | "calendar">("timeline");
  const [editReservation, setEditReservation] = useState<Reservation | undefined>();
  const [prefillPhone, setPrefillPhone] = useState<string | undefined>();
  const [prefillName, setPrefillName] = useState<string | undefined>();

  // Navigation
  const goToDate = (offset: number) => {
    const d = new Date(selectedDate + "T12:00:00");
    d.setDate(d.getDate() + offset);
    setSelectedDate(d.toISOString().split("T")[0]);
  };

  const formatDisplayDate = (dateStr: string) => {
    const d = new Date(dateStr + "T12:00:00");
    return d.toLocaleDateString("el-GR", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
  };

  const isToday = selectedDate === today;

  // Stats
  const todayReservations = getReservationsForDate(today);
  const selectedReservations = getReservationsForDate(selectedDate);
  const upcoming = getUpcomingReservations(5);

  const todayActive = todayReservations.filter(
    (r) => r.status !== "cancelled" && r.status !== "no_show",
  );
  const todayCovers = todayActive.reduce((sum, r) => sum + r.partySize, 0);
  const todayConfirmed = todayReservations.filter(
    (r) => r.status === "confirmed",
  ).length;
  const todayPending = todayReservations.filter(
    (r) => r.status === "pending",
  ).length;

  // Last 30 day stats
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const stats = getReservationStats(
    thirtyDaysAgo.toISOString().split("T")[0],
    today,
  );

  const handleEdit = (reservation: Reservation) => {
    setEditReservation(reservation);
    setFormOpen(true);
  };

  const handleNew = () => {
    setEditReservation(undefined);
    setFormOpen(true);
  };

  if (!state.isLoaded) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Κρατήσεις</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Διαχείριση κρατήσεων, αναμονής & online booking
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setCallerIdOpen(true)}>
            <Phone className="mr-2 size-4" />
            Caller ID
          </Button>
          <Button onClick={handleNew}>
            <CalendarPlus className="mr-2 size-4" />
            Νέα Κράτηση
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
              <CalendarDays className="size-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{todayActive.length}</p>
              <p className="text-xs text-muted-foreground">Σημερινές</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <div className="flex size-10 items-center justify-center rounded-lg bg-green-500/10">
              <Users className="size-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{todayCovers}</p>
              <p className="text-xs text-muted-foreground">Άτομα σήμερα</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <div className="flex size-10 items-center justify-center rounded-lg bg-amber-500/10">
              <Clock className="size-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{todayPending}</p>
              <p className="text-xs text-muted-foreground">Εκκρεμούν</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <div className="flex size-10 items-center justify-center rounded-lg bg-red-500/10">
              <UserX className="size-5 text-red-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.noShows}</p>
              <p className="text-xs text-muted-foreground">No-shows (30η)</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Left: Timeline */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button size="icon" variant="ghost" onClick={() => goToDate(viewMode === "calendar" ? -7 : -1)}>
                  <ChevronLeft className="size-4" />
                </Button>
                <Button
                  variant={isToday ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedDate(today)}
                >
                  Σήμερα
                </Button>
                <Button size="icon" variant="ghost" onClick={() => goToDate(viewMode === "calendar" ? 7 : 1)}>
                  <ChevronRight className="size-4" />
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-base">
                  {formatDisplayDate(selectedDate)}
                  <Badge variant="secondary" className="ml-2">
                    {selectedReservations.filter((r) => r.status !== "cancelled" && r.status !== "no_show").length}
                  </Badge>
                </CardTitle>
                <div className="flex rounded-md border">
                  <Button
                    size="icon"
                    variant={viewMode === "timeline" ? "default" : "ghost"}
                    className="size-8 rounded-r-none"
                    onClick={() => setViewMode("timeline")}
                  >
                    <List className="size-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant={viewMode === "calendar" ? "default" : "ghost"}
                    className="size-8 rounded-l-none"
                    onClick={() => setViewMode("calendar")}
                  >
                    <LayoutGrid className="size-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {viewMode === "timeline" ? (
              <ReservationTimeline date={selectedDate} onEdit={handleEdit} />
            ) : (
              <ReservationCalendar
                startDate={(() => {
                  const d = new Date(selectedDate + "T12:00:00");
                  const day = d.getDay();
                  const diff = day === 0 ? -6 : 1 - day;
                  d.setDate(d.getDate() + diff);
                  return d.toISOString().split("T")[0];
                })()}
                selectedDate={selectedDate}
                onSelectDate={(date) => {
                  setSelectedDate(date);
                  setViewMode("timeline");
                }}
              />
            )}
          </CardContent>
        </Card>

        {/* Right: Sidebar */}
        <div className="space-y-4">
          {/* Waitlist */}
          <Card>
            <CardContent className="pt-6">
              <WaitlistPanel />
            </CardContent>
          </Card>

          {/* Upcoming */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Επόμενες Κρατήσεις</CardTitle>
            </CardHeader>
            <CardContent>
              {upcoming.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  Δεν υπάρχουν επόμενες κρατήσεις
                </p>
              ) : (
                <div className="space-y-2">
                  {upcoming.map((r) => (
                    <div
                      key={r.id}
                      className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                    >
                      <div>
                        <span className="font-medium">{r.guestName}</span>
                        <div className="flex gap-2 text-xs text-muted-foreground">
                          <span>{r.reservationDate === today ? "Σήμερα" : new Date(r.reservationDate + "T12:00:00").toLocaleDateString("el-GR", { day: "numeric", month: "short" })}</span>
                          <span>{r.reservationTime}</span>
                          <span>{r.partySize} ατ.</span>
                        </div>
                      </div>
                      <Badge variant={r.status === "confirmed" ? "default" : "outline"} className="text-xs">
                        {r.status === "confirmed" ? "OK" : "?"}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 30-day stats */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-1 text-sm">
                <TrendingUp className="size-3.5" />
                Στατιστικά 30 ημερών
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-muted-foreground">Σύνολο</p>
                  <p className="font-semibold">{stats.total}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Επιβεβαιωμένες</p>
                  <p className="font-semibold">{stats.confirmed}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Ακυρώσεις</p>
                  <p className="font-semibold">{stats.cancelled}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Μ.Ο. ατόμων</p>
                  <p className="font-semibold">{stats.avgPartySize.toFixed(1)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Reservation Form Dialog */}
      <ReservationForm
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) {
            setEditReservation(undefined);
            setPrefillPhone(undefined);
            setPrefillName(undefined);
          }
        }}
        date={selectedDate}
        editReservation={editReservation}
      />

      {/* Caller ID Popup */}
      <CallerIdPopup
        open={callerIdOpen}
        onOpenChange={setCallerIdOpen}
        onCreateReservation={(phone, name) => {
          setPrefillPhone(phone);
          setPrefillName(name);
          setFormOpen(true);
        }}
      />
    </div>
  );
}
