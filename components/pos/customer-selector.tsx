"use client";

import { useState, useTransition } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { User, UserPlus, X, Star, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { linkOrderToCustomer } from "@/lib/actions/orders";
import { createCustomer } from "@/lib/actions/customers";
import type { DbCustomer } from "@/lib/types/database";

interface CustomerSelectorProps {
  orderId: string | null;
  currentCustomer: DbCustomer | null;
  onChange: (customer: DbCustomer | null) => void;
}

export function CustomerSelector({
  orderId,
  currentCustomer,
  onChange,
}: CustomerSelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<DbCustomer[]>([]);
  const [searching, setSearching] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleSearch = async (term: string) => {
    setSearch(term);
    if (term.trim().length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(
        `/api/customers/search?q=${encodeURIComponent(term)}`,
      );
      if (res.ok) {
        const data = (await res.json()) as DbCustomer[];
        setResults(data);
      }
    } catch {
      // noop
    } finally {
      setSearching(false);
    }
  };

  const handleSelect = (c: DbCustomer) => {
    startTransition(async () => {
      if (orderId) {
        const r = await linkOrderToCustomer(orderId, c.id);
        if (!r.success) {
          toast.error(r.error ?? "Αποτυχία");
          return;
        }
      }
      onChange(c);
      setOpen(false);
      setSearch("");
      setResults([]);
    });
  };

  const handleQuickCreate = async () => {
    const term = search.trim();
    if (!term) return;
    const looksLikePhone = /^\d{8,}$/.test(term.replace(/\D/g, ""));
    startTransition(async () => {
      const r = await createCustomer({
        name: looksLikePhone ? term : term,
        phone: looksLikePhone ? term : undefined,
        is_vip: false,
        allergies: [],
        tags: [],
        discount: 0,
      });
      if (!r.success || !r.data) {
        toast.error(r.error ?? "Αποτυχία");
        return;
      }
      // Link to order
      if (orderId) {
        await linkOrderToCustomer(orderId, r.data.id);
      }
      const newCustomer: DbCustomer = {
        id: r.data.id,
        name: looksLikePhone ? term : term,
        phone: looksLikePhone ? term : null,
        email: null,
        birthday: null,
        notes: null,
        is_vip: false,
        allergies: [],
        tags: [],
        loyalty_points: 0,
        stamp_count: 0,
        afm: null,
        address: {},
        contact: {},
        billing: {},
        is_active: true,
        discount: 0,
        last_visit_at: null,
        total_visits: 0,
        total_spent: 0,
        marketing_opt_in: false,
        tier_id: null,
        tier_updated_at: null,
        lifetime_points: 0,
        points_expiring_at: null,
        legacy_id: null,
        source: "manual",
        metadata: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      onChange(newCustomer);
      setOpen(false);
      setSearch("");
      setResults([]);
      toast.success("Δημιουργήθηκε πελάτης");
    });
  };

  const handleUnlink = () => {
    startTransition(async () => {
      if (orderId) {
        await linkOrderToCustomer(orderId, null);
      }
      onChange(null);
    });
  };

  if (currentCustomer) {
    return (
      <div className="flex items-center gap-2 rounded-full border border-primary/40 bg-primary/5 px-3 py-1 text-sm">
        <User className="size-3.5 text-primary" />
        <span className="font-medium">{currentCustomer.name}</span>
        {currentCustomer.is_vip && (
          <Star className="size-3 text-amber-500 fill-amber-500" />
        )}
        {currentCustomer.allergies.length > 0 && (
          <Badge
            variant="outline"
            className="text-[10px] bg-red-500/10 border-red-500/40 text-red-700 dark:text-red-400 gap-0.5"
          >
            <AlertTriangle className="size-2.5" />
            {currentCustomer.allergies.length}
          </Badge>
        )}
        <button
          type="button"
          onClick={handleUnlink}
          disabled={isPending}
          className="ml-1 hover:text-destructive"
          aria-label="Αποσύνδεση"
        >
          <X className="size-3.5" />
        </button>
      </div>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <UserPlus className="size-3.5" />
          Πελάτης
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-3" align="end">
        <div className="space-y-2">
          <Input
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Αναζήτηση τηλεφώνου ή ονόματος..."
            autoFocus
            className="h-9"
          />
          {searching ? (
            <p className="py-2 text-center text-xs text-muted-foreground">
              Αναζήτηση...
            </p>
          ) : results.length > 0 ? (
            <div className="max-h-64 overflow-y-auto space-y-1">
              {results.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => handleSelect(c)}
                  disabled={isPending}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 rounded-md border p-2 text-left text-sm transition",
                    "hover:border-primary/60 hover:bg-primary/5",
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium truncate">{c.name}</span>
                      {c.is_vip && (
                        <Star className="size-3 text-amber-500 fill-amber-500" />
                      )}
                    </div>
                    {c.phone && (
                      <p className="text-xs text-muted-foreground">{c.phone}</p>
                    )}
                  </div>
                  {c.allergies.length > 0 && (
                    <Badge
                      variant="outline"
                      className="text-[10px] bg-red-500/10 border-red-500/40"
                    >
                      {c.allergies.length}
                    </Badge>
                  )}
                </button>
              ))}
            </div>
          ) : search.length >= 2 ? (
            <p className="py-2 text-center text-xs text-muted-foreground">
              Δεν βρέθηκε
            </p>
          ) : null}
          {search.trim().length >= 2 && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="w-full"
              onClick={handleQuickCreate}
              disabled={isPending}
            >
              <UserPlus className="mr-1 size-3.5" />
              Νέος πελάτης: {search.trim()}
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
