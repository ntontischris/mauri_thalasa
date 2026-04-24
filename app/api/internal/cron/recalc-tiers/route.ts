import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Vercel cron target. Schedule lives in /vercel.json.
// Invoked daily (see vercel.json) to catch tier DOWNGRADES on
// 12-month-spend decay. Upgrades are already caught in real
// time by the customer_visits trigger (migration 034).
//
// Authentication: Vercel cron requests carry
//   Authorization: Bearer <CRON_SECRET>
// automatically when the env var `CRON_SECRET` is set in the
// project settings. Any other caller is rejected.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("[cron/recalc-tiers] CRON_SECRET env var not configured");
    return NextResponse.json({ error: "cron not configured" }, { status: 500 });
  }

  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    console.error("[cron/recalc-tiers] Supabase env vars missing");
    return NextResponse.json(
      { error: "supabase not configured" },
      { status: 500 },
    );
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  const startedAt = Date.now();
  const { data, error } = await supabase.rpc("recalculate_all_tiers");
  const elapsedMs = Date.now() - startedAt;

  if (error) {
    console.error("[cron/recalc-tiers] rpc failed", error);
    return NextResponse.json(
      { ok: false, error: error.message, elapsedMs },
      { status: 500 },
    );
  }

  const changed = typeof data === "number" ? data : 0;
  console.log(`[cron/recalc-tiers] changed=${changed} elapsed=${elapsedMs}ms`);
  return NextResponse.json({ ok: true, changed, elapsedMs });
}
