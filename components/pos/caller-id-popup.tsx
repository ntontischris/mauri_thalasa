"use client";

import { useState, useCallback } from "react";
import { useReservations } from "@/hooks/use-reservations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Phone,
  Star,
  AlertTriangle,
  CalendarDays,
  Receipt,
  Heart,
  User,
  Search,
} from "lucide-react";
import { formatPrice } from "@/lib/mock-data";

interface CallerIdPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateReservation?: (phone: string, customerName?: string) => void;
}

export function CallerIdPopup({ open, onOpenChange, onCreateReservation }: CallerIdPopupProps) {
  const { callerIdLookup } = useReservations();
  const [phone, setPhone] = useState("");
  const [result, setResult] = useState<ReturnType<typeof callerIdLookup>>(null);
  const [searched, setSearched] = useState(false);

  const handleSearch = useCallback(() => {
    if (phone.length < 6) return;
    const info = callerIdLookup(phone);
    setResult(info);
    setSearched(true);
  }, [phone, callerIdLookup]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch();
  };

  const handleClose = () => {
    setPhone("");
    setResult(null);
    setSearched(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Phone className="size-5 text-primary" />
            Αναγνώριση Κλήσης (Caller ID)
          </DialogTitle>
        </DialogHeader>

        {/* Phone input */}
        <div className="flex gap-2">
          <Input
            placeholder="Αριθμός τηλεφώνου..."
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value);
              setSearched(false);
            }}
            onKeyDown={handleKeyDown}
            autoFocus
          />
          <Button onClick={handleSearch} disabled={phone.length < 6}>
            <Search className="mr-1 size-4" />
            Αναζήτηση
          </Button>
        </div>

        {/* Results */}
        {searched && result && (
          <div className="space-y-4 rounded-lg border bg-card p-4">
            {/* Customer header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex size-12 items-center justify-center rounded-full bg-primary/10">
                  <User className="size-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">{result.customer.name}</h3>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="size-3" />
                    {result.customer.phone}
                  </div>
                </div>
              </div>
              <div className="flex gap-1">
                {result.customer.isVip && (
                  <Badge className="gap-1 bg-amber-500">
                    <Star className="size-3" />
                    VIP
                  </Badge>
                )}
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-md bg-muted p-2 text-center">
                <p className="text-lg font-bold">{result.totalVisits}</p>
                <p className="text-xs text-muted-foreground">Επισκέψεις</p>
              </div>
              <div className="rounded-md bg-muted p-2 text-center">
                <p className="text-lg font-bold">{formatPrice(result.totalSpent)}</p>
                <p className="text-xs text-muted-foreground">Σύνολο</p>
              </div>
              <div className="rounded-md bg-muted p-2 text-center">
                <p className="text-lg font-bold">{result.customer.loyaltyPoints}</p>
                <p className="text-xs text-muted-foreground">Πόντοι</p>
              </div>
            </div>

            {/* Allergies */}
            {result.customer.allergies.length > 0 && (
              <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3">
                <AlertTriangle className="mt-0.5 size-4 text-destructive" />
                <div>
                  <p className="text-sm font-medium text-destructive">Αλλεργίες</p>
                  <p className="text-sm">{result.customer.allergies.join(", ")}</p>
                </div>
              </div>
            )}

            {/* Notes */}
            {result.customer.notes && (
              <div className="rounded-md bg-muted/50 p-3 text-sm">
                <p className="text-xs font-medium text-muted-foreground">Σημειώσεις</p>
                <p>{result.customer.notes}</p>
              </div>
            )}

            {/* Last visit */}
            {result.lastVisitDate && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CalendarDays className="size-3" />
                Τελευταία επίσκεψη:{" "}
                {new Date(result.lastVisitDate).toLocaleDateString("el-GR", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </div>
            )}

            {/* Tags */}
            {result.customer.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {result.customer.tags.map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                ))}
              </div>
            )}

            {/* Action */}
            {onCreateReservation && (
              <Button
                className="w-full"
                onClick={() => {
                  onCreateReservation(phone, result.customer.name);
                  handleClose();
                }}
              >
                <CalendarDays className="mr-2 size-4" />
                Δημιουργία Κράτησης
              </Button>
            )}
          </div>
        )}

        {/* Not found */}
        {searched && !result && (
          <div className="rounded-lg border border-dashed p-6 text-center">
            <User className="mx-auto mb-2 size-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Δεν βρέθηκε πελάτης με αυτό το τηλέφωνο
            </p>
            {onCreateReservation && (
              <Button
                variant="outline"
                className="mt-3"
                onClick={() => {
                  onCreateReservation(phone);
                  handleClose();
                }}
              >
                Νέα Κράτηση ούτως ή άλλως
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
