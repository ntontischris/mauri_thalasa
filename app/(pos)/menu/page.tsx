import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getProducts } from "@/lib/queries/products";
import { getCategories } from "@/lib/queries/categories";
import { getCourses } from "@/lib/queries/courses";
import { MenuList } from "@/components/pos/menu-list";
import type { StaffRole } from "@/lib/auth/roles";

export const dynamic = "force-dynamic";

export default async function MenuPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const role = (user?.user_metadata?.role as StaffRole) ?? "waiter";

  const [products, categories, courses] = await Promise.all([
    getProducts(),
    getCategories(),
    getCourses(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Μενού</h1>
        <p className="text-muted-foreground">
          {products.length} προϊόντα σε {categories.length} κατηγορίες
        </p>
      </div>
      <MenuList
        initialProducts={products}
        initialCategories={categories}
        initialCourses={courses}
        canEdit={role === "manager"}
      />
    </div>
  );
}
