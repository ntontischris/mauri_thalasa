import { NextRequest, NextResponse } from "next/server";
import { getSalesForRange } from "@/lib/queries/analytics";

export async function GET(request: NextRequest) {
  const from = request.nextUrl.searchParams.get("from") ?? "";
  const to = request.nextUrl.searchParams.get("to") ?? "";
  if (!from || !to) {
    return NextResponse.json({ error: "Missing from/to" }, { status: 400 });
  }
  const data = await getSalesForRange(from, to);
  return NextResponse.json(data);
}
