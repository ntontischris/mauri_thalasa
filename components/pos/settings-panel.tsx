"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
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
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";

interface SettingsSection {
  icon: LucideIcon;
  title: string;
  desc: string;
  href?: string;
}

const settingsSections: SettingsSection[] = [
  {
    icon: UtensilsCrossed,
    title: "Πιάτα & Κατηγορίες",
    desc: "Ομαδοποίηση κατηγοριών σε πιάτα σερβιρίσματος",
    href: "/settings/courses",
  },
  {
    icon: Store,
    title: "Στοιχεία Εστιατορίου",
    desc: "Επωνυμία, διεύθυνση, ΑΦΜ, τηλέφωνο",
  },
  {
    icon: Palette,
    title: "Εμφάνιση",
    desc: "Θέμα, χρώματα, γλώσσα",
  },
  {
    icon: Bell,
    title: "Ειδοποιήσεις",
    desc: "Ήχοι κουζίνας, stock alerts, κρατήσεις",
  },
  {
    icon: Printer,
    title: "Εκτυπωτές",
    desc: "Κουζίνα, μπαρ, ταμείο, αποδείξεις",
  },
  {
    icon: Shield,
    title: "Ρόλοι & Δικαιώματα",
    desc: "Πρόσβαση ανά ρόλο (σερβιτόρος, σεφ, μάνατζερ)",
  },
  {
    icon: Database,
    title: "Δεδομένα",
    desc: "Backup, εξαγωγή CSV, import από SoftOne",
  },
  {
    icon: Wifi,
    title: "Offline Mode",
    desc: "IndexedDB cache, sync queue",
  },
  {
    icon: Globe,
    title: "Elorus Integration",
    desc: "Σύνδεση για ηλεκτρονική τιμολόγηση & AADE",
  },
];

export function SettingsPanel() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {settingsSections.map((section) => {
        const Icon = section.icon;
        const content = (
          <Card
            className={
              section.href
                ? "cursor-pointer hover:border-primary/60 hover:shadow-md transition"
                : "cursor-default opacity-75 hover:opacity-100 transition-opacity"
            }
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Icon
                  className={`mt-0.5 size-5 ${section.href ? "text-primary" : "text-primary opacity-60"}`}
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{section.title}</p>
                    {!section.href && (
                      <Badge variant="outline" className="text-[10px]">
                        Σύντομα
                      </Badge>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {section.desc}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
        return section.href ? (
          <Link key={section.title} href={section.href}>
            {content}
          </Link>
        ) : (
          <div key={section.title}>{content}</div>
        );
      })}
    </div>
  );
}
