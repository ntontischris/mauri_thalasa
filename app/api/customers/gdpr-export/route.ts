import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createServerSupabaseClient();

  const { data: customers, error: custErr } = await supabase
    .from("customers")
    .select("*")
    .eq("is_active", true);
  if (custErr) {
    return NextResponse.json({ error: custErr.message }, { status: 500 });
  }

  const { data: visits, error: visErr } = await supabase
    .from("customer_visits")
    .select("*");
  if (visErr) {
    return NextResponse.json({ error: visErr.message }, { status: 500 });
  }

  const visitsByCustomer = new Map<string, typeof visits>();
  for (const v of visits ?? []) {
    const existing = visitsByCustomer.get(v.customer_id) ?? [];
    existing.push(v);
    visitsByCustomer.set(v.customer_id, existing);
  }

  const payload = {
    exported_at: new Date().toISOString(),
    exported_by: "Mauri Thalassa POS",
    gdpr_notice:
      "This file contains personal data subject to GDPR. Handle with care.",
    customer_count: customers?.length ?? 0,
    customers: (customers ?? []).map((c) => ({
      ...c,
      visits: visitsByCustomer.get(c.id) ?? [],
    })),
  };

  const body = JSON.stringify(payload, null, 2);
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="customers-gdpr-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
}
