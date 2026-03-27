"use client";

import { useState } from "react";
import { Save, RotateCcw, Building, Receipt, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { usePOS } from "@/lib/pos-context";
import {
  initialTables,
  initialCategories,
  initialProducts,
} from "@/lib/mock-data";
import { FloorPlanEditor } from "@/components/pos/floor-plan-editor";
import { AISettings } from "@/components/pos/ai-settings";

export default function SettingsPage() {
  const { dispatch } = usePOS();
  const [saved, setSaved] = useState(false);

  const [settings, setSettings] = useState({
    restaurantName: "Μαύρη Θάλασσα",
    address: "Νικολάου Πλαστήρα 3, Καλαμαριά 55132",
    vatNumber: "099999999",
    taxOffice: "Καλαμαριάς",
    phone: "2310 932 542",
    printReceipt: true,
    autoPrint: false,
    soundEnabled: true,
  });

  const handleSave = () => {
    // In a real app, this would save to backend/localStorage
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleResetData = () => {
    if (
      confirm(
        "Είστε σίγουροι ότι θέλετε να επαναφέρετε όλα τα δεδομένα; Αυτή η ενέργεια δεν μπορεί να αναιρεθεί.",
      )
    ) {
      // Clear localStorage and reload
      localStorage.removeItem("eatflow-pos-state");
      window.location.reload();
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Ρυθμίσεις</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Διαχείριση ρυθμίσεων συστήματος
        </p>
      </div>

      {/* Floor Plan */}
      <Card>
        <CardHeader>
          <CardTitle>Σχέδιο Χώρου</CardTitle>
          <p className="text-sm text-muted-foreground">
            Διαχειριστείτε τις ζώνες και τη διάταξη των τραπεζιών
          </p>
        </CardHeader>
        <CardContent>
          <FloorPlanEditor />
        </CardContent>
      </Card>

      {/* AI Settings */}
      <AISettings />

      {/* Business Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="size-5" />
            Στοιχεία Επιχείρησης
          </CardTitle>
          <CardDescription>
            Τα στοιχεία που εμφανίζονται στις αποδείξεις
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="restaurantName">Επωνυμία</Label>
            <Input
              id="restaurantName"
              value={settings.restaurantName}
              onChange={(e) =>
                setSettings({ ...settings, restaurantName: e.target.value })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">Διεύθυνση</Label>
            <Input
              id="address"
              value={settings.address}
              onChange={(e) =>
                setSettings({ ...settings, address: e.target.value })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Τηλέφωνο</Label>
            <Input
              id="phone"
              value={settings.phone}
              onChange={(e) =>
                setSettings({ ...settings, phone: e.target.value })
              }
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="vatNumber">ΑΦΜ</Label>
              <Input
                id="vatNumber"
                value={settings.vatNumber}
                onChange={(e) =>
                  setSettings({ ...settings, vatNumber: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="taxOffice">ΔΟΥ</Label>
              <Input
                id="taxOffice"
                value={settings.taxOffice}
                onChange={(e) =>
                  setSettings({ ...settings, taxOffice: e.target.value })
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Receipt Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="size-5" />
            Αποδείξεις
          </CardTitle>
          <CardDescription>Ρυθμίσεις εκτύπωσης και ΑΑΔΕ</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Αυτόματη Εκτύπωση</Label>
              <p className="text-sm text-muted-foreground">
                Εκτύπωση απόδειξης μετά την ολοκλήρωση πληρωμής
              </p>
            </div>
            <Switch
              checked={settings.autoPrint}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, autoPrint: checked })
              }
            />
          </div>
          <Separator />
          <div className="rounded-lg bg-muted p-4">
            <div className="flex items-center gap-2 text-sm">
              <div className="size-2 rounded-full bg-primary animate-pulse" />
              <span className="font-medium">myDATA Σύνδεση</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Οι αποδείξεις αποστέλλονται αυτόματα στην ΑΑΔΕ
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Printer Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Printer className="size-5" />
            Εκτυπωτές
          </CardTitle>
          <CardDescription>Διαχείριση συνδεδεμένων εκτυπωτών</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-dashed border-border p-6 text-center">
            <Printer className="size-10 mx-auto text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">
              Δεν έχουν εντοπιστεί εκτυπωτές
            </p>
            <Button variant="outline" className="mt-4" disabled>
              Αναζήτηση Εκτυπωτών
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Sound Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Ήχοι</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Ηχητικές Ειδοποιήσεις</Label>
              <p className="text-sm text-muted-foreground">
                Ήχος κατά την άφιξη νέας παραγγελίας στην κουζίνα
              </p>
            </div>
            <Switch
              checked={settings.soundEnabled}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, soundEnabled: checked })
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:justify-between">
        <Button variant="destructive" onClick={handleResetData}>
          <RotateCcw className="size-4 mr-2" />
          Επαναφορά Δεδομένων
        </Button>
        <Button onClick={handleSave}>
          <Save className="size-4 mr-2" />
          {saved ? "Αποθηκεύτηκε!" : "Αποθήκευση"}
        </Button>
      </div>

      {/* Version Info */}
      <div className="text-center text-xs text-muted-foreground pt-8 border-t border-border">
        <p>EatFlow POS v1.0.0 (MVP)</p>
        <p className="mt-1">Cloud POS & Restaurant Management System</p>
      </div>
    </div>
  );
}
