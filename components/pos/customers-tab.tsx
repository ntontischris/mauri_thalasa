"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  Crown,
  Mail,
  TrendingUp,
  Euro,
  Gift,
  AlertTriangle,
  Send,
  Download,
} from "lucide-react";
import { toast } from "sonner";
import type {
  CustomerKpis,
  TopSpender,
  BirthdayCustomer,
  InactiveCustomer,
} from "@/lib/queries/customer-analytics";

function formatPrice(n: number): string {
  return new Intl.NumberFormat("el-GR", {
    style: "currency",
    currency: "EUR",
  }).format(n);
}

function formatDate(s: string | null): string {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("el-GR");
}

function daysUntil(birthday: string): number {
  const now = new Date();
  const bd = new Date(birthday);
  const target = new Date(now.getFullYear(), bd.getMonth(), bd.getDate());
  if (target < new Date(now.getFullYear(), now.getMonth(), now.getDate())) {
    target.setFullYear(now.getFullYear() + 1);
  }
  return Math.round(
    (target.getTime() - now.setHours(0, 0, 0, 0)) / (1000 * 60 * 60 * 24),
  );
}

interface CustomersTabProps {
  kpis: CustomerKpis;
  topSpenders: TopSpender[];
  birthdays: BirthdayCustomer[];
  inactive: InactiveCustomer[];
}

export function CustomersTab({
  kpis,
  topSpenders,
  birthdays,
  inactive,
}: CustomersTabProps) {
  const [isPending, startTransition] = useTransition();
  const [birthdayMessage, setBirthdayMessage] = useState(
    "Χρόνια πολλά από τη Μαύρη Θάλασσα! 🎂 Εύχομαι καλή χρονιά. Ελάτε να τη γιορτάσουμε μαζί — σας περιμένει μία έκπληξη!",
  );
  const [reactivateMessage, setReactivateMessage] = useState(
    "Μας λείπετε! Ελάτε να σας ξαναδούμε στη Μαύρη Θάλασσα — μία δωρεάν καραφάκι λευκό κρασί για εσάς.",
  );

  const optedInBirthdays = birthdays.filter((b) => b.marketing_opt_in);

  const sendSms = async (
    recipients: { id: string; name: string; phone: string | null }[],
    message: string,
    label: string,
  ) => {
    const phones = recipients
      .filter((r) => r.phone)
      .map((r) => ({ id: r.id, phone: r.phone! }));
    if (phones.length === 0) {
      toast.error("Δεν υπάρχουν τηλέφωνα");
      return;
    }
    startTransition(async () => {
      const res = await fetch("/api/customers/sms-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipients: phones, message }),
      });
      const result = await res.json();
      if (result.ok) {
        toast.success(
          `${label}: Στάλθηκαν ${result.sent}/${phones.length}${result.failed > 0 ? ` (${result.failed} αποτυχία)` : ""}`,
        );
      } else {
        toast.error(result.error ?? "Αποτυχία αποστολής");
      }
    });
  };

  const exportGdpr = async () => {
    try {
      const res = await fetch("/api/customers/gdpr-export");
      if (!res.ok) throw new Error("Export απέτυχε");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `customers-gdpr-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Εξαγωγή ολοκληρώθηκε");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Σφάλμα");
    }
  };

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Kpi
          icon={<Users className="size-5" />}
          label="Ενεργοί Πελάτες"
          value={String(kpis.total_active)}
          hint={`${kpis.new_this_month} νέοι αυτό τον μήνα`}
        />
        <Kpi
          icon={<Crown className="size-5" />}
          label="VIP"
          value={String(kpis.total_vip)}
          hint={`${((kpis.total_vip / Math.max(1, kpis.total_active)) * 100).toFixed(0)}% του συνόλου`}
        />
        <Kpi
          icon={<Mail className="size-5" />}
          label="Marketing Opt-in"
          value={String(kpis.with_opt_in)}
          hint="GDPR συναίνεση για SMS"
        />
        <Kpi
          icon={<TrendingUp className="size-5" />}
          label="Μέσος Όρος Δαπάνης"
          value={formatPrice(kpis.avg_spent)}
          hint={`${kpis.avg_visits.toFixed(1)} επισκέψεις κατά μ.ό.`}
        />
      </div>

      {/* Top Spenders */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Euro className="size-4" />
            Top 20 Πελάτες (Total Spent)
          </CardTitle>
          <Button size="sm" variant="outline" onClick={exportGdpr}>
            <Download className="mr-2 size-3.5" />
            GDPR Export
          </Button>
        </CardHeader>
        <CardContent>
          {topSpenders.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Δεν υπάρχουν δεδομένα.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-3 py-2 text-left">#</th>
                    <th className="px-3 py-2 text-left">Όνομα</th>
                    <th className="px-3 py-2 text-left">Τηλέφωνο</th>
                    <th className="px-3 py-2 text-right">Επισκέψεις</th>
                    <th className="px-3 py-2 text-right">Σύνολο</th>
                    <th className="px-3 py-2 text-right">Τελευταία</th>
                  </tr>
                </thead>
                <tbody>
                  {topSpenders.map((c, i) => (
                    <tr key={c.id} className="border-t">
                      <td className="px-3 py-2 text-muted-foreground">
                        {i + 1}
                      </td>
                      <td className="px-3 py-2 font-medium">
                        {c.name}
                        {c.is_vip && (
                          <Crown className="ml-1 inline size-3 text-amber-500" />
                        )}
                      </td>
                      <td className="px-3 py-2 font-mono text-xs">
                        {c.phone ?? "—"}
                      </td>
                      <td className="px-3 py-2 text-right">{c.total_visits}</td>
                      <td className="px-3 py-2 text-right font-semibold">
                        {formatPrice(c.total_spent)}
                      </td>
                      <td className="px-3 py-2 text-right text-xs text-muted-foreground">
                        {formatDate(c.last_visit_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Birthdays */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Gift className="size-4" />
            Επερχόμενα Γενέθλια (30 ημέρες)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {birthdays.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Κανένα γενέθλιο το επόμενο μήνα.
            </p>
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                {birthdays.map((b) => {
                  const days = daysUntil(b.birthday);
                  return (
                    <div
                      key={b.id}
                      className="flex items-center gap-2 rounded-md border bg-pink-500/5 border-pink-500/40 px-2 py-1 text-xs"
                    >
                      <span className="font-medium">{b.name}</span>
                      <Badge variant="outline" className="h-5 text-[10px]">
                        {days === 0 ? "Σήμερα!" : `${days}μ`}
                      </Badge>
                      {b.marketing_opt_in && (
                        <Mail className="size-3 text-emerald-500" />
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="space-y-2 pt-2 border-t">
                <label className="text-xs font-medium">Μήνυμα SMS</label>
                <textarea
                  value={birthdayMessage}
                  onChange={(e) => setBirthdayMessage(e.target.value)}
                  className="w-full rounded-md border bg-background p-2 text-sm min-h-[80px] font-mono"
                />
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    {optedInBirthdays.length} παραλήπτες με opt-in ·{" "}
                    {birthdayMessage.length} χαρακτήρες
                  </span>
                  <Button
                    size="sm"
                    disabled={isPending || optedInBirthdays.length === 0}
                    onClick={() =>
                      sendSms(optedInBirthdays, birthdayMessage, "Γενέθλια")
                    }
                  >
                    <Send className="mr-2 size-3.5" />
                    Αποστολή σε {optedInBirthdays.length}
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Inactive Customers */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="size-4 text-amber-500" />
            Αδρανείς Πελάτες (60+ ημέρες)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {inactive.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Όλοι οι πελάτες είναι ενεργοί!
            </p>
          ) : (
            <>
              <div className="max-h-64 overflow-y-auto rounded-md border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left">Όνομα</th>
                      <th className="px-3 py-2 text-left">Τηλέφωνο</th>
                      <th className="px-3 py-2 text-right">Σύνολο</th>
                      <th className="px-3 py-2 text-right">Τελευταία</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inactive.map((c) => (
                      <tr key={c.id} className="border-t">
                        <td className="px-3 py-2 font-medium">{c.name}</td>
                        <td className="px-3 py-2 font-mono text-xs">
                          {c.phone ?? "—"}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {formatPrice(c.total_spent)}
                        </td>
                        <td className="px-3 py-2 text-right text-xs text-muted-foreground">
                          {formatDate(c.last_visit_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="space-y-2 pt-2 border-t">
                <label className="text-xs font-medium">
                  Μήνυμα επανεργοποίησης
                </label>
                <textarea
                  value={reactivateMessage}
                  onChange={(e) => setReactivateMessage(e.target.value)}
                  className="w-full rounded-md border bg-background p-2 text-sm min-h-[80px] font-mono"
                />
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    {inactive.filter((i) => i.phone).length} παραλήπτες ·{" "}
                    {reactivateMessage.length} χαρακτήρες
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isPending}
                    onClick={() =>
                      sendSms(inactive, reactivateMessage, "Reactivate")
                    }
                  >
                    <Send className="mr-2 size-3.5" />
                    Reactivation Campaign
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Kpi({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          <p className="text-xl font-bold truncate">{value}</p>
          {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
        </div>
      </CardContent>
    </Card>
  );
}
