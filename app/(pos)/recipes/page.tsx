import { ChefHat } from "lucide-react";
import { getRecipes } from "@/lib/queries/recipes";
import { getIngredients } from "@/lib/queries/ingredients";
import { getProducts } from "@/lib/queries/products";
import { getCategories } from "@/lib/queries/categories";
import { RecipePanel } from "@/components/pos/recipe-panel";

export const dynamic = "force-dynamic";

export default async function RecipesPage() {
  const [recipes, ingredients, products, categories] = await Promise.all([
    getRecipes(),
    getIngredients(),
    getProducts(),
    getCategories(),
  ]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <ChefHat className="size-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Συνταγές & Food Cost</h1>
          <p className="text-sm text-muted-foreground">
            {recipes.length} συνταγές από {products.length} προϊόντα
          </p>
        </div>
      </div>
      <RecipePanel
        recipes={recipes}
        ingredients={ingredients}
        products={products}
        categories={categories}
      />
    </div>
  );
}
