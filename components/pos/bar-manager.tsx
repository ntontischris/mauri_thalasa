"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Wine,
  Beer,
  GlassWater,
  Plus,
  AlertTriangle,
  Clock,
  TrendingUp,
  Percent,
  Package,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Bottle, CocktailRecipe, HappyHourRule, SpiritCategory } from "@/lib/bar-types";
import { generateId, formatPrice } from "@/lib/mock-data";

const CATEGORY_LABELS: Record<SpiritCategory, string> = {
  vodka: "Vodka",
  gin: "Gin",
  rum: "Rum",
  tequila: "Tequila",
  whiskey: "Whiskey",
  wine: "Κρασί",
  beer: "Μπύρα",
  liqueur: "Liqueur",
  mixer: "Mixer",
  garnish: "Garnish",
  other: "Άλλο",
};

// Sample bar data
const initialBottles: Bottle[] = [
  { id: "b1", name: "Absolut Vodka", category: "vodka", volume: 700, costPrice: 15, currentLevel: 65, isOpen: true, openedAt: "2026-04-08", parLevel: 2, stockCount: 3 },
  { id: "b2", name: "Bombay Sapphire", category: "gin", volume: 700, costPrice: 22, currentLevel: 40, isOpen: true, openedAt: "2026-04-06", parLevel: 2, stockCount: 1 },
  { id: "b3", name: "Havana Club 3", category: "rum", volume: 700, costPrice: 14, currentLevel: 80, isOpen: true, openedAt: "2026-04-09", parLevel: 2, stockCount: 4 },
  { id: "b4", name: "Jack Daniel's", category: "whiskey", volume: 700, costPrice: 20, currentLevel: 30, isOpen: true, openedAt: "2026-04-05", parLevel: 1, stockCount: 2 },
  { id: "b5", name: "Patron Silver", category: "tequila", volume: 700, costPrice: 35, currentLevel: 55, isOpen: true, openedAt: "2026-04-07", parLevel: 1, stockCount: 1 },
  { id: "b6", name: "Aperol", category: "liqueur", volume: 700, costPrice: 14, currentLevel: 70, isOpen: true, openedAt: "2026-04-08", parLevel: 2, stockCount: 2 },
  { id: "b7", name: "Prosecco", category: "wine", volume: 750, costPrice: 8, currentLevel: 100, isOpen: false, parLevel: 6, stockCount: 8 },
  { id: "b8", name: "Tonic Water", category: "mixer", volume: 200, costPrice: 1.2, currentLevel: 100, isOpen: false, parLevel: 24, stockCount: 36 },
  { id: "b9", name: "Λεμόνια", category: "garnish", volume: 0, costPrice: 0.3, currentLevel: 100, isOpen: false, parLevel: 10, stockCount: 15 },
];

const initialCocktails: CocktailRecipe[] = [
  {
    id: "c1", name: "Aperol Spritz", ingredients: [
      { bottleId: "b6", quantity: 60, isOptional: false },
      { bottleId: "b7", quantity: 90, isOptional: false },
    ], method: "built", glass: "Wine glass", garnish: "Φέτα πορτοκαλιού", costPerServing: 3.5, pourCostPercent: 25,
  },
  {
    id: "c2", name: "Gin Tonic", ingredients: [
      { bottleId: "b2", quantity: 50, isOptional: false },
      { bottleId: "b8", quantity: 150, isOptional: false },
      { bottleId: "b9", quantity: 1, isOptional: true },
    ], method: "built", glass: "Highball", garnish: "Φέτα λεμονιού", costPerServing: 2.8, pourCostPercent: 20,
  },
  {
    id: "c3", name: "Mojito", ingredients: [
      { bottleId: "b3", quantity: 50, isOptional: false },
      { bottleId: "b9", quantity: 1, isOptional: false },
    ], method: "muddled", glass: "Highball", garnish: "Μέντα", costPerServing: 2.2, pourCostPercent: 18,
  },
];

const initialHappyHours: HappyHourRule[] = [
  {
    id: "hh1", name: "Weekday Happy Hour", dayOfWeek: [1, 2, 3, 4, 5],
    startTime: "17:00", endTime: "19:00", discountPercent: 20,
    categoryIds: [], productIds: [], isActive: true,
  },
];

export function BarManager() {
  const [bottles, setBottles] = useState<Bottle[]>(initialBottles);
  const [cocktails] = useState<CocktailRecipe[]>(initialCocktails);
  const [happyHours, setHappyHours] = useState<HappyHourRule[]>(initialHappyHours);
  const [addBottleOpen, setAddBottleOpen] = useState(false);

  // Stats
  const openBottles = bottles.filter((b) => b.isOpen);
  const lowStock = bottles.filter((b) => b.stockCount <= b.parLevel);
  const avgPourCost = cocktails.length > 0
    ? cocktails.reduce((sum, c) => sum + c.pourCostPercent, 0) / cocktails.length
    : 0;
  const totalInventoryValue = bottles.reduce(
    (sum, b) => sum + b.costPrice * b.stockCount + (b.isOpen ? b.costPrice * (b.currentLevel / 100) : 0),
    0,
  );

  const updateBottleLevel = (id: string, level: number) => {
    setBottles((prev) =>
      prev.map((b) => (b.id === id ? { ...b, currentLevel: Math.max(0, Math.min(100, level)) } : b)),
    );
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <div className="flex size-10 items-center justify-center rounded-lg bg-purple-500/10">
              <Wine className="size-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{openBottles.length}</p>
              <p className="text-xs text-muted-foreground">Ανοιχτά Μπουκάλια</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <div className="flex size-10 items-center justify-center rounded-lg bg-amber-500/10">
              <AlertTriangle className="size-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{lowStock.length}</p>
              <p className="text-xs text-muted-foreground">Χαμηλό Stock</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <div className="flex size-10 items-center justify-center rounded-lg bg-green-500/10">
              <Percent className="size-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{avgPourCost.toFixed(0)}%</p>
              <p className="text-xs text-muted-foreground">Μ.Ο. Pour Cost</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <div className="flex size-10 items-center justify-center rounded-lg bg-blue-500/10">
              <Package className="size-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{formatPrice(totalInventoryValue)}</p>
              <p className="text-xs text-muted-foreground">Αξία Αποθέματος</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="bottles">
        <TabsList>
          <TabsTrigger value="bottles">Μπουκάλια</TabsTrigger>
          <TabsTrigger value="cocktails">Cocktails</TabsTrigger>
          <TabsTrigger value="happyhour">Happy Hour</TabsTrigger>
        </TabsList>

        {/* Bottles inventory */}
        <TabsContent value="bottles" className="mt-4 space-y-3">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setAddBottleOpen(true)}>
              <Plus className="mr-1 size-3" /> Προσθήκη
            </Button>
          </div>

          {/* Group by category */}
          {Object.entries(CATEGORY_LABELS)
            .filter(([cat]) => bottles.some((b) => b.category === cat))
            .map(([cat, label]) => (
              <div key={cat}>
                <h3 className="mb-2 text-sm font-semibold text-muted-foreground">{label}</h3>
                <div className="space-y-2">
                  {bottles
                    .filter((b) => b.category === cat)
                    .map((bottle) => (
                      <div key={bottle.id} className="flex items-center gap-3 rounded-lg border bg-card p-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{bottle.name}</span>
                            {bottle.isOpen && <Badge variant="secondary" className="text-[10px]">Ανοιχτό</Badge>}
                            {bottle.stockCount <= bottle.parLevel && (
                              <Badge variant="destructive" className="text-[10px]">Low</Badge>
                            )}
                          </div>
                          <div className="mt-1 flex gap-3 text-xs text-muted-foreground">
                            <span>Stock: {bottle.stockCount}</span>
                            <span>Par: {bottle.parLevel}</span>
                            <span>{formatPrice(bottle.costPrice)}</span>
                          </div>
                        </div>

                        {bottle.isOpen && (
                          <div className="w-24">
                            <Progress value={bottle.currentLevel} className="h-2" />
                            <p className="mt-0.5 text-center text-[10px] text-muted-foreground">
                              {bottle.currentLevel}%
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              </div>
            ))}
        </TabsContent>

        {/* Cocktails */}
        <TabsContent value="cocktails" className="mt-4 space-y-3">
          {cocktails.map((cocktail) => (
            <Card key={cocktail.id}>
              <CardContent className="pt-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold">{cocktail.name}</h3>
                    <div className="mt-1 flex gap-2 text-xs text-muted-foreground">
                      <Badge variant="outline" className="text-[10px]">{cocktail.method}</Badge>
                      <span>{cocktail.glass}</span>
                      {cocktail.garnish && <span>🍋 {cocktail.garnish}</span>}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">{formatPrice(cocktail.costPerServing)}</p>
                    <p className={cn(
                      "text-xs",
                      cocktail.pourCostPercent > 25 ? "text-red-500" : "text-green-600",
                    )}>
                      Pour cost: {cocktail.pourCostPercent}%
                    </p>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {cocktail.ingredients.map((ing) => {
                    const bottle = bottles.find((b) => b.id === ing.bottleId);
                    return (
                      <Badge key={ing.bottleId} variant="secondary" className="text-[10px]">
                        {bottle?.name ?? "?"} {ing.quantity}{bottle?.category === "garnish" ? "x" : "ml"}
                      </Badge>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Happy Hour */}
        <TabsContent value="happyhour" className="mt-4 space-y-3">
          {happyHours.map((hh) => (
            <Card key={hh.id}>
              <CardContent className="flex items-center justify-between pt-6">
                <div>
                  <div className="flex items-center gap-2">
                    <Clock className="size-4 text-amber-500" />
                    <h3 className="font-semibold">{hh.name}</h3>
                    <Badge variant={hh.isActive ? "default" : "outline"}>
                      {hh.isActive ? "Ενεργό" : "Ανενεργό"}
                    </Badge>
                  </div>
                  <div className="mt-1 flex gap-2 text-sm text-muted-foreground">
                    <span>{hh.startTime} - {hh.endTime}</span>
                    <span>-{hh.discountPercent}%</span>
                    <span>
                      {hh.dayOfWeek.map((d) => ["Κυρ", "Δευ", "Τρι", "Τετ", "Πεμ", "Παρ", "Σαβ"][d]).join(", ")}
                    </span>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setHappyHours((prev) =>
                      prev.map((h) => (h.id === hh.id ? { ...h, isActive: !h.isActive } : h)),
                    )
                  }
                >
                  {hh.isActive ? "Απενεργοποίηση" : "Ενεργοποίηση"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
