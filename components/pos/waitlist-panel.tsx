"use client";

import { useState } from "react";
import { useReservations } from "@/hooks/use-reservations";
import { useTableLayout } from "@/hooks/use-table-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Clock, Users, Bell, UserCheck, X, Plus } from "lucide-react";

export function WaitlistPanel() {
  const { activeWaitlist, addToWaitlist, notifyWaitlistEntry, seatFromWaitlist, removeFromWaitlist } = useReservations();
  const { getAvailableTables } = useTableLayout();
  const availableTables = getAvailableTables();

  const [addOpen, setAddOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [size, setSize] = useState(2);
  const [seatDialogId, setSeatDialogId] = useState<string | null>(null);
  const [selectedTable, setSelectedTable] = useState<string>("");

  const handleAdd = () => {
    if (!name.trim()) return;
    addToWaitlist({
      guestName: name,
      guestPhone: phone || undefined,
      partySize: size,
      priority: 0,
    });
    setName("");
    setPhone("");
    setSize(2);
    setAddOpen(false);
  };

  const handleSeat = () => {
    if (!seatDialogId || !selectedTable) return;
    seatFromWaitlist(seatDialogId, selectedTable);
    setSeatDialogId(null);
    setSelectedTable("");
  };

  const formatWait = (joinedAt: string): string => {
    const diff = Date.now() - new Date(joinedAt).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "τώρα";
    if (mins < 60) return `${mins}λ`;
    return `${Math.floor(mins / 60)}ω ${mins % 60}λ`;
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">
          Λίστα Αναμονής
          {activeWaitlist.length > 0 && (
            <Badge variant="secondary" className="ml-2">{activeWaitlist.length}</Badge>
          )}
        </h3>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline">
              <Plus className="mr-1 size-3" />
              Προσθήκη
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Νέα Εγγραφή Αναμονής</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3">
              <div>
                <Label>Όνομα *</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Όνομα" />
              </div>
              <div>
                <Label>Τηλέφωνο</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="69x xxx xxxx" />
              </div>
              <div>
                <Label>Άτομα</Label>
                <Input type="number" min={1} max={20} value={size} onChange={(e) => setSize(parseInt(e.target.value) || 1)} />
              </div>
              <Button onClick={handleAdd} disabled={!name.trim()}>Προσθήκη</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {activeWaitlist.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">
          Η λίστα αναμονής είναι κενή
        </p>
      ) : (
        <div className="space-y-2">
          {activeWaitlist.map((entry, index) => (
            <div
              key={entry.id}
              className="flex items-center justify-between rounded-lg border bg-card p-3"
            >
              <div className="flex items-center gap-3">
                <span className="flex size-7 items-center justify-center rounded-full bg-muted text-xs font-bold">
                  {index + 1}
                </span>
                <div>
                  <div className="flex items-center gap-2 text-sm font-medium">
                    {entry.guestName}
                    {entry.status === "notified" && (
                      <Badge variant="secondary" className="text-xs">Ειδοποιήθηκε</Badge>
                    )}
                  </div>
                  <div className="flex gap-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-0.5">
                      <Users className="size-3" /> {entry.partySize}
                    </span>
                    <span className="flex items-center gap-0.5">
                      <Clock className="size-3" /> {formatWait(entry.joinedAt)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex gap-1">
                {entry.status === "waiting" && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-7"
                    onClick={() => notifyWaitlistEntry(entry.id)}
                    title="Ειδοποίηση"
                  >
                    <Bell className="size-3.5 text-amber-500" />
                  </Button>
                )}
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-7"
                  onClick={() => {
                    setSeatDialogId(entry.id);
                    setSelectedTable("");
                  }}
                  title="Κάθισμα"
                  disabled={availableTables.length === 0}
                >
                  <UserCheck className="size-3.5 text-green-600" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-7"
                  onClick={() => removeFromWaitlist(entry.id)}
                  title="Αφαίρεση"
                >
                  <X className="size-3.5 text-red-500" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Seat dialog */}
      <Dialog open={!!seatDialogId} onOpenChange={(open) => !open && setSeatDialogId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Επιλογή Τραπεζιού</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <Select value={selectedTable} onValueChange={setSelectedTable}>
              <SelectTrigger>
                <SelectValue placeholder="Διαλέξτε τραπέζι" />
              </SelectTrigger>
              <SelectContent>
                {availableTables.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    T{t.number} ({t.capacity} θέσεις)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleSeat} disabled={!selectedTable}>
              Κάθισμα
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
