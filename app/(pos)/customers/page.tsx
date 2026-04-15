import { getCustomers } from "@/lib/queries/customers";
import { CustomersPanel } from "@/components/pos/customers-panel";

export default async function CustomersPage() {
  const customers = await getCustomers();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Πελάτες</h1>
        <p className="text-muted-foreground">
          {customers.length} πελάτες •{" "}
          {customers.filter((c) => c.is_vip).length} VIP
        </p>
      </div>
      <CustomersPanel initialCustomers={customers} />
    </div>
  );
}
