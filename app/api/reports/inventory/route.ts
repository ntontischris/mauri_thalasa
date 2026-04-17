import { NextResponse } from "next/server";
import { getInventoryForCsv } from "@/lib/queries/analytics";

export async function GET() {
  const rows = await getInventoryForCsv();
  const header = ["Υλικό", "Μονάδα", "Απόθεμα", "Ελάχιστο"].join(";");
  const body = rows
    .map((r) =>
      [
        r.name,
        r.unit,
        (r.quantity ?? 0).toString().replace(".", ","),
        (r.min_stock ?? 0).toString().replace(".", ","),
      ].join(";"),
    )
    .join("\n");
  const csv = `\uFEFF${header}\n${body}`;
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv;charset=utf-8;",
      "Content-Disposition": `attachment; filename="inventory-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
