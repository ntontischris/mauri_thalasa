// EatFlow POS - Bar Management Types

export type SpiritCategory =
  | "vodka"
  | "gin"
  | "rum"
  | "tequila"
  | "whiskey"
  | "wine"
  | "beer"
  | "liqueur"
  | "mixer"
  | "garnish"
  | "other";

export interface Bottle {
  id: string;
  name: string;
  category: SpiritCategory;
  volume: number; // ml (standard 700, 750, 1000)
  costPrice: number;
  currentLevel: number; // 0-100 percentage remaining
  isOpen: boolean;
  openedAt?: string;
  parLevel: number; // minimum bottles to keep in stock
  stockCount: number; // number of sealed bottles
  supplierId?: string;
}

export interface CocktailIngredient {
  bottleId: string;
  quantity: number; // ml
  isOptional: boolean;
}

export interface CocktailRecipe {
  id: string;
  name: string;
  productId?: string; // links to menu product
  ingredients: CocktailIngredient[];
  method: "shaken" | "stirred" | "built" | "blended" | "muddled";
  glass: string;
  garnish?: string;
  instructions?: string;
  costPerServing: number; // calculated
  pourCostPercent: number; // cost / sell price
}

export interface HappyHourRule {
  id: string;
  name: string;
  dayOfWeek: number[]; // 0=Sun, 1=Mon, ...
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  discountPercent: number;
  categoryIds: string[]; // which menu categories
  productIds: string[]; // specific products (overrides categories)
  isActive: boolean;
}

export interface WinePairing {
  productId: string; // food item
  wineBottleId: string; // wine bottle
  notes?: string;
}
