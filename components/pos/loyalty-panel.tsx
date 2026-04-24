"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Settings as SettingsIcon,
  Trophy,
  Star,
  Award,
  Gift,
  History,
  Save,
  Clock3,
  Crown,
  Medal,
  Gem,
  Plus,
  Trash2,
  Pencil,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  updateLoyaltySettings,
  upsertTier,
  deleteTier,
  upsertReward,
  deleteReward,
  expirePoints,
} from "@/lib/actions/loyalty";
import type {
  DbCustomer,
  DbLoyaltySettings,
  DbLoyaltyTier,
  DbLoyaltyReward,
  DbLoyaltyTransaction,
} from "@/lib/types/database";

type TabId = "settings" | "tiers" | "rewards" | "leaderboard" | "ledger";

interface LoyaltyPanelProps {
  settings: DbLoyaltySettings | null;
  tiers: DbLoyaltyTier[];
  rewards: DbLoyaltyReward[];
  rankedCustomers: DbCustomer[];
  recentTxns: (DbLoyaltyTransaction & { customer_name?: string })[];
}

const rankColors = ["text-amber-500", "text-gray-400", "text-amber-700"];

const KIND_LABELS: Record<DbLoyaltyTransaction["kind"], string> = {
  earn: "Κέρδος",
  redeem: "Εξαργύρωση",
  adjust: "Διόρθωση",
  bonus: "Bonus",
  referral: "Παραπομπή",
  expire: "Λήξη",
  opening: "Αρχικό",
};

const KIND_COLORS: Record<DbLoyaltyTransaction["kind"], string> = {
  earn: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
  redeem: "bg-rose-500/10 text-rose-600 border-rose-500/30",
  adjust: "bg-sky-500/10 text-sky-600 border-sky-500/30",
  bonus: "bg-amber-500/10 text-amber-600 border-amber-500/30",
  referral: "bg-violet-500/10 text-violet-600 border-violet-500/30",
  expire: "bg-gray-500/10 text-gray-600 border-gray-500/30",
  opening: "bg-slate-500/10 text-slate-600 border-slate-500/30",
};

export function LoyaltyPanel({
  settings,
  tiers,
  rewards,
  rankedCustomers,
  recentTxns,
}: LoyaltyPanelProps) {
  const [tab, setTab] = useState<TabId>("settings");

  return (
    <div className="space-y-4">
      <div className="flex gap-1 overflow-x-auto border-b pb-1">
        {[
          { id: "settings" as const, label: "Ρυθμίσεις", icon: SettingsIcon },
          { id: "tiers" as const, label: "Tiers", icon: Award },
          { id: "rewards" as const, label: "Rewards", icon: Gift },
          { id: "leaderboard" as const, label: "Κατάταξη", icon: Trophy },
          { id: "ledger" as const, label: "Κινήσεις", icon: History },
        ].map((t) => {
          const Icon = t.icon;
          const isActive = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon className="size-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === "settings" && <SettingsTab settings={settings} />}
      {tab === "tiers" && <TiersTab tiers={tiers} />}
      {tab === "rewards" && <RewardsTab rewards={rewards} tiers={tiers} />}
      {tab === "leaderboard" && (
        <LeaderboardTab customers={rankedCustomers} tiers={tiers} />
      )}
      {tab === "ledger" && <LedgerTab txns={recentTxns} />}
    </div>
  );
}

function SettingsTab({ settings }: { settings: DbLoyaltySettings | null }) {
  const [form, setForm] = useState({
    points_per_euro: settings?.points_per_euro ?? 1,
    points_for_reward: settings?.points_for_reward ?? 100,
    reward_value: settings?.reward_value ?? 5,
    stamps_for_free_item: settings?.stamps_for_free_item ?? 10,
    expiration_months: settings?.expiration_months ?? 18,
    welcome_bonus: settings?.welcome_bonus ?? 50,
    birthday_multiplier: settings?.birthday_multiplier ?? 2,
    winback_bonus: settings?.winback_bonus ?? 50,
    winback_days: settings?.winback_days ?? 45,
    referral_bonus: settings?.referral_bonus ?? 100,
  });
  const [isPending, startTransition] = useTransition();
  const [isExpiring, startExpire] = useTransition();

  const handleSave = () => {
    startTransition(async () => {
      const r = await updateLoyaltySettings(form);
      if (r.success) toast.success("Ρυθμίσεις αποθηκεύτηκαν");
      else toast.error(r.error ?? "Αποτυχία");
    });
  };

  const handleExpire = () => {
    startExpire(async () => {
      const r = await expirePoints();
      if (r.success) {
        toast.success(
          `Λήξη: ${r.data?.totalExpired ?? 0} πόντοι από ${r.data?.customersAffected ?? 0} πελάτες`,
        );
      } else toast.error(r.error ?? "Αποτυχία");
    });
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Απόκτηση Πόντων</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Field label="Πόντοι ανά €">
            <Input type="number" step="0.1" min="0" value={form.points_per_euro}
              onChange={(e) => setForm((f) => ({ ...f, points_per_euro: Number(e.target.value) }))} />
          </Field>
          <Field label="Πολλαπλασιαστής γενεθλίων (×)">
            <Input type="number" step="0.5" min="1" max="10" value={form.birthday_multiplier}
              onChange={(e) => setForm((f) => ({ ...f, birthday_multiplier: Number(e.target.value) }))} />
          </Field>
          <Field label="Welcome bonus">
            <Input type="number" min="0" value={form.welcome_bonus}
              onChange={(e) => setForm((f) => ({ ...f, welcome_bonus: Number(e.target.value) }))} />
          </Field>
          <Field label="Bonus παραπομπής">
            <Input type="number" min="0" value={form.referral_bonus}
              onChange={(e) => setForm((f) => ({ ...f, referral_bonus: Number(e.target.value) }))} />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Λήξη & Επανεργοποίηση</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Field label="Λήξη πόντων (μήνες · 0 = χωρίς λήξη)">
            <Input type="number" min="0" max="60" value={form.expiration_months}
              onChange={(e) => setForm((f) => ({ ...f, expiration_months: Number(e.target.value) }))} />
          </Field>
          <Field label="Winback bonus">
            <Input type="number" min="0" value={form.winback_bonus}
              onChange={(e) => setForm((f) => ({ ...f, winback_bonus: Number(e.target.value) }))} />
          </Field>
          <Field label="Αδράνεια για winback (ημέρες)">
            <Input type="number" min="7" value={form.winback_days}
              onChange={(e) => setForm((f) => ({ ...f, winback_days: Number(e.target.value) }))} />
          </Field>
          <div className="rounded-md border p-3 bg-muted/30">
            <p className="text-xs text-muted-foreground mb-2">
              Εκτέλεση λήξης πόντων. Δημιουργεί μόνο συμψηφιστικές κινήσεις «expire».
            </p>
            <Button type="button" variant="outline" size="sm" className="w-full"
              onClick={handleExpire} disabled={isExpiring}>
              <Clock3 className="mr-2 size-4" />
              {isExpiring ? "Εκτελείται..." : "Εκτέλεση λήξης τώρα"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-base">Legacy Stamps</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          <Field label="Stamps ανά δώρο">
            <Input type="number" min="1" value={form.stamps_for_free_item}
              onChange={(e) => setForm((f) => ({ ...f, stamps_for_free_item: Number(e.target.value) }))} />
          </Field>
          <Field label="Fallback πόντοι (legacy)">
            <Input type="number" min="1" value={form.points_for_reward}
              onChange={(e) => setForm((f) => ({ ...f, points_for_reward: Number(e.target.value) }))} />
          </Field>
          <Field label="Fallback αξία (€)">
            <Input type="number" step="0.5" min="0" value={form.reward_value}
              onChange={(e) => setForm((f) => ({ ...f, reward_value: Number(e.target.value) }))} />
          </Field>
        </CardContent>
      </Card>

      <div className="lg:col-span-2">
        <Button onClick={handleSave} disabled={isPending} className="w-full">
          <Save className="mr-2 size-4" />
          {isPending ? "Αποθήκευση..." : "Αποθήκευση Ρυθμίσεων"}
        </Button>
      </div>
    </div>
  );
}

const ICON_MAP = { Award, Medal, Crown, Gem, Star, Trophy };
function pickTierIcon(name: string | null) {
  if (!name) return Award;
  return (ICON_MAP[name as keyof typeof ICON_MAP] ?? Award) as typeof Award;
}

function TiersTab({ tiers }: { tiers: DbLoyaltyTier[] }) {
  const [editingId, setEditingId] = useState<string | "new" | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Tiers: πολλαπλασιαστής πόντων + προνόμια. Υπολογίζονται αυτόματα μετά από κάθε ολοκληρωμένη παραγγελία.
        </p>
        <Button size="sm" onClick={() => setEditingId("new")}>
          <Plus className="mr-2 size-4" />
          Νέο Tier
        </Button>
      </div>
      {editingId && (
        <TierEditor
          tier={editingId === "new" ? null : (tiers.find((t) => t.id === editingId) ?? null)}
          nextSortOrder={Math.max(0, ...tiers.map((t) => t.sort_order)) + 1}
          onClose={() => setEditingId(null)}
        />
      )}
      <div className="grid gap-3 md:grid-cols-2">
        {tiers.map((t) => (
          <TierCard key={t.id} tier={t} onEdit={() => setEditingId(t.id)} />
        ))}
      </div>
    </div>
  );
}

function TierCard({ tier, onEdit }: { tier: DbLoyaltyTier; onEdit: () => void }) {
  const [isPending, startTransition] = useTransition();
  const Icon = pickTierIcon(tier.icon);
  return (
    <Card className="border-l-4" style={{ borderLeftColor: tier.color ?? "#64748b" }}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-full flex items-center justify-center text-white"
              style={{ backgroundColor: tier.color ?? "#64748b" }}>
              <Icon className="size-4" />
            </div>
            <div>
              <p className="font-semibold">{tier.name}</p>
              <p className="text-xs text-muted-foreground">
                Sort #{tier.sort_order} · {tier.point_multiplier}× πόντοι
              </p>
            </div>
          </div>
          <div className="flex gap-1">
            <Button size="icon" variant="ghost" onClick={onEdit}>
              <Pencil className="size-3.5" />
            </Button>
            <Button size="icon" variant="ghost" disabled={isPending}
              onClick={() =>
                startTransition(async () => {
                  if (!confirm(`Διαγραφή tier "${tier.name}";`)) return;
                  const r = await deleteTier(tier.id);
                  if (r.success) toast.success("Διαγράφηκε");
                  else toast.error(r.error ?? "Αποτυχία");
                })
              }>
              <Trash2 className="size-3.5 text-rose-500" />
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="rounded bg-muted/50 p-2">
            <p className="text-muted-foreground">Min δαπάνη 12μ</p>
            <p className="font-mono font-semibold">€{tier.min_spend_12m}</p>
          </div>
          <div className="rounded bg-muted/50 p-2">
            <p className="text-muted-foreground">Min επισκέψεις 12μ</p>
            <p className="font-mono font-semibold">{tier.min_visits_12m}</p>
          </div>
        </div>
        {tier.perks.length > 0 && (
          <ul className="space-y-1">
            {tier.perks.map((p, i) => (
              <li key={i} className="flex items-start gap-1.5 text-xs">
                <Star className="size-3 text-amber-500 mt-0.5 shrink-0" />
                <span>{p}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function TierEditor({ tier, nextSortOrder, onClose }: { tier: DbLoyaltyTier | null; nextSortOrder: number; onClose: () => void }) {
  const [form, setForm] = useState({
    name: tier?.name ?? "",
    sort_order: tier?.sort_order ?? nextSortOrder,
    min_spend_12m: tier?.min_spend_12m ?? 0,
    min_visits_12m: tier?.min_visits_12m ?? 0,
    point_multiplier: tier?.point_multiplier ?? 1,
    color: tier?.color ?? "#64748b",
    icon: tier?.icon ?? "Award",
    perks: tier?.perks?.join("\n") ?? "",
  });
  const [isPending, startTransition] = useTransition();
  const handleSave = () => {
    const perks = form.perks.split("\n").map((p) => p.trim()).filter(Boolean);
    startTransition(async () => {
      const r = await upsertTier({
        id: tier?.id,
        name: form.name,
        sort_order: form.sort_order,
        min_spend_12m: form.min_spend_12m,
        min_visits_12m: form.min_visits_12m,
        point_multiplier: form.point_multiplier,
        color: form.color,
        icon: form.icon,
        perks,
      });
      if (r.success) { toast.success(tier ? "Ενημερώθηκε" : "Δημιουργήθηκε"); onClose(); }
      else toast.error(r.error ?? "Αποτυχία");
    });
  };
  return (
    <Card className="border-primary">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base">{tier ? `Επεξεργασία: ${tier.name}` : "Νέο Tier"}</CardTitle>
        <Button size="icon" variant="ghost" onClick={onClose}><X className="size-4" /></Button>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Όνομα"><Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} /></Field>
          <Field label="Sort order"><Input type="number" min="1" value={form.sort_order}
            onChange={(e) => setForm((f) => ({ ...f, sort_order: Number(e.target.value) }))} /></Field>
          <Field label="Min δαπάνη 12μ (€)"><Input type="number" min="0" value={form.min_spend_12m}
            onChange={(e) => setForm((f) => ({ ...f, min_spend_12m: Number(e.target.value) }))} /></Field>
          <Field label="Min επισκέψεις 12μ"><Input type="number" min="0" value={form.min_visits_12m}
            onChange={(e) => setForm((f) => ({ ...f, min_visits_12m: Number(e.target.value) }))} /></Field>
          <Field label="Πολλαπλασιαστής πόντων"><Input type="number" step="0.05" min="0.1" max="10" value={form.point_multiplier}
            onChange={(e) => setForm((f) => ({ ...f, point_multiplier: Number(e.target.value) }))} /></Field>
          <Field label="Χρώμα">
            <div className="flex gap-2">
              <Input value={form.color} onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))} />
              <input type="color" value={form.color}
                onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
                className="size-10 rounded cursor-pointer" />
            </div>
          </Field>
          <Field label="Icon (Award/Medal/Crown/Gem/Star)">
            <Input value={form.icon} onChange={(e) => setForm((f) => ({ ...f, icon: e.target.value }))} />
          </Field>
        </div>
        <Field label="Perks (μία ανά γραμμή)">
          <textarea value={form.perks}
            onChange={(e) => setForm((f) => ({ ...f, perks: e.target.value }))}
            className="w-full rounded-md border bg-background p-2 text-sm min-h-[80px] font-mono" />
        </Field>
        <div className="flex gap-2 pt-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>Ακύρωση</Button>
          <Button onClick={handleSave} disabled={isPending} className="flex-1">
            <Save className="mr-2 size-4" />{isPending ? "Αποθήκευση..." : "Αποθήκευση"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function RewardsTab({ rewards, tiers }: { rewards: DbLoyaltyReward[]; tiers: DbLoyaltyTier[] }) {
  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Κατάλογος επιβραβεύσεων — οι πελάτες επιλέγουν στην πληρωμή.</p>
        <Button size="sm" onClick={() => setEditingId("new")}>
          <Plus className="mr-2 size-4" /> Νέο Reward
        </Button>
      </div>
      {editingId && (
        <RewardEditor
          reward={editingId === "new" ? null : (rewards.find((r) => r.id === editingId) ?? null)}
          tiers={tiers}
          nextSort={Math.max(0, ...rewards.map((r) => r.sort_order)) + 1}
          onClose={() => setEditingId(null)}
        />
      )}
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {rewards.map((r) => (
          <RewardCard key={r.id} reward={r} tiers={tiers} onEdit={() => setEditingId(r.id)} />
        ))}
      </div>
    </div>
  );
}

function RewardCard({ reward, tiers, onEdit }: { reward: DbLoyaltyReward; tiers: DbLoyaltyTier[]; onEdit: () => void }) {
  const [isPending, startTransition] = useTransition();
  const minTier = tiers.find((t) => t.id === reward.min_tier_id);
  const valueDisplay = () =>
    reward.kind === "percent_off" ? `${reward.value}%` : reward.value > 0 ? `€${reward.value}` : "—";
  return (
    <Card className={cn(!reward.active && "opacity-50")}>
      <CardContent className="p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-semibold truncate">{reward.name}</p>
            {reward.description && (
              <p className="text-xs text-muted-foreground line-clamp-2">{reward.description}</p>
            )}
          </div>
          <div className="flex gap-1 shrink-0">
            <Button size="icon" variant="ghost" onClick={onEdit}><Pencil className="size-3.5" /></Button>
            <Button size="icon" variant="ghost" disabled={isPending}
              onClick={() =>
                startTransition(async () => {
                  if (!confirm(`Διαγραφή "${reward.name}";`)) return;
                  const r = await deleteReward(reward.id);
                  if (r.success) toast.success("Διαγράφηκε");
                  else toast.error(r.error ?? "Αποτυχία");
                })
              }>
              <Trash2 className="size-3.5 text-rose-500" />
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5 items-center text-xs">
          <Badge className="font-mono">{reward.points_cost} pts</Badge>
          <span className="text-muted-foreground">→</span>
          <Badge variant="outline">{valueDisplay()}</Badge>
          {minTier && (
            <Badge variant="outline" style={{ borderColor: minTier.color, color: minTier.color }}>
              {minTier.name}+
            </Badge>
          )}
          {!reward.active && <Badge variant="secondary">Ανενεργό</Badge>}
          {reward.stock !== null && <Badge variant="outline">Stock: {reward.stock}</Badge>}
        </div>
      </CardContent>
    </Card>
  );
}

function RewardEditor({ reward, tiers, nextSort, onClose }: { reward: DbLoyaltyReward | null; tiers: DbLoyaltyTier[]; nextSort: number; onClose: () => void }) {
  const [form, setForm] = useState({
    name: reward?.name ?? "",
    description: reward?.description ?? "",
    kind: reward?.kind ?? ("discount" as DbLoyaltyReward["kind"]),
    points_cost: reward?.points_cost ?? 100,
    value: reward?.value ?? 5,
    min_tier_id: reward?.min_tier_id ?? "",
    active: reward?.active ?? true,
    stock: reward?.stock ?? null,
    sort_order: reward?.sort_order ?? nextSort,
  });
  const [isPending, startTransition] = useTransition();
  const handleSave = () => {
    startTransition(async () => {
      const r = await upsertReward({
        id: reward?.id,
        name: form.name,
        description: form.description || null,
        kind: form.kind,
        points_cost: form.points_cost,
        value: form.value,
        min_tier_id: form.min_tier_id || null,
        active: form.active,
        stock: form.stock,
        sort_order: form.sort_order,
      });
      if (r.success) { toast.success(reward ? "Ενημερώθηκε" : "Δημιουργήθηκε"); onClose(); }
      else toast.error(r.error ?? "Αποτυχία");
    });
  };
  return (
    <Card className="border-primary">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base">{reward ? `Επεξεργασία: ${reward.name}` : "Νέο Reward"}</CardTitle>
        <Button size="icon" variant="ghost" onClick={onClose}><X className="size-4" /></Button>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Όνομα">
            <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </Field>
          <Field label="Τύπος">
            <select value={form.kind}
              onChange={(e) => setForm((f) => ({ ...f, kind: e.target.value as DbLoyaltyReward["kind"] }))}
              className="w-full h-10 rounded-md border bg-background px-3 text-sm">
              <option value="discount">Έκπτωση (€)</option>
              <option value="percent_off">Έκπτωση %</option>
              <option value="free_item">Δωρεάν προϊόν</option>
              <option value="custom">Προσαρμοσμένο</option>
            </select>
          </Field>
          <Field label="Κόστος (πόντοι)">
            <Input type="number" min="1" value={form.points_cost}
              onChange={(e) => setForm((f) => ({ ...f, points_cost: Number(e.target.value) }))} />
          </Field>
          <Field label={form.kind === "percent_off" ? "Ποσοστό (%)" : "Αξία (€)"}>
            <Input type="number" step="0.5" min="0" value={form.value}
              onChange={(e) => setForm((f) => ({ ...f, value: Number(e.target.value) }))} />
          </Field>
          <Field label="Ελάχιστο tier">
            <select value={form.min_tier_id ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, min_tier_id: e.target.value }))}
              className="w-full h-10 rounded-md border bg-background px-3 text-sm">
              <option value="">Όλοι</option>
              {tiers.map((t) => (<option key={t.id} value={t.id}>{t.name}+</option>))}
            </select>
          </Field>
          <Field label="Stock (κενό = απεριόριστο)">
            <Input type="number" min="0" value={form.stock ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, stock: e.target.value === "" ? null : Number(e.target.value) }))} />
          </Field>
          <Field label="Sort order">
            <Input type="number" min="0" value={form.sort_order}
              onChange={(e) => setForm((f) => ({ ...f, sort_order: Number(e.target.value) }))} />
          </Field>
          <div className="flex items-center gap-2 pt-6">
            <input id="reward-active" type="checkbox" checked={form.active}
              onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
              className="size-4" />
            <Label htmlFor="reward-active">Ενεργό</Label>
          </div>
        </div>
        <Field label="Περιγραφή">
          <textarea value={form.description ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            className="w-full rounded-md border bg-background p-2 text-sm min-h-[60px]" />
        </Field>
        <div className="flex gap-2 pt-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>Ακύρωση</Button>
          <Button onClick={handleSave} disabled={isPending} className="flex-1">
            <Save className="mr-2 size-4" />{isPending ? "Αποθήκευση..." : "Αποθήκευση"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function LeaderboardTab({ customers, tiers }: { customers: DbCustomer[]; tiers: DbLoyaltyTier[] }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Trophy className="size-4" /> Κατάταξη Πελατών
        </CardTitle>
      </CardHeader>
      <CardContent>
        {customers.length === 0 ? (
          <p className="py-8 text-center text-muted-foreground text-sm">Κανένας πελάτης με πόντους ακόμα.</p>
        ) : (
          <div className="space-y-1">
            {customers.map((c, i) => {
              const tier = tiers.find((t) => t.id === c.tier_id);
              return (
                <div key={c.id} className="flex items-center gap-3 rounded-md border p-2">
                  <span className={cn("w-6 text-center font-bold", i < 3 ? rankColors[i] : "text-muted-foreground")}>
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate font-medium">{c.name}</span>
                      {c.is_vip && <Star className="size-3 fill-amber-400 text-amber-400" />}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Lifetime: {c.lifetime_points} pts · {c.total_visits} επισκέψεις
                    </p>
                  </div>
                  {tier && (
                    <Badge variant="outline" style={{ borderColor: tier.color, color: tier.color }}>
                      {tier.name}
                    </Badge>
                  )}
                  <Badge variant="secondary" className="font-mono">{c.loyalty_points} pts</Badge>
                  <Badge variant="outline" className="font-mono">{c.stamp_count}/10</Badge>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function LedgerTab({ txns }: { txns: (DbLoyaltyTransaction & { customer_name?: string })[] }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <History className="size-4" /> Πρόσφατες Κινήσεις (100 τελευταίες)
        </CardTitle>
      </CardHeader>
      <CardContent>
        {txns.length === 0 ? (
          <p className="py-8 text-center text-muted-foreground text-sm">Καμία κίνηση ακόμα.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-3 py-2 text-left">Ημερομηνία</th>
                  <th className="px-3 py-2 text-left">Πελάτης</th>
                  <th className="px-3 py-2 text-left">Τύπος</th>
                  <th className="px-3 py-2 text-right">Πόντοι</th>
                  <th className="px-3 py-2 text-left">Σημείωση</th>
                </tr>
              </thead>
              <tbody>
                {txns.map((t) => (
                  <tr key={t.id} className="border-t">
                    <td className="px-3 py-2 text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(t.created_at).toLocaleString("el-GR")}
                    </td>
                    <td className="px-3 py-2 font-medium">{t.customer_name ?? "—"}</td>
                    <td className="px-3 py-2">
                      <Badge variant="outline" className={cn("text-xs", KIND_COLORS[t.kind])}>
                        {KIND_LABELS[t.kind]}
                      </Badge>
                    </td>
                    <td className={cn("px-3 py-2 text-right font-mono font-semibold",
                      t.points > 0 ? "text-emerald-600" : t.points < 0 ? "text-rose-600" : "")}>
                      {t.points > 0 ? "+" : ""}{t.points}
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{t.note ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}
