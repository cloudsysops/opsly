-- Peskids Notification System
-- Two tables: notification_preferences (per-user channel settings) and notifications (in-app log)

-- Ensure peskids schema exists (existing tables live in public; new notification tables use dedicated schema)
CREATE SCHEMA IF NOT EXISTS peskids;

-- notification_preferences: one row per user per tenant
CREATE TABLE IF NOT EXISTS peskids.notification_preferences (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  tenant_slug text NOT NULL DEFAULT 'peskids',
  email_enabled boolean NOT NULL DEFAULT true,
  whatsapp_enabled boolean NOT NULL DEFAULT false,
  inapp_enabled boolean NOT NULL DEFAULT true,
  events text[] NOT NULL DEFAULT ARRAY['submission_reviewed','submission_observation','submission_reassigned','followup_due','weekly_report'],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, tenant_slug)
);

-- notifications: in-app notification log
CREATE TABLE IF NOT EXISTS peskids.notifications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  tenant_slug text NOT NULL DEFAULT 'peskids',
  type text NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}',
  read_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON peskids.notifications(user_id, tenant_slug, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON peskids.notifications(user_id) WHERE read_at IS NULL;
