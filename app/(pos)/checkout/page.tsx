import { Card, CardContent } from "@/components/ui/card";
import { CreditCard } from "lucide-react";

export default function CheckoutListPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Πληρωμές</h1>
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <CreditCard className="mb-4 size-12 opacity-30" />
          <p>Για πληρωμή, επιλέξτε τραπέζι με κατάσταση "Λογαριασμός"</p>
        </CardContent>
      </Card>
    </div>
  );
}
