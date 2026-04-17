import { NextRequest, NextResponse } from "next/server";
import { getVatBreakdown } from "@/lib/queries/analytics";

function periodRange(period: string): { from: string; to: string } {
  const now = new Date();
  const to = now.toISOString();
  const start = new Date(now);
  if (period === "today") {
    start.setHours(0, 0, 0, 0);
  } else if (period === "week") {
    start.setDate(start.getDate() - 6);
    start.setHours(0, 0, 0, 0);
  } else {
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
  }
  return { from: start.toISOString(), to };
}

export async function GET(request: NextRequest) {
  const period = request.nextUrl.searchParams.get("period") ?? "month";
  const { from, to } = periodRange(period);
  const data = await getVatBreakdown(from, to);
  return NextResponse.json(data);
}
