# EatFlow POS — Sub-project 5: Staff Management

**Date:** 2026-03-27
**Status:** Approved
**Scope:** UI-only demo with mock data (localStorage).

## Overview

Add staff management with PIN login, shift scheduling, performance tracking, and opening/closing checklists.

## 1. Types

```typescript
type StaffRole = 'waiter' | 'chef' | 'barman' | 'manager'
type ShiftType = 'morning' | 'afternoon' | 'off'
type ChecklistType = 'opening' | 'closing'

interface StaffMember {
  id: string
  name: string
  role: StaffRole
  pin: string           // 4-digit
  phone?: string
  email?: string
  isActive: boolean
}

interface Shift {
  id: string
  staffId: string
  date: string          // ISO date (YYYY-MM-DD)
  type: ShiftType
  clockIn?: string      // ISO datetime
  clockOut?: string
}

interface ChecklistItem {
  id: string
  type: ChecklistType
  label: string
  checked: boolean
}

interface StaffPerformance {
  staffId: string
  tablesServed: number
  revenue: number
  avgServiceTime: number  // minutes
  tips: number
}
```

### State Additions

```typescript
interface POSState {
  // ...existing
  staff: StaffMember[]
  shifts: Shift[]
  checklist: ChecklistItem[]
  activeStaffId: string | null  // currently logged-in staff
}
```

## 2. Page `/staff` — Tabs: Προσωπικό | Βάρδιες | Performance | Checklist

### Tab 1: Προσωπικό (Staff List)

Table: Όνομα, Ρόλος (badge), PIN (masked ****), Τηλ, Status (Ενεργός/Ανενεργός badge)
- Role badges colored: waiter→blue, chef→orange, barman→purple, manager→green
- Role labels Greek: Σερβιτόρος, Μάγειρας, Μπάρμαν, Manager
- "+ Νέο Μέλος" → form dialog
- Edit/delete per member
- Toggle active/inactive

### Tab 2: Βάρδιες (Scheduling)

Weekly grid view:
- Rows: staff members (active only)
- Columns: 7 days (current week, with prev/next week navigation)
- Cells: shift type badge (Πρωί 08-16 → blue, Απόγευμα 16-00 → amber, Κλειστό → gray)
- Click cell → cycle through: Πρωί → Απόγευμα → Κλειστό → Πρωί

Clock in/out section:
- Today's shift for each active staff member
- "Clock In" button (records current time)
- "Clock Out" button (records current time)
- Duration display when both are set

Weekly hours summary:
- Per staff: total shifts, total hours (morning=8h, afternoon=8h)

### Tab 3: Performance

Cards per staff member showing:
- Τραπέζια: number served (mock)
- Τζίρος: revenue generated (mock)
- Μέσος Χρόνος: avg service time (mock)
- Tips: total tips (mock)
- Ranking badge (🥇🥈🥉 for top 3 by revenue)

Bar chart: revenue per staff member (Recharts BarChart)

### Tab 4: Checklist

Two sections: Άνοιγμα | Κλείσιμο

Opening checklist items:
- Έλεγχος καθαριότητας χώρου
- Ενεργοποίηση POS συστήματος
- Έλεγχος αποθήκης / πρώτων υλών
- Προετοιμασία τραπεζιών
- Έλεγχος εξοπλισμού κουζίνας
- Ενημέρωση μενού (εξαντλημένα)

Closing checklist items:
- Κλείσιμο ταμείου / μέτρηση
- Καθαρισμός κουζίνας
- Καθαρισμός τραπεζιών & αίθουσας
- Έλεγχος αποθήκης
- Κλείδωμα πορτών & παραθύρων
- Απενεργοποίηση εξοπλισμού

Each item: checkbox + label
Progress bar per section (X/Y completed)
"Επαναφορά" button to reset all checkboxes

## 3. PIN Login (Header Integration)

- Small PIN input in header (or modal on app load)
- 4-digit numeric keypad (0-9, backspace, enter)
- Matches PIN to staff member → sets activeStaffId
- Header shows: "👤 {name} ({role})" when logged in
- "Αποσύνδεση" button → clears activeStaffId
- Demo: works without login (all features accessible)

## 4. Hook

### `useStaff()`
- staff, shifts, checklist, activeStaffId (from state)
- addStaff, updateStaff, deleteStaff, toggleActive
- login(pin) → finds staff by pin, sets activeStaffId, returns staff or null
- logout() → clears activeStaffId
- getActiveStaff() → current logged-in staff member
- getShiftsForWeek(weekStart) → filter shifts for 7-day period
- setShift(staffId, date, type) → add or update shift
- clockIn(staffId) → records current time on today's shift
- clockOut(staffId) → records current time
- toggleChecklistItem(itemId)
- resetChecklist(type)
- getChecklistProgress(type) → { checked, total, percent }
- getPerformance() → StaffPerformance[] (from mock data)

## 5. Reducer Actions

```typescript
| { type: 'ADD_STAFF'; payload: StaffMember }
| { type: 'UPDATE_STAFF'; payload: StaffMember }
| { type: 'DELETE_STAFF'; payload: string }
| { type: 'SET_ACTIVE_STAFF'; payload: string | null }
| { type: 'SET_SHIFT'; payload: Shift }
| { type: 'CLOCK_IN'; payload: { staffId: string; time: string } }
| { type: 'CLOCK_OUT'; payload: { staffId: string; time: string } }
| { type: 'TOGGLE_CHECKLIST'; payload: string }
| { type: 'RESET_CHECKLIST'; payload: ChecklistType }
```

## 6. File Structure

```
hooks/
  use-staff.ts              NEW

components/pos/
  staff-list.tsx            NEW — Staff table + form
  staff-form.tsx            NEW — Add/edit staff dialog
  shift-scheduler.tsx       NEW — Weekly grid + clock in/out
  staff-performance.tsx     NEW — Performance cards + chart
  staff-checklist.tsx       NEW — Opening/closing checklists
  pin-login.tsx             NEW — PIN keypad dialog/component

app/(pos)/
  staff/page.tsx            NEW — 4-tab staff page
```

## 7. Mock Data

### 6 Staff Members
1. Αλέξανδρος Κ. — Manager, PIN 1234, active
2. Μαρίνα Π. — Σερβιτόρος, PIN 5678, active
3. Θοδωρής Μ. — Σερβιτόρος, PIN 9012, active
4. Ελισάβετ Δ. — Μπάρμαν, PIN 3456, active
5. Στέφανος Ν. — Μάγειρας, PIN 7890, active
6. Κατερίνα Α. — Σερβιτόρος, PIN 2345, inactive

### Shifts
Pre-filled week schedule for all active staff.

### Performance (mock)
Per staff member: tables 5-25, revenue €400-2500, avg time 8-15min, tips €20-120.

### Checklist
12 items (6 opening + 6 closing), all unchecked by default.

## 8. Sidebar
Add after Loyalty: 👤 Προσωπικό (`/staff`)

## 9. Header Update
Show active staff name in the POS header/layout when logged in.
