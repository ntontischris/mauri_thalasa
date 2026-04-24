import { notFound } from "next/navigation";
import { getTableById } from "@/lib/queries/tables";
import { getActiveOrderByTable, getOrderItems } from "@/lib/queries/orders";
import { getProducts } from "@/lib/queries/products";
import { getCategories } from "@/lib/queries/categories";
import { getCourses } from "@/lib/queries/courses";
import { getCustomerById } from "@/lib/queries/customers";
import { OrderPanel } from "@/components/pos/order-panel";

interface OrderPageProps {
  params: Promise<{ tableId: string }>;
}

export default async function OrderPage({ params }: OrderPageProps) {
  const { tableId } = await params;

  const table = await getTableById(tableId);
  if (!table) notFound();

  const [order, products, categories, courses] = await Promise.all([
    getActiveOrderByTable(tableId),
    getProducts(),
    getCategories(),
    getCourses(),
  ]);

  const items = order ? await getOrderItems(order.id) : [];
  const initialCustomer = order?.customer_id
    ? await getCustomerById(order.customer_id)
    : null;

  return (
    <OrderPanel
      table={table}
      initialOrder={order}
      initialItems={items}
      products={products.filter((p) => p.available)}
      categories={categories}
      courses={courses}
      initialCustomer={initialCustomer}
    />
  );
}
