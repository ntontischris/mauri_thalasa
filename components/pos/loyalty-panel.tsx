"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Trophy, Star, Settings, Save } from "lucide-react";
import { toast } from "sonner";
import { updateLoyaltySettings } from "@/lib/actions/loyalty";
import type { DbCustomer } from "@/lib/types/database";

interface LoyaltyPanelProps {
  settings: {
    points_per_euro: number;
    points_for_reward: number;
    reward_value: number;
    stamps_for_free_item: number;
  } | null;
  rankedCustomers: DbCustomer[];
}

const rankColors = ["text-amber-500", "text-gray-400", "text-amber-700"];

export function LoyaltyPanel({ settings, rankedCustomers }: LoyaltyPanelProps) {
  const [form, setForm] = useState({
    points_per_euro: settings?.points_per_euro ?? 1,
    points_for_reward: settings?.points_for_reward ?? 100,
    reward_value: settings?.reward_value ?? 10,
    stamps_for_free_item: settings?.stamps_for_free_item ?? 10,
  });
  const [isPending, startTransition] = useTransition();

  const handleSave = () => {
    startTransition(async () => {
      const result = await updateLoyaltySettings(form);
      if (result.success) toast.success("Ρυθμίσεις αποθηκεύτηκαν");
      else toast.error(result.error);
    });
  };

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {/* Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Settings className="size-4" />
            Ρυθμίσεις
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>Πόντοι ανά €</Label>
            <Input
              type="number"
              min="0"
              step="0.1"
              value={form.points_per_euro}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  points_per_euro: Number(e.target.value),
                }))
              }
            />
          </div>
          <div>
            <Label>Πόντοι για επιβράβευση</Label>
            <Input
              type="number"
              min="1"
              value={form.points_for_reward}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  points_for_reward: Number(e.target.value),
                }))
              }
            />
          </div>
          <div>
            <Label>Αξία επιβράβευσης (€)</Label>
            <Input
              type="number"
              min="0"
              step="0.5"
              value={form.reward_value}
              onChange={(e) =>
                setForm((f) => ({ ...f, reward_value: Number(e.target.value) }))
              }
            />
          </div>
          <div>
            <Label>Stamps για δώρο</Label>
            <Input
              type="number"
              min="1"
              value={form.stamps_for_free_item}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  stamps_for_free_item: Number(e.target.value),
                }))
              }
            />
          </div>
          <Button className="w-full" onClick={handleSave} disabled={isPending}>
            <Save className="mr-1 size-4" />
            {isPending ? "Αποθήκευση..." : "Αποθήκευση"}
          </Button>
        </CardContent>
      </Card>

      {/* Rankings */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Trophy className="size-4" />
            Κατάταξη
          </CardTitle>
        </CardHeader>
        <CardContent>
          {rankedCustomers.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              Κανένας πελάτης με πόντους ακόμα
            </p>
          ) : (
            <div className="space-y-1">
              {rankedCustomers.map((customer, i) => (
                <div
                  key={customer.id}
                  className="flex items-center gap-3 rounded-md border p-2"
                >
                  <span
                    className={`w-6 text-center font-bold ${i < 3 ? rankColors[i] : "text-muted-foreground"}`}
                  >
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate font-medium">
                        {customer.name}
                      </span>
                      {customer.is_vip && (
                        <Star className="size-3 fill-amber-400 text-amber-400" />
                      )}
                    </div>
                  </div>
                  <Badge variant="secondary" className="font-mono">
                    {customer.loyalty_points} pts
                  </Badge>
                  <Badge variant="outline" className="font-mono">
                    {customer.stamp_count} stamps
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
