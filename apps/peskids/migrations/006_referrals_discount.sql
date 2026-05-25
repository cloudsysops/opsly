-- Peskids referral tracking and invoice discount credits

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS referral_code TEXT,
  ADD COLUMN IF NOT EXISTS referred_by_code TEXT,
  ADD COLUMN IF NOT EXISTS referral_discount_cents INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS referral_redemptions INTEGER NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_referral_code
  ON public.leads(referral_code)
  WHERE referral_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_leads_referred_by_code
  ON public.leads(referred_by_code)
  WHERE referred_by_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_leads_referral_redemptions
  ON public.leads(referral_redemptions DESC);

COMMENT ON COLUMN public.leads.referral_code IS 'Stable share code generated per family/lead';
COMMENT ON COLUMN public.leads.referred_by_code IS 'Referral code used to create the lead';
COMMENT ON COLUMN public.leads.referral_discount_cents IS 'Accumulated referral discount available for invoicing';
COMMENT ON COLUMN public.leads.referral_redemptions IS 'Number of successful referred enrollments';
