import { createServerSupabaseClient } from "@/lib/supabase/server";

export interface AnalyticsSummary {
  revenue_today: number;
  revenue_yesterday: number;
  revenue_week: number;
  revenue_month: number;
  orders_today: number;
  orders_yesterday: number;
  orders_week: number;
  orders_month: number;
  avg_ticket_today: number;
  avg_ticket_week: number;
  avg_ticket_month: number;
  tips_month: number;
  // Breakdown for today
  cash_revenue_today: number;
  card_revenue_today: number;
  cash_count_today: number;
  card_count_today: number;
}

export interface DailyRevenuePoint {
  date: string; // yyyy-mm-dd
  revenue: number;
  orders: number;
}

export interface TopProduct {
  name: string;
  quantity: number;
  revenue: number;
}

export interface StationStat {
  station: "hot" | "cold" | "bar" | "dessert";
  items: number;
  avg_prep_seconds: number;
}

export interface HourlyBucket {
  hour: number; // 0-23
  revenue: number;
  orders: number;
}

export interface VatBreakdownRow {
  rate: number;
  net: number;
  vat: number;
  gross: number;
}

export interface DailyBreakdownRow {
  date: string;
  orders: number;
  revenue: number;
  avg_ticket: number;
}

export interface PeriodCompareResult {
  current: number;
  previous: number;
  change_pct: number;
  daily_breakdown: DailyBreakdownRow[];
}

export interface HeatmapCell {
  day: number; // 0=Sun..6=Sat
  hour: number; // 0-23
  revenue: number;
}

export interface ReservationsStats {
  total_month: number;
  confirmed_month: number;
  cancelled_month: number;
  guests_month: number;
}

function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function daysAgo(n: number) {
  const d = startOfDay();
  d.setDate(d.getDate() - n);
  return d;
}
function startOfMonth() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

export async function getAnalyticsSummary(): Promise<AnalyticsSummary> {
  const supabase = await createServerSupabaseClient();
  const todayStart = startOfDay();
  const yesterdayStart = daysAgo(1);
  const weekStart = daysAgo(6);
  const monthStart = startOfMonth();
  const fetchFrom =
    yesterdayStart.getTime() < monthStart.getTime()
      ? yesterdayStart
      : monthStart;

  const { data, error } = await supabase
    .from("orders")
    .select("total, tip_amount, payment_method, completed_at")
    .eq("status", "completed")
    .gte("completed_at", fetchFrom.toISOString());

  if (error) throw new Error(error.message);

  const result: AnalyticsSummary = {
    revenue_today: 0,
    revenue_yesterday: 0,
    revenue_week: 0,
    revenue_month: 0,
    orders_today: 0,
    orders_yesterday: 0,
    orders_week: 0,
    orders_month: 0,
    avg_ticket_today: 0,
    avg_ticket_week: 0,
    avg_ticket_month: 0,
    tips_month: 0,
    cash_revenue_today: 0,
    card_revenue_today: 0,
    cash_count_today: 0,
    card_count_today: 0,
  };

  for (const o of data ?? []) {
    const ts = o.completed_at ? new Date(o.completed_at).getTime() : 0;
    const total = o.total ?? 0;
    const tip = o.tip_amount ?? 0;

    if (ts >= monthStart.getTime()) {
      result.revenue_month += total;
      result.orders_month += 1;
      result.tips_month += tip;
    }
    if (ts >= weekStart.getTime()) {
      result.revenue_week += total;
      result.orders_week += 1;
    }
    // Yesterday bucket: [yesterdayStart, todayStart)
    if (ts >= yesterdayStart.getTime() && ts < todayStart.getTime()) {
      result.revenue_yesterday += total;
      result.orders_yesterday += 1;
    }
    if (ts >= todayStart.getTime()) {
      result.revenue_today += total;
      result.orders_today += 1;
      if (o.payment_method === "cash") {
        result.cash_revenue_today += total;
        result.cash_count_today += 1;
      } else if (o.payment_method === "card") {
        result.card_revenue_today += total;
        result.card_count_today += 1;
      }
    }
  }

  result.revenue_today = Math.round(result.revenue_today * 100) / 100;
  result.revenue_yesterday = Math.round(result.revenue_yesterday * 100) / 100;
  result.revenue_week = Math.round(result.revenue_week * 100) / 100;
  result.revenue_month = Math.round(result.revenue_month * 100) / 100;
  result.tips_month = Math.round(result.tips_month * 100) / 100;
  result.cash_revenue_today = Math.round(result.cash_revenue_today * 100) / 100;
  result.card_revenue_today = Math.round(result.card_revenue_today * 100) / 100;
  result.avg_ticket_today =
    result.orders_today > 0
      ? Math.round((result.revenue_today / result.orders_today) * 100) / 100
      : 0;
  result.avg_ticket_week =
    result.orders_week > 0
      ? Math.round((result.revenue_week / result.orders_week) * 100) / 100
      : 0;
  result.avg_ticket_month =
    result.orders_month > 0
      ? Math.round((result.revenue_month / result.orders_month) * 100) / 100
      : 0;

  return result;
}

export async function getDailyRevenue(days = 30): Promise<DailyRevenuePoint[]> {
  const supabase = await createServerSupabaseClient();
  const start = daysAgo(days - 1);

  const { data, error } = await supabase
    .from("orders")
    .select("total, completed_at")
    .eq("status", "completed")
    .gte("completed_at", start.toISOString());

  if (error) throw new Error(error.message);

  const byDay = new Map<string, { revenue: number; orders: number }>();
  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    byDay.set(isoDate(d), { revenue: 0, orders: 0 });
  }

  for (const o of data ?? []) {
    if (!o.completed_at) continue;
    const key = isoDate(new Date(o.completed_at));
    const bucket = byDay.get(key);
    if (bucket) {
      bucket.revenue += o.total ?? 0;
      bucket.orders += 1;
    }
  }

  return Array.from(byDay.entries()).map(([date, v]) => ({
    date,
    revenue: Math.round(v.revenue * 100) / 100,
    orders: v.orders,
  }));
}

export async function getHourlyToday(): Promise<HourlyBucket[]> {
  const supabase = await createServerSupabaseClient();
  const todayStart = startOfDay();

  const { data, error } = await supabase
    .from("orders")
    .select("total, completed_at")
    .eq("status", "completed")
    .gte("completed_at", todayStart.toISOString());

  if (error) throw new Error(error.message);

  const buckets: HourlyBucket[] = Array.from({ length: 24 }, (_, h) => ({
    hour: h,
    revenue: 0,
    orders: 0,
  }));

  for (const o of data ?? []) {
    if (!o.completed_at) continue;
    const hour = new Date(o.completed_at).getHours();
    buckets[hour].revenue += o.total ?? 0;
    buckets[hour].orders += 1;
  }

  return buckets.map((b) => ({
    ...b,
    revenue: Math.round(b.revenue * 100) / 100,
  }));
}

export async function getSalesForRange(
  fromIso: string,
  toIso: string,
): Promise<PeriodCompareResult> {
  const supabase = await createServerSupabaseClient();
  const fromMs = new Date(fromIso).getTime();
  const toMs = new Date(toIso).getTime();
  const span = Math.max(1, toMs - fromMs);
  const prevFrom = new Date(fromMs - span).toISOString();

  const { data, error } = await supabase
    .from("orders")
    .select("total, completed_at")
    .eq("status", "completed")
    .gte("completed_at", prevFrom)
    .lte("completed_at", toIso);

  if (error) throw new Error(error.message);

  let current = 0;
  let previous = 0;
  const byDay = new Map<string, { orders: number; revenue: number }>();

  for (const o of data ?? []) {
    if (!o.completed_at) continue;
    const ts = new Date(o.completed_at).getTime();
    const total = o.total ?? 0;
    if (ts >= fromMs && ts <= toMs) {
      current += total;
      const key = isoDate(new Date(o.completed_at));
      const bucket = byDay.get(key) ?? { orders: 0, revenue: 0 };
      bucket.orders += 1;
      bucket.revenue += total;
      byDay.set(key, bucket);
    } else {
      previous += total;
    }
  }

  const daily: DailyBreakdownRow[] = Array.from(byDay.entries())
    .map(([date, v]) => ({
      date,
      orders: v.orders,
      revenue: Math.round(v.revenue * 100) / 100,
      avg_ticket:
        v.orders > 0 ? Math.round((v.revenue / v.orders) * 100) / 100 : 0,
    }))
    .sort((a, b) => (a.date < b.date ? 1 : -1));

  const changePct =
    previous > 0
      ? Math.round(((current - previous) / previous) * 1000) / 10
      : current > 0
        ? 100
        : 0;

  return {
    current: Math.round(current * 100) / 100,
    previous: Math.round(previous * 100) / 100,
    change_pct: changePct,
    daily_breakdown: daily,
  };
}

export async function getHeatmap(days = 30): Promise<HeatmapCell[]> {
  const supabase = await createServerSupabaseClient();
  const start = daysAgo(days - 1);
  const { data, error } = await supabase
    .from("orders")
    .select("total, completed_at")
    .eq("status", "completed")
    .gte("completed_at", start.toISOString());
  if (error) throw new Error(error.message);

  const grid: HeatmapCell[] = [];
  const map = new Map<string, number>();
  for (const o of data ?? []) {
    if (!o.completed_at) continue;
    const d = new Date(o.completed_at);
    const key = `${d.getDay()}-${d.getHours()}`;
    map.set(key, (map.get(key) ?? 0) + (o.total ?? 0));
  }
  for (let day = 0; day < 7; day++) {
    for (let hour = 11; hour <= 23; hour++) {
      grid.push({
        day,
        hour,
        revenue: Math.round((map.get(`${day}-${hour}`) ?? 0) * 100) / 100,
      });
    }
  }
  return grid;
}

export async function getBottomProducts(limit = 5): Promise<TopProduct[]> {
  const all = await getTopProducts(1000);
  return all
    .filter((p) => p.quantity > 0)
    .sort((a, b) => a.revenue - b.revenue)
    .slice(0, limit);
}

export async function getTopProducts(limit = 20): Promise<TopProduct[]> {
  const supabase = await createServerSupabaseClient();
  const monthStart = startOfMonth();

  const { data, error } = await supabase
    .from("order_items")
    .select("product_name, quantity, price, orders!inner(status, completed_at)")
    .eq("orders.status", "completed")
    .gte("orders.completed_at", monthStart.toISOString());

  if (error) throw new Error(error.message);

  const agg = new Map<string, TopProduct>();
  for (const row of data ?? []) {
    const name = row.product_name as string;
    const qty = (row.quantity as number) ?? 0;
    const price = (row.price as number) ?? 0;
    const existing = agg.get(name) ?? { name, quantity: 0, revenue: 0 };
    existing.quantity += qty;
    existing.revenue += qty * price;
    agg.set(name, existing);
  }

  return Array.from(agg.values())
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, limit)
    .map((p) => ({ ...p, revenue: Math.round(p.revenue * 100) / 100 }));
}

export async function getStationStats(): Promise<StationStat[]> {
  const supabase = await createServerSupabaseClient();
  const monthStart = startOfMonth();

  const { data, error } = await supabase
    .from("order_items")
    .select("station, created_at, updated_at, status")
    .in("status", ["served", "ready"])
    .gte("created_at", monthStart.toISOString());

  if (error) throw new Error(error.message);

  const byStation = new Map<
    StationStat["station"],
    { items: number; totalSec: number; count: number }
  >();
  const stations: StationStat["station"][] = ["hot", "cold", "bar", "dessert"];
  for (const s of stations)
    byStation.set(s, { items: 0, totalSec: 0, count: 0 });

  for (const row of data ?? []) {
    const bucket = byStation.get(row.station as StationStat["station"]);
    if (!bucket) continue;
    bucket.items += 1;
    if (row.created_at && row.updated_at) {
      const sec =
        (new Date(row.updated_at).getTime() -
          new Date(row.created_at).getTime()) /
        1000;
      if (sec > 0 && sec < 60 * 60 * 4) {
        bucket.totalSec += sec;
        bucket.count += 1;
      }
    }
  }

  return stations.map((s) => {
    const b = byStation.get(s)!;
    return {
      station: s,
      items: b.items,
      avg_prep_seconds: b.count > 0 ? Math.round(b.totalSec / b.count) : 0,
    };
  });
}

export async function getVatBreakdown(
  fromIso: string,
  toIso: string,
): Promise<VatBreakdownRow[]> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("order_items")
    .select(
      "price, quantity, products!inner(vat_rate), orders!inner(status, completed_at)",
    )
    .eq("orders.status", "completed")
    .gte("orders.completed_at", fromIso)
    .lte("orders.completed_at", toIso);

  if (error) throw new Error(error.message);

  const byRate = new Map<number, number>();
  for (const row of data ?? []) {
    const price = (row.price as number) ?? 0;
    const qty = (row.quantity as number) ?? 0;
    const rate =
      ((row.products as unknown as { vat_rate: number })?.vat_rate as number) ??
      24;
    byRate.set(rate, (byRate.get(rate) ?? 0) + price * qty);
  }

  return Array.from(byRate.entries())
    .map(([rate, gross]) => {
      const net = gross / (1 + rate / 100);
      const vat = gross - net;
      return {
        rate,
        net: Math.round(net * 100) / 100,
        vat: Math.round(vat * 100) / 100,
        gross: Math.round(gross * 100) / 100,
      };
    })
    .sort((a, b) => b.rate - a.rate);
}

export async function getReservationsStats(): Promise<ReservationsStats> {
  const supabase = await createServerSupabaseClient();
  const monthStart = startOfMonth();

  const { data, error } = await supabase
    .from("reservations")
    .select("status, party_size, date")
    .gte("date", isoDate(monthStart));

  if (error) {
    // Table may not exist in every schema — treat as zero
    return {
      total_month: 0,
      confirmed_month: 0,
      cancelled_month: 0,
      guests_month: 0,
    };
  }

  const result: ReservationsStats = {
    total_month: 0,
    confirmed_month: 0,
    cancelled_month: 0,
    guests_month: 0,
  };
  for (const r of data ?? []) {
    result.total_month += 1;
    result.guests_month += (r.party_size as number) ?? 0;
    if (r.status === "confirmed") result.confirmed_month += 1;
    if (r.status === "cancelled") result.cancelled_month += 1;
  }
  return result;
}

export async function getOrdersForCsv(days = 30): Promise<
  Array<{
    completed_at: string;
    table_number: number;
    total: number;
    tip_amount: number;
    payment_method: string | null;
  }>
> {
  const supabase = await createServerSupabaseClient();
  const start = daysAgo(days - 1);
  const { data, error } = await supabase
    .from("orders")
    .select("completed_at, table_number, total, tip_amount, payment_method")
    .eq("status", "completed")
    .gte("completed_at", start.toISOString())
    .order("completed_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as Array<{
    completed_at: string;
    table_number: number;
    total: number;
    tip_amount: number;
    payment_method: string | null;
  }>;
}

export async function getInventoryForCsv(): Promise<
  Array<{ name: string; unit: string; quantity: number; min_stock: number }>
> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("ingredients")
    .select("name, unit, quantity, min_stock")
    .order("name");
  if (error) {
    return [];
  }
  return (data ?? []) as Array<{
    name: string;
    unit: string;
    quantity: number;
    min_stock: number;
  }>;
}
