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
import type {
  DbTable,
  DbOrder,
  OrderItemWithModifiers,
  PaymentMethod,
} from "@/lib/types/database";

interface CheckoutFlowProps {
  table: DbTable;
  order: DbOrder;
  items: OrderItemWithModifiers[];
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat("el-GR", {
    style: "currency",
    currency: "EUR",
  }).format(price);
}

type CheckoutStep = "payment" | "receipt";

export function CheckoutFlow({ table, order, items }: CheckoutFlowProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [step, setStep] = useState<CheckoutStep>("payment");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(
    null,
  );
  const [cashGiven, setCashGiven] = useState("");

  // Calculate totals
  const subtotal = items.reduce((sum, item) => {
    const modTotal = item.order_item_modifiers.reduce((s, m) => s + m.price, 0);
    return sum + (item.price + modTotal) * item.quantity;
  }, 0);

  // Approximate VAT (24% standard rate for simplicity in display)
  const vatAmount = subtotal - subtotal / 1.24;
  const total = subtotal;
  const cashGivenNum = parseFloat(cashGiven) || 0;
  const change = cashGivenNum - total;

  const handleComplete = () => {
    if (!paymentMethod) return;

    startTransition(async () => {
      const result = await completeOrder({
        orderId: order.id,
        tableId: table.id,
        paymentMethod,
      });

      if (result.success) {
        setStep("receipt");
        toast.success("Πληρωμή ολοκληρώθηκε!");
      } else {
        toast.error(result.error);
      }
    });
  };

  if (step === "receipt") {
    return (
      <div className="mx-auto max-w-md space-y-4">
        <Card>
          <CardContent className="p-6 space-y-4 font-mono text-sm">
            <div className="text-center space-y-1">
              <p className="text-base font-bold">ΜΑΥΡΗ ΘΑΛΑΣΣΑ</p>
              <p className="text-xs text-muted-foreground">
                Νίκης 3, Καλαμαριά 55132
              </p>
              <p className="text-xs text-muted-foreground">ΑΦΜ: 800474837</p>
            </div>

            <Separator />

            <div className="flex justify-between text-xs">
              <span>Τραπέζι: {table.number}</span>
              <span>
                {new Date().toLocaleDateString("el-GR")}{" "}
                {new Date().toLocaleTimeString("el-GR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>

            <Separator />

            <div className="space-y-1">
              {items.map((item) => {
                const modTotal = item.order_item_modifiers.reduce(
                  (s, m) => s + m.price,
                  0,
                );
                const lineTotal = (item.price + modTotal) * item.quantity;
                return (
                  <div key={item.id} className="flex justify-between">
                    <span>
                      {item.quantity}× {item.product_name}
                    </span>
                    <span>{formatPrice(lineTotal)}</span>
                  </div>
                );
              })}
            </div>

            <Separator />

            <div className="space-y-1">
              <div className="flex justify-between">
                <span>Καθαρή αξία</span>
                <span>{formatPrice(total - vatAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span>ΦΠΑ</span>
                <span>{formatPrice(vatAmount)}</span>
              </div>
              <div className="flex justify-between font-bold text-base">
                <span>ΣΥΝΟΛΟ</span>
                <span>{formatPrice(total)}</span>
              </div>
            </div>

            <Separator />

            <div className="flex justify-between text-xs">
              <span>
                Πληρωμή: {paymentMethod === "cash" ? "Μετρητά" : "Κάρτα"}
              </span>
              {paymentMethod === "cash" && cashGivenNum > 0 && (
                <span>Ρέστα: {formatPrice(change)}</span>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => window.print()}
          >
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

      {/* Order summary */}
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
                      ( +
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
            <span>{formatPrice(total)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Payment method */}
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
                  onClick={() => setCashGiven(total.toFixed(2))}
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
                {formatPrice(total)}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Complete button */}
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
