"use client";

import { Gift } from "lucide-react";
import { LoyaltySettings } from "@/components/pos/loyalty-settings";
import { LoyaltyRankings } from "@/components/pos/loyalty-rankings";
import { LoyaltyWinback } from "@/components/pos/loyalty-winback";

export default function LoyaltyPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Gift className="size-6 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">
          Πρόγραμμα Πιστότητας
        </h1>
      </div>

      {/* Settings */}
      <LoyaltySettings />

      {/* Rankings */}
      <LoyaltyRankings />

      {/* Near Reward + Win-back */}
      <LoyaltyWinback />
    </div>
  );
}
