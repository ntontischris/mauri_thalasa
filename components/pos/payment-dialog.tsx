"use client";

import { useState, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Banknote, CreditCard, Printer, Check } from "lucide-react";
import { toast } from "sonner";
import { completeOrder } from "@/lib/actions/orders";
import { calculateOrderSubtotal } from "@/lib/pricing/order-totals";
import { ReceiptPreview } from "./receipt-preview";
import type {
  DbOrder,
  OrderItemWithModifiers,
  PaymentMethod,
} from "@/lib/types/database";

interface PaymentDialogProps {
  order: DbOrder;
  items: OrderItemWithModifiers[];
  tableId: string;
  productVatRates: Map<string, number>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat("el-GR", {
    style: "currency",
    currency: "EUR",
  }).format(price);
}

type Step = "method" | "receipt";

export function PaymentDialog({
  order,
  items,
  tableId,
  productVatRates,
  open,
  onOpenChange,
  onComplete,
}: PaymentDialogProps) {
  const [step, setStep] = useState<Step>("method");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(
    null,
  );
  const [cashGiven, setCashGiven] = useState("");
  const [isPending, startTransition] = useTransition();

  const subtotal = calculateOrderSubtotal(
    items.map((i) => ({
      price: i.price,
      quantity: i.quantity,
      modifiers: i.order_item_modifiers.map((m) => ({ price: m.price })),
    })),
  );
  const cashGivenNum = parseFloat(cashGiven) || 0;
  const change = cashGivenNum - subtotal;
  const canPay =
    paymentMethod === "card" ||
    (paymentMethod === "cash" && cashGivenNum >= subtotal);

  const handlePay = () => {
    if (!paymentMethod) return;
    startTransition(async () => {
      const result = await completeOrder({
        orderId: order.id,
        tableId,
        paymentMethod,
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Πληρωμή ολοκληρώθηκε");
      setStep("receipt");
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

  const handleClose = () => {
    setStep("method");
    setPaymentMethod(null);
    setCashGiven("");
    onOpenChange(false);
    if (step === "receipt") onComplete();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => (!v ? handleClose() : onOpenChange(v))}
    >
      <DialogContent className="max-w-lg">
        {step === "method" && (
          <>
            <DialogHeader>
              <DialogTitle>Πληρωμή — Τραπέζι {order.table_number}</DialogTitle>
              <DialogDescription>
                Σύνολο:{" "}
                <span className="font-bold">{formatPrice(subtotal)}</span>
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
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
                    <Label htmlFor="cash-given">Ποσό που δόθηκε</Label>
                    <Input
                      id="cash-given"
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
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setCashGiven(amount.toString())}
                      >
                        €{amount}
                      </Button>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setCashGiven(subtotal.toFixed(2))}
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
                    {formatPrice(subtotal)}
                  </p>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Ακύρωση
              </Button>
              <Button onClick={handlePay} disabled={!canPay || isPending}>
                {isPending ? "Ολοκλήρωση..." : "Ολοκλήρωση Πληρωμής"}
              </Button>
            </DialogFooter>
          </>
        )}

        {step === "receipt" && (
          <>
            <DialogHeader>
              <DialogTitle>Απόδειξη</DialogTitle>
            </DialogHeader>
            <div className="max-h-[60vh] overflow-auto">
              <ReceiptPreview
                order={order}
                items={items}
                productVatRates={productVatRates}
                paymentMethod={paymentMethod}
                cashGiven={paymentMethod === "cash" ? cashGivenNum : undefined}
              />
            </div>
            <Separator />
            <DialogFooter>
              <Button variant="outline" onClick={handlePrint}>
                <Printer className="mr-2 size-4" />
                Εκτύπωση
              </Button>
              <Button onClick={handleClose}>
                <Check className="mr-2 size-4" />
                Κλείσιμο
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
