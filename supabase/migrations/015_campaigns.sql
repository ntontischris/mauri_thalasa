-- ============================================================
-- Migration 015: SMS & Email Campaigns (i-host Feature)
-- EatFlow POS - Marketing campaigns, notifications, templates
-- ============================================================
-- Maps to i-host features:
-- - SMS & Email campaigns to customers
-- - SMS confirmation for reservations
-- - Automated notifications

-- Campaign type
CREATE TYPE campaign_channel AS ENUM ('sms', 'email', 'both');
CREATE TYPE campaign_status AS ENUM ('draft', 'scheduled', 'sending', 'sent', 'cancelled');
CREATE TYPE notification_type AS ENUM (
    'reservation_confirmation',
    'reservation_reminder',
    'reservation_cancellation',
    'waitlist_ready',
    'loyalty_reward',
    'birthday_greeting',
    'winback',
    'campaign'
);

-- ============================================================
-- Message templates for automated notifications
-- ============================================================
CREATE TABLE message_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type notification_type NOT NULL,
    channel campaign_channel NOT NULL DEFAULT 'sms',
    subject TEXT, -- for email
    body TEXT NOT NULL,
    -- Placeholders: {guest_name}, {restaurant}, {date}, {time},
    -- {guests}, {phone}, {points}, {reward_value}, etc.
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- Marketing campaigns
-- Maps to i-host: SMS & Email campaigns
-- ============================================================
CREATE TABLE campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    channel campaign_channel NOT NULL DEFAULT 'sms',
    status campaign_status NOT NULL DEFAULT 'draft',

    -- Content
    subject TEXT, -- for email
    body TEXT NOT NULL,

    -- Targeting
    target_all_customers BOOLEAN NOT NULL DEFAULT false,
    target_vip_only BOOLEAN NOT NULL DEFAULT false,
    target_tags TEXT[] NOT NULL DEFAULT '{}',
    target_inactive_days INTEGER, -- customers not visited in X days
    target_min_visits INTEGER,
    target_customer_ids UUID[] NOT NULL DEFAULT '{}',

    -- Schedule
    scheduled_at TIMESTAMPTZ,
    sent_at TIMESTAMPTZ,

    -- Stats
    total_recipients INTEGER NOT NULL DEFAULT 0,
    delivered_count INTEGER NOT NULL DEFAULT 0,
    failed_count INTEGER NOT NULL DEFAULT 0,

    created_by UUID REFERENCES staff_members(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- Individual notification log (sent messages)
-- ============================================================
CREATE TABLE notification_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    type notification_type NOT NULL,
    channel campaign_channel NOT NULL,

    -- Linked entities
    reservation_id UUID REFERENCES reservations(id) ON DELETE SET NULL,
    campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,

    -- Content snapshot
    recipient_phone TEXT,
    recipient_email TEXT,
    subject TEXT,
    body TEXT NOT NULL,

    -- Delivery status
    sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    delivered BOOLEAN NOT NULL DEFAULT false,
    delivery_error TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Triggers
CREATE TRIGGER message_templates_updated_at BEFORE UPDATE ON message_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER campaigns_updated_at BEFORE UPDATE ON campaigns
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Indexes
CREATE INDEX idx_campaigns_status ON campaigns(status);
CREATE INDEX idx_campaigns_scheduled ON campaigns(scheduled_at) WHERE status = 'scheduled';
CREATE INDEX idx_notification_log_customer ON notification_log(customer_id);
CREATE INDEX idx_notification_log_type ON notification_log(type);
CREATE INDEX idx_notification_log_sent ON notification_log(sent_at);
CREATE INDEX idx_notification_log_reservation ON notification_log(reservation_id);

-- RLS
ALTER TABLE message_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "message_templates_select" ON message_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "message_templates_insert" ON message_templates FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "message_templates_update" ON message_templates FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "message_templates_delete" ON message_templates FOR DELETE TO authenticated USING (true);

CREATE POLICY "campaigns_select" ON campaigns FOR SELECT TO authenticated USING (true);
CREATE POLICY "campaigns_insert" ON campaigns FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "campaigns_update" ON campaigns FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "campaigns_delete" ON campaigns FOR DELETE TO authenticated USING (true);

CREATE POLICY "notification_log_select" ON notification_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "notification_log_insert" ON notification_log FOR INSERT TO authenticated WITH CHECK (true);
