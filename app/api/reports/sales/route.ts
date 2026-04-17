import { NextResponse } from "next/server";
import { getOrdersForCsv } from "@/lib/queries/analytics";

function toCsv(
  rows: Array<{
    completed_at: string;
    table_number: number;
    total: number;
    tip_amount: number;
    payment_method: string | null;
  }>,
): string {
  const header = [
    "Ημερομηνία",
    "Ώρα",
    "Τραπέζι",
    "Σύνολο",
    "Φιλοδώρημα",
    "Τρόπος Πληρωμής",
  ].join(";");
  const body = rows
    .map((r) => {
      const d = new Date(r.completed_at);
      const date = d.toLocaleDateString("el-GR");
      const time = d.toLocaleTimeString("el-GR", {
        hour: "2-digit",
        minute: "2-digit",
      });
      const method =
        r.payment_method === "cash"
          ? "Μετρητά"
          : r.payment_method === "card"
            ? "Κάρτα"
            : "-";
      return [
        date,
        time,
        r.table_number,
        r.total.toFixed(2).replace(".", ","),
        (r.tip_amount ?? 0).toFixed(2).replace(".", ","),
        method,
      ].join(";");
    })
    .join("\n");
  return `${header}\n${body}`;
}

export async function GET() {
  const rows = await getOrdersForCsv(30);
  const csv = toCsv(rows);
  // Prepend BOM for Excel Greek character compatibility
  const payload = `\uFEFF${csv}`;
  return new NextResponse(payload, {
    status: 200,
    headers: {
      "Content-Type": "text/csv;charset=utf-8;",
      "Content-Disposition": `attachment; filename="sales-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
