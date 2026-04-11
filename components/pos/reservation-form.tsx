"use client";

import { useState, useEffect } from "react";
import { useReservations } from "@/hooks/use-reservations";
import { usePOS } from "@/lib/pos-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, Phone, User, Users, Clock, MapPin, Sparkles, AlertTriangle } from "lucide-react";
import type { Reservation, ReservationSource } from "@/lib/types";

interface ReservationFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date?: string;
  editReservation?: Reservation;
}

const SOURCE_LABELS: Record<ReservationSource, string> = {
  phone: "Τηλέφωνο",
  walk_in: "Walk-in",
  website: "Website",
  facebook: "Facebook",
  instagram: "Instagram",
  google: "Google",
  manual: "Χειροκίνητα",
};

export function ReservationForm({ open, onOpenChange, date, editReservation }: ReservationFormProps) {
  const { state } = usePOS();
  const { addReservation, updateReservation, suggestTable, callerIdLookup, bookingSettings } = useReservations();

  const today = new Date().toISOString().split("T")[0];

  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [partySize, setPartySize] = useState(2);
  const [reservationDate, setReservationDate] = useState(date ?? today);
  const [reservationTime, setReservationTime] = useState("20:00");
  const [duration, setDuration] = useState(bookingSettings.defaultDurationMinutes);
  const [tableId, setTableId] = useState<string | undefined>();
  const [zoneId, setZoneId] = useState<string | undefined>();
  const [source, setSource] = useState<ReservationSource>("phone");
  const [notes, setNotes] = useState("");
  const [specialRequests, setSpecialRequests] = useState("");
  const [occasion, setOccasion] = useState("");

  // Caller ID result
  const [callerInfo, setCallerInfo] = useState<ReturnType<typeof callerIdLookup>>(null);
  // Smart suggestions
  const [suggestions, setSuggestions] = useState<ReturnType<typeof suggestTable>>([]);

  // Load edit data
  useEffect(() => {
    if (editReservation) {
      setGuestName(editReservation.guestName);
      setGuestPhone(editReservation.guestPhone ?? "");
      setGuestEmail(editReservation.guestEmail ?? "");
      setPartySize(editReservation.partySize);
      setReservationDate(editReservation.reservationDate);
      setReservationTime(editReservation.reservationTime);
      setDuration(editReservation.estimatedDurationMinutes);
      setTableId(editReservation.tableId);
      setZoneId(editReservation.zoneId);
      setSource(editReservation.source);
      setNotes(editReservation.notes ?? "");
      setSpecialRequests(editReservation.specialRequests ?? "");
      setOccasion(editReservation.occasion ?? "");
    } else {
      setGuestName("");
      setGuestPhone("");
      setGuestEmail("");
      setPartySize(2);
      setReservationDate(date ?? today);
      setReservationTime("20:00");
      setDuration(bookingSettings.defaultDurationMinutes);
      setTableId(undefined);
      setZoneId(undefined);
      setSource("phone");
      setNotes("");
      setSpecialRequests("");
      setOccasion("");
      setCallerInfo(null);
      setSuggestions([]);
    }
  }, [editReservation, open, date, today, bookingSettings.defaultDurationMinutes]);

  // Caller ID lookup on phone change
  useEffect(() => {
    if (guestPhone.length >= 10) {
      const info = callerIdLookup(guestPhone);
      setCallerInfo(info);
      if (info && !guestName) {
        setGuestName(info.customer.name);
        if (info.customer.email) setGuestEmail(info.customer.email);
      }
    } else {
      setCallerInfo(null);
    }
  }, [guestPhone, callerIdLookup, guestName]);

  // Smart table suggestion
  useEffect(() => {
    if (partySize > 0 && reservationDate && reservationTime) {
      const results = suggestTable(reservationDate, reservationTime, partySize, zoneId);
      setSuggestions(results);
      if (!tableId && results.length > 0) {
        setTableId(results[0].tableId);
      }
    }
  }, [partySize, reservationDate, reservationTime, zoneId, suggestTable, tableId]);

  const handleSubmit = () => {
    if (!guestName.trim() || partySize < 1) return;

    if (editReservation) {
      updateReservation({
        ...editReservation,
        guestName,
        guestPhone: guestPhone || undefined,
        guestEmail: guestEmail || undefined,
        partySize,
        reservationDate,
        reservationTime,
        estimatedDurationMinutes: duration,
        tableId,
        zoneId,
        source,
        notes: notes || undefined,
        specialRequests: specialRequests || undefined,
        occasion: occasion || undefined,
        customerId: callerInfo?.customer.id ?? editReservation.customerId,
        allergies: callerInfo?.customer.allergies ?? editReservation.allergies,
      });
    } else {
      addReservation({
        guestName,
        guestPhone: guestPhone || undefined,
        guestEmail: guestEmail || undefined,
        partySize,
        reservationDate,
        reservationTime,
        estimatedDurationMinutes: duration,
        tableId,
        zoneId,
        source,
        notes: notes || undefined,
        specialRequests: specialRequests || undefined,
        occasion: occasion || undefined,
        customerId: callerInfo?.customer.id,
        allergies: callerInfo?.customer.allergies ?? [],
      });
    }

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editReservation ? "Επεξεργασία Κράτησης" : "Νέα Κράτηση"}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4">
          {/* Caller ID Banner */}
          {callerInfo && (
            <div className="rounded-lg border bg-primary/5 p-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Phone className="size-4 text-primary" />
                Αναγνώριση Πελάτη
              </div>
              <div className="mt-1 flex flex-wrap gap-2 text-sm">
                <span className="font-semibold">{callerInfo.customer.name}</span>
                {callerInfo.customer.isVip && <Badge variant="secondary">VIP</Badge>}
                <span className="text-muted-foreground">
                  {callerInfo.totalVisits} επισκέψεις
                </span>
                {callerInfo.customer.allergies.length > 0 && (
                  <Badge variant="destructive" className="gap-1">
                    <AlertTriangle className="size-3" />
                    {callerInfo.customer.allergies.join(", ")}
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Guest Info Row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="guestName">
                <User className="mr-1 inline size-3" />
                Όνομα *
              </Label>
              <Input id="guestName" value={guestName} onChange={(e) => setGuestName(e.target.value)} placeholder="Όνομα πελάτη" />
            </div>
            <div>
              <Label htmlFor="guestPhone">
                <Phone className="mr-1 inline size-3" />
                Τηλέφωνο
              </Label>
              <Input id="guestPhone" value={guestPhone} onChange={(e) => setGuestPhone(e.target.value)} placeholder="69x xxx xxxx" />
            </div>
          </div>

          {/* Date / Time / Party Size */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label htmlFor="date">
                <CalendarIcon className="mr-1 inline size-3" />
                Ημερομηνία
              </Label>
              <Input id="date" type="date" value={reservationDate} onChange={(e) => setReservationDate(e.target.value)} min={today} />
            </div>
            <div>
              <Label htmlFor="time">
                <Clock className="mr-1 inline size-3" />
                Ώρα
              </Label>
              <Input id="time" type="time" value={reservationTime} onChange={(e) => setReservationTime(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="partySize">
                <Users className="mr-1 inline size-3" />
                Άτομα
              </Label>
              <Input
                id="partySize"
                type="number"
                min={1}
                max={bookingSettings.maxPartySize}
                value={partySize}
                onChange={(e) => setPartySize(parseInt(e.target.value) || 1)}
              />
            </div>
          </div>

          {/* Smart Table Suggestion */}
          {suggestions.length > 0 && (
            <div>
              <Label className="mb-1 flex items-center gap-1">
                <Sparkles className="size-3 text-amber-500" />
                Προτεινόμενα Τραπέζια
              </Label>
              <div className="flex flex-wrap gap-2">
                {suggestions.map((s) => (
                  <Button
                    key={s.tableId}
                    size="sm"
                    variant={tableId === s.tableId ? "default" : "outline"}
                    onClick={() => {
                      setTableId(s.tableId);
                      setZoneId(s.zoneId);
                    }}
                  >
                    T{s.tableNumber} ({s.capacity} θ.) - {s.zoneName}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Zone preference */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>
                <MapPin className="mr-1 inline size-3" />
                Ζώνη προτίμησης
              </Label>
              <Select value={zoneId ?? "any"} onValueChange={(v) => setZoneId(v === "any" ? undefined : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Οποιαδήποτε" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Οποιαδήποτε</SelectItem>
                  {state.zones.map((z) => (
                    <SelectItem key={z.id} value={z.id}>{z.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Κανάλι</Label>
              <Select value={source} onValueChange={(v) => setSource(v as ReservationSource)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(SOURCE_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Occasion + Duration */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Αφορμή</Label>
              <Select value={occasion || "none"} onValueChange={(v) => setOccasion(v === "none" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="--" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">--</SelectItem>
                  <SelectItem value="birthday">Γενέθλια</SelectItem>
                  <SelectItem value="anniversary">Επέτειος</SelectItem>
                  <SelectItem value="business">Business</SelectItem>
                  <SelectItem value="celebration">Γιορτή</SelectItem>
                  <SelectItem value="date">Ραντεβού</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Διάρκεια (λεπτά)</Label>
              <Input type="number" min={30} step={15} value={duration} onChange={(e) => setDuration(parseInt(e.target.value) || 90)} />
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label>Σημειώσεις</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Σημειώσεις κράτησης..." rows={2} />
          </div>

          <div>
            <Label>Ειδικά αιτήματα</Label>
            <Textarea value={specialRequests} onChange={(e) => setSpecialRequests(e.target.value)} placeholder="Ειδικά αιτήματα πελάτη..." rows={2} />
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Ακύρωση</Button>
            <Button onClick={handleSubmit} disabled={!guestName.trim()}>
              {editReservation ? "Αποθήκευση" : "Δημιουργία Κράτησης"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
