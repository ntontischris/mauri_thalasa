"use client";

import { useState, useMemo } from "react";
import { useReservations } from "@/hooks/use-reservations";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CalendarDays,
  Users,
  UserX,
  TrendingUp,
  Clock,
  Phone,
  Globe,
  BarChart3,
  XCircle,
} from "lucide-react";
import type { ReservationSource, ReservationStatus } from "@/lib/types";

const SOURCE_LABELS: Record<ReservationSource, string> = {
  phone: "Τηλέφωνο",
  walk_in: "Walk-in",
  website: "Website",
  facebook: "Facebook",
  instagram: "Instagram",
  google: "Google",
  manual: "Χειροκίνητα",
};

const STATUS_LABELS: Record<ReservationStatus, string> = {
  pending: "Εκκρεμούν",
  confirmed: "Επιβεβαιωμένες",
  seated: "Seated",
  completed: "Ολοκληρωμένες",
  cancelled: "Ακυρώσεις",
  no_show: "No-shows",
};

export default function AnalyticsReservations() {
  const { reservations, getReservationStats } = useReservations();

  const today = new Date();
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(today.getDate() - 30);

  const [startDate, setStartDate] = useState(thirtyDaysAgo.toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState(today.toISOString().split("T")[0]);

  const stats = useMemo(
    () => getReservationStats(startDate, endDate),
    [getReservationStats, startDate, endDate],
  );

  const filtered = useMemo(
    () => reservations.filter((r) => r.reservationDate >= startDate && r.reservationDate <= endDate),
    [reservations, startDate, endDate],
  );

  // By status breakdown
  const byStatus = useMemo(() => {
    const map = new Map<ReservationStatus, number>();
    for (const r of filtered) {
      map.set(r.status, (map.get(r.status) ?? 0) + 1);
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [filtered]);

  // By source breakdown
  const bySource = useMemo(() => {
    const map = new Map<ReservationSource, number>();
    for (const r of filtered) {
      map.set(r.source, (map.get(r.source) ?? 0) + 1);
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [filtered]);

  // By day of week
  const byDayOfWeek = useMemo(() => {
    const days = ["Κυρ", "Δευ", "Τρι", "Τετ", "Πεμ", "Παρ", "Σαβ"];
    const counts = new Array(7).fill(0);
    for (const r of filtered) {
      if (r.status === "cancelled" || r.status === "no_show") continue;
      const d = new Date(r.reservationDate + "T12:00:00").getDay();
      counts[d]++;
    }
    return days.map((name, i) => ({ name, count: counts[i] }));
  }, [filtered]);

  // Peak hours
  const byHour = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of filtered) {
      if (r.status === "cancelled" || r.status === "no_show") continue;
      const hour = r.reservationTime.split(":")[0] + ":00";
      counts.set(hour, (counts.get(hour) ?? 0) + 1);
    }
    return Array.from(counts.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filtered]);

  // By party size distribution
  const bySizeDistribution = useMemo(() => {
    const sizes = new Map<number, number>();
    for (const r of filtered) {
      if (r.status === "cancelled" || r.status === "no_show") continue;
      const size = Math.min(r.partySize, 8);
      sizes.set(size, (sizes.get(size) ?? 0) + 1);
    }
    return Array.from(sizes.entries()).sort((a, b) => a[0] - b[0]);
  }, [filtered]);

  const noShowRate = stats.total > 0 ? ((stats.noShows / stats.total) * 100).toFixed(1) : "0";
  const cancellationRate = stats.total > 0 ? ((stats.cancelled / stats.total) * 100).toFixed(1) : "0";

  return (
    <div className="space-y-6">
      {/* Date range selector */}
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <Label className="text-xs">Από</Label>
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-40" />
        </div>
        <div>
          <Label className="text-xs">Έως</Label>
          <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-40" />
        </div>
        <Badge variant="outline" className="mb-1">{filtered.length} κρατήσεις</Badge>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-6">
        <Card>
          <CardContent className="pt-4 text-center">
            <CalendarDays className="mx-auto mb-1 size-5 text-primary" />
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-xs text-muted-foreground">Σύνολο</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <TrendingUp className="mx-auto mb-1 size-5 text-green-600" />
            <p className="text-2xl font-bold">{stats.confirmed}</p>
            <p className="text-xs text-muted-foreground">Επιβεβαιωμένες</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <Users className="mx-auto mb-1 size-5 text-blue-600" />
            <p className="text-2xl font-bold">{stats.totalCovers}</p>
            <p className="text-xs text-muted-foreground">Σύνολο Ατόμων</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <BarChart3 className="mx-auto mb-1 size-5 text-purple-600" />
            <p className="text-2xl font-bold">{stats.avgPartySize.toFixed(1)}</p>
            <p className="text-xs text-muted-foreground">Μ.Ο. Ατόμων</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <XCircle className="mx-auto mb-1 size-5 text-red-500" />
            <p className="text-2xl font-bold">{cancellationRate}%</p>
            <p className="text-xs text-muted-foreground">Ακυρώσεις</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <UserX className="mx-auto mb-1 size-5 text-red-600" />
            <p className="text-2xl font-bold">{noShowRate}%</p>
            <p className="text-xs text-muted-foreground">No-shows</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* By Status */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Κατάσταση Κρατήσεων</CardTitle>
          </CardHeader>
          <CardContent>
            {byStatus.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">Δεν υπάρχουν δεδομένα</p>
            ) : (
              <div className="space-y-2">
                {byStatus.map(([status, count]) => {
                  const pct = stats.total > 0 ? (count / stats.total) * 100 : 0;
                  return (
                    <div key={status} className="flex items-center gap-3">
                      <span className="w-28 text-sm">{STATUS_LABELS[status]}</span>
                      <div className="flex-1">
                        <div className="h-5 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full bg-primary/70 transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                      <span className="w-12 text-right text-sm font-medium">{count}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* By Source */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Κανάλι Προέλευσης</CardTitle>
          </CardHeader>
          <CardContent>
            {bySource.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">Δεν υπάρχουν δεδομένα</p>
            ) : (
              <div className="space-y-2">
                {bySource.map(([source, count]) => {
                  const pct = stats.total > 0 ? (count / stats.total) * 100 : 0;
                  return (
                    <div key={source} className="flex items-center gap-3">
                      <span className="w-28 text-sm">{SOURCE_LABELS[source]}</span>
                      <div className="flex-1">
                        <div className="h-5 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full bg-green-500/70 transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                      <span className="w-12 text-right text-sm font-medium">{count}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* By Day of Week */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Κρατήσεις ανά Ημέρα</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between gap-1" style={{ height: 120 }}>
              {byDayOfWeek.map((day) => {
                const max = Math.max(...byDayOfWeek.map((d) => d.count), 1);
                const pct = (day.count / max) * 100;
                return (
                  <div key={day.name} className="flex flex-1 flex-col items-center gap-1">
                    <span className="text-xs font-medium">{day.count}</span>
                    <div className="w-full rounded-t bg-primary/70" style={{ height: `${pct}%`, minHeight: day.count > 0 ? 4 : 0 }} />
                    <span className="text-[10px] text-muted-foreground">{day.name}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Peak Hours */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Ώρες Αιχμής</CardTitle>
          </CardHeader>
          <CardContent>
            {byHour.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">Δεν υπάρχουν δεδομένα</p>
            ) : (
              <div className="flex items-end justify-between gap-1" style={{ height: 120 }}>
                {byHour.map(([hour, count]) => {
                  const max = Math.max(...byHour.map(([, c]) => c), 1);
                  const pct = (count / max) * 100;
                  return (
                    <div key={hour} className="flex flex-1 flex-col items-center gap-1">
                      <span className="text-xs font-medium">{count}</span>
                      <div className="w-full rounded-t bg-amber-500/70" style={{ height: `${pct}%`, minHeight: count > 0 ? 4 : 0 }} />
                      <span className="text-[10px] text-muted-foreground">{hour.split(":")[0]}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Party Size Distribution */}
        <Card className="md:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Κατανομή Μεγέθους Παρέας</CardTitle>
          </CardHeader>
          <CardContent>
            {bySizeDistribution.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">Δεν υπάρχουν δεδομένα</p>
            ) : (
              <div className="flex items-end justify-center gap-3" style={{ height: 120 }}>
                {bySizeDistribution.map(([size, count]) => {
                  const max = Math.max(...bySizeDistribution.map(([, c]) => c), 1);
                  const pct = (count / max) * 100;
                  return (
                    <div key={size} className="flex flex-col items-center gap-1" style={{ width: 48 }}>
                      <span className="text-xs font-medium">{count}</span>
                      <div className="w-full rounded-t bg-blue-500/70" style={{ height: `${pct}%`, minHeight: count > 0 ? 4 : 0 }} />
                      <span className="text-xs text-muted-foreground">{size}{size >= 8 ? "+" : ""} ατ.</span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
