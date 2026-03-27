# EatFlow POS — Sub-project 4: CRM & Loyalty

**Date:** 2026-03-27
**Status:** Approved
**Scope:** UI-only demo with mock data (localStorage).

## Overview

Add customer relationship management (profiles, allergies, VIP, visit history, favorites) and loyalty program (points, stamps, win-back campaigns) to the EatFlow POS demo. Two new pages: /customers and /loyalty.

## 1. New Types

```typescript
interface Customer {
  id: string
  name: string
  phone?: string
  email?: string
  birthday?: string       // ISO date
  notes?: string
  isVip: boolean
  allergies: string[]     // e.g. ['Γλουτένη', 'Ξηροί καρποί']
  tags: string[]          // e.g. ['Τακτικός', 'Business lunch']
  loyaltyPoints: number
  stampCount: number
  createdAt: string
}

interface CustomerVisit {
  id: string
  customerId: string
  orderId: string
  date: string
  tableNumber: number
  total: number
  items: string[]         // product names for quick display
}

interface LoyaltySettings {
  pointsPerEuro: number       // default 1
  pointsForReward: number     // default 100
  rewardValue: number         // default 5 (€5 discount)
  stampsForFreeItem: number   // default 10
}
```

### State Additions

```typescript
interface POSState {
  // ...existing
  customers: Customer[]
  customerVisits: CustomerVisit[]
  loyaltySettings: LoyaltySettings
}
```

## 2. Page `/customers` — Πελατολόγιο

### Customer List
Table with columns:
- Όνομα (bold)
- Τηλέφωνο
- Επισκέψεις (count from customerVisits)
- Σύνολο € (sum from visits)
- VIP badge (star icon, gold)
- Αλλεργίες (red badges if any)
- Tags (colored chips)

Features:
- Search by name/phone
- Filter: Όλοι | VIP | Με Αλλεργίες
- Sort by name, visits, total spent
- "+ Νέος Πελάτης" button → form dialog

### Customer Detail (click row → expand or sheet)

**Προσωπικά:**
- Name, phone, email, birthday (with age calc), notes
- VIP toggle
- Tags (editable chips)
- Edit button

**Αλλεργίες:**
- Predefined toggles: Γλουτένη, Λακτόζη, Ξηροί Καρποί, Θαλασσινά, Αυγά, Σόγια
- Custom allergy input
- Red warning styling

**Αγαπημένα Πιάτα:**
- Auto-calculated from visit history: top 3 most ordered products
- Show product name + order count

**Ιστορικό Επισκέψεων:**
- Table: date, table number, total, items list
- Sort by date desc
- Last 20 visits

**Loyalty Info (inline):**
- Points balance
- Stamp progress (visual: filled/empty dots)
- Next reward info

### VIP & Birthdays Section (top of page)
Alert cards:
- "🎂 Γενέθλια τις επόμενες 7 ημέρες:" — list of customers
- "⭐ VIP Πελάτες:" — count

## 3. Page `/loyalty` — Πρόγραμμα Πιστότητας

### Settings Card
- Πόντοι ανά €1 (number input)
- Πόντοι για reward (number input)
- Αξία reward € (number input)
- Stamps για δωρεάν (number input)
- Save button

### Customer Rankings
Table sorted by loyalty points desc:
- Rank, Name, Points, Stamps (X/10), Total Spent, Last Visit
- Visual: stamp progress bar per customer

### Near Reward
Card highlighting customers close to earning a reward:
- "8/10 stamps — σχεδόν δωρεάν!"
- ">80 πόντοι — κοντά στην έκπτωση!"

### Win-back Campaigns (mock)
- "Αδρανείς Πελάτες" — customers with no visit in 30+ days
- Table: name, last visit date, days since last visit, total spent
- "Στείλε SMS" button (mock — shows toast "Demo: SMS δεν στάλθηκε")
- "Στείλε Email" button (mock — same)
- Template preview: "Αγαπητέ {name}, μας λείψατε! Ελάτε με 15% έκπτωση"

## 4. Hooks

### `useCustomers()`
- customers (from state)
- addCustomer, updateCustomer, deleteCustomer
- getCustomerVisits(customerId) — filter customerVisits
- getVisitCount(customerId) — count
- getTotalSpent(customerId) — sum of visit totals
- getFavoriteProducts(customerId, limit) — aggregate items from visits, return top N
- getVipCustomers() — filter isVip
- getUpcomingBirthdays(days) — customers with birthday in next N days
- searchCustomers(query) — filter by name/phone
- addVisit(customerId, orderId, tableNumber, total, items)

### `useLoyalty()`
- loyaltySettings (from state)
- updateLoyaltySettings(settings)
- addPoints(customerId, points)
- redeemPoints(customerId) — subtract pointsForReward, return true/false
- addStamp(customerId)
- redeemStamps(customerId) — reset to 0, return true/false
- getRankings() — customers sorted by points desc
- getNearReward(threshold) — customers close to pointsForReward
- getNearStampReward(threshold) — customers close to stampsForFreeItem
- getIdleCustomers(days) — customers with no visit in N+ days

## 5. Reducer Actions

```typescript
// Customers
| { type: 'ADD_CUSTOMER'; payload: Customer }
| { type: 'UPDATE_CUSTOMER'; payload: Customer }
| { type: 'DELETE_CUSTOMER'; payload: string }

// Customer Visits
| { type: 'ADD_CUSTOMER_VISIT'; payload: CustomerVisit }

// Loyalty
| { type: 'UPDATE_LOYALTY_SETTINGS'; payload: LoyaltySettings }
| { type: 'ADD_LOYALTY_POINTS'; payload: { customerId: string; points: number } }
| { type: 'REDEEM_LOYALTY_POINTS'; payload: { customerId: string; points: number } }
| { type: 'ADD_STAMP'; payload: string }  // customerId
| { type: 'REDEEM_STAMPS'; payload: string }  // customerId — resets to 0
```

## 6. File Structure

```
hooks/
  use-customers.ts          NEW
  use-loyalty.ts            NEW

components/pos/
  customer-list.tsx         NEW — Customer table with search/filter
  customer-form.tsx         NEW — Add/edit customer dialog
  customer-detail.tsx       NEW — Expanded customer view
  customer-allergies.tsx    NEW — Allergy tag selector
  loyalty-settings.tsx      NEW — Settings card
  loyalty-rankings.tsx      NEW — Customer rankings table
  loyalty-winback.tsx       NEW — Win-back campaign section

app/(pos)/
  customers/page.tsx        NEW
  loyalty/page.tsx          NEW

lib/
  types.ts                  MODIFIED
  pos-context.tsx           MODIFIED
  mock-data.ts              MODIFIED — add mock customers, visits, loyalty settings
```

## 7. Mock Data

### 15 Customers
Greek names with realistic data:
1. Γιάννης Κωνσταντίνου — VIP, 25 visits, €2,100 spent, birthday in 5 days, no allergies, tags: ["Τακτικός", "Κρασί lover"]
2. Μαρία Παπαδοπούλου — VIP, 18 visits, €1,400, allergies: ["Γλουτένη"], tags: ["Business lunch"]
3. Νίκος Δημητρίου — 12 visits, €850, allergies: ["Ξηροί Καρποί", "Λακτόζη"]
4. Ελένη Γεωργίου — VIP, 30 visits, €3,200, birthday in 2 days, tags: ["Foodie", "Τακτικός"]
5. Δημήτρης Αλεξίου — 8 visits, €520, no allergies
6. Σοφία Νικολάου — 15 visits, €1,100, allergies: ["Θαλασσινά"]
7. Κώστας Παπανικολάου — 5 visits, €380, tags: ["Νέος"]
8. Αναστασία Βασιλείου — VIP, 22 visits, €1,800, tags: ["Τακτικός"]
9. Πέτρος Ιωάννου — 3 visits, €240, idle 45 days (win-back candidate)
10. Χριστίνα Μιχαήλ — 2 visits, €180, idle 60 days
11. Αλέξανδρος Θεοδώρου — 10 visits, €720, tags: ["Business lunch"]
12. Κατερίνα Σταματίου — 7 visits, €490, allergies: ["Αυγά"]
13. Θανάσης Πολυχρόνου — 1 visit, €85, idle 90 days
14. Βασιλική Οικονόμου — 14 visits, €960, stamps: 8/10
15. Γεώργιος Αθανασίου — 9 visits, €650, points: 85 (near reward)

### Visit History
3-5 visits per customer connected to mock product names. Varied dates over last 90 days.

### Loyalty Settings (default)
- pointsPerEuro: 1
- pointsForReward: 100
- rewardValue: 5
- stampsForFreeItem: 10

## 8. Sidebar Updates

Add after Συνταγές:
- 👥 Πελάτες (`/customers`)
- 🎁 Loyalty (`/loyalty`)
