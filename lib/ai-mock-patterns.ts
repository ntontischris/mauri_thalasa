// EatFlow POS - AI Mock Pattern Matching
// Handles Greek natural language queries with pattern matching

import { formatPrice } from "./mock-data";

export interface AnalyticsData {
  todayRevenue: number;
  yesterdayRevenue: number;
  todayOrders: number;
  avgCheck: number;
  topProducts: { name: string; quantity: number; revenue: number }[];
  worstProducts: { name: string; quantity: number; revenue: number }[];
  foodCostPercent: number;
  paymentBreakdown: { cash: number; card: number };
  lowStockIngredients: { name: string; stock: number; unit: string }[];
  monthlyWaste: number;
  menuEngineering: {
    stars: string[];
    cashCows: string[];
    puzzles: string[];
    dogs: string[];
  };
  staffPerformance: { name: string; revenue: number; tables: number }[];
}

interface Pattern {
  keywords: string[];
  handler: (data: AnalyticsData) => string;
}

function formatProductList(
  products: { name: string; quantity: number; revenue: number }[],
): string {
  return products
    .map(
      (p, i) =>
        `${i + 1}. **${p.name}** - ${p.quantity} τεμ. (${formatPrice(p.revenue)})`,
    )
    .join("\n");
}

function getFoodCostCommentary(percent: number): string {
  if (percent <= 30) {
    return "Είσαι σε πολύ καλό επίπεδο! Κράτα το.";
  }
  if (percent <= 35) {
    return "Αποδεκτό επίπεδο, αλλά υπάρχει περιθώριο βελτίωσης.";
  }
  return "Υψηλό food cost! Ψάξε πιάτα με χαμηλό margin και μείωσε τη σπατάλη.";
}

const patterns: Pattern[] = [
  // 1. Today revenue
  {
    keywords: ["πόσα πούλησα σήμερα", "τζίρος σήμερα"],
    handler: (data) =>
      `Σήμερα πούλησες **${formatPrice(data.todayRevenue)}** σε **${data.todayOrders}** παραγγελίες. Μέσος λογαριασμός: **${formatPrice(data.avgCheck)}**.`,
  },
  // 2. Yesterday revenue
  {
    keywords: ["πόσα πούλησα χθες", "τζίρος χθες"],
    handler: (data) =>
      `Χθες πούλησες **${formatPrice(data.yesterdayRevenue)}**.`,
  },
  // 3. Top products
  {
    keywords: ["τι πουλάει", "top", "δημοφιλή"],
    handler: (data) =>
      `**Top 5 πιάτα:**\n${formatProductList(data.topProducts.slice(0, 5))}`,
  },
  // 4. Worst products
  {
    keywords: ["τι δεν πουλάει", "χειρότερα", "worst"],
    handler: (data) =>
      `**Λιγότερο δημοφιλή:**\n${formatProductList(data.worstProducts.slice(0, 5))}`,
  },
  // 5. Food cost
  {
    keywords: ["food cost", "κόστος", "κοστος"],
    handler: (data) =>
      `Μέσο food cost: **${data.foodCostPercent}%**. ${getFoodCostCommentary(data.foodCostPercent)}`,
  },
  // 6. Margin
  {
    keywords: ["margin"],
    handler: (data) => {
      const best = data.topProducts.length > 0 ? data.topProducts[0].name : "—";
      const worst =
        data.worstProducts.length > 0 ? data.worstProducts[0].name : "—";
      return `Καλύτερο margin: **${best}**\nΧειρότερο margin: **${worst}**\n\nFood cost: **${data.foodCostPercent}%**`;
    },
  },
  // 7. Average check
  {
    keywords: ["μέσος λογαριασμός", "μεσος"],
    handler: (data) =>
      `Μέσος λογαριασμός σήμερα: **${formatPrice(data.avgCheck)}** σε **${data.todayOrders}** παραγγελίες.`,
  },
  // 8. Payment breakdown
  {
    keywords: ["μετρητά", "κάρτα", "πληρωμ"],
    handler: (data) => {
      const total = data.paymentBreakdown.cash + data.paymentBreakdown.card;
      const cashPct =
        total > 0 ? Math.round((data.paymentBreakdown.cash / total) * 100) : 0;
      const cardPct = total > 0 ? 100 - cashPct : 0;
      return `**Μετρητά:** ${formatPrice(data.paymentBreakdown.cash)} (${cashPct}%)\n**Κάρτα:** ${formatPrice(data.paymentBreakdown.card)} (${cardPct}%)`;
    },
  },
  // 9. Forecast
  {
    keywords: ["πρόβλεψη", "αύριο", "forecast"],
    handler: (data) => {
      const estimated = Math.round(data.todayRevenue * 1.05);
      return `Πρόβλεψη αύριο: εκτιμώμενος τζίρος **${formatPrice(estimated)}** βάσει ιστορικού. Δες την καρτέλα **Πρόβλεψη** για αναλυτικά στοιχεία ανά πιάτο.`;
    },
  },
  // 10. Stock
  {
    keywords: ["αποθήκη", "stock", "υλικ"],
    handler: (data) => {
      if (data.lowStockIngredients.length === 0) {
        return "Όλα καλά στην αποθήκη! Δεν υπάρχουν υλικά σε χαμηλό απόθεμα.";
      }
      const list = data.lowStockIngredients
        .map(
          (ing, i) =>
            `${i + 1}. **${ing.name}** - ${ing.stock} ${ing.unit} (χαμηλό)`,
        )
        .join("\n");
      return `**Υλικά σε χαμηλό απόθεμα:**\n${list}\n\nΣκέψου να κάνεις παραγγελία σύντομα!`;
    },
  },
  // 11. Waste
  {
    keywords: ["σπατάλη", "waste"],
    handler: (data) =>
      `Κόστος σπατάλης αυτόν τον μήνα: **${formatPrice(data.monthlyWaste)}**. ${data.monthlyWaste > 200 ? "Ψηλό! Ψάξε τις αιτίες στη σελίδα Αποθήκης." : "Σε λογικά επίπεδα."}`,
  },
  // 12. Staff
  {
    keywords: ["προσωπικό", "σερβιτόρ", "staff"],
    handler: (data) => {
      if (data.staffPerformance.length === 0) {
        return "Δεν υπάρχουν δεδομένα προσωπικού ακόμα.";
      }
      const sorted = [...data.staffPerformance].sort(
        (a, b) => b.revenue - a.revenue,
      );
      const top = sorted[0];
      const list = sorted
        .map(
          (s, i) =>
            `${i + 1}. **${s.name}** - ${formatPrice(s.revenue)} / ${s.tables} τραπέζια`,
        )
        .join("\n");
      return `**Top performer:** ${top.name} με ${formatPrice(top.revenue)}\n\n${list}`;
    },
  },
  // 13. Menu optimization
  {
    keywords: ["τι να αλλάξω", "βελτιστοποίηση", "μενού optimization"],
    handler: (data) => {
      const { stars, puzzles, dogs } = data.menuEngineering;
      let response = "**Ανάλυση Μενού:**\n\n";

      if (stars.length > 0) {
        response += `**Αστέρια** (κράτα τα): ${stars.join(", ")}\n`;
      }
      if (puzzles.length > 0) {
        response += `**Puzzles** (προώθησε): ${puzzles.join(", ")}\n`;
      }
      if (dogs.length > 0) {
        response += `**Dogs** (αξιολόγησε αφαίρεση): ${dogs.join(", ")}\n`;
      }

      response +=
        "\nΔες την καρτέλα **Βελτιστοποίηση Μενού** για αναλυτικές προτάσεις.";
      return response;
    },
  },
  // 14. Greeting
  {
    keywords: ["γεια", "καλημέρα", "hey"],
    handler: (data) =>
      `Γεια σου! Σήμερα μέχρι τώρα: **${formatPrice(data.todayRevenue)}** σε **${data.todayOrders}** παραγγελίες. Τι θέλεις να μάθεις;`,
  },
];

export function processMockQuery(query: string, data: AnalyticsData): string {
  const normalized = query.toLowerCase().trim();

  for (const pattern of patterns) {
    const isMatch = pattern.keywords.some((keyword) =>
      normalized.includes(keyword.toLowerCase()),
    );
    if (isMatch) {
      return pattern.handler(data);
    }
  }

  // 15. Fallback
  return "Δεν κατάλαβα την ερώτησή σου. Δοκίμασε:\n\u2022 Πόσα πούλησα σήμερα;\n\u2022 Τι πουλάει;\n\u2022 Food cost\n\u2022 Πρόβλεψη αύριο\n\u2022 Τι να αλλάξω στο μενού;";
}
