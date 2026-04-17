"use client";

import { useMemo, useState } from "react";
import { Plus, Search, Star, Cake, AlertTriangle, Users, Phone } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { CustomerFormSheet } from "./customer-form-sheet";
import { CustomerDetailDrawer } from "./customer-detail-drawer";
import type { DbCustomer } from "@/lib/types/database";

interface CustomersPanelProps {
  initialCustomers: DbCustomer[];
  birthdays: DbCustomer[];
}

type Filter = "all" | "vip" | "allergies" | "regulars";

function formatPrice(n: number): string {
  return new Intl.NumberFormat("el-GR", { style: "currency", currency: "EUR" }).format(n);
}

function nextBirthdayDays(birthday: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const b = new Date(birthday);
  const next = new Date(today.getFullYear(), b.getMonth(), b.getDate());
  if (next < today) next.setFullYear(today.getFullYear() + 1);
  return Math.floor((next.getTime() - today.getTime()) / 86400000);
}

export function CustomersPanel({ initialCustomers, birthdays }: CustomersPanelProps) {
  const [customers, setCustomers] = useState<DbCustomer[]>(initialCustomers);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<DbCustomer | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    let list = customers;
    if (filter === "vip") list = list.filter((c) => c.is_vip);
    else if (filter === "allergies") list = list.filter((c) => c.allergies.length > 0);
    else if (filter === "regulars") list = list.filter((c) => c.total_visits >= 5);
    if (term) {
      list = list.filter(
        (c) => c.name.toLowerCase().includes(term) || (c.phone ?? "").includes(term) || (c.email ?? "").toLowerCase().includes(term),
      );
    }
    return list.sort((a, b) => a.name.localeCompare(b.name, "el"));
  }, [customers, search, filter]);

  const counts = useMemo(() => ({
    all: customers.length,
    vip: customers.filter((c) => c.is_vip).length,
    allergies: customers.filter((c) => c.allergies.length > 0).length,
    regulars: customers.filter((c) => c.total_visits >= 5).length,
  }), [customers]);

  const handleCreate = () => { setEditing(null); setFormOpen(true); };
  const handleEditFromDrawer = () => {
    const c = customers.find((x) => x.id === detailId);
    if (c) { setEditing(c); setDetailId(null); setFormOpen(true); }
  };
  const handleDeleted = (id: string) => setCustomers((prev) => prev.filter((c) => c.id !== id));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input placeholder="Αναζήτηση με όνομα ή τηλέφωνο..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Button onClick={handleCreate}><Plus className="mr-1 size-4" />Νέος Πελάτης</Button>
      </div>

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Card><CardContent className="flex items-center gap-3 p-4">
          <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary"><Users className="size-5" /></div>
          <div><p className="text-xs text-muted-foreground">Σύνολο</p><p className="text-xl font-bold">{counts.all}</p></div>
        </CardContent></Card>
        <Card><CardContent className="flex items-center gap-3 p-4">
          <div className="flex size-10 items-center justify-center rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400"><Star className="size-5" /></div>
          <div><p className="text-xs text-muted-foreground">VIP Πελάτες</p><p className="text-xl font-bold">{counts.vip}</p></div>
        </CardContent></Card>
        <Card><CardContent className="flex items-center gap-3 p-4">
          <div className="flex size-10 items-center justify-center rounded-full bg-red-500/20 text-red-600 dark:text-red-400"><AlertTriangle className="size-5" /></div>
          <div><p className="text-xs text-muted-foreground">Με Αλλεργίες</p><p className="text-xl font-bold">{counts.allergies}</p></div>
        </CardContent></Card>
        <Card><CardContent className="flex items-center gap-3 p-4">
          <div className="flex size-10 items-center justify-center rounded-full bg-pink-500/20 text-pink-600 dark:text-pink-400"><Cake className="size-5" /></div>
          <div><p className="text-xs text-muted-foreground">Γενέθλια 7 ημ.</p><p className="text-xl font-bold">{birthdays.length}</p></div>
        </CardContent></Card>
      </div>

      {birthdays.length > 0 && (
        <Card className="border-pink-500/30 bg-pink-500/5">
          <CardContent className="p-4">
            <div className="mb-2 flex items-center gap-2"><Cake className="size-4 text-pink-500" /><p className="text-sm font-semibold">Γενέθλια τις επόμενες 7 ημέρες</p></div>
            <div className="flex flex-wrap gap-2">
              {birthdays.map((c) => {
                const days = nextBirthdayDays(c.birthday!);
                return (
                  <button key={c.id} type="button" onClick={() => setDetailId(c.id)} className="flex items-center gap-2 rounded-full border border-pink-500/40 bg-background px-3 py-1 text-sm hover:bg-pink-500/10">
                    <Cake className="size-3.5 text-pink-500" />
                    <span className="font-medium">{c.name}</span>
                    <Badge variant="outline" className="text-[10px]">{days === 0 ? "Σήμερα" : `+${days} ημ.`}</Badge>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-1 overflow-x-auto border-b pb-1">
        {([
          { id: "all", label: "Όλοι", count: counts.all },
          { id: "vip", label: "VIP", count: counts.vip },
          { id: "allergies", label: "Με Αλλεργίες", count: counts.allergies },
          { id: "regulars", label: "Τακτικοί", count: counts.regulars },
        ] as const).map((t) => (
          <button key={t.id} type="button" onClick={() => setFilter(t.id)} className={cn(
            "shrink-0 rounded-md px-3 py-2 text-sm font-medium transition",
            filter === t.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
          )}>
            {t.label}
            <Badge variant={filter === t.id ? "outline" : "secondary"} className="ml-2 text-[10px]">{t.count}</Badge>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          {search ? `Δεν βρέθηκαν πελάτες για "${search}"` : "Δεν υπάρχουν πελάτες σε αυτό το φίλτρο"}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-3 py-2 text-left">Όνομα</th>
                <th className="px-3 py-2 text-left">Τηλέφωνο</th>
                <th className="px-3 py-2 text-right">Επισκέψεις</th>
                <th className="px-3 py-2 text-right">Σύνολο</th>
                <th className="px-3 py-2 text-left">Badges</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} onClick={() => setDetailId(c.id)} className="border-t cursor-pointer hover:bg-muted/30 transition-colors">
                  <td className="px-3 py-2 font-medium">
                    <div className="flex items-center gap-2">
                      {c.is_vip && <Star className="size-3.5 text-amber-500 fill-amber-500" />}
                      {c.name}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {c.phone ? <span className="flex items-center gap-1"><Phone className="size-3" />{c.phone}</span> : "—"}
                  </td>
                  <td className="px-3 py-2 text-right">{c.total_visits}</td>
                  <td className="px-3 py-2 text-right font-semibold">{formatPrice(c.total_spent)}</td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1">
                      {c.allergies.length > 0 && (
                        <Badge variant="outline" className="text-[10px] bg-red-500/10 border-red-500/40 text-red-700 dark:text-red-400">
                          <AlertTriangle className="mr-1 size-2.5" />{c.allergies.length}
                        </Badge>
                      )}
                      {c.tags.slice(0, 3).map((t) => <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>)}
                      {c.tags.length > 3 && <Badge variant="outline" className="text-[10px]">+{c.tags.length - 3}</Badge>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <CustomerFormSheet open={formOpen} onOpenChange={setFormOpen} customer={editing} />
      <CustomerDetailDrawer
        customerId={detailId}
        onOpenChange={(open) => { if (!open) setDetailId(null); }}
        onEdit={handleEditFromDrawer}
        onDeleted={() => detailId && handleDeleted(detailId)}
      />
    </div>
  );
}
