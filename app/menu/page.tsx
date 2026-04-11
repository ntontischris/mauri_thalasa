"use client";

import { useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  UtensilsCrossed,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  Send,
  Check,
  AlertTriangle,
  Leaf,
  WheatOff,
  MilkOff,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Standalone page - uses its own data (in production: fetches from Supabase)
// For now, inline the menu data from mock-data.ts

const categories = [
  { id: "cat1", name: "Ωμά" },
  { id: "cat2", name: "Κρύα Ορεκτικά" },
  { id: "cat3", name: "Ζεστά Ορεκτικά" },
  { id: "cat4", name: "Ψητά Θαλασσινά" },
  { id: "cat5", name: "Μαγειρευτά" },
  { id: "cat6", name: "Ζυμαρικά" },
  { id: "cat7", name: "Γλυκά" },
];

const products = [
  { id: "p1", name: "Καρπάτσιο Λαβρακιού", price: 16, categoryId: "cat1", description: "Φρέσκο φιλέτο λαβρακιού με ελαιόλαδο και λεμόνι", available: true, tags: ["gluten-free"] },
  { id: "p2", name: "Καρπάτσιο Μπαρμπουνιού", price: 18, categoryId: "cat1", description: "Φρέσκο μπαρμπούνι σε λεπτές φέτες", available: true, tags: ["gluten-free"] },
  { id: "p3", name: "Ταρτάρ Γαρίδας", price: 18, categoryId: "cat1", description: "Ωμή γαρίδα με αρωματικά", available: true, tags: ["gluten-free"] },
  { id: "p4", name: "Ταραμοσαλάτα Λευκή", price: 12, categoryId: "cat2", description: "Σπιτική λευκή ταραμοσαλάτα", available: true, tags: [] },
  { id: "p5", name: "Μελιτζανοσαλάτα", price: 8, categoryId: "cat2", description: "Καπνιστή μελιτζάνα με ελαιόλαδο", available: true, tags: ["vegan", "gluten-free"] },
  { id: "p6", name: "Καβουροσαλάτα", price: 16, categoryId: "cat2", description: "Φρέσκο καβούρι σε σαλάτα", available: true, tags: ["gluten-free"] },
  { id: "p7", name: "Χτένια Ωμά", price: 22, categoryId: "cat2", description: "Φρέσκα χτένια με λεμόνι", available: true, tags: ["gluten-free"] },
  { id: "p8", name: "Σαγανάκι Γαρίδες", price: 18, categoryId: "cat3", description: "Γαρίδες σαγανάκι με φέτα και ντομάτα", available: true, tags: [] },
  { id: "p9", name: "Αχνιστά Όστρακα", price: 16, categoryId: "cat3", description: "Όστρακα αχνιστά με κρασί", available: true, tags: ["gluten-free"] },
  { id: "p10", name: "Καλαμαράκια Τηγανητά", price: 14, categoryId: "cat3", description: "Τραγανά καλαμαράκια με λεμόνι", available: true, tags: [] },
  { id: "p11", name: "Γαρίδες Τηγανητές", price: 18, categoryId: "cat3", description: "Τηγανητές γαρίδες με σάλτσα", available: true, tags: [] },
  { id: "p12", name: "Τσιπούρα", price: 75, categoryId: "cat4", description: "Φρέσκια τσιπούρα σχάρας (κιλό)", available: true, tags: ["gluten-free"] },
  { id: "p13", name: "Μπαρμπούνι", price: 85, categoryId: "cat4", description: "Φρέσκο μπαρμπούνι σχάρας (κιλό)", available: true, tags: ["gluten-free"] },
  { id: "p14", name: "Φαγκρί", price: 95, categoryId: "cat4", description: "Φρέσκο φαγκρί σχάρας (κιλό)", available: true, tags: ["gluten-free"] },
  { id: "p15", name: "Συναγρίδα", price: 95, categoryId: "cat4", description: "Φρέσκια συναγρίδα σχάρας (κιλό)", available: true, tags: ["gluten-free"] },
  { id: "p16", name: "Γαρίδες Θερμαϊκού", price: 95, categoryId: "cat4", description: "Φρέσκιες γαρίδες σχάρας (κιλό)", available: true, tags: ["gluten-free"] },
  { id: "p17", name: "Καλαμάρι", price: 55, categoryId: "cat4", description: "Φρέσκο καλαμάρι σχάρας (κιλό)", available: true, tags: ["gluten-free"] },
  { id: "p18", name: "Χταπόδι", price: 48, categoryId: "cat4", description: "Χταπόδι σχάρας (κιλό)", available: true, tags: ["gluten-free"] },
  { id: "p19", name: "Ψαρόσουπα", price: 90, categoryId: "cat5", description: "Παραδοσιακή ψαρόσουπα", available: true, tags: ["gluten-free"] },
  { id: "p20", name: "Φρικασέ", price: 120, categoryId: "cat5", description: "Φρικασέ θαλασσινών", available: true, tags: [] },
  { id: "p21", name: "Κοκκινιστό", price: 120, categoryId: "cat5", description: "Θαλασσινά κοκκινιστά", available: true, tags: ["gluten-free"] },
  { id: "p22", name: "Πλακί", price: 140, categoryId: "cat5", description: "Ψάρι πλακί στο φούρνο", available: true, tags: ["gluten-free"] },
  { id: "p23", name: "Γαριδομακαρονάδα", price: 28, categoryId: "cat6", description: "Λιγκουίνι με γαρίδες", available: true, tags: [] },
  { id: "p24", name: "Αστακομακαρονάδα", price: 45, categoryId: "cat6", description: "Λιγκουίνι με αστακό", available: true, tags: [] },
  { id: "p25", name: "Μπακλαβάς", price: 20, categoryId: "cat7", description: "Παραδοσιακός μπακλαβάς", available: true, tags: [] },
  { id: "p26", name: "Τιραμισού", price: 14, categoryId: "cat7", description: "Κλασικό ιταλικό τιραμισού", available: true, tags: [] },
  { id: "p27", name: "Lemon Bar", price: 12, categoryId: "cat7", description: "Lemon bar με βουτυράτη βάση", available: true, tags: [] },
  { id: "p28", name: "Cheesecake", price: 14, categoryId: "cat7", description: "New York cheesecake", available: true, tags: [] },
];

interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  notes?: string;
}

const TAG_ICONS: Record<string, { icon: typeof Leaf; label: string; color: string }> = {
  vegan: { icon: Leaf, label: "Vegan", color: "text-green-600" },
  "gluten-free": { icon: WheatOff, label: "Χωρίς γλουτένη", color: "text-amber-600" },
  "lactose-free": { icon: MilkOff, label: "Χωρίς λακτόζη", color: "text-blue-600" },
};

export default function DigitalMenuPage() {
  const searchParams = useSearchParams();
  const tableId = searchParams.get("table");
  const tableNumber = searchParams.get("num") ?? tableId;

  const [selectedCategory, setSelectedCategory] = useState(categories[0].id);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [orderSent, setOrderSent] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [dietFilter, setDietFilter] = useState<string | null>(null);

  const filteredProducts = useMemo(() => {
    let filtered = products.filter((p) => p.available);

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) => p.name.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q),
      );
    } else {
      filtered = filtered.filter((p) => p.categoryId === selectedCategory);
    }

    if (dietFilter) {
      filtered = filtered.filter((p) => p.tags.includes(dietFilter));
    }

    return filtered;
  }, [selectedCategory, searchQuery, dietFilter]);

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const addToCart = (product: typeof products[0]) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.productId === product.id);
      if (existing) {
        return prev.map((i) =>
          i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i,
        );
      }
      return [...prev, { productId: product.id, name: product.name, price: product.price, quantity: 1 }];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((i) => (i.productId === productId ? { ...i, quantity: i.quantity + delta } : i))
        .filter((i) => i.quantity > 0),
    );
  };

  const handleSendOrder = () => {
    // In production: supabase.from('orders').insert(...) or call RPC
    setOrderSent(true);
    setCart([]);
    setCartOpen(false);
  };

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("el-GR", { style: "currency", currency: "EUR" }).format(price);

  if (orderSent) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-background to-muted/30 p-4">
        <Card className="w-full max-w-sm text-center">
          <CardContent className="pt-8 pb-8">
            <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-green-500/10">
              <Check className="size-8 text-green-600" />
            </div>
            <h2 className="text-xl font-bold">Η παραγγελία σας στάλθηκε!</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {tableNumber && `Τραπέζι ${tableNumber} - `}Θα ετοιμαστεί σύντομα.
            </p>
            <Button className="mt-6" onClick={() => setOrderSent(false)}>
              Νέα Παραγγελία
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-card/95 backdrop-blur px-4 py-3">
        <div className="mx-auto flex max-w-lg items-center justify-between">
          <div className="flex items-center gap-2">
            <UtensilsCrossed className="size-5 text-primary" />
            <div>
              <h1 className="text-sm font-bold">Μαύρη Θάλασσα</h1>
              {tableNumber && (
                <p className="text-xs text-muted-foreground">Τραπέζι {tableNumber}</p>
              )}
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="relative"
            onClick={() => setCartOpen(true)}
          >
            <ShoppingCart className="mr-1 size-4" />
            {formatPrice(cartTotal)}
            {cartCount > 0 && (
              <Badge className="absolute -top-2 -right-2 size-5 justify-center rounded-full p-0 text-[10px]">
                {cartCount}
              </Badge>
            )}
          </Button>
        </div>
      </header>

      <div className="mx-auto w-full max-w-lg flex-1 px-4 pb-24">
        {/* Search */}
        <div className="mt-3 relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Αναζήτηση πιάτων..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Diet filters */}
        <div className="mt-3 flex gap-2">
          {Object.entries(TAG_ICONS).map(([key, { icon: Icon, label, color }]) => (
            <Button
              key={key}
              size="sm"
              variant={dietFilter === key ? "default" : "outline"}
              onClick={() => setDietFilter(dietFilter === key ? null : key)}
              className="text-xs"
            >
              <Icon className={cn("mr-1 size-3", dietFilter !== key && color)} />
              {label}
            </Button>
          ))}
        </div>

        {/* Category tabs */}
        {!searchQuery && (
          <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1">
            {categories.map((cat) => (
              <Button
                key={cat.id}
                size="sm"
                variant={selectedCategory === cat.id ? "default" : "outline"}
                onClick={() => setSelectedCategory(cat.id)}
                className="shrink-0 text-xs"
              >
                {cat.name}
              </Button>
            ))}
          </div>
        )}

        {/* Products */}
        <div className="mt-4 space-y-3">
          {filteredProducts.map((product) => {
            const inCart = cart.find((i) => i.productId === product.id);
            return (
              <div
                key={product.id}
                className="flex items-center gap-3 rounded-xl border bg-card p-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="font-medium text-sm">{product.name}</p>
                    {product.tags.map((tag) => {
                      const info = TAG_ICONS[tag];
                      if (!info) return null;
                      const TagIcon = info.icon;
                      return <TagIcon key={tag} className={cn("size-3.5", info.color)} title={info.label} />;
                    })}
                  </div>
                  {product.description && (
                    <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">{product.description}</p>
                  )}
                  <p className="mt-1 font-semibold text-primary">{formatPrice(product.price)}</p>
                </div>

                {inCart ? (
                  <div className="flex items-center gap-1">
                    <Button size="icon" variant="outline" className="size-7" onClick={() => updateQuantity(product.id, -1)}>
                      <Minus className="size-3" />
                    </Button>
                    <span className="w-6 text-center text-sm font-bold">{inCart.quantity}</span>
                    <Button size="icon" variant="outline" className="size-7" onClick={() => updateQuantity(product.id, 1)}>
                      <Plus className="size-3" />
                    </Button>
                  </div>
                ) : (
                  <Button size="icon" className="size-9 rounded-full" onClick={() => addToCart(product)}>
                    <Plus className="size-4" />
                  </Button>
                )}
              </div>
            );
          })}

          {filteredProducts.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Δεν βρέθηκαν πιάτα
            </p>
          )}
        </div>
      </div>

      {/* Floating cart bar */}
      {cartCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-card/95 backdrop-blur p-3">
          <div className="mx-auto max-w-lg">
            <Button className="w-full" size="lg" onClick={() => setCartOpen(true)}>
              <ShoppingCart className="mr-2 size-4" />
              Δείτε την παραγγελία ({cartCount}) - {formatPrice(cartTotal)}
            </Button>
          </div>
        </div>
      )}

      {/* Cart dialog */}
      <Dialog open={cartOpen} onOpenChange={setCartOpen}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingCart className="size-5" />
              Η Παραγγελία σας
              {tableNumber && <Badge variant="outline">Τραπέζι {tableNumber}</Badge>}
            </DialogTitle>
          </DialogHeader>

          {cart.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Το καλάθι είναι κενό
            </p>
          ) : (
            <div className="space-y-3">
              {cart.map((item) => (
                <div key={item.productId} className="flex items-center justify-between rounded-lg border p-3">
                  <div className="flex-1">
                    <p className="text-sm font-medium">{item.name}</p>
                    <p className="text-xs text-muted-foreground">{formatPrice(item.price)} x {item.quantity}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">{formatPrice(item.price * item.quantity)}</span>
                    <div className="flex items-center gap-1">
                      <Button size="icon" variant="ghost" className="size-6" onClick={() => updateQuantity(item.productId, -1)}>
                        <Minus className="size-3" />
                      </Button>
                      <span className="w-5 text-center text-xs font-bold">{item.quantity}</span>
                      <Button size="icon" variant="ghost" className="size-6" onClick={() => updateQuantity(item.productId, 1)}>
                        <Plus className="size-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}

              <div className="border-t pt-3">
                <div className="flex justify-between text-lg font-bold">
                  <span>Σύνολο</span>
                  <span>{formatPrice(cartTotal)}</span>
                </div>
              </div>

              <Button className="w-full" size="lg" onClick={handleSendOrder}>
                <Send className="mr-2 size-4" />
                Αποστολή Παραγγελίας
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
