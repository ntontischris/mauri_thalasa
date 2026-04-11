# Πλάνο Ενσωμάτωσης Λειτουργιών i-host στο EatFlow POS

## Ανάλυση Συστημάτων

### Τι είναι το i-host
Το i-host είναι ελληνικό σύστημα διαχείρισης κρατήσεων εστιατορίων (by Innopolium P.C.).
Κατέχει 85% της αγοράς σε Ελλάδα & Κύπρο. Εστιάζει σε:
- Ψηφιακό βιβλίο κρατήσεων (αντικαθιστά χαρτί/ημερολόγιο)
- Έξυπνη ανάθεση τραπεζιών (αλγοριθμική πρόταση)
- CRM πελατολόγιο με ιστορικό
- Online κρατήσεις (website, Facebook, Instagram)
- Caller ID (αναγνώριση πελάτη πριν σηκώσεις τηλέφωνο)
- SMS/Email επιβεβαιώσεις & καμπάνιες
- Waitlist / Priority Listing
- Shift management
- Reporting κρατήσεων & επισκεψιμότητας
- Mobile app (i-host Pocket) για remote πρόσβαση

### Τι έχει ήδη το EatFlow (17/24 features FULL)
| Feature | Status |
|---------|--------|
| Table Management & Floor Plan | FULL |
| Menu & Product Management | FULL |
| Order Management | FULL |
| Kitchen Display System (KDS) | FULL |
| Payment & Checkout | FULL |
| Ingredient Management | FULL |
| Recipes & Food Cost | FULL |
| Waste Management | FULL |
| Supplier Management | FULL |
| Customer Database (CRM) | FULL |
| Loyalty Program | FULL |
| Staff Management | FULL |
| Shift Scheduling | FULL |
| Staff Performance | FULL |
| Checklists | FULL |
| Analytics Dashboard | FULL |
| AI Assistant | PARTIAL (mock) |
| **Κρατήσεις** | **MISSING** |
| **Online Booking** | **MISSING** |
| **Waitlist** | **MISSING** |
| **Caller ID** | **MISSING** |
| **SMS/Email Campaigns** | **MISSING** |
| **Smart Table Suggestion** | **MISSING** |
| **Remote Mobile App** | **MISSING** |

---

## Πώς κάθε feature του i-host ενώνεται με το EatFlow

### 1. Σύστημα Κρατήσεων (Reservation System)
**i-host feature:** Ψηφιακό βιβλίο κρατήσεων
**EatFlow integration:**
- **Νέα σελίδα:** `app/(pos)/reservations/page.tsx`
- **Νέο component:** `components/pos/reservation-calendar.tsx` - Ημερολόγιο κρατήσεων
- **Νέο component:** `components/pos/reservation-form.tsx` - Φόρμα δημιουργίας
- **Νέο component:** `components/pos/reservation-timeline.tsx` - Timeline view ανά ώρα
- **Νέο hook:** `hooks/use-reservations.ts`
- **DB:** `reservations` table (migration 014)
- **Σύνδεση:** Κρατήσεις → floor plan (δείχνει reserved tables) → orders (μετατρέπεται σε order όταν seated)
- **Ήδη υπάρχει:** Ο floor plan editor, τα tables, και τα zones - απλά προσθέτουμε reservation layer

### 2. Έξυπνη Ανάθεση Τραπεζιών (Smart Table Suggestion)
**i-host feature:** Αλγόριθμος πρότασης καταλληλότερου τραπεζιού
**EatFlow integration:**
- **DB Function:** `suggest_table_for_reservation()` (migration 016) - ήδη φτιαγμένη
- **Λογική scoring:**
  - +100 αν είναι στη ζώνη προτίμησης
  - +50 αν ακριβές match χωρητικότητας
  - -10 ανά πλεονάζουσα θέση
  - -9999 αν ήδη reserved στο ίδιο χρονικό slot
- **Frontend:** Dropdown στο reservation form που δείχνει "Προτεινόμενα τραπέζια" sorted by score
- **Σύνδεση:** Χρησιμοποιεί τα υπάρχοντα tables + zones + capacity

### 3. Online Κρατήσεις (Online Booking Widget)
**i-host feature:** i-Reserve - κρατήσεις μέσω website/Facebook/Instagram
**EatFlow integration:**
- **Νέο public route:** `app/booking/page.tsx` (εκτός POS layout)
- **Νέα components:**
  - `components/booking/booking-widget.tsx` - Embeddable widget
  - `components/booking/date-picker.tsx` - Επιλογή ημερομηνίας
  - `components/booking/time-slots.tsx` - Διαθέσιμα slots
  - `components/booking/booking-confirmation.tsx` - Επιβεβαίωση
- **DB:** `booking_settings` table (migration 014), `get_available_slots()` function (migration 016)
- **Supabase:** Anon insert policy ήδη configured
- **Σύνδεση:** Widget → Supabase insert → appears in reservations calendar

### 4. Caller ID (Αναγνώριση Κλήσεων)
**i-host feature:** CallerInfo - βλέπεις το προφίλ πελάτη πριν απαντήσεις
**EatFlow integration:**
- **Νέο component:** `components/pos/caller-id-popup.tsx` - Popup με πληροφορίες πελάτη
- **DB Function:** `caller_id_lookup()` (migration 016) - ήδη φτιαγμένη
- **Λειτουργία:** Εισάγεις αριθμό τηλεφώνου → instant lookup στο customers table → δείχνει:
  - Όνομα, VIP status, loyalty points
  - Αλλεργίες (κρίσιμο!)
  - Αριθμός επισκέψεων, τελευταία επίσκεψη
  - Σημειώσεις & προτιμήσεις
- **DB:** `caller_id_log` table (migration 014)
- **Σύνδεση:** Χρησιμοποιεί το υπάρχον `customers` table + `customer_visits`
- **Μελλοντικό:** Integration με VoIP/SIP gateway για auto-popup

### 5. SMS & Email Campaigns
**i-host feature:** Στέλνεις promotional SMS/email στο πελατολόγιο
**EatFlow integration:**
- **Νέα σελίδα:** `app/(pos)/campaigns/page.tsx`
- **Νέα components:**
  - `components/pos/campaign-editor.tsx` - Δημιουργία καμπάνιας
  - `components/pos/campaign-list.tsx` - Lista καμπανιών
  - `components/pos/template-editor.tsx` - Επεξεργασία templates
  - `components/pos/recipient-selector.tsx` - Targeting πελατών
- **Νέο hook:** `hooks/use-campaigns.ts`
- **DB:** `campaigns`, `message_templates`, `notification_log` (migration 015)
- **Σύνδεση:** Χρησιμοποιεί υπάρχον `customers` table + tags + VIP status για targeting
- **Backend:** Supabase Edge Function για αποστολή μέσω Twilio (SMS) / Resend (Email)
- **Αυτοματισμοί:**
  - Auto SMS στα γενέθλια (χρησιμοποιεί `birthday` field)
  - Win-back SMS σε ανενεργούς πελάτες (χρησιμοποιεί `customer_visits.date`)
  - Loyalty reward notification (χρησιμοποιεί `loyalty_points`)

### 6. SMS Επιβεβαιώσεις Κρατήσεων
**i-host feature:** Auto SMS confirmation με 1-click confirm/cancel
**EatFlow integration:**
- **DB:** `message_templates` με type `reservation_confirmation` (migration 015 + seed 017)
- **Flow:** Reservation created → auto-send SMS → customer replies → update status
- **Backend:** Supabase Edge Function + Twilio webhook
- **Templates:** Ήδη seeded στο 017 (6 default templates)

### 7. Waitlist / Priority Listing
**i-host feature:** Lista αναμονής με προτεραιότητα
**EatFlow integration:**
- **Νέο component:** `components/pos/waitlist-panel.tsx`
- **Νέο hook:** `hooks/use-waitlist.ts`
- **DB:** `waitlist` table (migration 014), `seat_from_waitlist()` function (migration 016)
- **Flow:** Walk-in χωρίς τραπέζι → joins waitlist → table freed → SMS notification → seated
- **Σύνδεση:** Floor plan δείχνει waitlist count badge

### 8. Αναφορές Κρατήσεων (Reservation Reports)
**i-host feature:** Reports κρατήσεων & ημερήσιας κίνησης
**EatFlow integration:**
- **Νέο component:** `components/pos/analytics-reservations.tsx`
- **DB Function:** `get_reservation_stats()` (migration 016) - ήδη φτιαγμένη
- **Metrics:**
  - Σύνολο κρατήσεων / ακυρώσεις / no-shows
  - Μέσος αριθμός ατόμων
  - Peak ώρες κρατήσεων
  - Κανάλι προέλευσης (phone/web/social)
  - Conversion rate (reservation → seated)
- **Σύνδεση:** Ενσωματώνεται στο υπάρχον analytics dashboard (`/reports`)

### 9. Mobile Remote Access (i-host Pocket)
**i-host feature:** App για remote πρόσβαση σε κρατήσεις 24/7
**EatFlow integration:**
- **Ήδη responsive:** Το Next.js app τρέχει σε browser κινητού
- **PWA:** Μετατροπή σε Progressive Web App (manifest.json + service worker)
- **Push Notifications:** Via Supabase Realtime + Web Push API
- **Dedicated views:** Compact reservation list view για mobile

---

## Αρχιτεκτονικό Διάγραμμα Ενσωμάτωσης

```
┌─────────────────────────────────────────────────────────────┐
│                    EatFlow POS (Existing)                     │
│  ┌─────────┐ ┌────────┐ ┌─────────┐ ┌──────────┐           │
│  │ Tables & │ │ Orders │ │ Kitchen │ │ Checkout │           │
│  │FloorPlan│ │        │ │  KDS    │ │ Payment  │           │
│  └────┬────┘ └───┬────┘ └────┬────┘ └────┬─────┘           │
│       │          │           │            │                  │
│  ┌────┴──────────┴───────────┴────────────┴─────┐           │
│  │              Supabase Database                │           │
│  │  tables, orders, products, customers, etc.    │           │
│  └────┬──────────┬───────────┬────────────┬─────┘           │
│       │          │           │            │                  │
│  ┌────┴────┐ ┌───┴────┐ ┌───┴──────┐ ┌───┴─────┐           │
│  │Inventory│ │  CRM   │ │ Loyalty  │ │Analytics│           │
│  │ Recipes │ │        │ │ Points   │ │ Reports │           │
│  └─────────┘ └────────┘ └──────────┘ └─────────┘           │
└─────────────────────────────────────────────────────────────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
┌──────────────────────────────────────────────────────────────┐
│               i-host Features (NEW)                           │
│                                                               │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────────┐   │
│  │ Reservations │  │   Waitlist   │  │  Online Booking   │   │
│  │  Calendar    │  │  Priority    │  │     Widget        │   │
│  │  Timeline    │←─│  SMS Ready   │  │  Public Page      │   │
│  │  Form        │  │  Seat        │  │  Date/Time Picker │   │
│  └──────┬───────┘  └──────────────┘  └───────────────────┘   │
│         │                                                     │
│  ┌──────┴───────┐  ┌──────────────┐  ┌───────────────────┐   │
│  │  Smart Table │  │  Caller ID   │  │  SMS & Email      │   │
│  │  Suggestion  │  │  Lookup      │  │  Campaigns        │   │
│  │  Algorithm   │  │  Auto-popup  │  │  Templates        │   │
│  └──────────────┘  └──────────────┘  │  Auto Birthday    │   │
│                                       │  Win-back         │   │
│  ┌──────────────┐  ┌──────────────┐  │  Notifications    │   │
│  │ Reservation  │  │   PWA /      │  └───────────────────┘   │
│  │  Reports     │  │ Mobile App   │                           │
│  │  No-shows    │  │ Push Notify  │                           │
│  └──────────────┘  └──────────────┘                           │
└──────────────────────────────────────────────────────────────┘
```

---

## Σειρά Υλοποίησης (Phases)

### Phase 1: Reservation Core (1-2 εβδομάδες)
Τα βασικά που κάνει κι ο i-host.

| # | Task | Files | Εξαρτάται από |
|---|------|-------|---------------|
| 1.1 | Reservation types στο `lib/types.ts` | types.ts | - |
| 1.2 | Reservation context actions στο `pos-context.tsx` | pos-context.tsx | 1.1 |
| 1.3 | `use-reservations` hook | hooks/use-reservations.ts | 1.2 |
| 1.4 | Reservation Calendar component | components/pos/reservation-calendar.tsx | 1.3 |
| 1.5 | Reservation Form component | components/pos/reservation-form.tsx | 1.3 |
| 1.6 | Reservation Timeline component | components/pos/reservation-timeline.tsx | 1.3 |
| 1.7 | Reservations page | app/(pos)/reservations/page.tsx | 1.4-1.6 |
| 1.8 | Sidebar link | components/pos/sidebar.tsx | 1.7 |
| 1.9 | Floor plan reservation overlay | components/pos/floor-plan-view.tsx | 1.3 |

### Phase 2: Smart Features (1 εβδομάδα)
Τα "έξυπνα" features που κάνουν τη διαφορά.

| # | Task | Files |
|---|------|-------|
| 2.1 | Smart table suggestion UI | components/pos/smart-table-suggestion.tsx |
| 2.2 | Caller ID popup component | components/pos/caller-id-popup.tsx |
| 2.3 | Caller ID integration στο reservation form | reservation-form.tsx |
| 2.4 | Waitlist panel component | components/pos/waitlist-panel.tsx |
| 2.5 | `use-waitlist` hook | hooks/use-waitlist.ts |
| 2.6 | Waitlist badge στο sidebar | sidebar.tsx |

### Phase 3: Online Booking (1 εβδομάδα)
Public-facing reservation widget.

| # | Task | Files |
|---|------|-------|
| 3.1 | Booking widget page (public) | app/booking/page.tsx |
| 3.2 | Booking date picker | components/booking/date-picker.tsx |
| 3.3 | Available time slots | components/booking/time-slots.tsx |
| 3.4 | Booking confirmation | components/booking/booking-confirmation.tsx |
| 3.5 | Booking settings management | components/pos/booking-settings.tsx |
| 3.6 | Booking settings στο Settings page | app/(pos)/settings/page.tsx |

### Phase 4: Campaigns & Notifications (1 εβδομάδα)
SMS/Email marketing & notifications.

| # | Task | Files |
|---|------|-------|
| 4.1 | Campaign types | lib/types.ts |
| 4.2 | `use-campaigns` hook | hooks/use-campaigns.ts |
| 4.3 | Campaign editor | components/pos/campaign-editor.tsx |
| 4.4 | Campaign list | components/pos/campaign-list.tsx |
| 4.5 | Template editor | components/pos/template-editor.tsx |
| 4.6 | Campaigns page | app/(pos)/campaigns/page.tsx |
| 4.7 | Supabase Edge Function: send SMS | supabase/functions/send-sms/ |
| 4.8 | Supabase Edge Function: send email | supabase/functions/send-email/ |

### Phase 5: Analytics & Mobile (1 εβδομάδα)
Reports + PWA.

| # | Task | Files |
|---|------|-------|
| 5.1 | Reservation analytics component | components/pos/analytics-reservations.tsx |
| 5.2 | Integrate into Reports page | app/(pos)/reports/page.tsx |
| 5.3 | PWA manifest.json | public/manifest.json |
| 5.4 | Service worker | public/sw.js |
| 5.5 | Mobile-optimized reservation view | components/pos/reservation-mobile.tsx |
| 5.6 | Push notification setup | lib/push-notifications.ts |

---

## Σύνδεση DB Tables

Τα νέα tables (014-016) συνδέονται με τα υπάρχοντα (001-013):

```
reservations ──→ customers (customer_id)
             ──→ tables (table_id)
             ──→ zones (zone_id)
             ──→ staff_members (created_by)

waitlist ──→ customers (customer_id)
         ──→ zones (preferred_zone_id)
         ──→ tables (table_id - when seated)

caller_id_log ──→ customers (customer_id)
              ──→ reservations (reservation_id)
              ──→ staff_members (handled_by)

campaigns ──→ staff_members (created_by)

notification_log ──→ customers (customer_id)
                 ──→ reservations (reservation_id)
                 ──→ campaigns (campaign_id)
```

---

## Πλεονεκτήματα vs i-host

Μετά την ολοκλήρωση, το EatFlow θα έχει **ΟΛΑ** τα features του i-host PLUS:

| Feature | i-host | EatFlow |
|---------|--------|---------|
| Κρατήσεις | ✅ | ✅ (μετά Phase 1) |
| Smart Table Suggestion | ✅ | ✅ (μετά Phase 2) |
| Caller ID | ✅ | ✅ (μετά Phase 2) |
| Online Booking | ✅ | ✅ (μετά Phase 3) |
| SMS/Email Campaigns | ✅ | ✅ (μετά Phase 4) |
| Waitlist | ✅ | ✅ (μετά Phase 2) |
| Reports | ✅ | ✅ (μετά Phase 5) |
| Mobile App | ✅ | ✅ PWA (μετά Phase 5) |
| **POS / Ordering** | ❌ | ✅ |
| **Kitchen Display (KDS)** | ❌ | ✅ |
| **Payment Processing** | ❌ | ✅ |
| **Inventory Management** | ❌ | ✅ |
| **Recipe / Food Cost** | ❌ | ✅ |
| **Supplier Management** | ❌ | ✅ |
| **Loyalty Program** | ❌ | ✅ |
| **Staff Performance** | ❌ | ✅ |
| **Advanced Analytics** | ❌ | ✅ |
| **AI Assistant** | ❌ | ✅ |
| **Waste Tracking** | ❌ | ✅ |

**Αποτέλεσμα:** Ένα ολοκληρωμένο σύστημα που καλύπτει ΟΛΟΝ τον κύκλο ζωής ενός εστιατορίου - από την κράτηση μέχρι το κλείσιμο ταμείου.
