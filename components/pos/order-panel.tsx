"use client";

import { useState, useTransition, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Send,
  Receipt,
  Trash2,
  AlertTriangle,
  Plus,
  Minus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useRealtimeOrder } from "@/lib/hooks/use-realtime-orders";
import {
  createOrder,
  addOrderItem,
  updateItemQuantity,
  removeOrderItem,
  cancelOrder,
  sendAllPendingToKitchen,
  toggleOrderRush,
  fetchProductModifiers,
} from "@/lib/actions/orders";
import { updateTableStatus } from "@/lib/actions/tables";
import {
  calculateOrderSubtotal,
  calculateVatBreakdown,
} from "@/lib/pricing/order-totals";
import { MenuItemCard } from "./menu-item-card";
import { OrderItemCard } from "./order-item-card";
import { CourseSeparator } from "./course-separator";
import { ModifierChips } from "./modifier-chips";
import type {
  DbTable,
  DbOrder,
  DbProduct,
  DbCategory,
  DbModifier,
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

interface SelectedModifier {
  modifierId: string;
  name: string;
  price: number;
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

  // Category selection
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    categories[0]?.id ?? null,
  );

  // Modifier sheet state
  const [selectedProduct, setSelectedProduct] = useState<DbProduct | null>(
    null,
  );
  const [itemQuantity, setItemQuantity] = useState(1);
  const [selectedModifiers, setSelectedModifiers] = useState<
    SelectedModifier[]
  >([]);
  const [itemNotes, setItemNotes] = useState("");
  const [applicableModifiers, setApplicableModifiers] = useState<DbModifier[]>(
    [],
  );
  const [loadingModifiers, setLoadingModifiers] = useState(false);

  // Map each product to its default course via its category
  const courseByCategoryId = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of categories) map.set(c.id, c.default_course);
    return map;
  }, [categories]);

  const getCourseForProduct = (product: DbProduct): number =>
    courseByCategoryId.get(product.category_id) ?? 1;

  const activeCategory = selectedCategoryId ?? categories[0]?.id;
  const productsInCategory = useMemo(
    () =>
      activeCategory
        ? products.filter((p) => p.category_id === activeCategory)
        : [],
    [products, activeCategory],
  );

  const pendingItems = useMemo(
    () => items.filter((i) => i.status === "pending"),
    [items],
  );
  const sentItems = useMemo(
    () => items.filter((i) => i.status !== "pending"),
    [items],
  );

  const pendingByCourse = useMemo(() => {
    const groups = new Map<number, OrderItemWithModifiers[]>();
    for (const item of pendingItems) {
      const list = groups.get(item.course) ?? [];
      list.push(item);
      groups.set(item.course, list);
    }
    return Array.from(groups.entries()).sort(([a], [b]) => a - b);
  }, [pendingItems]);

  const sentByCourse = useMemo(() => {
    const groups = new Map<number, OrderItemWithModifiers[]>();
    for (const item of sentItems) {
      const list = groups.get(item.course) ?? [];
      list.push(item);
      groups.set(item.course, list);
    }
    return Array.from(groups.entries()).sort(([a], [b]) => a - b);
  }, [sentItems]);

  const subtotal = useMemo(
    () =>
      calculateOrderSubtotal(
        items.map((i) => ({
          price: i.price,
          quantity: i.quantity,
          modifiers: i.order_item_modifiers.map((m) => ({ price: m.price })),
        })),
      ),
    [items],
  );

  const vatTotal = useMemo(() => {
    const vatRateById = new Map<string, number>();
    for (const p of products) vatRateById.set(p.id, p.vat_rate);
    const vatable = items.map((i) => ({
      price: i.price,
      quantity: i.quantity,
      modifiers: i.order_item_modifiers.map((m) => ({ price: m.price })),
      vatRate: vatRateById.get(i.product_id) ?? 24,
    }));
    return calculateVatBreakdown(vatable).reduce((sum, r) => sum + r.vat, 0);
  }, [items, products]);

  const sheetModifierTotal = selectedModifiers.reduce((s, m) => s + m.price, 0);
  const sheetTotalPrice = selectedProduct
    ? (selectedProduct.price + sheetModifierTotal) * itemQuantity
    : 0;

  // Load modifiers when a product is selected
  useEffect(() => {
    if (!selectedProduct) return;
    let cancelled = false;
    setLoadingModifiers(true);
    fetchProductModifiers(selectedProduct.id).then((result) => {
      if (cancelled) return;
      setLoadingModifiers(false);
      if (result.success) {
        setApplicableModifiers(result.data ?? []);
      } else {
        setApplicableModifiers([]);
        toast.error(`Αποτυχία φόρτωσης επιλογών: ${result.error}`);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [selectedProduct]);

  // --- Handlers ---

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

  const handleOpenModifierSheet = (product: DbProduct) => {
    setSelectedProduct(product);
    setItemQuantity(1);
    setSelectedModifiers([]);
    setItemNotes("");
  };

  const handleToggleModifier = (modifierId: string) => {
    const modifier = applicableModifiers.find((m) => m.id === modifierId);
    if (!modifier) return;
    setSelectedModifiers((prev) => {
      const exists = prev.find((m) => m.modifierId === modifierId);
      if (exists) return prev.filter((m) => m.modifierId !== modifierId);
      return [
        ...prev,
        {
          modifierId: modifier.id,
          name: modifier.name,
          price: modifier.price,
        },
      ];
    });
  };

  const handleAddItemWithModifiers = async () => {
    if (!selectedProduct) return;
    const orderId = await ensureOrder();
    if (!orderId) return;

    const result = await addOrderItem({
      orderId,
      productId: selectedProduct.id,
      productName: selectedProduct.name,
      price: selectedProduct.price,
      quantity: itemQuantity,
      station: selectedProduct.station,
      course: getCourseForProduct(selectedProduct),
      notes: itemNotes || undefined,
      modifiers: selectedModifiers.length > 0 ? selectedModifiers : undefined,
    });

    if (!result.success) {
      toast.error(result.error);
      return;
    }
    setSelectedProduct(null);
  };

  const handleUpdateQuantity = (itemId: string, quantity: number) => {
    startTransition(async () => {
      const r = await updateItemQuantity({ itemId, quantity });
      if (!r.success) toast.error(r.error);
    });
  };

  const handleRemoveItem = (itemId: string) => {
    startTransition(async () => {
      const r = await removeOrderItem(itemId);
      if (!r.success) toast.error(r.error);
    });
  };

  const handleSendToKitchen = () => {
    if (!order?.id) return;
    startTransition(async () => {
      const r = await sendAllPendingToKitchen(order.id);
      if (!r.success) {
        toast.error(r.error);
        return;
      }
      toast.success(`${r.data?.count ?? 0} είδη εστάλησαν στην κουζίνα`);
    });
  };

  const handleRequestBill = () => {
    if (!order) return;
    startTransition(async () => {
      await updateTableStatus(table.id, "bill-requested");
      router.push(`/checkout/${table.id}`);
    });
  };

  const handleCancelOrder = () => {
    if (!order) return;
    if (!window.confirm("Ακύρωση παραγγελίας;")) return;
    startTransition(async () => {
      const r = await cancelOrder(order.id, table.id);
      if (!r.success) {
        toast.error(r.error);
        return;
      }
      router.push("/tables");
    });
  };

  const handleToggleRush = () => {
    if (!order) return;
    startTransition(async () => {
      const r = await toggleOrderRush({
        orderId: order.id,
        isRush: !order.is_rush,
      });
      if (!r.success) toast.error(r.error);
    });
  };

  const hasKitchenItems = sentItems.length > 0;
  const hasPendingItems = pendingItems.length > 0;

  const renderItemsWithCourses = (
    groups: [number, OrderItemWithModifiers[]][],
    disabled: boolean,
  ) =>
    groups.map(([course, courseItems], groupIndex) => (
      <div key={course} className="space-y-2">
        {(groups.length > 1 || course > 1) && groupIndex >= 0 && (
          <CourseSeparator courseNumber={course} />
        )}
        {courseItems.map((item) => (
          <OrderItemCard
            key={item.id}
            item={item}
            onUpdateQuantity={handleUpdateQuantity}
            onRemove={handleRemoveItem}
            disabled={disabled}
          />
        ))}
      </div>
    ));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/tables")}
        >
          <ArrowLeft className="size-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">
            Τραπέζι {table.number}
          </h1>
          <p className="text-sm text-muted-foreground">
            {items.length} προϊόντα • {formatPrice(subtotal)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {order && (
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                order.is_rush &&
                  "text-red-500 hover:text-red-600 bg-red-500/10",
              )}
              onClick={handleToggleRush}
              title={order.is_rush ? "Ακύρωση RUSH" : "RUSH"}
              disabled={isPending}
            >
              <AlertTriangle
                className={cn("size-5", order.is_rush && "fill-red-500")}
              />
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Menu Section */}
        <div className="lg:col-span-2 space-y-4">
          {/* Category Tabs */}
          <ScrollArea className="w-full">
            <div className="flex gap-2 pb-2">
              {categories.map((category) => (
                <Button
                  key={category.id}
                  variant={
                    activeCategory === category.id ? "default" : "outline"
                  }
                  size="sm"
                  onClick={() => setSelectedCategoryId(category.id)}
                  className="shrink-0"
                >
                  {category.name}
                </Button>
              ))}
            </div>
          </ScrollArea>

          {/* Products Grid */}
          {productsInCategory.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Δεν υπάρχουν προϊόντα σε αυτή την κατηγορία
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {productsInCategory.map((product) => (
                <MenuItemCard
                  key={product.id}
                  product={product}
                  onAdd={handleOpenModifierSheet}
                />
              ))}
            </div>
          )}
        </div>

        {/* Order Summary */}
        <Card className="h-fit lg:sticky lg:top-4">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between">
              <span>Παραγγελία</span>
              {order && items.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={handleCancelOrder}
                  disabled={isPending}
                >
                  <Trash2 className="size-4 mr-1" />
                  Ακύρωση
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {items.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-8">
                Δεν υπάρχουν προϊόντα
              </p>
            ) : (
              <>
                {/* Pending Items grouped by course */}
                {hasPendingItems && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase">
                      Προς αποστολή ({pendingItems.length})
                    </p>
                    {renderItemsWithCourses(pendingByCourse, false)}
                  </div>
                )}

                {/* Sent Items grouped by course */}
                {hasKitchenItems && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase">
                      Στην κουζίνα ({sentItems.length})
                    </p>
                    {renderItemsWithCourses(sentByCourse, true)}
                  </div>
                )}

                {/* Totals */}
                <div className="border-t border-border pt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Υποσύνολο</span>
                    <span>{formatPrice(subtotal - vatTotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">ΦΠΑ</span>
                    <span>{formatPrice(vatTotal)}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-lg">
                    <span>Σύνολο</span>
                    <span>{formatPrice(subtotal)}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="space-y-2 pt-2">
                  {hasPendingItems && (
                    <Button
                      className="w-full"
                      size="lg"
                      onClick={handleSendToKitchen}
                      disabled={isPending}
                    >
                      <Send className="size-4 mr-2" />
                      Αποστολή στην Κουζίνα
                    </Button>
                  )}

                  {hasKitchenItems && order && (
                    <Button
                      variant={order.is_rush ? "destructive" : "outline"}
                      className="w-full"
                      onClick={handleToggleRush}
                      disabled={isPending}
                    >
                      <AlertTriangle className="size-4 mr-2" />
                      {order.is_rush ? "Ακύρωση RUSH" : "Σήμανση RUSH"}
                    </Button>
                  )}

                  {items.length > 0 && !hasPendingItems && (
                    <Button
                      className="w-full"
                      size="lg"
                      variant="outline"
                      onClick={handleRequestBill}
                      disabled={isPending}
                    >
                      <Receipt className="size-4 mr-2" />
                      Λογαριασμός
                    </Button>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modifier Selection Sheet */}
      <Sheet
        open={selectedProduct !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedProduct(null);
        }}
      >
        <SheetContent className="flex flex-col gap-0">
          <SheetHeader>
            <SheetTitle>{selectedProduct?.name}</SheetTitle>
            {selectedProduct && (
              <p className="text-sm text-muted-foreground">
                {formatPrice(selectedProduct.price)}
              </p>
            )}
          </SheetHeader>

          <div className="flex flex-col gap-6 px-4 pb-4 flex-1 overflow-y-auto">
            {/* Quantity Selector */}
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
                Ποσότητα
              </p>
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="size-9"
                  onClick={() => setItemQuantity((q) => Math.max(1, q - 1))}
                  disabled={itemQuantity <= 1}
                >
                  <Minus className="size-4" />
                </Button>
                <span className="w-10 text-center text-lg font-semibold">
                  {itemQuantity}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="size-9"
                  onClick={() => setItemQuantity((q) => q + 1)}
                >
                  <Plus className="size-4" />
                </Button>
              </div>
            </div>

            {/* Modifier Chips */}
            {loadingModifiers ? (
              <p className="text-sm text-muted-foreground">
                Φόρτωση επιλογών...
              </p>
            ) : (
              applicableModifiers.length > 0 && (
                <ModifierChips
                  modifiers={applicableModifiers}
                  selectedIds={selectedModifiers.map((m) => m.modifierId)}
                  onToggle={handleToggleModifier}
                />
              )
            )}

            {/* Notes */}
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
                Σημειώσεις
              </p>
              <Textarea
                placeholder="Π.χ. χωρίς αλάτι..."
                value={itemNotes}
                onChange={(e) => setItemNotes(e.target.value)}
                rows={2}
              />
            </div>

            {/* Spacer */}
            <div className="flex-1" />

            {/* Total and Add button */}
            <div className="space-y-3 border-t border-border pt-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Σύνολο</span>
                <span className="text-lg font-semibold">
                  {formatPrice(sheetTotalPrice)}
                </span>
              </div>
              <Button
                className="w-full"
                size="lg"
                onClick={handleAddItemWithModifiers}
                disabled={isPending}
              >
                Προσθήκη
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
