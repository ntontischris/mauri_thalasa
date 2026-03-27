"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSuppliers } from "@/hooks/use-suppliers";
import { useInventory } from "@/hooks/use-inventory";
import { formatPrice, formatDateTime } from "@/lib/mock-data";
import { SupplierOrderForm } from "@/components/pos/supplier-order-form";
import type {
  Supplier,
  IngredientCategory,
  SupplierOrderStatus,
} from "@/lib/types";

const CATEGORY_LABELS: Record<IngredientCategory, string> = {
  seafood: "Θαλασσινά",
  meat: "Κρέας",
  dairy: "Γαλακτοκομικά",
  vegetables: "Λαχανικά",
  dry: "Ξηρά",
  drinks: "Ποτά",
  other: "Άλλο",
};

const ALL_CATEGORIES: IngredientCategory[] = [
  "seafood",
  "meat",
  "dairy",
  "vegetables",
  "dry",
  "drinks",
  "other",
];

const STATUS_CONFIG: Record<
  SupplierOrderStatus,
  { label: string; className: string }
> = {
  draft: { label: "Πρόχειρη", className: "bg-gray-100 text-gray-700" },
  sent: { label: "Απεστάλη", className: "bg-blue-100 text-blue-700" },
  received: { label: "Παραλήφθηκε", className: "bg-green-100 text-green-700" },
};

const DEFAULT_SUPPLIER_FORM = {
  name: "",
  phone: "",
  email: "",
  categories: [] as IngredientCategory[],
};

function SupplierForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: typeof DEFAULT_SUPPLIER_FORM;
  onSave: (data: Omit<Supplier, "id">) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState(initial ?? DEFAULT_SUPPLIER_FORM);

  const isValid = form.name.trim() !== "";

  const toggleCategory = (cat: IngredientCategory) => {
    setForm((prev) => ({
      ...prev,
      categories: prev.categories.includes(cat)
        ? prev.categories.filter((c) => c !== cat)
        : [...prev.categories, cat],
    }));
  };

  const handleSave = () => {
    if (!isValid) return;
    onSave({
      name: form.name.trim(),
      phone: form.phone.trim() || undefined,
      email: form.email.trim() || undefined,
      categories: form.categories,
    });
  };

  return (
    <div className="rounded-md border border-border bg-muted/30 p-4 space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="space-y-1">
          <Label>Όνομα *</Label>
          <Input
            value={form.name}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, name: e.target.value }))
            }
            placeholder="Επωνυμία"
          />
        </div>
        <div className="space-y-1">
          <Label>Τηλέφωνο</Label>
          <Input
            value={form.phone}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, phone: e.target.value }))
            }
            placeholder="210 000 0000"
          />
        </div>
        <div className="space-y-1">
          <Label>Email</Label>
          <Input
            value={form.email}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, email: e.target.value }))
            }
            placeholder="info@supplier.gr"
          />
        </div>
      </div>

      <div className="space-y-1">
        <Label>Κατηγορίες</Label>
        <div className="flex flex-wrap gap-2">
          {ALL_CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => toggleCategory(cat)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                form.categories.includes(cat)
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-2 justify-end">
        <Button variant="outline" size="sm" onClick={onCancel}>
          Ακύρωση
        </Button>
        <Button size="sm" onClick={handleSave} disabled={!isValid}>
          Αποθήκευση
        </Button>
      </div>
    </div>
  );
}

export function SupplierList() {
  const {
    suppliers,
    supplierOrders,
    addSupplier,
    updateSupplier,
    deleteSupplier,
    sendOrder,
    receiveOrder,
  } = useSuppliers();
  const { ingredients } = useInventory();

  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [orderFormOpen, setOrderFormOpen] = useState(false);

  const sortedOrders = [...supplierOrders].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  const getOrderTotal = (orderId: string) => {
    const order = supplierOrders.find((o) => o.id === orderId);
    if (!order) return 0;
    return order.items.reduce((sum, item) => sum + item.estimatedCost, 0);
  };

  const findSupplier = (id: string) => suppliers.find((s) => s.id === id);

  return (
    <div className="space-y-6">
      {/* Suppliers section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Προμηθευτές</CardTitle>
          <Button
            size="sm"
            onClick={() => {
              setShowAddForm(true);
              setEditingId(null);
            }}
          >
            <Plus className="size-4 mr-1" />
            Προμηθευτής
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {showAddForm && (
            <SupplierForm
              onSave={(data) => {
                addSupplier(data);
                setShowAddForm(false);
              }}
              onCancel={() => setShowAddForm(false)}
            />
          )}

          {suppliers.length === 0 && !showAddForm ? (
            <p className="py-4 text-center text-muted-foreground">
              Δεν υπάρχουν προμηθευτές
            </p>
          ) : (
            <ul className="space-y-2">
              {suppliers.map((supplier) =>
                editingId === supplier.id ? (
                  <li key={supplier.id}>
                    <SupplierForm
                      initial={{
                        name: supplier.name,
                        phone: supplier.phone ?? "",
                        email: supplier.email ?? "",
                        categories: supplier.categories,
                      }}
                      onSave={(data) => {
                        updateSupplier({ ...supplier, ...data });
                        setEditingId(null);
                      }}
                      onCancel={() => setEditingId(null)}
                    />
                  </li>
                ) : (
                  <li
                    key={supplier.id}
                    className="flex items-center justify-between gap-3 rounded-md border border-border p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">{supplier.name}</p>
                      <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-sm text-muted-foreground">
                        {supplier.phone && <span>{supplier.phone}</span>}
                        {supplier.email && <span>{supplier.email}</span>}
                      </div>
                      {supplier.categories.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {supplier.categories.map((cat) => (
                            <Badge
                              key={cat}
                              variant="secondary"
                              className="text-xs"
                            >
                              {CATEGORY_LABELS[cat]}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        onClick={() => setEditingId(supplier.id)}
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-destructive hover:text-destructive"
                        onClick={() => deleteSupplier(supplier.id)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </li>
                ),
              )}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Orders section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Παραγγελίες</CardTitle>
          <Button size="sm" onClick={() => setOrderFormOpen(true)}>
            <Plus className="size-4 mr-1" />
            Νέα Παραγγελία
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {sortedOrders.length === 0 ? (
            <p className="py-4 text-center text-muted-foreground">
              Δεν υπάρχουν παραγγελίες
            </p>
          ) : (
            sortedOrders.map((order) => {
              const supplier = findSupplier(order.supplierId);
              const total = getOrderTotal(order.id);
              const status = STATUS_CONFIG[order.status];
              const isExpanded = expandedOrderId === order.id;

              return (
                <div
                  key={order.id}
                  className="rounded-md border border-border overflow-hidden"
                >
                  <div className="flex items-center gap-3 p-3">
                    <button
                      className="flex flex-1 items-center gap-3 text-left min-w-0"
                      onClick={() =>
                        setExpandedOrderId(isExpanded ? null : order.id)
                      }
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">{supplier?.name ?? "—"}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatDateTime(order.createdAt)} &middot;{" "}
                          {order.items.length} είδη &middot;{" "}
                          {formatPrice(total)}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${status.className}`}
                      >
                        {status.label}
                      </span>
                      {isExpanded ? (
                        <ChevronUp className="size-4 shrink-0 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
                      )}
                    </button>

                    <div className="flex shrink-0 gap-1">
                      {order.status === "draft" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => sendOrder(order.id)}
                        >
                          Αποστολή
                        </Button>
                      )}
                      {order.status === "sent" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => receiveOrder(order.id)}
                        >
                          Παραλαβή
                        </Button>
                      )}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-border bg-muted/30 px-3 pb-3 pt-2">
                      {order.notes && (
                        <p className="mb-2 text-sm text-muted-foreground">
                          {order.notes}
                        </p>
                      )}
                      <ul className="space-y-1">
                        {order.items.map((item, i) => {
                          const ing = ingredients.find(
                            (ing) => ing.id === item.ingredientId,
                          );
                          return (
                            <li
                              key={i}
                              className="flex items-center justify-between text-sm"
                            >
                              <span>{ing?.name ?? "—"}</span>
                              <span className="text-muted-foreground">
                                {item.quantity} {ing?.unit}
                              </span>
                              <span className="font-medium">
                                {formatPrice(item.estimatedCost)}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <SupplierOrderForm open={orderFormOpen} onOpenChange={setOrderFormOpen} />
    </div>
  );
}
