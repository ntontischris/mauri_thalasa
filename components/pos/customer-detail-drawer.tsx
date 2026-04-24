"use client";

import { useEffect, useState, useTransition } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Phone,
  Mail,
  Cake,
  Star,
  Trophy,
  AlertTriangle,
  Trash2,
  Pencil,
  Gift,
  History,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { deleteCustomer } from "@/lib/actions/customers";
import type { CustomerDetail } from "@/lib/queries/customer-detail";

interface CustomerDetailDrawerProps {
  customerId: string | null;
  onOpenChange: (open: boolean) => void;
  onEdit: () => void;
  onDeleted: () => void;
}

function formatPrice(n: number): string {
  return new Intl.NumberFormat("el-GR", {
    style: "currency",
    currency: "EUR",
  }).format(n);
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("el-GR", { day: "2-digit", month: "2-digit" });
}

function formatBirthday(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("el-GR", { day: "numeric", month: "long" });
}

export function CustomerDetailDrawer({
  customerId,
  onOpenChange,
  onEdit,
  onDeleted,
}: CustomerDetailDrawerProps) {
  const [detail, setDetail] = useState<CustomerDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!customerId) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetch(`/api/customers/${customerId}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then((data: CustomerDetail) => {
        if (!cancelled) setDetail(data);
      })
      .catch(() => {
        if (!cancelled) toast.error("Αποτυχία φόρτωσης");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [customerId]);

  const handleDelete = () => {
    if (!detail) return;
    if (!window.confirm(`Διαγραφή πελάτη ${detail.customer.name};`)) return;
    startTransition(async () => {
      const r = await deleteCustomer(detail.customer.id);
      if (!r.success) {
        toast.error(r.error ?? "Αποτυχία");
        return;
      }
      toast.success("Διαγράφηκε");
      onDeleted();
      onOpenChange(false);
    });
  };

  const c = detail?.customer;
  const favorites = detail?.favorites ?? [];
  const visits = detail?.visits ?? [];

  return (
    <Sheet open={Boolean(customerId)} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 sm:max-w-xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            {c?.name ?? "..."}
            {c?.is_vip && (
              <Badge className="bg-amber-500/20 text-amber-700 border-amber-500/40 dark:text-amber-400">
                <Star className="mr-1 size-3" /> VIP
              </Badge>
            )}
          </SheetTitle>
        </SheetHeader>

        {loading || !c ? (
          <p className="p-6 text-sm text-muted-foreground">Φόρτωση...</p>
        ) : (
          <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-5">
            {/* Personal */}
            <section className="space-y-2">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Προσωπικά
              </h3>
              <div className="space-y-1.5 text-sm">
                {c.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="size-4 text-muted-foreground" />
                    <a
                      href={`tel:${c.phone}`}
                      className="font-medium hover:underline"
                    >
                      {c.phone}
                    </a>
                  </div>
                )}
                {c.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="size-4 text-muted-foreground" />
                    <a
                      href={`mailto:${c.email}`}
                      className="font-medium hover:underline"
                    >
                      {c.email}
                    </a>
                  </div>
                )}
                {c.birthday && (
                  <div className="flex items-center gap-2">
                    <Cake className="size-4 text-muted-foreground" />
                    <span>{formatBirthday(c.birthday)}</span>
                  </div>
                )}
                {c.notes && (
                  <p className="mt-2 rounded-md bg-muted/50 p-2 text-xs italic text-muted-foreground">
                    {c.notes}
                  </p>
                )}
              </div>
              {c.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {c.tags.map((t) => (
                    <Badge key={t} variant="secondary" className="text-[10px]">
                      {t}
                    </Badge>
                  ))}
                </div>
              )}
            </section>

            {/* Allergies */}
            {c.allergies.length > 0 && (
              <section className="space-y-2">
                <h3 className="flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-red-600 dark:text-red-400">
                  <AlertTriangle className="size-3.5" />
                  Αλλεργίες
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {c.allergies.map((a) => (
                    <Badge
                      key={a}
                      variant="outline"
                      className="bg-red-500/10 border-red-500/40 text-red-700 dark:text-red-400"
                    >
                      {a}
                    </Badge>
                  ))}
                </div>
              </section>
            )}

            <Separator />

            {/* Favorites */}
            {favorites.length > 0 && (
              <section className="space-y-2">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Αγαπημένα Πιάτα
                </h3>
                <div className="space-y-1">
                  {favorites.map((f) => (
                    <div
                      key={f.name}
                      className="flex items-center justify-between rounded-md border p-2 text-sm"
                    >
                      <span>{f.name}</span>
                      <Badge variant="outline">{f.count}x</Badge>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Loyalty */}
            <section className="space-y-2">
              <h3 className="flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                <Gift className="size-3.5" />
                Loyalty
              </h3>
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">Διαθέσιμα</p>
                  <p className="text-xl font-bold">{c.loyalty_points}</p>
                  <p className="text-[10px] text-muted-foreground">pts</p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">Lifetime</p>
                  <p className="text-xl font-bold">{c.lifetime_points}</p>
                  <p className="text-[10px] text-muted-foreground">pts total</p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">Stamps</p>
                  <p className="text-xl font-bold">{c.stamp_count}/10</p>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full bg-primary"
                      style={{
                        width: `${Math.min(100, (c.stamp_count / 10) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
              {c.points_expiring_at && (
                <p className="text-xs text-amber-600 flex items-center gap-1">
                  <History className="size-3" />
                  Επόμενη λήξη:{" "}
                  {new Date(c.points_expiring_at).toLocaleDateString("el-GR")}
                </p>
              )}
            </section>

            <Separator />

            {/* Aggregates */}
            <section className="space-y-2">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Σύνοψη επισκέψεων
              </h3>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-md border p-2">
                  <p className="text-[10px] uppercase text-muted-foreground">
                    Επισκέψεις
                  </p>
                  <p className="text-lg font-bold">{c.total_visits}</p>
                </div>
                <div className="rounded-md border p-2">
                  <p className="text-[10px] uppercase text-muted-foreground">
                    Σύνολο
                  </p>
                  <p className="text-lg font-bold">
                    {formatPrice(c.total_spent)}
                  </p>
                </div>
                <div className="rounded-md border p-2">
                  <p className="text-[10px] uppercase text-muted-foreground">
                    Τελευταία
                  </p>
                  <p className="text-sm font-bold">
                    {c.last_visit_at ? formatDate(c.last_visit_at) : "—"}
                  </p>
                </div>
              </div>
            </section>

            {/* Visit history */}
            {visits.length > 0 && (
              <section className="space-y-2">
                <h3 className="flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  <History className="size-3.5" />
                  Ιστορικό Επισκέψεων ({visits.length})
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="text-muted-foreground">
                      <tr>
                        <th className="px-2 py-1.5 text-left">Ημ/νία</th>
                        <th className="px-2 py-1.5 text-left">Τραπέζι</th>
                        <th className="px-2 py-1.5 text-right">Σύνολο</th>
                        <th className="px-2 py-1.5 text-left">Πιάτα</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visits.slice(0, 15).map((v) => (
                        <tr key={v.id} className="border-t">
                          <td className="px-2 py-1.5">{formatDate(v.date)}</td>
                          <td className="px-2 py-1.5">#{v.table_number}</td>
                          <td className="px-2 py-1.5 text-right font-medium">
                            {formatPrice(v.total)}
                          </td>
                          <td className="px-2 py-1.5 text-muted-foreground truncate max-w-[200px]">
                            {(v.items ?? []).slice(0, 2).join(", ")}
                            {(v.items ?? []).length > 2 && "..."}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
          </div>
        )}

        {c && (
          <div className="flex gap-2 border-t p-4">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDelete}
              disabled={isPending}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="mr-1 size-3.5" />
              Διαγραφή
            </Button>
            <Button
              size="sm"
              className="ml-auto"
              onClick={onEdit}
              disabled={isPending}
            >
              <Pencil className="mr-1 size-3.5" />
              Επεξεργασία
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
