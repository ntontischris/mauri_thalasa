"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Plus, Pencil, Trash2, Settings, Search } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  toggleProductAvailability,
  deleteProduct,
} from "@/lib/actions/products";
import { createCategory } from "@/lib/actions/categories";
import { ProductFormSheet } from "./product-form-sheet";
import type { DbProduct, DbCategory, DbCourse } from "@/lib/types/database";

interface MenuListProps {
  initialProducts: DbProduct[];
  initialCategories: DbCategory[];
  initialCourses: DbCourse[];
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat("el-GR", {
    style: "currency",
    currency: "EUR",
  }).format(price);
}

const stationLabels: Record<DbProduct["station"], string> = {
  hot: "Κουζίνα",
  cold: "Κρύα",
  bar: "Μπαρ",
  dessert: "Γλυκά",
};

const UNASSIGNED_KEY = "__unassigned__";

export function MenuList({
  initialProducts,
  initialCategories,
  initialCourses,
}: MenuListProps) {
  const [products, setProducts] = useState<DbProduct[]>(initialProducts);
  const [categories, setCategories] = useState<DbCategory[]>(initialCategories);
  const [isPending, startTransition] = useTransition();

  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<DbProduct | null>(null);

  const firstAssignedCategory = categories.find((c) => c.course_id !== null);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(
    firstAssignedCategory?.course_id ?? initialCourses[0]?.id ?? null,
  );
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    firstAssignedCategory?.id ?? null,
  );

  const coursesWithCategories = useMemo(
    () =>
      initialCourses.filter((course) =>
        categories.some((cat) => cat.course_id === course.id),
      ),
    [initialCourses, categories],
  );

  const hasUnassigned = categories.some((c) => c.course_id === null);
  const unassignedCount = categories.filter((c) => c.course_id === null).length;

  const activeCourseKey =
    selectedCourseId &&
    (selectedCourseId === UNASSIGNED_KEY ||
      coursesWithCategories.some((c) => c.id === selectedCourseId))
      ? selectedCourseId
      : (coursesWithCategories[0]?.id ??
        (hasUnassigned ? UNASSIGNED_KEY : null));

  const categoriesInCourse = useMemo(() => {
    if (activeCourseKey === UNASSIGNED_KEY) {
      return categories.filter((c) => c.course_id === null);
    }
    return categories.filter((c) => c.course_id === activeCourseKey);
  }, [categories, activeCourseKey]);

  const activeCategory =
    selectedCategoryId &&
    categoriesInCourse.some((c) => c.id === selectedCategoryId)
      ? selectedCategoryId
      : (categoriesInCourse[0]?.id ?? null);

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase();
    let list = activeCategory
      ? products.filter((p) => p.category_id === activeCategory)
      : [];
    if (term) {
      list = list.filter((p) => p.name.toLowerCase().includes(term));
    }
    return list.sort((a, b) => a.name.localeCompare(b.name, "el"));
  }, [products, activeCategory, search]);

  const handleCourseChange = (courseId: string) => {
    setSelectedCourseId(courseId);
    const target =
      courseId === UNASSIGNED_KEY
        ? categories.find((c) => c.course_id === null)
        : categories.find((c) => c.course_id === courseId);
    setSelectedCategoryId(target?.id ?? null);
  };

  const handleToggleAvailable = async (product: DbProduct) => {
    const previous = product.available;
    setProducts((prev) =>
      prev.map((p) =>
        p.id === product.id ? { ...p, available: !p.available } : p,
      ),
    );

    const result = await toggleProductAvailability(product.id, !previous);
    if (!result.success) {
      setProducts((prev) =>
        prev.map((p) =>
          p.id === product.id ? { ...p, available: previous } : p,
        ),
      );
      toast.error(result.error ?? "Αποτυχία");
    }
  };

  const handleDeleteProduct = (product: DbProduct) => {
    if (!window.confirm(`Διαγραφή προϊόντος "${product.name}";`)) return;
    const previous = products;
    setProducts((prev) => prev.filter((p) => p.id !== product.id));
    startTransition(async () => {
      const r = await deleteProduct(product.id);
      if (!r.success) {
        toast.error(r.error ?? "Αποτυχία");
        setProducts(previous);
      } else {
        toast.success("Διαγράφηκε");
      }
    });
  };

  const handleNewCategory = () => {
    const name = window.prompt("Όνομα νέας κατηγορίας:");
    if (!name || !name.trim()) return;
    const trimmed = name.trim();
    startTransition(async () => {
      const r = await createCategory({
        name: trimmed,
        sort_order: categories.length + 1,
      });
      if (!r.success || !r.data) {
        toast.error(r.error ?? "Αποτυχία");
        return;
      }
      setCategories((prev) => [
        ...prev,
        {
          id: r.data!.id,
          name: trimmed,
          sort_order: categories.length + 1,
          course_id: null,
          legacy_id: null,
          source: "manual",
          metadata: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]);
      toast.success(
        "Η κατηγορία προστέθηκε. Ανέθεσέ την σε πιάτο στις Ρυθμίσεις.",
      );
    });
  };

  const openCreateProduct = () => {
    setEditingProduct(null);
    setFormOpen(true);
  };

  const openEditProduct = (product: DbProduct) => {
    setEditingProduct(product);
    setFormOpen(true);
  };

  return (
    <div className="space-y-4">
      {/* Header actions */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            placeholder="Αναζήτηση προϊόντος..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <Button onClick={openCreateProduct} disabled={categories.length === 0}>
          <Plus className="mr-1 size-4" />
          Νέο Προϊόν
        </Button>

        <Button variant="outline" onClick={handleNewCategory}>
          <Plus className="mr-1 size-4" />
          Κατηγορία
        </Button>

        <Button variant="outline" asChild>
          <Link href="/settings/courses">
            <Settings className="mr-1 size-4" />
            Πιάτα
          </Link>
        </Button>
      </div>

      {unassignedCount > 0 && (
        <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 px-4 py-2 text-sm text-amber-700 dark:text-amber-400">
          {unassignedCount} ανενεργές κατηγορίες — ανέθεσέ τες σε πιάτο στις{" "}
          <Link
            href="/settings/courses"
            className="font-medium underline underline-offset-2"
          >
            Ρυθμίσεις Πιάτων
          </Link>{" "}
          για να εμφανιστούν στις παραγγελίες.
        </div>
      )}

      {coursesWithCategories.length === 0 && !hasUnassigned ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          Δεν υπάρχουν κατηγορίες. Πάτα «Κατηγορία» για να προσθέσεις.
        </div>
      ) : (
        <>
          <ScrollArea className="w-full">
            <div className="flex gap-2 pb-2">
              {coursesWithCategories.map((course) => {
                const isActive = activeCourseKey === course.id;
                return (
                  <button
                    key={course.id}
                    type="button"
                    onClick={() => handleCourseChange(course.id)}
                    className={cn(
                      "shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition",
                      isActive
                        ? "border-transparent text-white shadow-sm"
                        : "border-border bg-card text-muted-foreground hover:border-primary/50",
                    )}
                    style={
                      isActive && course.color
                        ? { backgroundColor: course.color }
                        : isActive
                          ? { backgroundColor: "hsl(var(--primary))" }
                          : course.color
                            ? {
                                borderColor: course.color,
                                color: course.color,
                              }
                            : {}
                    }
                  >
                    {course.name}
                  </button>
                );
              })}
              {hasUnassigned && (
                <button
                  type="button"
                  onClick={() => handleCourseChange(UNASSIGNED_KEY)}
                  className={cn(
                    "shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition",
                    activeCourseKey === UNASSIGNED_KEY
                      ? "border-amber-500 bg-amber-500/20 text-amber-700 dark:text-amber-400"
                      : "border-dashed border-amber-500/50 bg-amber-500/5 text-amber-600",
                  )}
                >
                  Ανενεργές ({unassignedCount})
                </button>
              )}
            </div>
          </ScrollArea>

          {categoriesInCourse.length > 0 && (
            <ScrollArea className="w-full">
              <div className="flex gap-2 pb-2">
                {categoriesInCourse.map((category) => (
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
                    <Badge variant="secondary" className="ml-2 text-[10px]">
                      {
                        products.filter((p) => p.category_id === category.id)
                          .length
                      }
                    </Badge>
                  </Button>
                ))}
              </div>
            </ScrollArea>
          )}
        </>
      )}

      {filteredProducts.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          {search
            ? `Δεν βρέθηκαν προϊόντα για "${search}"`
            : "Δεν υπάρχουν προϊόντα σε αυτή την κατηγορία"}
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredProducts.map((product) => (
            <Card
              key={product.id}
              className={cn(
                "group transition",
                !product.available && "opacity-60",
              )}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{product.name}</p>
                    {product.description && (
                      <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                        {product.description}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-7"
                      onClick={() => openEditProduct(product)}
                      aria-label="Επεξεργασία"
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-7 text-destructive hover:text-destructive"
                      onClick={() => handleDeleteProduct(product)}
                      disabled={isPending}
                      aria-label="Διαγραφή"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between gap-2">
                  <span className="text-lg font-bold">
                    {formatPrice(product.price)}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <Badge variant="outline" className="text-[10px]">
                      {stationLabels[product.station]}
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">
                      ΦΠΑ {product.vat_rate}%
                    </Badge>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between gap-2 pt-2 border-t">
                  <span className="text-xs text-muted-foreground">
                    {product.available ? "Διαθέσιμο" : "Εξαντλήθηκε"}
                  </span>
                  <Switch
                    checked={product.available}
                    onCheckedChange={() => handleToggleAvailable(product)}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ProductFormSheet
        open={formOpen}
        onOpenChange={setFormOpen}
        categories={categories}
        defaultCategoryId={activeCategory}
        product={editingProduct}
      />
    </div>
  );
}
