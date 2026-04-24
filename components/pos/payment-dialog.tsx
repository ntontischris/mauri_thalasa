"use client";

import { useState, useTransition, useEffect } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Banknote, CreditCard, Printer, Check, Gift } from "lucide-react";
import { toast } from "sonner";
import { completeOrder } from "@/lib/actions/orders";
import { calculateOrderSubtotal } from "@/lib/pricing/order-totals";
import { ReceiptPreview } from "./receipt-preview";
import type {
  DbOrder,
  DbCustomer,
  DbLoyaltyReward,
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
  customer?: DbCustomer | null;
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat("el-GR", {
    style: "currency",
    currency: "EUR",
  }).format(price);
}

function computeDiscount(r: DbLoyaltyReward, subtotal: number): number {
  switch (r.kind) {
    case "discount":
    case "free_item":
    case "custom":
      return Math.min(r.value, subtotal);
    case "percent_off":
      return Math.min((subtotal * Math.min(r.value, 100)) / 100, subtotal);
  }
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
  customer,
}: PaymentDialogProps) {
  const [step, setStep] = useState<Step>("method");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(
    null,
  );
  const [cashGiven, setCashGiven] = useState("");
  const [tip, setTip] = useState("");
  const [rewards, setRewards] = useState<DbLoyaltyReward[]>([]);
  const [selectedRewardId, setSelectedRewardId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!customer) return;
    fetch("/api/loyalty/rewards")
      .then((r) => r.json())
      .then((d) => setRewards(Array.isArray(d) ? d : []))
      .catch(() => setRewards([]));
  }, [customer]);

  const subtotal = calculateOrderSubtotal(
    items.map((i) => ({
      price: i.price,
      quantity: i.quantity,
      modifiers: i.order_item_modifiers.map((m) => ({ price: m.price })),
    })),
  );
  const tipNum = parseFloat(tip) || 0;

  const selectedReward = rewards.find((r) => r.id === selectedRewardId) ?? null;
  const redemptionDiscount = selectedReward
    ? computeDiscount(selectedReward, subtotal)
    : 0;

  const grandTotal = Math.max(0, subtotal + tipNum - redemptionDiscount);
  const cashGivenNum = parseFloat(cashGiven) || 0;
  const change = cashGivenNum - grandTotal;
  const canPay =
    paymentMethod === "card" ||
    (paymentMethod === "cash" && cashGivenNum >= grandTotal);

  const handlePay = () => {
    if (!paymentMethod) return;
    startTransition(async () => {
      const result = await completeOrder({
        orderId: order.id,
        tableId,
        paymentMethod,
        tipAmount: tipNum,
        loyaltyDiscount: redemptionDiscount,
        rewardId: selectedRewardId,
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
                <span className="font-bold">{formatPrice(grandTotal)}</span>
                {tipNum > 0 && (
                  <span className="ml-2 text-xs text-muted-foreground">
                    (+ {formatPrice(tipNum)} φιλοδώρημα)
                  </span>
                )}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Loyalty */}
              {customer && (
                <div className="space-y-2 rounded-lg border border-primary/40 bg-primary/5 p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{customer.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {customer.loyalty_points} πόντοι διαθέσιμοι · Stamps {customer.stamp_count}/10
                      </p>
                    </div>
                    {selectedReward && (
                      <Badge variant="default" className="gap-1">
                        <Gift className="size-3" /> -{formatPrice(redemptionDiscount)}
                      </Badge>
                    )}
                  </div>
                  {rewards.length > 0 && (
                    <div className="space-y-1.5 pt-1 max-h-48 overflow-y-auto">
                      {rewards.map((r) => {
                        const canAfford = customer.loyalty_points >= r.points_cost;
                        const isSelected = selectedRewardId === r.id;
                        return (
                          <button
                            type="button"
                            key={r.id}
                            disabled={!canAfford}
                            onClick={() =>
                              setSelectedRewardId((v) => (v === r.id ? null : r.id))
                            }
                            className={`w-full text-left flex items-center justify-between gap-2 rounded-md border px-2 py-1.5 text-xs transition ${
                              isSelected
                                ? "border-primary bg-primary/10"
                                : canAfford
                                  ? "hover:bg-muted"
                                  : "opacity-50 cursor-not-allowed"
                            }`}
                          >
                            <div className="min-w-0">
                              <p className="font-medium truncate">{r.name}</p>
                              {r.description && (
                                <p className="text-[10px] text-muted-foreground truncate">
                                  {r.description}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <Badge variant="outline" className="font-mono h-5 text-[10px]">
                                {r.points_cost} pts
                              </Badge>
                              <span className="text-muted-foreground">→</span>
                              <Badge variant="secondary" className="h-5 text-[10px]">
                                {r.kind === "percent_off" ? `${r.value}%` : `€${r.value}`}
                              </Badge>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Tip */}
              <div className="space-y-2 rounded-lg border p-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Φιλοδώρημα</Label>
                  <div className="flex gap-1">
                    {[5, 10, 15].map((pct) => (
                      <Button
                        key={pct}
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={() =>
                          setTip((subtotal * (pct / 100)).toFixed(2))
                        }
                      >
                        {pct}%
                      </Button>
                    ))}
                  </div>
                </div>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={tip}
                  onChange={(e) => setTip(e.target.value)}
                  placeholder="0.00"
                  className="h-9 font-mono"
                />
              </div>

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
