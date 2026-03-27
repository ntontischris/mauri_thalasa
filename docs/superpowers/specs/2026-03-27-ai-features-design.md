# EatFlow POS — Sub-project 6: AI Features

**Date:** 2026-03-27
**Status:** Approved
**Scope:** UI-only demo with localStorage. Mock AI default, optional OpenAI gpt-4o-mini integration.

## Overview

Add AI-powered features: natural language chat assistant, demand forecasting, and menu optimization recommendations. Works offline with smart pattern matching, optionally connects to OpenAI for real NLP.

## 1. Types

```typescript
interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

interface DemandForecast {
  productId: string
  productName: string
  predictedQuantity: number
  confidence: 'high' | 'medium' | 'low'
  basedOn: string
}

interface MenuSuggestion {
  type: 'promote' | 'reprice' | 'remove' | 'keep'
  productId: string
  productName: string
  reason: string
  action: string
  impact?: string    // estimated revenue impact
}

interface AISettings {
  openaiKey: string
  enabled: boolean
}
```

## 2. Page `/ai` — 3 Tabs: Assistant | Πρόβλεψη | Βελτιστοποίηση Μενού

### Tab 1: AI Assistant (Chat)

Chat interface:
- Message list (scrollable): user messages right-aligned (blue), assistant left-aligned (gray)
- Input bar at bottom: text input + send button
- Suggested questions as chips above input: "Πόσα πούλησα σήμερα;", "Τι πουλάει;", "Πρόβλεψη αύριο", "Τι να αλλάξω στο μενού;"
- Typing indicator when processing
- Markdown-like rendering for bold, numbers, lists in responses

**Mock mode patterns (~20):**

Revenue queries:
- "πόσα πούλησα σήμερα" → getTodayRevenue()
- "πόσα πούλησα χθες" → getYesterdayRevenue()
- "πόσα πούλησα (αυτή την|την) εβδομάδα" → sum last 7 days
- "τζίρος" → today revenue + comparison

Product queries:
- "τι πουλάει" / "top πιάτα" → getTopProducts(5)
- "τι δεν πουλάει" / "χειρότερα" → getWorstProducts(5)
- "πόσα πούλησα {product name}" → product-specific stats

Analytics:
- "food cost" / "κόστος" → average food cost %
- "margin" → best/worst margin products
- "μέσος λογαριασμός" → getAverageCheck()
- "μετρητά κάρτα" → getPaymentBreakdown()

Forecasting:
- "πρόβλεψη αύριο" / "τι θα πουλήσω αύριο" → demand forecast summary
- "πρόβλεψη εβδομάδα" → weekly forecast

Operations:
- "αποθήκη" / "stock" / "υλικά" → low stock alerts
- "σπατάλη" → monthly waste cost
- "προσωπικό" / "σερβιτόρος" → staff performance summary
- "τι να αλλάξω" / "βελτιστοποίηση" → menu optimization summary

Fallback: "Δεν κατάλαβα την ερώτησή σου. Δοκίμασε κάτι από αυτά:" + suggestion chips

**OpenAI mode:**
- System prompt with structured context data (JSON):
  - todayRevenue, orderCount, avgCheck
  - topProducts (top 5), worstProducts (bottom 5)
  - foodCostPercent, margins (all products)
  - lowStockIngredients
  - wasteThisMonth
  - staffPerformance
  - menuEngineering (stars/cows/puzzles/dogs)
- Model: gpt-4o-mini
- Temperature: 0.3 (factual)
- Max tokens: 500
- Instructions: "Είσαι ο AI βοηθός του εστιατορίου Μαύρη Θάλασσα. Απάντα στα ελληνικά. Χρησιμοποίησε τα δεδομένα που σου δίνονται. Να είσαι σύντομος και πρακτικός."

### Tab 2: Πρόβλεψη Ζήτησης (Demand Forecasting)

Date selector: Αύριο | Εβδομάδα

**Forecast algorithm (mock):**
For each product:
1. Get average daily sales for the target day-of-week from mockHistory
2. Apply trend multiplier (if last week > previous week → 1.1x, else 0.9x)
3. Confidence: high if >5 data points, medium if 3-5, low if <3

**Display:**
- Forecast table: Πιάτο, Εκτίμηση Τεμ., Confidence badge (🟢/🟡/🔴), Βάση Πρόβλεψης
- Chart: LineChart showing last 7 days actual + next day forecast (dashed line)
- Summary cards: Εκτιμώμενος Τζίρος Αύριο, Εκτιμώμενες Παραγγελίες
- "Προτεινόμενη Παραγγελία Υλικών" — based on forecast × recipe ingredients, shows which ingredients to order

### Tab 3: Βελτιστοποίηση Μενού (Menu Optimization)

Actionable recommendations using menu engineering data:

**4 recommendation sections:**

1. **📈 Προώθησε** (Puzzles) — High margin, low sales
   - "Βάλε πρώτο στο μενού", "Highlight στο digital menu"
   - Impact: "Αν διπλασιαστούν οι πωλήσεις → +€X/μήνα"

2. **💰 Αύξησε Τιμή** (Cash Cows) — Low margin, high sales
   - "Αύξηση €2-3 δεν θα μειώσει τις πωλήσεις"
   - Impact: "Αύξηση €2 → +€X/μήνα"

3. **⭐ Κράτα** (Stars) — High margin, high sales
   - "Τα αστέρια σου — μην αλλάξεις τίποτα"

4. **🗑️ Αξιολόγησε** (Dogs) — Low margin, low sales
   - "Σκέψου αντικατάσταση ή αφαίρεση"
   - Impact: "Αντικατάσταση με πιάτο 60% margin → +€X/μήνα"

**Revenue projection:**
- "Αν εφαρμόσεις όλες τις προτάσεις: εκτιμώμενη αύξηση €X/μήνα (+Y%)"
- Before/After comparison cards

## 3. Hook: `useAI()`

```typescript
function useAI() {
  // Chat
  processMessage(text: string): Promise<string>  // returns response
  // internally: if openaiKey → call OpenAI, else → mock pattern matching

  // Forecasting
  getForecast(targetDate: string): DemandForecast[]
  getWeekForecast(): { date: string; forecasts: DemandForecast[] }[]
  getForecastedRevenue(targetDate: string): number
  getIngredientOrderSuggestion(targetDate: string): { ingredient: Ingredient; neededQty: number; currentStock: number; toOrder: number }[]

  // Menu Optimization
  getOptimizationSuggestions(): MenuSuggestion[]
  getRevenueProjection(): { current: number; projected: number; increase: number; increasePercent: number }
}
```

## 4. OpenAI Integration

### API Call (in hook or utility)
```typescript
async function callOpenAI(apiKey: string, systemPrompt: string, userMessage: string): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ],
      temperature: 0.3,
      max_tokens: 500
    })
  })
  const data = await response.json()
  return data.choices[0].message.content
}
```

### Context Builder
Function that collects all relevant data from state and formats it as a concise JSON/text context for the system prompt.

## 5. Settings Addition

Add to settings page (`/settings`):

New section "AI Assistant":
- Toggle: "Ενεργοποίηση OpenAI"
- API Key input (type=password)
- "Δοκιμή" button → sends test message, shows success/error
- Model display: "gpt-4o-mini"
- Note: "Τα δεδομένα στέλνονται στο OpenAI API. Χωρίς key, λειτουργεί με ενσωματωμένες απαντήσεις."

Store in localStorage as `aiSettings: AISettings`.

## 6. File Structure

```
hooks/
  use-ai.ts                    NEW — Chat, forecast, optimization logic

lib/
  ai-mock-patterns.ts          NEW — Pattern matching rules for mock mode
  ai-openai.ts                 NEW — OpenAI API call wrapper + context builder

components/pos/
  ai-chat.tsx                  NEW — Chat interface
  ai-forecast.tsx              NEW — Demand forecasting tab
  ai-menu-optimization.tsx     NEW — Menu optimization recommendations
  ai-settings.tsx              NEW — AI settings section for settings page

app/(pos)/
  ai/page.tsx                  NEW — 3-tab AI page
```

## 7. State Addition

```typescript
interface POSState {
  // ...existing
  aiSettings: AISettings
  chatHistory: ChatMessage[]
}
```

New actions:
```typescript
| { type: 'UPDATE_AI_SETTINGS'; payload: AISettings }
| { type: 'ADD_CHAT_MESSAGE'; payload: ChatMessage }
| { type: 'CLEAR_CHAT_HISTORY' }
```

## 8. Sidebar
Add: 🤖 AI Assistant (`/ai`)

## 9. Mock Data
- `initialAISettings: AISettings` — { openaiKey: '', enabled: false }
- `initialChatHistory: ChatMessage[]` — empty array, or 1 welcome message
