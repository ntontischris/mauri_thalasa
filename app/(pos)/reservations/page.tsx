import { Card, CardContent } from "@/components/ui/card";
import { CalendarDays } from "lucide-react";

export default function ReservationsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Κρατήσεις</h1>
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <CalendarDays className="mb-4 size-12 opacity-30" />
          <p>Σύντομα διαθέσιμο — Phase 3</p>
        </CardContent>
      </Card>
    </div>
  );
}
