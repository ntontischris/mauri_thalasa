"use client";

import { useMemo, useState, useTransition } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ChefHat,
  TrendingUp,
  AlertCircle,
  Plus,
  Search,
  Euro,
  BarChart3,
  Trash2,
  Pencil,
  X,
  Info,
  Clock,
  Users as UsersIcon,
  Gauge,
  ArrowUpDown,
  Sparkles,
  Wheat,
  Fish,
  Milk,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { saveRecipe, deleteRecipe } from "@/lib/actions/recipes";
import {
  calculateFoodCost,
  calculateMargin,
  suggestPrice,
  categorize,
  type CostCategory,
} from "@/lib/recipes/engine";
import type {
  RecipeWithIngredients,
  IngredientWithSupplier,
  DbProduct,
  DbCategory,
} from "@/lib/types/database";

interface RecipePanelProps {
  recipes: RecipeWithIngredients[];
  ingredients: IngredientWithSupplier[];
  products: DbProduct[];
  categories: DbCategory[];
}

const ALLERGEN_PRESETS = [
  "Γλουτένη",
  "Λακτόζη",
  "Ξηροί Καρποί",
  "Θαλασσινά",
  "Αυγά",
  "Σόγια",
  "Ψάρι",
  "Σέλινο",
  "Σινάπι",
  "Σουσάμι",
];

const CATEGORY_STYLES: Record<CostCategory, { label: string; className: string }> = {
  excellent: { label: "Εξαιρετικό", className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/40" },
  good:      { label: "Καλό",       className: "bg-sky-500/10 text-sky-600 border-sky-500/40" },
  warning:   { label: "Προσοχή",    className: "bg-amber-500/10 text-amber-600 border-amber-500/40" },
  danger:    { label: "Υψηλό",      className: "bg-rose-500/10 text-rose-600 border-rose-500/40" },
};

function formatPrice(n: number): string {
  return new Intl.NumberFormat("el-GR", {
    style: "currency",
    currency: "EUR",
  }).format(n);
}

type SortBy = "name" | "cost_pct" | "margin" | "price" | "prep_time";
type FilterBand = "all" | "excellent" | "good" | "warning" | "danger";

export function RecipePanel({
  recipes,
  ingredients,
  products,
  categories,
}: RecipePanelProps) {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [bandFilter, setBandFilter] = useState<FilterBand>("all");
  const [sortBy, setSortBy] = useState<SortBy>("cost_pct");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const [editingRecipeId, setEditingRecipeId] = useState<string | "new" | null>(null);
  const [costAnalysisId, setCostAnalysisId] = useState<string | null>(null);

  // Enrich recipes with cost math
  const enriched = useMemo(() => {
    return recipes.map((r) => {
      const foodCost = calculateFoodCost(
        r.recipe_ingredients.map((ri) => ({
          quantity: ri.quantity,
          cost_per_unit: ri.ingredients?.cost_per_unit ?? 0,
        })),
        r.yield_pct ?? 100,
      );
      const m = calculateMargin(foodCost, r.products?.price ?? 0);
      const cat = categorize(m.costPct);
      return { recipe: r, foodCost, ...m, category: cat };
    });
  }, [recipes]);

  // KPIs
  const kpis = useMemo(() => {
    if (enriched.length === 0) {
      return { avgCostPct: 0, mostExpensive: null as typeof enriched[number] | null, lowestMargin: null as typeof enriched[number] | null };
    }
    const valid = enriched.filter((e) => e.recipe.products?.price > 0);
    const avg = valid.reduce((s, e) => s + e.costPct, 0) / Math.max(1, valid.length);
    const mostExpensive = [...enriched].sort((a, b) => b.foodCost - a.foodCost)[0] ?? null;
    const lowestMargin = [...valid].sort((a, b) => a.marginPct - b.marginPct)[0] ?? null;
    return { avgCostPct: avg, mostExpensive, lowestMargin };
  }, [enriched]);

  // Filter + sort
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const list = enriched.filter((e) => {
      if (term) {
        const name = e.recipe.products?.name?.toLowerCase() ?? "";
        const ingredientNames = e.recipe.recipe_ingredients
          .map((ri) => ri.ingredients?.name?.toLowerCase() ?? "")
          .join(" ");
        if (!name.includes(term) && !ingredientNames.includes(term)) return false;
      }
      if (categoryFilter !== "all" && e.recipe.products?.category_id !== categoryFilter) return false;
      if (bandFilter !== "all" && e.category !== bandFilter) return false;
      return true;
    });
    list.sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      switch (sortBy) {
        case "name":
          return (a.recipe.products?.name ?? "").localeCompare(b.recipe.products?.name ?? "") * dir;
        case "cost_pct":
          return (a.costPct - b.costPct) * dir;
        case "margin":
          return (a.marginPct - b.marginPct) * dir;
        case "price":
          return ((a.recipe.products?.price ?? 0) - (b.recipe.products?.price ?? 0)) * dir;
        case "prep_time":
          return ((a.recipe.prep_time ?? 0) - (b.recipe.prep_time ?? 0)) * dir;
      }
    });
    return list;
  }, [enriched, search, categoryFilter, bandFilter, sortBy, sortDir]);

  const productsWithRecipe = new Set(recipes.map((r) => r.product_id));
  const productsWithoutRecipe = products.filter((p) => !productsWithRecipe.has(p.id));

  const editingRecipe = editingRecipeId && editingRecipeId !== "new"
    ? recipes.find((r) => r.id === editingRecipeId) ?? null
    : null;
  const costAnalysis = costAnalysisId ? enriched.find((e) => e.recipe.id === costAnalysisId) ?? null : null;

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase text-muted-foreground">Μέσο Food Cost %</p>
                <p className="text-2xl font-bold">{kpis.avgCostPct.toFixed(1)}%</p>
                <Badge variant="outline" className={cn("mt-1", CATEGORY_STYLES[categorize(kpis.avgCostPct)].className)}>
                  {CATEGORY_STYLES[categorize(kpis.avgCostPct)].label}
                </Badge>
              </div>
              <Gauge className="size-8 text-muted-foreground opacity-40" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="min-w-0">
                <p className="text-xs uppercase text-muted-foreground">Πιο Ακριβό Πιάτο</p>
                <p className="font-semibold truncate">{kpis.mostExpensive?.recipe.products?.name ?? "—"}</p>
                <p className="text-xl font-bold">{formatPrice(kpis.mostExpensive?.foodCost ?? 0)}</p>
              </div>
              <Euro className="size-8 text-muted-foreground opacity-40" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="min-w-0">
                <p className="text-xs uppercase text-muted-foreground">Χαμηλότερο Margin</p>
                <p className="font-semibold truncate">{kpis.lowestMargin?.recipe.products?.name ?? "—"}</p>
                <p className="text-xl font-bold">{kpis.lowestMargin?.marginPct.toFixed(1) ?? 0}%</p>
              </div>
              <TrendingUp className="size-8 text-muted-foreground opacity-40" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Orphan banner + Action */}
      {productsWithoutRecipe.length > 0 && (
        <Card className="border-amber-500/50 bg-amber-500/5">
          <CardContent className="flex items-center justify-between gap-2 p-3">
            <div className="flex items-center gap-2 text-sm">
              <AlertCircle className="size-4 text-amber-600" />
              <span>
                <strong>{productsWithoutRecipe.length}</strong> προϊόντα χωρίς συνταγή — δεν συνυπολογίζονται σε food cost.
              </span>
            </div>
            <Button size="sm" onClick={() => setEditingRecipeId("new")}>
              <Plus className="mr-2 size-4" /> Δημιουργία
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input placeholder="Αναζήτηση συνταγής ή υλικού..." value={search}
            onChange={(e) => setSearch(e.target.value)} className="pl-8" />
        </div>

        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}
          className="h-9 rounded-md border bg-background px-3 text-sm">
          <option value="all">Όλες οι κατηγορίες</option>
          {categories.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
        </select>

        <div className="flex gap-1 rounded-md border p-0.5">
          {(["all", "excellent", "good", "warning", "danger"] as const).map((b) => (
            <Button key={b} size="sm" variant={bandFilter === b ? "default" : "ghost"}
              className="h-7 px-2 text-xs"
              onClick={() => setBandFilter(b)}>
              {b === "all" ? "Όλα" : CATEGORY_STYLES[b].label}
            </Button>
          ))}
        </div>

        <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortBy)}
          className="h-9 rounded-md border bg-background px-3 text-sm">
          <option value="cost_pct">Food Cost %</option>
          <option value="margin">Margin %</option>
          <option value="price">Τιμή</option>
          <option value="name">Όνομα</option>
          <option value="prep_time">Χρόνος</option>
        </select>

        <Button size="icon" variant="outline" onClick={() => setSortDir((d) => d === "asc" ? "desc" : "asc")}>
          <ArrowUpDown className={cn("size-4", sortDir === "asc" && "rotate-180")} />
        </Button>

        <Button onClick={() => setEditingRecipeId("new")}>
          <Plus className="mr-2 size-4" /> Νέα Συνταγή
        </Button>
      </div>

      {/* Recipes grid */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <ChefHat className="mb-4 size-12 text-muted-foreground opacity-30" />
            <p className="font-medium">
              {recipes.length === 0 ? "Δεν υπάρχουν συνταγές ακόμα" : "Καμία συνταγή δεν ταιριάζει στα φίλτρα"}
            </p>
            {recipes.length === 0 && (
              <p className="mt-1 text-sm text-muted-foreground max-w-sm">
                Δημιούργησε συνταγές για να παρακολουθείς κόστος υλικών, margin και food cost %.
              </p>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((e) => (
            <RecipeCard key={e.recipe.id} enriched={e}
              onEdit={() => setEditingRecipeId(e.recipe.id)}
              onCostAnalysis={() => setCostAnalysisId(e.recipe.id)} />
          ))}
        </div>
      )}

      {/* Editor */}
      {editingRecipeId && (
        <RecipeEditor
          recipe={editingRecipe}
          products={products}
          productsWithoutRecipe={productsWithoutRecipe}
          ingredients={ingredients}
          onClose={() => setEditingRecipeId(null)}
        />
      )}

      {/* Cost analysis */}
      {costAnalysis && (
        <CostAnalysisDialog
          enriched={costAnalysis}
          onClose={() => setCostAnalysisId(null)}
        />
      )}
    </div>
  );
}

// ───────────────── Recipe card ─────────────────
function RecipeCard({
  enriched,
  onEdit,
  onCostAnalysis,
}: {
  enriched: { recipe: RecipeWithIngredients; foodCost: number; costPct: number; marginPct: number; profit: number; category: CostCategory };
  onEdit: () => void;
  onCostAnalysis: () => void;
}) {
  const { recipe: r, foodCost, costPct, marginPct, category } = enriched;
  const style = CATEGORY_STYLES[category];
  const price = r.products?.price ?? 0;

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <CardTitle className="text-base truncate">{r.products?.name ?? "—"}</CardTitle>
            {r.products?.categories?.name && (
              <p className="text-xs text-muted-foreground mt-0.5">{r.products.categories.name}</p>
            )}
          </div>
          <Badge variant="outline" className={cn("shrink-0 font-mono", style.className)}>
            {costPct.toFixed(1)}%
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 flex-1 flex flex-col">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-md border p-2">
            <p className="text-[10px] uppercase text-muted-foreground">Food Cost</p>
            <p className="text-sm font-bold font-mono">{formatPrice(foodCost)}</p>
          </div>
          <div className="rounded-md border p-2">
            <p className="text-[10px] uppercase text-muted-foreground">Τιμή</p>
            <p className="text-sm font-bold font-mono">{formatPrice(price)}</p>
          </div>
          <div className="rounded-md border p-2">
            <p className="text-[10px] uppercase text-muted-foreground">Margin</p>
            <p className={cn("text-sm font-bold font-mono", marginPct < 50 ? "text-rose-600" : "text-emerald-600")}>
              {marginPct.toFixed(1)}%
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-1 items-center text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Info className="size-3" /> {r.recipe_ingredients.length} υλικά
          </span>
          {r.prep_time ? (
            <>
              <span>·</span>
              <span className="inline-flex items-center gap-1">
                <Clock className="size-3" /> {r.prep_time}′
              </span>
            </>
          ) : null}
          {r.servings > 1 && (
            <>
              <span>·</span>
              <span className="inline-flex items-center gap-1">
                <UsersIcon className="size-3" /> {r.servings} μερ.
              </span>
            </>
          )}
          {r.yield_pct < 100 && (
            <>
              <span>·</span>
              <span>Yield {r.yield_pct}%</span>
            </>
          )}
        </div>

        {r.allergens.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {r.allergens.slice(0, 4).map((a) => (
              <Badge key={a} variant="outline" className="text-[10px] h-5 gap-1">
                {a === "Γλουτένη" ? <Wheat className="size-2.5" /> :
                 a === "Ψάρι" || a === "Θαλασσινά" ? <Fish className="size-2.5" /> :
                 a === "Λακτόζη" ? <Milk className="size-2.5" /> : null}
                {a}
              </Badge>
            ))}
            {r.allergens.length > 4 && <Badge variant="outline" className="text-[10px] h-5">+{r.allergens.length - 4}</Badge>}
          </div>
        )}

        <div className="mt-auto flex gap-2 pt-2">
          <Button variant="outline" size="sm" className="flex-1" onClick={onCostAnalysis}>
            <BarChart3 className="mr-1 size-3.5" /> Ανάλυση
          </Button>
          <Button variant="outline" size="sm" className="flex-1" onClick={onEdit}>
            <Pencil className="mr-1 size-3.5" /> Επεξεργασία
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ───────────────── Recipe editor ─────────────────
interface RecipeDraftIngredient {
  ingredient_id: string;
  quantity: number;
  unit: string;
}

function RecipeEditor({
  recipe,
  products,
  productsWithoutRecipe,
  ingredients,
  onClose,
}: {
  recipe: RecipeWithIngredients | null;
  products: DbProduct[];
  productsWithoutRecipe: DbProduct[];
  ingredients: IngredientWithSupplier[];
  onClose: () => void;
}) {
  const isEdit = !!recipe;
  const [productId, setProductId] = useState<string>(recipe?.product_id ?? "");
  const [prepTime, setPrepTime] = useState<number>(recipe?.prep_time ?? 0);
  const [servings, setServings] = useState<number>(recipe?.servings ?? 1);
  const [yieldPct, setYieldPct] = useState<number>(recipe?.yield_pct ?? 100);
  const [difficulty, setDifficulty] = useState<number>(recipe?.difficulty ?? 1);
  const [targetPct, setTargetPct] = useState<number | null>(recipe?.target_food_cost_pct ?? null);
  const [method, setMethod] = useState<string>(recipe?.method ?? "");
  const [allergens, setAllergens] = useState<string[]>(recipe?.allergens ?? []);
  const [photoUrl, setPhotoUrl] = useState<string>(recipe?.photo_url ?? "");
  const [items, setItems] = useState<RecipeDraftIngredient[]>(
    recipe?.recipe_ingredients.map((ri) => ({
      ingredient_id: ri.ingredient_id,
      quantity: ri.quantity,
      unit: ri.unit,
    })) ?? [],
  );
  const [isPending, startTransition] = useTransition();

  const pickableProducts = isEdit ? products : productsWithoutRecipe;
  const selectedProduct = products.find((p) => p.id === productId);

  const ingMap = useMemo(
    () => new Map(ingredients.map((i) => [i.id, i])),
    [ingredients],
  );

  const liveFoodCost = calculateFoodCost(
    items.map((it) => ({
      quantity: it.quantity,
      cost_per_unit: ingMap.get(it.ingredient_id)?.cost_per_unit ?? 0,
    })),
    yieldPct,
  );
  const margin = calculateMargin(liveFoodCost, selectedProduct?.price ?? 0);

  const addIngredient = () => {
    const first = ingredients[0];
    if (!first) {
      toast.error("Δεν υπάρχουν ingredients στη βάση");
      return;
    }
    setItems((xs) => [...xs, { ingredient_id: first.id, quantity: 0.1, unit: first.unit }]);
  };

  const toggleAllergen = (a: string) => {
    setAllergens((xs) => xs.includes(a) ? xs.filter((x) => x !== a) : [...xs, a]);
  };

  const handleSave = () => {
    if (!productId) { toast.error("Επίλεξε προϊόν"); return; }
    if (items.length === 0) { toast.error("Πρόσθεσε τουλάχιστον ένα υλικό"); return; }
    startTransition(async () => {
      const r = await saveRecipe({
        product_id: productId,
        prep_time: prepTime,
        servings,
        yield_pct: yieldPct,
        difficulty,
        target_food_cost_pct: targetPct,
        method: method || null,
        allergens,
        photo_url: photoUrl || null,
        ingredients: items,
      });
      if (r.success) {
        toast.success(isEdit ? "Ενημερώθηκε" : "Δημιουργήθηκε");
        onClose();
      } else {
        toast.error(r.error ?? "Αποτυχία");
      }
    });
  };

  const handleDelete = () => {
    if (!recipe) return;
    if (!confirm(`Διαγραφή συνταγής "${recipe.products?.name}";`)) return;
    startTransition(async () => {
      const r = await deleteRecipe(recipe.id);
      if (r.success) { toast.success("Διαγράφηκε"); onClose(); }
      else toast.error(r.error ?? "Αποτυχία");
    });
  };

  return (
    <Sheet open onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <ChefHat className="size-5" />
            {isEdit ? `Επεξεργασία: ${recipe?.products?.name}` : "Νέα Συνταγή"}
          </SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-5">
          {/* Product */}
          <section className="space-y-2">
            <Label>Προϊόν</Label>
            <select value={productId} onChange={(e) => setProductId(e.target.value)}
              disabled={isEdit}
              className="w-full h-10 rounded-md border bg-background px-3 text-sm">
              <option value="">— Επιλογή προϊόντος —</option>
              {pickableProducts.map((p) => (
                <option key={p.id} value={p.id}>{p.name} · {formatPrice(p.price)}</option>
              ))}
            </select>
          </section>

          {/* Live cost card */}
          {selectedProduct && (
            <div className="rounded-lg border bg-muted/30 p-3 grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-[10px] uppercase text-muted-foreground">Food Cost</p>
                <p className="text-lg font-bold font-mono">{formatPrice(liveFoodCost)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase text-muted-foreground">Τιμή πώλησης</p>
                <p className="text-lg font-bold font-mono">{formatPrice(selectedProduct.price)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase text-muted-foreground">Margin</p>
                <p className={cn("text-lg font-bold font-mono", margin.marginPct < 50 ? "text-rose-600" : "text-emerald-600")}>
                  {margin.marginPct.toFixed(1)}%
                </p>
              </div>
            </div>
          )}

          {/* Metrics */}
          <section className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Χρόνος προετοιμασίας (λεπτά)</Label>
              <Input type="number" min="0" value={prepTime}
                onChange={(e) => setPrepTime(Number(e.target.value))} />
            </div>
            <div>
              <Label>Μερίδες</Label>
              <Input type="number" min="1" value={servings}
                onChange={(e) => setServings(Number(e.target.value))} />
            </div>
            <div>
              <Label>Yield % <span className="text-muted-foreground">(λόγω prep loss)</span></Label>
              <Input type="number" min="1" max="100" value={yieldPct}
                onChange={(e) => setYieldPct(Number(e.target.value))} />
            </div>
            <div>
              <Label>Δυσκολία (1–5)</Label>
              <Input type="number" min="1" max="5" value={difficulty}
                onChange={(e) => setDifficulty(Number(e.target.value))} />
            </div>
            <div className="sm:col-span-2">
              <Label>Target Food Cost % <span className="text-muted-foreground">(προαιρετικό override)</span></Label>
              <Input type="number" min="1" max="99" value={targetPct ?? ""}
                onChange={(e) => setTargetPct(e.target.value === "" ? null : Number(e.target.value))}
                placeholder="Default: από ρυθμίσεις" />
            </div>
          </section>

          <Separator />

          {/* Ingredients */}
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Υλικά ({items.length})</Label>
              <Button type="button" size="sm" onClick={addIngredient}>
                <Plus className="mr-2 size-4" /> Προσθήκη υλικού
              </Button>
            </div>
            <div className="space-y-2">
              {items.map((it, idx) => {
                const ing = ingMap.get(it.ingredient_id);
                const lineCost = (ing?.cost_per_unit ?? 0) * it.quantity;
                return (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center rounded-md border p-2">
                    <select value={it.ingredient_id}
                      onChange={(e) => {
                        const next = ingMap.get(e.target.value);
                        setItems((xs) => xs.map((x, i) => i === idx ? { ...x, ingredient_id: e.target.value, unit: next?.unit ?? x.unit } : x));
                      }}
                      className="col-span-5 h-9 rounded-md border bg-background px-2 text-sm">
                      {ingredients.map((i) => (
                        <option key={i.id} value={i.id}>{i.name}</option>
                      ))}
                    </select>
                    <Input type="number" step="0.001" min="0.001" value={it.quantity}
                      onChange={(e) => setItems((xs) => xs.map((x, i) => i === idx ? { ...x, quantity: Number(e.target.value) } : x))}
                      className="col-span-2 h-9" />
                    <span className="col-span-1 text-xs text-muted-foreground">{it.unit}</span>
                    <span className="col-span-3 text-xs font-mono text-right">{formatPrice(lineCost)}</span>
                    <Button type="button" size="icon" variant="ghost"
                      className="col-span-1 size-8"
                      onClick={() => setItems((xs) => xs.filter((_, i) => i !== idx))}>
                      <Trash2 className="size-3.5 text-rose-500" />
                    </Button>
                  </div>
                );
              })}
              {items.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Κανένα υλικό ακόμα — πρόσθεσε για να υπολογιστεί το food cost.
                </p>
              )}
            </div>
          </section>

          <Separator />

          {/* Method */}
          <section>
            <Label>Μέθοδος / Οδηγίες</Label>
            <textarea value={method} onChange={(e) => setMethod(e.target.value)}
              placeholder="Βήμα 1: ...&#10;Βήμα 2: ..."
              className="w-full rounded-md border bg-background p-2 text-sm min-h-[100px] mt-1" />
          </section>

          {/* Allergens */}
          <section className="space-y-2">
            <Label>Αλλεργιογόνα</Label>
            <div className="flex flex-wrap gap-1.5">
              {ALLERGEN_PRESETS.map((a) => (
                <Button type="button" key={a} variant={allergens.includes(a) ? "default" : "outline"}
                  size="sm" className="h-7 text-xs"
                  onClick={() => toggleAllergen(a)}>
                  {a}
                </Button>
              ))}
            </div>
          </section>

          {/* Photo */}
          <section>
            <Label>URL Φωτογραφίας (προαιρετικό)</Label>
            <Input value={photoUrl} onChange={(e) => setPhotoUrl(e.target.value)}
              placeholder="https://..." />
          </section>

          <Separator />

          {/* Actions */}
          <div className="flex gap-2 pb-8">
            {isEdit && (
              <Button variant="outline" onClick={handleDelete} disabled={isPending} className="gap-2">
                <Trash2 className="size-4 text-rose-500" /> Διαγραφή
              </Button>
            )}
            <Button variant="outline" onClick={onClose} className="ml-auto">Ακύρωση</Button>
            <Button onClick={handleSave} disabled={isPending}>
              <Sparkles className="mr-2 size-4" />
              {isPending ? "Αποθήκευση..." : (isEdit ? "Ενημέρωση" : "Δημιουργία")}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ───────────────── Cost analysis dialog ─────────────────
function CostAnalysisDialog({
  enriched,
  onClose,
}: {
  enriched: { recipe: RecipeWithIngredients; foodCost: number; costPct: number; marginPct: number; profit: number; category: CostCategory };
  onClose: () => void;
}) {
  const { recipe: r, foodCost, costPct, marginPct, profit, category } = enriched;
  const price = r.products?.price ?? 0;
  const [whatIfPrice, setWhatIfPrice] = useState<number>(price);
  const whatIf = calculateMargin(foodCost, whatIfPrice);

  const targets = [25, 30, 35];
  const suggestions = targets.map((t) => ({ target: t, price: suggestPrice(foodCost, t) }));

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="size-5" />
            Ανάλυση Κόστους: {r.products?.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
            <div className="rounded-md border p-3">
              <p className="text-[10px] uppercase text-muted-foreground">Food Cost</p>
              <p className="text-lg font-bold font-mono">{formatPrice(foodCost)}</p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-[10px] uppercase text-muted-foreground">Τιμή πώλησης</p>
              <p className="text-lg font-bold font-mono">{formatPrice(price)}</p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-[10px] uppercase text-muted-foreground">Κέρδος</p>
              <p className="text-lg font-bold font-mono text-emerald-600">{formatPrice(profit)}</p>
            </div>
            <div className={cn("rounded-md border p-3", CATEGORY_STYLES[category].className)}>
              <p className="text-[10px] uppercase">Cost %</p>
              <p className="text-lg font-bold font-mono">{costPct.toFixed(1)}%</p>
            </div>
          </div>

          {/* Ingredients breakdown */}
          <div>
            <h3 className="text-sm font-semibold uppercase text-muted-foreground mb-2">Ανάλυση Υλικών</h3>
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-3 py-2 text-left">Υλικό</th>
                    <th className="px-3 py-2 text-right">Ποσότητα</th>
                    <th className="px-3 py-2 text-right">Κόστος/μον</th>
                    <th className="px-3 py-2 text-right">Σύνολο</th>
                    <th className="px-3 py-2 text-right">%</th>
                  </tr>
                </thead>
                <tbody>
                  {r.recipe_ingredients.map((ri) => {
                    const line = (ri.ingredients?.cost_per_unit ?? 0) * ri.quantity;
                    const pct = foodCost > 0 ? (line / foodCost) * 100 : 0;
                    return (
                      <tr key={ri.id} className="border-t">
                        <td className="px-3 py-2 font-medium">{ri.ingredients?.name ?? "—"}</td>
                        <td className="px-3 py-2 text-right font-mono">{ri.quantity} {ri.unit}</td>
                        <td className="px-3 py-2 text-right font-mono">{formatPrice(ri.ingredients?.cost_per_unit ?? 0)}</td>
                        <td className="px-3 py-2 text-right font-mono">{formatPrice(line)}</td>
                        <td className="px-3 py-2 text-right text-xs text-muted-foreground">{pct.toFixed(1)}%</td>
                      </tr>
                    );
                  })}
                  <tr className="border-t bg-muted/30 font-semibold">
                    <td className="px-3 py-2" colSpan={3}>Σύνολο (yield {r.yield_pct}% adjusted)</td>
                    <td className="px-3 py-2 text-right font-mono">{formatPrice(foodCost)}</td>
                    <td className="px-3 py-2 text-right">100%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Suggested prices */}
          <div>
            <h3 className="text-sm font-semibold uppercase text-muted-foreground mb-2">Προτεινόμενες Τιμές</h3>
            <div className="grid grid-cols-3 gap-2">
              {suggestions.map((s) => (
                <div key={s.target} className={cn("rounded-md border p-3",
                  Math.abs(price - s.price) < 0.5 && "border-primary bg-primary/5")}>
                  <p className="text-[10px] uppercase text-muted-foreground">Για cost {s.target}%</p>
                  <p className="text-lg font-bold font-mono">{formatPrice(s.price)}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {price > 0 ? (s.price > price ? `+${formatPrice(s.price - price)}` : `-${formatPrice(price - s.price)}`) : "—"}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* What-if slider */}
          <div>
            <h3 className="text-sm font-semibold uppercase text-muted-foreground mb-2">What-if Pricing</h3>
            <div className="rounded-md border p-4 space-y-3">
              <div className="flex items-center gap-3">
                <Label className="shrink-0 text-xs">Τιμή:</Label>
                <Input type="number" step="0.5" min="0" value={whatIfPrice}
                  onChange={(e) => setWhatIfPrice(Number(e.target.value))}
                  className="font-mono" />
              </div>
              <input type="range" min={Math.max(foodCost, 0.5)} max={Math.max(foodCost * 5, price * 2)}
                step="0.5" value={whatIfPrice}
                onChange={(e) => setWhatIfPrice(Number(e.target.value))}
                className="w-full" />
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div>
                  <p className="uppercase text-muted-foreground">Cost %</p>
                  <p className={cn("font-mono font-bold text-base", CATEGORY_STYLES[categorize(whatIf.costPct)].className, "px-2 py-0.5 rounded inline-block")}>
                    {whatIf.costPct.toFixed(1)}%
                  </p>
                </div>
                <div>
                  <p className="uppercase text-muted-foreground">Margin</p>
                  <p className="font-mono font-bold text-base">{whatIf.marginPct.toFixed(1)}%</p>
                </div>
                <div>
                  <p className="uppercase text-muted-foreground">Κέρδος/μερίδα</p>
                  <p className="font-mono font-bold text-base text-emerald-600">{formatPrice(whatIf.profit)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
