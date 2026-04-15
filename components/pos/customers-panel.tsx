"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Search, Star, Phone, Mail, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  createCustomer,
  updateCustomer,
  deleteCustomer,
} from "@/lib/actions/customers";
import type { DbCustomer } from "@/lib/types/database";

interface CustomersPanelProps {
  initialCustomers: DbCustomer[];
}

export function CustomersPanel({ initialCustomers }: CustomersPanelProps) {
  const [customers, setCustomers] = useState(initialCustomers);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<DbCustomer | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const filtered = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone?.includes(search) ||
      c.afm?.includes(search),
  );

  const handleCreate = async (formData: FormData) => {
    const result = await createCustomer({
      name: formData.get("name") as string,
      phone: (formData.get("phone") as string) || undefined,
      email: (formData.get("email") as string) || undefined,
      afm: (formData.get("afm") as string) || undefined,
      is_vip: formData.get("is_vip") === "on",
      discount: Number(formData.get("discount")) || 0,
      notes: (formData.get("notes") as string) || undefined,
    });

    if (result.success) {
      toast.success("Ο πελάτης δημιουργήθηκε");
      setIsFormOpen(false);
      window.location.reload();
    } else {
      toast.error(result.error);
    }
  };

  const handleDelete = (id: string) => {
    startTransition(async () => {
      const result = await deleteCustomer(id);
      if (result.success) {
        setCustomers((prev) => prev.filter((c) => c.id !== id));
        setSelected(null);
        toast.success("Ο πελάτης διαγράφηκε");
      } else {
        toast.error(result.error);
      }
    });
  };

  return (
    <div className="flex h-[calc(100vh-10rem)] gap-4">
      {/* Left: Customer list */}
      <div className="w-full max-w-md space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input
              placeholder="Αναζήτηση..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogTrigger asChild>
              <Button size="icon">
                <Plus className="size-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Νέος Πελάτης</DialogTitle>
              </DialogHeader>
              <form action={handleCreate} className="space-y-3">
                <div>
                  <Label htmlFor="name">Όνομα *</Label>
                  <Input id="name" name="name" required />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="phone">Τηλέφωνο</Label>
                    <Input id="phone" name="phone" />
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" name="email" type="email" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="afm">ΑΦΜ</Label>
                    <Input id="afm" name="afm" />
                  </div>
                  <div>
                    <Label htmlFor="discount">Έκπτωση %</Label>
                    <Input
                      id="discount"
                      name="discount"
                      type="number"
                      min="0"
                      max="100"
                      defaultValue="0"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="notes">Σημειώσεις</Label>
                  <Input id="notes" name="notes" />
                </div>
                <Button type="submit" className="w-full">
                  Δημιουργία
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <ScrollArea className="h-[calc(100vh-14rem)]">
          <div className="space-y-1">
            {filtered.map((customer) => (
              <button
                key={customer.id}
                onClick={() => setSelected(customer)}
                className={`w-full rounded-md border p-3 text-left transition-colors hover:bg-accent ${
                  selected?.id === customer.id ? "border-primary bg-accent" : ""
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{customer.name}</span>
                  {customer.is_vip && (
                    <Star className="size-4 fill-amber-400 text-amber-400" />
                  )}
                </div>
                {customer.phone && (
                  <span className="text-xs text-muted-foreground">
                    {customer.phone}
                  </span>
                )}
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Right: Customer detail */}
      <div className="flex-1">
        {selected ? (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                {selected.name}
                {selected.is_vip && <Badge className="bg-amber-500">VIP</Badge>}
              </CardTitle>
              <Button
                variant="ghost"
                size="icon"
                className="text-destructive"
                onClick={() => handleDelete(selected.id)}
                disabled={isPending}
              >
                <Trash2 className="size-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {selected.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="size-4 text-muted-foreground" />
                  {selected.phone}
                </div>
              )}
              {selected.email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="size-4 text-muted-foreground" />
                  {selected.email}
                </div>
              )}
              {selected.afm && (
                <div className="text-sm">
                  <span className="text-muted-foreground">ΑΦΜ:</span>{" "}
                  {selected.afm}
                </div>
              )}
              {selected.discount > 0 && (
                <Badge variant="outline">Έκπτωση {selected.discount}%</Badge>
              )}
              <div className="flex gap-2">
                <Badge variant="secondary">
                  Πόντοι: {selected.loyalty_points}
                </Badge>
                <Badge variant="secondary">
                  Stamps: {selected.stamp_count}
                </Badge>
              </div>
              {selected.allergies.length > 0 && (
                <div>
                  <span className="text-sm text-muted-foreground">
                    Αλλεργίες:
                  </span>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {selected.allergies.map((a) => (
                      <Badge key={a} variant="destructive" className="text-xs">
                        {a}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {selected.notes && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Σημειώσεις:</span>{" "}
                  {selected.notes}
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <p>Επιλέξτε πελάτη</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
