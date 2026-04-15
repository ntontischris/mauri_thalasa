import { getProducts } from "@/lib/queries/products";
import { getCategories } from "@/lib/queries/categories";
import { MenuList } from "@/components/pos/menu-list";

export default async function MenuPage() {
  const [products, categories] = await Promise.all([
    getProducts(),
    getCategories(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Μενού</h1>
          <p className="text-muted-foreground">
            {products.length} προϊόντα σε {categories.length} κατηγορίες
          </p>
        </div>
      </div>
      <MenuList initialProducts={products} initialCategories={categories} />
    </div>
  );
}
