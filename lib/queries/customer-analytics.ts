import { createServerSupabaseClient } from "@/lib/supabase/server";

export interface CustomerKpis {
  total_active: number;
  total_vip: number;
  with_opt_in: number;
  avg_visits: number;
  avg_spent: number;
  new_this_month: number;
  returning_this_month: number;
}

export interface TopSpender {
  id: string;
  name: string;
  phone: string | null;
  total_spent: number;
  total_visits: number;
  is_vip: boolean;
  last_visit_at: string | null;
}

export interface BirthdayCustomer {
  id: string;
  name: string;
  phone: string | null;
  birthday: string;
  marketing_opt_in: boolean;
}

function daysUntilBirthday(birthday: string): number {
  const now = new Date();
  const bd = new Date(birthday);
  const target = new Date(
    now.getFullYear(),
    bd.getMonth(),
    bd.getDate(),
    0,
    0,
    0,
  );
  if (target < new Date(now.getFullYear(), now.getMonth(), now.getDate())) {
    target.setFullYear(now.getFullYear() + 1);
  }
  const ms = target.getTime() - now.setHours(0, 0, 0, 0);
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

export async function getCustomerKpis(): Promise<CustomerKpis> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("customers")
    .select(
      "id, is_vip, marketing_opt_in, total_visits, total_spent, last_visit_at, created_at",
    )
    .eq("is_active", true);
  if (error) throw new Error(`Customer KPIs failed: ${error.message}`);

  const list = data ?? [];
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const totalVisits = list.reduce((s, c) => s + (c.total_visits ?? 0), 0);
  const totalSpent = list.reduce((s, c) => s + (c.total_spent ?? 0), 0);

  return {
    total_active: list.length,
    total_vip: list.filter((c) => c.is_vip).length,
    with_opt_in: list.filter((c) => c.marketing_opt_in).length,
    avg_visits: list.length ? totalVisits / list.length : 0,
    avg_spent: list.length ? totalSpent / list.length : 0,
    new_this_month: list.filter(
      (c) => c.created_at && new Date(c.created_at) >= monthStart,
    ).length,
    returning_this_month: list.filter(
      (c) =>
        c.last_visit_at &&
        new Date(c.last_visit_at) >= monthStart &&
        (c.total_visits ?? 0) > 1,
    ).length,
  };
}

export async function getTopSpenders(limit = 20): Promise<TopSpender[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("customers")
    .select("id, name, phone, total_spent, total_visits, is_vip, last_visit_at")
    .eq("is_active", true)
    .order("total_spent", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`Top spenders failed: ${error.message}`);
  return (data ?? []) as TopSpender[];
}

export async function getUpcomingBirthdaysForReports(
  days = 30,
): Promise<BirthdayCustomer[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("customers")
    .select("id, name, phone, birthday, marketing_opt_in")
    .eq("is_active", true)
    .not("birthday", "is", null);
  if (error) throw new Error(`Birthdays failed: ${error.message}`);

  return ((data ?? []) as BirthdayCustomer[])
    .filter((c) => daysUntilBirthday(c.birthday) <= days)
    .sort(
      (a, b) => daysUntilBirthday(a.birthday) - daysUntilBirthday(b.birthday),
    );
}

export interface InactiveCustomer {
  id: string;
  name: string;
  phone: string | null;
  last_visit_at: string | null;
  total_visits: number;
  total_spent: number;
}

export async function getInactiveCustomers(
  daysSince = 60,
  limit = 50,
): Promise<InactiveCustomer[]> {
  const supabase = await createServerSupabaseClient();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - daysSince);
  const { data, error } = await supabase
    .from("customers")
    .select("id, name, phone, last_visit_at, total_visits, total_spent")
    .eq("is_active", true)
    .gt("total_visits", 0)
    .lt("last_visit_at", cutoff.toISOString())
    .order("total_spent", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`Inactive customers failed: ${error.message}`);
  return (data ?? []) as InactiveCustomer[];
}
