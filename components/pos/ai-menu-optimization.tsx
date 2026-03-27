"use client";

import { useMemo } from "react";
import { ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAI } from "@/hooks/use-ai";
import { formatPrice } from "@/lib/mock-data";
import type { MenuSuggestion } from "@/lib/types";

// ─── Card Config ──────────────────────────────────────────────────────────

interface SectionConfig {
  type: MenuSuggestion["type"];
  icon: string;
  title: string;
  colorClass: string;
  borderClass: string;
}

const SECTIONS: SectionConfig[] = [
  {
    type: "promote",
    icon: "📈",
    title: "Προώθησε",
    colorClass: "bg-green-500/10 text-green-700",
    borderClass: "border-green-200",
  },
  {
    type: "reprice",
    icon: "💰",
    title: "Αύξησε Τιμή",
    colorClass: "bg-amber-500/10 text-amber-700",
    borderClass: "border-amber-200",
  },
  {
    type: "keep",
    icon: "⭐",
    title: "Κράτα",
    colorClass: "bg-blue-500/10 text-blue-700",
    borderClass: "border-blue-200",
  },
  {
    type: "remove",
    icon: "🗑️",
    title: "Αξιολόγησε",
    colorClass: "bg-red-500/10 text-red-700",
    borderClass: "border-red-200",
  },
];

// ─── Sub-components ───────────────────────────────────────────────────────

function SuggestionCard({
  config,
  suggestions,
}: {
  config: SectionConfig;
  suggestions: MenuSuggestion[];
}) {
  if (suggestions.length === 0) return null;

  return (
    <Card className={`border ${config.borderClass}`}>
      <CardHeader className={`rounded-t-lg ${config.colorClass} py-3`}>
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <span className="text-lg">{config.icon}</span>
          {config.title}
          <span className="text-xs font-normal opacity-70">
            ({suggestions.length} πιάτα)
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4 space-y-3">
        {suggestions.map((s) => (
          <div
            key={s.productId}
            className="border-b border-border/50 pb-3 last:border-0 last:pb-0"
          >
            <p className="font-medium text-sm">{s.productName}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{s.reason}</p>
            <p className="text-xs mt-1">{s.action}</p>
            {s.impact && (
              <p className="text-xs text-green-600 font-medium mt-1">
                {s.impact}
              </p>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// ─── Component ────────────────────────────────────────────────────────────

export function AIMenuOptimization() {
  const { getOptimizationSuggestions, getRevenueProjection } = useAI();

  const suggestions = useMemo(() => getOptimizationSuggestions(), []);
  const projection = useMemo(() => getRevenueProjection(), []);

  const groupedSuggestions = useMemo(() => {
    const groups = new Map<MenuSuggestion["type"], MenuSuggestion[]>();
    for (const s of suggestions) {
      const existing = groups.get(s.type) ?? [];
      groups.set(s.type, [...existing, s]);
    }
    return groups;
  }, [suggestions]);

  return (
    <div className="space-y-6">
      {/* Recommendation cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {SECTIONS.map((config) => (
          <SuggestionCard
            key={config.type}
            config={config}
            suggestions={groupedSuggestions.get(config.type) ?? []}
          />
        ))}
      </div>

      {/* Revenue projection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            Αν εφαρμόσεις τις προτάσεις:
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            {/* Current */}
            <div className="text-center rounded-lg border border-border p-4 min-w-[140px]">
              <p className="text-xs text-muted-foreground mb-1">
                Τρέχων Μηνιαίος Τζίρος
              </p>
              <p className="text-xl font-bold">
                {formatPrice(projection.current)}
              </p>
            </div>

            {/* Arrow */}
            <ArrowRight className="size-6 text-muted-foreground shrink-0" />

            {/* Projected */}
            <div className="text-center rounded-lg border border-green-200 bg-green-500/5 p-4 min-w-[140px]">
              <p className="text-xs text-muted-foreground mb-1">
                Εκτιμώμενος Τζίρος
              </p>
              <p className="text-xl font-bold text-green-700">
                {formatPrice(projection.projected)}
              </p>
            </div>

            {/* Difference */}
            <div className="text-center rounded-lg border border-green-200 bg-green-500/10 p-4 min-w-[120px]">
              <p className="text-xs text-muted-foreground mb-1">Διαφορά</p>
              <p className="text-xl font-bold text-green-600">
                +{formatPrice(projection.increase)}
              </p>
              <p className="text-xs text-green-600 font-medium">
                +{projection.increasePercent}%
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Empty state */}
      {suggestions.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-sm">
            Δεν υπάρχουν αρκετά δεδομένα για προτάσεις βελτιστοποίησης
          </p>
        </div>
      )}
    </div>
  );
}
