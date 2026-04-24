import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q") ?? "";
  if (q.trim().length < 2) return NextResponse.json([]);

  const supabase = await createServerSupabaseClient();
  const digits = q.replace(/\D/g, "");
  const filter =
    digits.length >= 6
      ? `phone.ilike.%${digits}%,name.ilike.%${q}%`
      : `name.ilike.%${q}%,phone.ilike.%${digits}%`;

  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .eq("is_active", true)
    .or(filter)
    .limit(10);

  if (error) return NextResponse.json([], { status: 200 });
  return NextResponse.json(data ?? []);
}
