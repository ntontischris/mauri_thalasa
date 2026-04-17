import { createServerSupabaseClient } from "@/lib/supabase/server";

export interface StaffPerformanceRow {
  staff_id: string;
  name: string;
  role: "waiter" | "chef" | "barman" | "manager";
  orders_today: number;
  revenue_today: number;
  orders_week: number;
  revenue_week: number;
  orders_month: number;
  revenue_month: number;
  avg_ticket_month: number;
}

function startOfDay(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfWeek(): Date {
  const d = startOfDay();
  const day = d.getDay() === 0 ? 7 : d.getDay(); // Monday=1
  d.setDate(d.getDate() - (day - 1));
  return d;
}

function startOfMonth(): Date {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export async function getStaffPerformance(): Promise<StaffPerformanceRow[]> {
  const supabase = await createServerSupabaseClient();

  const [staffRes, ordersRes] = await Promise.all([
    supabase
      .from("staff_members")
      .select("id, name, role")
      .eq("is_active", true),
    supabase
      .from("orders")
      .select("created_by, total, completed_at")
      .eq("status", "completed")
      .gte("completed_at", startOfMonth().toISOString())
      .not("created_by", "is", null),
  ]);

  if (staffRes.error) {
    throw new Error(staffRes.error.message);
  }
  if (ordersRes.error) {
    throw new Error(ordersRes.error.message);
  }

  const today = startOfDay().getTime();
  const week = startOfWeek().getTime();
  const staff = staffRes.data ?? [];
  const orders = ordersRes.data ?? [];

  const rows: StaffPerformanceRow[] = staff.map((s) => ({
    staff_id: s.id,
    name: s.name,
    role: s.role,
    orders_today: 0,
    revenue_today: 0,
    orders_week: 0,
    revenue_week: 0,
    orders_month: 0,
    revenue_month: 0,
    avg_ticket_month: 0,
  }));

  const byId = new Map(rows.map((r) => [r.staff_id, r]));

  for (const o of orders) {
    const row = byId.get(o.created_by as string);
    if (!row) continue;
    const ts = o.completed_at ? new Date(o.completed_at).getTime() : 0;
    const total = o.total ?? 0;

    row.orders_month += 1;
    row.revenue_month += total;
    if (ts >= week) {
      row.orders_week += 1;
      row.revenue_week += total;
    }
    if (ts >= today) {
      row.orders_today += 1;
      row.revenue_today += total;
    }
  }

  for (const r of rows) {
    r.revenue_today = Math.round(r.revenue_today * 100) / 100;
    r.revenue_week = Math.round(r.revenue_week * 100) / 100;
    r.revenue_month = Math.round(r.revenue_month * 100) / 100;
    r.avg_ticket_month =
      r.orders_month > 0
        ? Math.round((r.revenue_month / r.orders_month) * 100) / 100
        : 0;
  }

  // Sort by monthly revenue descending
  rows.sort((a, b) => b.revenue_month - a.revenue_month);

  return rows;
}
