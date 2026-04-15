import { Card, CardContent } from "@/components/ui/card";
import { Gift } from "lucide-react";

export default function LoyaltyPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Loyalty</h1>
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <Gift className="mb-4 size-12 opacity-30" />
          <p>Σύντομα διαθέσιμο — Phase 3</p>
        </CardContent>
      </Card>
    </div>
  );
}
