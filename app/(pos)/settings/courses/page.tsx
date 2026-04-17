import { getCourses } from "@/lib/queries/courses";
import { getCategories } from "@/lib/queries/categories";
import { CoursesManager } from "@/components/pos/courses-manager";

export default async function CoursesSettingsPage() {
  const [courses, categories] = await Promise.all([
    getCourses(),
    getCategories(),
  ]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Πιάτα & Κατηγορίες</h1>
        <p className="text-sm text-muted-foreground">
          Ορίστε πώς ομαδοποιούνται οι κατηγορίες του μενού σε πιάτα
          σερβιρίσματος. Το σύστημα βάζει αυτόματα κάθε προϊόν στο σωστό πιάτο
          με βάση την κατηγορία του.
        </p>
      </div>

      <CoursesManager initialCourses={courses} initialCategories={categories} />
    </div>
  );
}
