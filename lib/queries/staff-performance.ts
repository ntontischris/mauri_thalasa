import { createServerSupabaseClient } from "@/lib/supabase/server";

export interface StaffPerformanceRow {
  staff_id: string;
  name: string;
  role: "waiter" | "chef" | "barman" | "manager";
  orders_today: number;
  revenue_today: number;
  tips_today: number;
  orders_week: number;
  revenue_week: number;
  tips_week: number;
  orders_month: number;
  revenue_month: number;
  tips_month: number;
  avg_ticket_month: number;
  hours_week: number;
  hours_month: number;
  // Last 14 days, oldest → newest, as daily revenue
  sparkline: number[];
}

function startOfDay(d = new Date()): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function startOfWeek(): Date {
  const d = startOfDay();
  const day = d.getDay() === 0 ? 7 : d.getDay();
  d.setDate(d.getDate() - (day - 1));
  return d;
}

function startOfMonth(): Date {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function daysAgo(n: number): Date {
  const d = startOfDay();
  d.setDate(d.getDate() - n);
  return d;
}

export async function getStaffPerformance(): Promise<StaffPerformanceRow[]> {
  const supabase = await createServerSupabaseClient();

  const sparklineStart = daysAgo(13); // includes today, 14 bars total

  const [staffRes, ordersRes, shiftsRes] = await Promise.all([
    supabase
      .from("staff_members")
      .select("id, name, role")
      .eq("is_active", true),
    supabase
      .from("orders")
      .select("created_by, total, tip_amount, completed_at")
      .eq("status", "completed")
      .gte("completed_at", sparklineStart.toISOString())
      .not("created_by", "is", null),
    supabase
      .from("shifts")
      .select("staff_id, clock_in, clock_out, date")
      .gte("date", sparklineStart.toISOString().slice(0, 10))
      .not("clock_in", "is", null),
  ]);

  if (staffRes.error) throw new Error(staffRes.error.message);
  if (ordersRes.error) throw new Error(ordersRes.error.message);
  if (shiftsRes.error) throw new Error(shiftsRes.error.message);

  const today = startOfDay().getTime();
  const week = startOfWeek().getTime();
  const month = startOfMonth().getTime();
  const staff = staffRes.data ?? [];
  const orders = ordersRes.data ?? [];
  const shifts = shiftsRes.data ?? [];

  const rows: StaffPerformanceRow[] = staff.map((s) => ({
    staff_id: s.id,
    name: s.name,
    role: s.role,
    orders_today: 0,
    revenue_today: 0,
    tips_today: 0,
    orders_week: 0,
    revenue_week: 0,
    tips_week: 0,
    orders_month: 0,
    revenue_month: 0,
    tips_month: 0,
    avg_ticket_month: 0,
    hours_week: 0,
    hours_month: 0,
    sparkline: Array(14).fill(0),
  }));

  const byId = new Map(rows.map((r) => [r.staff_id, r]));

  for (const o of orders) {
    const row = byId.get(o.created_by as string);
    if (!row) continue;
    const ts = o.completed_at ? new Date(o.completed_at).getTime() : 0;
    const total = o.total ?? 0;
    const tip = o.tip_amount ?? 0;

    // Sparkline bucket (day offset from sparklineStart)
    const dayOffset = Math.floor(
      (ts - sparklineStart.getTime()) / (24 * 60 * 60 * 1000),
    );
    if (dayOffset >= 0 && dayOffset < 14) {
      row.sparkline[dayOffset] += total;
    }

    if (ts >= month) {
      row.orders_month += 1;
      row.revenue_month += total;
      row.tips_month += tip;
    }
    if (ts >= week) {
      row.orders_week += 1;
      row.revenue_week += total;
      row.tips_week += tip;
    }
    if (ts >= today) {
      row.orders_today += 1;
      row.revenue_today += total;
      row.tips_today += tip;
    }
  }

  // Aggregate hours from shifts (only closed shifts, i.e. with clock_out)
  for (const s of shifts) {
    const row = byId.get(s.staff_id as string);
    if (!row || !s.clock_in || !s.clock_out) continue;
    const inMs = new Date(s.clock_in).getTime();
    const outMs = new Date(s.clock_out).getTime();
    const hours = (outMs - inMs) / (60 * 60 * 1000);
    if (hours <= 0 || hours > 24) continue;
    const shiftDate = new Date(s.date).getTime();
    if (shiftDate >= month) row.hours_month += hours;
    if (shiftDate >= week) row.hours_week += hours;
  }

  for (const r of rows) {
    r.revenue_today = Math.round(r.revenue_today * 100) / 100;
    r.revenue_week = Math.round(r.revenue_week * 100) / 100;
    r.revenue_month = Math.round(r.revenue_month * 100) / 100;
    r.tips_today = Math.round(r.tips_today * 100) / 100;
    r.tips_week = Math.round(r.tips_week * 100) / 100;
    r.tips_month = Math.round(r.tips_month * 100) / 100;
    r.avg_ticket_month =
      r.orders_month > 0
        ? Math.round((r.revenue_month / r.orders_month) * 100) / 100
        : 0;
    r.hours_week = Math.round(r.hours_week * 10) / 10;
    r.hours_month = Math.round(r.hours_month * 10) / 10;
    r.sparkline = r.sparkline.map((v) => Math.round(v * 100) / 100);
  }

  rows.sort((a, b) => b.revenue_month - a.revenue_month);

  return rows;
}
