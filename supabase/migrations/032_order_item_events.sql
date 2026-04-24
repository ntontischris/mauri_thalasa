-- ============================================================
-- Migration 032: order_item_events — KDS timing ledger
-- ============================================================
-- The brain gap: we know the CURRENT status of every order_item
-- (pending / preparing / ready / served) but not WHEN each
-- transition happened. Without timestamps, there's no way to
-- answer "how long did this souvlaki take to prepare?" or
-- "what's our p95 prep time per station on Friday nights?".
--
-- This migration adds an append-only event log. Every INSERT of
-- an order_item emits a 'created' event; every status change
-- emits a status-transition event. No server action changes.
-- Triggers are the source of truth.
--
-- Downstream consumers (KDS analytics, AI forecasting, per-staff
-- prep-speed reports) read from here via views in a later
-- migration or at query time.
-- ============================================================

-- ------------------------------------------------------------
-- Helper: current staff id from JWT (mirror of the TS helper
-- in lib/auth/current-staff.ts). Returns NULL for service-role
-- connections (cron, bulk jobs).
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.current_staff_id()
RETURNS UUID
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    raw TEXT;
BEGIN
    raw := auth.jwt() -> 'user_metadata' ->> 'staff_id';
    IF raw IS NULL OR raw = '' THEN
        RETURN NULL;
    END IF;
    RETURN raw::UUID;
EXCEPTION WHEN others THEN
    RETURN NULL;  -- malformed metadata should not break triggers
END;
$$;

-- ------------------------------------------------------------
-- Event table
-- ------------------------------------------------------------
CREATE TABLE order_item_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    order_item_id UUID NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
    order_id      UUID NOT NULL REFERENCES orders(id)      ON DELETE CASCADE,
    product_id    UUID NOT NULL REFERENCES products(id)    ON DELETE RESTRICT,
    station       station_type NOT NULL,

    -- Transition: from_status is NULL for the initial 'created'
    -- event (item just inserted). to_status is the new status.
    from_status order_item_status,
    to_status   order_item_status NOT NULL,

    changed_by UUID REFERENCES staff_members(id) ON DELETE SET NULL,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX idx_order_item_events_order_item_id
    ON order_item_events(order_item_id, occurred_at);

CREATE INDEX idx_order_item_events_order_id
    ON order_item_events(order_id);

CREATE INDEX idx_order_item_events_station_occurred
    ON order_item_events(station, occurred_at DESC);

CREATE INDEX idx_order_item_events_product_to_status
    ON order_item_events(product_id, to_status, occurred_at DESC);

-- ------------------------------------------------------------
-- Trigger: INSERT on order_items → 'created' event
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION order_items_insert_event()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO order_item_events (
        order_item_id, order_id, product_id, station,
        from_status, to_status, changed_by
    ) VALUES (
        NEW.id, NEW.order_id, NEW.product_id, NEW.station,
        NULL, NEW.status, public.current_staff_id()
    );
    RETURN NEW;
END;
$$;

CREATE TRIGGER order_items_insert_event_trg
    AFTER INSERT ON order_items
    FOR EACH ROW EXECUTE FUNCTION order_items_insert_event();

-- ------------------------------------------------------------
-- Trigger: UPDATE status on order_items → transition event
-- Fires only when status actually changes.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION order_items_status_change_event()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
        INSERT INTO order_item_events (
            order_item_id, order_id, product_id, station,
            from_status, to_status, changed_by
        ) VALUES (
            NEW.id, NEW.order_id, NEW.product_id, NEW.station,
            OLD.status, NEW.status, public.current_staff_id()
        );
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER order_items_status_change_event_trg
    AFTER UPDATE OF status ON order_items
    FOR EACH ROW EXECUTE FUNCTION order_items_status_change_event();

-- ------------------------------------------------------------
-- View: prep time per served item
-- Computes the time from FIRST 'preparing' to FIRST 'ready'.
-- (Items can be re-prepared; we take the first transition as
--  the canonical prep time. Downstream analytics can refine.)
-- ------------------------------------------------------------
CREATE OR REPLACE VIEW order_item_prep_times AS
SELECT
    oi.id                         AS order_item_id,
    oi.order_id,
    oi.product_id,
    oi.product_name,
    oi.station,
    start_evt.occurred_at         AS prep_started_at,
    ready_evt.occurred_at         AS prep_finished_at,
    EXTRACT(EPOCH FROM (ready_evt.occurred_at - start_evt.occurred_at))::INTEGER
                                  AS prep_seconds
FROM order_items oi
JOIN LATERAL (
    SELECT occurred_at FROM order_item_events
    WHERE order_item_id = oi.id AND to_status = 'preparing'
    ORDER BY occurred_at ASC LIMIT 1
) start_evt ON TRUE
JOIN LATERAL (
    SELECT occurred_at FROM order_item_events
    WHERE order_item_id = oi.id AND to_status = 'ready'
    ORDER BY occurred_at ASC LIMIT 1
) ready_evt ON TRUE
WHERE ready_evt.occurred_at >= start_evt.occurred_at;

-- ------------------------------------------------------------
-- RLS
-- Read-only for authenticated (managers + operational staff).
-- No INSERT/UPDATE/DELETE policies: the table is append-only by
-- trigger, never by app code. Absence of a policy denies the
-- action. Service-role bypasses RLS anyway for bulk operations.
-- ------------------------------------------------------------
ALTER TABLE order_item_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY order_item_events_select
    ON order_item_events FOR SELECT TO authenticated USING (true);
