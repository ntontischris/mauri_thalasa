import { getCustomers } from "@/lib/queries/customers";
import {
  getLoyaltySettings,
  getLoyaltyTiers,
  getLoyaltyRewards,
  getRecentLoyaltyTransactions,
} from "@/lib/queries/loyalty";
import { LoyaltyPanel } from "@/components/pos/loyalty-panel";
import { Gem } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function LoyaltyPage() {
  const [settings, tiers, rewards, customers, recentTxns] = await Promise.all([
    getLoyaltySettings(),
    getLoyaltyTiers(),
    getLoyaltyRewards(false),
    getCustomers(),
    getRecentLoyaltyTransactions(100),
  ]);

  const ranked = customers
    .filter(
      (c) => c.loyalty_points > 0 || c.stamp_count > 0 || c.lifetime_points > 0,
    )
    .sort((a, b) => b.loyalty_points - a.loyalty_points);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Gem className="size-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Loyalty Program</h1>
          <p className="text-sm text-muted-foreground">
            {ranked.length} ενεργά μέλη · {tiers.length} tiers ·{" "}
            {rewards.filter((r) => r.active).length} rewards
          </p>
        </div>
      </div>
      <LoyaltyPanel
        settings={settings}
        tiers={tiers}
        rewards={rewards}
        rankedCustomers={ranked}
        recentTxns={recentTxns}
      />
    </div>
  );
}
