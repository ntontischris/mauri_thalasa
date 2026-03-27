"use client";

import { useRouter } from "next/navigation";
import { useState, use, useMemo } from "react";
import {
  ArrowLeft,
  Send,
  Receipt,
  Trash2,
  AlertTriangle,
  ArrowRightLeft,
  Plus,
  Minus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { usePOS } from "@/lib/pos-context";
import { formatPrice } from "@/lib/mock-data";
import { useModifiers } from "@/hooks/use-modifiers";
import { useOrders } from "@/hooks/use-orders";
import { useTableLayout } from "@/hooks/use-table-layout";
import { MenuItemCard } from "@/components/pos/menu-item";
import { OrderItemCard } from "@/components/pos/order-item";
import { ModifierChips } from "@/components/pos/modifier-chips";
import { CourseSeparator } from "@/components/pos/course-separator";
import { TableTransferDialog } from "@/components/pos/table-transfer-dialog";
import type { Product, SelectedModifier } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function OrderPage({
  params,
}: {
  params: Promise<{ tableId: string }>;
}) {
  const { tableId } = use(params);
  const router = useRouter();
  const {
    state,
    getTable,
    getActiveOrderForTable,
    getProductsByCategory,
    addItemToOrder,
    dispatch,
  } = usePOS();
  const { getModifiersForProduct, calculateItemPrice } = useModifiers();
  const { sendToKitchen, requestBill, cancelOrder } = useOrders();
  const { transferTable } = useTableLayout();

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Modifier sheet state
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [itemQuantity, setItemQuantity] = useState(1);
  const [selectedModifiers, setSelectedModifiers] = useState<
    SelectedModifier[]
  >([]);
  const [itemNotes, setItemNotes] = useState("");
  const [currentCourse, setCurrentCourse] = useState(1);

  // Transfer dialog state
  const [isTransferOpen, setIsTransferOpen] = useState(false);

  if (!state.isLoaded) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-12 w-full" />
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-32 rounded-xl" />
              ))}
            </div>
          </div>
          <Skeleton className="h-96 rounded-xl" />
        </div>
      </div>
    );
  }

  const table = getTable(tableId);
  const order = getActiveOrderForTable(tableId);

  if (!table) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-muted-foreground">Το τραπέζι δεν βρέθηκε</p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => router.push("/tables")}
        >
          Επιστροφή στα τραπέζια
        </Button>
      </div>
    );
  }

  const categories = state.categories;
  const activeCategory = selectedCategory || categories[0]?.id;
  const products = activeCategory ? getProductsByCategory(activeCategory) : [];

  const pendingItems = order?.items.filter((i) => i.status === "pending") || [];
  const sentItems = order?.items.filter((i) => i.status !== "pending") || [];
  const hasKitchenItems = sentItems.length > 0;

  // Group pending items by course
  const pendingByCourse = useMemo(() => {
    const groups = new Map<number, typeof pendingItems>();
    for (const item of pendingItems) {
      const courseItems = groups.get(item.course) || [];
      courseItems.push(item);
      groups.set(item.course, courseItems);
    }
    return Array.from(groups.entries()).sort(([a], [b]) => a - b);
  }, [pendingItems]);

  // Group sent items by course
  const sentByCourse = useMemo(() => {
    const groups = new Map<number, typeof sentItems>();
    for (const item of sentItems) {
      const courseItems = groups.get(item.course) || [];
      courseItems.push(item);
      groups.set(item.course, courseItems);
    }
    return Array.from(groups.entries()).sort(([a], [b]) => a - b);
  }, [sentItems]);

  const handleOpenModifierSheet = (product: Product) => {
    setSelectedProduct(product);
    setItemQuantity(1);
    setSelectedModifiers([]);
    setItemNotes("");
  };

  const handleCloseModifierSheet = () => {
    setSelectedProduct(null);
  };

  const handleToggleModifier = (modifier: {
    id: string;
    name: string;
    price: number;
  }) => {
    setSelectedModifiers((prev) => {
      const exists = prev.find((m) => m.modifierId === modifier.id);
      if (exists) {
        return prev.filter((m) => m.modifierId !== modifier.id);
      }
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

  const handleAddItemWithModifiers = () => {
    if (!order || !selectedProduct) return;
    addItemToOrder(order.id, selectedProduct, {
      quantity: itemQuantity,
      notes: itemNotes || undefined,
      modifiers: selectedModifiers,
      course: currentCourse,
    });
    handleCloseModifierSheet();
  };

  const handleUpdateQuantity = (itemId: string, quantity: number) => {
    if (!order) return;
    const item = order.items.find((i) => i.id === itemId);
    if (!item) return;
    dispatch({
      type: "UPDATE_ORDER_ITEM",
      payload: { orderId: order.id, item: { ...item, quantity } },
    });
  };

  const handleRemoveItem = (itemId: string) => {
    if (!order) return;
    dispatch({
      type: "REMOVE_ORDER_ITEM",
      payload: { orderId: order.id, itemId },
    });
  };

  const handleSendToKitchen = () => {
    if (!order) return;
    sendToKitchen(order.id);
  };

  const handleRequestBill = () => {
    if (!order) return;
    requestBill(tableId, order.id);
    router.push(`/checkout/${tableId}`);
  };

  const handleCancelOrder = () => {
    if (!order) return;
    cancelOrder(order.id);
    router.push("/tables");
  };

  const handleToggleRush = () => {
    if (!order) return;
    dispatch({ type: "TOGGLE_RUSH", payload: order.id });
  };

  const handleTransfer = (toTableId: string) => {
    if (!order) return;
    transferTable(order.id, tableId, toTableId);
    router.push(`/orders/${toTableId}`);
  };

  const handleNewCourse = () => {
    setCurrentCourse((prev) => prev + 1);
  };

  const applicableModifiers = selectedProduct
    ? getModifiersForProduct(selectedProduct)
    : [];

  const sheetTotalPrice = selectedProduct
    ? calculateItemPrice(selectedProduct.price, selectedModifiers, itemQuantity)
    : 0;

  const renderModifiersText = (item: (typeof pendingItems)[0]) => {
    if (item.modifiers.length === 0) return null;
    const text = item.modifiers.map((m) => m.name).join(", ");
    return (
      <p className="text-xs text-amber-600 dark:text-amber-400 truncate">
        {text}
      </p>
    );
  };

  const renderItemsWithCourses = (
    groups: [number, typeof pendingItems][],
    disabled: boolean,
  ) => {
    return groups.map(([course, items], groupIndex) => (
      <div key={course} className="space-y-2">
        {(groups.length > 1 || course > 1) && groupIndex >= 0 && (
          <CourseSeparator courseNumber={course} />
        )}
        {items.map((item) => (
          <div key={item.id} className="space-y-0.5">
            <OrderItemCard
              item={item}
              onUpdateQuantity={handleUpdateQuantity}
              onRemove={handleRemoveItem}
              disabled={disabled}
            />
            {renderModifiersText(item)}
          </div>
        ))}
      </div>
    ));
  };

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
            {order?.items.length || 0} προϊόντα •{" "}
            {formatPrice(order?.total || 0)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {order && (
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                order.isRush && "text-red-500 hover:text-red-600 bg-red-500/10",
              )}
              onClick={handleToggleRush}
              title={order.isRush ? "Ακύρωση RUSH" : "RUSH"}
            >
              <AlertTriangle
                className={cn("size-5", order.isRush && "fill-red-500")}
              />
            </Button>
          )}
          {order && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsTransferOpen(true)}
              title="Μεταφορά τραπεζιού"
            >
              <ArrowRightLeft className="size-5" />
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
                  onClick={() => setSelectedCategory(category.id)}
                  className="shrink-0"
                >
                  {category.name}
                </Button>
              ))}
            </div>
          </ScrollArea>

          {/* Products Grid */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {products.map((product) => (
              <MenuItemCard
                key={product.id}
                product={product}
                onAdd={handleOpenModifierSheet}
              />
            ))}
          </div>
        </div>

        {/* Order Summary */}
        <Card className="h-fit lg:sticky lg:top-4">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between">
              <span>Παραγγελία</span>
              {order && order.items.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={handleCancelOrder}
                >
                  <Trash2 className="size-4 mr-1" />
                  Ακύρωση
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!order || order.items.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-8">
                Δεν υπάρχουν προϊόντα
              </p>
            ) : (
              <>
                {/* Pending Items grouped by course */}
                {pendingItems.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase">
                      Προς αποστολή ({pendingItems.length})
                    </p>
                    {renderItemsWithCourses(pendingByCourse, false)}

                    {/* New Course button */}
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full mt-2"
                      onClick={handleNewCourse}
                    >
                      <Plus className="size-3 mr-1" />
                      Νέο Course
                    </Button>
                  </div>
                )}

                {/* Sent Items grouped by course */}
                {sentItems.length > 0 && (
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
                    <span>{formatPrice(order.total - order.vatAmount)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">ΦΠΑ</span>
                    <span>{formatPrice(order.vatAmount)}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-lg">
                    <span>Σύνολο</span>
                    <span>{formatPrice(order.total)}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="space-y-2 pt-2">
                  {pendingItems.length > 0 && (
                    <Button
                      className="w-full"
                      size="lg"
                      onClick={handleSendToKitchen}
                    >
                      <Send className="size-4 mr-2" />
                      Αποστολή στην Κουζίνα
                    </Button>
                  )}

                  {/* RUSH toggle in actions */}
                  {hasKitchenItems && (
                    <Button
                      variant={order.isRush ? "destructive" : "outline"}
                      className="w-full"
                      onClick={handleToggleRush}
                    >
                      <AlertTriangle className="size-4 mr-2" />
                      {order.isRush ? "Ακύρωση RUSH" : "Σήμανση RUSH"}
                    </Button>
                  )}

                  {order.items.length > 0 && pendingItems.length === 0 && (
                    <Button
                      className="w-full"
                      size="lg"
                      variant="outline"
                      onClick={handleRequestBill}
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
          if (!open) handleCloseModifierSheet();
        }}
      >
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{selectedProduct?.name}</SheetTitle>
            {selectedProduct && (
              <p className="text-sm text-muted-foreground">
                {formatPrice(selectedProduct.price)}
              </p>
            )}
          </SheetHeader>

          <div className="flex flex-col gap-6 px-4 pb-4 flex-1">
            {/* Quantity Selector */}
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
                Ποσότητα
              </p>
              <div className="flex items-center gap-3">
                <Button
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
            {applicableModifiers.length > 0 && (
              <ModifierChips
                modifiers={applicableModifiers}
                selected={selectedModifiers}
                onToggle={handleToggleModifier}
              />
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
              >
                Προσθήκη
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Table Transfer Dialog */}
      {order && (
        <TableTransferDialog
          open={isTransferOpen}
          onOpenChange={setIsTransferOpen}
          currentTableId={tableId}
          orderId={order.id}
          onTransfer={handleTransfer}
        />
      )}
    </div>
  );
}
