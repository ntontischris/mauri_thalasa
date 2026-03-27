// EatFlow POS - OpenAI API Wrapper + Context Builder

import type { AnalyticsData } from "./ai-mock-patterns";

export async function callOpenAI(
  apiKey: string,
  systemPrompt: string,
  userMessage: string,
): Promise<string> {
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        temperature: 0.3,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      const errorMsg = errorData?.error?.message ?? `HTTP ${response.status}`;
      return `Σφάλμα OpenAI: ${errorMsg}`;
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch {
    return "Σφάλμα σύνδεσης με OpenAI. Ελέγξτε το API key.";
  }
}

export function buildSystemPrompt(data: AnalyticsData): string {
  const context = {
    todayRevenue: data.todayRevenue,
    yesterdayRevenue: data.yesterdayRevenue,
    todayOrders: data.todayOrders,
    avgCheck: data.avgCheck,
    topProducts: data.topProducts.slice(0, 5),
    worstProducts: data.worstProducts.slice(0, 5),
    foodCostPercent: data.foodCostPercent,
    paymentBreakdown: data.paymentBreakdown,
    lowStockIngredients: data.lowStockIngredients,
    monthlyWaste: data.monthlyWaste,
    menuEngineering: data.menuEngineering,
    staffPerformance: data.staffPerformance,
  };

  return `Είσαι ο AI βοηθός του εστιατορίου "Μαύρη Θάλασσα". Απάντα πάντα στα ελληνικά. Χρησιμοποίησε τα δεδομένα που σου δίνονται για να απαντήσεις με ακρίβεια. Να είσαι σύντομος, πρακτικός και φιλικός.

Χρησιμοποίησε **bold** για σημαντικούς αριθμούς. Τα ποσά είναι σε ευρώ (€).

Δεδομένα εστιατορίου:
${JSON.stringify(context, null, 2)}

Κανόνες:
- Αν δεν έχεις αρκετά δεδομένα για κάτι, πες το ειλικρινά
- Δώσε πρακτικές συμβουλές, όχι γενικολογίες
- Αν ρωτηθείς για πρόβλεψη, βάσισε την στα ιστορικά δεδομένα
- Μορφοποίησε τις απαντήσεις σου με bullet points όπου χρειάζεται`;
}
