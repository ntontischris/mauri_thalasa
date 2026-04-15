import { getCustomers } from "@/lib/queries/customers";
import { LoyaltyPanel } from "@/components/pos/loyalty-panel";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function LoyaltyPage() {
  const supabase = await createServerSupabaseClient();
  const { data: settings } = await supabase
    .from("loyalty_settings")
    .select(
      "id, points_per_euro, points_for_reward, reward_value, stamps_for_free_item, updated_at",
    )
    .limit(1)
    .single();
  const customers = await getCustomers();
  const ranked = customers
    .filter((c) => c.loyalty_points > 0 || c.stamp_count > 0)
    .sort((a, b) => b.loyalty_points - a.loyalty_points);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Loyalty Program</h1>
        <p className="text-muted-foreground">{ranked.length} μέλη με πόντους</p>
      </div>
      <LoyaltyPanel settings={settings} rankedCustomers={ranked} />
    </div>
  );
}
