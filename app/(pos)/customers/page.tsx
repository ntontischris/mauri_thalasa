import { getCustomers } from "@/lib/queries/customers";
import { getUpcomingBirthdays } from "@/lib/queries/customer-detail";
import { CustomersPanel } from "@/components/pos/customers-panel";

export const dynamic = "force-dynamic";

export default async function CustomersPage() {
  const [customers, birthdays] = await Promise.all([
    getCustomers(),
    getUpcomingBirthdays(7),
  ]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Πελατολόγιο</h1>
        <p className="text-muted-foreground">
          {customers.length} πελάτες - {customers.filter((c) => c.is_vip).length} VIP
        </p>
      </div>
      <CustomersPanel initialCustomers={customers} birthdays={birthdays} />
    </div>
  );
}
