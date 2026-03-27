"use client";

import { useState } from "react";
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Check,
  X,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { usePOS } from "@/lib/pos-context";
import { formatPrice, generateId } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import type { Product, Category } from "@/lib/types";
import { ModifierManager } from "@/components/pos/modifier-manager";

type Tab = "menu" | "modifiers";

export default function MenuPage() {
  const { state, dispatch, getProductsByCategory } = usePOS();
  const [selectedTab, setSelectedTab] = useState<Tab>("menu");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  // Product form state
  const [productForm, setProductForm] = useState({
    name: "",
    price: "",
    categoryId: "",
    description: "",
    vatRate: "13" as "13" | "24",
  });

  // Category form state
  const [categoryForm, setCategoryForm] = useState({
    name: "",
  });

  if (!state.isLoaded) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-6 lg:grid-cols-4">
          <Skeleton className="h-96" />
          <div className="lg:col-span-3 space-y-4">
            <Skeleton className="h-12 w-full" />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-32 rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const activeCategory = selectedCategory || state.categories[0]?.id;
  const products = activeCategory
    ? getProductsByCategory(activeCategory)
    : state.products;

  const filteredProducts = searchQuery
    ? state.products.filter((p) =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : products;

  const handleOpenProductDialog = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setProductForm({
        name: product.name,
        price: product.price.toString(),
        categoryId: product.categoryId,
        description: product.description || "",
        vatRate: product.vatRate.toString() as "13" | "24",
      });
    } else {
      setEditingProduct(null);
      setProductForm({
        name: "",
        price: "",
        categoryId: activeCategory || "",
        description: "",
        vatRate: "13",
      });
    }
    setProductDialogOpen(true);
  };

  const handleSaveProduct = () => {
    const productData: Product = {
      id: editingProduct?.id || generateId(),
      name: productForm.name,
      price: parseFloat(productForm.price) || 0,
      categoryId: productForm.categoryId,
      description: productForm.description || undefined,
      vatRate: parseInt(productForm.vatRate) as 13 | 24,
      available: editingProduct?.available ?? true,
    };

    if (editingProduct) {
      dispatch({ type: "UPDATE_PRODUCT", payload: productData });
    } else {
      dispatch({ type: "ADD_PRODUCT", payload: productData });
    }

    setProductDialogOpen(false);
    setEditingProduct(null);
  };

  const handleDeleteProduct = (productId: string) => {
    dispatch({ type: "DELETE_PRODUCT", payload: productId });
  };

  const handleToggleAvailability = (productId: string) => {
    dispatch({ type: "TOGGLE_PRODUCT_AVAILABILITY", payload: productId });
  };

  const handleOpenCategoryDialog = (category?: Category) => {
    if (category) {
      setEditingCategory(category);
      setCategoryForm({ name: category.name });
    } else {
      setEditingCategory(null);
      setCategoryForm({ name: "" });
    }
    setCategoryDialogOpen(true);
  };

  const handleSaveCategory = () => {
    if (editingCategory) {
      dispatch({
        type: "UPDATE_CATEGORY",
        payload: { ...editingCategory, name: categoryForm.name },
      });
    } else {
      const newCategory: Category = {
        id: generateId(),
        name: categoryForm.name,
        order: state.categories.length + 1,
      };
      dispatch({ type: "ADD_CATEGORY", payload: newCategory });
    }

    setCategoryDialogOpen(false);
    setEditingCategory(null);
  };

  const handleDeleteCategory = (categoryId: string) => {
    // Check if category has products
    const hasProducts = state.products.some((p) => p.categoryId === categoryId);
    if (hasProducts) {
      alert("Δεν μπορείτε να διαγράψετε κατηγορία που περιέχει προϊόντα");
      return;
    }
    dispatch({ type: "DELETE_CATEGORY", payload: categoryId });
    if (selectedCategory === categoryId) {
      setSelectedCategory(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Διαχείριση Μενού
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {state.products.length} προϊόντα σε {state.categories.length}{" "}
            κατηγορίες
          </p>
        </div>
        {selectedTab === "menu" && (
          <Button onClick={() => handleOpenProductDialog()}>
            <Plus className="size-4 mr-2" />
            Νέο Προϊόν
          </Button>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 border-b border-border">
        {(["menu", "modifiers"] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setSelectedTab(tab)}
            className={cn(
              "px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px",
              selectedTab === tab
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {tab === "menu" ? "Μενού" : "Modifiers"}
          </button>
        ))}
      </div>

      {selectedTab === "modifiers" && <ModifierManager />}

      {selectedTab === "menu" && (
        <div className="grid gap-6 lg:grid-cols-4">
          {/* Categories Sidebar */}
          <Card className="h-fit">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Κατηγορίες</CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  onClick={() => handleOpenCategoryDialog()}
                >
                  <Plus className="size-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-1">
              <button
                onClick={() => setSelectedCategory(null)}
                className={cn(
                  "w-full flex items-center justify-between rounded-lg px-3 py-2 text-left transition-colors",
                  !selectedCategory
                    ? "bg-primary/10 text-primary"
                    : "hover:bg-muted",
                )}
              >
                <span>Όλα</span>
                <Badge variant="secondary">{state.products.length}</Badge>
              </button>
              {state.categories.map((category) => {
                const count = state.products.filter(
                  (p) => p.categoryId === category.id,
                ).length;
                return (
                  <div
                    key={category.id}
                    className={cn(
                      "flex items-center justify-between rounded-lg px-3 py-2 transition-colors group",
                      selectedCategory === category.id
                        ? "bg-primary/10 text-primary"
                        : "hover:bg-muted",
                    )}
                  >
                    <button
                      onClick={() => setSelectedCategory(category.id)}
                      className="flex-1 text-left"
                    >
                      {category.name}
                    </button>
                    <div className="flex items-center gap-1">
                      <Badge variant="secondary">{count}</Badge>
                      <button
                        onClick={() => handleOpenCategoryDialog(category)}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-background rounded"
                      >
                        <Edit2 className="size-3" />
                      </button>
                      <button
                        onClick={() => handleDeleteCategory(category.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-background rounded text-destructive"
                      >
                        <Trash2 className="size-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Products Grid */}
          <div className="lg:col-span-3 space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Αναζήτηση προϊόντων..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Products */}
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filteredProducts.map((product) => {
                const category = state.categories.find(
                  (c) => c.id === product.categoryId,
                );
                return (
                  <Card
                    key={product.id}
                    className={cn(
                      "transition-all",
                      !product.available && "opacity-60",
                    )}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium truncate">
                              {product.name}
                            </h3>
                            {!product.available && (
                              <Badge variant="destructive" className="text-xs">
                                Εξαντλήθηκε
                              </Badge>
                            )}
                          </div>
                          {product.description && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              {product.description}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="outline" className="text-xs">
                              {category?.name}
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              ΦΠΑ {product.vatRate}%
                            </Badge>
                          </div>
                        </div>
                        <span className="text-lg font-bold whitespace-nowrap">
                          {formatPrice(product.price)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-4 pt-3 border-t border-border">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleAvailability(product.id)}
                        >
                          {product.available ? (
                            <>
                              <ToggleRight className="size-4 mr-1 text-primary" />
                              Διαθέσιμο
                            </>
                          ) : (
                            <>
                              <ToggleLeft className="size-4 mr-1" />
                              Μη Διαθέσιμο
                            </>
                          )}
                        </Button>
                        <div className="flex-1" />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          onClick={() => handleOpenProductDialog(product)}
                        >
                          <Edit2 className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 text-destructive"
                          onClick={() => handleDeleteProduct(product.id)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {filteredProducts.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                Δεν βρέθηκαν προϊόντα
              </div>
            )}
          </div>
        </div>
      )}

      {/* Product Dialog */}
      <Dialog open={productDialogOpen} onOpenChange={setProductDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingProduct ? "Επεξεργασία Προϊόντος" : "Νέο Προϊόν"}
            </DialogTitle>
            <DialogDescription>
              Συμπληρώστε τα στοιχεία του προϊόντος
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Όνομα</Label>
              <Input
                id="name"
                value={productForm.name}
                onChange={(e) =>
                  setProductForm({ ...productForm, name: e.target.value })
                }
                placeholder="π.χ. Μουσακάς"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">Τιμή (EUR)</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  value={productForm.price}
                  onChange={(e) =>
                    setProductForm({ ...productForm, price: e.target.value })
                  }
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vatRate">ΦΠΑ</Label>
                <Select
                  value={productForm.vatRate}
                  onValueChange={(value) =>
                    setProductForm({
                      ...productForm,
                      vatRate: value as "13" | "24",
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="13">13% (Τρόφιμα)</SelectItem>
                    <SelectItem value="24">24% (Ποτά)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Κατηγορία</Label>
              <Select
                value={productForm.categoryId}
                onValueChange={(value) =>
                  setProductForm({ ...productForm, categoryId: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Επιλέξτε κατηγορία" />
                </SelectTrigger>
                <SelectContent>
                  {state.categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Περιγραφή (προαιρετικά)</Label>
              <Textarea
                id="description"
                value={productForm.description}
                onChange={(e) =>
                  setProductForm({
                    ...productForm,
                    description: e.target.value,
                  })
                }
                placeholder="Σύντομη περιγραφή του προϊόντος..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setProductDialogOpen(false)}
            >
              Ακύρωση
            </Button>
            <Button
              onClick={handleSaveProduct}
              disabled={
                !productForm.name ||
                !productForm.price ||
                !productForm.categoryId
              }
            >
              {editingProduct ? "Αποθήκευση" : "Προσθήκη"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Category Dialog */}
      <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? "Επεξεργασία Κατηγορίας" : "Νέα Κατηγορία"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="categoryName">Όνομα</Label>
              <Input
                id="categoryName"
                value={categoryForm.name}
                onChange={(e) => setCategoryForm({ name: e.target.value })}
                placeholder="π.χ. Ορεκτικά"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCategoryDialogOpen(false)}
            >
              Ακύρωση
            </Button>
            <Button onClick={handleSaveCategory} disabled={!categoryForm.name}>
              {editingCategory ? "Αποθήκευση" : "Προσθήκη"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
