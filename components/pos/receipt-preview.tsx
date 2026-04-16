"use client";

import { Separator } from "@/components/ui/separator";
import {
  calculateVatBreakdown,
  calculateOrderSubtotal,
} from "@/lib/pricing/order-totals";
import { generateReceiptNumber } from "@/lib/pricing/receipt-number";
import type {
  DbOrder,
  OrderItemWithModifiers,
  PaymentMethod,
} from "@/lib/types/database";

interface ReceiptPreviewProps {
  order: DbOrder;
  items: OrderItemWithModifiers[];
  productVatRates: Map<string, number>;
  paymentMethod?: PaymentMethod | null;
  cashGiven?: number;
  issuedAt?: Date;
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat("el-GR", {
    style: "currency",
    currency: "EUR",
  }).format(price);
}

export function ReceiptPreview({
  order,
  items,
  productVatRates,
  paymentMethod,
  cashGiven,
  issuedAt,
}: ReceiptPreviewProps) {
  const now = issuedAt ?? new Date();
  const receiptNumber = generateReceiptNumber(now, order.id);

  const vatableItems = items.map((item) => ({
    price: item.price,
    quantity: item.quantity,
    modifiers: item.order_item_modifiers.map((m) => ({ price: m.price })),
    vatRate: productVatRates.get(item.product_id) ?? 24,
  }));

  const subtotal = calculateOrderSubtotal(vatableItems);
  const vatBreakdown = calculateVatBreakdown(vatableItems);
  const change = cashGiven != null ? cashGiven - subtotal : null;

  return (
    <div className="bg-white text-black p-6 rounded-lg font-mono text-sm max-w-sm mx-auto print:shadow-none print:p-4">
      <div className="text-center space-y-0.5 border-b border-dashed border-gray-400 pb-3">
        <h2 className="text-lg font-bold">ΜΑΥΡΗ ΘΑΛΑΣΣΑ</h2>
        <p className="text-xs">Νίκης 3, Καλαμαριά 55132</p>
        <p className="text-xs">ΑΦΜ: 800474837 · ΔΟΥ Καλαμαριάς</p>
      </div>

      <div className="flex justify-between text-xs mt-3">
        <span>{receiptNumber}</span>
        <span>
          {now.toLocaleDateString("el-GR")}{" "}
          {now.toLocaleTimeString("el-GR", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      </div>

      <div className="flex justify-between text-xs mt-1">
        <span>Τραπέζι: {order.table_number}</span>
        <span>Παραγγελία: #{order.id.slice(-6)}</span>
      </div>

      <Separator className="my-3 bg-gray-400" />

      <div className="space-y-1">
        {items.map((item) => {
          const modTotal = item.order_item_modifiers.reduce(
            (s, m) => s + m.price,
            0,
          );
          const lineTotal = (item.price + modTotal) * item.quantity;
          return (
            <div key={item.id}>
              <div className="flex justify-between">
                <span>
                  {item.quantity}× {item.product_name}
                </span>
                <span>{formatPrice(lineTotal)}</span>
              </div>
              {item.order_item_modifiers.length > 0 && (
                <p className="text-xs text-gray-600 ml-4">
                  + {item.order_item_modifiers.map((m) => m.name).join(", ")}
                </p>
              )}
            </div>
          );
        })}
      </div>

      <Separator className="my-3 bg-gray-400" />

      <div className="space-y-1 text-xs">
        {vatBreakdown.map((row) => (
          <div key={row.rate} className="flex justify-between">
            <span>Καθαρή αξία {row.rate}%:</span>
            <span>{formatPrice(row.net)}</span>
          </div>
        ))}
        {vatBreakdown.map((row) => (
          <div key={`vat-${row.rate}`} className="flex justify-between">
            <span>ΦΠΑ {row.rate}%:</span>
            <span>{formatPrice(row.vat)}</span>
          </div>
        ))}
      </div>

      <Separator className="my-2 bg-gray-400" />

      <div className="flex justify-between font-bold text-base">
        <span>ΣΥΝΟΛΟ</span>
        <span>{formatPrice(subtotal)}</span>
      </div>

      {paymentMethod && (
        <div className="mt-2 text-xs space-y-0.5">
          <div className="flex justify-between">
            <span>Πληρωμή:</span>
            <span>{paymentMethod === "cash" ? "Μετρητά" : "Κάρτα"}</span>
          </div>
          {paymentMethod === "cash" &&
            cashGiven != null &&
            change != null &&
            change >= 0 && (
              <>
                <div className="flex justify-between">
                  <span>Δόθηκαν:</span>
                  <span>{formatPrice(cashGiven)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Ρέστα:</span>
                  <span>{formatPrice(change)}</span>
                </div>
              </>
            )}
        </div>
      )}

      <div className="text-center text-xs mt-4 border-t border-dashed border-gray-400 pt-3">
        <p>Ευχαριστούμε για την προτίμησή σας</p>
        <p className="mt-1">www.mauri-thalasa.gr</p>
      </div>
    </div>
  );
}
