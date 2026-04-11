-- ============================================================
-- Migration 014: Reservation System (i-host Feature Integration)
-- EatFlow POS - Reservations, Waitlist, Online Booking
-- ============================================================
-- These tables implement the core i-host features:
-- - Reservation management (digital reservation book)
-- - Smart table suggestion algorithm
-- - Waitlist / priority listing
-- - Online booking widget support
-- - Caller ID customer lookup
-- - SMS/Email confirmations

-- Reservation status lifecycle
CREATE TYPE reservation_status AS ENUM (
    'pending',      -- just created, awaiting confirmation
    'confirmed',    -- confirmed by restaurant or via SMS
    'seated',       -- guests have arrived and are seated
    'completed',    -- reservation fulfilled
    'cancelled',    -- cancelled by guest or restaurant
    'no_show'       -- guest didn't arrive
);

-- Reservation source / channel
CREATE TYPE reservation_source AS ENUM (
    'phone',        -- telephone reservation
    'walk_in',      -- walk-in converted to reservation
    'website',      -- online booking widget on restaurant site
    'facebook',     -- Facebook page booking
    'instagram',    -- Instagram booking
    'google',       -- Google Reserve
    'app',          -- i-host pocket app
    'manual'        -- manually entered by staff
);

-- Waitlist status
CREATE TYPE waitlist_status AS ENUM (
    'waiting',      -- actively waiting
    'notified',     -- SMS/notification sent that table is ready
    'seated',       -- seated
    'left'          -- left without being seated
);

-- ============================================================
-- Reservations table
-- Maps to i-host core: Digital Reservation Book
-- ============================================================
CREATE TABLE reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Guest info (links to CRM if customer exists)
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    guest_name TEXT NOT NULL,
    guest_phone TEXT,
    guest_email TEXT,
    party_size INTEGER NOT NULL CHECK (party_size > 0),

    -- Reservation timing
    reservation_date DATE NOT NULL,
    reservation_time TIME NOT NULL,
    estimated_duration_minutes INTEGER NOT NULL DEFAULT 90,

    -- Table assignment (smart suggestion or manual)
    table_id UUID REFERENCES tables(id) ON DELETE SET NULL,
    zone_id UUID REFERENCES zones(id) ON DELETE SET NULL,

    -- Status & source
    status reservation_status NOT NULL DEFAULT 'pending',
    source reservation_source NOT NULL DEFAULT 'phone',

    -- Details
    notes TEXT,
    special_requests TEXT,
    occasion TEXT, -- birthday, anniversary, business, etc.
    allergies TEXT[] NOT NULL DEFAULT '{}',

    -- Confirmation tracking
    confirmation_sent_at TIMESTAMPTZ,
    confirmed_at TIMESTAMPTZ,
    seated_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    cancellation_reason TEXT,

    -- Staff tracking
    created_by UUID REFERENCES staff_members(id) ON DELETE SET NULL,

    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- Waitlist table
-- Maps to i-host: Priority Listing
-- ============================================================
CREATE TABLE waitlist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Guest info
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    guest_name TEXT NOT NULL,
    guest_phone TEXT,
    party_size INTEGER NOT NULL CHECK (party_size > 0),

    -- Waitlist management
    status waitlist_status NOT NULL DEFAULT 'waiting',
    priority INTEGER NOT NULL DEFAULT 0, -- higher = more priority
    estimated_wait_minutes INTEGER,
    preferred_zone_id UUID REFERENCES zones(id) ON DELETE SET NULL,

    -- Table assignment (when seated)
    table_id UUID REFERENCES tables(id) ON DELETE SET NULL,

    -- Tracking
    joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    notified_at TIMESTAMPTZ,
    seated_at TIMESTAMPTZ,
    left_at TIMESTAMPTZ,
    notes TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- Online booking configuration
-- Maps to i-host: i-Reserve online booking settings
-- ============================================================
CREATE TABLE booking_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Time slots
    min_party_size INTEGER NOT NULL DEFAULT 1,
    max_party_size INTEGER NOT NULL DEFAULT 12,
    default_duration_minutes INTEGER NOT NULL DEFAULT 90,
    time_slot_interval_minutes INTEGER NOT NULL DEFAULT 30,

    -- Advance booking limits
    min_advance_hours INTEGER NOT NULL DEFAULT 1,
    max_advance_days INTEGER NOT NULL DEFAULT 30,

    -- Operating hours for reservations (per day)
    -- Stored as JSONB: {"monday": {"open": "12:00", "close": "23:00"}, ...}
    operating_hours JSONB NOT NULL DEFAULT '{}',

    -- Booking channels enabled
    website_booking_enabled BOOLEAN NOT NULL DEFAULT true,
    facebook_booking_enabled BOOLEAN NOT NULL DEFAULT false,
    instagram_booking_enabled BOOLEAN NOT NULL DEFAULT false,
    google_reserve_enabled BOOLEAN NOT NULL DEFAULT false,

    -- Confirmation settings
    auto_confirm BOOLEAN NOT NULL DEFAULT false,
    send_sms_confirmation BOOLEAN NOT NULL DEFAULT true,
    send_email_confirmation BOOLEAN NOT NULL DEFAULT true,
    confirmation_message_template TEXT DEFAULT 'Η κράτησή σας στο {restaurant} για {date} στις {time} ({guests} άτομα) επιβεβαιώθηκε. Για αλλαγές καλέστε: {phone}',
    reminder_hours_before INTEGER NOT NULL DEFAULT 3,

    -- No-show policy
    no_show_threshold_minutes INTEGER NOT NULL DEFAULT 15,

    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- Caller ID log (for phone-based reservations)
-- Maps to i-host: CallerInfo service
-- ============================================================
CREATE TABLE caller_id_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_number TEXT NOT NULL,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    call_time TIMESTAMPTZ NOT NULL DEFAULT now(),
    reservation_created BOOLEAN NOT NULL DEFAULT false,
    reservation_id UUID REFERENCES reservations(id) ON DELETE SET NULL,
    handled_by UUID REFERENCES staff_members(id) ON DELETE SET NULL
);

-- Triggers
CREATE TRIGGER reservations_updated_at BEFORE UPDATE ON reservations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER booking_settings_updated_at BEFORE UPDATE ON booking_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- Indexes for reservations
-- ============================================================
CREATE INDEX idx_reservations_date ON reservations(reservation_date);
CREATE INDEX idx_reservations_date_time ON reservations(reservation_date, reservation_time);
CREATE INDEX idx_reservations_status ON reservations(status);
CREATE INDEX idx_reservations_customer_id ON reservations(customer_id);
CREATE INDEX idx_reservations_table_id ON reservations(table_id);
CREATE INDEX idx_reservations_phone ON reservations(guest_phone);

CREATE INDEX idx_waitlist_status ON waitlist(status);
CREATE INDEX idx_waitlist_joined_at ON waitlist(joined_at);

CREATE INDEX idx_caller_id_phone ON caller_id_log(phone_number);
CREATE INDEX idx_caller_id_time ON caller_id_log(call_time);

-- ============================================================
-- RLS for reservation tables
-- ============================================================
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE caller_id_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reservations_select" ON reservations FOR SELECT TO authenticated USING (true);
CREATE POLICY "reservations_insert" ON reservations FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "reservations_update" ON reservations FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "reservations_delete" ON reservations FOR DELETE TO authenticated USING (true);

CREATE POLICY "waitlist_select" ON waitlist FOR SELECT TO authenticated USING (true);
CREATE POLICY "waitlist_insert" ON waitlist FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "waitlist_update" ON waitlist FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "waitlist_delete" ON waitlist FOR DELETE TO authenticated USING (true);

CREATE POLICY "booking_settings_select" ON booking_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "booking_settings_update" ON booking_settings FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Allow anon to read booking settings (for public widget)
CREATE POLICY "booking_settings_anon_select" ON booking_settings FOR SELECT TO anon USING (true);
-- Allow anon to create reservations (online booking)
CREATE POLICY "reservations_anon_insert" ON reservations FOR INSERT TO anon WITH CHECK (true);
-- Allow anon to join waitlist
CREATE POLICY "waitlist_anon_insert" ON waitlist FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "caller_id_select" ON caller_id_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "caller_id_insert" ON caller_id_log FOR INSERT TO authenticated WITH CHECK (true);
