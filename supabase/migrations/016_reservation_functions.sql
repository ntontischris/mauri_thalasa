-- ============================================================
-- Migration 016: Reservation Functions
-- EatFlow POS - Smart table suggestion, reservation workflows
-- ============================================================
-- Business logic for the reservation system.
-- Maps to i-host's smart table assignment algorithm.

-- ============================================================
-- 1. Smart Table Suggestion
-- i-host's core feature: suggests the best table for a reservation
-- based on party size, time, zone preference, and existing bookings
-- ============================================================
CREATE OR REPLACE FUNCTION suggest_table_for_reservation(
    p_date DATE,
    p_time TIME,
    p_party_size INTEGER,
    p_duration_minutes INTEGER DEFAULT 90,
    p_preferred_zone_id UUID DEFAULT NULL
)
RETURNS TABLE(
    table_id UUID,
    table_number INTEGER,
    capacity INTEGER,
    zone_id UUID,
    zone_name TEXT,
    score INTEGER -- higher = better match
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        t.id AS table_id,
        t.number AS table_number,
        t.capacity,
        t.zone_id,
        z.name AS zone_name,
        -- Scoring algorithm:
        -- +100 if table is in preferred zone
        -- -10 per excess capacity (avoid putting 2 people at a 8-top)
        -- +50 if exact capacity match
        -- -200 if table is already reserved in overlapping time
        (
            CASE WHEN p_preferred_zone_id IS NOT NULL AND t.zone_id = p_preferred_zone_id THEN 100 ELSE 0 END
            + CASE WHEN t.capacity = p_party_size THEN 50 ELSE 0 END
            - (t.capacity - p_party_size) * 10
            - CASE WHEN EXISTS (
                SELECT 1 FROM reservations r
                WHERE r.table_id = t.id
                AND r.reservation_date = p_date
                AND r.status IN ('pending', 'confirmed', 'seated')
                AND (
                    (r.reservation_time, r.reservation_time + (r.estimated_duration_minutes || ' minutes')::interval)
                    OVERLAPS
                    (p_time, p_time + (p_duration_minutes || ' minutes')::interval)
                )
            ) THEN 9999 ELSE 0 END
        )::INTEGER AS score
    FROM tables t
    JOIN zones z ON z.id = t.zone_id
    WHERE t.capacity >= p_party_size
    ORDER BY score DESC, t.capacity ASC
    LIMIT 5;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================
-- 2. Check table availability for a time slot
-- ============================================================
CREATE OR REPLACE FUNCTION is_table_available(
    p_table_id UUID,
    p_date DATE,
    p_time TIME,
    p_duration_minutes INTEGER DEFAULT 90,
    p_exclude_reservation_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN NOT EXISTS (
        SELECT 1 FROM reservations r
        WHERE r.table_id = p_table_id
        AND r.reservation_date = p_date
        AND r.status IN ('pending', 'confirmed', 'seated')
        AND (p_exclude_reservation_id IS NULL OR r.id != p_exclude_reservation_id)
        AND (
            (r.reservation_time, r.reservation_time + (r.estimated_duration_minutes || ' minutes')::interval)
            OVERLAPS
            (p_time, p_time + (p_duration_minutes || ' minutes')::interval)
        )
    );
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================
-- 3. Get available time slots for a date
-- ============================================================
CREATE OR REPLACE FUNCTION get_available_slots(
    p_date DATE,
    p_party_size INTEGER,
    p_preferred_zone_id UUID DEFAULT NULL
)
RETURNS TABLE(
    slot_time TIME,
    available_tables_count INTEGER
) AS $$
DECLARE
    v_settings RECORD;
    v_slot TIME;
    v_day_name TEXT;
    v_hours JSONB;
    v_open_time TIME;
    v_close_time TIME;
BEGIN
    -- Get booking settings
    SELECT * INTO v_settings FROM booking_settings LIMIT 1;
    IF v_settings IS NULL THEN
        RETURN;
    END IF;

    -- Get day name for operating hours
    v_day_name := lower(to_char(p_date, 'fmday'));
    v_hours := v_settings.operating_hours -> v_day_name;

    IF v_hours IS NULL THEN
        RETURN; -- closed on this day
    END IF;

    v_open_time := (v_hours ->> 'open')::TIME;
    v_close_time := (v_hours ->> 'close')::TIME;

    -- Generate time slots
    v_slot := v_open_time;
    WHILE v_slot < v_close_time LOOP
        RETURN QUERY
        SELECT v_slot,
            (SELECT COUNT(*)::INTEGER FROM tables t
             WHERE t.capacity >= p_party_size
             AND (p_preferred_zone_id IS NULL OR t.zone_id = p_preferred_zone_id)
             AND NOT EXISTS (
                 SELECT 1 FROM reservations r
                 WHERE r.table_id = t.id
                 AND r.reservation_date = p_date
                 AND r.status IN ('pending', 'confirmed', 'seated')
                 AND (
                     (r.reservation_time, r.reservation_time + (r.estimated_duration_minutes || ' minutes')::interval)
                     OVERLAPS
                     (v_slot, v_slot + (v_settings.default_duration_minutes || ' minutes')::interval)
                 )
             )
            );
        v_slot := v_slot + (v_settings.time_slot_interval_minutes || ' minutes')::interval;
    END LOOP;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================
-- 4. Seat a reservation (mark as seated, update table)
-- ============================================================
CREATE OR REPLACE FUNCTION seat_reservation(p_reservation_id UUID)
RETURNS void AS $$
DECLARE
    v_table_id UUID;
BEGIN
    SELECT table_id INTO v_table_id
    FROM reservations WHERE id = p_reservation_id;

    -- Mark reservation as seated
    UPDATE reservations
    SET status = 'seated',
        seated_at = now()
    WHERE id = p_reservation_id;

    -- Mark table as occupied
    IF v_table_id IS NOT NULL THEN
        UPDATE tables
        SET status = 'occupied'
        WHERE id = v_table_id;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 5. Mark no-shows (auto or manual)
-- ============================================================
CREATE OR REPLACE FUNCTION mark_no_shows(p_threshold_minutes INTEGER DEFAULT 15)
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    UPDATE reservations
    SET status = 'no_show'
    WHERE status = 'confirmed'
    AND reservation_date = CURRENT_DATE
    AND (reservation_time + (p_threshold_minutes || ' minutes')::interval) < CURRENT_TIME;

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 6. Caller ID lookup - find customer by phone
-- ============================================================
CREATE OR REPLACE FUNCTION caller_id_lookup(p_phone TEXT)
RETURNS TABLE(
    customer_id UUID,
    customer_name TEXT,
    is_vip BOOLEAN,
    loyalty_points INTEGER,
    allergies TEXT[],
    total_visits BIGINT,
    last_visit TIMESTAMPTZ,
    notes TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        c.id,
        c.name,
        c.is_vip,
        c.loyalty_points,
        c.allergies,
        COUNT(cv.id),
        MAX(cv.date),
        c.notes
    FROM customers c
    LEFT JOIN customer_visits cv ON cv.customer_id = c.id
    WHERE c.phone = p_phone
    GROUP BY c.id, c.name, c.is_vip, c.loyalty_points, c.allergies, c.notes;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================
-- 7. Seat from waitlist
-- ============================================================
CREATE OR REPLACE FUNCTION seat_from_waitlist(
    p_waitlist_id UUID,
    p_table_id UUID
)
RETURNS void AS $$
BEGIN
    UPDATE waitlist
    SET status = 'seated',
        table_id = p_table_id,
        seated_at = now()
    WHERE id = p_waitlist_id;

    UPDATE tables
    SET status = 'occupied'
    WHERE id = p_table_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 8. Reservation statistics for reports
-- Maps to i-host: Static Reporting
-- ============================================================
CREATE OR REPLACE FUNCTION get_reservation_stats(
    p_start_date DATE,
    p_end_date DATE
)
RETURNS TABLE(
    total_reservations BIGINT,
    confirmed_count BIGINT,
    cancelled_count BIGINT,
    no_show_count BIGINT,
    avg_party_size NUMERIC,
    total_covers BIGINT,
    busiest_hour INTEGER,
    top_source reservation_source
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*),
        COUNT(*) FILTER (WHERE r.status IN ('confirmed', 'seated', 'completed')),
        COUNT(*) FILTER (WHERE r.status = 'cancelled'),
        COUNT(*) FILTER (WHERE r.status = 'no_show'),
        ROUND(AVG(r.party_size), 1),
        SUM(r.party_size),
        MODE() WITHIN GROUP (ORDER BY EXTRACT(HOUR FROM r.reservation_time)::INTEGER),
        MODE() WITHIN GROUP (ORDER BY r.source)
    FROM reservations r
    WHERE r.reservation_date BETWEEN p_start_date AND p_end_date;
END;
$$ LANGUAGE plpgsql STABLE;
