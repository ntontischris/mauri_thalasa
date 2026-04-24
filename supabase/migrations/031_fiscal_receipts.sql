-- ============================================================
-- Migration 031: Fiscal receipts ledger (myDATA / Greek fiscal)
-- ============================================================
-- Provider-agnostic transmission ledger. One row per order;
-- tracks every attempt to transmit that order to AADE (directly
-- or via a bridge such as Elorus).
--
-- The existing orders.elorus_invoice_id + orders.fiscal_mark
-- columns (from migration 019) remain as denormalised fast-read
-- mirrors. They are UPDATED from this ledger after a successful
-- transmission, but the ledger is the source of truth for any
-- audit / investigation.
--
-- This migration intentionally ships BEFORE a provider is wired.
-- The table is usable as-is: inserts with status='pending' are
-- valid without a provider. The transmission logic ships in a
-- separate PR once the commercial provider decision lands.
-- ============================================================

CREATE TYPE fiscal_transmission_status AS ENUM (
    'pending',     -- created, not yet transmitted
    'submitting',  -- in flight to provider
    'accepted',    -- AADE accepted, MARK + UID received
    'rejected',    -- AADE rejected (with reason in `error`)
    'cancelled',   -- order cancelled; fiscal void recorded
    'manual'       -- resolved outside the system (paper receipt, legacy)
);

CREATE TABLE fiscal_receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Target order (one fiscal receipt per order)
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,

    -- Provider identification
    provider TEXT NOT NULL,              -- 'elorus', 'aade-direct', 'manual', ...
    provider_invoice_id TEXT,            -- provider-side id (Elorus invoice id, ...)

    -- AADE-level identifiers (populated on acceptance)
    mark TEXT,                           -- AADE MARK
    uid  TEXT,                           -- AADE UID

    -- Transmission state
    status fiscal_transmission_status NOT NULL DEFAULT 'pending',
    attempts INTEGER NOT NULL DEFAULT 0,
    last_attempt_at TIMESTAMPTZ,
    submitted_at TIMESTAMPTZ,
    accepted_at TIMESTAMPTZ,
    rejected_at TIMESTAMPTZ,

    -- Audit payloads (for investigation + retry replay)
    payload JSONB NOT NULL DEFAULT '{}',  -- what we sent
    response JSONB NOT NULL DEFAULT '{}', -- what provider returned
    error TEXT,                           -- human-readable last-error message

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One fiscal receipt per order (until we need amendments / voids
-- which would be modelled as separate cancellation rows in a
-- follow-up migration).
CREATE UNIQUE INDEX uq_fiscal_receipts_order_id ON fiscal_receipts(order_id);

CREATE INDEX idx_fiscal_receipts_status ON fiscal_receipts(status);

-- Worker pickup index: pending rows oldest first, with a partial
-- predicate so the index stays tiny even under heavy load.
CREATE INDEX idx_fiscal_receipts_pending
    ON fiscal_receipts(created_at)
    WHERE status IN ('pending', 'submitting');

-- updated_at trigger
CREATE TRIGGER fiscal_receipts_updated_at BEFORE UPDATE ON fiscal_receipts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS: manager-only writes. Every row originates from a server
-- action or worker, which runs with service-role in production,
-- but we still pin authenticated writes to manager as a defence
-- layer consistent with migration 030.
ALTER TABLE fiscal_receipts ENABLE ROW LEVEL SECURITY;

CREATE POLICY fiscal_receipts_select ON fiscal_receipts
    FOR SELECT TO authenticated USING (true);

CREATE POLICY fiscal_receipts_insert_manager ON fiscal_receipts
    FOR INSERT TO authenticated WITH CHECK (public.is_manager());

CREATE POLICY fiscal_receipts_update_manager ON fiscal_receipts
    FOR UPDATE TO authenticated
    USING (public.is_manager()) WITH CHECK (public.is_manager());

-- No DELETE policy on purpose: fiscal records must not be erased.
-- Corrections happen via status transitions ('cancelled') or
-- compensating rows, never row deletion.
