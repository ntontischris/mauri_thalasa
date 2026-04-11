-- ============================================================
-- Migration 008: Staff Management
-- EatFlow POS - Staff Members, Shifts, Checklists, Performance
-- ============================================================
-- Maps to: StaffMember, Shift, ChecklistItem, StaffPerformance in lib/types.ts

CREATE TABLE staff_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    role staff_role NOT NULL DEFAULT 'waiter',
    pin TEXT NOT NULL, -- 4-digit PIN for quick login
    phone TEXT,
    email TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Staff shift schedule
-- Maps to: Shift interface in lib/types.ts
CREATE TABLE shifts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID NOT NULL REFERENCES staff_members(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    type shift_type NOT NULL DEFAULT 'morning',
    clock_in TIMESTAMPTZ,
    clock_out TIMESTAMPTZ,
    UNIQUE(staff_id, date) -- one shift per staff per day
);

-- Opening/closing checklists
-- Maps to: ChecklistItem interface in lib/types.ts
CREATE TABLE checklist_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type checklist_type NOT NULL,
    label TEXT NOT NULL,
    checked BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Staff performance metrics (aggregated KPIs)
-- Maps to: StaffPerformance interface in lib/types.ts
CREATE TABLE staff_performance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID NOT NULL REFERENCES staff_members(id) ON DELETE CASCADE,
    tables_served INTEGER NOT NULL DEFAULT 0,
    revenue NUMERIC(10,2) NOT NULL DEFAULT 0,
    avg_service_time NUMERIC(6,1) NOT NULL DEFAULT 0, -- minutes
    tips NUMERIC(10,2) NOT NULL DEFAULT 0,
    period_start DATE NOT NULL DEFAULT CURRENT_DATE,
    period_end DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER staff_members_updated_at BEFORE UPDATE ON staff_members
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
