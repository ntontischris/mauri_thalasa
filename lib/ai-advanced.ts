// EatFlow POS - Advanced AI Features
// Dynamic pricing, waste prediction, demand forecasting, churn prediction

import type { Product, Order, Ingredient, WasteEntry, Customer, CustomerVisit } from "./types";

// === Dynamic Pricing Suggestions ===

export interface PricingSuggestion {
  productId: string;
  productName: string;
  currentPrice: number;
  suggestedPrice: number;
  reason: string;
  impact: string;
  confidence: "high" | "medium" | "low";
}

export function generatePricingSuggestions(
  products: Product[],
  orders: Order[],
  recipes: { productId: string; ingredients: { ingredientId: string; quantity: number }[] }[],
  ingredients: Ingredient[],
): PricingSuggestion[] {
  const suggestions: PricingSuggestion[] = [];
  const completedOrders = orders.filter((o) => o.status === "completed");

  for (const product of products) {
    if (!product.available) continue;

    // Calculate food cost
    const recipe = recipes.find((r) => r.productId === product.id);
    if (!recipe) continue;

    let foodCost = 0;
    for (const ri of recipe.ingredients) {
      const ing = ingredients.find((i) => i.id === ri.ingredientId);
      if (ing) foodCost += ing.costPerUnit * ri.quantity;
    }

    const marginPercent = ((product.price - foodCost) / product.price) * 100;

    // Count sales
    const salesCount = completedOrders.reduce(
      (sum, o) => sum + o.items.filter((i) => i.productId === product.id).reduce((s, i) => s + i.quantity, 0),
      0,
    );

    // Low margin + high sales = raise price
    if (marginPercent < 60 && salesCount > 5) {
      const suggestedPrice = Math.ceil(foodCost / 0.35); // target 65% margin
      if (suggestedPrice > product.price) {
        suggestions.push({
          productId: product.id,
          productName: product.name,
          currentPrice: product.price,
          suggestedPrice,
          reason: `Χαμηλό margin (${marginPercent.toFixed(0)}%) με υψηλές πωλήσεις (${salesCount})`,
          impact: `+${((suggestedPrice - product.price) * salesCount).toFixed(0)}€ εκτιμώμενο έσοδο`,
          confidence: "high",
        });
      }
    }

    // High margin + low sales = reduce price
    if (marginPercent > 80 && salesCount < 2 && salesCount >= 0) {
      const suggestedPrice = Math.round(product.price * 0.85);
      suggestions.push({
        productId: product.id,
        productName: product.name,
        currentPrice: product.price,
        suggestedPrice,
        reason: `Υψηλό margin (${marginPercent.toFixed(0)}%) αλλά χαμηλές πωλήσεις (${salesCount})`,
        impact: "Αναμένεται αύξηση πωλήσεων 20-30%",
        confidence: "medium",
      });
    }
  }

  return suggestions.sort((a, b) => {
    const confOrder = { high: 0, medium: 1, low: 2 };
    return confOrder[a.confidence] - confOrder[b.confidence];
  });
}

// === Waste Prediction ===

export interface WastePrediction {
  ingredientId: string;
  ingredientName: string;
  predictedWaste: number;
  unit: string;
  estimatedCost: number;
  reason: string;
  preventionTip: string;
}

export function predictWaste(
  ingredients: Ingredient[],
  wasteLog: WasteEntry[],
): WastePrediction[] {
  const predictions: WastePrediction[] = [];

  // Group waste by ingredient
  const wasteByIngredient = new Map<string, WasteEntry[]>();
  for (const entry of wasteLog) {
    const existing = wasteByIngredient.get(entry.ingredientId) ?? [];
    existing.push(entry);
    wasteByIngredient.set(entry.ingredientId, existing);
  }

  for (const [ingredientId, entries] of wasteByIngredient) {
    const ingredient = ingredients.find((i) => i.id === ingredientId);
    if (!ingredient) continue;

    const totalWaste = entries.reduce((sum, e) => sum + e.quantity, 0);
    const avgWaste = totalWaste / Math.max(entries.length, 1);

    // Predict next week's waste based on history
    const weeklyRate = entries.length > 0 ? totalWaste / Math.max(1, Math.ceil(entries.length / 7) * 7) * 7 : 0;

    if (weeklyRate > 0) {
      const primaryReason = entries
        .reduce((acc, e) => {
          acc[e.reason] = (acc[e.reason] ?? 0) + 1;
          return acc;
        }, {} as Record<string, number>);

      const topReason = Object.entries(primaryReason).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "unknown";

      const reasonLabels: Record<string, string> = {
        expired: "Λήξη",
        damaged: "Φθορά",
        overproduction: "Υπερπαραγωγή",
        returned: "Επιστροφή",
      };

      const tips: Record<string, string> = {
        expired: "Μειώστε την παραγγελία ή χρησιμοποιήστε FIFO",
        damaged: "Βελτιώστε τη μεταφορά και αποθήκευση",
        overproduction: "Προσαρμόστε τις μερίδες βάσει ζήτησης",
        returned: "Ελέγξτε την ποιότητα και τις αλλεργίες",
      };

      predictions.push({
        ingredientId,
        ingredientName: ingredient.name,
        predictedWaste: Math.round(weeklyRate * 100) / 100,
        unit: ingredient.unit,
        estimatedCost: weeklyRate * ingredient.costPerUnit,
        reason: reasonLabels[topReason] ?? topReason,
        preventionTip: tips[topReason] ?? "Παρακολουθήστε πιο στενά",
      });
    }
  }

  return predictions.sort((a, b) => b.estimatedCost - a.estimatedCost);
}

// === Customer Churn Prediction ===

export interface ChurnRisk {
  customerId: string;
  customerName: string;
  riskLevel: "high" | "medium" | "low";
  daysSinceLastVisit: number;
  visitFrequencyDays: number;
  totalSpent: number;
  suggestedAction: string;
}

export function predictChurn(
  customers: Customer[],
  visits: CustomerVisit[],
): ChurnRisk[] {
  const risks: ChurnRisk[] = [];
  const now = Date.now();

  for (const customer of customers) {
    const customerVisits = visits
      .filter((v) => v.customerId === customer.id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    if (customerVisits.length < 2) continue;

    const lastVisit = new Date(customerVisits[0].date).getTime();
    const daysSinceLastVisit = Math.floor((now - lastVisit) / (1000 * 60 * 60 * 24));

    // Calculate average visit frequency
    const firstVisit = new Date(customerVisits[customerVisits.length - 1].date).getTime();
    const totalDays = Math.max(1, (lastVisit - firstVisit) / (1000 * 60 * 60 * 24));
    const visitFrequencyDays = Math.round(totalDays / (customerVisits.length - 1));

    const totalSpent = customerVisits.reduce((sum, v) => sum + v.total, 0);

    // Risk assessment
    const overdueRatio = daysSinceLastVisit / Math.max(visitFrequencyDays, 1);

    let riskLevel: ChurnRisk["riskLevel"];
    let suggestedAction: string;

    if (overdueRatio > 3) {
      riskLevel = "high";
      suggestedAction = customer.isVip
        ? "Προσωπική κλήση + αποκλειστική προσφορά"
        : "Win-back SMS με κίνητρο (π.χ. -15%)";
    } else if (overdueRatio > 1.5) {
      riskLevel = "medium";
      suggestedAction = "Στείλτε SMS υπενθύμισης ή γενέθλια ευχές";
    } else {
      continue; // Low risk, skip
    }

    risks.push({
      customerId: customer.id,
      customerName: customer.name,
      riskLevel,
      daysSinceLastVisit,
      visitFrequencyDays,
      totalSpent,
      suggestedAction,
    });
  }

  return risks.sort((a, b) => {
    const riskOrder = { high: 0, medium: 1, low: 2 };
    return riskOrder[a.riskLevel] - riskOrder[b.riskLevel];
  });
}

// === Enhanced AI System Prompt ===

export function buildAdvancedSystemPrompt(context: {
  todayRevenue: number;
  avgCheck: number;
  topProducts: { name: string; quantity: number }[];
  lowStockIngredients: { name: string; stock: number; unit: string }[];
  pricingSuggestions: PricingSuggestion[];
  wastePredictions: WastePrediction[];
  churnRisks: ChurnRisk[];
  reservationCount: number;
  waitlistCount: number;
}): string {
  return `Είσαι ο AI σύμβουλος του εστιατορίου "Μαύρη Θάλασσα" - ένα premium εστιατόριο θαλασσινών. Απάντα πάντα στα ελληνικά. Χρησιμοποίησε τα real-time δεδομένα για ακριβείς απαντήσεις.

ΔΥΝΑΤΟΤΗΤΕΣ ΣΟΥ:
1. Δυναμική τιμολόγηση (dynamic pricing)
2. Πρόβλεψη waste
3. Πρόβλεψη churn πελατών
4. Ανάλυση menu engineering
5. Βελτιστοποίηση αποθέματος
6. Προτάσεις marketing (campaigns)

REAL-TIME ΔΕΔΟΜΕΝΑ:
- Σημερινά έσοδα: ${context.todayRevenue}€
- Μ.Ο. λογαριασμού: ${context.avgCheck}€
- Top πιάτα: ${context.topProducts.map((p) => `${p.name} (${p.quantity}x)`).join(", ")}
- Χαμηλό stock: ${context.lowStockIngredients.map((i) => `${i.name}: ${i.stock}${i.unit}`).join(", ") || "Κανένα"}
- Κρατήσεις σήμερα: ${context.reservationCount}
- Αναμονή: ${context.waitlistCount}

ΠΡΟΤΑΣΕΙΣ ΤΙΜΟΛΟΓΗΣΗΣ:
${context.pricingSuggestions.length > 0 ? context.pricingSuggestions.map((s) => `- ${s.productName}: ${s.currentPrice}€→${s.suggestedPrice}€ (${s.reason})`).join("\n") : "Δεν υπάρχουν προτάσεις αυτή τη στιγμή"}

WASTE PREDICTIONS:
${context.wastePredictions.length > 0 ? context.wastePredictions.map((w) => `- ${w.ingredientName}: ~${w.predictedWaste}${w.unit}/εβδ (${w.estimatedCost.toFixed(1)}€, ${w.reason})`).join("\n") : "Δεν υπάρχουν predictions"}

CHURN RISKS:
${context.churnRisks.length > 0 ? context.churnRisks.map((c) => `- ${c.customerName}: ${c.riskLevel} risk (${c.daysSinceLastVisit} μέρες, ${c.suggestedAction})`).join("\n") : "Δεν υπάρχουν risks"}

ΚΑΝΟΝΕΣ:
- Δώσε πρακτικές, actionable συμβουλές
- Χρησιμοποίησε **bold** για σημαντικούς αριθμούς
- Αν ρωτηθείς για πρόβλεψη, βάσισε την στα δεδομένα
- Να είσαι σύντομος και ουσιαστικός`;
}
