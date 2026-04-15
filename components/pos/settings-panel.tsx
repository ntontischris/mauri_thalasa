"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Store,
  Palette,
  Bell,
  Printer,
  Shield,
  Database,
  Wifi,
  Globe,
} from "lucide-react";

const settingsSections = [
  {
    icon: Store,
    title: "Στοιχεία Εστιατορίου",
    desc: "Επωνυμία, διεύθυνση, ΑΦΜ, τηλέφωνο",
    status: "soon",
  },
  {
    icon: Palette,
    title: "Εμφάνιση",
    desc: "Θέμα, χρώματα, γλώσσα",
    status: "soon",
  },
  {
    icon: Bell,
    title: "Ειδοποιήσεις",
    desc: "Ήχοι κουζίνας, stock alerts, κρατήσεις",
    status: "soon",
  },
  {
    icon: Printer,
    title: "Εκτυπωτές",
    desc: "Κουζίνα, μπαρ, ταμείο, αποδείξεις",
    status: "soon",
  },
  {
    icon: Shield,
    title: "Ρόλοι & Δικαιώματα",
    desc: "Πρόσβαση ανά ρόλο (σερβιτόρος, σεφ, μάνατζερ)",
    status: "soon",
  },
  {
    icon: Database,
    title: "Δεδομένα",
    desc: "Backup, εξαγωγή CSV, import από SoftOne",
    status: "soon",
  },
  {
    icon: Wifi,
    title: "Offline Mode",
    desc: "IndexedDB cache, sync queue",
    status: "soon",
  },
  {
    icon: Globe,
    title: "Elorus Integration",
    desc: "Σύνδεση για ηλεκτρονική τιμολόγηση & AADE",
    status: "soon",
  },
];

export function SettingsPanel() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {settingsSections.map((section) => (
        <Card
          key={section.title}
          className="cursor-default opacity-75 hover:opacity-100 transition-opacity"
        >
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <section.icon className="mt-0.5 size-5 text-primary opacity-60" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium">{section.title}</p>
                  <Badge variant="outline" className="text-[10px]">
                    Σύντομα
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {section.desc}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
