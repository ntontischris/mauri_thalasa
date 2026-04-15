import { Card, CardContent } from "@/components/ui/card";
import { ClipboardList } from "lucide-react";

export default function OrdersListPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Παραγγελίες</h1>
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <ClipboardList className="mb-4 size-12 opacity-30" />
          <p>Για παραγγελία, επιλέξτε τραπέζι από τα Τραπέζια</p>
        </CardContent>
      </Card>
    </div>
  );
}
