-- ============================================================
-- Migration 010: Daily Summaries for Analytics
-- EatFlow POS - Aggregated daily data for reports & dashboards
-- ============================================================
-- Maps to: DailySummary interface in lib/types.ts
-- Used by: use-analytics.ts hook and analytics-* components

CREATE TABLE daily_summaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL UNIQUE,
    total_revenue NUMERIC(10,2) NOT NULL DEFAULT 0,
    order_count INTEGER NOT NULL DEFAULT 0,
    average_check NUMERIC(10,2) NOT NULL DEFAULT 0,
    cash_payments NUMERIC(10,2) NOT NULL DEFAULT 0,
    card_payments NUMERIC(10,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Top products sold per day (denormalized for fast reporting)
-- Maps to: DailySummary.topProducts[] in lib/types.ts
CREATE TABLE daily_top_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    daily_summary_id UUID NOT NULL REFERENCES daily_summaries(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    product_name TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 0,
    revenue NUMERIC(10,2) NOT NULL DEFAULT 0
);

-- Hourly revenue breakdown per day
-- Maps to: DailySummary.hourlyRevenue[] in lib/types.ts
CREATE TABLE daily_hourly_revenue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    daily_summary_id UUID NOT NULL REFERENCES daily_summaries(id) ON DELETE CASCADE,
    hour INTEGER NOT NULL CHECK (hour >= 0 AND hour <= 23),
    revenue NUMERIC(10,2) NOT NULL DEFAULT 0,
    UNIQUE(daily_summary_id, hour)
);

CREATE TRIGGER daily_summaries_updated_at BEFORE UPDATE ON daily_summaries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
