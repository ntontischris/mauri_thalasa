"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useLoyalty } from "@/hooks/use-loyalty";
import type { LoyaltySettings } from "@/lib/types";

export function LoyaltySettings() {
  const { loyaltySettings, updateLoyaltySettings } = useLoyalty();

  const [local, setLocal] = useState<LoyaltySettings>(loyaltySettings);

  const handleChange = (field: keyof LoyaltySettings, value: string) => {
    const num = parseFloat(value);
    if (isNaN(num) || num < 0) return;
    setLocal((prev) => ({ ...prev, [field]: num }));
  };

  const handleSave = () => {
    updateLoyaltySettings(local);
  };

  const fields: {
    field: keyof LoyaltySettings;
    label: string;
    step: string;
  }[] = [
    { field: "pointsPerEuro", label: "Πόντοι/€", step: "1" },
    { field: "pointsForReward", label: "Πόντοι για reward", step: "1" },
    { field: "rewardValue", label: "Αξία reward (€)", step: "0.5" },
    { field: "stampsForFreeItem", label: "Stamps για δωρεάν", step: "1" },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Ρυθμίσεις Προγράμματος</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {fields.map(({ field, label, step }) => (
            <div key={field} className="space-y-1.5">
              <label className="text-sm text-muted-foreground">{label}</label>
              <Input
                type="number"
                min={0}
                step={step}
                value={local[field]}
                onChange={(e) => handleChange(field, e.target.value)}
              />
            </div>
          ))}
        </div>
        <Button onClick={handleSave}>Αποθήκευση</Button>
      </CardContent>
    </Card>
  );
}
