"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Banknote, CreditCard, Check, Printer } from "lucide-react";
import { toast } from "sonner";
import { completeOrder } from "@/lib/actions/orders";
import { calculateOrderSubtotal } from "@/lib/pricing/order-totals";
import { ReceiptPreview } from "./receipt-preview";
import type {
  DbTable,
  DbOrder,
  DbProduct,
  OrderItemWithModifiers,
  PaymentMethod,
} from "@/lib/types/database";

interface CheckoutFlowProps {
  table: DbTable;
  order: DbOrder;
  items: OrderItemWithModifiers[];
  products: DbProduct[];
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat("el-GR", {
    style: "currency",
    currency: "EUR",
  }).format(price);
}

type CheckoutStep = "payment" | "receipt";

export function CheckoutFlow({
  table,
  order,
  items,
  products,
}: CheckoutFlowProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [step, setStep] = useState<CheckoutStep>("payment");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(
    null,
  );
  const [cashGiven, setCashGiven] = useState("");
  const [tip, setTip] = useState("");

  const productVatRates = new Map<string, number>();
  for (const p of products) productVatRates.set(p.id, p.vat_rate);

  const subtotal = calculateOrderSubtotal(
    items.map((i) => ({
      price: i.price,
      quantity: i.quantity,
      modifiers: i.order_item_modifiers.map((m) => ({ price: m.price })),
    })),
  );
  const tipNum = parseFloat(tip) || 0;
  const grandTotal = subtotal + tipNum;
  const cashGivenNum = parseFloat(cashGiven) || 0;
  const change = cashGivenNum - grandTotal;

  const handleComplete = () => {
    if (!paymentMethod) return;
    startTransition(async () => {
      const result = await completeOrder({
        orderId: order.id,
        tableId: table.id,
        paymentMethod,
        tipAmount: tipNum,
      });
      if (result.success) {
        setStep("receipt");
        toast.success("Πληρωμή ολοκληρώθηκε!");
      } else {
        toast.error(result.error);
      }
    });
  };

  const handlePrint = async () => {
    try {
      const response = await fetch("/api/print/receipt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: order.id,
          paymentMethod,
          cashGiven: paymentMethod === "cash" ? cashGivenNum : undefined,
        }),
      });
      if (!response.ok) {
        toast.error("Αποτυχία εκτύπωσης");
        return;
      }
      const contentType = response.headers.get("content-type") ?? "";
      if (contentType.includes("application/pdf")) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        window.open(url, "_blank");
      } else {
        toast.success("Εστάλη στον εκτυπωτή");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Σφάλμα δικτύου";
      toast.error(`Αποτυχία εκτύπωσης: ${msg}`);
    }
  };

  if (step === "receipt") {
    return (
      <div className="mx-auto max-w-md space-y-4">
        <ReceiptPreview
          order={order}
          items={items}
          productVatRates={productVatRates}
          paymentMethod={paymentMethod}
          cashGiven={paymentMethod === "cash" ? cashGivenNum : undefined}
        />

        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={handlePrint}>
            <Printer className="mr-2 size-4" />
            Εκτύπωση
          </Button>
          <Button className="flex-1" onClick={() => router.push("/tables")}>
            <Check className="mr-2 size-4" />
            Κλείσιμο
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push(`/orders/${table.id}`)}
        >
          <ArrowLeft className="size-4" />
        </Button>
        <h1 className="text-xl font-bold">
          Λογαριασμός — Τραπέζι {table.number}
        </h1>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Σύνοψη παραγγελίας</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {items.map((item) => {
            const modTotal = item.order_item_modifiers.reduce(
              (s, m) => s + m.price,
              0,
            );
            const lineTotal = (item.price + modTotal) * item.quantity;
            return (
              <div key={item.id} className="flex justify-between text-sm">
                <span>
                  {item.quantity}× {item.product_name}
                  {item.order_item_modifiers.length > 0 && (
                    <span className="text-xs text-muted-foreground ml-1">
                      ( +{" "}
                      {item.order_item_modifiers.map((m) => m.name).join(", ")})
                    </span>
                  )}
                </span>
                <span className="font-medium">{formatPrice(lineTotal)}</span>
              </div>
            );
          })}
          <Separator className="my-2" />
          <div className="flex justify-between font-bold text-lg">
            <span>Σύνολο</span>
            <span>{formatPrice(subtotal)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Tip */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Φιλοδώρημα</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            {[5, 10, 15].map((pct) => (
              <Button
                key={pct}
                variant="outline"
                size="sm"
                onClick={() => setTip((subtotal * (pct / 100)).toFixed(2))}
              >
                {pct}%
              </Button>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setTip("")}
              className="ml-auto"
            >
              Καθαρισμός
            </Button>
          </div>
          <Input
            type="number"
            step="0.01"
            min="0"
            value={tip}
            onChange={(e) => setTip(e.target.value)}
            placeholder="0.00"
            className="font-mono"
          />
          {tipNum > 0 && (
            <div className="flex justify-between text-sm pt-2 border-t">
              <span className="text-muted-foreground">
                Σύνολο με φιλοδώρημα
              </span>
              <span className="font-bold">{formatPrice(grandTotal)}</span>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Τρόπος πληρωμής</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant={paymentMethod === "cash" ? "default" : "outline"}
              className="h-16 text-lg"
              onClick={() => setPaymentMethod("cash")}
            >
              <Banknote className="mr-2 size-5" />
              Μετρητά
            </Button>
            <Button
              variant={paymentMethod === "card" ? "default" : "outline"}
              className="h-16 text-lg"
              onClick={() => setPaymentMethod("card")}
            >
              <CreditCard className="mr-2 size-5" />
              Κάρτα
            </Button>
          </div>

          {paymentMethod === "cash" && (
            <div className="space-y-3">
              <div>
                <label className="text-sm text-muted-foreground">
                  Ποσό που δόθηκε
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={cashGiven}
                  onChange={(e) => setCashGiven(e.target.value)}
                  placeholder="0.00"
                  className="text-lg font-mono"
                  autoFocus
                />
              </div>

              <div className="flex gap-2">
                {[20, 50, 100].map((amount) => (
                  <Button
                    key={amount}
                    variant="outline"
                    size="sm"
                    onClick={() => setCashGiven(amount.toString())}
                  >
                    €{amount}
                  </Button>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCashGiven(grandTotal.toFixed(2))}
                >
                  Ακριβές
                </Button>
              </div>

              {cashGivenNum > 0 && (
                <div
                  className={`rounded-lg p-3 text-center text-lg font-bold ${
                    change >= 0
                      ? "bg-emerald-500/10 text-emerald-600"
                      : "bg-red-500/10 text-red-600"
                  }`}
                >
                  {change >= 0
                    ? `Ρέστα: ${formatPrice(change)}`
                    : `Υπολείπεται: ${formatPrice(Math.abs(change))}`}
                </div>
              )}
            </div>
          )}

          {paymentMethod === "card" && (
            <div className="rounded-lg border-2 border-dashed p-6 text-center text-muted-foreground">
              <CreditCard className="mx-auto mb-2 size-8 opacity-50" />
              <p>Χρησιμοποιήστε το POS terminal</p>
              <p className="text-lg font-bold text-foreground mt-1">
                {formatPrice(grandTotal)}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Button
        className="w-full h-14 text-lg"
        size="lg"
        onClick={handleComplete}
        disabled={
          !paymentMethod ||
          isPending ||
          (paymentMethod === "cash" && change < 0)
        }
      >
        {isPending ? "Ολοκλήρωση..." : "Ολοκλήρωση Πληρωμής"}
      </Button>
    </div>
  );
}
