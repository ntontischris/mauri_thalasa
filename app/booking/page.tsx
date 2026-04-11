"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  UtensilsCrossed,
  CalendarDays,
  Clock,
  Users,
  User,
  Phone,
  Mail,
  MessageSquare,
  Check,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

// This is a standalone public page (no POS context needed).
// In production, it would call Supabase directly with anon key.
// For now, it shows the booking flow UI.

type BookingStep = "date" | "time" | "details" | "confirmation";

export default function BookingPage() {
  const [step, setStep] = useState<BookingStep>("date");
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [partySize, setPartySize] = useState(2);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const today = new Date().toISOString().split("T")[0];

  // Generate next 30 days
  const availableDates = useMemo(() => {
    const dates: Array<{ date: string; dayName: string; dayNum: number; monthName: string; isWeekend: boolean }> = [];
    for (let i = 0; i < 30; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const dayOfWeek = d.getDay();
      dates.push({
        date: d.toISOString().split("T")[0],
        dayName: d.toLocaleDateString("el-GR", { weekday: "short" }),
        dayNum: d.getDate(),
        monthName: d.toLocaleDateString("el-GR", { month: "short" }),
        isWeekend: dayOfWeek === 0 || dayOfWeek === 5 || dayOfWeek === 6,
      });
    }
    return dates;
  }, []);

  // Generate time slots (12:00 - 22:30 in 30min intervals)
  const timeSlots = useMemo(() => {
    const slots: string[] = [];
    for (let h = 12; h <= 22; h++) {
      slots.push(`${String(h).padStart(2, "0")}:00`);
      slots.push(`${String(h).padStart(2, "0")}:30`);
    }
    return slots;
  }, []);

  const handleSubmit = () => {
    if (!name.trim() || !selectedDate || !selectedTime) return;
    // In production: supabase.from('reservations').insert(...)
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-background to-muted/30 p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-8 pb-8">
            <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-green-500/10">
              <Check className="size-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold">Η κράτησή σας καταχωρήθηκε!</h2>
            <p className="mt-2 text-muted-foreground">
              Θα λάβετε επιβεβαίωση σύντομα.
            </p>
            <div className="mt-6 rounded-lg bg-muted p-4 text-left text-sm">
              <div className="grid grid-cols-2 gap-2">
                <span className="text-muted-foreground">Όνομα:</span>
                <span className="font-medium">{name}</span>
                <span className="text-muted-foreground">Ημερομηνία:</span>
                <span className="font-medium">
                  {new Date(selectedDate + "T12:00:00").toLocaleDateString("el-GR", { weekday: "long", day: "numeric", month: "long" })}
                </span>
                <span className="text-muted-foreground">Ώρα:</span>
                <span className="font-medium">{selectedTime}</span>
                <span className="text-muted-foreground">Άτομα:</span>
                <span className="font-medium">{partySize}</span>
              </div>
            </div>
            <Button className="mt-6" variant="outline" onClick={() => {
              setSubmitted(false);
              setStep("date");
              setSelectedDate("");
              setSelectedTime("");
              setName("");
              setPhone("");
              setEmail("");
              setNotes("");
            }}>
              Νέα Κράτηση
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-background to-muted/30">
      {/* Header */}
      <header className="border-b bg-card px-4 py-6 text-center">
        <div className="flex items-center justify-center gap-2">
          <UtensilsCrossed className="size-6 text-primary" />
          <h1 className="text-2xl font-bold">Μαύρη Θάλασσα</h1>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">Online Κράτηση Τραπεζιού</p>
      </header>

      {/* Progress */}
      <div className="mx-auto mt-6 flex w-full max-w-lg items-center gap-2 px-4">
        {(["date", "time", "details"] as BookingStep[]).map((s, i) => (
          <div key={s} className="flex flex-1 items-center gap-2">
            <div className={cn(
              "flex size-8 items-center justify-center rounded-full text-sm font-bold",
              step === s ? "bg-primary text-primary-foreground" :
              (["date", "time", "details"].indexOf(step) > i) ? "bg-green-500 text-white" :
              "bg-muted text-muted-foreground",
            )}>
              {["date", "time", "details"].indexOf(step) > i ? <Check className="size-4" /> : i + 1}
            </div>
            {i < 2 && <div className="h-0.5 flex-1 bg-border" />}
          </div>
        ))}
      </div>

      {/* Content */}
      <div className="mx-auto mt-6 w-full max-w-lg px-4 pb-12">
        {/* Step 1: Party Size + Date */}
        {step === "date" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="size-5" />
                Επιλέξτε ημερομηνία
              </CardTitle>
              <CardDescription>Πόσα άτομα θα είστε και πότε θα θέλατε να έρθετε;</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="flex items-center gap-1">
                  <Users className="size-3" />
                  Αριθμός ατόμων
                </Label>
                <div className="mt-2 flex gap-2">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                    <Button
                      key={n}
                      size="sm"
                      variant={partySize === n ? "default" : "outline"}
                      onClick={() => setPartySize(n)}
                      className="flex-1"
                    >
                      {n}
                    </Button>
                  ))}
                </div>
                {partySize > 8 && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Για 8+ άτομα, παρακαλώ καλέστε μας στο 2310-XXX-XXX
                  </p>
                )}
              </div>

              <div>
                <Label>Ημερομηνία</Label>
                <div className="mt-2 grid grid-cols-5 gap-1.5 sm:grid-cols-7">
                  {availableDates.slice(0, 14).map((d) => (
                    <button
                      key={d.date}
                      onClick={() => setSelectedDate(d.date)}
                      className={cn(
                        "flex flex-col items-center rounded-lg border p-2 text-xs transition-colors",
                        selectedDate === d.date
                          ? "border-primary bg-primary/10 text-primary"
                          : "hover:bg-muted",
                        d.isWeekend && selectedDate !== d.date && "bg-muted/50",
                      )}
                    >
                      <span className="text-[10px] text-muted-foreground">{d.dayName}</span>
                      <span className="text-base font-bold">{d.dayNum}</span>
                      <span className="text-[10px] text-muted-foreground">{d.monthName}</span>
                    </button>
                  ))}
                </div>
              </div>

              <Button
                className="w-full"
                disabled={!selectedDate}
                onClick={() => setStep("time")}
              >
                Συνέχεια
                <ArrowRight className="ml-2 size-4" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Time */}
        {step === "time" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="size-5" />
                Επιλέξτε ώρα
              </CardTitle>
              <CardDescription>
                {new Date(selectedDate + "T12:00:00").toLocaleDateString("el-GR", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })} - {partySize} άτομα
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-4 gap-2">
                {timeSlots.map((time) => (
                  <Button
                    key={time}
                    size="sm"
                    variant={selectedTime === time ? "default" : "outline"}
                    onClick={() => setSelectedTime(time)}
                  >
                    {time}
                  </Button>
                ))}
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep("date")}>
                  <ArrowLeft className="mr-2 size-4" />
                  Πίσω
                </Button>
                <Button
                  className="flex-1"
                  disabled={!selectedTime}
                  onClick={() => setStep("details")}
                >
                  Συνέχεια
                  <ArrowRight className="ml-2 size-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Guest Details */}
        {step === "details" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="size-5" />
                Τα στοιχεία σας
              </CardTitle>
              <CardDescription>
                {new Date(selectedDate + "T12:00:00").toLocaleDateString("el-GR", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })} στις {selectedTime} - {partySize} άτομα
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label htmlFor="bk-name">
                  <User className="mr-1 inline size-3" />
                  Ονοματεπώνυμο *
                </Label>
                <Input id="bk-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Γιάννης Κ." />
              </div>
              <div>
                <Label htmlFor="bk-phone">
                  <Phone className="mr-1 inline size-3" />
                  Τηλέφωνο *
                </Label>
                <Input id="bk-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="69x xxx xxxx" />
              </div>
              <div>
                <Label htmlFor="bk-email">
                  <Mail className="mr-1 inline size-3" />
                  Email
                </Label>
                <Input id="bk-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@example.com" />
              </div>
              <div>
                <Label htmlFor="bk-notes">
                  <MessageSquare className="mr-1 inline size-3" />
                  Σημειώσεις / Ειδικά αιτήματα
                </Label>
                <Textarea id="bk-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="π.χ. αλλεργίες, γενέθλια, παιδικό καρεκλάκι..." rows={3} />
              </div>

              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={() => setStep("time")}>
                  <ArrowLeft className="mr-2 size-4" />
                  Πίσω
                </Button>
                <Button
                  className="flex-1"
                  disabled={!name.trim() || !phone.trim()}
                  onClick={handleSubmit}
                >
                  Ολοκλήρωση Κράτησης
                  <Check className="ml-2 size-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Footer */}
      <footer className="mt-auto border-t bg-card px-4 py-4 text-center text-xs text-muted-foreground">
        <p>Μαύρη Θάλασσα - Εστιατόριο Θαλασσινών</p>
        <p className="mt-1">Powered by EatFlow POS</p>
      </footer>
    </div>
  );
}
