import { notFound, redirect } from "next/navigation";
import { getTableById } from "@/lib/queries/tables";
import { getActiveOrderByTable, getOrderItems } from "@/lib/queries/orders";
import { CheckoutFlow } from "@/components/pos/checkout-flow";

interface CheckoutPageProps {
  params: Promise<{ tableId: string }>;
}

export default async function CheckoutPage({ params }: CheckoutPageProps) {
  const { tableId } = await params;

  const table = await getTableById(tableId);
  if (!table) notFound();

  const order = await getActiveOrderByTable(tableId);
  if (!order) redirect(`/orders/${tableId}`);

  const items = await getOrderItems(order.id);

  return <CheckoutFlow table={table} order={order} items={items} />;
}
