-- Referral growth module for Peskids
-- Tenant-scoped tables in schema `peskids`

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS peskids.referral_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_slug text NOT NULL DEFAULT 'peskids',
  referrer_id text NOT NULL,
  referrer_name text NOT NULL,
  code text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_peskids_referral_links_referrer
  ON peskids.referral_links (tenant_slug, referrer_id);

CREATE TABLE IF NOT EXISTS peskids.referral_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_link_id uuid NOT NULL REFERENCES peskids.referral_links(id) ON DELETE CASCADE,
  ip_address text NOT NULL,
  user_agent text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_peskids_referral_clicks_link
  ON peskids.referral_clicks (referral_link_id, created_at DESC);

CREATE TABLE IF NOT EXISTS peskids.referral_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_slug text NOT NULL DEFAULT 'peskids',
  referral_link_id uuid NOT NULL REFERENCES peskids.referral_links(id) ON DELETE CASCADE,
  referee_contact_id text NOT NULL,
  referee_email text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  reward text,
  redeemed_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  failure_reason text
);

CREATE INDEX IF NOT EXISTS idx_peskids_referral_redemptions_link
  ON peskids.referral_redemptions (referral_link_id, redeemed_at DESC);

CREATE INDEX IF NOT EXISTS idx_peskids_referral_redemptions_status
  ON peskids.referral_redemptions (tenant_slug, status);
