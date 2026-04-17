import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { DbCustomer, DbCustomerVisit } from "@/lib/types/database";

export interface CustomerFavorite {
  name: string;
  count: number;
}

export interface CustomerDetail {
  customer: DbCustomer;
  visits: DbCustomerVisit[];
  favorites: CustomerFavorite[];
}

export async function getCustomerDetail(
  id: string,
): Promise<CustomerDetail | null> {
  const supabase = await createServerSupabaseClient();

  const customerRes = await supabase
    .from("customers")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (customerRes.error || !customerRes.data) return null;
  const customer = customerRes.data as DbCustomer;

  const visitsRes = await supabase
    .from("customer_visits")
    .select(
      "id, customer_id, order_id, date, table_number, total, items, created_at",
    )
    .eq("customer_id", id)
    .order("date", { ascending: false })
    .limit(50);

  const visits = (visitsRes.data ?? []) as DbCustomerVisit[];

  // Aggregate favorites from visit items
  const counts = new Map<string, number>();
  for (const v of visits) {
    for (const name of v.items ?? []) {
      counts.set(name, (counts.get(name) ?? 0) + 1);
    }
  }
  const favorites = Array.from(counts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return { customer, visits, favorites };
}

export async function findCustomerByPhone(
  phone: string,
): Promise<DbCustomer | null> {
  const supabase = await createServerSupabaseClient();
  const normalized = phone.replace(/\D/g, "");
  if (normalized.length < 6) return null;
  const { data } = await supabase
    .from("customers")
    .select("*")
    .or(
      `phone.eq.${normalized},phone.eq.+30${normalized},phone.eq.+${normalized}`,
    )
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();
  return (data as DbCustomer) ?? null;
}

export async function getUpcomingBirthdays(days = 7): Promise<DbCustomer[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .eq("is_active", true)
    .not("birthday", "is", null);
  if (error) return [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const upcoming: DbCustomer[] = [];
  for (const c of (data as DbCustomer[]) ?? []) {
    if (!c.birthday) continue;
    const b = new Date(c.birthday);
    const next = new Date(today.getFullYear(), b.getMonth(), b.getDate());
    if (next < today) next.setFullYear(today.getFullYear() + 1);
    const diffDays = Math.floor((next.getTime() - today.getTime()) / 86400000);
    if (diffDays >= 0 && diffDays <= days) {
      upcoming.push(c);
    }
  }
  return upcoming.sort((a, b) => {
    const da = new Date(a.birthday!);
    const db = new Date(b.birthday!);
    return (
      da.getMonth() * 100 + da.getDate() - (db.getMonth() * 100 + db.getDate())
    );
  });
}
