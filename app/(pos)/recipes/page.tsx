import { Card, CardContent } from "@/components/ui/card";
import { BookOpen } from "lucide-react";

export default function RecipesPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Συνταγές</h1>
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <BookOpen className="mb-4 size-12 opacity-30" />
          <p>Σύντομα διαθέσιμο — Phase 3</p>
        </CardContent>
      </Card>
    </div>
  );
}
