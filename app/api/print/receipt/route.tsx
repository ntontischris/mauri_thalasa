import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getOrderById, getOrderItems } from "@/lib/queries/orders";
import { printReceipt, getPrinterConfig } from "@/lib/printing/escpos-client";
import { PdfReceipt } from "@/lib/printing/pdf-receipt";

const requestSchema = z.object({
  orderId: z.string().uuid(),
  paymentMethod: z.enum(["cash", "card"]).nullable().optional(),
  cashGiven: z.number().nonnegative().optional(),
});

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0].message },
      { status: 400 },
    );
  }
  const { orderId, paymentMethod, cashGiven } = parsed.data;

  const order = await getOrderById(orderId);
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const items = await getOrderItems(orderId);

  // Load VAT rates per product in this order
  const productIds = Array.from(new Set(items.map((i) => i.product_id)));
  const supabase = await createServerSupabaseClient();
  const { data: products } = await supabase
    .from("products")
    .select("id, vat_rate")
    .in("id", productIds);
  const productVatRates = new Map<string, number>();
  for (const p of products ?? []) {
    productVatRates.set(p.id, p.vat_rate);
  }

  // Try thermal printer first
  if (getPrinterConfig()) {
    const ok = await printReceipt({
      order,
      items,
      productVatRates,
      paymentMethod: paymentMethod ?? order.payment_method ?? null,
      cashGiven,
    });
    if (ok) {
      return NextResponse.json({ ok: true, method: "thermal" });
    }
    // fall through to PDF
  }

  // PDF fallback
  const pdfBuffer = await renderToBuffer(
    <PdfReceipt
      order={order}
      items={items}
      productVatRates={productVatRates}
      paymentMethod={paymentMethod ?? order.payment_method ?? null}
      cashGiven={cashGiven}
    />,
  );

  return new NextResponse(pdfBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="receipt-${orderId.slice(-6)}.pdf"`,
    },
  });
}
