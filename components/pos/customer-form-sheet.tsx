"use client";

import { useEffect, useState, useTransition } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { X, Plus } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { createCustomer, updateCustomer } from "@/lib/actions/customers";
import type { DbCustomer } from "@/lib/types/database";

const ALLERGY_PRESETS = ["Γλουτένη", "Λακτόζη", "Ξηροί Καρποί", "Θαλασσινά", "Αυγά", "Σόγια"];

interface CustomerFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer?: DbCustomer | null;
  onSaved?: () => void;
}

export function CustomerFormSheet({ open, onOpenChange, customer, onSaved }: CustomerFormSheetProps) {
  const isEdit = Boolean(customer);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [birthday, setBirthday] = useState("");
  const [notes, setNotes] = useState("");
  const [isVip, setIsVip] = useState(false);
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [allergies, setAllergies] = useState<string[]>([]);
  const [customAllergy, setCustomAllergy] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    if (customer) {
      setName(customer.name);
      setPhone(customer.phone ?? "");
      setEmail(customer.email ?? "");
      setBirthday(customer.birthday ?? "");
      setNotes(customer.notes ?? "");
      setIsVip(customer.is_vip);
      setMarketingOptIn(customer.marketing_opt_in ?? false);
      setAllergies(customer.allergies ?? []);
      setTags(customer.tags ?? []);
    } else {
      setName(""); setPhone(""); setEmail(""); setBirthday(""); setNotes("");
      setIsVip(false); setMarketingOptIn(false); setAllergies([]); setTags([]);
    }
    setCustomAllergy(""); setNewTag("");
  }, [open, customer]);

  const toggleAllergy = (a: string) => setAllergies((p) => p.includes(a) ? p.filter((x) => x !== a) : [...p, a]);
  const addCustomAllergy = () => {
    const t = customAllergy.trim();
    if (t && !allergies.includes(t)) { setAllergies((p) => [...p, t]); setCustomAllergy(""); }
  };
  const addTag = () => {
    const t = newTag.trim();
    if (t && !tags.includes(t)) { setTags((p) => [...p, t]); setNewTag(""); }
  };
  const removeTag = (t: string) => setTags((p) => p.filter((x) => x !== t));

  const handleSave = () => {
    if (!name.trim()) { toast.error("Συμπλήρωσε το όνομα"); return; }
    startTransition(async () => {
      const payload = {
        name: name.trim(),
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        birthday: birthday || undefined,
        notes: notes.trim() || undefined,
        is_vip: isVip,
        marketing_opt_in: marketingOptIn,
        allergies,
        tags,
        discount: customer?.discount ?? 0,
      };
      const result = isEdit && customer
        ? await updateCustomer(customer.id, payload)
        : await createCustomer(payload);
      if (!result.success) { toast.error(result.error ?? "Αποτυχία"); return; }
      toast.success(isEdit ? "Αποθηκεύτηκε" : "Προστέθηκε");
      onSaved?.();
      onOpenChange(false);
    });
  };

  const customAllergies = allergies.filter((a) => !ALLERGY_PRESETS.includes(a));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{isEdit ? "Επεξεργασία πελάτη" : "Νέος Πελάτης"}</SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="c-name">Ονοματεπώνυμο *</Label>
            <Input id="c-name" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </div>
          <div className="grid gap-3 grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="c-phone">Τηλέφωνο</Label>
              <Input id="c-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="69xxxxxxxx" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="c-email">Email</Label>
              <Input id="c-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@example.gr" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="c-bday">Γενέθλια</Label>
            <Input id="c-bday" type="date" value={birthday} onChange={(e) => setBirthday(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="c-notes">Σημειώσεις</Label>
            <Textarea id="c-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Σημειώσεις για τον πελάτη..." />
          </div>
          <div className="space-y-2">
            <Label>Αλλεργίες</Label>
            <div className="flex flex-wrap gap-1.5">
              {ALLERGY_PRESETS.map((a) => {
                const active = allergies.includes(a);
                return (
                  <button key={a} type="button" onClick={() => toggleAllergy(a)} className={cn(
                    "rounded-full border px-3 py-1 text-xs font-medium transition",
                    active ? "border-red-500 bg-red-500/10 text-red-700 dark:text-red-400" : "border-border bg-muted/50 text-muted-foreground hover:border-red-500/50",
                  )}>{a}</button>
                );
              })}
            </div>
            <div className="flex gap-2 mt-2">
              <Input value={customAllergy} onChange={(e) => setCustomAllergy(e.target.value)} placeholder="Άλλη αλλεργία..." className="h-9 text-sm"
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustomAllergy(); } }} />
              <Button type="button" variant="outline" size="sm" onClick={addCustomAllergy} disabled={!customAllergy.trim()}>Προσθήκη</Button>
            </div>
            {customAllergies.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {customAllergies.map((a) => (
                  <Badge key={a} variant="outline" className="text-[10px] bg-red-500/10 border-red-500/40 gap-1">
                    {a}
                    <button type="button" onClick={() => toggleAllergy(a)} className="hover:text-red-500"><X className="size-2.5" /></button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
          <div className="space-y-2">
            <Label>Ετικέτες</Label>
            <div className="flex flex-wrap gap-1.5">
              {tags.map((t) => (
                <Badge key={t} variant="secondary" className="gap-1">{t}
                  <button type="button" onClick={() => removeTag(t)} className="hover:text-destructive"><X className="size-3" /></button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input value={newTag} onChange={(e) => setNewTag(e.target.value)} placeholder="Νέα ετικέτα..." className="h-9 text-sm"
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }} />
              <Button type="button" variant="outline" size="sm" onClick={addTag} disabled={!newTag.trim()}>
                <Plus className="mr-1 size-3.5" />Προσθήκη
              </Button>
            </div>
          </div>
          <div className="flex items-center justify-between rounded-md border p-3">
            <div><Label>VIP πελάτης</Label><p className="text-xs text-muted-foreground">Badge + προτεραιότητα</p></div>
            <Switch checked={isVip} onCheckedChange={setIsVip} />
          </div>
          <div className="flex items-center justify-between rounded-md border p-3">
            <div><Label>Συναίνεση marketing</Label><p className="text-xs text-muted-foreground">Αποστολή SMS/email προωθητικών</p></div>
            <Switch checked={marketingOptIn} onCheckedChange={setMarketingOptIn} />
          </div>
        </div>
        <div className="flex gap-2 border-t p-4">
          <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)} disabled={isPending}>Ακύρωση</Button>
          <Button className="flex-1" onClick={handleSave} disabled={isPending}>
            {isPending ? "Αποθήκευση..." : isEdit ? "Αποθήκευση" : "Προσθήκη"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
