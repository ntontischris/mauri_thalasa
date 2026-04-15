import { AiPanel } from "@/components/pos/ai-panel";

export default function AiPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">AI Βοηθός</h1>
        <p className="text-muted-foreground">
          Ρωτήστε οτιδήποτε σχετικά με το εστιατόριο
        </p>
      </div>
      <AiPanel />
    </div>
  );
}
