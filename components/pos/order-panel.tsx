"use client";

import { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, ChefHat, UtensilsCrossed, CreditCard } from "lucide-react";
import { toast } from "sonner";
import { useRealtimeOrder } from "@/lib/hooks/use-realtime-orders";
import {
  createOrder,
  addOrderItem,
  updateItemQuantity,
  removeOrderItem,
  sendCourseToKitchen,
} from "@/lib/actions/orders";
import { updateTableStatus } from "@/lib/actions/tables";
import { calculateOrderSubtotal } from "@/lib/pricing/order-totals";
import { MenuItemCard } from "./menu-item-card";
import { OrderItemCard } from "./order-item-card";
import { CourseSeparator } from "./course-separator";
import { ModifierDialog, type ModifierSelection } from "./modifier-dialog";
import { PaymentDialog } from "./payment-dialog";
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

  const [modifierProduct, setModifierProduct] = useState<DbProduct | null>(
    null,
  );
  const [paymentOpen, setPaymentOpen] = useState(false);

  const productVatRates = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of products) map.set(p.id, p.vat_rate);
    return map;
  }, [products]);

  const activeCourse = order?.active_course ?? 1;

  const ensureOrder = async (): Promise<string | null> => {
    if (order?.id) return order.id;
    const result = await createOrder(table.id, table.number);
    if (!result.success) {
      toast.error(result.error);
      return null;
    }
    const newId = result.data!.id;
    setOrder({
      id: newId,
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
    return newId;
  };

  const handleProductClick = (product: DbProduct) => {
    setModifierProduct(product);
  };

  const handleConfirmAdd = async (
    product: DbProduct,
    modifiers: ModifierSelection[],
    notes: string,
    course: number,
  ) => {
    const orderId = await ensureOrder();
    if (!orderId) return;

    const result = await addOrderItem({
      orderId,
      productId: product.id,
      productName: product.name,
      price: product.price,
      quantity: 1,
      station: product.station,
      course,
      notes: notes || undefined,
      modifiers: modifiers.length > 0 ? modifiers : undefined,
    });

    if (!result.success) {
      toast.error(result.error);
    }
  };

  const handleIncrement = (itemId: string) => {
    const item = items.find((i) => i.id === itemId);
    if (!item) return;
    startTransition(async () => {
      const r = await updateItemQuantity({
        itemId,
        quantity: item.quantity + 1,
      });
      if (!r.success) toast.error(r.error);
    });
  };

  const handleDecrement = (itemId: string) => {
    const item = items.find((i) => i.id === itemId);
    if (!item || item.quantity <= 1) return;
    startTransition(async () => {
      const r = await updateItemQuantity({
        itemId,
        quantity: item.quantity - 1,
      });
      if (!r.success) toast.error(r.error);
    });
  };

  const handleRemove = (itemId: string) => {
    startTransition(async () => {
      const r = await removeOrderItem(itemId);
      if (!r.success) toast.error(r.error);
    });
  };

  const handleSendCourse = (courseNumber: number) => {
    if (!order?.id) return;
    startTransition(async () => {
      const r = await sendCourseToKitchen({
        orderId: order.id,
        courseNumber,
      });
      if (!r.success) {
        toast.error(r.error);
        return;
      }
      toast.success(
        `Course ${courseNumber}: ${r.data?.count ?? 0} είδη στην κουζίνα`,
      );
    });
  };

  const handleRequestBill = async () => {
    if (!order) return;
    await updateTableStatus(table.id, "bill-requested");
    setPaymentOpen(true);
  };

  const subtotal = calculateOrderSubtotal(
    items.map((i) => ({
      price: i.price,
      quantity: i.quantity,
      modifiers: i.order_item_modifiers.map((m) => ({ price: m.price })),
    })),
  );

  // Group items by course
  const itemsByCourse = useMemo(() => {
    const grouped = new Map<number, OrderItemWithModifiers[]>();
    for (const item of items) {
      const list = grouped.get(item.course) ?? [];
      list.push(item);
      grouped.set(item.course, list);
    }
    return Array.from(grouped.entries()).sort(([a], [b]) => a - b);
  }, [items]);

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
                onClick={handleProductClick}
                isPending={isPending}
              />
            </TabsContent>
            {categories.map((cat) => (
              <TabsContent key={cat.id} value={cat.id} className="mt-3">
                <ProductGrid
                  products={products.filter((p) => p.category_id === cat.id)}
                  onClick={handleProductClick}
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
              {itemsByCourse.map(([courseNumber, courseItems]) => {
                const hasPending = courseItems.some(
                  (i) => i.status === "pending",
                );
                return (
                  <div key={courseNumber} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <CourseSeparator
                        courseNumber={courseNumber}
                        itemCount={courseItems.length}
                        isActive={courseNumber === activeCourse}
                      />
                      {hasPending && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSendCourse(courseNumber)}
                          disabled={isPending}
                          className="shrink-0"
                        >
                          <ChefHat className="mr-1 size-3" />
                          Αποστολή
                        </Button>
                      )}
                    </div>
                    {courseItems.map((item) => (
                      <OrderItemCard
                        key={item.id}
                        item={item}
                        onIncrement={handleIncrement}
                        onDecrement={handleDecrement}
                        onRemove={handleRemove}
                        disabled={isPending}
                      />
                    ))}
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {items.length > 0 && order && (
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

      {/* Modifier dialog */}
      <ModifierDialog
        product={modifierProduct}
        open={modifierProduct !== null}
        onOpenChange={(open) => !open && setModifierProduct(null)}
        onConfirm={handleConfirmAdd}
        defaultCourse={activeCourse}
      />

      {/* Payment dialog */}
      {order && (
        <PaymentDialog
          order={order}
          items={items}
          tableId={table.id}
          productVatRates={productVatRates}
          open={paymentOpen}
          onOpenChange={setPaymentOpen}
          onComplete={() => router.push("/tables")}
        />
      )}
    </div>
  );
}

function ProductGrid({
  products,
  onClick,
  isPending,
}: {
  products: DbProduct[];
  onClick: (product: DbProduct) => void;
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
        <MenuItemCard
          key={product.id}
          product={product}
          onClick={onClick}
          disabled={isPending}
        />
      ))}
    </div>
  );
}
