import { createServerSupabaseClient } from "@/lib/supabase/server";
import { CampaignsPanel } from "@/components/pos/campaigns-panel";

export const dynamic = "force-dynamic";

export default async function CampaignsPage() {
  const supabase = await createServerSupabaseClient();

  const { data: campaigns } = await supabase
    .from("campaigns")
    .select(
      "id, name, channel, status, subject, target_all_customers, target_vip_only, total_recipients, delivered_count, failed_count, scheduled_at, sent_at, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(50);

  const { data: templates } = await supabase
    .from("message_templates")
    .select("id, name, type, channel, subject, body, is_active, created_at")
    .order("name");

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Καμπάνιες</h1>
        <p className="text-muted-foreground">SMS & Email μάρκετινγκ</p>
      </div>
      <CampaignsPanel campaigns={campaigns ?? []} templates={templates ?? []} />
    </div>
  );
}
