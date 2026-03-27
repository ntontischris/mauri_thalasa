"use client";

import { formatPrice, formatDateTime } from "@/lib/mock-data";
import type { Order } from "@/lib/types";
import { usePOS } from "@/lib/pos-context";

interface ReceiptPreviewProps {
  order: Order;
  paymentMethod?: "cash" | "card";
}

export function ReceiptPreview({ order, paymentMethod }: ReceiptPreviewProps) {
  const { state } = usePOS();

  // Generate a fake myDATA receipt number
  const receiptNumber = `ΕΑΦ-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 999999)).padStart(6, "0")}`;

  // Group items by VAT rate
  const itemsByVat = order.items.reduce(
    (acc, item) => {
      const product = state.products.find((p) => p.id === item.productId);
      const vatRate = product?.vatRate || 24;
      if (!acc[vatRate]) acc[vatRate] = [];
      acc[vatRate].push({ ...item, vatRate });
      return acc;
    },
    {} as Record<number, ((typeof order.items)[0] & { vatRate: number })[]>,
  );

  // Calculate VAT amounts per rate
  const vatBreakdown = Object.entries(itemsByVat).map(([rate, items]) => {
    const subtotal = items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );
    const vatAmount = subtotal * (parseInt(rate) / (100 + parseInt(rate)));
    return {
      rate: parseInt(rate),
      subtotal,
      vatAmount,
      netAmount: subtotal - vatAmount,
    };
  });

  return (
    <div className="bg-white text-black p-6 rounded-lg font-mono text-sm max-w-sm mx-auto">
      {/* Header */}
      <div className="text-center border-b border-dashed border-gray-400 pb-4">
        <h2 className="text-xl font-bold">Μαύρη Θάλασσα</h2>
        <p className="text-xs text-gray-600 mt-1">
          Νικολάου Πλαστήρα 3, Καλαμαριά 55132
        </p>
        <p className="text-xs text-gray-600">ΑΦΜ: 099999999</p>
        <p className="text-xs text-gray-600">ΔΟΥ: Καλαμαριάς</p>
      </div>

      {/* Receipt Info */}
      <div className="py-3 border-b border-dashed border-gray-400 text-xs">
        <div className="flex justify-between">
          <span>Αρ. Απόδειξης:</span>
          <span className="font-bold">{receiptNumber}</span>
        </div>
        <div className="flex justify-between mt-1">
          <span>Ημερομηνία:</span>
          <span>{formatDateTime(order.completedAt || order.createdAt)}</span>
        </div>
        <div className="flex justify-between mt-1">
          <span>Τραπέζι:</span>
          <span>{order.tableNumber}</span>
        </div>
        <div className="flex justify-between mt-1">
          <span>Πληρωμή:</span>
          <span>{paymentMethod === "card" ? "Κάρτα" : "Μετρητά"}</span>
        </div>
      </div>

      {/* Items */}
      <div className="py-3 border-b border-dashed border-gray-400">
        <div className="flex justify-between text-xs font-bold mb-2">
          <span>Περιγραφή</span>
          <span>Σύνολο</span>
        </div>
        {order.items.map((item) => (
          <div key={item.id} className="flex justify-between text-xs py-1">
            <div className="flex-1">
              <span>{item.quantity}x </span>
              <span>{item.productName}</span>
              <span className="text-gray-500 ml-1">
                @{formatPrice(item.price)}
              </span>
            </div>
            <span className="ml-2">
              {formatPrice(item.price * item.quantity)}
            </span>
          </div>
        ))}
      </div>

      {/* VAT Breakdown */}
      <div className="py-3 border-b border-dashed border-gray-400 text-xs">
        <p className="font-bold mb-2">Ανάλυση ΦΠΑ:</p>
        {vatBreakdown.map(({ rate, netAmount, vatAmount }) => (
          <div key={rate} className="flex justify-between py-0.5">
            <span>ΦΠΑ {rate}%:</span>
            <span>{formatPrice(vatAmount)}</span>
          </div>
        ))}
      </div>

      {/* Totals */}
      <div className="py-3 text-sm">
        <div className="flex justify-between">
          <span>Καθαρή Αξία:</span>
          <span>{formatPrice(order.total - order.vatAmount)}</span>
        </div>
        <div className="flex justify-between mt-1">
          <span>ΦΠΑ:</span>
          <span>{formatPrice(order.vatAmount)}</span>
        </div>
        <div className="flex justify-between mt-2 text-lg font-bold border-t border-gray-400 pt-2">
          <span>ΣΥΝΟΛΟ:</span>
          <span>{formatPrice(order.total)}</span>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-xs text-gray-500 pt-3 border-t border-dashed border-gray-400">
        <p>Ευχαριστούμε για την προτίμησή σας!</p>
        <p className="mt-2">myDATA Mark: ✓</p>
        <div className="mt-3 flex justify-center">
          <div className="w-24 h-24 bg-gray-200 flex items-center justify-center text-gray-400">
            QR Code
          </div>
        </div>
        <p className="mt-2 text-[10px]">Σαρώστε για επαλήθευση στο aade.gr</p>
      </div>
    </div>
  );
}
