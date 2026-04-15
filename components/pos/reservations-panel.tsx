"use client";

import { useState, useTransition } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Plus,
  CalendarDays,
  Users,
  Clock,
  Phone,
  Check,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  createReservation,
  updateReservationStatus,
  addToWaitlist,
  removeFromWaitlist,
} from "@/lib/actions/reservations";
import type {
  DbReservation,
  DbWaitlistEntry,
  ReservationStatus,
} from "@/lib/types/database";

interface ReservationsPanelProps {
  initialReservations: DbReservation[];
  initialWaitlist: DbWaitlistEntry[];
}

const statusConfig: Record<
  ReservationStatus,
  { label: string; color: string }
> = {
  pending: { label: "Εκκρεμεί", color: "bg-amber-500/10 text-amber-600" },
  confirmed: { label: "Επιβεβαιωμένη", color: "bg-blue-500/10 text-blue-600" },
  seated: { label: "Κάθισε", color: "bg-emerald-500/10 text-emerald-600" },
  completed: { label: "Ολοκληρώθηκε", color: "bg-gray-500/10 text-gray-500" },
  cancelled: { label: "Ακυρώθηκε", color: "bg-red-500/10 text-red-500" },
  no_show: { label: "No Show", color: "bg-red-500/10 text-red-500" },
};

export function ReservationsPanel({
  initialReservations,
  initialWaitlist,
}: ReservationsPanelProps) {
  const [reservations, setReservations] = useState(initialReservations);
  const [waitlist, setWaitlist] = useState(initialWaitlist);
  const [isResOpen, setIsResOpen] = useState(false);
  const [isWaitOpen, setIsWaitOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const today = new Date().toISOString().split("T")[0];

  const handleCreateReservation = async (formData: FormData) => {
    const result = await createReservation({
      guest_name: formData.get("guest_name") as string,
      guest_phone: (formData.get("guest_phone") as string) || undefined,
      party_size: Number(formData.get("party_size")),
      reservation_date: formData.get("reservation_date") as string,
      reservation_time: formData.get("reservation_time") as string,
      notes: (formData.get("notes") as string) || undefined,
      estimated_duration_minutes: 90,
    });
    if (result.success) {
      toast.success("Η κράτηση δημιουργήθηκε");
      setIsResOpen(false);
      window.location.reload();
    } else {
      toast.error(result.error);
    }
  };

  const handleStatusChange = (id: string, status: ReservationStatus) => {
    startTransition(async () => {
      const result = await updateReservationStatus({ id, status });
      if (result.success) {
        setReservations((prev) =>
          prev.map((r) => (r.id === id ? { ...r, status } : r)),
        );
        toast.success("Ενημερώθηκε");
      } else {
        toast.error(result.error);
      }
    });
  };

  const handleAddToWaitlist = async (formData: FormData) => {
    const result = await addToWaitlist({
      guest_name: formData.get("guest_name") as string,
      guest_phone: (formData.get("guest_phone") as string) || undefined,
      party_size: Number(formData.get("party_size")),
      estimated_wait_minutes: Number(formData.get("wait_minutes")) || 30,
    });
    if (result.success) {
      toast.success("Προστέθηκε στην αναμονή");
      setIsWaitOpen(false);
      window.location.reload();
    } else {
      toast.error(result.error);
    }
  };

  const handleRemoveWaitlist = (id: string) => {
    startTransition(async () => {
      const result = await removeFromWaitlist(id);
      if (result.success) {
        setWaitlist((prev) => prev.filter((w) => w.id !== id));
        toast.success("Αφαιρέθηκε");
      } else {
        toast.error(result.error);
      }
    });
  };

  return (
    <Tabs defaultValue="reservations">
      <div className="flex items-center justify-between">
        <TabsList>
          <TabsTrigger value="reservations">
            Κρατήσεις ({reservations.length})
          </TabsTrigger>
          <TabsTrigger value="waitlist">
            Αναμονή ({waitlist.length})
          </TabsTrigger>
        </TabsList>
        <div className="flex gap-2">
          <Dialog open={isWaitOpen} onOpenChange={setIsWaitOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Clock className="mr-1 size-4" />
                Αναμονή
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Προσθήκη στην Αναμονή</DialogTitle>
              </DialogHeader>
              <form action={handleAddToWaitlist} className="space-y-3">
                <div>
                  <Label>Όνομα *</Label>
                  <Input name="guest_name" required />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label>Τηλέφωνο</Label>
                    <Input name="guest_phone" />
                  </div>
                  <div>
                    <Label>Άτομα</Label>
                    <Input
                      name="party_size"
                      type="number"
                      min="1"
                      defaultValue="2"
                      required
                    />
                  </div>
                  <div>
                    <Label>Αναμονή (λεπτά)</Label>
                    <Input
                      name="wait_minutes"
                      type="number"
                      defaultValue="30"
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full">
                  Προσθήκη
                </Button>
              </form>
            </DialogContent>
          </Dialog>
          <Dialog open={isResOpen} onOpenChange={setIsResOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-1 size-4" />
                Κράτηση
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Νέα Κράτηση</DialogTitle>
              </DialogHeader>
              <form action={handleCreateReservation} className="space-y-3">
                <div>
                  <Label>Όνομα *</Label>
                  <Input name="guest_name" required />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Τηλέφωνο</Label>
                    <Input name="guest_phone" />
                  </div>
                  <div>
                    <Label>Άτομα</Label>
                    <Input
                      name="party_size"
                      type="number"
                      min="1"
                      defaultValue="2"
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Ημ/νία</Label>
                    <Input
                      name="reservation_date"
                      type="date"
                      defaultValue={today}
                      required
                    />
                  </div>
                  <div>
                    <Label>Ώρα</Label>
                    <Input
                      name="reservation_time"
                      type="time"
                      defaultValue="20:00"
                      required
                    />
                  </div>
                </div>
                <div>
                  <Label>Σημειώσεις</Label>
                  <Input name="notes" />
                </div>
                <Button type="submit" className="w-full">
                  Δημιουργία
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <TabsContent value="reservations" className="mt-4">
        {reservations.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center py-12 text-muted-foreground">
              <CalendarDays className="mb-4 size-12 opacity-30" />
              <p>Δεν υπάρχουν κρατήσεις σήμερα</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {reservations.map((res) => {
              const config = statusConfig[res.status];
              return (
                <Card key={res.id}>
                  <CardContent className="space-y-2 p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold">{res.guest_name}</p>
                        <Badge className={config.color}>{config.label}</Badge>
                      </div>
                      <div className="text-right text-sm">
                        <p className="font-mono font-bold">
                          {res.reservation_time}
                        </p>
                        <p className="text-muted-foreground">
                          {new Date(res.reservation_date).toLocaleDateString(
                            "el-GR",
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-3 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Users className="size-3" />
                        {res.party_size}
                      </span>
                      {res.guest_phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="size-3" />
                          {res.guest_phone}
                        </span>
                      )}
                    </div>
                    {res.notes && (
                      <p className="text-xs italic text-muted-foreground">
                        {res.notes}
                      </p>
                    )}
                    <div className="flex gap-1 pt-1">
                      {res.status === "pending" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            handleStatusChange(res.id, "confirmed")
                          }
                          disabled={isPending}
                        >
                          <Check className="mr-1 size-3" />
                          Επιβεβαίωση
                        </Button>
                      )}
                      {res.status === "confirmed" && (
                        <Button
                          size="sm"
                          onClick={() => handleStatusChange(res.id, "seated")}
                          disabled={isPending}
                        >
                          <Check className="mr-1 size-3" />
                          Κάθισε
                        </Button>
                      )}
                      {res.status === "seated" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            handleStatusChange(res.id, "completed")
                          }
                          disabled={isPending}
                        >
                          <Check className="mr-1 size-3" />
                          Ολοκλήρωση
                        </Button>
                      )}
                      {(res.status === "pending" ||
                        res.status === "confirmed") && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive"
                          onClick={() =>
                            handleStatusChange(res.id, "cancelled")
                          }
                          disabled={isPending}
                        >
                          <X className="mr-1 size-3" />
                          Ακύρωση
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </TabsContent>

      <TabsContent value="waitlist" className="mt-4">
        {waitlist.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center py-12 text-muted-foreground">
              <Clock className="mb-4 size-12 opacity-30" />
              <p>Κανείς στην αναμονή</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {waitlist.map((entry) => (
              <Card key={entry.id}>
                <CardContent className="flex items-center justify-between p-3">
                  <div>
                    <span className="font-medium">{entry.guest_name}</span>
                    <div className="flex gap-3 text-sm text-muted-foreground">
                      <span>
                        <Users className="mr-1 inline size-3" />
                        {entry.party_size}
                      </span>
                      <span>
                        <Clock className="mr-1 inline size-3" />~
                        {entry.estimated_wait_minutes} λεπτά
                      </span>
                      {entry.guest_phone && (
                        <span>
                          <Phone className="mr-1 inline size-3" />
                          {entry.guest_phone}
                        </span>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={() => handleRemoveWaitlist(entry.id)}
                    disabled={isPending}
                  >
                    <X className="size-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}
