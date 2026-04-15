import { SettingsPanel } from "@/components/pos/settings-panel";

export default function SettingsPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Ρυθμίσεις</h1>
        <p className="text-muted-foreground">Διαμόρφωση εφαρμογής</p>
      </div>
      <SettingsPanel />
    </div>
  );
}
