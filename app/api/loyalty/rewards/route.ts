import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("loyalty_rewards")
    .select("*")
    .eq("active", true)
    .order("sort_order", { ascending: true });
  if (error) return NextResponse.json([], { status: 500 });
  return NextResponse.json(data ?? []);
}
