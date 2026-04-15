"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toggleProductAvailability } from "@/lib/actions/products";
import { toast } from "sonner";
import type { DbProduct, DbCategory } from "@/lib/types/database";

interface MenuListProps {
  initialProducts: DbProduct[];
  initialCategories: DbCategory[];
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat("el-GR", {
    style: "currency",
    currency: "EUR",
  }).format(price);
}

const stationLabels: Record<string, string> = {
  hot: "Κουζίνα",
  cold: "Κρύα",
  bar: "Μπαρ",
  dessert: "Γλυκά",
};

export function MenuList({
  initialProducts,
  initialCategories,
}: MenuListProps) {
  const [products, setProducts] = useState(initialProducts);
  const categories = initialCategories;

  const handleToggleAvailable = async (product: DbProduct) => {
    setProducts((prev) =>
      prev.map((p) =>
        p.id === product.id ? { ...p, available: !p.available } : p,
      ),
    );

    const result = await toggleProductAvailability(
      product.id,
      !product.available,
    );

    if (!result.success) {
      setProducts((prev) =>
        prev.map((p) =>
          p.id === product.id ? { ...p, available: product.available } : p,
        ),
      );
      toast.error(result.error);
    }
  };

  const allCategoryId = "all";

  return (
    <Tabs defaultValue={allCategoryId}>
      <TabsList className="flex-wrap">
        <TabsTrigger value={allCategoryId}>Όλα ({products.length})</TabsTrigger>
        {categories.map((cat) => {
          const count = products.filter((p) => p.category_id === cat.id).length;
          return (
            <TabsTrigger key={cat.id} value={cat.id}>
              {cat.name} ({count})
            </TabsTrigger>
          );
        })}
      </TabsList>

      <TabsContent value={allCategoryId} className="mt-4">
        <ProductGrid
          products={products}
          onToggleAvailable={handleToggleAvailable}
        />
      </TabsContent>

      {categories.map((cat) => (
        <TabsContent key={cat.id} value={cat.id} className="mt-4">
          <ProductGrid
            products={products.filter((p) => p.category_id === cat.id)}
            onToggleAvailable={handleToggleAvailable}
          />
        </TabsContent>
      ))}
    </Tabs>
  );
}

function ProductGrid({
  products,
  onToggleAvailable,
}: {
  products: DbProduct[];
  onToggleAvailable: (product: DbProduct) => void;
}) {
  if (products.length === 0) {
    return (
      <p className="py-8 text-center text-muted-foreground">
        Δεν βρέθηκαν προϊόντα
      </p>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {products.map((product) => (
        <Card
          key={product.id}
          className={!product.available ? "opacity-50" : undefined}
        >
          <CardContent className="flex items-start justify-between p-4">
            <div className="space-y-1">
              <p className="font-medium leading-tight">{product.name}</p>
              {product.code && (
                <p className="text-xs text-muted-foreground">{product.code}</p>
              )}
              <p className="text-lg font-bold text-primary">
                {formatPrice(product.price)}
              </p>
              <div className="flex gap-1">
                <Badge variant="secondary" className="text-xs">
                  {stationLabels[product.station] ?? product.station}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  ΦΠΑ {product.vat_rate}%
                </Badge>
              </div>
            </div>
            <Switch
              checked={product.available}
              onCheckedChange={() => onToggleAvailable(product)}
              aria-label={`${product.name} διαθεσιμότητα`}
            />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
