import { getRecipes } from "@/lib/queries/recipes";
import { getIngredients } from "@/lib/queries/ingredients";
import { getProducts } from "@/lib/queries/products";
import { RecipePanel } from "@/components/pos/recipe-panel";

export default async function RecipesPage() {
  const [recipes, ingredients, products] = await Promise.all([
    getRecipes(),
    getIngredients(),
    getProducts(),
  ]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Συνταγές & Food Cost</h1>
        <p className="text-muted-foreground">
          {recipes.length} συνταγές από {products.length} προϊόντα
        </p>
      </div>
      <RecipePanel
        recipes={recipes}
        ingredients={ingredients}
        products={products}
      />
    </div>
  );
}
