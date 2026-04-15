"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Plus,
  Minus,
  Trash2,
  CreditCard,
  UtensilsCrossed,
} from "lucide-react";
import { toast } from "sonner";
import { useRealtimeOrder } from "@/lib/hooks/use-realtime-orders";
import {
  createOrder,
  addOrderItem,
  updateItemQuantity,
  removeOrderItem,
} from "@/lib/actions/orders";
import { updateTableStatus } from "@/lib/actions/tables";
import type {
  DbTable,
  DbOrder,
  DbProduct,
  DbCategory,
  OrderItemWithModifiers,
} from "@/lib/types/database";

interface OrderPanelProps {
  table: DbTable;
  initialOrder: DbOrder | null;
  initialItems: OrderItemWithModifiers[];
  products: DbProduct[];
  categories: DbCategory[];
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat("el-GR", {
    style: "currency",
    currency: "EUR",
  }).format(price);
}

export function OrderPanel({
  table,
  initialOrder,
  initialItems,
  products,
  categories,
}: OrderPanelProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { order, items, setOrder } = useRealtimeOrder(
    initialOrder,
    initialItems,
    table.id,
  );

  const handleAddProduct = async (product: DbProduct) => {
    let currentOrderId = order?.id;

    // Create order if it doesn't exist
    if (!currentOrderId) {
      const result = await createOrder(table.id, table.number);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      currentOrderId = result.data!.id;
      setOrder({
        id: currentOrderId,
        table_id: table.id,
        table_number: table.number,
        status: "active",
        payment_method: null,
        total: 0,
        vat_amount: 0,
        discount_amount: 0,
        active_course: 1,
        is_rush: false,
        notes: null,
        customer_id: null,
        created_by: null,
        completed_by: null,
        elorus_invoice_id: null,
        fiscal_mark: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        completed_at: null,
      });
    }

    const result = await addOrderItem({
      orderId: currentOrderId,
      productId: product.id,
      productName: product.name,
      price: product.price,
      quantity: 1,
      station: product.station,
    });

    if (!result.success) {
      toast.error(result.error);
    }
  };

  const handleUpdateQuantity = (
    itemId: string,
    currentQty: number,
    delta: number,
  ) => {
    const newQty = currentQty + delta;
    if (newQty < 1) return;

    startTransition(async () => {
      const result = await updateItemQuantity({
        itemId,
        quantity: newQty,
      });
      if (!result.success) {
        toast.error(result.error);
      }
    });
  };

  const handleRemoveItem = (itemId: string) => {
    startTransition(async () => {
      const result = await removeOrderItem(itemId);
      if (!result.success) {
        toast.error(result.error);
      }
    });
  };

  const handleRequestBill = async () => {
    if (!order) return;
    const result = await updateTableStatus(table.id, "bill-requested");
    if (result.success) {
      router.push(`/checkout/${table.id}`);
    } else {
      toast.error(result.error);
    }
  };

  // Calculate totals
  const subtotal = items.reduce((sum, item) => {
    const modTotal = item.order_item_modifiers.reduce(
      (ms, m) => ms + m.price,
      0,
    );
    return sum + (item.price + modTotal) * item.quantity;
  }, 0);

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col gap-4 lg:flex-row">
      {/* Left: Menu Browser */}
      <div className="flex-1 overflow-hidden rounded-lg border">
        <div className="flex items-center gap-2 border-b p-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/tables")}
          >
            <ArrowLeft className="size-4" />
          </Button>
          <h2 className="font-semibold">Τραπέζι {table.number}</h2>
          <Badge variant="outline">{table.capacity} άτομα</Badge>
        </div>

        <Tabs defaultValue="all" className="p-3">
          <TabsList className="flex-wrap">
            <TabsTrigger value="all">Όλα</TabsTrigger>
            {categories.map((cat) => (
              <TabsTrigger key={cat.id} value={cat.id}>
                {cat.name}
              </TabsTrigger>
            ))}
          </TabsList>

          <ScrollArea className="h-[calc(100vh-16rem)]">
            <TabsContent value="all" className="mt-3">
              <ProductGrid
                products={products}
                onAdd={handleAddProduct}
                isPending={isPending}
              />
            </TabsContent>
            {categories.map((cat) => (
              <TabsContent key={cat.id} value={cat.id} className="mt-3">
                <ProductGrid
                  products={products.filter((p) => p.category_id === cat.id)}
                  onAdd={handleAddProduct}
                  isPending={isPending}
                />
              </TabsContent>
            ))}
          </ScrollArea>
        </Tabs>
      </div>

      {/* Right: Current Order */}
      <div className="flex w-full flex-col rounded-lg border lg:w-96">
        <div className="border-b p-3">
          <h3 className="font-semibold flex items-center gap-2">
            <UtensilsCrossed className="size-4" />
            Παραγγελία
            {items.length > 0 && (
              <Badge variant="secondary">{items.length}</Badge>
            )}
          </h3>
        </div>

        <ScrollArea className="flex-1 p-3">
          {items.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Επιλέξτε προϊόντα από το μενού
            </p>
          ) : (
            <div className="space-y-2">
              {items.map((item) => {
                const modTotal = item.order_item_modifiers.reduce(
                  (s, m) => s + m.price,
                  0,
                );
                const lineTotal = (item.price + modTotal) * item.quantity;

                return (
                  <div
                    key={item.id}
                    className="flex items-start gap-2 rounded-md border p-2"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {item.product_name}
                      </p>
                      {item.order_item_modifiers.length > 0 && (
                        <p className="text-xs text-amber-600">
                          +{" "}
                          {item.order_item_modifiers
                            .map((m) => m.name)
                            .join(", ")}
                        </p>
                      )}
                      {item.notes && (
                        <p className="text-xs text-muted-foreground italic">
                          {item.notes}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {formatPrice(item.price + modTotal)} × {item.quantity}
                      </p>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      <span className="text-sm font-semibold">
                        {formatPrice(lineTotal)}
                      </span>
                      {item.status === "pending" && (
                        <div className="flex items-center gap-1">
                          <Button
                            variant="outline"
                            size="icon"
                            className="size-6"
                            onClick={() =>
                              handleUpdateQuantity(item.id, item.quantity, -1)
                            }
                            disabled={item.quantity <= 1 || isPending}
                          >
                            <Minus className="size-3" />
                          </Button>
                          <span className="w-5 text-center text-xs">
                            {item.quantity}
                          </span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="size-6"
                            onClick={() =>
                              handleUpdateQuantity(item.id, item.quantity, 1)
                            }
                            disabled={isPending}
                          >
                            <Plus className="size-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-6 text-destructive"
                            onClick={() => handleRemoveItem(item.id)}
                            disabled={isPending}
                          >
                            <Trash2 className="size-3" />
                          </Button>
                        </div>
                      )}
                      {item.status !== "pending" && (
                        <Badge variant="outline" className="text-xs">
                          {item.status === "preparing"
                            ? "Ετοιμάζεται"
                            : item.status === "ready"
                              ? "Έτοιμο"
                              : "Σερβιρίστηκε"}
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {items.length > 0 && (
          <div className="border-t p-3 space-y-3">
            <Separator />
            <div className="flex justify-between text-sm">
              <span>Σύνολο</span>
              <span className="text-lg font-bold">{formatPrice(subtotal)}</span>
            </div>

            <Button
              className="w-full"
              size="lg"
              onClick={handleRequestBill}
              disabled={isPending}
            >
              <CreditCard className="mr-2 size-4" />
              Λογαριασμός
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function ProductGrid({
  products,
  onAdd,
  isPending,
}: {
  products: DbProduct[];
  onAdd: (product: DbProduct) => void;
  isPending: boolean;
}) {
  if (products.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-muted-foreground">
        Δεν βρέθηκαν προϊόντα
      </p>
    );
  }

  return (
    <div className="grid gap-2 grid-cols-2 sm:grid-cols-3">
      {products.map((product) => (
        <button
          key={product.id}
          onClick={() => onAdd(product)}
          disabled={isPending}
          className="flex flex-col items-start rounded-lg border p-3 text-left transition-colors hover:bg-accent active:scale-95 disabled:opacity-50"
        >
          <span className="text-sm font-medium leading-tight">
            {product.name}
          </span>
          <span className="mt-1 text-sm font-bold text-primary">
            {formatPrice(product.price)}
          </span>
        </button>
      ))}
    </div>
  );
}
